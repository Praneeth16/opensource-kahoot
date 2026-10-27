import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "./db";
import type { QuizInput } from "./quiz-input";
import { choices, games, questions, quizzes } from "./schema";

export async function listQuizzes(ownerId: string) {
  return getDb()
    .select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      updated_at: quizzes.updated_at,
      // Raw "quizzes"."id": an interpolated column compiles unqualified and would resolve to q.id.
      question_count: sql<number>`(SELECT count(*)::int FROM questions q WHERE q.quiz_id = "quizzes"."id")`,
      play_count: sql<number>`(SELECT count(*)::int FROM games g JOIN quizzes s ON s.id = g.quiz_id WHERE s.source_quiz_id = "quizzes"."id")`,
    })
    .from(quizzes)
    .where(and(eq(quizzes.owner_id, ownerId), isNull(quizzes.source_quiz_id)))
    .orderBy(desc(quizzes.updated_at));
}

export async function listRecentGames(hostId: string) {
  return getDb()
    .select({
      id: games.id,
      phase: games.phase,
      pin: games.pin,
      created_at: games.created_at,
      title: quizzes.title,
      player_count: sql<number>`(SELECT count(*)::int FROM players p WHERE p.game_id = "games"."id" AND NOT p.kicked)`,
    })
    .from(games)
    .innerJoin(quizzes, eq(quizzes.id, games.quiz_id))
    .where(eq(games.host_id, hostId))
    .orderBy(desc(games.created_at))
    .limit(8);
}

/** The whole quiz document in editor shape, or null if it isn't the owner's. */
export async function getQuizDocument(
  ownerId: string,
  quizId: string,
): Promise<QuizInput | null> {
  const db = getDb();
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.owner_id, ownerId),
        isNull(quizzes.source_quiz_id), // a game's snapshot is not editable
      ),
    );
  if (!quiz) return null;
  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.quiz_id, quizId))
    .orderBy(asc(questions.position));
  const cs = qs.length
    ? await db
        .select()
        .from(choices)
        .where(
          inArray(
            choices.question_id,
            qs.map((q) => q.id),
          ),
        )
        .orderBy(asc(choices.position))
    : [];
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    questions: qs.map((q) => ({
      id: q.id,
      kind: q.kind,
      body: q.body,
      image_url: q.image_url ?? "",
      time_limit_s: q.time_limit_s,
      points: q.points,
      choices: cs
        .filter((c) => c.question_id === q.id)
        .map((c) => ({ id: c.id, body: c.body, is_correct: c.is_correct })),
    })),
  };
}
