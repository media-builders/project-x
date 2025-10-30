"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SetupWizard from "@/components/settings/setup/SetupWizard";
import FUBLogo from "@/public/images/fub/FUB Logo RGB_Knockout.png";
import Integrations from "@/components/settings/Integrations";
import UserRelationships from "@/components/settings/UserRelationships";
import Team from "@/components/settings/Team";


export default function SettingsPanel() {
  const [CRMKey, setCRMKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  // ✅ Supabase-style session load (consistent with AgentProfile)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const { user } = await res.json();
        if (user?.id && user?.email) {
          setCurrentUser({ id: user.id, email: user.email });
        }
      } catch (err) {
        console.error("Failed to load user session", err);
      }
    };
    loadUser();
  }, []);

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
    <div>
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white/90">Settings</h2>
          <p className="text-sm text-gray-400">Manage general settings.</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="btn btn-primary px-4 py-2 text-sm font-medium"
        >
          Setup Wizard
        </button>
      </div>

      {/* CRM API Key form */}
      <div className="flex flex-col gap-4 max-w-md">
        <div>
          <Image
            src={FUBLogo}
            alt="Follow Up Boss Logo"
            width={100}
            height={80}
            priority
            className="object-contain"
          />
        </div>

        <input
          type="text"
          value={CRMKey}
          onChange={(e) => setCRMKey(e.target.value)}
          placeholder="Enter your CRM API Key"
          className="w-full border border-gray-600 bg-gray-800 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

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
      </div>

      {/* Modal Overlay for Setup Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-[90%] max-w-5xl bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            <button
              onClick={() => setShowWizard(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
            <div className="p-4">
              <SetupWizard />
            </div>
          </div>
        </div>
      )}

      {/* Integrations */}
      <div>
        <Integrations />
      </div>

      {/* User Relationship Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white/90 mb-2">User Relationship Invites</h3>
        <p className="text-sm text-gray-400 mb-4">Invite team members or accept invites from others.</p>
        {currentUser ? (
          <UserRelationships
            currentUserId={currentUser.id}
            currentUserEmail={currentUser.email}
          />
        ) : (
          <p className="text-gray-400 text-sm">Loading user session…</p>
        )}
      </div>

      <div className="mt-8">
        <Team />
      </div>


    </div>
  );
}
