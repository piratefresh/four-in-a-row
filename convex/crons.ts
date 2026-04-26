import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-stale-rooms",
  { minutes: 5 },
  api.rooms.runCronCleanup,
);

export default crons;
