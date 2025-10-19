"use client";

import { useState } from "react";
import Image from "next/image";
import SetupButtons from "@/components/settings/setup/SetupButtons";
import SetupWizard from "@/components/settings/setup/SetupWizard"; // ✅ import the wizard
import FUBLogo from "@/public/images/fub/FUB Logo RGB_Knockout.png";
import DriveFiles from "@/components/DriveFiles";
import GmailClient from "@/components/GmailClient";
import OverlayTest from "@/components/OverlayTest";



export default function SettingsPanel() {
  const [CRMKey, setCRMKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false); // ✅ wizard modal control

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
    <div className="">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white/90">Settings</h2>
          <p className="text-sm text-gray-400">Manage general settings.</p>
        </div>

        {/* ✅ Setup Wizard Button */}
        <button
          onClick={() => setShowWizard(true)}
          className="btn btn-primary px-4 py-2 text-sm font-medium"
        >
          Setup Wizard
        </button>
      </div>

      {/* CRM API Key form */}
      {/* <div className="flex flex-col gap-4 max-w-md">
        <div className="">
          <Image
            src={FUBLogo}
            alt="Follow Up Boss Logo"
            width={100}
            height={80}
            priority
            className="object-contain"
          />
        </div>

        <div>
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
      </div> */}

      {/* ✅ Modal Overlay for Setup Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-[90%] max-w-5xl bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            {/* Close Button */}
            <button
              onClick={() => setShowWizard(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              ✕
            </button>

            {/* Wizard Content */}
            <div className="p-4">
              <SetupWizard />
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 space-y-10">
        {/* <section>
          <h1 className="text-2xl font-bold mb-4">Drive Dashboard</h1>
          <DriveFiles />
        </section>

        <section>
          <h1 className="text-2xl font-bold mb-4">Gmail Inbox</h1>
          <GmailClient />
        </section> */}

        <section>
          <h1 className="text-2xl font-bold mb-4">Overlay Test</h1>
          <OverlayTest />;
        </section>
      </div>

      


    </div>
  );
}
