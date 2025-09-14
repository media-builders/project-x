// components/DashboardMenu.tsx
// Minimal: add classes to reuse the table look; no functionality changes.
"use client";

import {useState} from 'react';
import LeadsTable from "@/components/Leads";
import SettingsPanel from "@/components/SettingsPanel";


export default function DasboardMenu() {
 
  // activeTab can be "Leads" or "Settings"
  // on first render the "Leads" tab loads 
  const [activeTab, setActiveTab] = useState<"Leads" | "Settings">("Leads");

  return (
    //dashboard holds the menu and content div
    <div className = "dashboard"> 
      
      <div className="dashboard-menu">
        <ul className="menu-list">
          <li 
            //highlights the Leads tab when selected
            className={`menu-item ${activeTab === "Leads" ? "is-active" : ""}`}
            onClick={() => setActiveTab("Leads")}>
            Leads
          </li>
          <li 
            //highlights the Settings tab when selected
            className={`menu-item ${activeTab === "Settings" ? "is-active" : ""}`}
            onClick={() => setActiveTab("Settings")}>
            Settings
          </li>
        </ul>
      </div>

      <div className = "dashboard-content">
        
        {activeTab === "Settings" && <SettingsPanel />}
      </div>

    </div>
  );
}
