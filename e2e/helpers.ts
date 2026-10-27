import { type Browser, expect, type Page } from "@playwright/test";
import { Pool } from "pg";

// Hosts created by the suite share this address pattern so afterAll can remove their data.
export const TEST_EMAIL_LIKE = "popquiz.e2e+%@example.com";

// Shared by every spec in the worker; allowExitOnIdle lets the worker exit without an explicit end().
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  allowExitOnIdle: true,
});

/** Deletes every quiz (and with it, its snapshots, games, players and answers) of the suite's hosts. */
export async function cleanup() {
  await db.query(
    `DELETE FROM quizzes WHERE owner_id IN (SELECT id FROM neon_auth."user" WHERE email LIKE $1)`,
    [TEST_EMAIL_LIKE],
  );
}

/** Collects uncaught page errors and 5xx responses; assert it's empty at the end of a test. */
export function watch(page: Page, name: string, errors: string[]) {
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${name}: ${r.status()} ${r.url()}`);
  });
}

export async function signUpHost(page: Page, name: string) {
  await page.goto("/auth/sign-up");
  await page.getByLabel(/name/i).first().fill(name);
  await page.getByLabel(/email/i).fill(`popquiz.e2e+${Date.now()}@example.com`);
  await page
    .getByLabel(/^password/i)
    .first()
    .fill("PopQuiz-e2e-2026!");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 30_000 });
}

/** The 6-digit PIN on the host lobby. */
export async function lobbyPin(host: Page) {
  return (await host.locator("p.font-mono").first().innerText()).replace(
    /\D/g,
    "",
  );
}

/** A player on a phone-sized screen in their own browser context (own cookies), joined by PIN. */
export async function joinPlayer(
  browser: Browser,
  pin: string,
  nickname: string,
  errors: string[],
) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  watch(page, nickname, errors);
  await page.goto("/");
  await page.getByLabel("Game PIN").fill(pin);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL(/\/join\//);
  await page.getByLabel("Nickname").fill(nickname);
  await page.getByRole("button", { name: "Join game" }).click();
  await page.waitForURL(/\/play\//);
  return page;
}

/** A player's answer button: its accessible name is "<answer> (<shape>)". */
export const tile = (player: Page, answer: string) =>
  player.getByRole("button", {
    name: new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(`),
  });

/** The score pill in a player's header. */
export const scorePill = (player: Page) =>
  player.locator("header span.rounded-full");

/** Kahoot-style points, recomputed independently of the server's SQL. */
export function expectedPoints(a: {
  is_correct: boolean;
  points_kind: "standard" | "double" | "none";
  time_limit_s: number;
  answered_ms: number;
}) {
  if (!a.is_correct) return 0;
  const mult =
    a.points_kind === "double" ? 2 : a.points_kind === "none" ? 0 : 1;
  return (
    Math.round(
      1000 * (1 - Math.min(1, a.answered_ms / 1000 / a.time_limit_s) / 2),
    ) * mult
  );
}

export async function expectNoErrors(errors: string[]) {
  expect(errors, errors.join("\n")).toEqual([]);
}
