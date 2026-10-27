import { getUser } from "@/auth/server";
import { getReport, sharedRanks } from "@/lib/reports";

// Quote every field, double inner quotes, and defuse spreadsheet formulas in player-chosen nicknames.
const cell = (value: string | number) => {
  const s = String(value);
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const report = await getReport(gameId, user.id);
  if (!report) return new Response("Not found", { status: 404 });
  const ranks = sharedRanks(report.players);
  const lines = [
    ["rank", "nickname", "score", "correct", "answered", "avg_seconds"]
      .map(cell)
      .join(","),
    ...report.players.map((p, i) =>
      [
        ranks[i]!,
        p.nickname,
        p.score,
        p.correct,
        p.answered,
        p.avg_ms == null ? "" : (p.avg_ms / 1000).toFixed(2),
      ]
        .map(cell)
        .join(","),
    ),
  ];
  const name =
    report.game.title.replace(/[^\w-]+/g, "-").slice(0, 60) || "game";
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${report.game.pin}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
