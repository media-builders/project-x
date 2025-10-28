"use client";

import React, { useState } from "react";
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

export default function CallButton({ selectedLeads }: { selectedLeads: Lead[] }) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  const makeOutboundCall = async () => {
    if (!selectedLeads || selectedLeads.length === 0) {
      show({ message: "No leads selected", variant: "warning" });
      return;
    }

    try {
      setLoading(true);
      console.log("Initiating outbound call via ElevenLabs + Twilio...");

      const res = await fetch("/api/outbound-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        show({
          title: "Call Error",
          message: errData.error || `Call API failed with status ${res.status}`,
          variant: "error",
        });
        return;
      }

      const data = await res.json();

      // 🧩 Build user-friendly message preserving all values
      const selected = selectedLeads?.[0] ?? ({} as Partial<Lead>);
      const agentNumber = data.from_number ?? data.agent_number ?? "";
      const leadName =
        data.lead_name ||
        [selected.first, selected.last].filter(Boolean).join(" ") ||
        (selected as any).name ||
        "Unknown Lead";
      const leadEmail = data.lead_email ?? selected.email ?? "";
      const leadNumber = data.called_number ?? data.lead_number ?? selected.phone ?? "";

      // 🧠 Construct readable output
      const lines = [
        `${agentNumber || "Unknown Caller"} — Calling Lead`,
        leadName,
        leadEmail,
        leadNumber,
      ].filter(Boolean);

      // ✅ Toast notification
      show({
        title: "Call Initiated",
        message: lines.join(" · "),
        variant: "success",
      });
    } catch (err: any) {
      console.error("[OutboundCall] Error:", err);
      show({
        title: "Outbound Error",
        message: "Failed to make outbound call. Check console for details.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={makeOutboundCall}
      disabled={selectedLeads.length === 0 || loading}
    >
      {loading ? "Calling..." : `Call${selectedLeads.length > 1 ? "s" : ""}`}
    </button>
  );
}
