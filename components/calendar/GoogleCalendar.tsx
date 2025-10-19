"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { createClient } from "@/utils/supabase/client";
import { useModal } from "@/hooks/useModal";
import { X } from "lucide-react";

const COLOR_MAP: Record<string, string> = {
  Danger: "bg-red-600 text-white",
  Success: "bg-emerald-500 text-white",
  Primary: "bg-blue-600 text-white",
  Warning: "bg-yellow-400 text-black",
};

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    googleEventId?: string;
  };
}

const GoogleCalendar: React.FC = () => {
  const supabase = createClient();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("Primary");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const calendarRef = useRef<FullCalendar>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [closing, setClosing] = useState(false);

  // ------------------------------------------------------------
  //  Retrieve Google access token from Supabase session
  // ------------------------------------------------------------
  useEffect(() => {
    const getSessionToken = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.provider_token;
      if (token) setAccessToken(token);
    };
    getSessionToken();
  }, [supabase]);

  // ------------------------------------------------------------
  //  Fetch Google Calendar events
  // ------------------------------------------------------------
  const fetchGoogleEvents = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&singleEvents=true&orderBy=startTime",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) throw new Error("Failed to load Google Calendar events");

      const data = await res.json();
      const formatted = data.items
        .filter((item: any) => item.status !== "cancelled")
        .map((item: any) => ({
          id: item.id,
          title: item.summary || "(No Title)",
          start: item.start?.dateTime || item.start?.date,
          end: item.end?.dateTime || item.end?.date,
          extendedProps: {
            calendar: "Primary",
            googleEventId: item.id,
          },
        }));
      setEvents(formatted);
    } catch (err: any) {
      console.error("Google Calendar fetch error:", err.message);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchGoogleEvents();
  }, [accessToken, fetchGoogleEvents]);

  // ------------------------------------------------------------
  //  Add or update Google Calendar events
  // ------------------------------------------------------------
  const handleAddOrUpdateEvent = useCallback(async () => {
    if (!accessToken) return;
    try {
      const body = {
        summary: eventTitle,
        start: { date: eventStartDate },
        end: { date: eventEndDate || eventStartDate },
      };

      if (selectedEvent?.extendedProps.googleEventId) {
        // Update event
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${selectedEvent.extendedProps.googleEventId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
      } else {
        // Create event
        await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
      }

      await fetchGoogleEvents();
      triggerClose();
    } catch (err: any) {
      console.error("Google Calendar write error:", err.message);
    }
  }, [
    accessToken,
    selectedEvent,
    eventTitle,
    eventStartDate,
    eventEndDate,
    fetchGoogleEvents,
  ]);

  // ------------------------------------------------------------
  //  Delete event
  // ------------------------------------------------------------
  const handleDeleteEvent = async () => {
    if (!accessToken || !selectedEvent?.extendedProps.googleEventId) return;
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${selectedEvent.extendedProps.googleEventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      await fetchGoogleEvents();
      triggerClose();
    } catch (err: any) {
      console.error("Google Calendar delete error:", err.message);
    }
  };

  // ------------------------------------------------------------
  //  Modal handlers
  // ------------------------------------------------------------
  const resetModalFields = useCallback(() => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary");
    setSelectedEvent(null);
  }, []);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeModal();
      resetModalFields();
    }, 200);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const evt = clickInfo.event;
    setSelectedEvent(evt as unknown as CalendarEvent);
    setEventTitle(evt.title);
    setEventStartDate(evt.start?.toISOString().split("T")[0] || "");
    setEventEndDate(evt.end?.toISOString().split("T")[0] || "");
    openModal();
  };

  return (
    <div>
      <div className="pb-4 border-b border-gray-800 mb-5">
        <h2 className="text-xl font-semibold text-white/90">Google Calendar</h2>
        <p className="text-sm text-gray-400">
          View, add, edit, and delete events from your Google Calendar.
        </p>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable
        editable
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        height="auto"
      />

      {/* Modal */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
            closing ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            ref={modalRef}
            className={`relative bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-200 ${
              closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-3">
              <h2 className="text-xl font-semibold">
                {selectedEvent ? "Edit Event" : "Add Event"}
              </h2>
              <button
                onClick={triggerClose}
                className="text-gray-400 hover:text-white transition p-1 rounded-md hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Event title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                {selectedEvent && (
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={handleAddOrUpdateEvent}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
                >
                  {selectedEvent ? "Update Event" : "Add Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------
//  Render Event Appearance
// ------------------------------------------------------------
const renderEventContent = (eventInfo: EventContentArg) => {
  return (
    <div
      className="flex items-center justify-start gap-2 px-2 py-1 rounded-md text-xs font-medium bg-blue-600 text-white"
    >
      <span>{eventInfo.event.title}</span>
    </div>
  );
};

export default GoogleCalendar;
