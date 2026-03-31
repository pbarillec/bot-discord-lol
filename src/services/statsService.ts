import { db } from "../db/database";
import { findAllPlayers } from "../repositories/playerRepository";
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

export type LeaderboardStat = "winrate" | "kda" | "games" | "kills" | "deaths" | "cs";

export type LeaderboardEntry = {
  player: Player;
  stat: LeaderboardStat;
  value: number;
  games: number;
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

export function getLeaderboard(
  stat: LeaderboardStat,
  count = 20,
): LeaderboardEntry[] {
  const players = findAllPlayers();
  const entries: LeaderboardEntry[] = [];
  const sampleCount = Math.max(1, Math.min(count, 20));

  for (const player of players) {
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
