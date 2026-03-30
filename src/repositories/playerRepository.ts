import { db } from "../db/database";
import { Player } from "../types/player";

type NewPlayer = Omit<Player, "id" | "created_at">;
type UpdatePlayerInput = Pick<
  Player,
  "discord_username" | "riot_game_name" | "riot_tag_line" | "puuid" | "region"
>;

export function createPlayer(input: NewPlayer): Player {
  db.prepare(
    `
      INSERT INTO players (
        discord_user_id,
        discord_username,
        riot_game_name,
        riot_tag_line,
        puuid,
        region
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(
    input.discord_user_id,
    input.discord_username,
    input.riot_game_name,
    input.riot_tag_line,
    input.puuid,
    input.region,
  );

  const player = findByDiscordUserId(input.discord_user_id);

  if (!player) {
    throw new Error("Failed to create player");
  }

  return player;
}

export function updatePlayer(
  discordUserId: string,
  input: UpdatePlayerInput,
): Player | null {
  const result = db.prepare(
    `
      UPDATE players
      SET
        discord_username = ?,
        riot_game_name = ?,
        riot_tag_line = ?,
        puuid = ?,
        region = ?
      WHERE discord_user_id = ?
    `,
  ).run(
    input.discord_username,
    input.riot_game_name,
    input.riot_tag_line,
    input.puuid,
    input.region,
    discordUserId,
  );

  if (result.changes === 0) {
    return null;
  }

  return findByDiscordUserId(discordUserId);
}

export function findByDiscordUserId(discordUserId: string): Player | null {
  const row = db.prepare("SELECT * FROM players WHERE discord_user_id = ?").get(discordUserId) as
    | Player
    | undefined;

  return row ?? null;
}

export function deleteByDiscordUserId(discordUserId: string): boolean {
  const result = db.prepare("DELETE FROM players WHERE discord_user_id = ?").run(discordUserId);
  return result.changes > 0;
}

export function findAllPlayers(): Player[] {
  return db.prepare("SELECT * FROM players ORDER BY id ASC").all() as Player[];
}