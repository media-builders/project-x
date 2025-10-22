"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type ImportButtonProps = {
  onImported?: () => Promise<void> | void;
};

const ALL_STAGE_VALUE = "__all__";

const getStageLabel = (value: string) =>
  value === ALL_STAGE_VALUE ? "All stages" : value;

export default function ImportButton({ onImported }: ImportButtonProps) {
  const [importing, setImporting] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [stageOptions, setStageOptions] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(ALL_STAGE_VALUE);
  const [stageError, setStageError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStages = async () => {
      try {
        setLoadingStages(true);
        setStageError(null);

        const res = await fetch("/api/leads/stages", { method: "GET" });
        const data: { stages?: string[]; error?: string } = await res
          .json()
          .catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Unable to load stages");
        }

        if (mounted) {
          const nextOptions = Array.isArray(data.stages) ? data.stages : [];
          setStageOptions(nextOptions);
          setSelectedStage((prev) => {
            if (prev === ALL_STAGE_VALUE) return prev;
            return nextOptions.includes(prev) ? prev : ALL_STAGE_VALUE;
          });
        }
      } catch (e: any) {
        console.error(e);
        if (mounted) {
          setStageError(e?.message ?? "Unable to load stages");
          setStageOptions([]);
        }
      } finally {
        if (mounted) {
          setLoadingStages(false);
        }
      }
    };

    fetchStages();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!menuOpen) return;
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, [menuOpen]);

  const handleImport = async () => {
    try {
      setMenuOpen(false);
      setImporting(true);
      const payload =
        selectedStage === ALL_STAGE_VALUE
          ? {}
          : {
              stage: selectedStage,
            };
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        if (onImported) await onImported();
      }
    } catch (e: any) {
      console.error(e);
      alert(`Import failed. ${e.message ?? ""}`);
    } finally {
      setImporting(false);
    }
  };

  const handleStageSelect = (value: string) => {
    setSelectedStage(value);
    setMenuOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div
          ref={containerRef}
          className="relative inline-flex rounded-md shadow-sm"
        >
          <button
            type="button"
            className="btn btn-ghost rounded-r-none"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? "Importing..." : "Import"}
          </button>
          <button
            type="button"
            className="btn btn-ghost rounded-l-none border-l border-gray-700 px-2"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-gray-700 bg-gray-900 shadow-lg">
              <div className="py-1">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
                    selectedStage === ALL_STAGE_VALUE
                      ? "bg-blue-600/20 text-white"
                      : "text-gray-200 hover:bg-gray-800"
                  }`}
                  onClick={() => handleStageSelect(ALL_STAGE_VALUE)}
                >
                  <span>All stages</span>
                  {selectedStage === ALL_STAGE_VALUE && (
                    <span className="text-xs uppercase text-blue-300">Selected</span>
                  )}
                </button>
                {loadingStages && (
                  <div className="px-3 py-2 text-sm text-gray-300">Loading...</div>
                )}
                {!loadingStages && stageOptions.length === 0 && !stageError && (
                  <div className="px-3 py-2 text-sm text-gray-300">
                    No stages found
                  </div>
                )}
                {stageError && (
                  <div className="px-3 py-2 text-sm text-red-400">
                    {stageError}
                  </div>
                )}
                {!loadingStages &&
                  stageOptions.map((stage) => {
                    const selected = selectedStage === stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
                          selected
                            ? "bg-blue-600/20 text-white"
                            : "text-gray-200 hover:bg-gray-800"
                        }`}
                        onClick={() => handleStageSelect(stage)}
                      >
                        <span>{stage}</span>
                        {selected && (
                          <span className="text-xs uppercase text-blue-300">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-400">
        Filter: {getStageLabel(selectedStage)}
      </div>
      {stageError && <p className="text-xs text-red-400">{stageError}</p>}
    </div>
  );
}
