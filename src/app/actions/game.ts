"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { getPool } from "@/lib/db";
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
  const client = await getPool().connect();
  let gameId: string | undefined;
  try {
    await client.query("BEGIN");
    // Lock the quiz so a concurrent save can't change it mid-copy.
    const { rowCount } = await client.query(
      `SELECT 1 FROM quizzes z WHERE z.id = $1 AND z.owner_id = $2 AND z.source_quiz_id IS NULL
         AND EXISTS (SELECT 1 FROM questions q WHERE q.quiz_id = z.id)
       FOR UPDATE`,
      [quizId, user.id],
    );
    if (rowCount) {
      // One running game per quiz: a new one ends the host's earlier lobby or abandoned game.
      await client.query(
        `UPDATE games g SET phase = 'ended', updated_at = now() FROM quizzes s
         WHERE s.id = g.quiz_id AND s.source_quiz_id = $1 AND g.host_id = $2 AND g.phase <> 'ended'`,
        [quizId, user.id],
      );
      // The game plays a frozen snapshot, so later edits never change a running or past game.
      const {
        rows: [snap],
      } = await client.query<{ id: string }>(
        `INSERT INTO quizzes (owner_id, title, description, source_quiz_id)
         SELECT owner_id, title, description, id FROM quizzes WHERE id = $1 RETURNING id`,
        [quizId],
      );
      await client.query(
        `WITH qmap AS MATERIALIZED (
           SELECT id AS old_id, gen_random_uuid() AS new_id FROM questions WHERE quiz_id = $1
         ), qs AS (
           INSERT INTO questions (id, quiz_id, position, kind, body, image_url, time_limit_s, points)
           SELECT m.new_id, $2, q.position, q.kind, q.body, q.image_url, q.time_limit_s, q.points
           FROM questions q JOIN qmap m ON m.old_id = q.id
         )
         INSERT INTO choices (question_id, position, body, is_correct)
         SELECT m.new_id, c.position, c.body, c.is_correct FROM choices c JOIN qmap m ON m.old_id = c.question_id`,
        [quizId, snap!.id],
      );
      // A PIN is unique among running games; retry the rare collision.
      for (let attempt = 0; attempt < 5 && !gameId; attempt++) {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO games (quiz_id, host_id, pin) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING RETURNING id`,
          [snap!.id, user.id, String(randomInt(100000, 1000000))],
        );
        gameId = rows[0]?.id;
      }
    }
    await client.query(gameId ? "COMMIT" : "ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
