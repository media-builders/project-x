"use client";

import { useMemo, useState, useCallback } from "react";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

export default function Leads() {
  // Demo seed; replaced on Import
  const initialRows: Lead[] = useMemo(
    () => [
      {
        id: "jane",
        first: "Jane",
        last: "Doe",
        email: "jane.doe@example.com",
        phone: "(555) 123-4567",
      },
      {
        id: "john",
        first: "John",
        last: "Smith",
        email: "john.smith@example.com",
        phone: "(555) 987-6543",
        featured: true,
      },
    ],
    []
  );

  const [rows, setRows] = useState<Lead[]>(initialRows);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const allSelected = selected.length === rows.length && rows.length > 0;

  const toggleAll = () =>
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.id)));

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleCall = () => {
    const picked = rows.filter((r) => selected.includes(r.id));
    if (picked.length === 0) return;
    alert(
      `Calling ${picked.length} lead${picked.length === 1 ? "" : "s"}:\n` +
        picked.map((p) => `${p.first} ${p.last} — ${p.phone}`).join("\n")
    );
  };

  // Import from our secure API route (app/api/leads/route.ts -> utils/fub.ts)
  const handleImport = useCallback(async () => {
    try {
      setImporting(true);
      const res = await fetch("/api/leads", {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);
      const data: { people: Lead[] } = await res.json();
      setRows(data.people ?? []);
      setSelected([]); // clear selections after import
    } catch (e) {
      console.error(e);
      alert("Import failed. See console for details.");
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <div className="dashboard-window">
      {/* Toolbar */}
      <div className="table-toolbar" role="toolbar" aria-label="Leads actions">
        <div className="table-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleImport}
            disabled={importing}
            aria-label="Import leads"
          >
            {importing ? "Importing…" : "Import"}
          </button>
          <button type="button" className="btn btn-ghost" aria-label="Export leads">
            Export
          </button>
          <button type="button" className="btn btn-ghost" aria-label="Sync leads">
            Sync
          </button>
        </div>

        <div className="secondary-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCall}
            disabled={selected.length === 0}
            aria-label="Call selected leads"
          >
            Call Lead{selected.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-viewport">
        <div className="table-card">
          <h2 className="table-title">Leads</h2>

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
                  <tr key={r.id} className={`row ${r.featured ? "is-featured" : ""}`}>
                    <td className="data-cell checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.first} ${r.last}`}
                        checked={isChecked}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="data-cell" data-label="First Name">{r.first}</td>
                    <td className="data-cell" data-label="Last Name">{r.last}</td>
                    <td className="data-cell" data-label="Email">{r.email}</td>
                    <td className="data-cell" data-label="Phone Number">{r.phone}</td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td className="data-cell" colSpan={5} style={{ textAlign: "center", color: "var(--txt-2, #a9b8d9)" }}>
                    No leads found. Click <strong>Import</strong>.
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
