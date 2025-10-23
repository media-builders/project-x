'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  ReceiptText,
  HelpCircle,
  Users as LeadsIcon,
  Headset as AgentsIcon,
  Mail as MailIcon,
  Calendar as CalendarIcon,
  Folder as FilesIcon,
  PhoneCall as CallsIcon,
  Megaphone as CampaignsIcon,
} from 'lucide-react';
import Logout from '@/components/Logout';
import BNLogo from '@/public/images/brokernest/SVG/BrokerNest - Logo - WhiteLogo.svg';
import UserClient from '@/components/HiUserClient';

const USER_OWNED_TABS = ['user-profile', 'user-help'];
const SETTINGS_TABS = ['settings-general', 'settings-integrations', 'settings-billing'];

interface DashboardMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUserMenuPrefetch?: () => void | Promise<void>;
  resolveBillingPortalUrl: () => Promise<string | null>;
}

export default function DashboardMenu({
  activeTab,
  onTabChange,
  onUserMenuPrefetch,
  resolveBillingPortalUrl,
}: DashboardMenuProps) {
  const [hasForcedDefault, setHasForcedDefault] = useState(false);
  const [displayTab, setDisplayTab] = useState('leads-table');
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isBillingLaunching, setIsBillingLaunching] = useState(false);
  const wasUserRelatedRef = useRef(false);

  // Ensure the leads submenu is active by default on initial load
  useEffect(() => {
    if (!hasForcedDefault) {
      if (activeTab !== 'leads-table') {
        onTabChange('leads-table');
      }
      setHasForcedDefault(true);
    }
  }, [activeTab, hasForcedDefault, onTabChange]);

  // Keep local display state in sync with the parent once it updates
  useEffect(() => {
    setDisplayTab(activeTab || 'leads-table');
  }, [activeTab]);

  // Submenu logic
  const leadsSubmenuActive =
    displayTab === 'leads-table' || displayTab === 'leads-campaigns' || displayTab === 'leads-form';
  const isSettingsTab = SETTINGS_TABS.includes(displayTab);
  const isUserRelatedTab = isSettingsTab || USER_OWNED_TABS.includes(displayTab);
  const shouldKeepUserMenuOpen = isUserRelatedTab || isBillingLaunching;
  const userSubmenuActive = isUserMenuOpen || shouldKeepUserMenuOpen;

  useEffect(() => {
    if (shouldKeepUserMenuOpen) {
      setUserMenuOpen(true);
    } else if (wasUserRelatedRef.current) {
      setUserMenuOpen(false);
    }

    wasUserRelatedRef.current = shouldKeepUserMenuOpen;
  }, [shouldKeepUserMenuOpen]);
  // Handlers for parent clicks that auto-select the first submenu item
  const handleParentClick = (menu: string) => {
    if (menu === 'user') {
      setUserMenuOpen((prev) => {
        const next = !prev;
        if (!next) {
          setIsBillingLaunching(false);
        } else {
          onUserMenuPrefetch?.();
        }
        return next;
      });
      return;
    }

    setIsBillingLaunching(false);
    setUserMenuOpen(false);

    switch (menu) {
      case 'leads':
        onTabChange('leads-table');
        break;
      default:
        onTabChange(menu);
    }
  };

  const handleBillingClick = async () => {
    if (isBillingLaunching || typeof window === 'undefined') {
      return;
    }

    setIsBillingLaunching(true);

    try {
      const url = await resolveBillingPortalUrl();
      if (!url) {
        throw new Error('Billing portal unavailable.');
      }

      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) {
        throw new Error('Pop-up blocked.');
      }

      opened.focus?.();
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Failed to open billing portal', error);
      setUserMenuOpen(true);
    } finally {
      setIsBillingLaunching(false);
    }
  };

  const handleUserSelection = (tab: string) => {
    if (tab === 'user-billing') {
      void handleBillingClick();
      return;
    }

    onTabChange(tab);
  };

  return (
    <div className="dashboard-menu">
      <div className="bn-badge gradient">
        <div className="bn-logo">
          <Image
            src={BNLogo}
            alt="BrokerNest.ai Logo"
            priority
            className="object-contain"
          />
        </div>
        <div className="bn-title">
          <h1>BrokerNest</h1>
        </div>
      </div>
      <div className="menu-container">
        <ul className="menu-list">
          {/* Leads */}
          <li
            className={`menu-item ${leadsSubmenuActive ? 'has-active-submenu' : ''}`}
            onClick={() => handleParentClick('leads')}
          >
            <span className="menu-item-content">
              <LeadsIcon aria-hidden="true" className="menu-icon" />
              Leads
            </span>
          </li>

          {/* Leads submenu */}
          <AnimatePresence initial={false}>
            {displayTab.startsWith('leads') && (
              <motion.ul
                key="leads-submenu"
                className="submenu-list"
                initial={{ height: 0, opacity: 0, y: -5 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -5 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <motion.li
                  className={`submenu-item ${displayTab === 'leads-table' ? 'is-active' : ''}`}
                  onClick={() => onTabChange('leads-table')}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="menu-item-content">
                    <CallsIcon aria-hidden="true" className="menu-icon" />
                    Calls
                  </span>
                </motion.li>
                <motion.li
                  className={`submenu-item ${displayTab === 'leads-campaigns' ? 'is-active' : ''}`}
                  onClick={() => onTabChange('leads-campaigns')}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <span className="menu-item-content">
                    <CampaignsIcon aria-hidden="true" className="menu-icon" />
                    Campaigns
                  </span>
                </motion.li>
                {/* <motion.li
                  className={`submenu-item ${displayTab === "leads-form" ? "is-active" : ""}`}
                  onClick={() => onTabChange("leads-form")}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  Forms
                </motion.li> */}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* Agents */}
          <li
            className={`menu-item ${displayTab === 'dialer' ? 'is-active' : ''}`}
            onClick={() => onTabChange('dialer')}
          >
            <span className="menu-item-content">
              <AgentsIcon aria-hidden="true" className="menu-icon" />
              Agents
            </span>
          </li>

          {/* Google Mail */}
          <li
            className={`menu-item ${displayTab === 'google-mail' ? 'is-active' : ''}`}
            onClick={() => onTabChange('google-mail')}
          >
            <span className="menu-item-content">
              <MailIcon aria-hidden="true" className="menu-icon" />
              Mail
            </span>
          </li>

          {/* Calendar */}
          <li
            className={`menu-item ${displayTab === 'calendar' ? 'is-active' : ''}`}
            onClick={() => onTabChange('calendar')}
          >
            <span className="menu-item-content">
              <CalendarIcon aria-hidden="true" className="menu-icon" />
              Calendar
            </span>
          </li>

          {/* Google Drive */}
          <li
            className={`menu-item ${displayTab === 'google-drive' ? 'is-active' : ''}`}
            onClick={() => onTabChange('google-drive')}
          >
            <span className="menu-item-content">
              <FilesIcon aria-hidden="true" className="menu-icon" />
              Files
            </span>
          </li>
        </ul>
        <ul className="menu-list">
          <AnimatePresence initial={false}>
            {isUserMenuOpen && (
              <motion.ul
                key="user-submenu"
                className="submenu-list"
                initial={{ height: 0, opacity: 0, y: -5 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -5 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <motion.li
                  key="user-profile"
                  className={`submenu-item ${displayTab === 'user-profile' ? 'is-active' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    className="flex items-center w-full"
                    onClick={() => handleUserSelection('user-profile')}
                  >
                    <UserIcon className="menu-icon" />
                    <span>Profile</span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-settings"
                  className={`submenu-item ${isSettingsTab ? 'is-active' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <button
                    type="button"
                    className="flex items-center w-full"
                    onClick={() => handleUserSelection('settings-general')}
                  >
                    <SettingsIcon className="menu-icon" />
                    <span>Settings</span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-billing"
                  className={`submenu-item ${isBillingLaunching ? 'is-active' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                >
                  <button
                    type="button"
                    className="flex items-center w-full"
                    onClick={() => handleUserSelection('user-billing')}
                    disabled={isBillingLaunching}
                  >
                    <ReceiptText className="menu-icon" />
                    <span>Billing</span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-help"
                  className={`submenu-item ${displayTab === 'user-help' ? 'is-active' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                >
                  <button
                    type="button"
                    className="flex items-center w-full"
                    onClick={() => handleUserSelection('user-help')}
                  >
                    <HelpCircle className="menu-icon" />
                    <span>Help</span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-logout"
                  className="submenu-item"
                  onClick={() => setUserMenuOpen(false)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Logout />
                </motion.li>
              </motion.ul>
            )}
          </AnimatePresence>

          <li
            className={`menu-item ${userSubmenuActive ? 'has-active-submenu' : ''}`}
            onClick={() => handleParentClick('user')}
          >
            <UserClient className="menu-item" />
          </li>
        </ul>
      </div>
    </div>
  );
}
