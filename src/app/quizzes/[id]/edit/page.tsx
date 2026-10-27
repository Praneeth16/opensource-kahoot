import { notFound, redirect } from "next/navigation";

import { getUser } from "@/auth/server";
import { getQuizDocument } from "@/lib/quizzes";
import { AppHeader } from "@/ui/app-header";

import { QuizEditor } from "../../quiz-editor";

export const metadata = { title: "Edit quiz" };

export default async function EditQuiz({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const doc = await getQuizDocument(user.id, id);
  if (!doc) notFound();
  return (
    <>
      <AppHeader email={user.email} />
      <QuizEditor initial={doc} />
    </>
  );
}
