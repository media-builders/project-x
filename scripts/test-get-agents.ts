/**
 * scripts/get-template-agent.ts
 * Fetch and print details of your ElevenLabs template agent.
 *
 * Env:
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_TEMPLATE_AGENT_ID
 *
 * Run:
 *   npx ts-node scripts/get-template-agent.ts
 */

const API_BASE = "https://api.elevenlabs.io";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const templateId = process.env.ELEVENLABS_TEMPLATE_AGENT_ID;

  if (!apiKey) {
    console.error("❌ Missing ELEVENLABS_API_KEY");
    process.exit(1);
  }
  if (!templateId) {
    console.error("❌ Missing ELEVENLABS_TEMPLATE_AGENT_ID");
    process.exit(1);
  }

  const url = `${API_BASE}/v1/convai/agents/${templateId}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`❌ Request failed: ${res.status} ${res.statusText}`);
      console.error(text);
      process.exit(1);
    }

    // Try to parse and pretty-print JSON; if not JSON, print raw.
    try {
      const json = JSON.parse(text);

      // Optional: redact sensitive-ish fields before dumping
      if (json?.webhook_secret) json.webhook_secret = "***redacted***";
      if (json?.webhook_url_verification_secret) {
        json.webhook_url_verification_secret = "***redacted***";
      }

      console.log("✅ Template agent fetched successfully.\n");
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(text);
    }
  } catch (err: any) {
    console.error("❌ Error fetching template agent:", err?.message || err);
    process.exit(1);
  }
}

main();
