import { Client } from "discord.js";
import { handleLeaderboardCommand } from "../commands/leaderboard";
import { handleLastgamesCommand } from "../commands/lastgames";
import { handleMeCommand } from "../commands/me";
import { handleNemesisCommand } from "../commands/nemesis";
import { handleProfileCommand } from "../commands/profile";
import { handleRegisterCommand } from "../commands/register";
import { handleResyncCommand } from "../commands/resync";
import { handleUnregisterCommand } from "../commands/unregister";

export function setupInteractionHandler(client: Client): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    switch (interaction.commandName) {
      case "register":
        await handleRegisterCommand(interaction);
        return;
      case "me":
        await handleMeCommand(interaction);
        return;
      case "unregister":
        await handleUnregisterCommand(interaction);
        return;
      case "resync":
        await handleResyncCommand(interaction);
        return;
      case "lastgames":
        await handleLastgamesCommand(interaction);
        return;
      case "profile":
        await handleProfileCommand(interaction);
        return;
      case "leaderboard":
        await handleLeaderboardCommand(interaction);
        return;
      case "nemesis":
        await handleNemesisCommand(interaction);
        return;
      default:
        await interaction.reply({ content: "Not implemented yet", ephemeral: true });
    }
  });
}
