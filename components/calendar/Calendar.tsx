"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { useModal } from "@/hooks/useModal";
import { X } from "lucide-react";

// ------------------------------------------------------------
//  Tailwind color mapping (safe for PurgeCSS)
// ------------------------------------------------------------
const COLOR_MAP: Record<string, string> = {
  Danger: "bg-red-600 text-white",
  Success: "bg-emerald-500 text-white",
  Primary: "bg-blue-600 text-white",
  Warning: "bg-yellow-400 text-black",
};

// ------------------------------------------------------------
//  Event interface
// ------------------------------------------------------------
interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
  };
}

// ------------------------------------------------------------
//  Component
// ------------------------------------------------------------
const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("Primary");

  const calendarRef = useRef<FullCalendar>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [closing, setClosing] = useState(false);

  // ------------------------------------------------------------
  //  Initialize demo events
  // ------------------------------------------------------------
  useEffect(() => {
    setEvents([
      {
        id: "1",
        title: "Event Conf.",
        start: new Date().toISOString().split("T")[0],
        extendedProps: { calendar: "Danger" },
      },
      {
        id: "2",
        title: "Meeting",
        start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        extendedProps: { calendar: "Success" },
      },
      {
        id: "3",
        title: "Workshop",
        start: new Date(Date.now() + 172800000).toISOString().split("T")[0],
        end: new Date(Date.now() + 259200000).toISOString().split("T")[0],
        extendedProps: { calendar: "Primary" },
      },
    ]);
  }, []);

  // ------------------------------------------------------------
  //  Helper: reset modal fields
  // ------------------------------------------------------------
  const resetModalFields = useCallback(() => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary");
    setSelectedEvent(null);
  }, []);

  // ------------------------------------------------------------
  //  Calendar interaction handlers
  // ------------------------------------------------------------
  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      resetModalFields();
      setEventStartDate(selectInfo.startStr);
      setEventEndDate(selectInfo.endStr || selectInfo.startStr);
      openModal();
    },
    [openModal, resetModalFields]
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const event = clickInfo.event;
      setSelectedEvent(event as unknown as CalendarEvent);
      setEventTitle(event.title);
      setEventStartDate(event.start?.toISOString().split("T")[0] || "");
      setEventEndDate(event.end?.toISOString().split("T")[0] || "");
      setEventLevel(event.extendedProps.calendar);
      openModal();
    },
    [openModal]
  );

  const handleAddOrUpdateEvent = useCallback(() => {
    if (selectedEvent) {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === selectedEvent.id
            ? {
                ...evt,
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                extendedProps: { calendar: eventLevel },
              }
            : evt
        )
      );
    } else {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        allDay: true,
        extendedProps: { calendar: eventLevel },
      };
      setEvents((prev) => [...prev, newEvent]);
    }

    triggerClose();
    resetModalFields();
  }, [
    selectedEvent,
    eventTitle,
    eventStartDate,
    eventEndDate,
    eventLevel,
    closeModal,
    resetModalFields,
  ]);

  // ------------------------------------------------------------
  //  Modal: outside click + animation
  // ------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        triggerClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeModal();
    }, 200);
  };

  // ------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------
  return (
    <div className="">
      <div className="pb-4 border-b border-gray-800 mb-5">
        <h2 className="text-xl font-semibold text-white/90">Calendar</h2>
        <p className="text-sm text-gray-400">
          Manage events and tasks in your dashboard.
        </p>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today addEventButton",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        customButtons={{
          addEventButton: {
            text: "Add Event +",
            click: openModal,
          },
        }}
        events={events}
        selectable
        editable
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        height="auto"
        contentHeight="auto"
      />

      {/* Modal - dark mode + animation like SettingsPanel */}
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

            {/* Content */}
            <div className="flex flex-col gap-4">
              <p className="text-gray-400 text-sm mb-2">
                Plan your next big moment — schedule or edit an event to stay on track.
              </p>

              {/* Event Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter event title"
                  className="w-full border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Event Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(COLOR_MAP).map(([key, colorClass]) => {
                    const isSelected = eventLevel === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEventLevel(key)}
                        className={`flex items-center justify-center rounded-md py-2 text-sm font-medium border transition-all duration-150 ${
                          isSelected
                            ? `${colorClass} border-transparent shadow-md scale-105`
                            : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full border border-gray-700 bg-gray-800 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-700 my-4" />

              {/* Footer */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={triggerClose}
                  className="px-4 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition"
                >
                  Close
                </button>
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
//  Render event box in calendar
// ------------------------------------------------------------
const renderEventContent = (eventInfo: EventContentArg) => {
  const calendar = eventInfo.event.extendedProps?.calendar || "Primary";
  const colorClass = COLOR_MAP[calendar] || COLOR_MAP.Primary;

  return (
    <div
      className={`flex items-center justify-start gap-2 px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}
    >
      <span>{eventInfo.event.title}</span>
    </div>
  );
};

export default Calendar;
