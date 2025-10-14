"use client";

import AgentSetupButton from "@/components/settings/setup/AgentSetupButton";
import TwilioSetupButton from "@/components/settings/setup/TwilioSetupButton";
import ImportButton from "@/components/settings/setup/ImportButton";

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
