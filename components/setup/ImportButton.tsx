"use client";

import { useEffect, useRef, useState } from "react";

type ImportButtonProps = {
  onImported?: () => Promise<void> | void; // callback so parent can refresh DB
};

const STAGE_FILTERS = [
  "Lead",
  "Hot Prospect",
  "Nurture",
  "Active Client",
  "Closed",
  "Past Client",
  "Sphere",
  "Unresponsive",
  "Trash"
];

export default function ImportButton({ onImported }: ImportButtonProps) {
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(false);           
  const [stages, setStages] = useState<string[]>([]); 
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ddRef.current) return;
      if (!ddRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggleStage = (s: string) =>
    setStages(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  
  const handleImport = async () => {
    setImporting(true);
    try {
      const payload = stages.length ? { stages } : undefined;  
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,   
      });

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
    <div className="relative" ref={ddRef}>
      {/* [CHANGED] trigger now opens a small stage picker */}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen(o => !o)}
        disabled={importing}
        title="Import by Stage"
      >
        {importing ? "Importing…" : `Import (${stages.length || 0} stages)`}
      </button>

      {/* [NEW] dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white p-2 shadow-lg z-20">
          <div className="max-h-64 overflow-auto">
            {STAGE_FILTERS.map(st => (
              <label key={st} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stages.includes(st)}
                  onChange={() => toggleStage(st)}
                />
                <span className="text-sm text-gray-900">{st}</span>
              </label>
            ))}
          </div>

          <div className="mt-2 flex justify-between">
            <button
              type="button"
              className="text-xs underline"
              onClick={() => setStages([])}
            >
              Clear
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
