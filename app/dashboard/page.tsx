"use client";

import { useCallback, useRef, useState } from "react";
import DashboardMenu from "@/components/dashboard/DashboardMenu";
import DashboardWindow from "@/components/dashboard/DashboardWindow";
import type { ProfileData } from "@/components/UserProfileForm";
import { CallQueueProvider } from "@/context/CallQueueContext";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("leads-table");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [billingPortalUrl, setBillingPortalUrl] = useState<string | null>(null);
  const [isPrefetchingUserMenu, setIsPrefetchingUserMenu] = useState(false);
  const profilePromiseRef = useRef<Promise<ProfileData | null> | null>(null);
  const billingPortalPromiseRef = useRef<Promise<string | null> | null>(null);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === "leads") {
      setActiveTab("leads-table");
      return;
    }

    setActiveTab(tab);
  }, []);

  const fetchProfileData = useCallback(async () => {
    if (profileData) {
      return profileData;
    }

    if (profilePromiseRef.current) {
      return profilePromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as ProfileData;
        setProfileData(data);
        return data;
      } catch (error) {
        console.error("Failed to prefetch profile data", error);
        return null;
      } finally {
        profilePromiseRef.current = null;
      }
    })();

    profilePromiseRef.current = promise;
    return promise;
  }, [profileData]);

  const fetchBillingPortalUrl = useCallback(async () => {
    if (billingPortalUrl) {
      return billingPortalUrl;
    }

    if (billingPortalPromiseRef.current) {
      return billingPortalPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch("/api/billing-portal");
        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as { url?: string };
        if (data?.url) {
          setBillingPortalUrl(data.url);
          return data.url;
        }
      } catch (error) {
        console.error("Failed to prefetch billing portal URL", error);
      } finally {
        billingPortalPromiseRef.current = null;
      }

      return null;
    })();

    billingPortalPromiseRef.current = promise;
    return promise;
  }, [billingPortalUrl]);

  const prefetchUserMenuData = useCallback(() => {
    if (isPrefetchingUserMenu) {
      return;
    }

    setIsPrefetchingUserMenu(true);
    void (async () => {
      try {
        await Promise.all([fetchProfileData(), fetchBillingPortalUrl()]);
      } finally {
        setIsPrefetchingUserMenu(false);
      }
    })();
  }, [fetchBillingPortalUrl, fetchProfileData, isPrefetchingUserMenu]);

  const resolveBillingPortalUrl = useCallback(async () => {
    const url = await fetchBillingPortalUrl();
    if (url) {
      setBillingPortalUrl(null);
    }
    return url;
  }, [fetchBillingPortalUrl]);

  const handleProfileSaved = useCallback((data: ProfileData) => {
    setProfileData(data);
  }, []);

  return (
    <CallQueueProvider>
      <div className="dashboard flex">
        <div></div>
        <DashboardMenu
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onUserMenuPrefetch={prefetchUserMenuData}
          resolveBillingPortalUrl={resolveBillingPortalUrl}
        />
        <DashboardWindow
          activeTab={activeTab}
          profileData={profileData}
          onProfileSaved={handleProfileSaved}
        />
      </div>
    </CallQueueProvider>
  );
}
