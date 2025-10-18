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

 const debugAgents = async () => {
  const res = await fetch("/api/elevenlabs-agent/debug");
  const data = await res.json();
  const agents = Array.isArray(data.agents) ? data.agents : [];
  if (!agents.length) return alert("No agents visible to this API key.");

  const lines = agents.map((a: any, i: number) =>
    `${i + 1}. ${a.name || "(no name)"}  —  ${a.id || "(id not found)"}`
  );
  alert(`Found ${agents.length} agent(s):\n\n${lines.join("\n")}`);
};


  
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn btn-primary" onClick={elevenlabsSetup}>
        Agent Setup
      </button>
      <button type="button" className="btn btn-ghost" onClick={debugAgents}>
          Debug Agents
      </button>
    </div>
  );
}
