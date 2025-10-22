"use client";

import { motion, AnimatePresence } from "framer-motion";
import LeadsTable from "@/components/leads/Leads";
import CallSchedule from "@/components/leads/calls/schedule";
import LeadCaptureFormSetup from "@/components/leads/LeadCaptureFormSetup";
import DialerSettings from "@/components/agents/settings";
import GoogleCalendar from "@/components/calendar/GoogleCalendar";
import Integrations from "@/components/settings/Integrations";
import SettingsPanel from "@/components/settings/SettingsPanel";
import UserProfileForm, { ProfileData } from "@/components/UserProfileForm";
import HelpCenter from "@/components/HelpCenter";
import GmailClient from "@/components/GoogleMail";
import DriveFiles from "@/components/GoogleDrive";

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
  profileData?: ProfileData | null;
  onProfileSaved?: (data: ProfileData) => void;
}

export default function DashboardWindow({
  activeTab,
  profileData,
  onProfileSaved,
}: DashboardWindowProps) {
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

        {activeTab === "google-mail" && (
          <motion.div
            key="google-mail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <GmailClient />
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
            <GoogleCalendar />
          </motion.div>
        )}

        {activeTab === "google-drive" && (
          <motion.div
            key="google-drive"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full"
          >
            <DriveFiles />
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

        {activeTab === "user-profile" && (
          <motion.div
            key="user-profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full overflow-auto"
          >
            <UserProfileForm initialData={profileData} onProfileSaved={onProfileSaved} />
          </motion.div>
        )}

        {activeTab === "user-help" && (
          <motion.div
            key="user-help"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full overflow-auto"
          >
            <HelpCenter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
