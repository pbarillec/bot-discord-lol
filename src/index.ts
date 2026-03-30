import { Client, GatewayIntentBits } from "discord.js";
import { setupInteractionHandler } from "./bot/handlers/interactionHandler";
import { registerCommands } from "./bot/registerCommands";
import { env } from "./config/env";
import { openDatabase } from "./db/database";

const db = openDatabase(env.databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS health_check (
    id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

setupInteractionHandler(client);

client.once("ready", async () => {
  try {
    await registerCommands();
    console.log(`Logged in as ${client.user?.tag}`);
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

client.login(env.token).catch((error) => {
  console.error("Discord login failed:", error);
  process.exit(1);
});
