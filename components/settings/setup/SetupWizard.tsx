"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Lock, Phone, Database } from "lucide-react";
import AgentSetupButton from "@/components/settings/setup/AgentSetupButton";
import TwilioSetupButton from "@/components/settings/setup/TwilioSetupButton";
import ImportButton from "@/components/settings/setup/ImportButton";

export default function SetupWizard() {
  const [step, setStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [showSuccess, setShowSuccess] = useState(false);

  // mark step complete → show success → delay 3s → advance
  const markStepComplete = (index: number) => {
    console.log(`✅ Step ${index + 1} completed successfully.`);

    setCompletedSteps((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      if (index < 2) {
        console.log(`➡️ Moving to step ${index + 2}...`);
        setStep(index + 1);
      } else {
        console.log("🎉 All steps completed! Wizard finished.");
      }
    }, 3000); // 3-second success transition
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const resetWizard = () => {
    setStep(0);
    setCompletedSteps([false, false, false]);
    setShowSuccess(false);
  };

  const progressPercent = Math.round(
    ((completedSteps.filter(Boolean).length + (showSuccess ? 0 : 0)) / 3) * 100
  );

  // render wizard content or success message
  const renderStepContent = () => {
    if (showSuccess) {
      return (
        <motion.div
          key="success-screen"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center h-full text-center"
        >
          <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Step {step + 1} Complete!
          </h3>
          <p className="text-gray-400">
            Preparing next step... please wait a moment.
          </p>
        </motion.div>
      );
    }

    switch (step) {
      case 0:
        return (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold text-white/90">
              Step 1: Setup Voice Agent
            </h3>
            <p className="text-gray-400 text-sm">
              Connect and initialize your ElevenLabs voice agent.
            </p>

            <AgentSetupButton onSuccess={() => markStepComplete(0)} />

            <div className="pt-4">
              <BackButton show={step > 0} onClick={goBack} />
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold text-white/90">
              Step 2: Connect Twilio
            </h3>
            <p className="text-gray-400 text-sm">
              Verify or create a Twilio subaccount to handle voice calls.
            </p>

            <TwilioSetupButton onSuccess={() => markStepComplete(1)} />

            <div className="pt-4">
              <BackButton onClick={goBack} />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold text-white/90">
              Step 3: CRM Integration & Lead Import
            </h3>
            <p className="text-gray-400 text-sm">
              Enter your CRM API key to enable lead synchronization, then import
              your contacts.
            </p>

            <CRMKeyInput onSaved={() => console.log("CRM key saved")} />
            <ImportButton onImported={() => markStepComplete(2)} />

            <div className="pt-4">
              <BackButton onClick={goBack} />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      key="setup-wizard"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex flex-col bg-gray-900 text-white rounded-lg shadow-lg overflow-hidden"
    >
      {/* 🔹 Progress Bar */}
      <div className="h-2 w-full bg-gray-700 relative overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
          animate={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <h2 className="text-lg font-semibold text-center py-4 border-b border-gray-700">
            Setup Wizard
          </h2>

          <nav className="flex flex-col px-6 py-4 space-y-6">
            <StepIndicator
              label="Setup Agent"
              icon={<Lock className="w-5 h-5" />}
              active={step === 0 && !showSuccess}
              completed={completedSteps[0]}
            />
            <StepIndicator
              label="Connect Twilio"
              icon={<Phone className="w-5 h-5" />}
              active={step === 1 && !showSuccess}
              completed={completedSteps[1]}
            />
            <StepIndicator
              label="CRM & Import"
              icon={<Database className="w-5 h-5" />}
              active={step === 2 && !showSuccess}
              completed={completedSteps[2]}
            />
          </nav>

          {/* Footer */}
          <div className="mt-auto border-t border-gray-700 p-4">
            {completedSteps.every(Boolean) ? (
              <button
                onClick={resetWizard}
                className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-md text-sm font-medium"
              >
                ✅ Setup Complete — Restart
              </button>
            ) : (
              <div className="text-gray-400 text-xs text-center">
                Step {step + 1} of 3
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-gray-900">
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

//
// 🔹 STEP INDICATOR
//
function StepIndicator({
  label,
  icon,
  active,
  completed,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 text-sm transition cursor-pointer ${
        completed
          ? "text-green-400"
          : active
          ? "text-blue-400"
          : "text-gray-400 hover:text-gray-200"
      }`}
    >
      <div
        className={`w-8 h-8 flex items-center justify-center rounded-full border ${
          completed
            ? "bg-green-500 border-green-500"
            : active
            ? "bg-blue-600 border-blue-600"
            : "bg-gray-700 border-gray-600"
        }`}
      >
        {completed ? <CheckCircle className="w-5 h-5 text-white" /> : icon}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}

//
// 🔹 BACK BUTTON
//
function BackButton({ show = true, onClick }: { show?: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className="text-gray-400 hover:text-gray-200 text-sm underline"
    >
      ← Back
    </button>
  );
}

//
// 🔹 CRM KEY INPUT
//
function CRMKeyInput({ onSaved }: { onSaved?: () => void }) {
  const [crmKey, setCrmKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveKey = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/leads/save-crm-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmApiKey: crmKey }),
      });
      if (res.ok) {
        console.log("✅ CRM key saved successfully.");
        setSaved(true);
        setCrmKey("");
        onSaved?.();
      } else {
        console.error("❌ Failed to save CRM key.");
      }
    } catch (err) {
      console.error("⚠️ Error saving CRM key:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 max-w-md">
      <input
        type="text"
        placeholder="Enter CRM API Key"
        value={crmKey}
        onChange={(e) => setCrmKey(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm placeholder-gray-400"
      />
      <button
        disabled={!crmKey || saving}
        onClick={saveKey}
        className={`w-full py-2 rounded-md text-sm font-medium transition ${
          !crmKey || saving
            ? "bg-blue-700/40 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {saving ? "Saving..." : "Save Key"}
      </button>
      {saved && (
        <p className="text-green-400 text-sm font-medium">✅ CRM Key Saved!</p>
      )}
    </div>
  );
}
