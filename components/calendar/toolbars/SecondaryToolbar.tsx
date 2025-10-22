"use client";
import React from "react";
import type { NormalizedCalendarSource } from "../utils/types";

export const SecondaryToolbar = ({
  calendars,
  activeCalendars,
  setActiveCalendars,
}: {
  calendars: NormalizedCalendarSource[];
  activeCalendars: string[];
  setActiveCalendars: (ids: string[]) => void;
}) => (
  <div className="calendar-toolbar-secondary">
    {calendars.map((c) => (
      <label
        key={c.id}
        className="calendar-calendar-toggle"
      >
        <input
          type="checkbox"
          checked={activeCalendars.includes(c.id)}
          onChange={() =>
            setActiveCalendars(
              activeCalendars.includes(c.id)
                ? activeCalendars.filter((id) => id !== c.id)
                : [...activeCalendars, c.id]
            )
          }
          className="calendar-calendar-checkbox"
        />
        <span
          className="calendar-calendar-dot"
          style={{
            backgroundColor:
              c.colorClass?.replace("bg-[", "").replace("]", "") || "#4285F4",
          }}
        />
        <span className="calendar-calendar-label">{c.label}</span>
      </label>
    ))}
  </div>
);
