// components/LeadsTable.tsx
// Adds: per-row checkboxes, header "select all" checkbox, and a Call Lead
// button that activates only when at least one row is selected.

import { useMemo, useState } from "react";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

export default function LeadsTable() {
  // Source-of-truth rows (same two leads you had)
  const rows: Lead[] = useMemo(
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

  const [selected, setSelected] = useState<string[]>([]);

  const allSelected = selected.length === rows.length && rows.length > 0;

  const toggleAll = () => {
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCall = () => {
    // Placeholder: hook this to your dialer/integration.
    // For now, we just log the selected leads.
    const picked = rows.filter((r) => selected.includes(r.id));
    // eslint-disable-next-line no-console
    console.log("Calling leads:", picked);
    alert(
      `Calling ${picked.length} lead${picked.length === 1 ? "" : "s"}:\n` +
        picked.map((p) => `${p.first} ${p.last} — ${p.phone}`).join("\n")
    );
  };

  return (
    <div className="dashboard-window">
      {/* Top actions */}
      <div className="table-toolbar" role="toolbar" aria-label="Leads actions">
        <div className="table-actions">
          <button type="button" className="btn btn-ghost" aria-label="Import leads">
            Import
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
            aria-label="Call selected leads"
            onClick={handleCall}
            disabled={selected.length === 0}
          >
            Call Lead{selected.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>

      <div className="table-viewport">
        <div className="table-card">
          <h2 className="table-title">Leads</h2>

          <table className="contact-table">
            <caption className="sr-only">Lead contacts</caption>
            <thead>
              <tr>
                {/* Select-all checkbox */}
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
            </tbody>
          </table>

          <div className="table-footer-space" />
        </div>
      </div>
    </div>
  );
}
