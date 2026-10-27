import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getUser } from "@/auth/server";
import { getReport, sharedRanks } from "@/lib/reports";
import { AppHeader } from "@/ui/app-header";
import { Icon } from "@/ui/icons";

export const metadata = { title: "Report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const report = await getReport(gameId, user.id);
  if (!report) notFound();
  const { game, players, questions } = report;
  const rankOf = sharedRanks(players);

  return (
    <>
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <Link className="btn-ghost -ml-3 mb-4" href="/dashboard">
          <Icon name="back" /> Quizzes
        </Link>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">{game.title}</h1>
            <p className="tabular mt-1 text-ink-muted">
              {game.created_at.toLocaleString("en", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · PIN <span className="font-mono">{game.pin}</span> ·{" "}
              {players.length} {players.length === 1 ? "player" : "players"}
            </p>
          </div>
          <a className="btn-quiet" download href={`/reports/${gameId}/csv`}>
            <Icon name="download" /> Download CSV
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
          <section>
            <h2 className="mb-3 text-xl font-bold">Standings</h2>
            <div className="surface overflow-x-auto">
              <table className="tabular w-full text-left">
                <thead className="border-b border-rule text-sm text-ink-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-2 py-3 font-semibold">Player</th>
                    <th className="px-2 py-3 text-right font-semibold">
                      Correct
                    </th>
                    <th className="px-2 py-3 text-right font-semibold">
                      Avg time
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {players.map((p, i) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3 text-ink-muted">{rankOf[i]}</td>
                      <td className="px-2 py-3 font-semibold">{p.nickname}</td>
                      <td className="px-2 py-3 text-right">
                        {p.correct}/{questions.length}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {p.avg_ms == null
                          ? "–"
                          : `${(p.avg_ms / 1000).toFixed(1)}s`}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {p.score}
                      </td>
                    </tr>
                  ))}
                  {players.length === 0 && (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-ink-muted"
                        colSpan={5}
                      >
                        Nobody played this game.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">Questions</h2>
            <ol className="surface divide-y divide-rule">
              {questions.map((q) => {
                const pct = q.answered
                  ? Math.round((q.correct / q.answered) * 100)
                  : 0;
                return (
                  <li className="px-5 py-4" key={q.position}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="min-w-0 font-medium">
                        <span className="tabular mr-2 text-sm text-ink-muted">
                          {q.position + 1}
                        </span>
                        {q.body}
                      </p>
                      <span
                        className={`tabular shrink-0 font-semibold ${pct < 50 ? "text-action" : "text-q-olive"}`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
                    >
                      <div
                        className={`h-full rounded-full ${pct < 50 ? "bg-action" : "bg-q-olive"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="tabular mt-1.5 text-xs text-ink-muted">
                      {q.correct} of {q.answered} answered correctly
                    </p>
                  </li>
                );
              })}
              {questions.length === 0 && (
                <li className="px-5 py-8 text-center text-ink-muted">
                  The game ended before the first question.
                </li>
              )}
            </ol>
          </section>
        </div>
      </main>
    </>
  );
}
