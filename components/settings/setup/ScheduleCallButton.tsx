"use client";

import React, { useMemo, useState } from "react";
import { useToast } from "@/components/notifications/ToastProvider";
import {
  useCallQueue,
  ACTIVE_QUEUE_STATUSES,
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

const toOffsetString = (offsetMinutes: number) => {
  const sign = offsetMinutes <= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
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

export default function ScheduleCallButton({
  selectedLeads,
}: {
  selectedLeads: Lead[];
}) {
  const { show } = useToast();
  const { beginQueue, status, activeJob, isPolling } = useCallQueue();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const timezoneOffset = useMemo(
    () => toOffsetString(new Date().getTimezoneOffset()),
    []
  );

  const scheduledIso = useMemo(() => {
    if (!scheduleDate) return null;
    const isoCandidate = `${scheduleDate}T${scheduleTime || "00:00"}${timezoneOffset}`;
    const parsed = new Date(isoCandidate);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }, [scheduleDate, scheduleTime, timezoneOffset]);

  const handleSchedule = async () => {
    if (selectedLeads.length === 0) {
      show({ message: "No leads selected", variant: "warning" });
      return;
    }
    if (!scheduleDate) {
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
      if (scheduledIso) {
        payload.schedule = { startAt: scheduledIso };
      } else {
        payload.schedule = {
          startDate: scheduleDate,
          startTime: scheduleTime || "00:00",
          timezoneOffset,
        };
      }

      const res = await fetch("/api/outbound-calls/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        show({
          title: "Schedule failed",
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
          title: "Schedule failed",
          message: "Missing job identifier from server response.",
          variant: "error",
        });
        return;
      }

      beginQueue(
        data.job_id,
        data.total_leads ?? selectedLeads.length,
        data.scheduled_start_at ?? scheduledIso
      );

      show({
        title: "Call queue scheduled",
        message: `Will dial ${data.total_leads ?? selectedLeads.length} lead${
          selectedLeads.length === 1 ? "" : "s"
        } starting ${
          formatIsoForDisplay(data.scheduled_start_at ?? scheduledIso) || "soon"
        }.`,
        variant: "success",
      });

      setOpen(false);
      setScheduleDate("");
      setScheduleTime("");
    } catch (err: any) {
      console.error("[CallQueue] schedule error", err);
      show({
        title: "Schedule error",
        message: err?.message || "Failed to schedule outbound call queue.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const queueRunning = Boolean(
    (status &&
      status.status !== "scheduled" &&
      ACTIVE_QUEUE_STATUSES.has(status.status)) ||
      (!status && activeJob && !activeJob.scheduledAt)
  );

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen((prev) => !prev)}
        disabled={selectedLeads.length === 0 || loading || queueRunning || isPolling}
      >
        {open ? "Hide schedule" : "Schedule queue"}
      </button>

      {open && (
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
            Times use your local offset ({timezoneOffset}). Leave the time blank to
            start at midnight.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSchedule}
              disabled={loading || selectedLeads.length === 0}
            >
              {loading ? "Scheduling…" : "Schedule queue"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

