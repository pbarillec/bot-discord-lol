import { Client } from "discord.js";
import { findAllPlayers } from "../repositories/playerRepository";
import {
  findRecentMatchIdsForPlayer,
  markOlderUnpostedMatchesAsPosted,
} from "../repositories/matchRepository";
import { getNewMatchIdsForPlayer, processMatch } from "../services/matchService";
import { postPendingMatchSummariesForPlayer } from "../services/summaryService";

const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function startPollMatchesJob(client: Client): void {
  let isRunning = false;

  const run = async () => {
    if (isRunning) {
      console.log("[poll] Previous poll still running, skipping this cycle.");
      return;
    }

    isRunning = true;
    console.log("[poll] Polling started.");

    try {
      const players = findAllPlayers();
      console.log(`[poll] Checking ${players.length} player(s).`);

      for (const player of players) {
        try {
          const isFirstSync = findRecentMatchIdsForPlayer(player.id, 1).length === 0;
          const newMatchIds = await getNewMatchIdsForPlayer(player);

          if (newMatchIds.length > 0) {
            console.log(`[poll] ${player.discord_username}: ${newMatchIds.length} new match(es) found.`);
          }

          for (const matchId of newMatchIds) {
            try {
              await processMatch(matchId, player);
              console.log(`[poll] Processed match ${matchId} for ${player.discord_username}.`);
            } catch (error) {
              console.error(
                `[poll] Failed to process match ${matchId} for ${player.discord_username}:`,
                error,
              );
            }
          }

          if (isFirstSync && newMatchIds.length > 1) {
            markOlderUnpostedMatchesAsPosted(player.id);
            console.log(
              `[poll] First sync for ${player.discord_username}: suppressed older imported matches.`,
            );
          }

          try {
            await postPendingMatchSummariesForPlayer(client, player);
          } catch (error) {
            console.error(`[poll] Failed to post summaries for ${player.discord_username}:`, error);
          }
        } catch (error) {
          console.error(`[poll] Failed to check player ${player.discord_username}:`, error);
        }
      }
    } finally {
      isRunning = false;
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, POLL_INTERVAL_MS);
}
