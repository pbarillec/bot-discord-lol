import { db } from "../db/database";
import { Match, MatchParticipant } from "../types/match";

type NewMatch = Omit<Match, "id" | "processed_at">;
type NewMatchParticipant = Omit<MatchParticipant, "id" | "created_at">;
export type PendingMatchSummary = {
  participant_id: number;
  match_id: string;
  champion_name: string;
  win: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  champ_level: number;
  queue_id: number | null;
  game_duration: number | null;
  game_creation: number | null;
};

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

export function findUnpostedMatchSummariesByPlayer(playerId: number): PendingMatchSummary[] {
  return db
    .prepare(
      `
        SELECT
          mp.id AS participant_id,
          m.match_id,
          mp.champion_name,
          mp.win,
          mp.kills,
          mp.deaths,
          mp.assists,
          mp.cs,
          mp.champ_level,
          mp.queue_id,
          m.game_duration,
          m.game_creation
        FROM match_participants mp
        INNER JOIN matches m ON m.id = mp.match_id
        WHERE mp.player_id = ? AND mp.posted_to_discord = 0
        ORDER BY m.game_creation ASC
      `,
    )
    .all(playerId) as PendingMatchSummary[];
}

export function markMatchParticipantAsPosted(participantId: number): void {
  db.prepare("UPDATE match_participants SET posted_to_discord = 1 WHERE id = ?").run(participantId);
}

export function markOlderUnpostedMatchesAsPosted(playerId: number): void {
  db.prepare(
    `
      UPDATE match_participants
      SET posted_to_discord = 1
      WHERE id IN (
        SELECT mp.id
        FROM match_participants mp
        INNER JOIN matches m ON m.id = mp.match_id
        WHERE mp.player_id = ? AND mp.posted_to_discord = 0
        ORDER BY m.game_creation DESC, mp.id DESC
        LIMIT -1 OFFSET 1
      )
    `,
  ).run(playerId);
}
