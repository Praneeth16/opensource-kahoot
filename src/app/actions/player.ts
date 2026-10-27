"use server";

import { z } from "zod";

import { getPool } from "@/lib/db";
import {
  getPlayer,
  newPlayerToken,
  setPlayerCookie,
} from "@/lib/player-session";
import { rejected, toResult, type WriteResult } from "@/lib/result";

const MAX_PLAYERS = 300;

export type JoinResult =
  { kind: "joined"; gameId: string } | { kind: "rejected"; reason: string };

const joinInput = z.object({
  pin: z.string().regex(/^\d{6}$/),
  nickname: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[\p{L}\p{N} _.!?'-]+$/u),
});

export async function findGame(
  pin: string,
): Promise<{ kind: "found" } | { kind: "rejected"; reason: string }> {
  if (!/^\d{6}$/.test(pin))
    return { kind: "rejected", reason: "A game PIN has 6 digits." };
  const { rows } = await getPool().query<{ locked: boolean }>(
    "SELECT locked FROM games WHERE pin = $1 AND phase <> 'ended'",
    [pin],
  );
  if (!rows[0])
    return { kind: "rejected", reason: "No running game has that PIN." };
  if (rows[0].locked)
    return { kind: "rejected", reason: "The host has locked this game." };
  return { kind: "found" };
}

export async function joinGame(raw: {
  pin: string;
  nickname: string;
}): Promise<JoinResult> {
  const input = joinInput.safeParse(raw);
  if (!input.success)
    return {
      kind: "rejected",
      reason: "Use 1–20 letters, numbers or spaces for your nickname.",
    };
  const { pin, nickname } = input.data;
  const pool = getPool();
  const { rows: found } = await pool.query<{ id: string; locked: boolean }>(
    "SELECT id, locked FROM games WHERE pin = $1 AND phase <> 'ended'",
    [pin],
  );
  const game = found[0];
  if (!game)
    return { kind: "rejected", reason: "No running game has that PIN." };

  // Same browser coming back (reload, closed tab): keep its player.
  if (await getPlayer(game.id)) return { kind: "joined", gameId: game.id };
  if (game.locked)
    return { kind: "rejected", reason: "The host has locked this game." };

  const { token, tokenHash } = newPlayerToken();
  const client = await pool.connect();
  let playerId: string | undefined;
  try {
    await client.query("BEGIN");
    // Lock the game row first, in its own statement, so lock/end/capacity are read after any
    // concurrent join or host action has committed: joins at the cap queue instead of overshooting.
    const { rowCount } = await client.query(
      "SELECT 1 FROM games WHERE id = $1 AND phase <> 'ended' AND NOT locked FOR UPDATE",
      [game.id],
    );
    if (rowCount) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO players (game_id, nickname, token_hash)
         SELECT $1, $2, $3
         WHERE (SELECT count(*) FROM players WHERE game_id = $1 AND NOT kicked) < $4
         RETURNING id`,
        [game.id, nickname, tokenHash, MAX_PLAYERS],
      );
      playerId = rows[0]?.id;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505")
      return {
        kind: "rejected",
        reason: "That nickname is taken. Pick another.",
      };
    throw error;
  } finally {
    client.release();
  }
  if (!playerId)
    return { kind: "rejected", reason: "This game is locked, ended or full." };
  await setPlayerCookie(game.id, playerId, token);
  return { kind: "joined", gameId: game.id };
}

/**
 * Scores in the insert itself, from the database clock: a correct answer earns up to 1000 points,
 * falling linearly to 500 at the time limit (doubled or zeroed by the question's points setting).
 * Late answers (past the limit plus a 500 ms grace) and second answers insert nothing.
 */
export async function submitAnswer(
  gameId: string,
  choiceId: string,
): Promise<WriteResult> {
  if (
    !z.uuid().safeParse(gameId).success ||
    !z.uuid().safeParse(choiceId).success
  )
    return rejected("INVALID_INPUT");
  const player = await getPlayer(gameId);
  if (!player) return rejected("UNAUTHENTICATED");
  const { rows } = await getPool().query<{ txid: string }>(
    `WITH t AS (
       SELECT g.id AS game_id, q.id AS question_id, c.id AS choice_id, c.is_correct, q.points, q.time_limit_s,
         extract(epoch FROM (clock_timestamp() - g.question_started_at)) AS elapsed
       FROM games g
       JOIN players pl ON pl.id = $2 AND pl.game_id = g.id AND NOT pl.kicked
       JOIN questions q ON q.quiz_id = g.quiz_id AND q.position = g.question_index
       JOIN choices c ON c.question_id = q.id AND c.id = $3
       WHERE g.id = $1 AND g.phase = 'question'
       -- Waits for a concurrent reveal/end/kick to commit, then re-checks the rows: no answer lands late.
       FOR SHARE OF g, pl
     )
     INSERT INTO answers (game_id, player_id, question_id, choice_id, is_correct, points, answered_ms)
     SELECT game_id, $2, question_id, choice_id, is_correct,
       CASE WHEN is_correct AND points <> 'none'
         THEN round(1000 * (1 - least(1, greatest(0, elapsed) / time_limit_s) / 2))::int
              * CASE WHEN points = 'double' THEN 2 ELSE 1 END
         ELSE 0 END,
       greatest(0, elapsed * 1000)::int
     FROM t
     WHERE elapsed <= time_limit_s + 0.5
     ON CONFLICT (player_id, question_id) DO NOTHING
     RETURNING pg_current_xact_id()::text AS txid`,
    [gameId, player.id, choiceId],
  );
  return toResult(rows[0]);
}
