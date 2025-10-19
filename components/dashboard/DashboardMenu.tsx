"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Logout from "@/components/Logout";
import BNLogo from "@/public/images/brokernest/SVG/BrokerNest - Logo - WhiteLogo.svg";

interface DashboardMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardMenu({ activeTab, onTabChange }: DashboardMenuProps) {
  // Submenu logic
  const leadsSubmenuActive = 
    activeTab === "leads-table" || 
    activeTab === "leads-campaigns" || 
    activeTab === "leads-form";
  const settingsSubmenuActive =
    activeTab === "settings-general" ||
    activeTab === "settings-integrations" ||
    activeTab === "settings-billing";

  // Determine which submenu is open
  const submenuOpen =
    activeTab === "leads" ||
    leadsSubmenuActive ||
    activeTab === "settings" ||
    settingsSubmenuActive;

  // Handlers for parent clicks that auto-select the first submenu item
  const handleParentClick = (menu: string) => {
    switch (menu) {
      case "leads":
        onTabChange("leads-table");
        break;
      case "settings":
        onTabChange("settings-general");
        break;
      default:
        onTabChange(menu);
    }
  };

  return (
    <div className="dashboard-menu">
      <div className="bn-badge gradient">
        <div className="bn-logo">
            <Image
              src={BNLogo}
              alt="BrokerNest.ai Logo"
              width={40}
              height={40}
              priority
              className="object-contain"
            />
        </div>
        <div className="bn-title">
          <h1>BrokerNest</h1>
        </div>
      </div>
      <ul className="menu-list">
        {/* Leads */}
        <li
          className={`menu-item ${leadsSubmenuActive ? "has-active-submenu" : ""}`}
          onClick={() => handleParentClick("leads")}
        >
          Leads
        </li>

        {/* Leads submenu */}
        <AnimatePresence initial={false}>
          {(activeTab.startsWith("leads")) && (
            <motion.ul
              key="leads-submenu"
              className="submenu-list"
              initial={{ height: 0, opacity: 0, y: -5 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -5 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <motion.li
                className={`submenu-item ${activeTab === "leads-table" ? "is-active" : ""}`}
                onClick={() => onTabChange("leads-table")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Calls
              </motion.li>
              <motion.li
                className={`submenu-item ${activeTab === "leads-campaigns" ? "is-active" : ""}`}
                onClick={() => onTabChange("leads-campaigns")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                Campaigns
              </motion.li>
              <motion.li
                className={`submenu-item ${activeTab === "leads-form" ? "is-active" : ""}`}
                onClick={() => onTabChange("leads-form")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                Forms
              </motion.li>
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Agents */}
        <li
          className={`menu-item ${activeTab === "dialer" ? "is-active" : ""}`}
          onClick={() => onTabChange("dialer")}
        >
          Agents
        </li>

        {/* Calendar */}
        <li
          className={`menu-item ${activeTab === "calendar" ? "is-active" : ""}`}
          onClick={() => onTabChange("calendar")}
        >
          Calendar
        </li>

        {/* Settings */}
        <li
          className={`menu-item ${settingsSubmenuActive ? "has-active-submenu" : ""}`}
          onClick={() => handleParentClick("settings")}
        >
          Settings
        </li>

        {/* Settings submenu */}
        <AnimatePresence initial={false}>
          {(activeTab.startsWith("settings")) && (
            <motion.ul
              key="settings-submenu"
              className="submenu-list"
              initial={{ height: 0, opacity: 0, y: -5 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -5 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <motion.li
                className={`submenu-item ${activeTab === "settings-general" ? "is-active" : ""}`}
                onClick={() => onTabChange("settings-general")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                General
              </motion.li>

              <motion.li
                className={`submenu-item ${activeTab === "settings-integrations" ? "is-active" : ""}`}
                onClick={() => onTabChange("settings-integrations")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                Integrations
              </motion.li>

              <motion.li
                className={`submenu-item ${activeTab === "settings-billing" ? "is-active" : ""}`}
                onClick={() => onTabChange("settings-billing")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                Billing
              </motion.li>
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Logout */}
        <li className="menu-item">
          <Logout />
        </li>
      </ul>
    </div>
  );
}
