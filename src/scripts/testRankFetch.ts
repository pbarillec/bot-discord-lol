import { RiotClientError, getAccountByRiotId, getRankedEntriesByPuuid } from "../riot/riotClient";

async function main(): Promise<void> {
  const gameName = "poutinetrocho";
  const tagLine = "EUW";

  console.log(`[rank-test] Resolving account for ${gameName}#${tagLine}`);
  const account = await getAccountByRiotId(gameName, tagLine);
  console.log(`[rank-test] Account resolved. puuid=${account.puuid}`);

  console.log("[rank-test] Fetching ranked entries...");
  const entries = await getRankedEntriesByPuuid(account.puuid, "europe");
  console.log(`[rank-test] Ranked entries fetched: ${entries.length}`);

  for (const entry of entries) {
    console.log(
      `[rank-test] ${entry.queueType}: ${entry.tier} ${entry.rank} ${entry.leaguePoints} LP (${entry.wins}W/${entry.losses}L)`,
    );
  }
}

main().catch((error) => {
  if (error instanceof RiotClientError) {
    console.error(`[rank-test] RiotClientError code=${error.code} status=${error.status ?? "n/a"}`);
    if (error.requestUrl) {
      console.error(`[rank-test] requestUrl=${error.requestUrl}`);
    }
    if (error.responseBody) {
      console.error(`[rank-test] responseBody=${error.responseBody}`);
    }
    process.exit(1);
  }

  console.error("[rank-test] Unexpected error:", error);
  process.exit(1);
});
