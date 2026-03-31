export type RiotAccount = {
  gameName: string;
  tagLine: string;
  puuid: string;
};

export type RiotSummoner = {
  id?: string;
  puuid?: string;
  accountId?: string;
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
      teamId: number;
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
  public readonly status?: number;
  public readonly requestUrl?: string;
  public readonly responseBody?: string;

  constructor(
    code: RiotClientErrorCode,
    message: string,
    options?: { status?: number; requestUrl?: string; responseBody?: string },
  ) {
    super(message);
    this.name = "RiotClientError";
    this.code = code;
    this.status = options?.status;
    this.requestUrl = options?.requestUrl;
    this.responseBody = options?.responseBody;
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

function platformFromTagLine(tagLine?: string): string | null {
  if (!tagLine) {
    return null;
  }

  switch (tagLine.trim().toUpperCase()) {
    case "EUW":
      return "euw1";
    case "EUNE":
      return "eun1";
    case "NA":
      return "na1";
    case "KR":
      return "kr";
    case "JP":
      return "jp1";
    case "BR":
      return "br1";
    case "LAN":
      return "la1";
    case "LAS":
      return "la2";
    case "TR":
      return "tr1";
    case "RU":
      return "ru";
    case "OCE":
      return "oc1";
    default:
      return null;
  }
}

function getRiotApiKey(): string {
  const apiKey = process.env.RIOT_API_KEY;

  if (!apiKey) {
    throw new RiotClientError("CONFIG_ERROR", "Missing RIOT_API_KEY in environment variables.");
  }

  return apiKey;
}

function logRiotRequestFailure(requestUrl: string, status: number, responseBody: string): void {
  const bodyPreview = responseBody.length > 300 ? `${responseBody.slice(0, 300)}...` : responseBody;
  console.error(`[riot] request failed: ${requestUrl} -> ${status} | body: ${bodyPreview || "<empty>"}`);
}

async function riotGet<T>(path: string): Promise<T> {
  const apiKey = getRiotApiKey();
  const requestUrl = `${RIOT_API_BASE_URL}${path}`;
  const response = await fetch(requestUrl, {
    headers: {
      "X-Riot-Token": apiKey,
    },
  });

  if (response.status === 404) {
    throw new RiotClientError("NOT_FOUND", "Riot resource not found.", {
      status: response.status,
      requestUrl,
    });
  }

  if (!response.ok) {
    const responseBody = await response.text();
    logRiotRequestFailure(requestUrl, response.status, responseBody);
    throw new RiotClientError(`API_ERROR`, `Riot API request failed with status ${response.status}.`, {
      status: response.status,
      requestUrl,
      responseBody,
    });
  }

  return (await response.json()) as T;
}

async function riotGetOnPlatform<T>(platformRoute: string, path: string): Promise<T> {
  const apiKey = getRiotApiKey();
  const requestUrl = `https://${platformRoute}.api.riotgames.com${path}`;
  const response = await fetch(requestUrl, {
    headers: {
      "X-Riot-Token": apiKey,
    },
  });

  if (response.status === 404) {
    throw new RiotClientError("NOT_FOUND", "Riot resource not found.", {
      status: response.status,
      requestUrl,
    });
  }

  if (!response.ok) {
    const responseBody = await response.text();
    logRiotRequestFailure(requestUrl, response.status, responseBody);
    throw new RiotClientError(`API_ERROR`, `Riot API request failed with status ${response.status}.`, {
      status: response.status,
      requestUrl,
      responseBody,
    });
  }

  return (await response.json()) as T;
}

async function getSummonerByPuuidOnPlatform(
  platformRoute: string,
  encodedPuuid: string,
): Promise<RiotSummoner> {
  const apiKey = getRiotApiKey();
  const path = `/lol/summoner/v4/summoners/by-puuid/${encodedPuuid}`;
  const requestUrl = `https://${platformRoute}.api.riotgames.com${path}`;
  const response = await fetch(requestUrl, {
    headers: {
      "X-Riot-Token": apiKey,
    },
  });
  const responseBody = await response.text();

  if (response.status === 404) {
    throw new RiotClientError("NOT_FOUND", "Riot resource not found.", {
      status: response.status,
      requestUrl,
      responseBody,
    });
  }

  if (!response.ok) {
    logRiotRequestFailure(requestUrl, response.status, responseBody);
    throw new RiotClientError("API_ERROR", `Riot API request failed with status ${response.status}.`, {
      status: response.status,
      requestUrl,
      responseBody,
    });
  }

  let parsedBody: unknown = {};

  try {
    parsedBody = responseBody ? (JSON.parse(responseBody) as unknown) : {};
  } catch {
    parsedBody = {};
  }

  const summoner = parsedBody as RiotSummoner;

  if (platformRoute === "euw1") {
    console.log(`[riot] successful summoner lookup url: ${requestUrl}`);
    console.log(`[riot] successful summoner raw body: ${responseBody || "<empty>"}`);
    console.log(`[riot] successful summoner keys: ${Object.keys(summoner as object).join(", ")}`);
    console.log(
      `[riot] successful summoner fields: id=${summoner.id ?? "<missing>"} puuid=${summoner.puuid ?? "<missing>"} accountId=${summoner.accountId ?? "<missing>"}`,
    );
  }

  return summoner;
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

export async function getMatchIdsByPuuid(
  puuid: string,
  count = 20,
  start = 0,
): Promise<string[]> {
  const pathPuuid = encodeURIComponent(puuid);
  const safeCount = Math.max(1, Math.min(count, 100));
  const safeStart = Math.max(0, start);
  return riotGet<string[]>(
    `/lol/match/v5/matches/by-puuid/${pathPuuid}/ids?start=${safeStart}&count=${safeCount}`,
  );
}

export async function getMatchById(matchId: string): Promise<RiotMatchResponse> {
  const pathMatchId = encodeURIComponent(matchId);
  return riotGet<RiotMatchResponse>(`/lol/match/v5/matches/${pathMatchId}`);
}

export async function getRankedEntriesByPuuid(
  puuid: string,
  playerRegion = "europe",
  playerTagLine?: string,
): Promise<RiotLeagueEntry[]> {
  const pathPuuid = encodeURIComponent(puuid);
  const preferredPlatform = platformFromTagLine(playerTagLine);
  const platformCandidates = [
    ...(preferredPlatform ? [preferredPlatform] : []),
    ...getPlatformCandidates(playerRegion).filter((platform) => platform !== preferredPlatform),
  ];
  let lastError: RiotClientError | null = null;

  for (const platformRoute of platformCandidates) {
    console.log(`[riot] trying ranked lookup on platform ${platformRoute} for puuid ${pathPuuid}`);
    try {
      const summoner = await getSummonerByPuuidOnPlatform(platformRoute, pathPuuid);
      if (!summoner.id) {
        console.error(
          `[riot] missing summoner.id from ${platformRoute} for puuid ${pathPuuid}. Response puuid: ${summoner.puuid ?? "<unknown>"}`,
        );
        continue;
      }

      const summonerId = summoner.id;
      const pathSummonerId = encodeURIComponent(summonerId);
      return await riotGetOnPlatform<RiotLeagueEntry[]>(
        platformRoute,
        `/lol/league/v4/entries/by-summoner/${pathSummonerId}`,
      );
    } catch (error) {
      if (error instanceof RiotClientError) {
        lastError = error;

        if (error.code === "NOT_FOUND") {
          console.log(`[riot] platform ${platformRoute} not found for puuid ${pathPuuid}, trying next.`);
          continue;
        }

        if (error.status === 403) {
          console.error(
            `[riot] 403 on platform ${platformRoute} (${error.requestUrl ?? "unknown url"}) body: ${error.responseBody ?? "<empty>"}`,
          );
          continue;
        }
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new RiotClientError("NOT_FOUND", "Riot summoner not found on known platform routes.");
}
