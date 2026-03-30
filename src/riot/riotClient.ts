export type RiotAccount = {
  gameName: string;
  tagLine: string;
  puuid: string;
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

const RIOT_ACCOUNT_API_BASE_URL = "https://europe.api.riotgames.com";

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
): Promise<RiotAccount> {
  const apiKey = process.env.RIOT_API_KEY;

  if (!apiKey) {
    throw new RiotClientError("CONFIG_ERROR", "Missing RIOT_API_KEY in environment variables.");
  }

  const pathGameName = encodeURIComponent(gameName);
  const pathTagLine = encodeURIComponent(tagLine);
  const url = `${RIOT_ACCOUNT_API_BASE_URL}/riot/account/v1/accounts/by-riot-id/${pathGameName}/${pathTagLine}`;

  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": apiKey,
    },
  });

  if (response.status === 404) {
    throw new RiotClientError("NOT_FOUND", "Riot account not found.");
  }

  if (!response.ok) {
    throw new RiotClientError("API_ERROR", `Riot API request failed with status ${response.status}.`);
  }

  return (await response.json()) as RiotAccount;
}