"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type QueueStatusResponse } from "@/context/CallQueueContext";
import { useLeadCallLogs } from "@/hooks/useLeadCallLogs";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getLeadLabel = (lead: unknown): string | null => {
  if (!lead || typeof lead !== "object") return null;
  const record = lead as Record<string, unknown>;
  const first = typeof record.first === "string" ? record.first : "";
  const last = typeof record.last === "string" ? record.last : "";
  const email = typeof record.email === "string" ? record.email : "";
  const phone = typeof record.phone === "string" ? record.phone : "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (email) return email;
  if (phone) return phone;
  return null;
};

const findLeadInSnapshot = (
  snapshot: unknown,
  index?: number | null
): string | null => {
  if (!Array.isArray(snapshot) || snapshot.length === 0) return null;
  if (typeof index === "number" && index >= 0 && index < snapshot.length) {
    const direct = getLeadLabel(snapshot[index]);
    if (direct) return direct;
  }
  for (const item of snapshot) {
    const label = getLeadLabel(item);
    if (label) return label;
  }
  return null;
};

type NormalizedJob = {
  id: string;
  status: string;
  scheduled_start_at: string | null;
  total_leads: number;
  initiated: number;
  completed: number;
  failed: number;
  current_index: number | null;
  current_conversation_id: string | null;
  current_lead: Record<string, unknown> | null;
  lead_snapshot: unknown;
  error: string | null;
};

const normaliseStatus = (status: QueueStatusResponse | null): NormalizedJob | null => {
  if (!status) return null;
  return {
    id: status.job_id,
    status: status.status,
    scheduled_start_at: status.scheduled_start_at ?? null,
    total_leads: status.total_leads ?? 0,
    initiated: status.initiated ?? 0,
    completed: status.completed ?? 0,
    failed: status.failed ?? 0,
    current_index: status.current_index ?? null,
    current_conversation_id: status.current_conversation_id ?? null,
    current_lead: status.current_lead ?? null,
    lead_snapshot: status.lead_snapshot ?? [],
    error: status.error ?? null,
  };
};

export default function CallQueueActiveCard() {
  const [status, setStatus] = useState<QueueStatusResponse | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);

  const fetchRunningQueue = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const listRes = await fetch("/api/outbound-calls/queue?scope=all", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });
      if (!listRes.ok) {
        throw new Error(`Queue list failed (${listRes.status})`);
      }
      const listPayload = await listRes.json();
      const jobs = Array.isArray(listPayload?.jobs) ? listPayload.jobs : [];
      const running = jobs.find(
        (job: any) => typeof job?.status === "string" && job.status === "running"
      );
      if (!running?.id) {
        setStatus(null);
        return;
      }
      const detailRes = await fetch(
        `/api/outbound-calls/queue/${encodeURIComponent(running.id)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        }
      );
      if (!detailRes.ok) {
        throw new Error(`Queue status failed (${detailRes.status})`);
      }
      const detail = (await detailRes.json()) as QueueStatusResponse;
      if (detail?.status === "running") {
        setStatus(detail);
      } else {
        setStatus(null);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error("[CallQueueActiveCard] fetch error:", err);
      setStatus(null);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchRunningQueue();
    pollingRef.current = setInterval(fetchRunningQueue, 1000);
    return () => {
      pollingRef.current && clearInterval(pollingRef.current);
      abortRef.current?.abort();
    };
  }, [fetchRunningQueue]);

  const job = useMemo(() => normaliseStatus(status), [status]);

  const currentLeadId =
    job?.current_lead &&
    typeof job.current_lead === "object" &&
    typeof (job.current_lead as any).id === "string"
      ? ((job.current_lead as any).id as string)
      : null;

  const { entries } = useLeadCallLogs(currentLeadId);

  const leadLabel = useMemo(() => {
    if (!job) return null;
    if (job.current_lead) {
      const liveLead = getLeadLabel(job.current_lead);
      if (liveLead) return liveLead;
    }
    return findLeadInSnapshot(job.lead_snapshot, job.current_index);
  }, [job]);

  if (!job) {
    return (
      <div className="call-queue-card">
        <div className="call-queue-card_header">
          <p className="font-medium text-primary-foreground">No active call queue</p>
          <p className="text-xs text-primary-foreground/70">
            Calls will appear here as soon as you start a queue.
          </p>
        </div>
      </div>
    );
  }

  const isRunning = job.status === "running";
  const initiated = job.initiated ?? 0;
  const completed = job.completed ?? 0;
  const total = job.total_leads ?? 0;
  const inFlight = Math.max(initiated - completed, 0);
  const percent =
    total > 0 ? Math.round(Math.min((completed + inFlight) / total, 1) * 100) : 0;

  const latestTranscript =
    entries.length && entries[0].transcript.length
      ? entries[0].transcript[entries[0].transcript.length - 1]?.message ?? null
      : null;

  return (
    <div className="call-queue-card">
      <div className="call-queue-card_header">
        <div>
          <p className="font-medium text-primary-foreground">Call queue in progress</p>
          <p className="text-xs text-primary-foreground/70">
            Job #{job.id.slice(0, 8)} &middot; Status: {job.status.replace(/_/g, " ")}
          </p>
          {job.scheduled_start_at && (
            <p className="text-xs text-primary-foreground/60">
              Scheduled for {formatDateTime(job.scheduled_start_at)}
            </p>
          )}
        </div>
        <span className="call-queue-card_badge">
          {completed + inFlight}/{total}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded bg-primary/20">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${isRunning ? percent : 0}%` }}
        />
      </div>

      {leadLabel && (
        <p className="mt-2 text-sm text-primary-foreground/90">
          Calling: <span className="font-medium">{leadLabel}</span>
        </p>
      )}

      {isRunning && latestTranscript && (
        <p className="mt-1 text-xs italic text-primary-foreground/70">
          Last message: &ldquo;{latestTranscript}&rdquo;
        </p>
      )}

      <p className="mt-2 text-xs text-primary-foreground/70">
        Completed {isRunning ? completed : 0}
      </p>
      <p className="mt-2 text-xs text-primary-foreground/60">
        Queue will remain visible until all calls complete.
      </p>
    </div>
  );
}
