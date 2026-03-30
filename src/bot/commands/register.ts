import { ChatInputCommandInteraction } from "discord.js";
import { createPlayer, findByDiscordUserId, updatePlayer } from "../../repositories/playerRepository";
import { RiotClientError, getAccountByRiotId } from "../../riot/riotClient";
import { parseRiotId } from "../../services/playerService";

export async function handleRegisterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const riotId = interaction.options.getString("riot_id", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const { gameName, tagLine } = parseRiotId(riotId);
    const account = await getAccountByRiotId(gameName, tagLine);
    const existingPlayer = findByDiscordUserId(interaction.user.id);

    if (existingPlayer) {
      updatePlayer(interaction.user.id, {
        discord_username: interaction.user.username,
        riot_game_name: account.gameName,
        riot_tag_line: account.tagLine,
        puuid: account.puuid,
        region: "europe",
      });
    } else {
      createPlayer({
        discord_user_id: interaction.user.id,
        discord_username: interaction.user.username,
        riot_game_name: account.gameName,
        riot_tag_line: account.tagLine,
        puuid: account.puuid,
        region: "europe",
      });
    }

    await interaction.editReply(`Account registered: ${account.gameName}#${account.tagLine}`);
  } catch (error) {
    if (error instanceof RiotClientError) {
      if (error.code === "NOT_FOUND") {
        await interaction.editReply("Riot account not found. Check your Riot ID and try again.");
        return;
      }

      if (error.code === "CONFIG_ERROR") {
        await interaction.editReply("Riot API is not configured on the bot.");
        return;
      }

      await interaction.editReply("Riot API error. Please try again later.");
      return;
    }

    if (error instanceof Error && error.message.includes("Invalid Riot ID format")) {
      await interaction.editReply("Invalid Riot ID format. Use name#tag.");
      return;
    }

    await interaction.editReply("Failed to register account.");
  }
}
