"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  endGame,
  kickPlayer,
  nextQuestion,
  revealAnswer,
  setLocked,
  showLeaderboard,
} from "@/app/actions/game";
import {
  AnswerTile,
  rank,
  splitQuestion,
  TimerBar,
  useNow,
} from "@/app/game-ui";
import { type Loaded, msLeft, useLive, type Viewer } from "@/app/use-live";
import { leaveSession } from "@/auth/session-lost";
import type {
  GameStateRow,
  PlayerRow,
  QuestionRow,
  StandingRow,
  TallyRow,
} from "@/lib/live";
import type { WriteResult } from "@/lib/result";
import { Icon } from "@/ui/icons";
import { ANSWER_STYLES, Shape, Wordmark } from "@/ui/shapes";

const SYNC_TIMEOUT_MS = 10_000;

export function HostGame({
  gameId,
  userId,
  host,
  qrSvg,
  serverNow,
  initial,
}: {
  gameId: string;
  userId: string;
  host: string;
  qrSvg: string;
  serverNow: number;
  initial: {
    game: Loaded<GameStateRow>;
    question: Loaded<QuestionRow>;
    players: Loaded<PlayerRow>;
    tally: Loaded<TallyRow>;
    standings: Loaded<StandingRow>;
  };
}) {
  const [viewer] = useState<Viewer>({ role: "host", userId });
  const [clockOffset] = useState(() => serverNow - Date.now());
  const gameLive = useLive(gameId, "game", initial.game, viewer);
  const game = gameLive.rows[0]!;
  const question = splitQuestion(
    useLive(gameId, "question", initial.question, viewer).rows,
    game.question_index,
  );
  const players = useLive(gameId, "players", initial.players, viewer).rows;
  const tally = useLive(gameId, "tally", initial.tally, viewer).rows;
  const standings = useLive(
    gameId,
    "standings",
    initial.standings,
    viewer,
  ).rows;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Host writes are guarded on the phase and index the screen shows; wait until the game row reflects
  // the write so a second click can't race the first.
  function run(write: () => Promise<WriteResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await write();
        if (result.kind === "rejected") {
          if (result.reason === "UNAUTHENTICATED") leaveSession("/dashboard");
          else setError("That didn't work. Try again.");
          return;
        }
        if (result.kind === "committed")
          await gameLive.utils
            .awaitTxId(result.txid, SYNC_TIMEOUT_MS)
            .catch(() => {});
      } catch {
        setError("Connection lost. Check your network and try again.");
      }
    });
  }

  const answered = question
    ? tally
        .filter((t) => t.question_id === question.id)
        .reduce((n, t) => n + t.n, 0)
    : 0;
  const now = useNow(game.phase === "question");
  const left = question
    ? msLeft(game.question_started_at, question.time_limit_s, clockOffset, now)
    : 0;

  // Reveal automatically when time runs out or everyone has answered. Once per question.
  const autoRevealed = useRef(-1);
  const shouldReveal =
    game.phase === "question" &&
    !!question &&
    (left <= 0 || (players.length > 0 && answered >= players.length));
  useEffect(() => {
    if (!shouldReveal || autoRevealed.current === game.question_index) return;
    autoRevealed.current = game.question_index;
    run(() => revealAnswer(gameId, userId, game.question_index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, game.question_index]);

  const isLast = game.question_index + 1 >= game.question_count;
  const next = () =>
    run(() => nextQuestion(gameId, userId, game.question_index));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-oat-300 bg-white px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link aria-label="Back to dashboard" href="/dashboard">
            <Wordmark />
          </Link>
          <span className="hidden truncate text-navy-500 sm:inline">
            {game.quiz_title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {game.phase !== "lobby" && game.phase !== "ended" && (
            <span className="tabular mr-2 font-mono text-sm text-navy-500">
              PIN {game.pin}
            </span>
          )}
          {game.phase !== "ended" && (
            <button
              className="btn-ghost"
              disabled={pending}
              onClick={() => {
                if (confirm("End this game for everyone?"))
                  run(() => endGame(gameId, userId));
              }}
              type="button"
            >
              <Icon name="stop" /> End game
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="notice-error mx-6 mt-4" role="alert">
          {error}
        </p>
      )}

      {game.phase === "lobby" && (
        <Lobby
          game={game}
          host={host}
          onKick={(id) => run(() => kickPlayer(gameId, userId, id))}
          onLock={() => run(() => setLocked(gameId, userId, !game.locked))}
          onStart={next}
          pending={pending}
          players={players}
          qrSvg={qrSvg}
        />
      )}

      {(game.phase === "question" || game.phase === "reveal") && question && (
        <main className="flex flex-1 flex-col gap-6 px-6 py-6 lg:px-10">
          <div className="flex items-center justify-between gap-4 text-navy-500">
            <span className="font-semibold">
              Question {game.question_index + 1} of {game.question_count}
              {question.points === "double" && (
                <span className="ml-3 rounded-full bg-gold px-2.5 py-0.5 text-sm text-navy">
                  Double points
                </span>
              )}
            </span>
            <span className="tabular">
              {answered} / {players.length} answered
            </span>
          </div>

          {game.phase === "question" ? (
            <TimerBar
              leftMs={left}
              size="lg"
              totalMs={question.time_limit_s * 1000}
            />
          ) : (
            <div className="h-12" />
          )}

          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <h1 className="max-w-5xl text-center text-4xl leading-tight font-bold lg:text-6xl">
              {question.body}
            </h1>
            {question.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="max-h-[32vh] rounded-[var(--radius-tile)] object-contain"
                src={question.image_url}
              />
            )}
            {game.phase === "reveal" && (
              <Distribution
                choices={question.choices}
                questionId={question.id}
                tally={tally}
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {question.choices.map((choice) => (
              <AnswerTile
                choice={choice}
                key={choice.id}
                size="lg"
                state={
                  game.phase === "reveal"
                    ? choice.is_correct
                      ? "correct"
                      : "wrong"
                    : "idle"
                }
              />
            ))}
          </div>

          <div className="flex justify-end">
            {game.phase === "question" ? (
              <button
                className="btn-quiet"
                disabled={pending}
                onClick={() =>
                  run(() => revealAnswer(gameId, userId, game.question_index))
                }
                type="button"
              >
                Reveal now
              </button>
            ) : (
              <button
                className="btn-primary btn-lg"
                disabled={pending}
                onClick={() =>
                  isLast
                    ? next()
                    : run(() =>
                        showLeaderboard(gameId, userId, game.question_index),
                      )
                }
                type="button"
              >
                {isLast ? "Final results" : "Leaderboard"} <Icon name="next" />
              </button>
            )}
          </div>
        </main>
      )}

      {game.phase === "leaderboard" && (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-10">
          <h1 className="text-center text-5xl font-bold">Leaderboard</h1>
          <Standings rows={standings} top={5} />
          <div className="flex justify-center">
            <button
              className="btn-primary btn-lg"
              disabled={pending}
              onClick={next}
              type="button"
            >
              Next question <Icon name="next" />
            </button>
          </div>
        </main>
      )}

      {game.phase === "ended" && (
        <Podium gameId={gameId} standings={standings} />
      )}
    </div>
  );
}

function Lobby({
  game,
  host,
  qrSvg,
  players,
  pending,
  onStart,
  onLock,
  onKick,
}: {
  game: GameStateRow;
  host: string;
  qrSvg: string;
  players: readonly PlayerRow[];
  pending: boolean;
  onStart: () => void;
  onLock: () => void;
  onKick: (id: string) => void;
}) {
  return (
    <main className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <section className="flex flex-col justify-center gap-8 px-6 py-10 lg:px-14">
        <div>
          <p className="text-xl text-navy-500">
            Join at <strong className="text-navy">{host}</strong> with PIN
          </p>
          <p className="tabular mt-2 font-mono text-[clamp(4.5rem,12vw,9rem)] leading-none font-medium tracking-[0.04em]">
            {game.pin.slice(0, 3)}
            <span className="inline-block w-[0.3em]" />
            {game.pin.slice(3)}
          </p>
        </div>
        <div className="flex items-end gap-6">
          <div
            aria-label="QR code to join this game"
            className="size-40 shrink-0 rounded-xl bg-white p-3 shadow-lift [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
          />
          <p className="max-w-56 pb-2 text-navy-500">
            Or scan with a phone camera to jump straight in.
          </p>
        </div>
      </section>

      <section className="flex flex-col border-t border-oat-300 bg-white px-6 py-8 lg:border-t-0 lg:border-l lg:px-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Icon className="size-6" name="users" />
            <span className="tabular">{players.length}</span>
            {players.length === 1 ? "player" : "players"}
          </h2>
          <button
            className="btn-ghost"
            disabled={pending}
            onClick={onLock}
            type="button"
          >
            <Icon name={game.locked ? "lock" : "unlock"} />
            {game.locked ? "Locked" : "Lock"}
          </button>
        </div>

        {players.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-12 text-center text-navy-500">
            Waiting for players to join…
          </p>
        ) : (
          <ul
            className="flex flex-1 flex-wrap content-start gap-2"
            aria-live="polite"
          >
            {players.map((p) => (
              <li
                className="animate-rise group flex items-center gap-1 rounded-full bg-oat-200 py-1.5 pr-1.5 pl-4 text-lg font-semibold"
                key={p.id}
              >
                {p.nickname}
                <button
                  aria-label={`Remove ${p.nickname}`}
                  className="grid size-7 cursor-pointer place-items-center rounded-full text-navy-500 opacity-60 hover:bg-white hover:text-lava-600 hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => onKick(p.id)}
                  type="button"
                >
                  <Icon className="size-4" name="x" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          className="btn-primary btn-lg mt-8 w-full"
          disabled={pending || players.length === 0}
          onClick={onStart}
          type="button"
        >
          <Icon name="play" /> Start game
        </button>
      </section>
    </main>
  );
}

function Distribution({
  choices,
  tally,
  questionId,
}: {
  choices: { id: string; position: number; is_correct: boolean | null }[];
  tally: readonly TallyRow[];
  questionId: string;
}) {
  const counts = choices.map(
    (c) =>
      tally.find((t) => t.question_id === questionId && t.choice_id === c.id)
        ?.n ?? 0,
  );
  const max = Math.max(1, ...counts);
  return (
    <div
      aria-label="How players answered"
      className="flex h-40 items-end gap-4"
      role="img"
    >
      {choices.map((c, i) => {
        const style = ANSWER_STYLES[c.position % 4]!;
        return (
          <div
            className="flex w-16 flex-col items-center gap-2 lg:w-24"
            key={c.id}
          >
            <span className="tabular text-2xl font-medium">{counts[i]}</span>
            <div
              className={`animate-grow-up w-full rounded-t-lg ${c.is_correct ? style.bar : "bg-oat-300"}`}
              style={{
                height: `${Math.max(4, (counts[i]! / max) * 100)}px`,
                animationDelay: `${i * 60}ms`,
              }}
            />
            <Shape className="size-5" index={c.position} />
          </div>
        );
      })}
    </div>
  );
}

function Standings({
  rows,
  top,
}: {
  rows: readonly StandingRow[];
  top: number;
}) {
  const ranked = useMemo(() => rank(rows).slice(0, top), [rows, top]);
  if (!ranked.length)
    return <p className="text-center text-navy-500">No players.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {ranked.map((r, i) => (
        <li
          className="animate-rise flex items-center gap-5 rounded-[var(--radius-tile)] bg-white px-6 py-4 text-2xl shadow-lift"
          key={r.id}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="tabular w-10 text-navy-500">{r.rank}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {r.nickname}
          </span>
          <span className="tabular font-semibold">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}

function Podium({
  gameId,
  standings,
}: {
  gameId: string;
  standings: readonly StandingRow[];
}) {
  const ranked = useMemo(() => rank(standings), [standings]);
  // Visual order 2nd, 1st, 3rd; heights by place.
  const places = [
    { r: ranked[1], h: "h-40", label: "2nd", delay: "300ms" },
    { r: ranked[0], h: "h-56", label: "1st", delay: "700ms" },
    { r: ranked[2], h: "h-28", label: "3rd", delay: "0ms" },
  ];
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 px-6 py-10">
      <h1 className="text-5xl font-bold">Podium</h1>
      <div className="flex w-full items-end justify-center gap-4">
        {places
          .filter(({ r }) => r)
          .map(({ r, h, label, delay }) => (
            <div
              className="flex w-1/3 max-w-60 flex-col items-center gap-3"
              key={label}
            >
              {r && (
                <div
                  className="animate-rise text-center"
                  style={{ animationDelay: delay }}
                >
                  <p className="truncate text-2xl font-bold">{r.nickname}</p>
                  <p className="tabular text-navy-500">{r.score}</p>
                </div>
              )}
              <div
                className={`animate-grow-up flex w-full items-start justify-center rounded-t-[var(--radius-tile)] pt-4 text-3xl font-bold ${h} ${label === "1st" ? "bg-lava text-white" : "bg-navy text-white"}`}
                style={{ animationDelay: delay }}
              >
                {label}
              </div>
            </div>
          ))}
      </div>
      <div className="flex gap-3">
        <Link className="btn-quiet" href={`/reports/${gameId}`}>
          View report
        </Link>
        <Link className="btn-dark" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
