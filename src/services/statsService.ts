import { db } from "../db/database";
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

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getPlayerStats(player: Player): PlayerStats | null {
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
    .all(player.id) as PlayerMatchStatsRow[];

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
