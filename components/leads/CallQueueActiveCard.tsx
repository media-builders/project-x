"use client";

import React, { useMemo } from "react";
import { useCallQueue } from "@/context/CallQueueContext";
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

export default function CallQueueActiveCard() {
  const { status } = useCallQueue();

  const job = useMemo(() => {
    if (!status || status.status !== "running") return null;
    return status;
  }, [status]);

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
            Job #{job.job_id.slice(0, 8)} &middot; Status: {job.status.replace(/_/g, " ")}
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
          style={{ width: `${percent}%` }}
        />
      </div>

      {leadLabel && (
        <p className="mt-2 text-sm text-primary-foreground/90">
          Calling: <span className="font-medium">{leadLabel}</span>
        </p>
      )}

      {latestTranscript && (
        <p className="mt-1 text-xs italic text-primary-foreground/70">
          Last message: &ldquo;{latestTranscript}&rdquo;
        </p>
      )}

      <p className="mt-2 text-xs text-primary-foreground/70">
        Completed {completed}
      </p>
      <p className="mt-2 text-xs text-primary-foreground/60">
        Queue will remain visible until all calls complete.
      </p>
    </div>
  );
}

