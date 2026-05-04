import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-stale-rooms",
  { minutes: 5 },
  api.rooms.runCronCleanup,
);

crons.interval(
  "cleanup-old-activity",
  { hours: 1 },
  internal.activityFeed.cleanupOldActivity,
);

export default crons;
