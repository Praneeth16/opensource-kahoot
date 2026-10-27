import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";

import { RealtimeRoot } from "@/app/realtime-root";
import { getUser } from "@/auth/server";
import { getEnv } from "@/lib/env";
import { isGameHost, loadHostGame } from "@/lib/games";

import { HostGame } from "./host-game";

export const metadata = { title: "Host" };

export default async function HostPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await getUser();
  if (!user) redirect("/auth/sign-in"); // backstop: proxy.ts already redirected
  if (!(await isGameHost(gameId, user.id))) notFound();
  const initial = await loadHostGame(gameId);
  const pin = initial.game.rows[0]!.pin;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const joinUrl = `${origin}/join/${pin}`;
  const qrSvg = await QRCode.toString(joinUrl, {
    type: "svg",
    margin: 0,
    color: { dark: "#2e2a27", light: "#0000" },
  });

  return (
    <RealtimeRoot key={gameId} url={getEnv().realtimeUrl}>
      {/* The host screen is a stage: scale every rem with the viewport (the smaller of width and height),
          so one layout fits 1280×720 laptops, 1080p projectors and 4K TVs. Phones and tablets keep 16px. */}
      <style>{`html { font-size: clamp(16px, min(1.25vw, 2.2vh), 48px); }`}</style>
      <HostGame
        gameId={gameId}
        host={origin.replace(/^https?:\/\//, "")}
        initial={initial}
        qrSvg={qrSvg}
        serverNow={Date.now()}
        userId={user.id}
      />
    </RealtimeRoot>
  );
}
