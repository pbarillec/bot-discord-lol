import { findAllPlayers } from "../repositories/playerRepository";
import { getNewMatchIdsForPlayer, processMatch } from "../services/matchService";

const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function startPollMatchesJob(): void {
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