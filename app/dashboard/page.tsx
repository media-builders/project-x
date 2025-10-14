"use client";

import { useState } from "react";
import DashboardMenu from "@/components/dashboard/DashboardMenu";
import DashboardWindow from "@/components/dashboard/DashboardWindow";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("leads-a");

  const handleTabChange = (tab: string) => {
    if (tab === "leads") {
      setActiveTab("leads-a");
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="dashboard flex">
      <div></div>
      <DashboardMenu activeTab={activeTab} onTabChange={handleTabChange} />
      <DashboardWindow activeTab={activeTab} />
    </div>
  );
}
