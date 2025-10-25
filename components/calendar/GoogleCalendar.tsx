"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";

import { useToast } from "./ToastProvider";

import { useGoogleCalendars } from "./hooks/useGoogleCalendars";
import { useGoogleEvents } from "./hooks/useGoogleEvents";
import type { CalendarEvent } from "./utils/types";

import { PrimaryToolbar } from "./toolbars/PrimaryToolbar";
import { SecondaryToolbar } from "./toolbars/SecondaryToolbar";
import { AdvancedToolbar } from "./toolbars/AdvancedToolbar";
import EventModal from "./modals/EventModal";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

const GoogleCalendar: React.FC = () => {
  const { show } = useToast();
  const calendarRef = useRef<FullCalendar | null>(null);

  // ------------------ Google Calendar sources ------------------
  const { calendars, accessToken, loading, error } = useGoogleCalendars();
  const [activeCalendars, setActiveCalendars] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<CalendarView>("dayGridMonth");
  const [filterRange, setFilterRange] = useState<{ start?: string; end?: string }>({});
  const [searchQuery, setSearchQuery] = useState("");

  // ------------------ Modal + event state ------------------
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");

  // Basic
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");

  // Advanced
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [colorId, setColorId] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<number>(10);
  const [visibility, setVisibility] = useState<"default" | "public" | "private">(
    "default"
  );
  const [notifyGuests, setNotifyGuests] = useState(false);

  // ------------------ Initialize calendars ------------------
  useEffect(() => {
    if (!loading && calendars.length > 0) {
      const allIds = calendars.map((c) => c.id);
      setActiveCalendars(allIds);
      setSelectedCalendarId(allIds[0] || "");
    }
  }, [loading, calendars]);

  // ------------------ Load events ------------------
  const {
    events,
    refetch,
    upsertEvent,
    deleteEvent,
    moveEvent,
    loading: eventsLoading,
  } = useGoogleEvents({
    sources: calendars,
    activeCalendarIds: activeCalendars,
    maxResults: 200,
    timeMin: filterRange.start,
    timeMax: filterRange.end,
  });

  // ------------------ Filters ------------------
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const t = (e.title || "").toLowerCase();
      const c = (e.extendedProps?.calendarLabel || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }, [events, searchQuery]);

  // ------------------ Modal reset ------------------
  const resetModalFields = () => {
    setSelectedEvent(null);
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("09:00");
    setEventEndTime("10:00");
    setDescription("");
    setLocation("");
    setAttendees("");
    setColorId("");
    setRecurrence("");
    setReminderMinutes(10);
    setVisibility("default");
  };

  // ------------------ Calendar interaction handlers ------------------
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startDate = selectInfo.startStr.split("T")[0];
    const endDate = (selectInfo.endStr || selectInfo.startStr).split("T")[0];

    resetModalFields();
    setEventStartDate(startDate);
    setEventEndDate(endDate);
    if (!selectedCalendarId && activeCalendars.length) {
      setSelectedCalendarId(activeCalendars[0]);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const evt = clickInfo.event as unknown as CalendarEvent;
    resetModalFields();

    const startIso = clickInfo.event.start?.toISOString();
    const endIso = clickInfo.event.end?.toISOString();

    if (startIso) {
      const [sd, st] = startIso.split("T");
      setEventStartDate(sd);
      setEventStartTime(st.slice(0, 5));
    }
    if (endIso) {
      const [ed, et] = endIso.split("T");
      setEventEndDate(ed);
      setEventEndTime(et.slice(0, 5));
    } else if (startIso) {
      setEventEndDate(startIso.split("T")[0]);
      setEventEndTime("10:00");
    }

    setSelectedEvent(evt);
    setEventTitle(clickInfo.event.title);
    if (evt.extendedProps?.calendarId) {
      setSelectedCalendarId(evt.extendedProps.calendarId);
    }

    const ext = evt.extendedProps || {};
    setDescription(ext.description || "");
    setLocation(ext.hangoutLink || ext.location || "");
    setColorId(ext.colorId || "");
    setVisibility(ext.visibility || "default");
    setAttendees(
      ext.attendees ? ext.attendees.map((a: any) => a.email).join(", ") : ""
    );
    setRecurrence(ext.recurrence?.[0]?.split(";")[0]?.replace("RRULE:FREQ=", "") || "");
    setReminderMinutes(ext.reminders?.overrides?.[0]?.minutes ?? 10);
  };

  // ------------------ Persist changes ------------------
  const handleSaveEvent = async (
    createConference = false,
    notifyGuestsOverride = notifyGuests
  ) => {
    if (!eventTitle || !eventStartDate || !selectedCalendarId) {
      show({
        title: "Missing fields",
        message: "Please add title, start date, and select a calendar.",
        variant: "warning",
      });
      return;
    }

    try {
      setNotifyGuests(notifyGuestsOverride);

      const existingCalendarId = selectedEvent?.extendedProps?.calendarId;
      const googleEventId = selectedEvent?.extendedProps?.googleEventId;
      if (
        selectedEvent &&
        googleEventId &&
        existingCalendarId &&
        existingCalendarId !== selectedCalendarId
      ) {
        try {
          await moveEvent(
            existingCalendarId,
            googleEventId,
            selectedCalendarId,
            notifyGuestsOverride
          );
        } catch (moveError) {
          console.error("Move failed:", moveError);
          show({
            title: "Move failed",
            message: "Could not move event to the selected calendar.",
            variant: "error",
          });
          return;
        }
      }

      const startISO = `${eventStartDate}T${eventStartTime}:00`;
      const endISO = `${eventEndDate || eventStartDate}T${eventEndTime}:00`;
      const shouldCreateConference =
        createConference && !selectedEvent?.extendedProps?.hangoutLink;
      const shouldRemoveConference =
        !createConference && !!selectedEvent?.extendedProps?.hangoutLink;

      await upsertEvent({
        title: eventTitle,
        startDate: startISO,
        endDate: endISO,
        calendarId: selectedCalendarId,
        googleEventId: selectedEvent?.extendedProps.googleEventId,
        notifyGuests: notifyGuestsOverride,
        removeConference: shouldRemoveConference,
        description,
        location,
        attendees: attendees
          ? attendees
              .split(",")
              .map((email) => ({ email: email.trim() }))
              .filter((a) => a.email)
          : undefined,
        colorId: colorId || undefined,
        recurrence: recurrence ? [`RRULE:FREQ=${recurrence}`] : undefined,
        visibility,
        reminders:
          reminderMinutes > 0
            ? {
                useDefault: false,
                overrides: [{ method: "popup", minutes: reminderMinutes }],
              }
            : { useDefault: true },
        createConference: shouldCreateConference,
      });

      resetModalFields();
      await refetch();
    } catch (e) {
      console.error("Error saving event:", e);
      show({
        title: "Failed to save",
        message: "There was a problem saving this event.",
        variant: "error",
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.extendedProps.googleEventId) return;
    try {
      await deleteEvent(
        selectedEvent.extendedProps.calendarId,
        selectedEvent.extendedProps.googleEventId
      );
      resetModalFields();
      await refetch();
    } catch (e) {
      console.error("Delete failed:", e);
      show({
        title: "Failed to delete",
        message: "There was a problem deleting this event.",
        variant: "error",
      });
    }
  };

  // ------------------ Sync view selection ------------------
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type !== activeView) {
      api.changeView(activeView);
    }
  }, [activeView]);

  // ------------------ Render ------------------
  if (loading) return <p className="calendar-status">Loading calendars…</p>;
  if (error) return <p className="calendar-status calendar-status--error">Error: {error}</p>;
  if (!accessToken)
    return <p className="calendar-status">No Google access token available.</p>;

  return (
    <div className="calendar-shell">
      <div className="calendar-toolbar-stack">
        <PrimaryToolbar
          activeView={activeView}
          onViewChange={setActiveView}
          onRefresh={refetch}
        />

        <SecondaryToolbar
          calendars={calendars}
          activeCalendars={activeCalendars}
          setActiveCalendars={setActiveCalendars}
        />

        {/* <AdvancedToolbar
          filterRange={filterRange}
          setFilterRange={setFilterRange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        /> */}
      </div>

      <div className="calendar-content">
        <div className="calendar-view-pane">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={activeView}
            selectable
            editable
            events={filteredEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEvent}
            weekends
            height="auto"
          />
        </div>

        {/* <EventModal
          selectedEvent={selectedEvent}
          selectedCalendarId={selectedCalendarId}
          setSelectedCalendarId={setSelectedCalendarId}
          calendars={calendars}
          eventTitle={eventTitle}
          setEventTitle={setEventTitle}
          eventStartDate={eventStartDate}
          setEventStartDate={setEventStartDate}
          eventEndDate={eventEndDate}
          setEventEndDate={setEventEndDate}
          eventStartTime={eventStartTime}
          setEventStartTime={setEventStartTime}
          eventEndTime={eventEndTime}
          setEventEndTime={setEventEndTime}
          description={description}
          setDescription={setDescription}
          location={location}
          setLocation={setLocation}
          attendees={attendees}
          setAttendees={setAttendees}
          colorId={colorId}
          setColorId={setColorId}
          recurrence={recurrence}
          setRecurrence={setRecurrence}
          reminderMinutes={reminderMinutes}
          setReminderMinutes={setReminderMinutes}
          visibility={visibility}
          setVisibility={setVisibility}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onClose={resetModalFields}
          notifyGuests={notifyGuests}
          setNotifyGuests={setNotifyGuests}
        /> */}
      </div>
    </div>
  );
};

// ------------------ Custom Event Renderer (updated) ------------------
function renderEvent(info: EventContentArg) {
  const props = (info.event.extendedProps as CalendarEvent["extendedProps"]) ?? {};
  const bgColor =
    info.event.backgroundColor || props.color || "#2563EB";
  const label = props.calendarLabel;

  return (
    <div
      className="calendar-event-chip"
      style={{
        backgroundColor: bgColor,
        borderLeftColor: bgColor,
      }}
    >
      <span className="calendar-event-title">{info.event.title}</span>
      {label && (
        <span className="calendar-event-calendar-label">{label}</span>
      )}
    </div>
  );
}

export default GoogleCalendar;
