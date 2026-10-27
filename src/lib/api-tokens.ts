import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "./db";
import { apiTokens } from "./schema";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Creates a token for the host and returns it in full. This is the only time it is readable. */
export async function createApiToken(ownerId: string, name: string) {
  const token = `pq_${randomBytes(32).toString("base64url")}`;
  await getDb()
    .insert(apiTokens)
    .values({
      owner_id: ownerId,
      name,
      token_hash: sha256(token),
      prefix: token.slice(0, 7),
    });
  return token;
}

export function listApiTokens(ownerId: string) {
  return getDb()
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      created_at: apiTokens.created_at,
      last_used_at: apiTokens.last_used_at,
    })
    .from(apiTokens)
    .where(and(eq(apiTokens.owner_id, ownerId), isNull(apiTokens.revoked_at)))
    .orderBy(desc(apiTokens.created_at));
}

export async function revokeApiToken(ownerId: string, id: string) {
  await getDb()
    .update(apiTokens)
    .set({ revoked_at: sql`now()` })
    .where(and(eq(apiTokens.id, id), eq(apiTokens.owner_id, ownerId)));
}

/** The host a live token belongs to, or null. Records the use. */
export async function verifyApiToken(token: string | undefined) {
  if (!token?.startsWith("pq_")) return null;
  const [row] = await getDb()
    .update(apiTokens)
    .set({ last_used_at: sql`now()` })
    .where(
      and(
        eq(apiTokens.token_hash, sha256(token)),
        isNull(apiTokens.revoked_at),
      ),
    )
    .returning({ owner_id: apiTokens.owner_id });
  return row?.owner_id ?? null;
}
