"use client";
import React from "react";

export const AdvancedToolbar = ({
  filterRange,
  setFilterRange,
  searchQuery,
  setSearchQuery,
}: {
  filterRange: { start?: string; end?: string };
  setFilterRange: (r: { start?: string; end?: string }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) => (
  <div className="calendar-toolbar-advanced">
    <div className="calendar-filter-group">
      <label className="calendar-filter-label" htmlFor="calendar-filter-start">
        From
      </label>
      <input
        type="date"
        value={filterRange.start || ""}
        onChange={(e) =>
          setFilterRange({ ...filterRange, start: e.target.value })
        }
        id="calendar-filter-start"
        className="calendar-input"
      />
      <label className="calendar-filter-label" htmlFor="calendar-filter-end">
        To
      </label>
      <input
        type="date"
        value={filterRange.end || ""}
        onChange={(e) =>
          setFilterRange({ ...filterRange, end: e.target.value })
        }
        id="calendar-filter-end"
        className="calendar-input"
      />
    </div>

    <input
      type="text"
      placeholder="Search events..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="calendar-search-input"
    />
  </div>
);
