"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import templatesData from "@/components/dialer/templates";

// === Type Definitions ===
type Template = {
  name: string;
  title?: string;
  prompt: string;
  voice?: "male" | "female";
  parameters?: Record<string, number>;
};

type TemplatesMap = typeof templatesData;
type TemplateType = keyof TemplatesMap;

type Parameter = { key: string; label: string; value: number };

type CustomSection = {
  id: number;
  name: string;
  values: string[];
};

type Agent = {
  id: number;
  name: string;
  title: string;
  voice: "male" | "female";
  prompt: string;
  type: TemplateType;
  template: string;
  parameters: Parameter[];
  customSections: CustomSection[];
};

// === Parameter Catalog ===
const AVAILABLE_PARAMETERS: { key: string; label: string }[] = [
  { key: "creativity", label: "Creativity" },
  { key: "focus", label: "Focus / Precision" },
  { key: "response_length", label: "Response Length" },
  { key: "formality", label: "Formality" },
  { key: "empathy", label: "Empathy" },
  { key: "verbosity", label: "Verbosity" },
  { key: "clarity", label: "Clarity" },
  { key: "assertiveness", label: "Assertiveness" },
  { key: "humor", label: "Humor" },
  { key: "politeness", label: "Politeness" },
];

// === Mock Agents ===
const mockAgents: Agent[] = [
  {
    id: 1,
    name: "Alex Johnson",
    title: "Sales Specialist",
    voice: "male",
    prompt: "Default prompt...",
    type: "realestate",
    template: "",
    parameters: [],
    customSections: [],
  },
  {
    id: 2,
    name: "Samantha Lee",
    title: "Appointment Coordinator",
    voice: "female",
    prompt: "Clinic prompt...",
    type: "clinic",
    template: "",
    parameters: [],
    customSections: [],
  },
];

export default function DialerSettings() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(
    mockAgents[0]?.id ?? null
  );
  const [selectedParam, setSelectedParam] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [lastFocusedId, setLastFocusedId] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeAgent: Agent | null = useMemo(() => {
    if (!agents.length) return null;
    const found = agents.find((a) => a.id === selectedAgentId);
    return found ?? agents[0];
  }, [agents, selectedAgentId]);

  // Focus logic for agent name input
  useEffect(() => {
    if (activeAgent && activeAgent.id !== lastFocusedId && nameInputRef.current) {
      nameInputRef.current.focus();
      setLastFocusedId(activeAgent.id);
    }
  }, [activeAgent, lastFocusedId]);

  // === Core Handlers ===
  const updateAgentSettings = (updates: Partial<Agent>) => {
    if (!activeAgent) return;
    setAgents((prev) =>
      prev.map((a) => (a.id === activeAgent.id ? { ...a, ...updates } : a))
    );
  };

  const handleSave = () => {
    if (!activeAgent) return;
    console.log("Saving agent:", activeAgent);
  };

  // === Add / Remove Agents ===
  const handleAddAgent = () => {
    const newAgent: Agent = {
      id: Date.now(),
      name: "",
      title: "Untitled",
      voice: "male",
      prompt: "",
      type: "realestate",
      template: "",
      parameters: [],
      customSections: [],
    };
    setAgents((prev) => [...prev, newAgent]);
    setSelectedAgentId(newAgent.id);
  };

  const handleRemoveAgent = (id: number) => {
    setAgents((prev) => prev.filter((agent) => agent.id !== id));
    if (selectedAgentId === id) {
      setSelectedAgentId(agents[0]?.id ?? null);
    }
  };

  // === Template Logic ===
  const availableTemplates =
    activeAgent?.type && templatesData[activeAgent.type as TemplateType]
      ? templatesData[activeAgent.type as TemplateType]
      : [];

  const handleTemplateSelect = (value: string) => {
    if (!activeAgent) return;
    const chosen = availableTemplates.find((t: any) => t.name === value);
    if (!chosen) return;

    const newParams: Parameter[] = Object.entries(chosen.parameters || {}).map(
      ([key, val]) => ({
        key,
        label:
          AVAILABLE_PARAMETERS.find((p) => p.key === key)?.label ||
          key.replace(/_/g, " "),
        value: Number(val),
      })
    );

    const newCustomSections: CustomSection[] = Object.entries(
      chosen.customSections || {}
    ).map(([sectionName, values]) => ({
      id: Date.now() + Math.random(),
      name: sectionName,
      values: Array.isArray(values) ? values : [],
    }));

    updateAgentSettings({
      name: chosen.name, 
      template: chosen.name,
      title: chosen.title || activeAgent.title,
      prompt: chosen.prompt,
      voice: (chosen.voice as "male" | "female") || activeAgent.voice,
      parameters: newParams,
      customSections: newCustomSections,
    });
  };

  // === Parameter Controls ===
  const handleAddParameter = () => {
    if (!activeAgent || !selectedParam) return;
    if (activeAgent.parameters.some((p) => p.key === selectedParam)) return;
    const paramDef = AVAILABLE_PARAMETERS.find((p) => p.key === selectedParam);
    if (!paramDef) return;
    const newParam: Parameter = { key: paramDef.key, label: paramDef.label, value: 0.5 };
    updateAgentSettings({ parameters: [...activeAgent.parameters, newParam] });
    setSelectedParam("");
  };

  const handleRemoveParameter = (key: string) => {
    if (!activeAgent) return;
    updateAgentSettings({
      parameters: activeAgent.parameters.filter((p) => p.key !== key),
    });
  };

  const handleSliderChange = (key: string, newValue: number) => {
    if (!activeAgent) return;
    updateAgentSettings({
      parameters: activeAgent.parameters.map((p) =>
        p.key === key ? { ...p, value: newValue } : p
      ),
    });
  };

  // === Custom Sections ===
  const addSection = () => {
    if (!activeAgent) return;
    const newSection: CustomSection = {
      id: Date.now(),
      name: "new_section",
      values: [""],
    };
    updateAgentSettings({
      customSections: [...activeAgent.customSections, newSection],
    });
  };

  const removeSection = (id: number) => {
    if (!activeAgent) return;
    updateAgentSettings({
      customSections: activeAgent.customSections.filter((s) => s.id !== id),
    });
  };

  const updateSectionName = (id: number, name: string) => {
    if (!activeAgent) return;
    updateAgentSettings({
      customSections: activeAgent.customSections.map((s) =>
        s.id === id ? { ...s, name } : s
      ),
    });
  };

  const addValue = (sectionId: number) => {
    if (!activeAgent) return;
    updateAgentSettings({
      customSections: activeAgent.customSections.map((s) =>
        s.id === sectionId ? { ...s, values: [...s.values, ""] } : s
      ),
    });
  };

  const removeValue = (sectionId: number, index: number) => {
    if (!activeAgent) return;
    updateAgentSettings({
      customSections: activeAgent.customSections.map((s) =>
        s.id === sectionId
          ? { ...s, values: s.values.filter((_, i) => i !== index) }
          : s
      ),
    });
  };

  const updateValue = (sectionId: number, index: number, value: string) => {
    if (!activeAgent) return;
    updateAgentSettings({
      customSections: activeAgent.customSections.map((s) =>
        s.id === sectionId
          ? { ...s, values: s.values.map((v, i) => (i === index ? value : v)) }
          : s
      ),
    });
  };

  // === Export Logic ===
  const handleExport = () => {
    if (!activeAgent) return;

    const parametersObj: Record<string, number> = {};
    activeAgent.parameters.forEach((p) => (parametersObj[p.key] = p.value));

    const customSectionsObj: Record<string, string[]> = {};
    activeAgent.customSections.forEach((s) => (customSectionsObj[s.name] = s.values));

    const exportData = {
      templates: [
        {
        name: activeAgent.name,
        title: activeAgent.title,
        prompt: activeAgent.prompt,
        voice: activeAgent.voice,
        parameters: parametersObj,
        customSections: customSectionsObj,
        },
      ],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeAgent.name.replace(/\s+/g, "_")}_template.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // === UI ===
  return (
    <div className="text-white space-y-6">
      {/* === Header (Match Integrations Layout) === */}
      <div>
        <h2 className="text-3xl font-bold inline-block mr-4">Agents</h2>
        <span className="text-gray-400 text-lg">
          Manage voice agents and their behaviors.
        </span>
        <hr className="border-gray-800 mt-3" />
      </div>

      {/* === Agent Gallery Grid === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => setSelectedAgentId(agent.id)}
            className={`relative cursor-pointer rounded-xl border transition-all p-5 ${
              activeAgent?.id === agent.id
                ? "border-blue-600 bg-blue-950/30 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                : "border-gray-800 bg-gray-900 hover:border-blue-700 hover:bg-gray-800/80"
            }`}
          >
            {/* ❌ Remove Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveAgent(agent.id);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
                {agent.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-lg text-white">{agent.name}</div>
                <div className="text-gray-400 text-sm italic">{agent.title}</div>
              </div>
            </div>

            <div className="text-xs text-blue-400 capitalize bg-blue-900/40 px-3 py-1 rounded-full w-fit">
              {agent.type}
            </div>
          </div>
        ))}

        {/* ➕ Add Agent Button */}
        <button
          onClick={handleAddAgent}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900 p-8 text-gray-400 hover:text-blue-400 hover:border-blue-500 transition-all"
        >
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-medium">Add Agent</span>
        </button>
      </div>

      {/* === Selected Agent Settings Below === */}
      {activeAgent && (
        <div className="mt-8 border border-gray-700 bg-gray-900/70 rounded-xl p-6 space-y-6">
          <h3 className="text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2">
            Settings for {activeAgent.name}
          </h3>

          {/* === General Settings === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Name</label>
              <input
                type="text"
                ref={nameInputRef}
                value={activeAgent.name}
                onChange={(e) => updateAgentSettings({ name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">Title</label>
              <input
                type="text"
                value={activeAgent.title}
                onChange={(e) => updateAgentSettings({ title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">Type</label>
              <select
                value={activeAgent.type}
                onChange={(e) =>
                  updateAgentSettings({
                    type: e.target.value as any,
                    template: "",
                    parameters: [],
                  })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              >
                {Object.keys(templatesData).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300">Template</label>
              <select
                value={activeAgent.template}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Template</option>
                {availableTemplates.map((t: any) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* === Prompt === */}
          <div>
            <label className="text-sm text-gray-300">Prompt</label>
            <textarea
              value={activeAgent.prompt}
              onChange={(e) => updateAgentSettings({ prompt: e.target.value })}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* === Voice Selection === */}
          <div className="flex gap-4">
            <Button
              onClick={() => updateAgentSettings({ voice: "male" })}
              className={`flex-1 py-2 rounded-md border ${
                activeAgent.voice === "male"
                  ? "bg-blue-600 border-blue-600"
                  : "bg-gray-700 border-gray-600"
              }`}
            >
              Male
            </Button>
            <Button
              onClick={() => updateAgentSettings({ voice: "female" })}
              className={`flex-1 py-2 rounded-md border ${
                activeAgent.voice === "female"
                  ? "bg-blue-600 border-blue-600"
                  : "bg-gray-700 border-gray-600"
              }`}
            >
              Female
            </Button>
          </div>

          {/* === Advanced Section === */}
          <section className="pt-2 border-t border-gray-700">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex justify-between items-center bg-gray-900 border border-gray-700 rounded-md px-4 py-3 text-left hover:bg-gray-800 transition"
            >
              <span className="font-semibold text-blue-400">Advanced Settings</span>
              <span className="text-gray-400 text-sm">
                {showAdvanced ? "▲" : "▼"}
              </span>
            </button>

            <div
              className={`transition-all duration-300 overflow-hidden ${
                showAdvanced
                  ? "max-h-[1600px] opacity-100 mt-4"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-4 bg-gradient-to-b from-gray-900/60 to-gray-800 rounded-lg border border-gray-700 space-y-6">
                {/* === Parameters === */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-blue-400 border-b border-gray-700 pb-1">
                    Personality Parameters
                  </h5>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedParam}
                      onChange={(e) => setSelectedParam(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Add new parameter...</option>
                      {AVAILABLE_PARAMETERS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleAddParameter}>Add</Button>
                  </div>

                  {activeAgent.parameters.map((p) => (
                    <div
                      key={p.key}
                      className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-md p-3"
                    >
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400">
                          {p.label}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={p.value}
                          onChange={(e) =>
                            handleSliderChange(p.key, parseFloat(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveParameter(p.key)}
                        className="text-gray-400 hover:text-red-400 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* === Custom Sections === */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-blue-400 border-b border-gray-700 pb-1">
                    Custom Sections
                  </h5>
                  {activeAgent.customSections.map((section) => (
                    <div
                      key={section.id}
                      className="bg-gray-900 border border-gray-700 rounded-md p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) =>
                            updateSectionName(section.id, e.target.value)
                          }
                          className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-sm flex-1 mr-2"
                        />
                        <button
                          onClick={() => removeSection(section.id)}
                          className="text-gray-400 hover:text-red-400 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {section.values.map((value, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              updateValue(section.id, index, e.target.value)
                            }
                            placeholder="Value"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => removeValue(section.id, index)}
                            className="text-gray-400 hover:text-red-400 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <Button
                        onClick={() => addValue(section.id)}
                        className="mt-1 bg-blue-700 hover:bg-blue-800 text-sm px-3 py-1 rounded-md"
                      >
                        + Add Value
                      </Button>
                    </div>
                  ))}

                  <Button
                    onClick={addSection}
                    className="bg-blue-700 hover:bg-blue-800 text-sm px-3 py-1 rounded-md"
                  >
                    + Add Section
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* === Save & Export Buttons === */}
          <div className="flex justify-end gap-4 border-t border-gray-700 pt-4">
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Agent
            </Button>
            <Button
              onClick={handleExport}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold"
            >
              Export Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

