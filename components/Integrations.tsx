"use client";

import { useState } from "react";
import { X, Plus, Save } from "lucide-react";

interface IntegrationBlock {
  id: string;
  crm: string;
  apiKey: string;
  saved: boolean;
}

const AVAILABLE_CRMS = ["HubSpot", "Salesforce", "Pipedrive", "Zoho", "Close.io"];

export default function Integrations() {
  const [integrations, setIntegrations] = useState<IntegrationBlock[]>([]);

  const handleAddIntegration = () => {
    setIntegrations((prev) => [
      ...prev,
      { id: Date.now().toString(), crm: "", apiKey: "", saved: false },
    ]);
  };

  const handleRemoveIntegration = (id: string) => {
    setIntegrations((prev) => prev.filter((block) => block.id !== id));
  };

  const handleUpdateIntegration = (
    id: string,
    field: keyof IntegrationBlock,
    value: string | boolean
  ) => {
    setIntegrations((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, [field]: value, saved: false } : block
      )
    );
  };

  const handleSaveIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, saved: true } : block
      )
    );
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0b132b] p-6 shadow-xl text-white">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 mb-5 flex items-center gap-2">
        <h2 className="text-xl font-semibold text-white/90">Integrations</h2>
        <p className="text-sm text-gray-400 ml-2">
          Manage CRM connections and API credentials.
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Integration Blocks */}
        {integrations.map((block) => (
          <div
            key={block.id}
            className="relative bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-md hover:border-blue-600 transition-all hover:shadow-blue-500/10"
          >
            {/* Remove Button */}
            <button
              onClick={() => handleRemoveIntegration(block.id)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* CRM Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select CRM
              </label>
              <select
                value={block.crm}
                onChange={(e) =>
                  handleUpdateIntegration(block.id, "crm", e.target.value)
                }
                className="w-full border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {AVAILABLE_CRMS.map((crm) => (
                  <option key={crm} value={crm}>
                    {crm}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={block.apiKey}
                onChange={(e) =>
                  handleUpdateIntegration(block.id, "apiKey", e.target.value)
                }
                placeholder="Enter API Key"
                className="w-full border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={() => handleSaveIntegration(block.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                  block.saved
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Save className="w-4 h-4" />
                {block.saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        ))}

        {/* Add Integration Button */}
        <button
          onClick={handleAddIntegration}
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 bg-gray-900 rounded-xl p-6 text-gray-400 hover:text-blue-400 hover:border-blue-500 transition-all"
        >
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-medium">Add Integration</span>
        </button>
      </div>
    </div>
  );
}
