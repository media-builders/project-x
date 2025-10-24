"use client";

import React from "react";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
  featured?: boolean;
};

export default function CallButton({ selectedLeads }: { selectedLeads: Lead[] }) {
  const makeOutboundCall = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      alert("No leads selected");
      return;
    }

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
      // Build a clean, user-friendly message without undefined values.
      const selected = selectedLeads?.[0] ?? ({} as Partial<Lead>);
      const agentNumber = data.from_number ?? data.agent_number ?? "";
      const leadName =
        data.lead_name ||
        [selected.first, selected.last].filter(Boolean).join(" ") ||
        (selected as any).name ||
        "Unknown Lead";
      const leadEmail = data.lead_email ?? selected.email ?? "";
      const leadNumber = data.called_number ?? data.lead_number ?? selected.phone ?? "";
      const lines = [
        `${agentNumber || "Unknown Caller"} - Calling Lead`,
        leadName,
        leadEmail,
        leadNumber,
      ].filter(Boolean);
      alert(lines.join("\n"));
      return;
      alert(
        `${data.agent_number} — Calling Lead\n` +
        `${data.lead_name}\n` +
        `${data.lead_email}\n` +
        `${data.lead_number}`
      );
    } catch (err) {
      console.error(err);
      alert("Failed to make outbound call");
    }
  };

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={makeOutboundCall}
      disabled={selectedLeads.length === 0}
    >
      Call{selectedLeads.length > 1 ? "s" : ""}
    </button>
  );
}
