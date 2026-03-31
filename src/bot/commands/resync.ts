import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { findByDiscordUserId } from "../../repositories/playerRepository";
import { RiotClientError } from "../../riot/riotClient";
import { resyncRankedHistoryForPlayer } from "../../services/matchService";

export async function handleResyncCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = findByDiscordUserId(interaction.user.id);

  if (!player) {
    await interaction.reply({
      content: "No Riot account is linked to your Discord user. Use /register first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await resyncRankedHistoryForPlayer(player, 100);

    if (result.importedRankedMatches === 0) {
      await interaction.editReply(
        "Resync finished, but no ranked matches were found (queues 420/440).",
      );
      return;
    }

    await interaction.editReply(
      [
        `Resync completed for ${player.riot_game_name}#${player.riot_tag_line}.`,
        `Imported ranked matches: ${result.importedRankedMatches}`,
        `Skipped matches: ${result.skippedMatches}`,
        `Removed old participant rows: ${result.deletedParticipants}`,
        `Removed orphan matches: ${result.deletedOrphanMatches}`,
        `Failed match imports: ${result.failedMatches}`,
        `Rate limit occurred: ${result.rateLimitOccurred ? "yes" : "no"}`,
      ].join("\n"),
    );
  } catch (error) {
    if (error instanceof RiotClientError) {
      if (error.code === "CONFIG_ERROR") {
        await interaction.editReply("Riot API is not configured on the bot.");
        return;
      }

      await interaction.editReply("Riot API error during resync. Please try again later.");
      return;
    }

    await interaction.editReply("Failed to resync history. Please try again later.");
  }
}
