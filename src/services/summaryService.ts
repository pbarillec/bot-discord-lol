import { Client, EmbedBuilder } from "discord.js";
import { env } from "../config/env";
import {
  findUnpostedMatchSummariesByPlayer,
  markMatchParticipantAsPosted,
} from "../repositories/matchRepository";
import { Player } from "../types/player";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) {
    return "Unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export async function postPendingMatchSummariesForPlayer(
  client: Client,
  player: Player,
): Promise<void> {
  const channelId = env.matchResultsChannelId;

  if (!channelId) {
    console.log("[summary] MATCH_RESULTS_CHANNEL_ID is not configured.");
    return;
  }

  const channel = await client.channels.fetch(channelId).catch((error) => {
    console.error("[summary] Failed to fetch match results channel:", error);
    return null;
  });

  if (!channel || !channel.isTextBased()) {
    console.error("[summary] Match results channel is missing or not text-based.");
    return;
  }

  const pendingSummaries = findUnpostedMatchSummariesByPlayer(player.id);

  for (const summary of pendingSummaries) {
    const resultLabel = summary.win ? "Victory" : "Defeat";
    const embed = new EmbedBuilder()
      .setTitle(`${player.riot_game_name}#${player.riot_tag_line}`)
      .setDescription(`${resultLabel} on ${summary.champion_name}`)
      .addFields(
        { name: "K / D / A", value: `${summary.kills} / ${summary.deaths} / ${summary.assists}`, inline: true },
        { name: "CS", value: String(summary.cs), inline: true },
        { name: "Duration", value: formatDuration(summary.game_duration), inline: true },
        { name: "Queue", value: String(summary.queue_id ?? "Unknown"), inline: true },
      );

    try {
      await channel.send({ embeds: [embed] });
      markMatchParticipantAsPosted(summary.participant_id);
      console.log(`[summary] Posted match ${summary.match_id} for ${player.discord_username}.`);
    } catch (error) {
      console.error(
        `[summary] Failed to post match ${summary.match_id} for ${player.discord_username}:`,
        error,
      );
    }
  }
}