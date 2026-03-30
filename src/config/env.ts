import dotenv from "dotenv";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const databasePath = process.env.DATABASE_PATH ?? "./data/bot.db";

if (!token) {
  throw new Error("Missing DISCORD_TOKEN in environment variables.");
}

export const env = {
  token,
  databasePath,
};