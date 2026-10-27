import { expect, test } from "@playwright/test";

import {
  cleanup,
  expectNoErrors,
  joinPlayer,
  lobbyPin,
  scorePill,
  signUpHost,
  tile,
  watch,
} from "./helpers";

test.afterAll(cleanup);

// The new-host path: empty dashboard, load the sample quiz, host it, and play all six questions.
test("sample quiz: full game to the podium", async ({ browser }) => {
  const errors: string[] = [];
  const host = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  watch(host, "host", errors);
  await signUpHost(host, "Sample Host");

  await host.getByRole("button", { name: "Load sample quiz" }).click();
  await host.waitForURL(/quizzes\/.*\/edit/);
  await host.getByRole("button", { name: "Save and host" }).click();
  await host.waitForURL(/\/host\//);

  const pin = await lobbyPin(host);
  const ada = await joinPlayer(browser, pin, "Ada", errors);
  const grace = await joinPlayer(browser, pin, "Grace", errors);

  await test.step("a nickname is unique per game, ignoring case", async () => {
    const dupe = await (await browser.newContext()).newPage();
    await dupe.goto(`/join/${pin}`);
    await dupe.getByLabel("Nickname").fill("ada");
    await dupe.getByRole("button", { name: "Join game" }).click();
    await expect(dupe.getByText("That nickname is taken")).toBeVisible();
  });

  await expect(host.getByText("Grace")).toBeVisible();
  await host.getByRole("button", { name: "Start game" }).click();

  // Ada answers right and fast; Grace answers wrong on 1, 4 and 6, right but slow on 2.
  const answers: [string, string][] = [
    ["DISTINCT", "UNIQUE"],
    ["True", "True"],
    ["Multi-Version Concurrency Control", "Multi-Version Concurrency Control"],
    ["B-tree", "GIN"],
    ["pg_current_xact_id()", "pg_current_xact_id()"],
    ["True", "False"],
  ];
  for (const [i, [a, g]] of answers.entries()) {
    await test.step(`question ${i + 1}`, async () => {
      await tile(ada, a).click();
      await expect(ada.getByText("Answer locked in")).toBeVisible();
      if (i === 0) await expect(scorePill(ada)).toHaveText("0"); // no score before reveal
      if (i === 1) await grace.waitForTimeout(3000);
      await tile(grace, g).click();
      const last = i === answers.length - 1;
      const next = host.getByRole("button", {
        name: last ? "Final results" : "Leaderboard",
      });
      await expect(next).toBeVisible(); // everyone answered: auto-reveal
      await expect(ada.getByText("Correct")).toBeVisible();
      await next.click();
      if (!last)
        await host.getByRole("button", { name: "Next question" }).click();
    });
  }

  await expect(host.getByRole("heading", { name: "Podium" })).toBeVisible();
  await expect(ada.locator("main")).toContainText("1st");
  await expect(ada.locator("main")).toContainText("6 correct");
  await expect(grace.locator("main")).toContainText("2nd");
  await expect(grace.locator("main")).toContainText("3 correct");
  await expectNoErrors(errors);
});
