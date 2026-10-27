import "server-only";

import { getPool } from "./db";
import { load, queries } from "./live";

export async function isGameHost(gameId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/.test(gameId)) return false;
  const { rowCount } = await getPool().query(
    "SELECT 1 FROM games WHERE id = $1 AND host_id = $2",
    [gameId, userId],
  );
  return !!rowCount;
}

export async function loadHostGame(gameId: string) {
  const [game, question, players, tally, standings] = await Promise.all([
    load(queries.game(gameId)),
    load(queries.question(gameId)),
    load(queries.players(gameId)),
    load(queries.tally(gameId)),
    load(queries.standings(gameId)),
  ]);
  return { game, question, players, tally, standings };
}

export async function loadPlayerGame(gameId: string, playerId: string) {
  const [game, question, standings, myAnswers] = await Promise.all([
    load(queries.game(gameId)),
    load(queries.question(gameId)),
    load(queries.standings(gameId)),
    load(queries.myAnswers(gameId, playerId)),
  ]);
  return { game, question, standings, myAnswers };
}
