"use client";

import type { EventInput } from "@fullcalendar/core";
import type { LucideIcon } from "lucide-react";

export type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export const VIEW_LABELS: Record<CalendarView, string> = {
  dayGridMonth: "Month",
  timeGridWeek: "Week",
  timeGridDay: "Day",
};

export interface CalendarSourceConfig {
  id: string;
  label?: string;
  color?: keyof typeof COLOR_MAP | string;
}

export interface NormalizedCalendarSource {
  id: string;
  label: string;
  colorClass: string;
  accentClass: string;
  color?: string;
}

export interface CalendarEvent extends EventInput {
  extendedProps: {
    calendarId: string;
    calendarLabel: string;
    googleEventId?: string;
    colorClass: string;
    description?: string;
    hangoutLink?: string;
    location?: string;
    colorId?: string;
    visibility?: "default" | "public" | "private";
    attendees?: { email: string }[];
    recurrence?: string[];
    reminders?: { overrides?: { minutes: number }[] };
    color?: string;
  };
}

export interface GoogleCalendarProps {
  calendarSources?: CalendarSourceConfig[];
  maxResults?: number;
  availableViews?: CalendarView[];
  initialView?: CalendarView;
  weekends?: boolean;
  slotMinTime?: string;
  slotMaxTime?: string;
  timeZone?: string;
  height?: string | number;
  timeMin?: string; // ISO
  timeMax?: string; // ISO
  onEventsLoaded?: (events: CalendarEvent[]) => void;
  onError?: (error: Error) => void;
}

/** color map is declared in colorMap.ts but needed for CalendarSourceConfig type */
export const COLOR_MAP = {
  Danger: "bg-red-600 text-white",
  Success: "bg-emerald-500 text-white",
  Primary: "bg-blue-600 text-white",
  Warning: "bg-yellow-400 text-black",
} as const;
