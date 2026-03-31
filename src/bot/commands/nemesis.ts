import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { findRecentMatchIdsForPlayer } from "../../repositories/matchRepository";
import { findByDiscordUserId } from "../../repositories/playerRepository";
import { getPlayerNemesis } from "../../services/statsService";

export async function handleNemesisCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = findByDiscordUserId(interaction.user.id);

  if (!player) {
    await interaction.reply({
      content: "No Riot account is linked to your Discord user. Use /register first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const hasStoredMatches = findRecentMatchIdsForPlayer(player.id, 1).length > 0;

  if (!hasStoredMatches) {
    await interaction.reply({
      content: "No matches found for your account yet.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();
  const nemesisEntries = await getPlayerNemesis(player).catch((error) => {
    console.error(`[nemesis] Failed to compute nemesis for ${player.riot_game_name}:`, error);
    return null;
  });

  if (!nemesisEntries) {
    await interaction.editReply("Failed to compute nemesis right now. Please try again later.");
    return;
  }

  if (nemesisEntries.length === 0) {
    await interaction.editReply("No enemy champion qualifies yet (minimum 2 games faced).");
    return;
  }

  const lines = nemesisEntries.map((entry, index) => {
    return `${index + 1}. ${entry.championName} - ${entry.wins}W / ${entry.losses}L (${entry.winrate}%)`;
  });

  await interaction.editReply({
    content: [`Nemesis: ${player.riot_game_name}`, "", ...lines].join("\n"),
  });
}
