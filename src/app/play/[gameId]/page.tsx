import { redirect } from "next/navigation";

import { RealtimeRoot } from "@/app/realtime-root";
import { getEnv } from "@/lib/env";
import { loadPlayerGame } from "@/lib/games";
import { getPlayer } from "@/lib/player-session";

import { PlayerGame } from "./player-game";

export const metadata = { title: "Playing" };

export default async function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(gameId)) redirect("/");
  const player = await getPlayer(gameId); // reads the cookie, so this page renders per request
  if (!player) redirect("/?notice=removed");
  const initial = await loadPlayerGame(gameId, player.id);
  if (initial.game.rows[0]?.phase === "ended" && !initial.myAnswers.rows.length)
    redirect("/?notice=ended");
  return (
    <RealtimeRoot key={gameId} url={getEnv().realtimeUrl}>
      <PlayerGame
        gameId={gameId}
        initial={initial}
        nickname={player.nickname}
        playerId={player.id}
        serverNow={Date.now()}
      />
    </RealtimeRoot>
  );
}
