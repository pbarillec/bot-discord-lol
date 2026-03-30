import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export function openDatabase(databasePath: string) {
  const absolutePath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const db = new Database(absolutePath);
  db.pragma("journal_mode = WAL");

  return db;
}