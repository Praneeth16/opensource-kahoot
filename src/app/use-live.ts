"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
// @neon/realtime-react's build has no "use client" directive: import it only from client modules.
import { useLiveQuery } from "@neon/realtime-react";
import { useCallback, useState } from "react";

import { renewOrLeave } from "@/auth/session-lost";
import type { QueryName } from "@/lib/live"; // type-only: erased at build

export type Loaded<Row> = { rows: Row[]; sealedQuery: SealedLiveQuery<Row> };
export type Viewer = { role: "host"; userId: string } | { role: "player" };

/**
 * One named live query of a game. Keeps the first sealed query (a server re-render must not restart the
 * subscription) and renews through the game's live route, which re-checks the host session or the
 * player cookie. A 401 (signed out, removed, game gone) leaves the page.
 */
export function useLive<Row>(
  gameId: string,
  name: QueryName,
  initial: Loaded<Row>,
  viewer: Viewer,
) {
  const [query] = useState(initial.sealedQuery);
  const leaveTo = viewer.role === "player" ? "/?notice=removed" : "/dashboard";
  const refreshQuery = useCallback(
    () =>
      renewOrLeave<SealedLiveQuery<Row>>(
        () =>
          fetch(`/api/games/${gameId}/live`, {
            method: "POST",
            cache: "no-store",
            body: JSON.stringify({
              q: name,
              role: viewer.role,
              userId: viewer.role === "host" ? viewer.userId : undefined,
            }),
          }),
        leaveTo,
      ),
    [gameId, name, viewer, leaveTo],
  );
  const { data, status, utils } = useLiveQuery(query, {
    initialData: initial.rows,
    refreshQuery,
  });
  return { rows: (data ?? initial.rows) as readonly Row[], status, utils };
}

/** Milliseconds left on a question, from the server clock (offset measured at page load). */
export function msLeft(
  startedAt: Date | null,
  limitS: number,
  clockOffsetMs: number,
  now: number,
) {
  if (!startedAt) return 0;
  return Math.max(
    0,
    startedAt.getTime() + limitS * 1000 - (now + clockOffsetMs),
  );
}
