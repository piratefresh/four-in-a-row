import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL =
  process.env.CONVEX_TEST_URL ??
  process.env.VITE_CONVEX_URL ??
  "http://127.0.0.1:3210";

export function createAuthenticatedClient(): ConvexHttpClient {
  const client = new ConvexHttpClient(CONVEX_URL);
  return client;
}