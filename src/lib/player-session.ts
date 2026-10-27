import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getPool } from "./db";

// Players have no account. Joining creates a players row and gives this browser a random token in an
// httpOnly cookie; the database keeps only its sha256. Every player read and write re-checks it.

const cookieName = (gameId: string) => `qp_${gameId}`;
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function newPlayerToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

export async function setPlayerCookie(
  gameId: string,
  playerId: string,
  token: string,
) {
  (await cookies()).set(cookieName(gameId), `${playerId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export type PlayerSession = { id: string; nickname: string; gameId: string };

/** The player this browser joined `gameId` as, or null (no cookie, wrong token, or kicked). */
export async function getPlayer(gameId: string): Promise<PlayerSession | null> {
  const raw = (await cookies()).get(cookieName(gameId))?.value;
  const [playerId, token] = raw?.split(".") ?? [];
  if (!playerId || !token || !/^[0-9a-f-]{36}$/.test(playerId)) return null;
  const { rows } = await getPool().query<{
    nickname: string;
    token_hash: string;
  }>(
    "SELECT nickname, token_hash FROM players WHERE id = $1 AND game_id = $2 AND NOT kicked",
    [playerId, gameId],
  );
  const row = rows[0];
  if (!row) return null;
  const expected = Buffer.from(row.token_hash);
  const actual = Buffer.from(sha256(token));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;
  return { id: playerId, nickname: row.nickname, gameId };
}
