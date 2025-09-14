"use client";

import { useState, useEffect } from "react";

export default function SettingsPanel() {
    const{CRMKey, setCRMKey} = useState("");
    const{saved, setSaved} = useState(false);
    //const[loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!CRMKey.trim()) return;

    // Simulate saving
    setSaved("API Key saved");
    setCRMKey(""); // clear the input
  };

  return (
    <div className="settings-panel p-6">
      <h2 className="text-xl font-bold mb-4">User Settings</h2>

      <div className="flex flex-col gap-3 max-w-md">
        <label className="text-sm font-medium text-gray-700">
          CRM API Key
        </label>

        <input
          type="text"
          value={CRMKey}
          onChange={(e) => setCRMKey(e.target.value)}
          placeholder="Enter your CRM API Key"
          className="border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
        />

        <button
          onClick={handleSave}
          className="btn btn-primary px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Save API Key
        </button>

        {saved && (
          <p className="text-green-600 font-medium">{saved}</p>
        )}
      </div>
    </div>
  );
}
