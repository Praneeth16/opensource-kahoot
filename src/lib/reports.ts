import "server-only";

import { getPool } from "./db";

export async function getReport(gameId: string, hostId: string) {
  if (!/^[0-9a-f-]{36}$/.test(gameId)) return null;
  const pool = getPool();
  const { rows: games } = await pool.query<{
    title: string;
    pin: string;
    phase: string;
    created_at: Date;
  }>(
    `SELECT z.title, g.pin, g.phase, g.created_at FROM games g JOIN quizzes z ON z.id = g.quiz_id
     WHERE g.id = $1 AND g.host_id = $2`,
    [gameId, hostId],
  );
  if (!games[0]) return null;
  const [{ rows: players }, { rows: questions }] = await Promise.all([
    pool.query<{
      id: string;
      nickname: string;
      score: number;
      correct: number;
      answered: number;
      avg_ms: number | null;
    }>(
      `SELECT p.id, p.nickname,
         coalesce(sum(a.points), 0)::int AS score,
         (count(a.id) FILTER (WHERE a.is_correct))::int AS correct,
         count(a.id)::int AS answered,
         avg(a.answered_ms)::int AS avg_ms
       FROM players p LEFT JOIN answers a ON a.player_id = p.id
       WHERE p.game_id = $1 AND NOT p.kicked
       GROUP BY p.id ORDER BY score DESC, p.nickname`,
      [gameId],
    ),
    pool.query<{
      position: number;
      body: string;
      answered: number;
      correct: number;
    }>(
      `SELECT q.position, q.body,
         count(a.id)::int AS answered,
         (count(a.id) FILTER (WHERE a.is_correct))::int AS correct
       FROM games g JOIN questions q ON q.quiz_id = g.quiz_id
       LEFT JOIN answers a ON a.question_id = q.id AND a.game_id = g.id
       WHERE g.id = $1 AND q.position <= g.question_index
       GROUP BY q.id ORDER BY q.position`,
      [gameId],
    ),
  ]);
  return { game: games[0], players, questions };
}
