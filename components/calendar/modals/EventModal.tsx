"use client";

import React, { useEffect, useState } from "react";
import {
  AlignLeft,
  Bell,
  Clock,
  Eye,
  MapPin,
  Palette,
  Repeat,
  Users,
  Video,
  X,
} from "lucide-react";
import type { CalendarEvent, NormalizedCalendarSource } from "../utils/types";

interface Props {
  selectedEvent: CalendarEvent | null;
  eventTitle: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStartTime: string;
  eventEndTime: string;
  selectedCalendarId: string;
  setEventTitle: (v: string) => void;
  setEventStartDate: (v: string) => void;
  setEventEndDate: (v: string) => void;
  setEventStartTime: (v: string) => void;
  setEventEndTime: (v: string) => void;
  setSelectedCalendarId: (v: string) => void;
  calendars: NormalizedCalendarSource[];
  description: string;
  setDescription: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  attendees: string;
  setAttendees: (v: string) => void;
  colorId: string;
  setColorId: (v: string) => void;
  recurrence: string;
  setRecurrence: (v: string) => void;
  reminderMinutes: number;
  setReminderMinutes: (v: number) => void;
  visibility: "default" | "public" | "private";
  setVisibility: (v: "default" | "public" | "private") => void;
  onSave: (createConference?: boolean, notifyGuests?: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
  notifyGuests: boolean;
  setNotifyGuests: (v: boolean) => void;
}

const GOOGLE_COLORS: Record<string, { name: string; hex: string }> = {
  "1": { name: "Lavender", hex: "#7986CB" },
  "2": { name: "Sage", hex: "#33B679" },
  "3": { name: "Grape", hex: "#8E24AA" },
  "4": { name: "Flamingo", hex: "#E67C73" },
  "5": { name: "Banana", hex: "#F6BF26" },
  "6": { name: "Tangerine", hex: "#F4511E" },
  "7": { name: "Peacock", hex: "#039BE5" },
  "8": { name: "Graphite", hex: "#616161" },
  "9": { name: "Blueberry", hex: "#3F51B5" },
  "10": { name: "Basil", hex: "#0B8043" },
  "11": { name: "Tomato", hex: "#D50000" },
};

const MEET_PLACEHOLDER = "https://meet.google.com/";

const EventModal: React.FC<Props> = ({
  selectedEvent,
  eventTitle,
  eventStartDate,
  eventEndDate,
  eventStartTime,
  eventEndTime,
  selectedCalendarId,
  setEventTitle,
  setEventStartDate,
  setEventEndDate,
  setEventStartTime,
  setEventEndTime,
  setSelectedCalendarId,
  calendars,
  description,
  setDescription,
  location,
  setLocation,
  attendees,
  setAttendees,
  colorId,
  setColorId,
  recurrence,
  setRecurrence,
  reminderMinutes,
  setReminderMinutes,
  visibility,
  setVisibility,
  onSave,
  onDelete,
  onClose,
  notifyGuests,
  setNotifyGuests,
}) => {
  const [createMeet, setCreateMeet] = useState(false);
  const [notifyGuestsState, setNotifyGuestsState] = useState(notifyGuests);

  useEffect(() => {
    setNotifyGuestsState(notifyGuests);
  }, [notifyGuests]);

  useEffect(() => {
    const hangoutLink = selectedEvent?.extendedProps?.hangoutLink ?? "";
    const hasMeetLink = Boolean(hangoutLink);
    setCreateMeet(hasMeetLink);

    if (hasMeetLink && hangoutLink) {
      if (!location || location === MEET_PLACEHOLDER) {
        setLocation(hangoutLink);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  const saveDisabled = !eventTitle || !selectedCalendarId;

  const handleReminderChange = (value: string) => {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      setReminderMinutes(parsed);
    }
  };

  const handleMeetToggle = (checked: boolean) => {
    setCreateMeet(checked);

    if (checked) {
      const existingLink = selectedEvent?.extendedProps?.hangoutLink;
      setLocation(existingLink || MEET_PLACEHOLDER);
    } else {
      setLocation("");
    }
  };

  const handleSave = () => {
    if (saveDisabled) return;
    setNotifyGuests(notifyGuestsState);
    onSave(createMeet, notifyGuestsState);
  };

  return (
    <aside className="calendar-editor-panel">
      <div className="calendar-editor-header">
        <div className="calendar-editor-heading">
          <span className="calendar-editor-subtitle">
            {selectedEvent ? "Update existing event" : "Plan something new"}
          </span>
          <h2 className="calendar-editor-title">
            {selectedEvent ? "Edit Event" : "Add Event"}
          </h2>
        </div>
        <button
          type="button"
          className="calendar-editor-close"
          onClick={onClose}
          aria-label="Reset event editor"
        >
          <X className="calendar-editor-close-icon" />
        </button>
      </div>

      <div className="calendar-editor-content">
        <div className="calendar-editor-grid">
          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-title"
            >
              Title
            </label>
            <input
              id="calendar-event-title"
              type="text"
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="calendar-input calendar-editor-input"
            />
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-calendar"
            >
              Calendar
            </label>
            <select
              id="calendar-event-calendar"
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="calendar-input calendar-editor-input"
            >
              <option value="">Select a calendar</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.label}
                </option>
              ))}
            </select>
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-start-date"
            >
              <Clock className="calendar-editor-label-icon" />
              Start
            </label>
            <div className="calendar-editor-inline">
              <input
                id="calendar-event-start-date"
                type="date"
                value={eventStartDate}
                onChange={(e) => setEventStartDate(e.target.value)}
                className="calendar-input calendar-editor-input"
              />
              <input
                id="calendar-event-start-time"
                type="time"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
                className="calendar-input calendar-editor-input calendar-editor-input--time"
              />
            </div>
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-end-date"
            >
              <Clock className="calendar-editor-label-icon" />
              End
            </label>
            <div className="calendar-editor-inline">
              <input
                id="calendar-event-end-date"
                type="date"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="calendar-input calendar-editor-input"
              />
              <input
                id="calendar-event-end-time"
                type="time"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
                className="calendar-input calendar-editor-input calendar-editor-input--time"
              />
            </div>
          </div>

          <div className="calendar-editor-field calendar-editor-field--location">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-location"
            >
              <MapPin className="calendar-editor-label-icon" />
              Location
            </label>
            <div className="calendar-editor-location-row">
              <input
                id="calendar-event-location"
                type="text"
                placeholder="Add a location or meeting link"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="calendar-input calendar-editor-input"
              />
              <label
                className={`calendar-editor-meet-toggle${
                  createMeet ? " calendar-editor-meet-toggle--active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={createMeet}
                  onChange={(e) => handleMeetToggle(e.target.checked)}
                />
                <Video className="calendar-editor-meet-icon" />
                <span>Meet link</span>
              </label>
            </div>
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-attendees"
            >
              <Users className="calendar-editor-label-icon" />
              Guests (comma separated emails)
            </label>
            <input
              id="calendar-event-attendees"
              type="text"
              placeholder="guest@example.com, coworker@example.com"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              className="calendar-input calendar-editor-input"
            />
          </div>

          <div className="calendar-editor-field calendar-editor-field--description">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-description"
            >
              <AlignLeft className="calendar-editor-label-icon" />
              Description
            </label>
            <textarea
              id="calendar-event-description"
              rows={6}
              placeholder="Add details, agenda, or meeting notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="calendar-editor-textarea"
            />
          </div>

          <div className="calendar-editor-field">
            <label className="calendar-editor-label" htmlFor="calendar-event-color">
              <Palette className="calendar-editor-label-icon" />
              Color
            </label>
            <div className="calendar-editor-select-wrapper">
              <select
                id="calendar-event-color"
                value={colorId}
                onChange={(e) => setColorId(e.target.value)}
                className="calendar-input calendar-editor-input"
              >
                <option value="">Default</option>
                {Object.entries(GOOGLE_COLORS).map(([id, { name }]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              {colorId && GOOGLE_COLORS[colorId] && (
                <span
                  className="calendar-color-swatch"
                  style={{ backgroundColor: GOOGLE_COLORS[colorId].hex }}
                />
              )}
            </div>
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-visibility"
            >
              <Eye className="calendar-editor-label-icon" />
              Visibility
            </label>
            <select
              id="calendar-event-visibility"
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "default" | "public" | "private")
              }
              className="calendar-input calendar-editor-input"
            >
              <option value="default">Default</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-recurrence"
            >
              <Repeat className="calendar-editor-label-icon" />
              Repeat
            </label>
            <select
              id="calendar-event-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="calendar-input calendar-editor-input"
            >
              <option value="">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div className="calendar-editor-field">
            <label
              className="calendar-editor-label"
              htmlFor="calendar-event-reminder"
            >
              <Bell className="calendar-editor-label-icon" />
              Reminder
            </label>
            <select
              id="calendar-event-reminder"
              value={reminderMinutes}
              onChange={(e) => handleReminderChange(e.target.value)}
              className="calendar-input calendar-editor-input"
            >
              <option value="0">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>
        </div>
      </div>

      <div className="calendar-editor-actions">
        <label className="calendar-notify-toggle">
          <input
            type="checkbox"
            checked={notifyGuestsState}
            onChange={(e) => setNotifyGuestsState(e.target.checked)}
          />
          <span className="calendar-notify-toggle-label">Notify guests</span>
        </label>
        <div className="calendar-editor-actions-buttons">
          {selectedEvent && (
            <button
              type="button"
              className="calendar-editor-button calendar-editor-button--danger"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className={`calendar-editor-button calendar-editor-button--primary${
              saveDisabled ? " calendar-editor-button--disabled" : ""
            }`}
            disabled={saveDisabled}
          >
            {selectedEvent ? "Update Event" : "Add Event"}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default EventModal;
