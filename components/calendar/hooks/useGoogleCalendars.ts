"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedCalendarSource } from "../utils/types";

/**
 * Fetches the authenticated user's Google calendars using the `/api/google/token` refresh route.
 * - Handles pagination
 * - Normalizes items to NormalizedCalendarSource (keeps color hex + class fallback)
 * - Exposes accessToken so sibling hooks (e.g., events) can reuse it
 */

type GoogleCalendarListItem = {
  id: string;
  summary: string;
  backgroundColor?: string; // hex
  accessRole?: string;
};

export function useGoogleCalendars() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<NormalizedCalendarSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenInitialized, setTokenInitialized] = useState(false);
  const refreshingTokenRef = useRef<Promise<string | null> | null>(null);

  const refreshGoogleAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshingTokenRef.current) {
      return refreshingTokenRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const res = await fetch("/api/google/token", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Google token refresh failed (${res.status})`);
        }

        const newToken = typeof data?.accessToken === "string" ? data.accessToken : null;
        setAccessToken(newToken);
        return newToken;
      } catch (err) {
        console.error("Google token refresh error:", err);
        setAccessToken(null);
        return null;
      } finally {
        refreshingTokenRef.current = null;
        setTokenInitialized(true);
      }
    })();

    refreshingTokenRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initCalendars() {
      if (!tokenInitialized) {
        return;
      }

      let tokenToUse = accessToken;
      if (!tokenToUse) {
        setCalendars([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const collected: GoogleCalendarListItem[] = [];

        const loadWithToken = async (
          activeToken: string,
          allowRetry: boolean
        ): Promise<void> => {
          let nextPageToken: string | undefined;
          const localCollected: GoogleCalendarListItem[] = [];
          do {
            const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
            if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

            const res = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${activeToken}` },
            });

            if (res.status === 401 && allowRetry) {
              const refreshed = await refreshGoogleAccessToken();
              if (refreshed && refreshed !== activeToken) {
                await loadWithToken(refreshed, false);
                return;
              }
            }

            if (!res.ok) {
              const body = await res.text().catch(() => "");
              throw new Error(`Failed to load calendars (${res.status}) ${body}`);
            }

            const json = await res.json();
            const items = (json.items ?? []) as any[];

            items.forEach((cal) => {
              localCollected.push({
                id: cal.id,
                summary: cal.summary || cal.id,
                backgroundColor: cal.backgroundColor,
                accessRole: cal.accessRole,
              });
            });

            nextPageToken = json.nextPageToken || undefined;
          } while (nextPageToken);

          collected.splice(0, collected.length, ...localCollected);
        };

        await loadWithToken(tokenToUse, true);

        // Normalize to your shape
        const normalized: NormalizedCalendarSource[] = collected.map((c) => {
          // Tailwind class fallback; if you use JIT arbitrary values, you can also store bg-[hex]
          const hex = c.backgroundColor || "#4285F4";
          const colorClass = "bg-blue-600 text-white"; // visual fallback for event pill
          const accentClass = "bg-blue-600"; // dot in toolbar
          return {
            id: c.id,
            label: c.summary,
            colorHex: hex,        // <— extra, in case you want inline styles
            colorClass,           // <— matches your renderer
            accentClass,          // <— matches your toolbar dot
            accessRole: c.accessRole,
          } as NormalizedCalendarSource & { colorHex?: string; accessRole?: string };
        });

        if (!cancelled) {
          setError(null);
          setCalendars(normalized);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to fetch calendars.");
          setCalendars([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initCalendars();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tokenInitialized, refreshGoogleAccessToken]);

  useEffect(() => {
    void refreshGoogleAccessToken();
  }, [refreshGoogleAccessToken]);

  return { calendars, accessToken, loading, error };
}
