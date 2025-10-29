"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/notifications/ToastProvider";
import {
  useCallQueue,
  ACTIVE_QUEUE_STATUSES,
  type QueueStatusResponse,
} from "@/context/CallQueueContext";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
  featured?: boolean;
};

const FINAL_QUEUE_STATUSES = new Set([
  "succeeded",
  "failed",
  "completed_with_errors",
  "cancelled",
]);

const buildFinalMessage = (data: QueueStatusResponse) => {
  const total = data.total_leads ?? 0;
  const completed = data.completed ?? 0;
  const failed = data.failed ?? 0;

  switch (data.status) {
    case "succeeded":
      return `Completed ${completed} of ${total} lead${total === 1 ? "" : "s"}.`;
    case "failed":
      return failed === total
        ? `All ${total} lead${total === 1 ? "" : "s"} failed.`
        : `Queue failed with ${failed} of ${total} lead${total === 1 ? "" : "s"}.`;
    case "completed_with_errors":
      return `Finished ${completed} of ${total} lead${total === 1 ? "" : "s"}; ${failed} failed.`;
    default:
      return `Processed ${completed} of ${total} lead${total === 1 ? "" : "s"}.`;
  }
};

const formatIsoForDisplay = (iso?: string | null) => {
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

const toOffsetString = (offsetMinutes: number) => {
  const sign = offsetMinutes <= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
};

export default function CallButton({ selectedLeads }: { selectedLeads: Lead[] }) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const lastFinishedJobRef = useRef<string | null>(null);
  const sawActiveJobRef = useRef(false);

  const { beginQueue, status, activeJob, isPolling } = useCallQueue();

  const timezoneOffset = useMemo(
    () => toOffsetString(new Date().getTimezoneOffset()),
    []
  );

  const scheduledIso = useMemo(() => {
    if (!scheduleEnabled || !scheduleDate) return null;
    const isoCandidate = `${scheduleDate}T${scheduleTime || "00:00"}${timezoneOffset}`;
    const parsed = new Date(isoCandidate);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }, [scheduleEnabled, scheduleDate, scheduleTime, timezoneOffset]);

  useEffect(() => {
    if (!status) return;
    if (ACTIVE_QUEUE_STATUSES.has(status.status)) {
      sawActiveJobRef.current = true;
      return;
    }
    if (!status.job_id || !FINAL_QUEUE_STATUSES.has(status.status)) {
      sawActiveJobRef.current = false;
      return;
    }
    if (!sawActiveJobRef.current) return;
    if (status.job_id === lastFinishedJobRef.current) return;

    lastFinishedJobRef.current = status.job_id;
    sawActiveJobRef.current = false;
    show({
      title: "Call queue finished",
      message: buildFinalMessage(status),
      variant:
        status.status === "succeeded"
          ? "success"
          : status.status === "failed"
          ? "error"
          : "warning",
    });
  }, [status, show]);

  const handleClick = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      show({ message: "No leads selected", variant: "warning" });
      return;
    }

    if (scheduleEnabled && !scheduleDate) {
      show({
        title: "Schedule incomplete",
        message: "Choose a start date before scheduling the queue.",
        variant: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, unknown> = { leads: selectedLeads };

      if (scheduleEnabled) {
        if (scheduledIso) {
          payload.schedule = { startAt: scheduledIso };
        } else {
          payload.schedule = {
            startDate: scheduleDate,
            startTime: scheduleTime || "00:00",
            timezoneOffset,
          };
        }
      }

      const res = await fetch("/api/outbound-calls/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        show({
          title: "Queue start failed",
          message: errData.error || `Queue API failed with status ${res.status}`,
          variant: "error",
        });
        return;
      }

      const data: {
        job_id?: string;
        total_leads?: number;
        scheduled_start_at?: string | null;
      } = await res.json();

      if (!data.job_id) {
        show({
          title: "Queue start failed",
          message: "Missing job identifier from server response.",
          variant: "error",
        });
        return;
      }

      beginQueue(
        data.job_id,
        data.total_leads ?? selectedLeads.length,
        data.scheduled_start_at
      );

      if (data.scheduled_start_at) {
        show({
          title: "Call queue scheduled",
          message: `Will dial ${data.total_leads ?? selectedLeads.length} lead${
            selectedLeads.length === 1 ? "" : "s"
          } starting ${formatIsoForDisplay(data.scheduled_start_at) || "soon"}.`,
          variant: "success",
        });
      } else {
        show({
          title: "Call queue started",
          message: `Processing ${data.total_leads ?? selectedLeads.length} lead${
            selectedLeads.length === 1 ? "" : "s"
          }.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      console.error("[CallQueue] start error", err);
      show({
        title: "Queue error",
        message: err?.message || "Failed to start outbound call queue.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const total = status?.total_leads ?? activeJob?.total ?? selectedLeads.length;
  const initiated = status?.initiated ?? 0;
  const completed = status?.completed ?? 0;
  const inFlight = Math.max(initiated - completed, 0);
  const progress = Math.min(completed + inFlight, total || 0);

  const queueRunning = Boolean(
    (status &&
      status.status !== "scheduled" &&
      ACTIVE_QUEUE_STATUSES.has(status.status)) ||
      (!status && activeJob && !activeJob.scheduledAt)
  );

  const buttonLabel = (() => {
    if (loading || queueRunning || isPolling) {
      if (total > 0) {
        return `Calling ${progress}/${total}`;
      }
      return "Queueing...";
    }
    return `Call${selectedLeads.length > 1 ? "s" : ""}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleClick}
        disabled={
          selectedLeads.length === 0 || loading || queueRunning || isPolling
        }
      >
        {buttonLabel}
      </button>

      <label className="flex items-center gap-2 text-sm text-primary-foreground/80">
        <input
          type="checkbox"
          checked={scheduleEnabled}
          onChange={(event) => setScheduleEnabled(event.target.checked)}
        />
        Schedule this queue to start later
      </label>

      {scheduleEnabled && (
        <div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-primary-foreground/60">
                Start date
              </span>
              <input
                type="date"
                value={scheduleDate}
                onChange={(event) => setScheduleDate(event.target.value)}
                className="rounded border border-primary/40 bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-primary-foreground/60">
                Start time
              </span>
              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                step={60}
                className="rounded border border-primary/40 bg-background px-2 py-1 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-primary-foreground/60">
            Times use your local offset ({timezoneOffset}). Leave the time blank to start at
            midnight.
          </p>
          {(scheduledIso || activeJob?.scheduledAt) && (
            <p className="text-xs text-primary-foreground/80">
              Scheduled for{" "}
              {formatIsoForDisplay(scheduledIso ?? activeJob?.scheduledAt) || "—"}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
