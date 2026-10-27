import { attachDatabasePool } from "@neon/functions";
import { parseTriggerDelivery } from "@neon/functions/triggers";
import { Pool } from "pg";

// Neon Function, run by the `janitor-15m` schedule trigger in neon.ts. Ends games whose host walked away
// (no host action for 2 hours), so players' screens show the final results instead of hanging, and frees
// their PINs. Deletes lobbies that never started after a day. Idempotent: a stray call only does the
// same cleanup early, so the trigger delivery check is enough.

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
attachDatabasePool(pool);

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") return new Response("PopQuiz janitor");
    const parsed = await parseTriggerDelivery(request);
    if (!parsed.ok)
      return new Response(parsed.error, {
        status: parsed.error === "invalid_body" ? 400 : 401,
      });

    const ended = await pool.query(
      `UPDATE games SET phase = 'ended', updated_at = now()
       WHERE phase <> 'ended' AND updated_at < now() - interval '2 hours'`,
    );
    const deleted = await pool.query(
      `DELETE FROM games
       WHERE phase = 'ended' AND question_index = -1 AND created_at < now() - interval '1 day'`,
    );
    const result = {
      ended: ended.rowCount ?? 0,
      deleted: deleted.rowCount ?? 0,
    };
    console.log("[janitor]", JSON.stringify(result));
    return Response.json(result);
  },
};
