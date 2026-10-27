import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "./env";

// One pool per server process; the globalThis slot survives dev hot reloads.
const slot = globalThis as typeof globalThis & { quizPool?: Pool };
let db: ReturnType<typeof drizzle> | undefined;

/** Lazy, so `next build` needs no env. */
export function getPool() {
  return (slot.quizPool ??= new Pool({
    connectionString: getEnv().databaseUrl,
    max: 5,
  }));
}

/** Columns stay snake_case (see schema.ts). */
export function getDb() {
  return (db ??= drizzle(getPool()));
}
