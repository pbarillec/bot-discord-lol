import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { findAllPlayers } from "../../repositories/playerRepository";
import { LeaderboardEntry, LeaderboardStat, getLeaderboard } from "../../services/statsService";

const VALID_LEADERBOARD_STATS: LeaderboardStat[] = [
  "rank_solo",
  "rank_flex",
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
    case "rank_solo":
    case "rank_flex": {
      const tier = entry.rank_tier ?? "UNRANKED";
      const division = entry.rank_division ?? "";
      const lp = entry.rank_lp ?? 0;
      const wins = entry.rank_wins ?? 0;
      const losses = entry.rank_losses ?? 0;
      const rankLabel = `${tier} ${division}`.trim();
      return `${rank}. ${riotId} - ${rankLabel} ${lp} LP (${wins}W/${losses}L)`;
    }
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

  if (!VALID_LEADERBOARD_STATS.includes(statInput as LeaderboardStat)) {
    await interaction.reply({
      content: "Invalid stat. Use one of: rank_solo, rank_flex, winrate, kda, games, kills, deaths, cs.",
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
  const leaderboard = await getLeaderboard(stat, count).catch((error) => {
    console.error("[leaderboard] Failed to build leaderboard:", error);
    return null;
  });

  if (!leaderboard) {
    await interaction.editReply("Failed to build leaderboard right now. Please try again later.");
    return;
  }

  if (leaderboard.length === 0) {
    await interaction.editReply(`No players qualify for leaderboard: ${stat}.`);
    return;
  }

  const lines = leaderboard.map((entry, index) => formatEntry(entry, index + 1));
  const subtitle = stat === "rank_solo" || stat === "rank_flex" ? "" : `Sample size: latest ${count} match(es)`;

  await interaction.editReply({
    content: [`Leaderboard: ${stat}`, subtitle, ...lines].filter((line) => line.length > 0).join("\n"),
  });
}
