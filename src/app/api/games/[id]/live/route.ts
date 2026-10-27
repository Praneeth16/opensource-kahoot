import { getUser } from "@/auth/server";
import { getPool } from "@/lib/db";
import {
  HOST_QUERIES,
  PLAYER_QUERIES,
  sealByName,
  type QueryName,
} from "@/lib/live";
import { getPlayer } from "@/lib/player-session";

const noStore = { "Cache-Control": "private, no-store" };
const unauthorized = () =>
  Response.json(
    { error: "UNAUTHENTICATED" },
    { status: 401, headers: noStore },
  );

// Renews a sealed live query. A Route Handler, not a Server Action: Next.js runs actions one at a time,
// so a renewal would queue behind pending writes. Hosts are checked against games.host_id; players
// against their cookie token. Each role may only seal its own list of queries.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: gameId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    q?: string;
    role?: string;
    userId?: string;
  };
  if (!/^[0-9a-f-]{36}$/.test(gameId)) return unauthorized();
  const q = body.q as QueryName;

  if (body.role === "host") {
    if (!(HOST_QUERIES as readonly string[]).includes(q)) return unauthorized();
    const user = await getUser(body.userId);
    if (!user) return unauthorized();
    const { rowCount } = await getPool().query(
      "SELECT 1 FROM games WHERE id = $1 AND host_id = $2",
      [gameId, user.id],
    );
    if (!rowCount) return unauthorized();
    return Response.json(await sealByName(q, gameId), { headers: noStore });
  }

  if (!(PLAYER_QUERIES as readonly string[]).includes(q)) return unauthorized();
  const player = await getPlayer(gameId);
  if (!player) return unauthorized();
  return Response.json(await sealByName(q, gameId, player.id), {
    headers: noStore,
  });
}
