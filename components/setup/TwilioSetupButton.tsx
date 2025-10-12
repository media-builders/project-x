"use client";

import React from "react";

export default function TwilioSetupButton() {
  const twilioSetup = async () => {
    try {
      console.log("Checking or creating Twilio subaccount...");
      const res = await fetch("/api/twilio_subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Twilio setup failed (status ${res.status})`);
        return;
      }

      const data = await res.json();
      alert("Your Twilio has been successfully setup.");
      console.log("Twilio subaccount ready:", data.subAccountSid);
    } catch (err) {
      console.error(err);
      alert("Failed to setup Twilio");
    }
  };

  return (
    <button type="button" className="btn btn-primary" onClick={twilioSetup}>
      Phone Setup
    </button>
  );
}
