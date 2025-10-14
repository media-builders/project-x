"use client";

import { useState } from "react";

type ImportButtonProps = {
  onImported?: () => Promise<void> | void; // callback so parent can refresh DB
};

export default function ImportButton({ onImported }: ImportButtonProps) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      setImporting(true);
      const res = await fetch("/api/leads/import", { method: "POST" });

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        alert(
          data.error ||
            "No CRM API Key found. Please enter your CRM API Key in Settings, press Save, then click IMPORT."
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Import failed (${res.status})`);
      }

      const data: { ok: boolean; count: number } = await res.json();
      if (data.ok) {
        console.log(`Successfully imported ${data.count} leads.`);
        if (onImported) await onImported(); // let parent refresh DB
      }
    } catch (e: any) {
      console.error(e);
      alert(`Import failed. ${e.message ?? ""}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={handleImport}
      disabled={importing}
    >
      {importing ? "Importing…" : "Import"}
    </button>
  );
}
