import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-stale-rooms",
  { minutes: 5 },
  api.rooms.runCronCleanup,
);

// Disconnect-lease sweep (table-stakes epic M1.6): cash out balance seats whose
// grace period has elapsed. Frequent so held seats/stacks free up promptly.
crons.interval(
  "sweep-disconnect-leases",
  { minutes: 1 },
  api.rooms.sweepDisconnectedLeases,
);

crons.interval(
  "cleanup-old-activity",
  { hours: 1 },
  internal.activityFeed.cleanupOldActivity,
);

crons.interval(
  "refresh-stats-cache",
  { hours: 1 },
  api.statsCache.computeStats,
  { filter: "all" },
);

export default crons;
