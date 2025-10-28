"use client";

import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/notifications/ToastProvider";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
  featured?: boolean;
};

type QueueStatusResponse = {
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

const ACTIVE_STATUSES = new Set(["pending", "running"]);

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
  const [queueJobId, setQueueJobId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatusResponse | null>(null);
  const [queueTotal, setQueueTotal] = useState<number | null>(null);
  const finalToastShown = useRef(false);

  useEffect(() => {
    if (!queueJobId) {
      return () => {
        /* noop */
      };
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/outbound-calls/queue/${queueJobId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Status request failed with ${res.status}`);
        }

        const data: QueueStatusResponse = await res.json();
        if (cancelled) {
          return;
        }

        setQueueStatus(data);
        setQueueTotal((prev) => prev ?? data.total_leads ?? null);

        if (ACTIVE_STATUSES.has(data.status)) {
          timeout = setTimeout(poll, 4000);
        } else {
          if (!finalToastShown.current) {
            finalToastShown.current = true;
            const variant =
              data.status === "succeeded"
                ? "success"
                : data.status === "failed"
                ? "error"
                : "warning";
            show({
              title: "Call queue finished",
              message: buildFinalMessage(data),
              variant,
            });
          }
          setLoading(false);
          setQueueJobId(null);
        }
      } catch (err: any) {
        if (cancelled) {
          return;
        }
        console.error("[CallQueue] polling error", err);
        show({
          title: "Queue status error",
          message: err?.message || "Failed to fetch queue status.",
          variant: "error",
        });
        setLoading(false);
        setQueueJobId(null);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [queueJobId, show]);

  const makeOutboundCall = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      show({ message: "No leads selected", variant: "warning" });
      return;
    }

    try {
      setLoading(true);
      finalToastShown.current = false;
      setQueueStatus(null);
      setQueueTotal(selectedLeads.length);

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
        setLoading(false);
        return;
      }

      const data: { job_id?: string; status?: string; total_leads?: number } = await res.json();
      if (!data.job_id) {
        show({
          title: "Queue start failed",
          message: "Missing job identifier from server response.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      setQueueJobId(data.job_id);
      setQueueTotal(data.total_leads ?? selectedLeads.length);
      show({
        title: "Call queue started",
        message: `Processing ${data.total_leads ?? selectedLeads.length} lead${selectedLeads.length === 1 ? "" : "s"}.`,
        variant: "success",
      });
    } catch (err: any) {
      console.error("[CallQueue] start error", err);
      show({
        title: "Queue error",
        message: err?.message || "Failed to start outbound call queue.",
        variant: "error",
      });
      setLoading(false);
    }
  };

  const buttonLabel = (() => {
    if (loading) {
      const total = queueTotal ?? selectedLeads.length;
      const initiated = queueStatus?.initiated ?? 0;
      const completed = queueStatus?.completed ?? 0;
      const inFlight = Math.max(initiated - completed, 0);
      if (total > 0) {
        const progress = Math.min(completed + inFlight, total);
        return `Calling ${progress}/${total}`;
      }
      return "Queueing...";
    }

    return `Call${selectedLeads.length > 1 ? "s" : ""}`;
  })();

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={makeOutboundCall}
      disabled={selectedLeads.length === 0 || loading}
    >
      {buttonLabel}
    </button>
  );
}
