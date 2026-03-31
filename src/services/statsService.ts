import { db } from "../db/database";
import { findAllPlayers } from "../repositories/playerRepository";
import { RiotLeagueEntry, getRankedEntriesByPuuid } from "../riot/riotClient";
import { Player } from "../types/player";

type PlayerMatchStatsRow = {
  champion_name: string;
  win: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
};

type ChampionStats = {
  name: string;
  games: number;
  wins: number;
  winrate: number;
};

export type PlayerStats = {
  totalGames: number;
  wins: number;
  losses: number;
  winrate: number;
  averageKda: number;
  averageDeaths: number;
  averageCs: number;
  mostPlayedChampion: ChampionStats;
  bestChampion: ChampionStats | null;
  worstChampion: ChampionStats | null;
  currentStreak: {
    type: "win" | "lose";
    count: number;
  };
};

export type LeaderboardStat =
  | "rank_solo"
  | "rank_flex"
  | "winrate"
  | "kda"
  | "games"
  | "kills"
  | "deaths"
  | "cs";

export type LeaderboardEntry = {
  player: Player;
  stat: LeaderboardStat;
  value: number;
  games: number;
  rank_tier?: string;
  rank_division?: string;
  rank_lp?: number;
  rank_wins?: number;
  rank_losses?: number;
};

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getPlayerMatchRows(playerId: number, limit?: number): PlayerMatchStatsRow[] {
  const rows = db
    .prepare(
      `
        SELECT
          mp.champion_name,
          mp.win,
          mp.kills,
          mp.deaths,
          mp.assists,
          mp.cs
        FROM match_participants mp
        INNER JOIN matches m ON m.id = mp.match_id
        WHERE mp.player_id = ?
        ORDER BY m.game_creation DESC, mp.id DESC
      `,
    )
    .all(playerId) as PlayerMatchStatsRow[];

  if (!limit || limit <= 0) {
    return rows;
  }

  return rows.slice(0, limit);
}

function isRankStat(stat: LeaderboardStat): boolean {
  return stat === "rank_solo" || stat === "rank_flex";
}

function isMatchStat(stat: LeaderboardStat): boolean {
  return !isRankStat(stat);
}

function getRankQueueType(stat: LeaderboardStat): string | null {
  if (stat === "rank_solo") {
    return "RANKED_SOLO_5x5";
  }

  if (stat === "rank_flex") {
    return "RANKED_FLEX_SR";
  }

  return null;
}

function getTierValue(tier: string): number {
  switch (tier.toUpperCase()) {
    case "IRON":
      return 1;
    case "BRONZE":
      return 2;
    case "SILVER":
      return 3;
    case "GOLD":
      return 4;
    case "PLATINUM":
      return 5;
    case "EMERALD":
      return 6;
    case "DIAMOND":
      return 7;
    case "MASTER":
      return 8;
    case "GRANDMASTER":
      return 9;
    case "CHALLENGER":
      return 10;
    default:
      return 0;
  }
}

function getDivisionValue(division: string): number {
  switch (division.toUpperCase()) {
    case "IV":
      return 1;
    case "III":
      return 2;
    case "II":
      return 3;
    case "I":
      return 4;
    default:
      return 0;
  }
}

function getRankValue(entry: RiotLeagueEntry): number {
  const tierValue = getTierValue(entry.tier);
  const divisionValue = getDivisionValue(entry.rank);
  return tierValue * 10_000 + divisionValue * 100 + Math.max(entry.leaguePoints, 0);
}

function findRankEntry(entries: RiotLeagueEntry[], stat: LeaderboardStat): RiotLeagueEntry | null {
  const queueType = getRankQueueType(stat);

  if (!queueType) {
    return null;
  }

  return entries.find((entry) => entry.queueType === queueType) ?? null;
}

export function getPlayerStats(player: Player): PlayerStats | null {
  const rows = getPlayerMatchRows(player.id);

  if (rows.length === 0) {
    return null;
  }

  const totalGames = rows.length;
  let wins = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  let totalCs = 0;
  const byChampion = new Map<string, { games: number; wins: number }>();

  for (const row of rows) {
    const isWin = row.win === 1;

    if (isWin) {
      wins += 1;
    }

    totalKills += row.kills;
    totalDeaths += row.deaths;
    totalAssists += row.assists;
    totalCs += row.cs;

    const current = byChampion.get(row.champion_name) ?? { games: 0, wins: 0 };
    current.games += 1;
    current.wins += isWin ? 1 : 0;
    byChampion.set(row.champion_name, current);
  }

  const losses = totalGames - wins;
  const winrate = roundTo((wins / totalGames) * 100, 1);
  const averageKda = roundTo((totalKills + totalAssists) / Math.max(totalDeaths, 1), 2);
  const averageDeaths = roundTo(totalDeaths / totalGames, 1);
  const averageCs = roundTo(totalCs / totalGames, 1);

  const championStats = Array.from(byChampion.entries()).map(([name, values]) => ({
    name,
    games: values.games,
    wins: values.wins,
    winrate: roundTo((values.wins / values.games) * 100, 1),
  }));

  championStats.sort((a, b) => {
    if (b.games !== a.games) {
      return b.games - a.games;
    }

    return a.name.localeCompare(b.name);
  });

  const mostPlayedChampion = championStats[0];
  const championsWithEnoughGames = championStats.filter((champion) => champion.games >= 2);

  const bestChampion =
    championsWithEnoughGames.length === 0
      ? null
      : championsWithEnoughGames.slice().sort((a, b) => {
          if (b.winrate !== a.winrate) {
            return b.winrate - a.winrate;
          }

          if (b.games !== a.games) {
            return b.games - a.games;
          }

          return a.name.localeCompare(b.name);
        })[0];

  const worstChampion =
    championsWithEnoughGames.length === 0
      ? null
      : championsWithEnoughGames.slice().sort((a, b) => {
          if (a.winrate !== b.winrate) {
            return a.winrate - b.winrate;
          }

          if (b.games !== a.games) {
            return b.games - a.games;
          }

          return a.name.localeCompare(b.name);
        })[0];

  const latestResult = rows[0].win === 1 ? 1 : 0;
  let streakCount = 0;

  for (const row of rows) {
    const currentResult = row.win === 1 ? 1 : 0;

    if (currentResult !== latestResult) {
      break;
    }

    streakCount += 1;
  }

  return {
    totalGames,
    wins,
    losses,
    winrate,
    averageKda,
    averageDeaths,
    averageCs,
    mostPlayedChampion,
    bestChampion,
    worstChampion,
    currentStreak: {
      type: latestResult === 1 ? "win" : "lose",
      count: streakCount,
    },
  };
}

export async function getLeaderboard(
  stat: LeaderboardStat,
  count = 20,
): Promise<LeaderboardEntry[]> {
  const players = findAllPlayers();
  const entries: LeaderboardEntry[] = [];
  const sampleCount = Math.max(1, Math.min(count, 20));

  for (const player of players) {
    if (isRankStat(stat)) {
      const rankedEntries = await getRankedEntriesByPuuid(player.puuid, player.region).catch((error) => {
        console.error(`[leaderboard] Failed to fetch rank for ${player.riot_game_name}#${player.riot_tag_line}:`, error);
        return [];
      });
      const rankEntry = findRankEntry(rankedEntries, stat);

      if (!rankEntry) {
        continue;
      }

      entries.push({
        player,
        stat,
        value: getRankValue(rankEntry),
        games: rankEntry.wins + rankEntry.losses,
        rank_tier: rankEntry.tier,
        rank_division: rankEntry.rank,
        rank_lp: rankEntry.leaguePoints,
        rank_wins: rankEntry.wins,
        rank_losses: rankEntry.losses,
      });

      continue;
    }

    const rows = getPlayerMatchRows(player.id, sampleCount);

    if (rows.length === 0) {
      continue;
    }

    const games = rows.length;
    let wins = 0;
    let kills = 0;
    let deaths = 0;
    let assists = 0;
    let cs = 0;

    for (const row of rows) {
      wins += row.win === 1 ? 1 : 0;
      kills += row.kills;
      deaths += row.deaths;
      assists += row.assists;
      cs += row.cs;
    }

    const winrate = roundTo((wins / games) * 100, 1);
    const kda = roundTo((kills + assists) / Math.max(deaths, 1), 2);

    if ((stat === "winrate" || stat === "kda") && games < 3) {
      continue;
    }

    let value = 0;

    switch (stat) {
      case "winrate":
        value = winrate;
        break;
      case "kda":
        value = kda;
        break;
      case "games":
        value = games;
        break;
      case "kills":
        value = kills;
        break;
      case "deaths":
        value = deaths;
        break;
      case "cs":
        value = cs;
        break;
      default:
        value = 0;
    }

    entries.push({ player, stat, value, games });
  }

  entries.sort((a, b) => {
    if (isRankStat(stat)) {
      if (b.value !== a.value) {
        return b.value - a.value;
      }
    } else
    if (stat === "deaths") {
      if (a.value !== b.value) {
        return a.value - b.value;
      }
    } else if (b.value !== a.value) {
      return b.value - a.value;
    }

    if (b.games !== a.games) {
      return b.games - a.games;
    }

    return a.player.riot_game_name.localeCompare(b.player.riot_game_name);
  });

  return entries;
}
