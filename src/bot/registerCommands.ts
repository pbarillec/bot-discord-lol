import { REST, Routes, type RESTPostAPIApplicationGuildCommandsJSONBody } from "discord.js";
import { env } from "../config/env";

const commandDefinitions: RESTPostAPIApplicationGuildCommandsJSONBody[] = [
  {
    name: "register",
    description: "Register your summoner",
    options: [
      {
        name: "riot_id",
        description: "Riot ID in format name#tag",
        type: 3,
        required: true,
      },
    ],
  },
  { name: "me", description: "Show your linked profile" },
  { name: "unregister", description: "Unregister your summoner" },
  {
    name: "lastgames",
    description: "Show your latest matches",
    options: [
      {
        name: "count",
        description: "How many recent matches to display",
        type: 4,
        required: true,
      },
    ],
  },
  { name: "profile", description: "Show a player profile" },
  {
    name: "leaderboard",
    description: "Show leaderboard",
    options: [
      {
        name: "stat",
        description: "Statistic used to rank players",
        type: 3,
        required: true,
        choices: [
          { name: "rank_solo", value: "rank_solo" },
          { name: "rank_flex", value: "rank_flex" },
          { name: "winrate", value: "winrate" },
          { name: "kda", value: "kda" },
          { name: "games", value: "games" },
          { name: "kills", value: "kills" },
          { name: "deaths", value: "deaths" },
          { name: "cs", value: "cs" },
        ],
      },
      {
        name: "count",
        description: "Number of recent matches used for match-based stats (default: 20)",
        type: 4,
        required: false,
        min_value: 1,
        max_value: 20,
      },
    ],
  },
  { name: "nemesis", description: "Show your nemesis" },
];

export async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.token);

  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), {
    body: commandDefinitions,
  });

  console.log(`Registered ${commandDefinitions.length} guild commands.`);
}
