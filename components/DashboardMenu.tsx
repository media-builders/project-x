"use client";

import { useState } from "react";
import SettingsPanel from "@/components/SettingsPanel";

interface DashboardMenuProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

export default function DashboardMenu({ activeTab, onChangeTab }: DashboardMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="dashboard-menu">
      <ul className="menu-list">
        {/* Leads */}
        <li
          className={`menu-item ${activeTab === "leads" ? "is-active" : ""}`}
          onClick={() => onChangeTab("leads")}
        >
          Leads
        </li>

        {/* Agents */}
        <li
          className={`menu-item ${activeTab === "dialer" ? "is-active" : ""}`}
          onClick={() => onChangeTab("dialer")}
        >
          Agents
        </li>

        {/* Calendar */}
        <li
          className={`menu-item ${activeTab === "calendar" ? "is-active" : ""}`}
          onClick={() => onChangeTab("calendar")}
        >
          Calendar
        </li>

        {/* 🌐 New Integrations Tab */}
        <li
          className={`menu-item ${activeTab === "integrations" ? "is-active" : ""}`}
          onClick={() => onChangeTab("integrations")}
        >
          Integrations
        </li>

        {/* Settings (popup modal) */}
        <li
          className={`menu-item ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setShowSettings(true)}
        >
          Settings
        </li>
      </ul>

      {/* ⚙️ Settings Panel Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
