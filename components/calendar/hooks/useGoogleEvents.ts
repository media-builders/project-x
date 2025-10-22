"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent, NormalizedCalendarSource } from "../utils/types";
import { useToast } from "../ToastProvider";

type UseGoogleEventsArgs = {
  sources: NormalizedCalendarSource[];
  activeCalendarIds: string[];
  maxResults: number;
  timeMin?: string;
  timeMax?: string;
};

type UpsertPayload = {
  title: string;
  startDate: string;
  endDate?: string;
  calendarId: string;
  googleEventId?: string;
  notifyGuests?: boolean;
  removeConference?: boolean;
  description?: string;
  location?: string;
  attendees?: { email: string }[];
  colorId?: string;
  recurrence?: string[];
  visibility?: "default" | "public" | "private";
  reminders?: {
    useDefault?: boolean;
    overrides?: { method: "popup" | "email"; minutes: number }[];
  };
  createConference?: boolean;
};

// ? Added: Google Calendar color palette mapper
const googleColorMap: Record<string, string> = {
  "1": "#7986CB", // Lavender
  "2": "#33B679", // Sage
  "3": "#8E24AA", // Grape
  "4": "#E67C73", // Flamingo
  "5": "#F6BF26", // Banana
  "6": "#F4511E", // Tangerine
  "7": "#039BE5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3F51B5", // Blueberry
  "10": "#0B8043", // Basil
  "11": "#D50000", // Tomato
};

export function useGoogleEvents({
  sources,
  activeCalendarIds,
  maxResults,
  timeMin,
  timeMax,
}: UseGoogleEventsArgs) {
  const { show } = useToast();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [tokenInitialized, setTokenInitialized] = useState(false);
  const cacheRef = useRef<Map<string, CalendarEvent[]>>(new Map());
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
    void refreshGoogleAccessToken();
  }, [refreshGoogleAccessToken]);

  // ------------------------------
  // Fetch events
  // ------------------------------
  const fetchGoogleEvents = useCallback(async () => {
    const selectedSources = sources.filter((s) => activeCalendarIds.includes(s.id));
    if (!selectedSources.length) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setLastError(null);

    let tokenToUse = accessToken;
    if (!tokenToUse) {
      tokenToUse = await refreshGoogleAccessToken();
    }

    if (!tokenToUse) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        selectedSources.map((source) => {
          const fetchForSource = async (
            activeToken: string,
            allowRetry: boolean
          ): Promise<{ sourceId: string; items: CalendarEvent[] }> => {
            const params = new URLSearchParams({
              singleEvents: "true",
              orderBy: "startTime",
              maxResults: String(maxResults),
            });
            if (timeMin) params.set("timeMin", toRFC3339(timeMin));
            if (timeMax) params.set("timeMax", toRFC3339(timeMax));

            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              source.id
            )}/events?${params.toString()}`;

            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${activeToken}` },
            });

            if (res.status === 401 && allowRetry) {
              const refreshed = await refreshGoogleAccessToken();
              if (refreshed && refreshed !== activeToken) {
                tokenToUse = refreshed;
                return fetchForSource(refreshed, false);
              }
            }

            if (!res.ok) {
              const body = await res.text().catch(() => "");
              throw new Error(`(${res.status}) ${source.label} ${body}`.trim());
            }

            const data = await res.json();

            const items: CalendarEvent[] = (data.items ?? [])
              .filter((i: any) => i.status !== "cancelled")
              .map((i: any) => {
                const eventColor =
                  googleColorMap[i.colorId] ||
                  source.color ||
                  "#2563EB";

                return {
                  id: i.id,
                  title: i.summary || "(No Title)",
                  start: i.start?.dateTime || i.start?.date,
                  end: i.end?.dateTime || i.end?.date,
                  backgroundColor: eventColor,
                  borderColor: eventColor,
                  textColor: "#ffffff",
                  extendedProps: {
                    calendarId: source.id,
                    calendarLabel: source.label,
                    googleEventId: i.id,
                    description: i.description || "",
                    location:
                      i.conferenceData?.entryPoints?.[0]?.uri ||
                      i.hangoutLink ||
                      i.location ||
                      "",
                    attendees: i.attendees || [],
                    colorId: i.colorId || "0",
                    color: eventColor,
                    recurrence: i.recurrence || [],
                    visibility: i.visibility || "default",
                    reminders: i.reminders || { useDefault: true },
                    hangoutLink:
                      i.conferenceData?.entryPoints?.[0]?.uri ||
                      i.hangoutLink ||
                      null,
                  },
                };
              });

            return { sourceId: source.id, items };
          };

          return fetchForSource(tokenToUse!, true);
        })
      );

      const merged: CalendarEvent[] = [];
      const errs: string[] = [];

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          cacheRef.current.set(result.value.sourceId, result.value.items);
          merged.push(...result.value.items);
        } else {
          const reason = result.reason;
          const message =
            reason instanceof Error ? reason.message : String(reason ?? "Unknown error");
          errs.push(`${selectedSources[idx]?.label}: ${message}`);
        }
      });

      merged.sort(
        (a, b) =>
          new Date(a.start as string).getTime() -
          new Date(b.start as string).getTime()
      );

      setEvents(merged);
      if (errs.length) {
        show({
          title: "Partial load",
          message: errs.join(" | "),
          variant: "warning",
        });
      }
    } catch (err: any) {
      const e =
        err instanceof Error ? err : new Error("Failed to fetch calendar events.");
      setLastError(e);
      show({ title: "Load failed", message: e.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeCalendarIds,
    maxResults,
    refreshGoogleAccessToken,
    show,
    sources,
    timeMax,
    timeMin,
  ]);

  useEffect(() => {
    if (!tokenInitialized) return;
    void fetchGoogleEvents();
  }, [tokenInitialized, fetchGoogleEvents]);

  // ------------------------------
  // Upsert (create or update)
  // ------------------------------
  const upsertEvent = useCallback(
    async (payload: UpsertPayload) => {
      let token = accessToken ?? (await refreshGoogleAccessToken());
      if (!token) {
        const err = new Error("No Google access token available.");
        setLastError(err);
        show({ title: "Save failed", message: err.message, variant: "error" });
        throw err;
      }

      const {
        title,
        startDate,
        endDate,
        calendarId,
        googleEventId,
        notifyGuests,
        removeConference,
        description,
        location,
        attendees,
        colorId,
        recurrence,
        visibility,
        reminders,
        createConference,
      } = payload;

      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate || startDate).toISOString();

      const body: any = {
        summary: title,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
      };

      if (description) body.description = description;
      if (location) body.location = location;
      if (!location && removeConference) body.location = "";
      if (attendees?.length) body.attendees = attendees;
      if (colorId && colorId !== "0") body.colorId = colorId;
      if (recurrence?.length) body.recurrence = recurrence;
      if (visibility) body.visibility = visibility;
      if (reminders) body.reminders = reminders;

      const query = new URLSearchParams();
      if (createConference) {
        body.conferenceData = {
          createRequest: {
            requestId: `meet-${Math.random().toString(36).slice(2)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
        query.set("conferenceDataVersion", "1");
      } else if (removeConference) {
        body.conferenceData = null;
        query.set("conferenceDataVersion", "1");
      }
      if (typeof notifyGuests === "boolean") {
        query.set("sendUpdates", notifyGuests ? "all" : "none");
      }

      const method = googleEventId ? "PATCH" : "POST";
      const urlBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`;
      const querySuffix = query.toString();
      const url = googleEventId
        ? `${urlBase}/${googleEventId}${querySuffix ? `?${querySuffix}` : ""}`
        : `${urlBase}${querySuffix ? `?${querySuffix}` : ""}`;

      const sendRequest = async (authToken: string) =>
        fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

      try {
        let response = await sendRequest(token);
        if (response.status === 401) {
          const refreshed = await refreshGoogleAccessToken();
          if (refreshed && refreshed !== token) {
            token = refreshed;
            response = await sendRequest(refreshed);
          }
        }

        const text = await response.text();
        if (!response.ok) {
          console.error("Google API Error:", response.status, text);
          throw new Error(`Request failed (${response.status})`);
        }

        const data = text ? JSON.parse(text) : {};
        const meetLink =
          data?.conferenceData?.entryPoints?.[0]?.uri || data?.hangoutLink || null;

        show({
          title: "Success",
          message: createConference
            ? meetLink
              ? `Event saved with Meet: ${meetLink}`
              : "Event saved (Meet pending)"
            : "Event saved successfully",
          variant: "success",
        });

        await fetchGoogleEvents();
      } catch (err: any) {
        const e =
          err instanceof Error ? err : new Error("Failed to save Google event.");
        setLastError(e);
        show({ title: "Save failed", message: e.message, variant: "error" });
        throw e;
      }
    },
    [accessToken, fetchGoogleEvents, refreshGoogleAccessToken, show]
  );

  // ------------------------------
  // Delete
  // ------------------------------
  const deleteEvent = useCallback(
    async (calendarId: string, googleEventId: string) => {
      let token = accessToken ?? (await refreshGoogleAccessToken());
      if (!token) {
        const err = new Error("No Google access token available.");
        setLastError(err);
        show({ title: "Delete failed", message: err.message, variant: "error" });
        throw err;
      }

      const sendRequest = async (authToken: string) =>
        fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events/${googleEventId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });

      try {
        let response = await sendRequest(token);
        if (response.status === 401) {
          const refreshed = await refreshGoogleAccessToken();
          if (refreshed && refreshed !== token) {
            token = refreshed;
            response = await sendRequest(refreshed);
          }
        }

        if (!response.ok) throw new Error(`Delete failed (${response.status})`);

        show({ message: "Event deleted", variant: "success" });
        await fetchGoogleEvents();
      } catch (err: any) {
        const e =
          err instanceof Error ? err : new Error("Failed to delete event.");
        setLastError(e);
        show({ title: "Delete failed", message: e.message, variant: "error" });
        throw e;
      }
    },
    [accessToken, fetchGoogleEvents, refreshGoogleAccessToken, show]
  );

  // ------------------------------
  // Move
  // ------------------------------
  const moveEvent = useCallback(
    async (
      sourceCalendarId: string,
      googleEventId: string,
      destinationCalendarId: string,
      notifyGuests = false
    ) => {
      let token = accessToken ?? (await refreshGoogleAccessToken());
      if (!token) {
        const err = new Error("No Google access token available.");
        setLastError(err);
        show({ title: "Move failed", message: err.message, variant: "error" });
        throw err;
      }

      const params = new URLSearchParams({ destination: destinationCalendarId });
      params.set("sendUpdates", notifyGuests ? "all" : "none");

      const makeRequest = async (authToken: string) =>
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            sourceCalendarId
          )}/events/${googleEventId}/move?${params.toString()}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

      try {
        let response = await makeRequest(token);
        if (response.status === 401) {
          const refreshed = await refreshGoogleAccessToken();
          if (refreshed && refreshed !== token) {
            token = refreshed;
            response = await makeRequest(refreshed);
          }
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`Move failed (${response.status}) ${body}`.trim());
        }

        show({ message: "Event moved", variant: "success" });
        await fetchGoogleEvents();
      } catch (err: any) {
        const e =
          err instanceof Error ? err : new Error("Failed to move event.");
        setLastError(e);
        show({ title: "Move failed", message: e.message, variant: "error" });
        throw e;
      }
    },
    [accessToken, fetchGoogleEvents, refreshGoogleAccessToken, show]
  );

  return {
    accessToken,
    events,
    loading,
    lastError,
    refetch: fetchGoogleEvents,
    upsertEvent,
    deleteEvent,
    moveEvent,
  };
}

/* ------------------------------
 * Helper
 * -----------------------------*/
function toRFC3339(input: string): string {
  if (!input) return input;
  return new Date(input).toISOString();
}
