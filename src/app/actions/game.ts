"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { getPool } from "@/lib/db";
import { createGameFor } from "@/lib/quiz-store";
import { rejected, toResult, type WriteResult } from "@/lib/result";

// Host controls. Every write is one statement scoped to `host_id` from the session and guarded on the
// phase and question index the host's screen was showing, so a double click or a stale tab changes
// nothing. Each returns the txid for awaitTxId(). No revalidatePath: the live queries deliver the change.

const uuid = z.uuid();
const index = z.number().int().min(-1).max(1000);

async function hostWrite(
  gameId: string,
  pageUserId: string,
  sql: string,
  params: unknown[] = [],
): Promise<WriteResult> {
  const user = await getUser(pageUserId);
  if (!user) return rejected("UNAUTHENTICATED");
  if (!uuid.safeParse(gameId).success) return rejected("INVALID_INPUT");
  const { rows } = await getPool().query<{ txid: string }>(sql, [
    gameId,
    user.id,
    ...params,
  ]);
  return toResult(rows[0]);
}

const TXID = "RETURNING pg_current_xact_id()::text AS txid";

export async function createGame(quizId: string) {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  if (!uuid.safeParse(quizId).success) redirect("/dashboard");
  const gameId = await createGameFor(user.id, quizId);
  redirect(gameId ? `/host/${gameId}` : "/dashboard");
}

/** Lobby, reveal or leaderboard → the next question, or the podium after the last one. */
export async function nextQuestion(
  gameId: string,
  pageUserId: string,
  fromIndex: number,
) {
  if (!index.safeParse(fromIndex).success) return rejected("INVALID_INPUT");
  return hostWrite(
    gameId,
    pageUserId,
    `UPDATE games g SET
       phase = CASE WHEN g.question_index + 1 < n.c THEN 'question' ELSE 'ended' END,
       question_index = CASE WHEN g.question_index + 1 < n.c THEN g.question_index + 1 ELSE g.question_index END,
       question_started_at = CASE WHEN g.question_index + 1 < n.c THEN now() ELSE g.question_started_at END,
       updated_at = now()
     FROM (SELECT count(*)::int AS c FROM questions q JOIN games gg ON gg.quiz_id = q.quiz_id WHERE gg.id = $1) n
     WHERE g.id = $1 AND g.host_id = $2 AND g.question_index = $3
       AND g.phase IN ('lobby', 'reveal', 'leaderboard')
     ${TXID}`,
    [fromIndex],
  );
}

export async function revealAnswer(
  gameId: string,
  pageUserId: string,
  atIndex: number,
) {
  if (!index.safeParse(atIndex).success) return rejected("INVALID_INPUT");
  return hostWrite(
    gameId,
    pageUserId,
    `UPDATE games SET phase = 'reveal', updated_at = now()
     WHERE id = $1 AND host_id = $2 AND question_index = $3 AND phase = 'question' ${TXID}`,
    [atIndex],
  );
}

export async function showLeaderboard(
  gameId: string,
  pageUserId: string,
  atIndex: number,
) {
  if (!index.safeParse(atIndex).success) return rejected("INVALID_INPUT");
  return hostWrite(
    gameId,
    pageUserId,
    `UPDATE games SET phase = 'leaderboard', updated_at = now()
     WHERE id = $1 AND host_id = $2 AND question_index = $3 AND phase = 'reveal' ${TXID}`,
    [atIndex],
  );
}

export async function endGame(gameId: string, pageUserId: string) {
  return hostWrite(
    gameId,
    pageUserId,
    `UPDATE games SET phase = 'ended', updated_at = now()
     WHERE id = $1 AND host_id = $2 AND phase <> 'ended' ${TXID}`,
  );
}

export async function setLocked(
  gameId: string,
  pageUserId: string,
  locked: boolean,
) {
  return hostWrite(
    gameId,
    pageUserId,
    `UPDATE games SET locked = $3, updated_at = now()
     WHERE id = $1 AND host_id = $2 AND locked <> $3 ${TXID}`,
    [locked === true],
  );
}

export async function kickPlayer(
  gameId: string,
  pageUserId: string,
  playerId: string,
) {
  if (!uuid.safeParse(playerId).success) return rejected("INVALID_INPUT");
  return hostWrite(
    gameId,
    pageUserId,
    `UPDATE players p SET kicked = true FROM games g
     WHERE g.id = $1 AND g.host_id = $2 AND p.game_id = g.id AND p.id = $3 AND NOT p.kicked ${TXID}`,
    [playerId],
  );
}
