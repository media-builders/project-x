"use client";

import React from "react";

export default function AgentSetupButton() {
  const elevenlabsSetup = async () => {
    try {
      console.log("Creating/retrieving ElevenLabs agent...");

      const res = await fetch("/api/elevenlabs-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Agent API failed with status ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!data.agent) {
        alert("Agent not returned from API");
        return;
      }

      alert(`${data.agent.name} has been successfully setup in ElevenLabs.`);
    } catch (err) {
      console.error(err);
      alert("Failed to create/retrieve agent");
    }
  };

  return (
      <button type="button" className="btn btn-primary" onClick={elevenlabsSetup}>
        Agent Setup
      </button>
  );
}
