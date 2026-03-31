import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { findAllPlayers } from "../../repositories/playerRepository";
import { LeaderboardEntry, LeaderboardStat, getLeaderboard } from "../../services/statsService";

const VALID_LEADERBOARD_STATS: LeaderboardStat[] = [
  "winrate",
  "kda",
  "games",
  "kills",
  "deaths",
  "cs",
];

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
  const countInput = interaction.options.getInteger("count");
  const isRankRequest = statInput === "rank_solo" || statInput === "rank_flex";

  if (isRankRequest) {
    await interaction.reply({
      content: "Rank leaderboard is not available.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!VALID_LEADERBOARD_STATS.includes(statInput as LeaderboardStat)) {
    await interaction.reply({
      content: "Invalid stat. Use one of: winrate, kda, games, kills, deaths, cs.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const players = findAllPlayers();

  if (players.length === 0) {
    await interaction.reply({ content: "No registered players yet.", flags: MessageFlags.Ephemeral });
    return;
  }

  const stat = statInput as LeaderboardStat;
  const count = Math.max(1, Math.min(countInput ?? 20, 20));
  await interaction.deferReply();
  let leaderboard: LeaderboardEntry[] | null = null;

  try {
    leaderboard = getLeaderboard(stat, count);
  } catch (error) {
    console.error("[leaderboard] Failed to build leaderboard:", error);
  }

  if (!leaderboard) {
    await interaction.editReply("Failed to build leaderboard right now. Please try again later.");
    return;
  }

  if (leaderboard.length === 0) {
    await interaction.editReply(`No players qualify for leaderboard: ${stat}.`);
    return;
  }

  const lines = leaderboard.map((entry, index) => formatEntry(entry, index + 1));
  const subtitle = `Sample size: latest ${count} match(es)`;

  await interaction.editReply({
    content: [`Leaderboard: ${stat}`, subtitle, ...lines].filter((line) => line.length > 0).join("\n"),
  });
}
