"use client";

import React from "react";
import { User as UserIcon } from "lucide-react"; // 👈 person icon

type AgentPresetGridProps = {
  presets: Record<string, { name?: string; title?: string }>;
  activePreset: string;
  onSelect: (presetName: string) => void;
};

export default function AgentPresetGrid({
  presets,
  activePreset,
  onSelect,
}: AgentPresetGridProps) {
  const entries = Object.entries(presets || {});
  if (!entries.length)
    return (
      <p className="text-gray-500 text-sm italic mt-4">
        No presets available for this agent.
      </p>
    );

  return (
    <div className="section-grid">
      {entries.map(([presetName, data]) => (
        <div
          key={presetName}
          onClick={() => onSelect(presetName)}
          className={`cursor-pointer transition-all ${
            activePreset === presetName ? "card card-active" : "card"
          }`}
        >
          <div className="agent-card-title">
            <UserIcon /> {/* 👈 user/person icon */}
            <h3>{presetName}</h3>
          </div>

          <div className="agent-card-content">
            <h4 className="agent-name">
              {data.name || <span>None</span>}
            </h4>
            <p className="agent-title">
              {data.title || <span>None</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
