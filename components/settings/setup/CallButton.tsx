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
