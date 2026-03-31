import { ChatInputCommandInteraction } from "discord.js";
import { findAllPlayers } from "../../repositories/playerRepository";
import { LeaderboardEntry, LeaderboardStat, getLeaderboard } from "../../services/statsService";

const VALID_LEADERBOARD_STATS: LeaderboardStat[] = ["winrate", "kda", "games", "kills", "deaths", "cs"];

function formatEntry(entry: LeaderboardEntry, rank: number): string {
  const riotId = `${entry.player.riot_game_name}#${entry.player.riot_tag_line}`;

  switch (entry.stat) {
    case "winrate":
      return `${rank}. ${riotId} - ${entry.value}% (${entry.games} games)`;
    case "kda":
      return `${rank}. ${riotId} - ${entry.value} KDA (${entry.games} games)`;
    case "games":
      return `${rank}. ${riotId} - ${entry.value} games`;
    case "kills":
      return `${rank}. ${riotId} - ${entry.value} kills (${entry.games} games)`;
    case "deaths":
      return `${rank}. ${riotId} - ${entry.value} deaths (${entry.games} games)`;
    case "cs":
      return `${rank}. ${riotId} - ${entry.value} CS (${entry.games} games)`;
    default:
      return `${rank}. ${riotId} - ${entry.value}`;
  }
}

export async function handleLeaderboardCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const statInput = interaction.options.getString("stat", true);

  if (!VALID_LEADERBOARD_STATS.includes(statInput as LeaderboardStat)) {
    await interaction.reply({ content: "Invalid stat. Use one of: winrate, kda, games, kills, deaths, cs.", ephemeral: true });
    return;
  }

  const players = findAllPlayers();

  if (players.length === 0) {
    await interaction.reply({ content: "No registered players yet.", ephemeral: true });
    return;
  }

  const stat = statInput as LeaderboardStat;
  const leaderboard = getLeaderboard(stat);

  if (leaderboard.length === 0) {
    await interaction.reply({ content: `No players qualify for leaderboard: ${stat}.`, ephemeral: true });
    return;
  }

  const lines = leaderboard.map((entry, index) => formatEntry(entry, index + 1));

  await interaction.reply({
    content: [`Leaderboard: ${stat}`, "", ...lines].join("\n"),
  });
}
