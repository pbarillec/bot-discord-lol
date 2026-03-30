import { Client, GatewayIntentBits } from "discord.js";
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

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.login(env.token).catch((error) => {
  console.error("Discord login failed:", error);
  process.exit(1);
});