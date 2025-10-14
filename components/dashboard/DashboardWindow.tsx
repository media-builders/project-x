"use client";

import { motion, AnimatePresence } from "framer-motion";
import LeadsTable from "@/components/leads/Leads";
import CallSchedule from "@/components/leads/calls/schedule";
import LeadCaptureFormSetup from "@/components/leads/LeadCaptureFormSetup";
import DialerSettings from "@/components/agents/settings";
import Calendar from "@/components/calendar/Calendar";
import Integrations from "@/components/settings/Integrations";
import SettingsPanel from "@/components/settings/SettingsPanel";

function BillingComponent() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Billing</h2>
      <p>This is a placeholder for billing settings.</p>
    </div>
  );
}

interface DashboardWindowProps {
  activeTab: string;
}

export default function DashboardWindow({ activeTab }: DashboardWindowProps) {
  return (
    <div className="dashboard-window flex-1 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {activeTab === "leads-table" && (
          <motion.div
            key="leads-table"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <LeadsTable />
          </motion.div>
        )}

        {activeTab === "leads-campaigns" && (
          <motion.div
            key="leads-campaigns"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <CallSchedule />
          </motion.div>
        )}

        {activeTab === "leads-form" && (
          <motion.div
            key="leads-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <LeadCaptureFormSetup />
          </motion.div>
        )}

        {activeTab === "dialer" && (
          <motion.div
            key="dialer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <DialerSettings />
          </motion.div>
        )}

        {activeTab === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <Calendar />
          </motion.div>
        )}

        {activeTab === "settings-general" && (
          <motion.div
            key="settings-general"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <SettingsPanel />
          </motion.div>
        )}

        {activeTab === "settings-integrations" && (
          <motion.div
            key="settings-integrations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <Integrations />
          </motion.div>
        )}

        {activeTab === "settings-billing" && (
          <motion.div
            key="settings-billing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <BillingComponent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
