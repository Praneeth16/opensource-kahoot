import "server-only";

import { rawSql } from "@neon/realtime/server";

import { getPool } from "./db";
import { getRealtime } from "./realtime";
import type { Phase } from "./schema";

// Every live query in the app, defined once. The server read, the seal and every renewal use the same
// builder, so their fingerprints match. Parameters must come from a checked session, never the client.
// Anything a player must not see yet (correct choices, points) is masked here, in SQL, until reveal.

// True once a question's result may be shown: past questions, and the current one after reveal.
const REVEALED = `(q.position < g.question_index OR (q.position = g.question_index AND g.phase IN ('reveal', 'leaderboard', 'ended')))`;

export type GameStateRow = {
  id: string;
  pin: string;
  phase: Phase;
  question_index: number;
  question_started_at: Date | null;
  locked: boolean;
  question_count: number;
  quiz_title: string;
};

export type QuestionRow = {
  id: string; // choice id
  position: number;
  body: string;
  is_correct: boolean | null; // null until reveal
  question_id: string;
  question_position: number; // compared with games.question_index: the two queries update separately
  question_body: string;
  kind: "quiz" | "truefalse";
  image_url: string | null;
  time_limit_s: number;
  points: "standard" | "double" | "none";
};

export type PlayerRow = { id: string; nickname: string; created_at: Date };

export type TallyRow = { question_id: string; choice_id: string; n: number };

export type StandingRow = {
  id: string;
  nickname: string;
  score: number;
  correct: number;
};

export type MyAnswerRow = {
  id: string;
  question_id: string;
  choice_id: string;
  answered_ms: number;
  is_correct: boolean | null;
  points: number | null;
};

type Live<Row> = { text: string; params: string[]; _row?: Row };
const live = <Row>(text: string, params: string[]): Live<Row> => ({
  text,
  params,
});

export const queries = {
  game: (gameId: string) =>
    live<GameStateRow>(
      `SELECT g.id, g.pin, g.phase, g.question_index, g.question_started_at, g.locked,
         (SELECT count(*)::int FROM questions cq WHERE cq.quiz_id = g.quiz_id) AS question_count,
         z.title AS quiz_title
       FROM games g JOIN quizzes z ON z.id = g.quiz_id
       WHERE g.id = $1::uuid`,
      [gameId],
    ),

  question: (gameId: string) =>
    live<QuestionRow>(
      `SELECT c.id, c.position, c.body,
         CASE WHEN g.phase IN ('reveal', 'leaderboard', 'ended') THEN c.is_correct END AS is_correct,
         q.id AS question_id, q.position AS question_position, q.body AS question_body, q.kind, q.image_url, q.time_limit_s, q.points
       FROM games g
       JOIN questions q ON q.quiz_id = g.quiz_id AND q.position = g.question_index
       JOIN choices c ON c.question_id = q.id
       WHERE g.id = $1::uuid AND g.phase <> 'lobby'
       ORDER BY c.position`,
      [gameId],
    ),

  players: (gameId: string) =>
    live<PlayerRow>(
      `SELECT id, nickname, created_at FROM players
       WHERE game_id = $1::uuid AND NOT kicked ORDER BY created_at`,
      [gameId],
    ),

  // Host only: answers per choice, live while the question is open.
  tally: (gameId: string) =>
    live<TallyRow>(
      `SELECT question_id, choice_id, count(*)::int AS n FROM answers
       WHERE game_id = $1::uuid GROUP BY question_id, choice_id`,
      [gameId],
    ),

  // Scores count only revealed questions, so a jump in score can't give the answer away early.
  standings: (gameId: string) =>
    live<StandingRow>(
      `SELECT p.id, p.nickname,
         coalesce(sum(a.points) FILTER (WHERE ${REVEALED}), 0)::int AS score,
         (count(a.id) FILTER (WHERE a.is_correct AND ${REVEALED}))::int AS correct
       FROM players p
       JOIN games g ON g.id = p.game_id
       LEFT JOIN answers a ON a.player_id = p.id
       LEFT JOIN questions q ON q.id = a.question_id
       WHERE p.game_id = $1::uuid AND NOT p.kicked
       GROUP BY p.id, p.nickname`,
      [gameId],
    ),

  myAnswers: (gameId: string, playerId: string) =>
    live<MyAnswerRow>(
      `SELECT a.id, a.question_id, a.choice_id, a.answered_ms,
         CASE WHEN ${REVEALED} THEN a.is_correct END AS is_correct,
         CASE WHEN ${REVEALED} THEN a.points END AS points
       FROM answers a
       JOIN games g ON g.id = a.game_id
       JOIN questions q ON q.id = a.question_id
       WHERE a.game_id = $1::uuid AND a.player_id = $2::uuid`,
      [gameId, playerId],
    ),
};

export type QueryName = keyof typeof queries;
export const HOST_QUERIES = [
  "game",
  "question",
  "players",
  "tally",
  "standings",
] as const satisfies QueryName[];
export const PLAYER_QUERIES = [
  "game",
  "question",
  "standings",
  "myAnswers",
] as const satisfies QueryName[];

export function seal<Row>(q: Live<Row>) {
  return getRealtime().seal({ query: rawSql<Row>(q.text, q.params) });
}

/** Read and seal the same query. The stream's first full result replaces these rows. */
export async function load<Row>(q: Live<Row>) {
  const [{ rows }, sealedQuery] = await Promise.all([
    getPool().query(q.text, q.params),
    seal(q),
  ]);
  return { rows: rows as Row[], sealedQuery };
}

/** Seals a query by name, for the renewal route. `playerId` scopes myAnswers. */
export function sealByName(name: QueryName, gameId: string, playerId = "") {
  const q: Live<unknown> =
    name === "myAnswers"
      ? queries.myAnswers(gameId, playerId)
      : queries[name](gameId);
  return seal(q);
}
