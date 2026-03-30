import { Client, GatewayIntentBits } from "discord.js";
import { setupInteractionHandler } from "./bot/handlers/interactionHandler";
import { registerCommands } from "./bot/registerCommands";
import { env } from "./config/env";
import { initSchema } from "./db/schema";
import { startPollMatchesJob } from "./jobs/pollMatchesJob";

initSchema();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

setupInteractionHandler(client);

client.once("clientReady", async () => {
  try {
    await registerCommands();
    startPollMatchesJob(client);
    console.log(`Logged in as ${client.user?.tag}`);
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

client.login(env.token).catch((error) => {
  console.error("Discord login failed:", error);
  process.exit(1);
});
