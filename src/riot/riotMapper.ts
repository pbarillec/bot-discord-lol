import { RiotMatchResponse } from "./riotClient";

export type MappedPlayerMatch = {
  champion_name: string;
  win: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  champ_level: number;
  queue_id: number;
  game_duration: number;
  game_creation: number;
};

export function mapMatchForPlayer(match: RiotMatchResponse, puuid: string): MappedPlayerMatch {
  const participant = match.info.participants.find((item) => item.puuid === puuid);

  if (!participant) {
    throw new Error("Participant not found for player in match.");
  }

  return {
    champion_name: participant.championName,
    win: participant.win ? 1 : 0,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
    champ_level: participant.champLevel,
    queue_id: match.info.queueId,
    game_duration: match.info.gameDuration,
    game_creation: match.info.gameCreation,
  };
}