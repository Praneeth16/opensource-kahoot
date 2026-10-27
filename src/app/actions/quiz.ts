"use server";

import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { quizInput, type QuizInput } from "@/lib/quiz-input";
import { getQuizDocument } from "@/lib/quizzes";
import { sampleQuiz } from "@/lib/sample-quiz";
import { choices, games, questions, quizzes } from "@/lib/schema";

export type SaveResult =
  { kind: "saved"; id: string } | { kind: "rejected"; reason: string };

class Rejected extends Error {}

/**
 * Saves the whole quiz document. Rows are upserted by id (ids come from the editor) and only rows the
 * editor dropped are deleted, so answers from past games keep pointing at their questions. Every upsert
 * is scoped to this quiz, so a forged id from someone else's quiz updates nothing and rolls back.
 */
export async function saveQuiz(raw: QuizInput): Promise<SaveResult> {
  const user = await getUser();
  if (!user)
    return { kind: "rejected", reason: "Your session ended. Sign in again." };
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
          owner_id: user.id,
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
          setWhere: eq(quizzes.owner_id, user.id),
        })
        .returning({ id: quizzes.id });
      if (!own) throw new Rejected("This quiz belongs to someone else.");

      const [live] = await tx
        .select({ id: games.id })
        .from(games)
        .where(and(eq(games.quiz_id, doc.id), ne(games.phase, "ended")))
        .limit(1);
      if (live)
        throw new Rejected(
          "End the running game of this quiz before editing it.",
        );

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
  revalidatePath("/dashboard");
  return { kind: "saved", id: doc.id };
}

const idInput = z.uuid();

export async function duplicateQuiz(quizId: string) {
  const user = await getUser();
  if (!user || !idInput.safeParse(quizId).success) return;
  const doc = await getQuizDocument(user.id, quizId);
  if (!doc) return;
  const copy: QuizInput = {
    ...doc,
    id: crypto.randomUUID(),
    title: `${doc.title} (copy)`.slice(0, 120),
    questions: doc.questions.map((q) => ({
      ...q,
      id: crypto.randomUUID(),
      choices: q.choices.map((c) => ({ ...c, id: crypto.randomUUID() })),
    })),
  };
  await saveQuiz(copy);
  revalidatePath("/dashboard");
}

export async function deleteQuiz(quizId: string) {
  const user = await getUser();
  if (!user || !idInput.safeParse(quizId).success) return;
  await getDb()
    .delete(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.owner_id, user.id)));
  revalidatePath("/dashboard");
}

export async function createSampleQuiz() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const result = await saveQuiz(sampleQuiz());
  if (result.kind === "saved") redirect(`/quizzes/${result.id}/edit`);
  revalidatePath("/dashboard");
}
