"use client";

import { useState } from "react";
import LeadsTable from "@/components/Leads";
import DashboardMenu from "@/components/DashboardMenu";
import DialerSettings from "@/components/dialer/DialerSettings";
import Calendar from "@/components/calendar/Calendar";
import Integrations from "@/components/Integrations";

export default function Dashboard() {
  // Maintain tab state for all dashboard sections
  const [activeTab, setActiveTab] = useState("leads"); // "leads" | "dialer" | "calendar" | "integrations"

  return (
    <main className="flex-1">
      <div className="dashboard">
        {/* Sidebar / Top Menu */}
        <DashboardMenu activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* Dynamic content area */}
        <div className="dashboard-window">
          <div>
            {activeTab === "leads" && <LeadsTable />}
            {activeTab === "dialer" && <DialerSettings />}
            {activeTab === "calendar" && <Calendar />}
            {activeTab === "integrations" && <Integrations />}
          </div>
        </div>
      </div>
    </main>
  );
}
