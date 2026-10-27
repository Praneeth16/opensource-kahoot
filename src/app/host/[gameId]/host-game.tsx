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
  ordinal,
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
import { Wordmark } from "@/ui/shapes";

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
  // the write so a second click can't race the first. Resolves true once the write is committed.
  function run(write: () => Promise<WriteResult>) {
    return new Promise<boolean>((resolve) =>
      startTransition(async () => {
        try {
          const result = await write();
          if (result.kind === "rejected") {
            if (result.reason === "UNAUTHENTICATED") leaveSession("/dashboard");
            else setError("That didn't work. Try again.");
            return resolve(false);
          }
          if (result.kind === "committed") {
            try {
              await gameLive.utils.awaitTxId(result.txid, SYNC_TIMEOUT_MS);
              setError(null); // cleared only once a write is confirmed live, not by the next click
            } catch {
              setError(
                "Saved, but live updates are lagging. Reload this page if it doesn't change.",
              );
            }
          }
          resolve(true);
        } catch {
          setError("Connection lost. Check your network and try again.");
          resolve(false);
        }
      }),
    );
  }

  // Answers per choice of the current question (kicked players are already left out of the tally).
  const counts = new Map(
    question
      ? tally
          .filter((t) => t.question_id === question.id)
          .map((t) => [t.choice_id, t.n] as const)
      : [],
  );
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
  // A failed reveal (network blip) clears the mark and retries after a pause, so a question whose
  // time is up can't stay open waiting for the host.
  const [revealRetry, setRevealRetry] = useState(0);
  useEffect(() => {
    if (!shouldReveal || autoRevealed.current === game.question_index) return;
    const index = game.question_index;
    autoRevealed.current = index;
    void run(() => revealAnswer(gameId, userId, index)).then((ok) => {
      if (ok) return;
      setTimeout(() => {
        if (autoRevealed.current === index) autoRevealed.current = -1;
        setRevealRetry((n) => n + 1);
      }, 2000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, game.question_index, revealRetry]);

  const isLast = game.question_index + 1 >= game.question_count;
  const next = () =>
    run(() => nextQuestion(gameId, userId, game.question_index));

  return (
    // A stage: on screens at least 1024×600 it fills exactly one viewport; shorter or narrower ones scroll. The host page
    // scales the root font with the viewport, so every rem below grows from 1280×720 to 4K.
    <div className="flex min-h-dvh flex-col stage:h-dvh stage:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-rule bg-surface px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link aria-label="Back to dashboard" href="/dashboard">
            <Wordmark />
          </Link>
          <span className="hidden truncate text-ink-muted sm:inline">
            {game.quiz_title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {game.phase !== "lobby" && game.phase !== "ended" && (
            <span className="tabular mr-2 font-mono text-sm text-ink-muted">
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
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 lg:px-10">
          <div className="flex shrink-0 items-center justify-between gap-4 text-ink-muted">
            <span className="font-semibold">
              Question {game.question_index + 1} of {game.question_count}
              {question.points === "double" && (
                <span className="ml-3 rounded-full bg-q-ochre px-2.5 py-0.5 text-sm text-ink">
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
            <div className="h-[2.25rem] shrink-0" />
          )}

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
            <h1
              className={`max-w-[60rem] text-center leading-[1.12] font-bold ${question.body.length > 140 ? "text-[clamp(1.375rem,min(4.2vh,4.6vw)+0.5rem,2.75rem)]" : "text-[clamp(1.5rem,min(6vh,6.5vw)+0.5rem,3.75rem)]"}`}
            >
              {question.body}
            </h1>
            {question.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="min-h-[min(12rem,22vh)] max-w-full flex-1 rounded-[var(--radius-tile)] object-contain"
                src={question.image_url}
              />
            )}
          </div>

          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
            {question.choices.map((choice) => {
              const revealed = game.phase === "reveal";
              const n = counts.get(choice.id) ?? 0;
              return (
                <AnswerTile
                  choice={choice}
                  count={revealed ? n : undefined}
                  key={choice.id}
                  share={answered ? n / answered : 0}
                  state={
                    revealed
                      ? choice.is_correct
                        ? "correct"
                        : "wrong"
                      : "idle"
                  }
                />
              );
            })}
          </div>

          <div className="flex shrink-0 justify-end">
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
        <main className="mx-auto flex min-h-0 w-full max-w-[48rem] flex-1 flex-col justify-center gap-[clamp(1rem,3vh,2rem)] px-6 py-6">
          <h1 className="text-center text-[clamp(2rem,6vh,3rem)] font-bold">
            Leaderboard
          </h1>
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
    <main className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <section className="flex flex-col justify-center gap-[clamp(1.25rem,4vh,2.5rem)] px-6 py-8 lg:px-14">
        <div>
          <p className="text-xl text-ink-muted">
            Join at <strong className="text-ink">{host}</strong> with PIN
          </p>
          <p className="tabular mt-2 font-mono text-[min(9rem,13vw,22vh)] leading-none font-medium tracking-[0.04em]">
            {game.pin.slice(0, 3)}
            <span className="inline-block w-[0.3em]" />
            {game.pin.slice(3)}
          </p>
        </div>
        <div className="flex items-end gap-6">
          <div
            aria-label="QR code to join this game"
            className="size-[min(10rem,24vh)] shrink-0 rounded-xl bg-surface p-[0.6rem] shadow-lift [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
          />
          <p className="max-w-56 pb-2 text-ink-muted">
            Or scan with a phone camera to jump straight in.
          </p>
        </div>
      </section>

      <section className="flex min-h-0 flex-col border-t border-rule bg-surface px-6 py-6 lg:border-t-0 lg:border-l lg:px-10">
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
          <p className="flex flex-1 items-center justify-center py-12 text-center text-ink-muted">
            Waiting for players to join…
          </p>
        ) : (
          <ul
            className="-mx-1 flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto px-1 py-1"
            aria-live="polite"
          >
            {players.map((p) => (
              <li
                className="animate-rise group flex items-center gap-1 rounded-full bg-sunken py-1.5 pr-1.5 pl-4 text-lg font-semibold"
                key={p.id}
              >
                {p.nickname}
                <button
                  aria-label={`Remove ${p.nickname}`}
                  className="grid size-7 cursor-pointer place-items-center rounded-full pointer-coarse:-my-1.5 pointer-coarse:size-10 text-ink-muted opacity-60 hover:bg-surface hover:text-action hover:opacity-100 focus-visible:opacity-100"
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
          className="btn-primary btn-lg mt-6 w-full shrink-0"
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

function Standings({
  rows,
  top,
}: {
  rows: readonly StandingRow[];
  top: number;
}) {
  const ranked = useMemo(() => rank(rows).slice(0, top), [rows, top]);
  if (!ranked.length)
    return <p className="text-center text-ink-muted">No players.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {ranked.map((r, i) => (
        <li
          className="animate-rise flex items-center gap-5 rounded-[var(--radius-tile)] bg-surface px-6 py-[clamp(0.5rem,1.6vh,1rem)] text-[clamp(1.25rem,3.6vh,1.75rem)] shadow-lift"
          key={r.id}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="tabular w-10 text-ink-muted">{r.rank}</span>
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
  // Visual order 2nd, 1st, 3rd. Height follows the shared rank, so tied players stand level.
  const HEIGHT: Record<number, string> = {
    1: "h-[min(14rem,30vh)]",
    2: "h-[min(10rem,22vh)]",
  };
  const height = (r?: { rank: number }) =>
    HEIGHT[r?.rank ?? 3] ?? "h-[min(7rem,15vh)]";
  const places = [
    { r: ranked[1], h: height(ranked[1]), label: "2nd", delay: "300ms" },
    { r: ranked[0], h: height(ranked[0]), label: "1st", delay: "700ms" },
    { r: ranked[2], h: height(ranked[2]), label: "3rd", delay: "0ms" },
  ];
  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[56rem] flex-1 flex-col items-center justify-center gap-[clamp(1rem,4vh,2.5rem)] px-6 py-6">
      <h1 className="text-[clamp(2rem,6vh,3rem)] font-bold">Podium</h1>
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
                  <p className="tabular text-ink-muted">{r.score}</p>
                </div>
              )}
              <div
                className={`animate-grow-up flex w-full items-start justify-center rounded-t-[var(--radius-tile)] pt-4 text-3xl font-bold ${h} ${r?.rank === 1 ? "bg-action text-white" : "bg-ink text-white"}`}
                style={{ animationDelay: delay }}
              >
                {r ? ordinal(r.rank) : label}
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
