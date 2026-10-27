"use client";

import { useEffect, useState } from "react";

import type { QuestionRow, StandingRow } from "@/lib/live";
import { ANSWER_STYLES, Shape } from "@/ui/shapes";

/** Re-renders every `ms` while `active`. */
export function useNow(active: boolean, ms = 100) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/** Edge-to-edge draining bar plus the seconds left, in mono. */
export function TimerBar({
  leftMs,
  totalMs,
  size = "md",
}: {
  leftMs: number;
  totalMs: number;
  size?: "md" | "lg";
}) {
  const fraction = totalMs ? leftMs / totalMs : 0;
  const seconds = Math.ceil(leftMs / 1000);
  const urgent = seconds <= 5;
  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className={`relative flex-1 overflow-hidden rounded-full bg-sunken ${size === "lg" ? "h-3" : "h-2"}`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-action" : "bg-ink"}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        aria-label={`${seconds} seconds left`}
        className={`tabular font-mono font-medium ${size === "lg" ? "w-20 text-5xl" : "w-12 text-2xl"} text-right ${urgent ? "text-action" : "text-ink"}`}
        role="timer"
      >
        {seconds}
      </span>
    </div>
  );
}

export type Choice = Pick<
  QuestionRow,
  "id" | "position" | "body" | "is_correct"
>;

/**
 * Splits the flat question rows into the question and its choices. The game row and the question rows
 * are separate live queries, so for a moment after the host advances they can disagree. Returns null
 * until the rows are for the game's current question.
 */
export function splitQuestion(
  rows: readonly QuestionRow[],
  questionIndex: number,
) {
  const first = rows[0];
  if (!first || first.question_position !== questionIndex) return null;
  return {
    id: first.question_id,
    body: first.question_body,
    kind: first.kind,
    image_url: first.image_url,
    time_limit_s: first.time_limit_s,
    points: first.points,
    choices: [...rows]
      .sort((a, b) => a.position - b.position)
      .map(({ id, position, body, is_correct }) => ({
        id,
        position,
        body,
        is_correct,
      })),
  };
}

export type Ranked = StandingRow & { rank: number };

/** Highest score first; equal scores share a rank. */
export function rank(rows: readonly StandingRow[]): Ranked[] {
  const sorted = [...rows].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname),
  );
  return sorted.map((row, i) => ({
    ...row,
    rank:
      i > 0 && sorted[i - 1]!.score === row.score
        ? sorted.findIndex((r) => r.score === row.score) + 1
        : i + 1,
  }));
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/**
 * An answer tile on the host stage. After reveal, wrong answers recede to the sunken tone, the right one
 * keeps its color and a check, and every tile shows how many players picked it, as a number and a fill
 * along its bottom edge. Counting inside the tiles keeps the whole stage on one screen.
 */
export function AnswerTile({
  choice,
  state = "idle",
  count,
  share = 0,
}: {
  choice: Choice;
  state?: "idle" | "correct" | "wrong";
  count?: number;
  share?: number;
}) {
  const style = ANSWER_STYLES[choice.position % 4]!;
  return (
    <div
      className={`relative flex min-h-[clamp(4rem,13vh,7rem)] items-center gap-[0.8em] overflow-hidden rounded-[var(--radius-tile)] px-[0.9em] text-[clamp(1.125rem,min(2.6vh,2.2vw)+0.6rem,2rem)] transition-colors duration-500 ${state === "wrong" ? "bg-sunken text-ink-muted" : style.tile}`}
    >
      <Shape className="size-[1.2em] shrink-0" index={choice.position} />
      <span className="min-w-0 flex-1 font-semibold hyphens-auto">
        {choice.body}
      </span>
      {count !== undefined && (
        <span
          className="tabular shrink-0 font-bold"
          aria-label={`${count} answers`}
        >
          {count}
        </span>
      )}
      {state === "correct" && (
        <svg
          aria-label="Correct answer"
          className="size-[1.2em] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
      {count !== undefined && (
        <span
          aria-hidden="true"
          className={`animate-grow-x absolute inset-x-0 bottom-0 h-[0.3em] origin-left ${state === "wrong" ? "bg-ink/15" : "bg-white/45"}`}
          style={{ transform: `scaleX(${share})` }}
        />
      )}
    </div>
  );
}
