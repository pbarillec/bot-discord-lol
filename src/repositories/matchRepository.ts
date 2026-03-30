import { db } from "../db/database";
import { Match, MatchParticipant } from "../types/match";

type NewMatch = Omit<Match, "id" | "processed_at">;
type NewMatchParticipant = Omit<MatchParticipant, "id" | "created_at">;

export function matchExists(matchId: string): boolean {
  const row = db.prepare("SELECT 1 FROM matches WHERE match_id = ? LIMIT 1").get(matchId) as
    | { 1: number }
    | undefined;

  return Boolean(row);
}

export function insertMatch(input: NewMatch): Match {
  db.prepare(
    `
      INSERT INTO matches (
        match_id,
        queue_id,
        game_creation,
        game_duration
      ) VALUES (?, ?, ?, ?)
    `,
  ).run(input.match_id, input.queue_id, input.game_creation, input.game_duration);

  const row = db.prepare("SELECT * FROM matches WHERE match_id = ?").get(input.match_id) as
    | Match
    | undefined;

  if (!row) {
    throw new Error("Failed to insert match");
  }

  return row;
}

export function insertMatchParticipant(input: NewMatchParticipant): MatchParticipant {
  const result = db.prepare(
    `
      INSERT INTO match_participants (
        match_id,
        player_id,
        champion_name,
        win,
        kills,
        deaths,
        assists,
        cs,
        champ_level,
        queue_id,
        posted_to_discord
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    input.match_id,
    input.player_id,
    input.champion_name,
    input.win,
    input.kills,
    input.deaths,
    input.assists,
    input.cs,
    input.champ_level,
    input.queue_id,
    input.posted_to_discord,
  );

  const row = db
    .prepare("SELECT * FROM match_participants WHERE id = ?")
    .get(result.lastInsertRowid) as MatchParticipant | undefined;

  if (!row) {
    throw new Error("Failed to insert match participant");
  }

  return row;
}

export function findMatchesByPlayer(playerId: number): Match[] {
  return db
    .prepare(
      `
        SELECT m.*
        FROM matches m
        INNER JOIN match_participants mp ON mp.match_id = m.id
        WHERE mp.player_id = ?
        ORDER BY m.game_creation DESC
      `,
    )
    .all(playerId) as Match[];
}

export function findRecentMatchIdsForPlayer(playerId: number, limit = 20): string[] {
  const rows = db
    .prepare(
      `
        SELECT m.match_id
        FROM matches m
        INNER JOIN match_participants mp ON mp.match_id = m.id
        WHERE mp.player_id = ?
        ORDER BY m.game_creation DESC
        LIMIT ?
      `,
    )
    .all(playerId, limit) as Array<{ match_id: string }>;

  return rows.map((row) => row.match_id);
}