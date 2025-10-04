import { config } from "dotenv";
config({ path: ".env.local" }); // <- point to your .env.local file

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
  environment: "https://api.elevenlabs.io",
});

async function main() {
  const agents = await client.conversationalAi.agents.list({});
  console.log("Agents:", agents);
}

main().catch(console.error);
