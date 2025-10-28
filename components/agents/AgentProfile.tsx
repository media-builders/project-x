"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { formatE164ToUS } from "@/utils/formatters";
import { useToast } from "@/components/notifications/ToastProvider"; // ✅ Import toast hook
import AgentPresetGrid from "@/components/agents/AgentPresetGrid"; // ✅ Include preset grid

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PresetData = { name?: string; title?: string };
type Preferences = { active_preset?: string; presets?: Record<string, PresetData> };
type Agent = {
  agent_id: string;
  twilio_number?: string | null;
  preferences: Preferences | null;
  created_at?: string;
};

type FormState = {
  presetName: string;
  name: string;
  title: string;
  originalName?: string;
  isNew?: boolean;
  deleteMode?: boolean;
};

export default function AgentProfile() {
  const { show } = useToast(); // ✅ Initialize toast system
  const [userId, setUserId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<Record<string, boolean>>({});
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const menuRefs = useRef<Record<string, HTMLUListElement | null>>({});

  // ── Load user session ─────────────────────
  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const { user } = await res.json();
      if (user?.id) setUserId(user.id);
    } catch (err) {
      console.error("[Auth] session error:", err);
      show({
        title: "Session Error",
        message: "Could not load Supabase session.",
        variant: "error",
      });
    }
  }, [show]);

  // ── Fetch agents ──────────────────────────
  const fetchAgents = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userId) return;
      try {
        if (!opts?.silent) setLoadingInitial(true);
        const res = await fetch(`/api/agent-settings?user_id=${userId}`);
        const data = (await res.json()) as Agent[];
        const normalized = Array.isArray(data) ? data : [];
        setAgents(normalized);

        setForms((prev) => {
          const next = { ...prev };
          for (const a of normalized) {
            const prefs = a.preferences || {};
            const presets = prefs.presets || {};
            const active = prefs.active_preset || Object.keys(presets)[0] || "";
            const activePreset = active ? presets[active] || {} : {};
            next[a.agent_id] = {
              presetName: active,
              name: activePreset.name || "",
              title: activePreset.title || "",
              originalName: active,
              isNew: false,
              deleteMode: false,
            };
          }
          return next;
        });
      } catch (err) {
        console.error("[Agents] fetch error:", err);
        show({
          title: "Fetch Error",
          message: "Unable to load agent settings.",
          variant: "error",
        });
      } finally {
        if (!opts?.silent) setLoadingInitial(false);
      }
    },
    [userId, show]
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (userId) fetchAgents();
  }, [userId, fetchAgents]);

  // ── Outside click to close dropdown ────────
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      for (const agentId in openMenu) {
        if (!openMenu[agentId]) continue;
        const menu = menuRefs.current[agentId];
        const input = nameInputRefs.current[agentId];
        if (menu && input && !menu.contains(target) && !input.contains(target)) {
          setOpenMenu((prev) => ({ ...prev, [agentId]: false }));
        }
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [openMenu]);

  // ── Save preset ───────────────────────────
  const handleSave = async (agent: Agent) => {
    const f = forms[agent.agent_id];
    if (!f) return;

    if (f.deleteMode) return handleDelete(agent);

    if (!userId || !f?.presetName.trim()) {
      show({
        title: "Missing Input",
        message: "Please enter a preset name first.",
        variant: "warning",
      });
      return;
    }

    const prefs = agent.preferences || {};
    const presets = { ...(prefs.presets || {}) };
    const payloadPreset: PresetData = { name: f.name, title: f.title };

    const oldName = f.originalName || "";
    const newName = f.presetName.trim();
    const isRename = oldName && oldName !== newName;

    if (isRename && presets[oldName]) delete presets[oldName];
    presets[newName] = payloadPreset;

    const updatedPrefs: Preferences = { active_preset: newName, presets };

    try {
      setSaving(true);
      await fetch("/api/agent-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          agentId: agent.agent_id,
          preferences: updatedPrefs,
        }),
      });
      await fetchAgents({ silent: true });
      setForms((prev) => ({
        ...prev,
        [agent.agent_id]: { ...f, originalName: newName, isNew: false, deleteMode: false },
      }));

      show({
        title: "Success",
        message: `Preset "${newName}" saved successfully.`,
        variant: "success",
      });
    } catch (err) {
      console.error("[Save] error:", err);
      show({
        title: "Save Failed",
        message: "Unable to save preset. Try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete preset ─────────────────────────
  const handleDelete = async (agent: Agent) => {
    const f = forms[agent.agent_id];
    const toDelete = f?.presetName?.trim();
    if (!toDelete) return;

    const prefs = agent.preferences || {};
    const presets = { ...(prefs.presets || {}) };
    delete presets[toDelete];

    const remaining = Object.keys(presets);
    const newActive = remaining[0] || "";
    const updatedPrefs: Preferences = { active_preset: newActive, presets };

    try {
      setSaving(true);
      await fetch("/api/agent-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          agentId: agent.agent_id,
          preferences: updatedPrefs,
        }),
      });
      await fetchAgents({ silent: true });
      setForms((prev) => ({
        ...prev,
        [agent.agent_id]: {
          presetName: newActive,
          name: presets[newActive]?.name || "",
          title: presets[newActive]?.title || "",
          originalName: newActive,
          deleteMode: false,
        },
      }));

      show({
        title: "Deleted",
        message: `Preset "${toDelete}" deleted.`,
        variant: "success",
      });
    } catch (e) {
      console.error("[Delete] error:", e);
      show({
        title: "Delete Failed",
        message: "Could not delete preset.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────
  if (loadingInitial) return <p className="text-gray-400">Loading agents…</p>;
  if (!agents.length) return <p className="text-gray-400">No agents found.</p>;

  return (
    <div className="">
      {agents.map((agent) => {
        const prefs = agent.preferences || {};
        const presets = prefs.presets || {};
        const presetNames = Object.keys(presets);
        const form = forms[agent.agent_id] || {
          presetName: "",
          name: "",
          title: "",
          deleteMode: false,
        };
        const isOpen = openMenu[agent.agent_id];

        return (
          <div key={agent.agent_id} className="agent-settings-box">
            {/* Twilio number */}
            {agent.twilio_number && (
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Twilio Number</label>
                <input
                  type="text"
                  value={formatE164ToUS(agent.twilio_number)}
                  disabled
                  className="form-input"
                />
              </div>
            )}

            {/* Preset Name Dropdown */}
            <div className="flex items-center gap-2 mb-4 relative">
              <div className="relative flex-1">
                <input
                  ref={(el) => {
                    nameInputRefs.current[agent.agent_id] = el;
                  }}
                  type="text"
                  value={form.presetName}
                  onFocus={() => setOpenMenu((o) => ({ ...o, [agent.agent_id]: true }))}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForms((prev) => ({
                      ...prev,
                      [agent.agent_id]: {
                        ...form,
                        presetName: val,
                        isNew: !presetNames.includes(val),
                        deleteMode: false,
                      },
                    }));
                    setOpenMenu((o) => ({ ...o, [agent.agent_id]: false }));
                  }}
                  placeholder="Select or type preset name…"
                  className="form-input"
                />
                {isOpen && presetNames.length > 0 && (
                  <ul
                    ref={(el) => {
                      menuRefs.current[agent.agent_id] = el;
                    }}
                    className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-gray-700 bg-gray-800 text-sm text-white shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {presetNames.map((name) => (
                      <li
                        key={name}
                        className={`form-input cursor-pointer ${
                          name === form.presetName ? "form-input" : ""
                        }`}
                        onClick={() => {
                          const p = presets[name] || {};
                          setForms((prev) => ({
                            ...prev,
                            [agent.agent_id]: {
                              presetName: name,
                              name: p.name || "",
                              title: p.title || "",
                              originalName: name,
                              deleteMode: false,
                            },
                          }));
                          setOpenMenu((o) => ({ ...o, [agent.agent_id]: false }));
                        }}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add new preset */}
              <Button
                size="sm"
                onClick={() => {
                  setForms((prev) => ({
                    ...prev,
                    [agent.agent_id]: {
                      presetName: "",
                      name: "",
                      title: "",
                      isNew: true,
                      deleteMode: false,
                    },
                  }));
                  setOpenMenu((o) => ({ ...o, [agent.agent_id]: false }));
                  setTimeout(() => nameInputRefs.current[agent.agent_id]?.focus(), 50);
                }}
                className="add-preset-button"
              >
                +
              </Button>

              {/* Delete toggle */}
              <Button
                size="sm"
                disabled={!form.presetName}
                onClick={() =>
                  setForms((prev) => ({
                    ...prev,
                    [agent.agent_id]: {
                      ...form,
                      deleteMode: !form.deleteMode,
                    },
                  }))
                }
                className={
                  form.deleteMode
                    ? "delete-preset-button-active"
                    : "delete-preset-button"
                }
              >
                {form.deleteMode ? "×" : "−"}
              </Button>
            </div>

            {/* Preset Fields */}
            <input
              type="text"
              placeholder="Agent Name"
              value={form.name}
              onChange={(e) =>
                setForms((prev) => ({
                  ...prev,
                  [agent.agent_id]: { ...form, name: e.target.value },
                }))
              }
              disabled={form.deleteMode}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Agent Title"
              value={form.title}
              onChange={(e) =>
                setForms((prev) => ({
                  ...prev,
                  [agent.agent_id]: { ...form, title: e.target.value },
                }))
              }
              disabled={form.deleteMode}
              className="form-input"
            />

            {/* Save Button */}
            <Button
              disabled={saving || !form.presetName.trim()}
              onClick={() => handleSave(agent)}
              className={`w-full ${
                form.deleteMode
                  ? "button-delete"
                  : saving
                  ? "button-save cursor-not-allowed"
                  : "button-save"
              }`}
            >
              {form.deleteMode ? "Delete?" : "Save"}
            </Button>

            {/* Preset Grid */}
            <AgentPresetGrid
              presets={presets}
              activePreset={form.presetName}
              onSelect={(presetName) => {
                const p = presets[presetName] || {};
                setForms((prev) => ({
                  ...prev,
                  [agent.agent_id]: {
                    ...form,
                    presetName,
                    name: p.name || "",
                    title: p.title || "",
                    originalName: presetName,
                    deleteMode: false,
                  },
                }));
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
