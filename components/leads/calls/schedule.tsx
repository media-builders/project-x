"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, X, CalendarDays, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

// ==========================
// Types
// ==========================
type Campaign = {
  id: number;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
};

// ==========================
// Default Mock Data
// ==========================
const mockCampaigns: Campaign[] = [
  {
    id: 1,
    name: "Morning Outreach",
    days: ["Mon", "Tue"],
    startTime: "09:00",
    endTime: "17:00",
    timezone: "EST",
  },
  {
    id: 2,
    name: "Evening Follow-ups",
    days: ["Wed", "Thu"],
    startTime: "17:00",
    endTime: "20:00",
    timezone: "EST",
  },
];

// ==========================
// Main Component
// ==========================
export default function CallCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [selectedId, setSelectedId] = useState<number | null>(
    mockCampaigns[0]?.id ?? null
  );
  const [lastFocusedId, setLastFocusedId] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeCampaign: Campaign | null = useMemo(() => {
    if (!campaigns.length) return null;
    return campaigns.find((c) => c.id === selectedId) ?? campaigns[0];
  }, [campaigns, selectedId]);

  useEffect(() => {
    if (activeCampaign && activeCampaign.id !== lastFocusedId && nameInputRef.current) {
      nameInputRef.current.focus();
      setLastFocusedId(activeCampaign.id);
    }
  }, [activeCampaign, lastFocusedId]);

  // ==========================
  // CRUD Handlers
  // ==========================
  const handleAddCampaign = () => {
    const newCamp: Campaign = {
      id: Date.now(),
      name: "Untitled Campaign",
      days: [],
      startTime: "09:00",
      endTime: "17:00",
      timezone: "EST",
    };
    setCampaigns((prev) => [...prev, newCamp]);
    setSelectedId(newCamp.id);
  };

  const handleRemoveCampaign = (id: number) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(campaigns[0]?.id ?? null);
    }
  };

  const updateCampaign = (updates: Partial<Campaign>) => {
    if (!activeCampaign) return;
    setCampaigns((prev) =>
      prev.map((c) => (c.id === activeCampaign.id ? { ...c, ...updates } : c))
    );
  };

  const toggleDay = (day: string) => {
    if (!activeCampaign) return;
    const updated = activeCampaign.days.includes(day)
      ? activeCampaign.days.filter((d) => d !== day)
      : [...activeCampaign.days, day];
    updateCampaign({ days: updated });
  };

  const handleSave = () => {
    if (!activeCampaign) return;
    console.log("Saved Campaign:", activeCampaign);
  };

  const handleExport = () => {
    if (!activeCampaign) return;
    const blob = new Blob([JSON.stringify(activeCampaign, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeCampaign.name.replace(/\s+/g, "_")}_campaign.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ==========================
  // UI
  // ==========================
  return (
    <div>
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 mb-5">
        <h2 className="text-xl font-semibold text-white/90">Campaigns</h2>
        <p className="text-sm text-gray-400">
          Manage call campaigns and their schedules.
        </p>
      </div>

      {/* Campaign Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            onClick={() => setSelectedId(camp.id)}
            className={`relative cursor-pointer rounded-xl border transition-all p-5 ${
              activeCampaign?.id === camp.id
                ? "border-blue-600 bg-blue-950/30 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                : "border-gray-800 bg-gray-900 hover:border-blue-700 hover:bg-gray-800/80"
            }`}
          >
            {/* Remove Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveCampaign(camp.id);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-3">
              <div className="font-semibold text-lg text-white">{camp.name}</div>
              <div className="text-gray-400 text-sm italic">
                {camp.days.join(", ") || "No days set"}
              </div>
            </div>

            <div className="text-xs text-blue-400 bg-blue-900/40 px-3 py-1 rounded-full w-fit">
              {camp.timezone}
            </div>
          </div>
        ))}

        {/* Add Campaign */}
        <button
          onClick={handleAddCampaign}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900 p-8 text-gray-400 hover:text-blue-400 hover:border-blue-500 transition-all"
        >
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-medium">Add Campaign</span>
        </button>
      </div>

      {/* Selected Campaign Settings */}
      {activeCampaign && (
        <div className="space-y-6 mt-6">
          <h3 className="text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2">
            {activeCampaign.name}
          </h3>

          {/* General Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Name</label>
              <input
                type="text"
                ref={nameInputRef}
                value={activeCampaign.name}
                onChange={(e) => updateCampaign({ name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">Time Zone</label>
              <select
                value={activeCampaign.timezone}
                onChange={(e) => updateCampaign({ timezone: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              >
                <option value="EST">Eastern (EST)</option>
                <option value="CST">Central (CST)</option>
                <option value="MST">Mountain (MST)</option>
                <option value="PST">Pacific (PST)</option>
              </select>
            </div>
          </div>

          {/* Days */}
          <div>
            <div className="flex items-center mb-2 text-gray-300">
              <CalendarDays className="w-4 h-4 mr-2 text-blue-400" />
              <label className="text-sm">Calling Days</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {allDays.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1 rounded-md text-sm border ${
                    activeCampaign.days.includes(d)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time Settings */}
          <div>
            <div className="flex items-center mb-2 text-gray-300">
              <Clock className="w-4 h-4 mr-2 text-blue-400" />
              <label className="text-sm">Calling Hours</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Start Time</label>
                <input
                  type="time"
                  value={activeCampaign.startTime}
                  onChange={(e) => updateCampaign({ startTime: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">End Time</label>
                <input
                  type="time"
                  value={activeCampaign.endTime}
                  onChange={(e) => updateCampaign({ endTime: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Save + Export */}
          <div className="flex justify-end gap-4 border-t border-gray-700 pt-4">
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Campaign
            </Button>
            <Button
              onClick={handleExport}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold"
            >
              Export Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
