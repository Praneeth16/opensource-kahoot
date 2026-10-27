import {
  type Browser,
  chromium,
  expect,
  type Page,
  test,
} from "@playwright/test";

import {
  cleanup,
  db,
  joinPlayer,
  lobbyPin,
  scorePill,
  signUpHost,
  tile,
  watch,
} from "./helpers";

// Opt-in load test: STRESS=1 npm run e2e -- stress.spec.ts  (PLAYERS=50 by default).
// Every player is a real browser context with its own cookie and Realtime socket. For every question,
// every phone's verdict and score is compared with the database, and the host's leaderboard with an
// independent ranking. Prints join, question propagation and answer latency percentiles.
test.skip(!process.env.STRESS, "set STRESS=1 to run the load test");
test.setTimeout(20 * 60_000);
test.afterAll(cleanup);

const PLAYERS = Number(process.env.PLAYERS ?? 50);
const SKIP_Q = 2; // on this question (0-based) a few players don't answer, so the timer must reveal
const SKIPPERS = 3;
// Spread players over several Chrome processes and let them join over a few seconds, like a real room.
// 50 tabs in one Chrome on one laptop measure the laptop, not the app.
const BROWSERS = Number(process.env.BROWSERS ?? 5);
const JOIN_GAP_MS = Number(process.env.JOIN_GAP_MS ?? 300);

// Deterministic "random" so a failing run can be replayed.
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length
    ? Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!)
    : 0;
};
const summary = (name: string, xs: number[]) =>
  `${name.padEnd(28)} n=${String(xs.length).padStart(3)}  p50=${pct(xs, 50)}ms  p95=${pct(xs, 95)}ms  max=${pct(xs, 100)}ms`;

type Ranked = {
  nickname: string;
  score: number;
  correct: number;
  rank: number;
};
function rankFromDb(
  rows: { nickname: string; score: number; correct: number }[],
): Ranked[] {
  const sorted = [...rows].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname),
  );
  return sorted.map((r, i) => ({
    ...r,
    rank: sorted.findIndex((x) => x.score === r.score) + 1,
  }));
}
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

test(`load: ${PLAYERS} players play a full game to the leaderboard`, async ({
  browser,
}) => {
  const extra: Browser[] = await Promise.all(
    Array.from({ length: BROWSERS - 1 }, () =>
      chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined }),
    ),
  );
  const pool = [browser, ...extra];
  const errors: string[] = [];
  const host = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  watch(host, "host", errors);
  await signUpHost(host, "Load Host");
  await host.getByRole("button", { name: "Load sample quiz" }).click();
  await host.waitForURL(/quizzes\/.*\/edit/);
  await host.getByRole("button", { name: "Save and host" }).click();
  await host.waitForURL(/\/host\//);
  const gameId = host.url().split("/host/")[1]!;
  const pin = await lobbyPin(host);

  // The questions this game plays (its frozen snapshot), with correct answers.
  const { rows: qrows } = await db.query(
    `SELECT q.position, q.time_limit_s, c.body, c.is_correct
     FROM games g JOIN questions q ON q.quiz_id = g.quiz_id JOIN choices c ON c.question_id = q.id
     WHERE g.id = $1 ORDER BY q.position, c.position`,
    [gameId],
  );
  const questions = [...new Set(qrows.map((r) => r.position as number))].map(
    (pos) => ({
      right: qrows
        .filter((r) => r.position === pos && r.is_correct)
        .map((r) => r.body as string),
      wrong: qrows
        .filter((r) => r.position === pos && !r.is_correct)
        .map((r) => r.body as string),
    }),
  );

  // ---------- join ----------
  const names = Array.from(
    { length: PLAYERS },
    (_, i) => `Player${String(i + 1).padStart(2, "0")}`,
  );
  const joinMs: number[] = [];
  const players: Page[] = [];
  await test.step(`${PLAYERS} players join at once`, async () => {
    const joined = await Promise.all(
      names.map(async (n, i) => {
        await new Promise((r) => setTimeout(r, i * JOIN_GAP_MS));
        const t0 = Date.now();
        const p = await joinPlayer(pool[i % pool.length]!, pin, n, errors);
        joinMs.push(Date.now() - t0);
        return p;
      }),
    );
    players.push(...joined);
    await expect(
      host.getByRole("heading", { name: `${PLAYERS} players` }),
    ).toBeVisible({ timeout: 60_000 });
    await host.screenshot({ path: "test-results/stress-lobby.png" });
  });

  const propagationMs: number[] = [];
  const answerMs: number[] = [];
  const nextButton = (last: boolean) =>
    host.getByRole("button", { name: last ? "Final results" : "Leaderboard" });

  await host.getByRole("button", { name: "Start game" }).click();
  let advancedAt = Date.now();

  for (const [qi, q] of questions.entries()) {
    const last = qi === questions.length - 1;
    await test.step(`question ${qi + 1}: ${PLAYERS} players answer`, async () => {
      // Each player waits for the question to appear, thinks, then answers (60% pick a right answer).
      const picks = await Promise.all(
        players.map(async (p, i) => {
          const firstChoice = q.right[0] ?? q.wrong[0]!;
          await tile(p, firstChoice).waitFor({ timeout: 60_000 });
          propagationMs.push(Date.now() - advancedAt);
          if (qi === SKIP_Q && i < SKIPPERS) return null; // these let the timer run out
          const correct = rand() < 0.6;
          const pool = correct || q.wrong.length === 0 ? q.right : q.wrong;
          const choice = pool[Math.floor(rand() * pool.length)]!;
          await p.waitForTimeout(300 + Math.floor(rand() * 4000));
          const t0 = Date.now();
          await tile(p, choice).click();
          await expect(p.getByText("Answer locked in")).toBeVisible({
            timeout: 30_000,
          });
          answerMs.push(Date.now() - t0);
          return choice;
        }),
      );
      // Auto-reveal: when everyone answered, or (on the skip question) when the timer runs out.
      await expect(nextButton(last)).toBeVisible({ timeout: 60_000 });
      if (qi === 0)
        await host.screenshot({ path: "test-results/stress-reveal.png" });

      // DB truth for this question and the revealed running totals.
      const { rows: ans } = await db.query(
        `SELECT p.nickname, a.is_correct, a.points FROM answers a
         JOIN players p ON p.id = a.player_id JOIN questions q ON q.id = a.question_id
         WHERE a.game_id = $1 AND q.position = $2`,
        [gameId, qi],
      );
      expect(ans.length, "every answer that was locked in is stored").toBe(
        picks.filter(Boolean).length,
      );
      const { rows: totals } = await db.query(
        `SELECT p.nickname, coalesce(sum(a.points), 0)::int AS score,
                (count(a.id) FILTER (WHERE a.is_correct))::int AS correct
         FROM players p LEFT JOIN answers a ON a.player_id = p.id
         WHERE p.game_id = $1 GROUP BY p.nickname`,
        [gameId],
      );
      const byName = new Map(ans.map((a) => [a.nickname as string, a]));
      const totalOf = new Map(
        totals.map((t) => [t.nickname as string, t.score as number]),
      );

      // Every phone shows the right verdict and the right running score.
      await Promise.all(
        players.map(async (p, i) => {
          const a = byName.get(names[i]!);
          const verdict = !a
            ? "No answer"
            : a.is_correct
              ? "Correct"
              : "Not quite";
          await expect(p.getByText(verdict, { exact: true })).toBeVisible({
            timeout: 30_000,
          });
          await expect(scorePill(p)).toHaveText(
            String(totalOf.get(names[i]!) ?? 0),
            { timeout: 30_000 },
          );
          if (a?.is_correct)
            await expect(p.locator("main")).toContainText(`+${a.points}`);
        }),
      );

      await nextButton(last).click();
      if (!last) {
        // Host leaderboard top 5 = independent ranking from the database.
        await expect(
          host.getByRole("heading", { name: "Leaderboard" }),
        ).toBeVisible();
        const expected = rankFromDb(totals).slice(0, 5);
        const rows = host.locator("main ol li");
        await expect(rows).toHaveCount(Math.min(5, PLAYERS));
        for (const [k, e] of expected.entries())
          await expect(rows.nth(k)).toContainText(
            new RegExp(`${e.rank}\\s*${e.nickname}\\s*${e.score}`),
          );
        if (qi === questions.length - 2)
          await host.screenshot({
            path: "test-results/stress-leaderboard.png",
          });
        await host.getByRole("button", { name: "Next question" }).click();
        advancedAt = Date.now();
      }
    });
  }

  await test.step("podium, every player's final standing, report and CSV", async () => {
    await expect(host.getByRole("heading", { name: "Podium" })).toBeVisible();
    const { rows } = await db.query(
      `SELECT p.nickname, coalesce(sum(a.points), 0)::int AS score,
              (count(a.id) FILTER (WHERE a.is_correct))::int AS correct
       FROM players p LEFT JOIN answers a ON a.player_id = p.id
       WHERE p.game_id = $1 GROUP BY p.nickname`,
      [gameId],
    );
    const ranked = rankFromDb(rows);
    await host.waitForTimeout(1500);
    await host.screenshot({ path: "test-results/stress-podium.png" });
    for (const e of ranked.slice(0, 3))
      await expect(host.locator("main")).toContainText(e.nickname);

    await Promise.all(
      players.map(async (p, i) => {
        const me = ranked.find((r) => r.nickname === names[i])!;
        await expect(p.getByText("points ·")).toBeVisible({
          timeout: 30_000,
        });
        const main = p.locator("main");
        await expect(main).toContainText(ordinal(me.rank));
        await expect(main).toContainText(`${me.score} points`);
        await expect(main).toContainText(`${me.correct} correct`);
      }),
    );

    const csv = await host.evaluate(
      async (id) => (await fetch(`/reports/${id}/csv`)).text(),
      gameId,
    );
    const lines = csv.trim().split("\n").slice(1);
    expect(lines).toHaveLength(PLAYERS);
    for (const e of ranked)
      expect(csv).toContain(`"${e.nickname}","${e.score}","${e.correct}"`);
    console.log(
      `\nTop 5:\n${ranked
        .slice(0, 5)
        .map(
          (r) =>
            `  ${r.rank}. ${r.nickname}  ${r.score}  (${r.correct} correct)`,
        )
        .join("\n")}`,
    );
  });

  console.log(
    [
      "",
      `Load test: ${PLAYERS} players, ${questions.length} questions, game ${gameId}`,
      summary("join (PIN to lobby)", joinMs),
      summary("question shows on phone", propagationMs),
      summary("tap to answer locked in", answerMs),
      `page errors / 5xx: ${errors.length}`,
    ].join("\n"),
  );
  await Promise.all(extra.map((b) => b.close()));
  expect(errors, errors.slice(0, 10).join("\n")).toEqual([]);
});
