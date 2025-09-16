"use client";

import { useState, useEffect } from "react";

export default function SettingsPanel({ onClose }: {onClose: () => void }) {
    const[CRMKey, setCRMKey] = useState("");
    const[saved, setSaved] = useState(false);
    //const[loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!CRMKey.trim()) return;
    // Simulate saving
    setSaved(true);
    setCRMKey(""); // clear the input
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        
        <div className = "flex flex-col gap-3 items-center">
          <label className = "text-sm font-medium">CRM API Key </label>      
          <input
            type="text"
            value={CRMKey}
            onChange={(e) => setCRMKey(e.target.value)}
            placeholder="Enter your CRM API Key"
            className="border rounded-md px-3 py-2 text-black focus:outline-none focus:ring focus:ring-blue-300"
          />

          <button
            onClick={handleSave}
            className="btn btn-primary px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
          Save API Key
          </button>

          {saved && <p className="text-green-400 font-medium ">API Key Saved!</p>}
        </div>

        <button
          onClick={onClose}
          className = "mt-6 px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700">
          Close
        </button>

      </div>
    </div>
  );
}
