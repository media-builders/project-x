"use client";

import React from "react";

type TwilioSetupButtonProps = {
  onSuccess?: () => void; // optional callback for wizard flow
};

export default function TwilioSetupButton({ onSuccess }: TwilioSetupButtonProps) {
  const twilioSetup = async () => {
    try {
      console.log("🔄 Checking or creating Twilio subaccount...");
      const res = await fetch("/api/twilio_subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const textResponse = await res.text(); // flexible response

      let data: any = {};
      try {
        data = JSON.parse(textResponse);
      } catch {
        data = { message: textResponse };
      }

      if (!res.ok) {
        const errMessage =
          data?.error || `Twilio setup failed (status ${res.status})`;
        console.error("❌ Twilio Setup Error:", errMessage);
        return;
      }

      const successMsg = data?.message || textResponse || "";
      const isSuccess =
        successMsg.toLowerCase().includes("successfully setup") ||
        successMsg.toLowerCase().includes("account already exists") ||
        !!data?.subAccountSid;

      if (isSuccess) {
        console.log("✅ Twilio setup successful:", data.subAccountSid || "existing account");
        if (onSuccess) onSuccess(); // advance wizard
      } else {
        console.warn("⚠️ Unexpected Twilio setup response:", successMsg);
      }
    } catch (err) {
      console.error("🚨 Failed to setup Twilio:", err);
    }
  };

  return (
    <button type="button" className="btn btn-primary" onClick={twilioSetup}>
      Phone Setup
    </button>
  );
}
