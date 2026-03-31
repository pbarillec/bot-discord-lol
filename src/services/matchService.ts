import {
  deleteMatchParticipantsByPlayer,
  deleteOrphanMatches,
  insertMatch,
  insertMatchParticipant,
  matchExists,
  matchParticipantExists,
} from "../repositories/matchRepository";
import { Player } from "../types/player";
import { mapMatchForPlayer } from "../riot/riotMapper";
import { getMatchById, getMatchIdsByPuuid } from "../riot/riotClient";

const RANKED_QUEUE_IDS = new Set([420, 440]);

export type PlayerResyncResult = {
  deletedParticipants: number;
  deletedOrphanMatches: number;
  importedRankedMatches: number;
  failedMatches: number;
};

export async function getNewMatchIdsForPlayer(player: Player): Promise<string[]> {
  const matchIds = await getMatchIdsByPuuid(player.puuid);

  return matchIds.filter((matchId) => !matchExists(matchId));
}

export async function processMatch(
  matchId: string,
  player: Player,
  options?: { postedToDiscord?: 0 | 1 },
): Promise<boolean> {
  const match = await getMatchById(matchId);
  const mapped = mapMatchForPlayer(match, player.puuid);
  const savedMatch = insertMatch({
    match_id: match.metadata.matchId,
    queue_id: mapped.queue_id,
    game_creation: mapped.game_creation,
    game_duration: mapped.game_duration,
  });

  if (matchParticipantExists(savedMatch.id, player.id)) {
    return false;
  }

  insertMatchParticipant({
    match_id: savedMatch.id,
    player_id: player.id,
    champion_name: mapped.champion_name,
    win: mapped.win,
    kills: mapped.kills,
    deaths: mapped.deaths,
    assists: mapped.assists,
    cs: mapped.cs,
    champ_level: mapped.champ_level,
    queue_id: mapped.queue_id,
    posted_to_discord: options?.postedToDiscord ?? 0,
  });

  return true;
}

export async function resyncRankedHistoryForPlayer(
  player: Player,
  maxMatches = 100,
): Promise<PlayerResyncResult> {
  const deletedParticipants = deleteMatchParticipantsByPlayer(player.id);
  const deletedOrphanMatches = deleteOrphanMatches();
  const matchIds = await getMatchIdsByPuuid(player.puuid, maxMatches);
  let importedRankedMatches = 0;
  let failedMatches = 0;

  for (const matchId of matchIds) {
    try {
      const match = await getMatchById(matchId);

      if (!RANKED_QUEUE_IDS.has(match.info.queueId)) {
        continue;
      }

      const mapped = mapMatchForPlayer(match, player.puuid);
      const savedMatch = insertMatch({
        match_id: match.metadata.matchId,
        queue_id: mapped.queue_id,
        game_creation: mapped.game_creation,
        game_duration: mapped.game_duration,
      });

      if (matchParticipantExists(savedMatch.id, player.id)) {
        continue;
      }

      insertMatchParticipant({
        match_id: savedMatch.id,
        player_id: player.id,
        champion_name: mapped.champion_name,
        win: mapped.win,
        kills: mapped.kills,
        deaths: mapped.deaths,
        assists: mapped.assists,
        cs: mapped.cs,
        champ_level: mapped.champ_level,
        queue_id: mapped.queue_id,
        posted_to_discord: 1,
      });

      importedRankedMatches += 1;
    } catch (error) {
      failedMatches += 1;
      console.error(`[resync] Failed to import match ${matchId} for ${player.discord_username}:`, error);
    }
  }

  return {
    deletedParticipants,
    deletedOrphanMatches,
    importedRankedMatches,
    failedMatches,
  };
}
