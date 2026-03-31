import { ChatInputCommandInteraction } from "discord.js";
import { findLatestMatchesByPlayer } from "../../repositories/matchRepository";
import { findByDiscordUserId } from "../../repositories/playerRepository";

const MAX_MATCH_COUNT = 20;

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) {
    return "Unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatPlayedAt(gameCreation: number | null, createdAt: string): string {
  if (gameCreation && gameCreation > 0) {
    const playedAt = new Date(gameCreation);

    if (!Number.isNaN(playedAt.getTime())) {
      return playedAt.toLocaleString();
    }
  }

  const fallbackDate = new Date(createdAt);

  if (Number.isNaN(fallbackDate.getTime())) {
    return createdAt;
  }

  return fallbackDate.toLocaleString();
}

export async function handleLastgamesCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const requestedCount = interaction.options.getInteger("count", true);
  const count = Math.max(1, Math.min(requestedCount, MAX_MATCH_COUNT));
  const player = findByDiscordUserId(interaction.user.id);

  if (!player) {
    await interaction.reply({
      content: "No Riot account is linked to your Discord user. Use /register first.",
      ephemeral: true,
    });
    return;
  }

  const matches = findLatestMatchesByPlayer(player.id, count);

  if (matches.length === 0) {
    await interaction.reply({
      content: "No matches found for your account yet.",
      ephemeral: true,
    });
    return;
  }

  const lines = matches.map((match, index) => {
    const resultLabel = match.win ? "W" : "L";
    const queueLabel = match.queue_id ?? "Unknown";
    const playedAt = formatPlayedAt(match.game_creation, match.created_at);

    return (
      `${index + 1}. [${resultLabel}] ${match.champion_name} ` +
      `${match.kills}/${match.deaths}/${match.assists} | ` +
      `CS ${match.cs} | Queue ${queueLabel} | ` +
      `${formatDuration(match.game_duration)} | ${playedAt}`
    );
  });

  await interaction.reply({
    content: [`Latest ${matches.length} game(s) for ${player.riot_game_name}#${player.riot_tag_line}:`, ...lines].join("\n"),
  });
}
