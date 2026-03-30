import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.resolve("data");
const databasePath = path.join(dataDirectory, "app.db");

fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
