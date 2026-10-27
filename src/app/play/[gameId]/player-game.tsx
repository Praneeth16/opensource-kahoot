"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";

import { submitAnswer } from "@/app/actions/player";
import {
  type Choice,
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
  MyAnswerRow,
  QuestionRow,
  StandingRow,
} from "@/lib/live";
import { ANSWER_STYLES, Shape, Wordmark } from "@/ui/shapes";

const SYNC_TIMEOUT_MS = 10_000;

export function PlayerGame({
  gameId,
  playerId,
  nickname,
  serverNow,
  initial,
}: {
  gameId: string;
  playerId: string;
  nickname: string;
  serverNow: number;
  initial: {
    game: Loaded<GameStateRow>;
    question: Loaded<QuestionRow>;
    standings: Loaded<StandingRow>;
    myAnswers: Loaded<MyAnswerRow>;
  };
}) {
  const [viewer] = useState<Viewer>({ role: "player" });
  const [clockOffset] = useState(() => serverNow - Date.now());
  const game = useLive(gameId, "game", initial.game, viewer).rows[0];
  const question = splitQuestion(
    useLive(gameId, "question", initial.question, viewer).rows,
    game?.question_index ?? -1,
  );
  const standings = useLive(
    gameId,
    "standings",
    initial.standings,
    viewer,
  ).rows;
  const answersLive = useLive(gameId, "myAnswers", initial.myAnswers, viewer);
  const [answers, addOptimistic] = useOptimistic(
    answersLive.rows,
    (current, answer: MyAnswerRow) =>
      current.some((a) => a.question_id === answer.question_id)
        ? current
        : [...current, answer],
  );
  const [error, setError] = useState<string | null>(null);

  const ranked = useMemo(() => rank(standings), [standings]);
  const me = ranked.find((r) => r.id === playerId);
  const answer = question && answers.find((a) => a.question_id === question.id);
  const phase = game?.phase ?? "ended";
  const now = useNow(phase === "question");
  const left = question
    ? msLeft(
        game?.question_started_at ?? null,
        question.time_limit_s,
        clockOffset,
        now,
      )
    : 0;

  function choose(choice: Choice) {
    if (!question || answer || left <= 0) return;
    setError(null);
    startTransition(async () => {
      addOptimistic({
        id: crypto.randomUUID(),
        question_id: question.id,
        choice_id: choice.id,
        answered_ms: 0,
        is_correct: null,
        points: null,
      });
      try {
        const result = await submitAnswer(gameId, choice.id);
        if (result.kind === "rejected") {
          if (result.reason === "UNAUTHENTICATED")
            leaveSession("/?notice=removed");
          else setError("That answer didn't go through.");
          return;
        }
        if (result.kind === "unchanged") {
          setError("Too late. Time was up.");
          return;
        }
        await answersLive.utils.awaitTxId(result.txid, SYNC_TIMEOUT_MS);
      } catch {
        setError("Connection lost. Your answer may not have counted.");
      }
    });
  }

  // After reveal the whole screen takes the verdict's color, edge to edge on any device.
  const verdict =
    (phase === "reveal" || phase === "leaderboard") && question
      ? !answer
        ? "none"
        : answer.is_correct
          ? "right"
          : "wrong"
      : null;
  const screen =
    verdict === "right"
      ? "bg-q-olive text-white"
      : verdict === "wrong"
        ? "bg-action text-white"
        : verdict === "none"
          ? "bg-sunken"
          : "";

  return (
    <div
      className={`flex min-h-dvh flex-col transition-colors duration-500 ${screen}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-rule bg-surface px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-ink">
        <Wordmark />
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="truncate font-semibold">{nickname}</span>
          <span className="tabular rounded-full bg-ink px-2.5 py-1 font-semibold text-white">
            {me?.score ?? 0}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] short:pt-3">
        {phase === "lobby" && (
          <Centered>
            <p className="animate-pop text-5xl font-bold tracking-[-0.03em]">
              You&apos;re in!
            </p>
            <p className="mt-3 text-lg text-ink-muted">
              See your name on the host&apos;s screen?
            </p>
            <p className="mt-10 text-sm text-ink-muted">
              Waiting for the host to start…
            </p>
          </Centered>
        )}

        {phase === "question" && question && !answer && left > 0 && (
          <div className="flex flex-1 flex-col gap-4">
            <TimerBar leftMs={left} totalMs={question.time_limit_s * 1000} />
            <h1 className="text-xl leading-snug font-semibold sm:text-2xl short:text-base">
              {question.body}
            </h1>
            <div
              className={`grid flex-1 gap-3 short:gap-2 ${question.choices.length > 2 ? "grid-cols-2 short:grid-cols-4" : "grid-cols-1 short:grid-cols-2"}`}
            >
              {question.choices.map((choice) => {
                const style = ANSWER_STYLES[choice.position % 4]!;
                return (
                  <button
                    className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-tile)] p-4 text-center text-xl font-bold shadow-lift transition-transform active:scale-[0.97] sm:min-h-36 sm:text-2xl short:min-h-0 short:gap-1.5 short:p-2 short:text-base ${style.tile}`}
                    key={choice.id}
                    onClick={() => choose(choice)}
                    type="button"
                  >
                    <Shape
                      className="size-10 sm:size-12 short:size-7"
                      index={choice.position}
                    />
                    <span className="break-words">{choice.body}</span>
                    <span className="sr-only">({style.name})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "question" && question && answer && (
          <Centered>
            <Picked
              choice={question.choices.find((c) => c.id === answer.choice_id)}
            />
            <p className="mt-6 text-3xl font-bold tracking-[-0.03em]">
              Answer locked in
            </p>
            <p className="mt-2 text-ink-muted">Hold tight for the reveal.</p>
          </Centered>
        )}

        {phase === "question" && question && !answer && left <= 0 && (
          <Centered>
            <p className="text-3xl font-bold tracking-[-0.03em]">
              Time&apos;s up
            </p>
            <p className="mt-2 text-ink-muted">Get ready for the next one.</p>
          </Centered>
        )}

        {(phase === "reveal" || phase === "leaderboard") && question && (
          <Result
            answer={answer ?? undefined}
            choices={question.choices}
            rankText={me ? `${ordinal(me.rank)} of ${ranked.length}` : ""}
            score={me?.score ?? 0}
          />
        )}

        {phase === "ended" && (
          <Centered>
            <h1 className="tabular animate-pop text-7xl font-bold tracking-[-0.04em] short:text-5xl">
              {me ? ordinal(me.rank) : "–"}
            </h1>
            <p className="mt-2 text-lg">
              of {ranked.length} ·{" "}
              <span className="tabular font-semibold">{me?.score ?? 0}</span>{" "}
              points · {me?.correct ?? 0} correct
            </p>
            <a className="btn-primary btn-lg mt-10 short:mt-5" href="/">
              Join another game
            </a>
          </Centered>
        )}

        {error && (
          <p
            aria-live="assertive"
            className={`mt-3 text-center text-sm ${verdict === "right" || verdict === "wrong" ? "text-white" : "text-action-strong"}`}
          >
            {error}
          </p>
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {children}
    </div>
  );
}

function Picked({ choice }: { choice?: Choice }) {
  if (!choice) return null;
  const style = ANSWER_STYLES[choice.position % 4]!;
  return (
    <div
      className={`animate-pop grid size-28 place-items-center rounded-[var(--radius-tile)] shadow-lift short:size-20 ${style.tile}`}
    >
      <Shape className="size-14" index={choice.position} />
    </div>
  );
}

function Result({
  answer,
  choices,
  score,
  rankText,
}: {
  answer?: MyAnswerRow;
  choices: Choice[];
  score: number;
  rankText: string;
}) {
  const correct = choices.filter((c) => c.is_correct);
  const verdict = !answer ? "none" : answer.is_correct ? "right" : "wrong";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
      <p className="animate-pop text-5xl font-bold tracking-[-0.03em] short:text-4xl">
        {verdict === "right"
          ? "Correct"
          : verdict === "wrong"
            ? "Not quite"
            : "No answer"}
      </p>
      {verdict === "right" && (
        <p className="tabular mt-4 rounded-full bg-white/20 px-4 py-1.5 text-2xl font-bold">
          +{answer?.points ?? 0}
        </p>
      )}
      {verdict !== "right" && correct.length > 0 && (
        <p className="mt-4 text-lg">
          Answer: <strong>{correct.map((c) => c.body).join(" or ")}</strong>
        </p>
      )}
      <p className="mt-10 text-lg short:mt-5">
        You&apos;re <strong>{rankText}</strong> with{" "}
        <span className="tabular font-semibold">{score}</span> points
      </p>
    </div>
  );
}
