export type RiotAccount = {
  gameName: string;
  tagLine: string;
  puuid: string;
};

export type RiotMatchResponse = {
  metadata: {
    matchId: string;
  };
  info: {
    queueId: number;
    gameDuration: number;
    gameCreation: number;
    participants: Array<{
      puuid: string;
      championName: string;
      win: boolean;
      kills: number;
      deaths: number;
      assists: number;
      totalMinionsKilled: number;
      neutralMinionsKilled: number;
      champLevel: number;
    }>;
  };
};

type RiotClientErrorCode = "CONFIG_ERROR" | "NOT_FOUND" | "API_ERROR";

export class RiotClientError extends Error {
  public readonly code: RiotClientErrorCode;

  constructor(code: RiotClientErrorCode, message: string) {
    super(message);
    this.name = "RiotClientError";
    this.code = code;
  }
}

const RIOT_API_BASE_URL = "https://europe.api.riotgames.com";

function getRiotApiKey(): string {
  const apiKey = process.env.RIOT_API_KEY;

  if (!apiKey) {
    throw new RiotClientError("CONFIG_ERROR", "Missing RIOT_API_KEY in environment variables.");
  }

  return apiKey;
}

async function riotGet<T>(path: string): Promise<T> {
  const apiKey = getRiotApiKey();
  const response = await fetch(`${RIOT_API_BASE_URL}${path}`, {
    headers: {
      "X-Riot-Token": apiKey,
    },
  });

  if (response.status === 404) {
    throw new RiotClientError("NOT_FOUND", "Riot resource not found.");
  }

  if (!response.ok) {
    throw new RiotClientError("API_ERROR", `Riot API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
): Promise<RiotAccount> {
  const pathGameName = encodeURIComponent(gameName);
  const pathTagLine = encodeURIComponent(tagLine);
  return riotGet<RiotAccount>(
    `/riot/account/v1/accounts/by-riot-id/${pathGameName}/${pathTagLine}`,
  );
}

export async function getMatchIdsByPuuid(puuid: string): Promise<string[]> {
  const pathPuuid = encodeURIComponent(puuid);
  return riotGet<string[]>(`/lol/match/v5/matches/by-puuid/${pathPuuid}/ids`);
}

export async function getMatchById(matchId: string): Promise<RiotMatchResponse> {
  const pathMatchId = encodeURIComponent(matchId);
  return riotGet<RiotMatchResponse>(`/lol/match/v5/matches/${pathMatchId}`);
}
