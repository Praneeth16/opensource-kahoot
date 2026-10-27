"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/auth/server";
import type { QuizInput } from "@/lib/quiz-input";
import { deleteQuizFor, saveQuizFor, type SaveResult } from "@/lib/quiz-store";
import { getQuizDocument } from "@/lib/quizzes";
import { sampleQuiz } from "@/lib/sample-quiz";

export type { SaveResult };

export async function saveQuiz(raw: QuizInput): Promise<SaveResult> {
  const user = await getUser();
  if (!user)
    return { kind: "rejected", reason: "Your session ended. Sign in again." };
  const result = await saveQuizFor(user.id, raw);
  if (result.kind === "saved") revalidatePath("/dashboard");
  return result;
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
  await deleteQuizFor(user.id, quizId);
  revalidatePath("/dashboard");
}

export async function createSampleQuiz() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const result = await saveQuiz(sampleQuiz());
  if (result.kind === "saved") redirect(`/quizzes/${result.id}/edit`);
  revalidatePath("/dashboard");
}
