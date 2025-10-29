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
  initiated?: number | null;
  completed?: number | null;
  failed?: number | null;
  current_index?: number | null;
  current_lead?: Record<string, unknown> | null;
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
  refreshUpcoming: () => Promise<void>;
  upcomingJobs: QueueJobSummary[];
};

const CallQueueContext = createContext<CallQueueContextValue | undefined>(undefined);

const QUEUE_LIST_ENDPOINT = "/api/outbound-calls/queue?scope=all";
const queueDetailEndpoint = (id: string) =>
  `/api/outbound-calls/queue/${encodeURIComponent(id)}`;

export function CallQueueProvider({ children }: { children: React.ReactNode }) {
  const [activeJob, setActiveJob] = useState<StoredQueueJob | null>(null);
  const [status, setStatus] = useState<QueueStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [upcomingJobs, setUpcomingJobs] = useState<QueueJobSummary[]>([]);

  const activeJobRef = useRef<StoredQueueJob | null>(null);
  useEffect(() => {
    activeJobRef.current = activeJob;
  }, [activeJob]);

  useEffect(() => {
    setStoredQueueJob(activeJob);
  }, [activeJob?.jobId, activeJob?.total, activeJob?.scheduledAt]);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const lastRunningRef = useRef(false);

  const scheduleNextPoll = useCallback(
    (delay: number, runPoll: () => void) => {
      if (!mountedRef.current) return;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
      pollTimerRef.current = setTimeout(runPoll, Math.max(delay, 0));
    },
    []
  );

  const previousStatusRef = useRef<QueueStatusResponse | null>(null);

  const runPoll = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsPolling(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let nextDelay = 15_000;
    let immediateNext = false;

    try {
      const listRes = await fetch(QUEUE_LIST_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });
      if (!listRes.ok) {
        throw new Error(`Queue list failed (${listRes.status})`);
      }
      const listData = await listRes.json();
      const jobs: QueueJobSummary[] = Array.isArray(listData?.jobs)
        ? listData.jobs
        : [];

      const now = Date.now();

      const upcoming = jobs.filter(
        (job) =>
          job &&
          typeof job.status === "string" &&
          (job.status === "scheduled" || job.status === "pending")
      );
      setUpcomingJobs(upcoming);

      const futureStarts = upcoming
        .map((job) =>
          job.scheduled_start_at ? new Date(job.scheduled_start_at).getTime() : NaN
        )
        .filter((time) => Number.isFinite(time) && time >= now);

      const earliestStart =
        futureStarts.length > 0 ? Math.min(...futureStarts) : null;

      const runningJob = jobs.find((job) => job.status === "running") ?? null;

      const trackedJobId =
        runningJob?.id ??
        activeJobRef.current?.jobId ??
        previousStatusRef.current?.job_id ??
        null;

      const listEntry = trackedJobId
        ? jobs.find((job) => job.id === trackedJobId) ?? null
        : null;

      let detail: QueueStatusResponse | null = null;
      if (trackedJobId) {
        try {
          const detailRes = await fetch(queueDetailEndpoint(trackedJobId), {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          });
          if (detailRes.ok) {
            detail = (await detailRes.json()) as QueueStatusResponse;
          } else if (detailRes.status === 404) {
            detail = null;
          } else {
            throw new Error(`Queue status failed (${detailRes.status})`);
          }
        } catch (detailErr) {
          if (!controller.signal.aborted) {
            console.error("[CallQueue] detail fetch error", detailErr);
          }
        }
      } else {
        detail = null;
      }

      if (detail) {
        setStatus(detail);
        previousStatusRef.current = detail;
        if (!ACTIVE_QUEUE_STATUSES.has(detail.status)) {
          if (activeJobRef.current?.jobId === detail.job_id) {
            setActiveJob(null);
            activeJobRef.current = null;
            setStoredQueueJob(null);
          }
        }
      } else if (listEntry) {
        const fallback: QueueStatusResponse = {
          job_id: listEntry.id,
          status: listEntry.status,
          scheduled_start_at: listEntry.scheduled_start_at ?? null,
          total_leads: listEntry.total_leads ?? 0,
          initiated: listEntry.initiated ?? 0,
          completed: listEntry.completed ?? 0,
          failed: listEntry.failed ?? 0,
          current_index: listEntry.current_index ?? null,
          current_conversation_id: null,
          current_lead:
            (listEntry.current_lead as Record<string, unknown> | null | undefined) ?? null,
          error: null,
          lead_snapshot: listEntry.lead_snapshot ?? [],
        };
        setStatus((prev) => {
          if (prev && prev.job_id === fallback.job_id) {
            return prev;
          }
          return fallback;
        });
        previousStatusRef.current = fallback;
      } else if (!runningJob && !listEntry) {
        setStatus(null);
        previousStatusRef.current = null;
      }

      const effectiveStatus = detail ?? previousStatusRef.current;
      const runningNow =
        Boolean(effectiveStatus && effectiveStatus.status === "running") ||
        Boolean(listEntry && listEntry.status === "running");

      const threshold =
        earliestStart !== null ? earliestStart - 120_000 : null;
      const withinFastWindow =
        runningNow || (threshold !== null && now >= threshold);

      nextDelay = withinFastWindow ? 1_000 : 15_000;

      if (lastRunningRef.current && !runningNow) {
        immediateNext = true;
      }
      lastRunningRef.current = runningNow;
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("[CallQueue] poll error", err);
      }
      nextDelay = 15_000;
    } finally {
      setIsPolling(false);
      if (!mountedRef.current) return;
      scheduleNextPoll(immediateNext ? 0 : nextDelay, () => {
        void runPoll();
      });
    }
  }, [scheduleNextPoll]);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    await runPoll();
  }, [runPoll]);

  useEffect(() => {
    mountedRef.current = true;
    const stored = getStoredQueueJob();
    if (stored) {
      activeJobRef.current = stored;
      setActiveJob(stored);
    }
    void runPoll();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [runPoll]);

  const beginQueue = useCallback(
    (jobId: string, total?: number, scheduledAt?: string | null) => {
      const payload: StoredQueueJob = {
        jobId,
        total,
        scheduledAt: scheduledAt ?? null,
      };
      setActiveJob(payload);
      activeJobRef.current = payload;
      setStatus(null);
      void refresh();
    },
    [refresh]
  );

  const clearQueue = useCallback(() => {
    setActiveJob(null);
    activeJobRef.current = null;
    setStatus(null);
    setStoredQueueJob(null);
  }, []);

  const value = useMemo(
    () => ({
      activeJob,
      status,
      isPolling,
      beginQueue,
      clearQueue,
      refresh,
      refreshUpcoming: refresh,
      upcomingJobs,
    }),
    [activeJob, status, isPolling, beginQueue, clearQueue, refresh, upcomingJobs]
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
