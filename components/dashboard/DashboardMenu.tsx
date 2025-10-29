'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastViewport, useToast } from '@/components/notifications/ToastProvider';
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
  Bell as NotificationsIcon,
} from 'lucide-react';
import Logout from '@/components/Logout';
import BNLogo from '@/public/images/brokernest/SVG/BrokerNest - Logo - WhiteLogo.svg';
import UserClient from '@/components/HiUserClient';
import LeadsShortcutWindow from './LeadsShortcutWindow';
import CallQueueActiveCard from '../leads/CallQueueActiveCard';
import CallQueueScheduledList from '../leads/CallQueueScheduledList';

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
  const { history } = useToast();
  const [hasForcedDefault, setHasForcedDefault] = useState(false);
  const [displayTab, setDisplayTab] = useState('leads-table');
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isBillingLaunching, setIsBillingLaunching] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const wasUserRelatedRef = useRef(false);

  const hasNotifications = history.length > 0;

  const formatTimestamp = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

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
    if (menu === 'notifications') {
      setUserMenuOpen(false);
      setIsBillingLaunching(false);
      setNotificationsOpen((prev) => !prev);
      return;
    }

    if (menu === 'user') {
      setNotificationsOpen(false);
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
    setNotificationsOpen(false);

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
          <h3>BrokerNest</h3>
        </div>
      </div>
      <div className="menu-container">
        <div className="menu-stack">
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
                  {/* <motion.li
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
                  </motion.li> */}
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
              className={`menu-item ${displayTab === 'agent-preferences' ? 'is-active' : ''}`}
              onClick={() => onTabChange('agent-preferences')}
            >
              <span className="menu-item-content">
                <AgentsIcon aria-hidden="true" className="menu-icon" />
                Agents
              </span>
            </li>



            {/* Google Mail */}
            {/* <li
              className={`menu-item ${displayTab === 'google-mail' ? 'is-active' : ''}`}
              onClick={() => onTabChange('google-mail')}
            >
              <span className="menu-item-content">
                <MailIcon aria-hidden="true" className="menu-icon" />
                Mail
              </span>
            </li> */}

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
            {/* <li
              className={`menu-item ${displayTab === 'google-drive' ? 'is-active' : ''}`}
              onClick={() => onTabChange('google-drive')}
            >
              <span className="menu-item-content">
                <FilesIcon aria-hidden="true" className="menu-icon" />
                Files
              </span>
            </li> */}
          </ul>

          <div className="mt-6 space-y-3">
            <CallQueueActiveCard />
            <CallQueueScheduledList />
          </div>
          {/* <ToastViewport inline className="dashboard-menu__toast-viewport" /> */}
        </div>

        <ul className="menu-list">
          <AnimatePresence initial={false}>
            {isNotificationsOpen && (
              <motion.ul
                key="notifications-submenu"
                className="submenu-list notifications-submenu-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                layout
              >
                {hasNotifications ? (
                  history.map((entry) => (
                    <motion.li
                      key={`${entry.id}-${entry.timestamp}`}
                      className="submenu-item notifications-submenu-item"
                      initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                      layout
                    >
                      <div className="notifications-submenu-entry">
                        <div className="notifications-submenu-entry-header">
                          <span
                            className={`notifications-submenu-badge notifications-submenu-badge--${
                              entry.variant ?? 'default'
                            }`}
                          >
                            {(entry.variant ?? 'default').toUpperCase()}
                          </span>
                          <time
                            className="notifications-submenu-time"
                            dateTime={new Date(entry.timestamp).toISOString()}
                          >
                            {formatTimestamp(entry.timestamp)}
                          </time>
                        </div>
                        {entry.title ? (
                          <p className="notifications-submenu-title">{entry.title}</p>
                        ) : null}
                        <p className="notifications-submenu-message">{entry.message}</p>
                      </div>
                    </motion.li>
                  ))
                ) : (
                  <motion.li
                    className="submenu-item notifications-submenu-item notifications-submenu-empty"
                    initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    layout
                  >
                    <span>No notifications yet.</span>
                  </motion.li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>

          <li
            className={`menu-item ${isNotificationsOpen ? 'has-active-submenu' : ''}`}
            onClick={() => handleParentClick('notifications')}
          >
            <span className="menu-item-content">
              <NotificationsIcon aria-hidden="true" className="menu-icon" />
              Notifications
            </span>
          </li>

          <AnimatePresence initial={false}>
            {isUserMenuOpen && (
              <motion.ul
                key="user-submenu"
                className="profilemenu-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                layout
              >
                <motion.li
                  key="user-profile"
                  className={`menu-item ${displayTab === 'user-profile' ? 'is-active' : ''}`}
                  initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  layout
                >
                  <button
                    type="button"
                    className=""
                    onClick={() => handleUserSelection('user-profile')}
                  >
                    <span className="menu-item-content">
                      <UserIcon aria-hidden="true" className="menu-icon" />
                      Profile
                    </span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-settings"
                  className={`menu-item ${isSettingsTab ? 'is-active' : ''}`}
                  initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                  transition={{ duration: 0.26, delay: 0.04, ease: 'easeOut' }}
                  layout
                >
                  <button
                    type="button"
                    className=""
                    onClick={() => handleUserSelection('settings-general')}
                  >
                    <span className="menu-item-content">
                      <SettingsIcon aria-hidden="true" className="menu-icon" />
                      Settings
                    </span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-billing"
                  className={`menu-item ${isBillingLaunching ? 'is-active' : ''}`}
                  initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                  transition={{ duration: 0.26, delay: 0.08, ease: 'easeOut' }}
                  layout
                >
                  <button
                    type="button"
                    className=""
                    onClick={() => handleUserSelection('user-billing')}
                    disabled={isBillingLaunching}
                  >
                    <span className="menu-item-content">
                      <ReceiptText aria-hidden="true" className="menu-icon" />
                      Billing
                    </span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-help"
                  className={`menu-item ${displayTab === 'user-help' ? 'is-active' : ''}`}
                  initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                  transition={{ duration: 0.26, delay: 0.12, ease: 'easeOut' }}
                  layout
                >
                  <button
                    type="button"
                    className=""
                    onClick={() => handleUserSelection('user-help')}
                  >
                    <span className="menu-item-content">
                      <HelpCircle aria-hidden="true" className="menu-icon" />
                      Help
                    </span>
                  </button>
                </motion.li>
                <motion.li
                  key="user-logout"
                  className="menu-item"
                  onClick={() => setUserMenuOpen(false)}
                  initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
                  transition={{ duration: 0.3, delay: 0.16, ease: 'easeOut' }}
                  layout
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
            <span className="menu-item-content">
              <UserIcon aria-hidden="true" className="menu-icon" />
              <UserClient className="" />
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
