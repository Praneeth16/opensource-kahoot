import { redirect } from "next/navigation";

import { getUser } from "@/auth/server";
import { AppHeader } from "@/ui/app-header";

import { blankQuestion } from "@/lib/quiz-input";

import { QuizEditor } from "../quiz-editor";

// Reads the session cookie: render per request, never at build.
export const dynamic = "force-dynamic";

export const metadata = { title: "New quiz" };

export default async function NewQuiz() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  return (
    <>
      <AppHeader email={user.email} />
      <QuizEditor
        initial={{
          id: crypto.randomUUID(),
          title: "",
          description: "",
          questions: [blankQuestion()],
        }}
        isNew
      />
    </>
  );
}
