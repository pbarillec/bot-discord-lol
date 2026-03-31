export type RiotAccount = {
  gameName: string;
  tagLine: string;
  puuid: string;
};

export type RiotSummoner = {
  id: string;
  puuid: string;
};

export type RiotLeagueEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
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
const RIOT_DEFAULT_PLATFORM = "euw1";

function toPlatformRoute(region: string): string {
  switch (region.toLowerCase()) {
    case "americas":
      return "na1";
    case "asia":
      return "kr";
    case "europe":
      return "euw1";
    default:
      return RIOT_DEFAULT_PLATFORM;
  }
}

function getPlatformCandidates(region: string): string[] {
  const normalizedRegion = region.toLowerCase();

  if (normalizedRegion === "europe") {
    return ["euw1", "eun1", "tr1", "ru"];
  }

  if (normalizedRegion === "americas") {
    return ["na1", "br1", "la1", "la2"];
  }

  if (normalizedRegion === "asia") {
    return ["kr", "jp1"];
  }

  return [toPlatformRoute(region)];
}

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

async function riotGetOnPlatform<T>(platformRoute: string, path: string): Promise<T> {
  const apiKey = getRiotApiKey();
  const response = await fetch(`https://${platformRoute}.api.riotgames.com${path}`, {
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

export async function getRankedEntriesByPuuid(
  puuid: string,
  playerRegion = "europe",
): Promise<RiotLeagueEntry[]> {
  const pathPuuid = encodeURIComponent(puuid);
  const platformCandidates = getPlatformCandidates(playerRegion);
  let lastError: RiotClientError | null = null;

  for (const platformRoute of platformCandidates) {
    try {
      const summoner = await riotGetOnPlatform<RiotSummoner>(
        platformRoute,
        `/lol/summoner/v4/summoners/by-puuid/${pathPuuid}`,
      );
      const pathSummonerId = encodeURIComponent(summoner.id);
      return await riotGetOnPlatform<RiotLeagueEntry[]>(
        platformRoute,
        `/lol/league/v4/entries/by-summoner/${pathSummonerId}`,
      );
    } catch (error) {
      if (error instanceof RiotClientError && error.code === "NOT_FOUND") {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new RiotClientError("NOT_FOUND", "Riot summoner not found on known platform routes.");
}
