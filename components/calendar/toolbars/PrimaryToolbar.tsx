"use client";
import React from "react";

const VIEW_OPTIONS: Array<"dayGridMonth" | "timeGridWeek" | "timeGridDay"> = [
  "dayGridMonth",
  "timeGridWeek",
  "timeGridDay",
];

export const PrimaryToolbar = ({
  activeView,
  onViewChange,
  onRefresh,
}: {
  activeView: "dayGridMonth" | "timeGridWeek" | "timeGridDay";
  onViewChange: (view: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => void;
  onRefresh: () => void;
}) => (
  <div className="calendar-toolbar-primary">
    <div className="calendar-view-button-group">
      {VIEW_OPTIONS.map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
          className={`calendar-view-button${
            activeView === view ? " calendar-view-button--active" : ""
          }`}
        >
          {view === "dayGridMonth"
            ? "Month"
            : view === "timeGridWeek"
            ? "Week"
            : "Day"}
        </button>
      ))}
    </div>
    <button
      type="button"
      onClick={onRefresh}
      className="calendar-refresh-button"
    >
      Refresh
    </button>
  </div>
);
