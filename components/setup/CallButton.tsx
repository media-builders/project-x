"use client";

import React, { useState } from "react";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

export default function CallButton({ selectedLeads }: { selectedLeads: Lead[] }) {
  const [loading, setLoading] = useState(false);

  const makeOutboundCall = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      alert("No leads selected");
      return;
    }

    setLoading(true);
    try {
      console.log("Initiating outbound call via ElevenLabs + Twilio...");

      const res = await fetch("/api/outbound-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Call API failed with status ${res.status}`);
        return;
      }

      const data = await res.json();

      console.log("Call initiated:", {
        from: data.from_number,
        to: data.called_number,
      });
      alert(
        `Call initiated! Calling ${data.lead_name || "Lead"}...\n\nFrom: ${data.from_number}`
      );
    } catch (err) {
      console.error(err);
      alert("Failed to make outbound call");
    } finally {
      setLoading(false);
    }
  };

  const startQueueCalls = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      alert("No leads selected");
      return;
    }

    setLoading(true);
    try {
      console.log("Starting queued outbound calls...");

      const res = await fetch("/api/outbound-calls/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Queue API failed with status ${res.status}`);
        return;
      }

      alert(
        `📞 Queue started!\n${selectedLeads.length} calls will be made sequentially.`
      );
    } catch (err) {
      console.error(err);
      alert("Failed to start call queue");
    } finally {
      setLoading(false);
    }
  };

  const isQueueMode = selectedLeads.length > 1;

  return (
    <button
      type="button"
      className={`btn ${isQueueMode ? "btn-accent" : "btn-primary"}`}
      onClick={isQueueMode ? startQueueCalls : makeOutboundCall}
      disabled={selectedLeads.length === 0 || loading}
    >
      {loading
        ? isQueueMode
          ? "Starting Queue..."
          : "Calling..."
        : isQueueMode
        ? `Queue Calls (${selectedLeads.length})`
        : "Call"}
    </button>
  );
}
