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

type CallInitiationResult = {
  conversationId: string | null;
};

type CallStatusPayload = {
  conversation_id?: string;
  status: string | null;
  ended_at?: string | null;
  duration_sec?: number | null;
  cost_cents?: number | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const INITIAL_POLL_DELAY_MS = 3000;
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 1000 * 60 * 10; // 10 minutes safety timeout
const PENDING_STATUSES = new Set(["call.started"]);

export default function CallButton({ selectedLeads }: { selectedLeads: Lead[] }) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeQueueSize, setActiveQueueSize] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startCallForLead = async (
    lead: Lead,
    index: number,
    total: number
  ): Promise<CallInitiationResult | null> => {
    try {
      const res = await fetch("/api/outbound-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: [lead] }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        show({
          title: `Call ${index + 1} of ${total} Failed`,
          message: errData.error || `Call API failed with status ${res.status}`,
          variant: "error",
        });
        return null;
      }

      const data = await res.json();
      const agentNumber = data.from_number ?? data.agent_number ?? "";
      const leadName =
        data.lead_name ||
        [lead.first, lead.last].filter(Boolean).join(" ") ||
        lead.email ||
        "Unknown Lead";
      const leadEmail = data.lead_email ?? lead.email ?? "";
      const leadNumber = data.called_number ?? data.lead_number ?? lead.phone ?? "";

      const lines = [
        `Agent: ${agentNumber || "Unknown"}`,
        `Lead: ${leadName}`,
        leadEmail ? `Email: ${leadEmail}` : "",
        leadNumber ? `Phone: ${leadNumber}` : "",
      ].filter(Boolean);

      show({
        title: `Call ${index + 1} of ${total} Initiated`,
        message: lines.join(" | "),
        variant: "success",
      });

      const conversationId =
        (data.conversation_id as string | undefined) ??
        (data?.elevenlabs_response?.conversationId as string | undefined) ??
        null;

      return { conversationId };
    } catch (err) {
      console.error(`[OutboundCall] Error calling lead ${lead.id}:`, err);
      show({
        title: `Call ${index + 1} of ${total} Error`,
        message: "Failed to make outbound call. Check console for details.",
        variant: "error",
      });
      return null;
    }
  };

  const waitForCallCompletion = async (conversationId: string): Promise<CallStatusPayload> => {
    const expiresAt = Date.now() + POLL_TIMEOUT_MS;
    await sleep(INITIAL_POLL_DELAY_MS);

    while (isMountedRef.current && Date.now() < expiresAt) {
      const res = await fetch(`/api/outbound-calls/status/${conversationId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 204) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Status API failed with ${res.status}`);
      }

      const payload: CallStatusPayload = await res.json();
      const status = payload?.status ?? null;

      if (!status) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      if (!PENDING_STATUSES.has(status)) {
        return payload;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error("Call status polling timed out.");
  };

  const processCallQueue = async (queue: Lead[]) => {
    let initiated = 0;
    let completed = 0;

    for (let i = 0; i < queue.length; i++) {
      if (!isMountedRef.current) {
        break;
      }

      if (isMountedRef.current) {
        setCurrentIndex(i);
      }

      const lead = queue[i];
      const initiation = await startCallForLead(lead, i, queue.length);
      if (!initiation) {
        continue;
      }

      initiated += 1;
      const conversationId = initiation.conversationId;

      if (!conversationId) {
        show({
          title: `Call ${i + 1} of ${queue.length} Monitoring Skipped`,
          message: "Call ID missing; unable to monitor completion.",
          variant: "warning",
        });
        continue;
      }

      try {
        const statusPayload = await waitForCallCompletion(conversationId);
        completed += 1;
        const status = statusPayload?.status ?? "unknown";
        const normalized = status.toLowerCase();
        const succeeded =
          normalized.includes("post_call") ||
          normalized.includes("completed") ||
          normalized.includes("transcription");

        const duration =
          typeof statusPayload?.duration_sec === "number" && statusPayload.duration_sec > 0
            ? `Duration: ${statusPayload.duration_sec}s`
            : null;

        show({
          title: `Call ${i + 1} of ${queue.length} ${succeeded ? "Completed" : "Finished"}`,
          message: [`Status: ${status}`, duration].filter(Boolean).join(" | "),
          variant: succeeded ? "success" : "warning",
        });
      } catch (err: any) {
        console.error(`[OutboundCall] Polling error for ${conversationId}:`, err);
        show({
          title: `Call ${i + 1} of ${queue.length} Status Error`,
          message: err?.message || "Failed to confirm call completion.",
          variant: "error",
        });
      }
    }

    return { initiated, completed };
  };

  const makeOutboundCall = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      show({ message: "No leads selected", variant: "warning" });
      return;
    }

    const queue = [...selectedLeads];

    try {
      setLoading(true);
      if (isMountedRef.current) {
        setActiveQueueSize(queue.length);
        setCurrentIndex(0);
      }

      const { initiated, completed } = await processCallQueue(queue);

      const finalVariant =
        completed === queue.length && queue.length > 0
          ? "success"
          : initiated > 0
          ? "warning"
          : "error";

      const finalMessage =
        initiated === 0
          ? "No calls were initiated."
          : `Initiated ${initiated} and confirmed ${completed} of ${queue.length} lead${
              queue.length === 1 ? "" : "s"
            }.`;

      show({
        title: "Call queue processed",
        message: finalMessage,
        variant: finalVariant,
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setActiveQueueSize(null);
        setCurrentIndex(null);
      }
    }
  };

  const buttonLabel = (() => {
    if (!loading) {
      return `Call${selectedLeads.length > 1 ? "s" : ""}`;
    }
    if (currentIndex !== null && activeQueueSize) {
      return `Calling ${currentIndex + 1}/${activeQueueSize}`;
    }
    return "Calling...";
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
