"use client";

import React, { useEffect, useRef, useState } from "react";
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

export default function CallButton({ selectedLeads }: { selectedLeads: Lead[] }) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const lastFinishedJobRef = useRef<string | null>(null);
  const sawActiveJobRef = useRef(false);
  const { beginQueue, status, activeJob, isPolling } = useCallQueue();

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

    try {
      setLoading(true);
      const res = await fetch("/api/outbound-calls/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
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

      const data: { job_id?: string; total_leads?: number } = await res.json();

      if (!data.job_id) {
        show({
          title: "Queue start failed",
          message: "Missing job identifier from server response.",
          variant: "error",
        });
        return;
      }

      beginQueue(data.job_id, data.total_leads ?? selectedLeads.length, null);
      show({
        title: "Call queue started",
        message: `Processing ${data.total_leads ?? selectedLeads.length} lead${
          selectedLeads.length === 1 ? "" : "s"
        }.`,
        variant: "success",
      });
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
    if (loading) return "Queueing...";
    if (queueRunning) {
      if (total > 0) {
        return `Calling ${progress}/${total}`;
      }
      return "Calling…";
    }
    return `Call${selectedLeads.length > 1 ? "s" : ""}`;
  })();

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={handleClick}
      disabled={selectedLeads.length === 0 || loading || queueRunning}
    >
      {buttonLabel}
    </button>
  );
}
