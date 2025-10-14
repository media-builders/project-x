"use client";

import React from "react";

type AgentSetupButtonProps = {
  onSuccess?: () => void; // optional callback for wizard flow
};

export default function AgentSetupButton({ onSuccess }: AgentSetupButtonProps) {
  const elevenlabsSetup = async () => {
    try {
      console.log("🔄 Creating or retrieving ElevenLabs agent...");

      const res = await fetch("/api/elevenlabs-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("❌ ElevenLabs Setup Error:", errData.error || `Agent API failed with status ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!data.agent) {
        console.warn("⚠️ No agent returned from ElevenLabs API.");
        return;
      }

      console.log(`✅ ElevenLabs Agent setup successful: ${data.agent.name}`);
      if (onSuccess) onSuccess(); // wizard advances automatically
    } catch (err) {
      console.error("🚨 Failed to create/retrieve ElevenLabs agent:", err);
    }
  };

  return (
    <button type="button" className="btn btn-primary" onClick={elevenlabsSetup}>
      Agent Setup
    </button>
  );
}
