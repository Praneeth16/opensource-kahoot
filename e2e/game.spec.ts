import { expect, test } from "@playwright/test";

import {
  cleanup,
  db,
  expectedPoints,
  expectNoErrors,
  joinPlayer,
  lobbyPin,
  scorePill,
  signUpHost,
  tile,
  watch,
} from "./helpers";

test.afterAll(cleanup);

// One host builds a quiz from scratch, runs it with three players, and every score is checked
// against the formula. Then the host edits and re-hosts, and the old game's report must not change.
test("scratch quiz: build, host, play, score, report, edit, re-host", async ({
  browser,
}) => {
  const errors: string[] = [];
  const hostContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const host = await hostContext.newPage();
  watch(host, "host", errors);
  host.on("dialog", (d) => d.accept());

  await signUpHost(host, "E2E Host");

  await test.step("build a 4-question quiz in the editor", async () => {
    await host.getByRole("link", { name: "New quiz" }).first().click();
    await expect(
      host.getByRole("heading", { name: "Question 1" }),
    ).toBeVisible();
    await host.getByLabel("Title").fill("Scratch quiz");
    const body = host.getByLabel("Question", { exact: true });

    // Q1: four answers, two correct, 20 s standard.
    await body.fill("Which are prime numbers?");
    for (const [i, text] of ["4", "7", "9", "11"].entries())
      await host.getByLabel(new RegExp(`Answer ${i + 1}`)).fill(text);
    await host.getByRole("checkbox").nth(1).check();
    await host.getByRole("checkbox").nth(3).check();

    // Q2: true or false, double points.
    await host.getByRole("button", { name: /True\/false/ }).click();
    await body.fill("Postgres supports JSONB.");
    await host.getByLabel("Points").selectOption("double");

    // Q3: two answers (blank 3rd and 4th are dropped), no points, 10 s.
    await host.getByRole("button", { name: /^\s*Quiz$/ }).click();
    await body.fill("Pick the bigger number");
    await host.getByLabel("Time limit").selectOption("10");
    await host.getByLabel("Points").selectOption("none");
    await host.getByLabel(/Answer 1/).fill("1");
    await host.getByLabel(/Answer 2/).fill("2");
    await host.getByRole("checkbox").nth(1).check();

    // Q4: 5 s, nobody answers.
    await host.getByRole("button", { name: /^\s*Quiz$/ }).click();
    await body.fill("Nobody answers this one");
    await host.getByLabel("Time limit").selectOption("5");
    await host.getByLabel(/Answer 1/).fill("A");
    await host.getByLabel(/Answer 2/).fill("B");
    await host.getByRole("checkbox").first().check();

    await host.getByRole("button", { name: "Save and host" }).click();
    await host.waitForURL(/\/host\//);
  });
  const gameId = host.url().split("/host/")[1]!;

  await test.step("the game plays exactly the quiz that was built", async () => {
    const { rows } = await db.query(
      `SELECT q.kind, q.points, q.time_limit_s, count(c.*)::int AS n,
              (count(*) FILTER (WHERE c.is_correct))::int AS correct
       FROM games g JOIN questions q ON q.quiz_id = g.quiz_id JOIN choices c ON c.question_id = q.id
       WHERE g.id = $1 GROUP BY q.id ORDER BY q.position`,
      [gameId],
    );
    expect(
      rows.map((r) => [r.kind, r.points, r.time_limit_s, r.n, r.correct]),
    ).toEqual([
      ["quiz", "standard", 20, 4, 2],
      ["truefalse", "double", 10, 2, 1],
      ["quiz", "none", 10, 2, 1],
      ["quiz", "standard", 5, 2, 1],
    ]);
  });

  const pin = await lobbyPin(host);
  const ann = await joinPlayer(browser, pin, "Ann", errors);
  const bob = await joinPlayer(browser, pin, "Bob", errors);
  const cat = await joinPlayer(browser, pin, "Cat", errors);
  const kim = await joinPlayer(browser, pin, "Kim", errors);

  await test.step("lobby: live roster, kick, lock", async () => {
    await expect(host.locator("main li")).toHaveCount(4);
    await host.getByRole("button", { name: "Remove Kim" }).click();
    await expect(host.getByText("Kim")).toHaveCount(0);
    await kim.reload();
    await expect(kim).not.toHaveURL(/\/play\//);

    await host.getByRole("button", { name: /^Lock$/ }).click();
    await expect(host.getByRole("button", { name: /Locked/ })).toBeVisible();
    const late = await (await browser.newContext()).newPage();
    await late.goto("/");
    await late.getByLabel("Game PIN").fill(pin);
    await late.getByRole("button", { name: "Enter" }).click();
    await expect(late.getByText(/locked/i)).toBeVisible();
    await host.getByRole("button", { name: /Locked/ }).click();
    await expect(host.getByRole("button", { name: /^Lock$/ })).toBeVisible();
  });

  await host.getByRole("button", { name: "Start game" }).click();

  await test.step("Q1: two correct answers both score; scores stay hidden until reveal", async () => {
    await tile(ann, "7").click();
    await bob.waitForTimeout(2500); // Bob is slower, so he must score less than Ann
    await tile(bob, "11").click();
    await tile(cat, "4").click();
    await expect(scorePill(ann)).toHaveText("0");
    await expect(
      host.getByRole("button", { name: "Leaderboard" }),
    ).toBeVisible(); // auto-reveal
    await expect(ann.getByText("Correct")).toBeVisible();
    await expect(bob.getByText("Correct")).toBeVisible();
    await expect(cat.getByText("Not quite")).toBeVisible();
    await host.getByRole("button", { name: "Leaderboard" }).click();
    await expect(
      host.getByRole("heading", { name: "Leaderboard" }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Next question" }).click();
  });

  await test.step("Q2: double points", async () => {
    await tile(ann, "True").click();
    await tile(bob, "True").click();
    await tile(cat, "False").click();
    await host.getByRole("button", { name: "Leaderboard" }).click();
    await host.getByRole("button", { name: "Next question" }).click();
  });

  await test.step("Q3: no-points question pays +0", async () => {
    for (const p of [ann, bob, cat]) await tile(p, "2").click();
    await expect(ann.getByText("+0")).toBeVisible();
    await host.getByRole("button", { name: "Leaderboard" }).click();
    await host.getByRole("button", { name: "Next question" }).click();
  });

  await test.step("Q4: the timer runs out and reveals with no answers", async () => {
    await expect(tile(ann, "A")).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Final results" }),
    ).toBeVisible({ timeout: 12_000 });
    await expect(ann.getByText("No answer")).toBeVisible();
    await host.getByRole("button", { name: "Final results" }).click();
    await expect(host.getByRole("heading", { name: "Podium" })).toBeVisible();
  });

  const totals: Record<string, number> = {};
  await test.step("every stored score matches the formula", async () => {
    const { rows } = await db.query(
      `SELECT p.nickname, q.position, q.points AS points_kind, q.time_limit_s, a.is_correct, a.points, a.answered_ms
       FROM answers a JOIN players p ON p.id = a.player_id JOIN questions q ON q.id = a.question_id
       WHERE a.game_id = $1 ORDER BY q.position, p.nickname`,
      [gameId],
    );
    expect(rows).toHaveLength(9);
    for (const a of rows)
      expect(
        Math.abs(a.points - expectedPoints(a)),
        JSON.stringify(a),
      ).toBeLessThanOrEqual(1);
    expect(
      rows
        .map((a) => `${a.position}${a.nickname[0]}${a.is_correct ? "+" : "-"}`)
        .join(" "),
    ).toBe("0A+ 0B+ 0C- 1A+ 1B+ 1C- 2A+ 2B+ 2C+");
    const at = (pos: number, nick: string) =>
      rows.find((a) => a.position === pos && a.nickname === nick)!;
    expect(at(0, "Ann").points).toBeGreaterThan(at(0, "Bob").points); // faster scores more
    expect(at(1, "Ann").points).toBeGreaterThan(1000); // double points
    for (const n of ["Ann", "Bob", "Cat"])
      totals[n] = rows
        .filter((a) => a.nickname === n)
        .reduce((s, a) => s + a.points, 0);
  });

  await test.step("final screens, report and CSV agree with the database", async () => {
    for (const [n, p] of [
      ["Ann", ann],
      ["Bob", bob],
      ["Cat", cat],
    ] as const)
      await expect(p.locator("main")).toContainText(`${totals[n]} points`);
    await host.getByRole("link", { name: "View report" }).click();
    await expect(host.locator("main")).toContainText("Nobody answers this one");
    const csv = await host.evaluate(
      async (id) => (await fetch(`/reports/${id}/csv`)).text(),
      gameId,
    );
    for (const n of ["Ann", "Bob", "Cat"])
      expect(csv).toContain(`"${n}","${totals[n]}"`);
  });

  await test.step("edit and re-host after a game; old game's history is frozen", async () => {
    const csvBefore = await host.evaluate(
      async (id) => (await fetch(`/reports/${id}/csv`)).text(),
      gameId,
    );
    await host.goto("/dashboard");
    const editHref = (await host
      .getByRole("link", { name: /Edit Scratch quiz/ })
      .getAttribute("href"))!;
    await host.goto(editHref);
    await host.getByLabel("Title").fill("Scratch quiz v2");
    await host.getByRole("button", { name: /Nobody answers this one/ }).click();
    await host.getByRole("button", { name: "Delete" }).last().click();
    await host.getByRole("button", { name: "Save", exact: true }).click();
    await expect(host.getByText("All changes saved")).toBeVisible();

    // Save and host twice in a row, the second time while the first lobby is still open.
    await host.getByRole("button", { name: "Save and host" }).click();
    await host.waitForURL(/\/host\//);
    const second = host.url();
    await host.goto(editHref);
    await host.getByRole("button", { name: "Save and host" }).click();
    await host.waitForURL(
      (u) => u.pathname.startsWith("/host/") && u.href !== second,
    );

    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM games g JOIN quizzes s ON s.id = g.quiz_id
       WHERE s.source_quiz_id = (SELECT s2.source_quiz_id FROM games g2 JOIN quizzes s2 ON s2.id = g2.quiz_id WHERE g2.id = $1)
         AND g.phase <> 'ended'`,
      [gameId],
    );
    expect(rows[0].n).toBe(1); // hosting again ended the earlier lobby

    const csvAfter = await host.evaluate(
      async (id) => (await fetch(`/reports/${id}/csv`)).text(),
      gameId,
    );
    expect(csvAfter).toBe(csvBefore);
    await host.goto(`/reports/${gameId}`);
    await expect(host.locator("main")).toContainText("Nobody answers this one");
    await host.goto("/dashboard");
    await expect(host.locator("ul li").first()).toContainText(
      "Scratch quiz v2",
    );
    await expect(host.locator("ul li").first()).toContainText(
      "3 questions · played 3 times",
    );
  });

  await expectNoErrors(errors);
});
