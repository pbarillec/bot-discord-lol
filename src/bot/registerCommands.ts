import { REST, Routes, type RESTPostAPIApplicationGuildCommandsJSONBody } from "discord.js";
import { env } from "../config/env";

const commandDefinitions: RESTPostAPIApplicationGuildCommandsJSONBody[] = [
  { name: "register", description: "Register your summoner" },
  { name: "me", description: "Show your linked profile" },
  { name: "unregister", description: "Unregister your summoner" },
  { name: "profile", description: "Show a player profile" },
  { name: "leaderboard", description: "Show leaderboard" },
  { name: "nemesis", description: "Show your nemesis" },
];

export async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.token);

  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), {
    body: commandDefinitions,
  });

  console.log(`Registered ${commandDefinitions.length} guild commands.`);
}