declare module "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_NUMBER = "+13655448747"; // Replace with your Twilio number

async function testElevenLabsTwilioImport() {
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/phone-numbers/import",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_sid: TWILIO_SID,
          auth_token: TWILIO_AUTH,
          phone_number: TWILIO_NUMBER,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("ElevenLabs import failed:", data);
    } else {
      console.log("ElevenLabs import successful! Response:");
      console.log(data);
    }
  } catch (err) {
    console.error("Error testing ElevenLabs Twilio import:", err);
  }
}

testElevenLabsTwilioImport();
