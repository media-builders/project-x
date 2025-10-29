"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getStoredQueueJob,
  setStoredQueueJob,
  type StoredQueueJob,
} from "@/utils/callQueueStorage";

export type QueueStatusResponse = {
  job_id: string;
  status: string;
  scheduled_start_at: string | null;
  total_leads: number;
  initiated: number;
  completed: number;
  failed: number;
  current_index: number | null;
  current_conversation_id: string | null;
  current_lead: Record<string, unknown> | null;
  error: string | null;
  lead_snapshot?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QueueJobSummary = {
  id: string;
  status: string;
  scheduled_start_at: string | null;
  total_leads: number;
  lead_snapshot: unknown;
  created_at: string | null;
  updated_at: string | null;
};

export const ACTIVE_QUEUE_STATUSES = new Set(["pending", "running", "scheduled"]);

type CallQueueContextValue = {
  activeJob: StoredQueueJob | null;
  status: QueueStatusResponse | null;
  isPolling: boolean;
  beginQueue: (jobId: string, total?: number, scheduledAt?: string | null) => void;
  clearQueue: () => void;
  refresh: () => Promise<void>;
  upcomingJobs: QueueJobSummary[];
  refreshUpcoming: () => Promise<void>;
};

const CallQueueContext = createContext<CallQueueContextValue | undefined>(
  undefined
);

const fetchQueueStatus = async (
  jobId: string,
  controller: AbortController
): Promise<QueueStatusResponse> => {
  const res = await fetch(`/api/outbound-calls/queue/${jobId}`, {
    method: "GET",
    cache: "no-store",
    signal: controller.signal,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || `Status request failed with ${res.status}`);
  }

  return res.json();
};

export function CallQueueProvider({ children }: { children: React.ReactNode }) {
  const [activeJob, setActiveJob] = useState<StoredQueueJob | null>(null);
  const [status, setStatus] = useState<QueueStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [upcomingJobs, setUpcomingJobs] = useState<QueueJobSummary[]>([]);

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const upcomingAbortRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = getStoredQueueJob();
    if (stored) {
      setActiveJob(stored);
    }
  }, []);

  useEffect(() => {
    setStoredQueueJob(activeJob);
  }, [activeJob?.jobId, activeJob?.total, activeJob?.scheduledAt]);

  const refreshUpcoming = useCallback(async () => {
    try {
      upcomingAbortRef.current?.abort();
      const controller = new AbortController();
      upcomingAbortRef.current = controller;
      const res = await fetch("/api/outbound-calls/queue?scope=upcoming", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Upcoming request failed with ${res.status}`);
      }
      const data = await res.json();
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      setUpcomingJobs(jobs);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("[CallQueue] upcoming fetch error", err);
    }
  }, []);

  const pollStatus = useCallback(
    async (jobId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        setIsPolling(true);
        const data = await fetchQueueStatus(jobId, controller);
        setStatus(data);
        if (data.scheduled_start_at) {
          setActiveJob((prev) => {
            if (!prev || prev.jobId !== data.job_id) return prev;
            if (prev.scheduledAt === data.scheduled_start_at) return prev;
            return { ...prev, scheduledAt: data.scheduled_start_at };
          });
        }

        if (!ACTIVE_QUEUE_STATUSES.has(data.status)) {
          setActiveJob(null);
          setStoredQueueJob(null);
        }

        void refreshUpcoming();

        return data;
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.error("[CallQueue] status fetch error", err);
        }
        return null;
      } finally {
        if (!controller.signal.aborted) {
          setIsPolling(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!activeJob?.jobId) {
      abortRef.current?.abort();
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      const data = await pollStatus(activeJob.jobId);
      if (cancelled) return;

      if (data && ACTIVE_QUEUE_STATUSES.has(data.status)) {
        let nextDelay = 4000;
        if (data.status === "scheduled" && data.scheduled_start_at) {
          const msUntil =
            new Date(data.scheduled_start_at).getTime() - Date.now();
          if (!Number.isNaN(msUntil) && msUntil > 0) {
            if (msUntil > 5 * 60_000) {
              nextDelay = 60_000;
            } else if (msUntil > 60_000) {
              nextDelay = 15_000;
            } else {
              nextDelay = Math.max(msUntil, 4000);
            }
          }
        }
        pollTimeoutRef.current = setTimeout(run, nextDelay);
      }
    };

    run();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [activeJob?.jobId, pollStatus]);

  const beginQueue = useCallback(
    (jobId: string, total?: number, scheduledAt?: string | null) => {
      setStatus(null);
      setActiveJob({ jobId, total, scheduledAt: scheduledAt ?? null });
      void refreshUpcoming();
    },
    [refreshUpcoming]
  );

  const clearQueue = useCallback(() => {
    setActiveJob(null);
    setStatus(null);
    setStoredQueueJob(null);
    abortRef.current?.abort();
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!activeJob?.jobId) return;
    await pollStatus(activeJob.jobId);
  }, [activeJob?.jobId, pollStatus]);

  useEffect(() => {
    void refreshUpcoming();
    const interval = setInterval(() => {
      void refreshUpcoming();
    }, 60_000);
    return () => {
      clearInterval(interval);
      upcomingAbortRef.current?.abort();
    };
  }, [refreshUpcoming]);

  const value = useMemo(
    () => ({
      activeJob,
      status,
      isPolling,
      beginQueue,
      clearQueue,
      refresh,
      upcomingJobs,
      refreshUpcoming,
    }),
    [
      activeJob,
      status,
      isPolling,
      beginQueue,
      clearQueue,
      refresh,
      upcomingJobs,
      refreshUpcoming,
    ]
  );

  return (
    <CallQueueContext.Provider value={value}>
      {children}
    </CallQueueContext.Provider>
  );
}

export const useCallQueue = () => {
  const ctx = useContext(CallQueueContext);
  if (!ctx) {
    throw new Error("useCallQueue must be used within a CallQueueProvider");
  }
  return ctx;
};
