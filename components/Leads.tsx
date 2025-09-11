// components/LeadsTable.tsx
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

export default function LeadsTable() {
  // demo seed; replaced on Import
  const initialRows: Lead[] = useMemo(
    () => [
      { id: "jane", first: "Jane", last: "Doe", email: "jane.doe@example.com", phone: "(555) 123-4567" },
      { id: "john", first: "John", last: "Smith", email: "john.smith@example.com", phone: "(555) 987-6543", featured: true },
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
    // Replace with dialer integration
    alert(
      `Calling ${picked.length} lead${picked.length === 1 ? "" : "s"}:\n` +
        picked.map((p) => `${p.first} ${p.last} — ${p.phone}`).join("\n")
    );
  };

  const handleImport = useCallback(async () => {
    try {
      setImporting(true);
      const res = await fetch("/api/leads", { method: "GET", headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);
      const data: { people: Lead[] } = await res.json();
      setRows(data.people ?? []);
      setSelected([]);
    } catch (e) {
      console.error(e);
      ale
