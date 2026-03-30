import { insertMatch, insertMatchParticipant, matchExists } from "../repositories/matchRepository";
import { Player } from "../types/player";
import { mapMatchForPlayer } from "../riot/riotMapper";
import { getMatchById, getMatchIdsByPuuid } from "../riot/riotClient";

export async function getNewMatchIdsForPlayer(player: Player): Promise<string[]> {
  const matchIds = await getMatchIdsByPuuid(player.puuid);

  return matchIds.filter((matchId) => !matchExists(matchId));
}

export async function processMatch(matchId: string, player: Player): Promise<void> {
  const match = await getMatchById(matchId);
  const mapped = mapMatchForPlayer(match, player.puuid);
  const savedMatch = insertMatch({
    match_id: match.metadata.matchId,
    queue_id: mapped.queue_id,
    game_creation: mapped.game_creation,
    game_duration: mapped.game_duration,
  });

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
    posted_to_discord: 0,
  });
}