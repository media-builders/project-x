"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type Lead = {
  id: string;   // in UI: DB uuid when loaded from DB; temporary for imported array
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

export default function LeadsTable() {
  // Demo seed; replaced by DB on mount (if any rows exist)
  const initialRows: Lead[] = useMemo(
    () => [
      
    ],
    []
  );

  const [rows, setRows] = useState<Lead[]>(initialRows);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [loadingDb, setLoadingDb] = useState(true);

  const allSelected = selected.length === rows.length && rows.length > 0;

  const toggleAll = () =>
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.id)));

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  //ELEVENLABS AGENT SETUP
  const elevenlabsSetup = async() => {
    
    const picked = rows.filter((r) => selected.includes(r.id));
    if (picked.length === 0) return;

    try {
      console.log("Creating/retrieving ElevenLabs agent...");

      const res = await fetch("/api/elevenlabs-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // voiceId or llmSettings if you want, otherwise leave empty
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Agent API failed with status ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!data.agent) {
        alert("Agent not returned from API");
        return;
      }

      // Display agent info and selected leads
      alert(
        `Agent: ${data.agent.name} (ID: ${data.agent.id})\n\nCalling ${picked.length} lead${picked.length === 1 ? "" : "s"}:\n` +
          picked.map((p) => `${p.first} ${p.last} — ${p.phone}`).join("\n")
      );
    } catch (err) {
      console.error(err);
      alert("Failed to create/retrieve agent");
    }
  };
  
  //TWILIO SUBACCOUNT SETUP
  const twilioSetup = async() => {
    console.log("Checking or creating Twilio subaccount...");
    const twilioRes = await fetch("/api/twilio_subaccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), 
    });

    if (!twilioRes.ok) {
      const errData = await twilioRes.json().catch(() => ({}));
      alert(errData.error || `Twilio subaccount setup failed (status ${twilioRes.status})`);
      return;
    }

    const twilioData = await twilioRes.json();

    //Ensure we have the subaccount SID and API key (or auth token)
    const { subAccountSid, apiKeySid, apiKeySecret } = twilioData;
    console.log("Twilio subaccount ready:", subAccountSid);
  };

  //ELEVENLABS AGENT MAKING OUTBOUND CALL THROUGH TWILIO
  const makeOutboundCall = async() => {
    const picked = rows.filter((r) => selected.includes(r.id));
    if (picked.length === 0) return;
    
  }

  // 1) Load saved leads from DB on mount
  const loadFromDb = useCallback(async () => {
    try {
      setLoadingDb(true);
      const res = await fetch("/api/leads/db");
      if (!res.ok) throw new Error(`DB load failed (${res.status})`);
      const data: { people: Lead[] } = await res.json();
      //
      console.log("Imported from API:", data.people.length, "contacts");
      if (Array.isArray(data.people) && data.people.length > 0) {
        setRows(data.people);
        setSelected([]);
      }
    } catch (e) {
      console.error(e);
      // keep demo seed if DB is empty or error
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // 2) Import from FUB -> save -> refresh from DB (so UI shows appended union)
  const handleImport = useCallback(async () => {
    try {
      setImporting(true);
      const res = await fetch("/api/leads/import", {method: "POST"});
      
      //Error message alert
      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No CRM API Key found. Please enter your CRM API Key in Settings, press Save, then click IMPORT.")
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Import failed (${res.status})`);
      }

      const data: { ok: boolean; count: number } = await res.json();
      if (data.ok) {
        console.log(`Successfully imported ${data.count} leads.`);
        await loadFromDb();
      }
    } catch (e: any) {
        console.error(e);
        alert(`Import failed. ${e.message ?? ""}`);
      } finally {
        setImporting(false);
      }
  }, [loadFromDb]);

  return (
    <div className="dashboard-window">
      {/* Toolbar */}
      <div className="table-toolbar" role="toolbar" aria-label="Leads actions">
        <div className="table-actions">
          <button type="button" className="btn btn-ghost" onClick={handleImport} disabled={importing}>
            {importing ? "Importing…" : "Import"}
          </button>
          <button type="button" className="btn btn-ghost">Export</button>
          <button type="button" className="btn btn-ghost">Sync</button>
        </div>
        <div className="secondary-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={elevenlabsSetup}
          >
            Elevenlabs Agent{selected.length > 1 ? "s" : ""}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={twilioSetup}
          >
            Twilio Setup{selected.length > 1 ? "s" : ""}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={makeOutboundCall}
            disabled={selected.length === 0}
          >
            Elevenlabs Agent Call via Twilio{selected.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-viewport">
        <div className="table-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <h2 className="table-title" style={{ margin: 0 }}>Leads</h2>
            {selected.length > 0 && (
              <span style={{ fontSize: "0.875rem", fontStyle: "italic", fontWeight: 300 }}>
                {selected.length} Contact{selected.length > 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          <table className="contact-table">
            <caption className="sr-only">Lead contacts</caption>
            <thead>
              <tr>
                <th scope="col" className="header-cell checkbox-cell">
                  <input type="checkbox" aria-label="Select all leads" checked={allSelected} onChange={toggleAll} />
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

              {rows.length === 0 && !loadingDb && (
                <tr>
                  <td className="data-cell" colSpan={5} style={{ textAlign: "center", color: "var(--txt-2, #a9b8d9)" }}>
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
