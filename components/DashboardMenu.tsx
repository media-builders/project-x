// components/DashboardMenu.tsx
// Minimal: add classes to reuse the table look; no functionality changes.
"use client";

import {useState} from 'react';
import LeadsTable from "@/components/Leads";
import SettingsPanel from "@/components/SettingsPanel";


export default function DasboardMenu() { 
  const [showSettings, setshowSettings] = useState(false);

  return (
      <div className="dashboard-menu">
        <ul className="menu-list">
          <li 
            //Leads tab is opened by default when first rendered
            className={`menu-item ${!showSettings ? "is-active" : ""}`}
            onClick={() => setshowSettings(false)}>
            Leads
          </li>
          <li 
            //Settings panel opens up
            className={`menu-item ${showSettings ? "is-active" : ""}`}
            onClick={() => setshowSettings(true)}>
            Settings
          </li>
        </ul>

      {/*leads will always be visible in the background*/}
      {showSettings && (
        <SettingsPanel onClose={() => setshowSettings(false)} />
      )}
    </div>
  );
}
