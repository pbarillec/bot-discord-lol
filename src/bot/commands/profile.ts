import { ChatInputCommandInteraction } from "discord.js";
import { findByDiscordUserId } from "../../repositories/playerRepository";
import { getPlayerStats } from "../../services/statsService";

export async function handleProfileCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = findByDiscordUserId(interaction.user.id);

  if (!player) {
    await interaction.reply({
      content: "No Riot account is linked to your Discord user. Use /register first.",
      ephemeral: true,
    });
    return;
  }

  const stats = getPlayerStats(player);

  if (!stats) {
    await interaction.reply({
      content: "No matches found for your account yet.",
      ephemeral: true,
    });
    return;
  }

  const bestChampionLabel = stats.bestChampion
    ? `${stats.bestChampion.name} (${stats.bestChampion.winrate}%)`
    : "N/A (need at least 2 games on a champion)";
  const worstChampionLabel = stats.worstChampion
    ? `${stats.worstChampion.name} (${stats.worstChampion.winrate}%)`
    : "N/A (need at least 2 games on a champion)";
  const streakLabel = `${stats.currentStreak.count} ${stats.currentStreak.type === "win" ? "wins" : "losses"}`;

  await interaction.reply({
    content: [
      `Profile: ${player.riot_game_name}`,
      "",
      `Games: ${stats.totalGames} (${stats.wins}W/${stats.losses}L)`,
      `Winrate: ${stats.winrate}%`,
      "",
      `KDA: ${stats.averageKda}`,
      `Deaths avg: ${stats.averageDeaths}`,
      `CS avg: ${stats.averageCs}`,
      "",
      `Most played: ${stats.mostPlayedChampion.name} (${stats.mostPlayedChampion.games} games)`,
      `Best champion: ${bestChampionLabel}`,
      `Worst champion: ${worstChampionLabel}`,
      "",
      `Current streak: ${streakLabel}`,
    ].join("\n"),
  });
}
