"use client";

import AgentSetupButton from "@/components/setup/AgentSetupButton";
import TwilioSetupButton from "@/components/setup/TwilioSetupButton";
import ImportButton from "@/components/setup/ImportButton";

type SetupButtonsProps = {
  onImported?: () => Promise<void> | void;
};

export default function SetupButtons({ onImported }: SetupButtonsProps) {
  return (
    <div className="setup-actions flex flex-wrap gap-2">
      <ImportButton onImported={onImported} />
      <AgentSetupButton />
      <TwilioSetupButton />
    </div>
  );
}
