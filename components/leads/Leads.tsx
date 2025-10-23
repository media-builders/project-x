"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import CallButton from "@/components/settings/setup/CallButton";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LeadProfile from "@/components/leads/LeadProfile";
import ImportButton from "@/components/settings/setup/ImportButton";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
  featured?: boolean;
};

type SortKey = "first" | "last" | "email" | "phone" | "stage";

const TABLE_COLUMNS: SortKey[] = ["first", "last", "email", "phone", "stage"];
const FILTER_COLUMNS: SortKey[] = ["first", "last", "email", "phone", "stage"];

type NewLeadForm = {
  first: string;
  last: string;
  email: string;
  phone: string;
  stage: string;
};

const EMPTY_LEAD: NewLeadForm = {
  first: "",
  last: "",
  email: "",
  phone: "",
  stage: "",
};

export default function LeadsTable() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<SortKey, string[]>>({
    first: [],
    last: [],
    email: [],
    phone: [],
    stage: [],
  });
  const [showAddLead, setShowAddLead] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newLead, setNewLead] = useState<NewLeadForm>(EMPTY_LEAD);

  const [sortBy, setSortBy] = useState<SortKey>("first");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openFilter, setOpenFilter] = useState<SortKey | null>(null);

  // filter dropdown refs
  const firstRef = useRef<HTMLDivElement | null>(null);
  const lastRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const filterRefs: Record<SortKey, React.RefObject<HTMLDivElement>> = {
    first: firstRef,
    last: lastRef,
    email: emailRef,
    phone: phoneRef,
    stage: stageRef,
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
    // filterRefs are stable refs and won't change between renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFilter]);

  // select / deselect all
  const toggleAll = () => {
    const visibleIds = filteredRows.map((r) => r.id);
    setSelected((prev) => {
      const everyVisibleSelected = visibleIds.every((id) => prev.includes(id));
      if (everyVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
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
      FILTER_COLUMNS.every((col) => {
        if (col === skipCol) return true;
        const val = (r[col] || "").toString().trim();
        const active = activeFilters[col];
        if (active.length === 0) return true;

        if (col === "phone") {
          const digits = val.replace(/\D/g, "");
          const prefix = digits.substring(0, 3);
          return active.includes(prefix);
        } else if (col === "stage") {
          if (!val) return false;
          return active.includes(val);
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
      r.phone.toLowerCase().includes(q) ||
      r.stage?.toLowerCase?.().includes(q)
    );
  });

  const filteredRows = applyFilters(searchedRows, filters).sort((a, b) => {
    const fieldA = a[sortBy]?.toLowerCase?.() ?? "";
    const fieldB = b[sortBy]?.toLowerCase?.() ?? "";
    if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const allSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selected.includes(row.id));

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
      } else if (col === "stage") {
        options.add(val);
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

  const deleteLeads = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      const confirmMessage =
        ids.length === 1
          ? "Delete this lead permanently?"
          : `Delete ${ids.length} leads permanently?`;
      if (!window.confirm(confirmMessage)) return;

      try {
        setDeleting(true);
        const res = await fetch("/api/leads/db", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `Delete failed (${res.status})`);
        }

        await loadFromDb();
      } catch (e: any) {
        console.error(e);
        alert(`Delete failed. ${e?.message ?? ""}`);
      } finally {
        setDeleting(false);
      }
    },
    [loadFromDb]
  );

  const handleDeleteSelected = () => {
    deleteLeads(selected);
  };

  const openAddLeadModal = () => {
    setShowAddLead(true);
    setNewLead(EMPTY_LEAD);
    setCreateError(null);
  };

  const closeAddLeadModal = () => {
    setShowAddLead(false);
    setCreatingLead(false);
    setNewLead(EMPTY_LEAD);
    setCreateError(null);
  };

  const handleLeadFieldChange =
    (field: keyof NewLeadForm) => (e: ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      setNewLead((prev) => ({ ...prev, [field]: value }));
    };

  const handleCreateLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      first: newLead.first.trim(),
      last: newLead.last.trim(),
      email: newLead.email.trim(),
      phone: newLead.phone.trim(),
      stage: newLead.stage.trim(),
    };

    if (!payload.first && !payload.last) {
      setCreateError("Enter at least a first or last name.");
      return;
    }

    setCreatingLead(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/leads/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: payload }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Create failed (${res.status})`);
      }

      await loadFromDb();
      closeAddLeadModal();
    } catch (e: any) {
      console.error(e);
      setCreateError(e?.message ?? "Failed to add lead.");
    } finally {
      setCreatingLead(false);
    }
  };

  return (
    <div className="">
      <div className="pb-4 border-b border-gray-800 mb-5">
        <h2 className="text-xl font-semibold text-white/90">Lead Caller</h2>
        <p className="text-sm text-gray-400">Call and manage your leads.</p>
      </div>

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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={openAddLeadModal}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add lead
          </Button>
          <ImportButton onImported={loadFromDb} />
        </div>
        <div className="flex items-center space-x-4">
          <CallButton selectedLeads={selectedLeads} />
          {selected.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete selected"}
            </Button>
          )}
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
                {TABLE_COLUMNS.map((col) => (
                  <th key={col} className="relative header-cell">
                    <div
                      className="flex items-center cursor-pointer"
                      onClick={() => toggleSort(col)}
                    >
                      {col === "first" && "First Name"}
                      {col === "last" && "Last Name"}
                      {col === "email" && "Email"}
                      {col === "phone" && "Phone"}
                      {col === "stage" && "Stage"}
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
                          <label
                            key={option}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
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
                <th className="w-12" />
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
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="data-cell">{r.first}</td>
                  <td className="data-cell">{r.last}</td>
                  <td className="data-cell">{r.email}</td>
                  <td className="data-cell">{r.phone}</td>
                  <td className="data-cell">{r.stage?.trim() || "Unassigned"}</td>
                  <td className="data-cell text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLeads([r.id]);
                      }}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && !loadingDb && (
                <tr>
                  <td colSpan={7} className="text-center data-cell">
                    No matching leads
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAddLead} onClose={closeAddLeadModal} className="max-w-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add lead
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fill in the details below to create a new lead manually.
          </p>

          <form onSubmit={handleCreateLead} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="lead-first">First name</Label>
                <Input
                  id="lead-first"
                  value={newLead.first}
                  onChange={handleLeadFieldChange("first")}
                  placeholder="Jane"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lead-last">Last name</Label>
                <Input
                  id="lead-last"
                  value={newLead.last}
                  onChange={handleLeadFieldChange("last")}
                  placeholder="Doe"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={newLead.email}
                onChange={handleLeadFieldChange("email")}
                placeholder="jane@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                type="tel"
                value={newLead.phone}
                onChange={handleLeadFieldChange("phone")}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-stage">Stage</Label>
              <Input
                id="lead-stage"
                value={newLead.stage}
                onChange={handleLeadFieldChange("stage")}
                placeholder="New Lead"
              />
            </div>

            {createError && (
              <p className="text-sm text-red-500" role="alert">
                {createError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeAddLeadModal}
                disabled={creatingLead}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingLead}>
                {creatingLead ? "Saving..." : "Save lead"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
