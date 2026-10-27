import "server-only";

import { randomInt } from "node:crypto";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";

import { getDb, getPool } from "./db";
import { quizInput, type QuizInput } from "./quiz-input";
import { choices, questions, quizzes } from "./schema";

// The write paths shared by the web UI (Server Actions, which supply the session's user) and the MCP
// endpoint (which supplies the API token's owner). Callers must pass an authenticated user id.

export type SaveResult =
  { kind: "saved"; id: string } | { kind: "rejected"; reason: string };

class Rejected extends Error {}

/**
 * Saves the whole quiz document. Rows are upserted by id and only rows the document dropped are
 * deleted. Every upsert is scoped to this quiz, so a forged id from someone else's quiz updates nothing
 * and rolls back. Games play snapshots (createGameFor), so editing never touches a running or past game.
 */
export async function saveQuizFor(
  userId: string,
  raw: QuizInput,
): Promise<SaveResult> {
  const parsed = quizInput.safeParse(raw);
  if (!parsed.success)
    return {
      kind: "rejected",
      reason: parsed.error.issues[0]?.message ?? "Check the quiz for errors.",
    };
  const doc = parsed.data;

  try {
    await getDb().transaction(async (tx) => {
      const [own] = await tx
        .insert(quizzes)
        .values({
          id: doc.id,
          owner_id: userId,
          title: doc.title,
          description: doc.description,
        })
        .onConflictDoUpdate({
          target: quizzes.id,
          set: {
            title: doc.title,
            description: doc.description,
            updated_at: sql`now()`,
          },
          setWhere: and(
            eq(quizzes.owner_id, userId),
            isNull(quizzes.source_quiz_id),
          ),
        })
        .returning({ id: quizzes.id });
      if (!own) throw new Rejected("This quiz belongs to someone else.");

      const questionIds = doc.questions.map((q) => q.id);
      await tx
        .delete(questions)
        .where(
          and(
            eq(questions.quiz_id, doc.id),
            notInArray(questions.id, questionIds),
          ),
        );
      const savedQuestions = await tx
        .insert(questions)
        .values(
          doc.questions.map((q, position) => ({
            id: q.id,
            quiz_id: doc.id,
            position,
            kind: q.kind,
            body: q.body,
            image_url: q.image_url,
            time_limit_s: q.time_limit_s,
            points: q.points,
          })),
        )
        .onConflictDoUpdate({
          target: questions.id,
          set: {
            position: sql`excluded.position`,
            kind: sql`excluded.kind`,
            body: sql`excluded.body`,
            image_url: sql`excluded.image_url`,
            time_limit_s: sql`excluded.time_limit_s`,
            points: sql`excluded.points`,
          },
          setWhere: sql`${questions.quiz_id} = excluded.quiz_id`,
        })
        .returning({ id: questions.id });
      if (savedQuestions.length !== doc.questions.length)
        throw new Rejected("Some questions belong to another quiz.");

      const allChoices = doc.questions.flatMap((q) =>
        q.choices.map((c, position) => ({
          id: c.id,
          question_id: q.id,
          position,
          body: c.body,
          is_correct: c.is_correct,
        })),
      );
      await tx.delete(choices).where(
        and(
          inArray(choices.question_id, questionIds),
          notInArray(
            choices.id,
            allChoices.map((c) => c.id),
          ),
        ),
      );
      const savedChoices = await tx
        .insert(choices)
        .values(allChoices)
        .onConflictDoUpdate({
          target: choices.id,
          set: {
            position: sql`excluded.position`,
            body: sql`excluded.body`,
            is_correct: sql`excluded.is_correct`,
          },
          setWhere: sql`${choices.question_id} = excluded.question_id`,
        })
        .returning({ id: choices.id });
      if (savedChoices.length !== allChoices.length)
        throw new Rejected("Some answers belong to another question.");
    });
  } catch (error) {
    if (error instanceof Rejected)
      return { kind: "rejected", reason: error.message };
    throw error;
  }
  return { kind: "saved", id: doc.id };
}

/** Deletes the host's quiz, its snapshots, their games and reports. False if it isn't theirs. */
export async function deleteQuizFor(userId: string, quizId: string) {
  const rows = await getDb()
    .delete(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.owner_id, userId),
        isNull(quizzes.source_quiz_id),
      ),
    )
    .returning({ id: quizzes.id });
  return rows.length > 0;
}

/**
 * Starts a game of the host's quiz on a frozen snapshot, ending their earlier unfinished game of it.
 * Returns the game id, or null if the quiz isn't theirs or has no questions.
 */
export async function createGameFor(userId: string, quizId: string) {
  const client = await getPool().connect();
  let gameId: string | undefined;
  try {
    await client.query("BEGIN");
    // Lock the quiz so a concurrent save can't change it mid-copy.
    const { rowCount } = await client.query(
      `SELECT 1 FROM quizzes z WHERE z.id = $1 AND z.owner_id = $2 AND z.source_quiz_id IS NULL
         AND EXISTS (SELECT 1 FROM questions q WHERE q.quiz_id = z.id)
       FOR UPDATE`,
      [quizId, userId],
    );
    if (rowCount) {
      // One running game per quiz: a new one ends the host's earlier lobby or abandoned game.
      await client.query(
        `UPDATE games g SET phase = 'ended', updated_at = now() FROM quizzes s
         WHERE s.id = g.quiz_id AND s.source_quiz_id = $1 AND g.host_id = $2 AND g.phase <> 'ended'`,
        [quizId, userId],
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
          [snap!.id, userId, String(randomInt(100000, 1000000))],
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
  return gameId ?? null;
}
