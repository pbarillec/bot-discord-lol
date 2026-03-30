import dotenv from "dotenv";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const databasePath = process.env.DATABASE_PATH ?? "./data/bot.db";
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const matchResultsChannelId = process.env.MATCH_RESULTS_CHANNEL_ID;

if (!token) {
  throw new Error("Missing DISCORD_TOKEN in environment variables.");
}

if (!clientId) {
  throw new Error("Missing DISCORD_CLIENT_ID in environment variables.");
}

if (!guildId) {
  throw new Error("Missing DISCORD_GUILD_ID in environment variables.");
}

export const env = {
  token,
  databasePath,
  clientId,
  guildId,
  matchResultsChannelId,
};
