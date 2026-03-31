import { ChatInputCommandInteraction } from "discord.js";
import { findByDiscordUserId } from "../../repositories/playerRepository";

export async function handleMeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = findByDiscordUserId(interaction.user.id);

  if (!player) {
    await interaction.reply({
      content: "No Riot account is linked to your Discord user. Use /register first.",
      ephemeral: true,
    });
    return;
  }

  const registeredAt = new Date(player.created_at);
  const registeredAtLabel = Number.isNaN(registeredAt.getTime())
    ? player.created_at
    : registeredAt.toLocaleString();

  await interaction.reply({
    content: [
      `Riot ID: ${player.riot_game_name}#${player.riot_tag_line}`,
      `Region: ${player.region}`,
      `Registered: ${registeredAtLabel}`,
    ].join("\n"),
    ephemeral: true,
  });
}
