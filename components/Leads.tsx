"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import CallButton from "@/components/setup/CallButton";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

export default function LeadsTable() {
  const initialRows: Lead[] = useMemo(() => [], []);

  const [rows, setRows] = useState<Lead[]>(initialRows);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  const allSelected = selected.length === rows.length && rows.length > 0;

  const toggleAll = () =>
    setSelected((prev) =>
      prev.length === rows.length ? [] : rows.map((r) => r.id)
    );

  const toggleOne = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // 🔄 Load leads from DB
  const loadFromDb = useCallback(async () => {
    try {
      setLoadingDb(true);
      const res = await fetch("/api/leads/db");
      if (!res.ok) throw new Error(`DB load failed (${res.status})`);
      const data: { people: Lead[] } = await res.json();
      if (Array.isArray(data.people) && data.people.length > 0) {
        setRows(data.people);
        setSelected([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // Build selected leads array for CallButton
  const selectedLeads = rows.filter((r) => selected.includes(r.id));

  return (
    <div className="dashboard-window">
      {/* Table */}
      <div className="flex items-end justify-between mb-2">
        {/* 📞 CallButton here */}
        <CallButton selectedLeads={selectedLeads} />
        {selected.length > 0 && (
          <span>
            {selected.length} Contact
            {selected.length > 1 ? "s" : ""} selected
          </span>
        )}
      </div>
      <div className="table-viewport">
        <div className="table-card">

          <table className="contact-table">
            <caption className="sr-only">Lead contacts</caption>
            <thead>
              <tr>
                <th scope="col" className="header-cell checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all leads"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th scope="col" className="header-cell">First Name</th>
                <th scope="col" className="header-cell">Last Name</th>
                <th scope="col" className="header-cell">Email</th>
                <th scope="col" className="header-cell">Phone Number</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const isChecked = selected.includes(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`row ${r.featured ? "is-featured" : ""}`}
                  >
                    <td className="data-cell checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.first} ${r.last}`}
                        checked={isChecked}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="data-cell" data-label="First Name">
                      {r.first}
                    </td>
                    <td className="data-cell" data-label="Last Name">
                      {r.last}
                    </td>
                    <td className="data-cell" data-label="Email">
                      {r.email}
                    </td>
                    <td className="data-cell" data-label="Phone Number">
                      {r.phone}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && !loadingDb && (
                <tr>
                  <td
                    className="data-cell"
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "var(--txt-2, #a9b8d9)",
                    }}
                  >
                    No leads yet. Click <strong>Import</strong> to load data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="table-footer-space" />
        </div>
      </div>
    </div>
  );
}
