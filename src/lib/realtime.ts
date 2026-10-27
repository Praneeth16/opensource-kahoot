import "server-only";

import { createRealtime } from "@neon/realtime/server";

import { getEnv } from "./env";

let realtime: ReturnType<typeof create> | undefined;
function create() {
  const env = getEnv();
  // Live queries are raw SQL (src/lib/live.ts), so no ORM adapter.
  return createRealtime({
    secret: env.realtimeSecret,
    db: env.database,
    debugMode: process.env.NODE_ENV === "development", // full database errors in dev only
  });
}
export const getRealtime = () => (realtime ??= create());
