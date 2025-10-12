"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import SetupButtons from "@/components/setup/SetupButtons";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [CRMKey, setCRMKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false); // for smooth exit animation

  const panelRef = useRef<HTMLDivElement | null>(null);

  // --- Click outside to close ---
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        triggerClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 200); // match animation duration
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/leads/save-crm-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmApiKey: CRMKey }),
      });

      if (res.ok) {
        setSaved(true);
        setCRMKey("");
      } else {
        console.error("Failed to save key");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        ref={panelRef}
        className={`relative bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-200 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Header with title + close button */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-3">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={triggerClose}
            className="text-gray-400 hover:text-white transition p-1 rounded-md hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form content */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              CRM API Key
            </label>
            <input
              type="text"
              value={CRMKey}
              onChange={(e) => setCRMKey(e.target.value)}
              placeholder="Enter your CRM API Key"
              className="w-full border border-gray-600 bg-gray-800 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading || !CRMKey}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium transition ${
              loading || !CRMKey
                ? "bg-blue-700/40 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? "Saving..." : "Save API Key"}
          </button>

          {saved && (
            <p className="text-green-400 text-sm font-medium mt-1 text-center">
              ✅ API Key Saved Successfully!
            </p>
          )}

          <div className="border-t border-gray-700 my-4" />

          <SetupButtons
            onImported={() => {
              console.log("Leads reloaded after import");
            }}
          />
        </div>
      </div>
    </div>
  );
}
