import Link from "next/link";
import { redirect } from "next/navigation";

import { createGame } from "@/app/actions/game";
import {
  createSampleQuiz,
  deleteQuiz,
  duplicateQuiz,
} from "@/app/actions/quiz";
import { getUser } from "@/auth/server";
import { listQuizzes, listRecentGames } from "@/lib/quizzes";
import { AppHeader } from "@/ui/app-header";
import { Icon } from "@/ui/icons";
import { Mark } from "@/ui/shapes";

import { ConfirmButton } from "./confirm-button";

// Reads the session cookie: render per request, never at build.
export const dynamic = "force-dynamic";

export const metadata = { title: "Your quizzes" };

const PHASE_LABEL = {
  lobby: "In lobby",
  question: "Live",
  reveal: "Live",
  leaderboard: "Live",
  ended: "Finished",
} as const;

export default async function Dashboard() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in"); // backstop: proxy.ts already redirected
  const [quizzes, recent] = await Promise.all([
    listQuizzes(user.id),
    listRecentGames(user.id),
  ]);

  return (
    <>
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-bold">Your quizzes</h1>
          <Link className="btn-primary" href="/quizzes/new">
            <Icon name="plus" /> New quiz
          </Link>
        </div>

        {quizzes.length === 0 ? (
          <section className="surface flex flex-col items-center px-6 py-16 text-center">
            <Mark className="size-12" />
            <h2 className="mt-5 text-2xl font-bold">Write your first quiz</h2>
            <p className="mt-2 max-w-md text-navy-500">
              Start from scratch, or load a six-question sample and run a game
              in under a minute.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link className="btn-primary" href="/quizzes/new">
                <Icon name="plus" /> New quiz
              </Link>
              <form action={createSampleQuiz}>
                <button className="btn-quiet" type="submit">
                  Load sample quiz
                </button>
              </form>
            </div>
          </section>
        ) : (
          <ul className="surface divide-y divide-oat-300">
            {quizzes.map((q) => (
              <li
                className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
                key={q.id}
              >
                <div className="min-w-0 flex-1 basis-64">
                  <Link
                    className="text-lg font-semibold hover:underline hover:underline-offset-4"
                    href={`/quizzes/${q.id}/edit`}
                  >
                    {q.title}
                  </Link>
                  <p className="tabular mt-0.5 truncate text-sm text-navy-500">
                    {q.question_count}{" "}
                    {q.question_count === 1 ? "question" : "questions"} · played{" "}
                    {q.play_count} {q.play_count === 1 ? "time" : "times"}
                    {q.description && ` · ${q.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    aria-label={`Edit ${q.title}`}
                    className="btn-ghost"
                    href={`/quizzes/${q.id}/edit`}
                  >
                    <Icon name="edit" />
                    <span className="hidden md:inline">Edit</span>
                  </Link>
                  <form action={duplicateQuiz.bind(null, q.id)}>
                    <button
                      aria-label={`Duplicate ${q.title}`}
                      className="btn-ghost"
                      type="submit"
                    >
                      <Icon name="copy" />
                      <span className="hidden md:inline">Duplicate</span>
                    </button>
                  </form>
                  <ConfirmButton
                    action={deleteQuiz.bind(null, q.id)}
                    label={`Delete ${q.title}`}
                    message={`Delete "${q.title}" and all its game reports?`}
                  />
                  <form action={createGame.bind(null, q.id)}>
                    <button
                      className="btn-primary ml-2"
                      disabled={q.question_count === 0}
                      type="submit"
                    >
                      <Icon name="play" /> Host
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 text-xl font-bold">Recent games</h2>
            <ul className="surface divide-y divide-oat-300">
              {recent.map((g) => (
                <li
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3"
                  key={g.id}
                >
                  <span className="min-w-0 flex-1 basis-48 truncate font-semibold">
                    {g.title}
                  </span>
                  <span className="tabular text-sm text-navy-500">
                    {g.player_count}{" "}
                    {g.player_count === 1 ? "player" : "players"} ·{" "}
                    {g.created_at.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${g.phase === "ended" ? "bg-oat-200 text-navy-500" : "bg-lava-50 text-lava-600"}`}
                  >
                    {PHASE_LABEL[g.phase]}
                  </span>
                  <Link
                    className="btn-ghost"
                    href={
                      g.phase === "ended" ? `/reports/${g.id}` : `/host/${g.id}`
                    }
                  >
                    {g.phase === "ended" ? "Report" : "Resume"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
