export type ParsedRiotId = {
  gameName: string;
  tagLine: string;
};

export function parseRiotId(riotId: string): ParsedRiotId {
  const trimmed = riotId.trim();
  const parts = trimmed.split("#");

  if (parts.length !== 2) {
    throw new Error("Invalid Riot ID format. Use name#tag.");
  }

  const gameName = parts[0].trim();
  const tagLine = parts[1].trim();

  if (!gameName || !tagLine) {
    throw new Error("Invalid Riot ID format. Use name#tag.");
  }

  return { gameName, tagLine };
}