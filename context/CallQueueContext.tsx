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

export const ACTIVE_QUEUE_STATUSES = new Set(["pending", "running"]);

type CallQueueContextValue = {
  activeJob: StoredQueueJob | null;
  status: QueueStatusResponse | null;
  isPolling: boolean;
  beginQueue: (jobId: string, total?: number) => void;
  clearQueue: () => void;
  refresh: () => Promise<void>;
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

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
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
  }, [activeJob?.jobId, activeJob?.total]);

  const pollStatus = useCallback(
    async (jobId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        setIsPolling(true);
        const data = await fetchQueueStatus(jobId, controller);
        setStatus(data);

        if (!ACTIVE_QUEUE_STATUSES.has(data.status)) {
          setActiveJob(null);
          setStoredQueueJob(null);
        }

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
        pollTimeoutRef.current = setTimeout(run, 4000);
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

  const beginQueue = useCallback((jobId: string, total?: number) => {
    setStatus(null);
    setActiveJob({ jobId, total });
  }, []);

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

  const value = useMemo(
    () => ({
      activeJob,
      status,
      isPolling,
      beginQueue,
      clearQueue,
      refresh,
    }),
    [activeJob, status, isPolling, beginQueue, clearQueue, refresh]
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
