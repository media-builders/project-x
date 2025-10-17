"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import CallButton from "@/components/setup/CallButton";
import { Search, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LeadProfile from "@/components/LeadProfile";
import ImportButton from "@/components/setup/ImportButton";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
};

type SortKey = "first" | "last" | "email" | "phone";

export default function LeadsTable() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<SortKey, string[]>>({
    first: [],
    last: [],
    email: [],
    phone: [],
  });

  const [sortBy, setSortBy] = useState<SortKey>("first");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openFilter, setOpenFilter] = useState<SortKey | null>(null);

  // filter dropdown refs
  const firstRef = useRef<HTMLDivElement | null>(null);
  const lastRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const filterRefs: Record<SortKey, React.RefObject<HTMLDivElement>> = {
    first: firstRef,
    last: lastRef,
    email: emailRef,
    phone: phoneRef,
  };

  // close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (openFilter && filterRefs[openFilter].current) {
        if (!filterRefs[openFilter].current!.contains(e.target as Node)) {
          setOpenFilter(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFilter]);

  const allSelected = selected.length === rows.length && rows.length > 0;

  // select / deselect all
  const toggleAll = () => {
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.id)));
  };

  // select / deselect one
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Load leads from DB
  const loadFromDb = useCallback(async () => {
    try {
      setLoadingDb(true);
      const res = await fetch("/api/leads/db");
      if (!res.ok) throw new Error(`DB load failed (${res.status})`);
      const data: { people: Lead[] } = await res.json();
      if (Array.isArray(data.people)) {
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

  const selectedLeads = rows.filter((r) => selected.includes(r.id));

  // Filter helper
  const applyFilters = (
    inputRows: Lead[],
    activeFilters: Record<SortKey, string[]>,
    skipCol?: SortKey
  ) => {
    return inputRows.filter((r) =>
      (["first", "last", "email", "phone"] as SortKey[]).every((col) => {
        if (col === skipCol) return true;
        const val = (r[col] || "").toString().trim();
        const active = activeFilters[col];
        if (active.length === 0) return true;

        if (col === "phone") {
          const digits = val.replace(/\D/g, "");
          const prefix = digits.substring(0, 3);
          return active.includes(prefix);
        } else {
          return active.some((f) => val.toLowerCase().startsWith(f.toLowerCase()));
        }
      })
    );
  };

  // Search + filter application
  const searchedRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.first.toLowerCase().includes(q) ||
      r.last.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q)
    );
  });

  const filteredRows = applyFilters(searchedRows, filters).sort((a, b) => {
    const fieldA = a[sortBy]?.toLowerCase?.() ?? "";
    const fieldB = b[sortBy]?.toLowerCase?.() ?? "";
    if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Dynamic filter options
  const getAvailableFilterOptions = (col: SortKey): string[] => {
    const relevantRows = applyFilters(searchedRows, filters, col);
    const options = new Set<string>();
    relevantRows.forEach((row) => {
      const val = (row[col] || "").toString().trim();
      if (!val) return;
      if (col === "phone") {
        const digits = val.replace(/\D/g, "");
        if (digits.length >= 3) options.add(digits.substring(0, 3));
      } else {
        options.add(val[0].toUpperCase());
      }
    });
    const arr = Array.from(options);
    return col === "phone" ? arr.sort((a, b) => Number(a) - Number(b)) : arr.sort();
  };

  // Sorting toggle
  const toggleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  // Filter toggle
  const toggleFilter = (col: SortKey, value: string) => {
    setFilters((prev) => {
      const active = prev[col] || [];
      if (active.includes(value)) {
        return { ...prev, [col]: active.filter((f) => f !== value) };
      } else {
        return { ...prev, [col]: [...active, value] };
      }
    });
  };

  return (
    <div className="">
      {/* Lead Profile (multi-lead support) */}
      <LeadProfile leads={selectedLeads} />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <form className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </form>
        <div className="flex items-center space-x-4">
          <ImportButton onImported={loadFromDb} />
          <CallButton selectedLeads={selectedLeads} />
          {selected.length > 0 && <span>{selected.length} selected</span>}
        </div>
      </div>

      {/* Table */}
      <div className="table-viewport">
        <div className="table-card relative">
          <table className="contact-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                {(["first", "last", "email", "phone"] as SortKey[]).map((col) => (
                  <th key={col} className="relative header-cell">
                    <div className="flex items-center cursor-pointer" onClick={() => toggleSort(col)}>
                      {col === "first" && "First Name"}
                      {col === "last" && "Last Name"}
                      {col === "email" && "Email"}
                      {col === "phone" && "Phone"}
                      {sortBy === col &&
                        (sortOrder === "asc" ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilter(openFilter === col ? null : col);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    {openFilter === col && (
                      <div
                        ref={filterRefs[col]}
                        className="absolute z-10 bg-white text-black shadow p-2 mt-1 rounded w-32 max-h-48 overflow-y-auto"
                      >
                        {getAvailableFilterOptions(col).map((option) => (
                          <label key={option} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters[col].includes(option)}
                              onChange={() => toggleFilter(col, option)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                ))}
                <th className="header-cell">Stage</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className={`cursor-pointer ${
                    selected.includes(r.id) ? "bg-[rgba(73,179,255,0.1)]" : ""
                  }`}
                  onClick={() => toggleOne(r.id)}
                >
                  <td className="data-cell">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleOne(r.id)}
                      onClick={(e) => e.stopPropagation()} // prevents double toggle
                    />
                  </td>
                  <td className="data-cell">{r.first}</td>
                  <td className="data-cell">{r.last}</td>
                  <td className="data-cell">{r.email}</td>
                  <td className="data-cell">{r.phone}</td>
                  <td className="data-cell">
                    {r.stage ? (
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                        {r.stage}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && !loadingDb && (
                <tr>
                  <td colSpan={5} className="text-center data-cell">
                    No matching leads
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
