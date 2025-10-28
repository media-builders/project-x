"use client";

import React, { useMemo } from "react";
import {
  useCallQueue,
  ACTIVE_QUEUE_STATUSES,
} from "@/context/CallQueueContext";
import { useLeadCallLogs } from "@/hooks/useLeadCallLogs";

const getLeadLabel = (lead: Record<string, unknown> | null | undefined) => {
  if (!lead || typeof lead !== "object") return null;
  const first = typeof (lead as any).first === "string" ? (lead as any).first : "";
  const last = typeof (lead as any).last === "string" ? (lead as any).last : "";
  const email = typeof (lead as any).email === "string" ? (lead as any).email : "";
  const phone = typeof (lead as any).phone === "string" ? (lead as any).phone : "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (email) return email;
  if (phone) return phone;
  return null;
};

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

export default function CallQueueStatusBar() {
  const { activeJob, status, isPolling } = useCallQueue();

  const statusIsActive = status && ACTIVE_QUEUE_STATUSES.has(status.status);
  const jobId = status?.job_id ?? activeJob?.jobId ?? "";
  const scheduledIso = status?.scheduled_start_at ?? activeJob?.scheduledAt ?? null;
  const scheduledDate = useMemo(
    () => (scheduledIso ? new Date(scheduledIso) : null),
    [scheduledIso]
  );
  const scheduledFuture =
    scheduledDate && !Number.isNaN(scheduledDate.getTime())
      ? scheduledDate.getTime() > Date.now()
      : false;

  const inProgress =
    status?.status === "running" ||
    status?.status === "pending" ||
    (statusIsActive && !scheduledFuture);

  const showActive = Boolean(
    jobId && (inProgress || scheduledFuture || isPolling)
  );

  const currentLeadId =
    showActive &&
    typeof status?.current_lead === "object" &&
    status?.current_lead &&
    typeof (status.current_lead as any).id === "string"
      ? ((status.current_lead as any).id as string)
      : null;

  const { entries } = useLeadCallLogs(currentLeadId);

  const total =
    status?.total_leads !== undefined ? status.total_leads : activeJob?.total ?? 0;
  const completed = status?.completed ?? 0;
  const initiated = status?.initiated ?? 0;
  const inFlight = Math.max(initiated - completed, 0);
  const progress = total > 0 ? Math.min((completed + inFlight) / total, 1) : 0;
  const percent = Math.round(progress * 100);
  const currentLeadLabel = getLeadLabel(status?.current_lead);
  const queueStatus = status?.status ?? (activeJob ? "pending" : "idle");

  let latestTranscript: string | null = null;
  if (entries.length) {
    const latestCall = entries[0];
    const turns = latestCall?.transcript ?? [];
    if (turns.length) {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn?.message) {
        latestTranscript = lastTurn.message;
      }
    }
  }

  return (
    <div className="call-queue-container">
      <div className="">
        <div>
          <p className="font-medium text-primary-foreground">
            {showActive
              ? scheduledFuture
                ? "Call queue scheduled"
                : "Call queue in progress"
              : "No active call queue"}
          </p>
          {showActive ? (
            <p className="text-xs text-primary-foreground/70">
              Job #{jobId.slice(0, 8)} &middot; Status: {queueStatus.replace(/_/g, " ")}
            </p>
          ) : (
            <p className="text-xs text-primary-foreground/70">
              Calls will appear here as soon as you start a queue.
            </p>
          )}
          {showActive && scheduledIso && (
            <p className="text-xs text-primary-foreground/60">
              Scheduled for {formatDateTime(scheduledIso)}
            </p>
          )}
        </div>
        <span className="rounded bg-primary-foreground/10 px-2 py-1 text-xs font-semibold text-primary-foreground/90">
          {showActive ? completed + inFlight : 0}/{showActive ? total : "—"}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded bg-primary/20">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${showActive && !scheduledFuture ? percent : 0}%` }}
        />
      </div>

      {showActive && currentLeadLabel && !scheduledFuture && (
        <p className="mt-2 text-sm text-primary-foreground/90">
          Calling: <span className="font-medium">{currentLeadLabel}</span>
        </p>
      )}
      {showActive && latestTranscript && !scheduledFuture && (
        <p className="mt-1 text-xs italic text-primary-foreground/70">
          Last message: &ldquo;{latestTranscript}&rdquo;
        </p>
      )}
      <p className="mt-2 text-xs text-primary-foreground/70">
        Completed {showActive ? completed : 0}
      </p>
      <p className="mt-2 text-xs text-primary-foreground/60">
        {isPolling
          ? "Refreshing queue status..."
          : showActive
          ? scheduledFuture
            ? "Queue will start automatically at the scheduled time."
            : "Calling List"
          : "No calls scheduled."}
      </p>
    </div>
  );
}
