import { ChatInputCommandInteraction } from "discord.js";
import { deleteByDiscordUserId, findByDiscordUserId } from "../../repositories/playerRepository";

export async function handleUnregisterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const existingPlayer = findByDiscordUserId(interaction.user.id);

  if (!existingPlayer) {
    await interaction.reply({
      content: "No Riot account is currently linked to your Discord user.",
      ephemeral: true,
    });
    return;
  }

  const deleted = deleteByDiscordUserId(interaction.user.id);

  if (!deleted) {
    await interaction.reply({
      content: "Failed to unregister your account. Please try again.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `Unregistered account: ${existingPlayer.riot_game_name}#${existingPlayer.riot_tag_line}`,
    ephemeral: true,
  });
}
