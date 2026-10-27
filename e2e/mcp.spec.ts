import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { expect, test } from "@playwright/test";

import {
  cleanup,
  db,
  expectNoErrors,
  joinPlayer,
  signUpHost,
  tile,
  watch,
} from "./helpers";

test.afterAll(cleanup);

async function mcpClient(baseURL: string, token: string) {
  const client = new Client({ name: "popquiz-e2e", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("/api/mcp", baseURL), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}

const text = (result: { content?: unknown }) =>
  ((result.content as { type: string; text: string }[])[0]?.text ??
    "") as string;
const data = (result: { content?: unknown }) => JSON.parse(text(result));

// An assistant authors a quiz and starts the game over MCP; people play it in browsers; the assistant
// reads the results. Then: a revoked token is refused and another host's quiz is invisible.
test("MCP: create quiz, host, play, results, token revoke and isolation", async ({
  browser,
  baseURL,
}) => {
  const errors: string[] = [];
  const host = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  watch(host, "host", errors);
  await signUpHost(host, "MCP Host");

  let token = "";
  await test.step("create a token on /connect", async () => {
    await host.getByRole("link", { name: "AI assistants" }).click();
    await host.getByLabel("Token name").fill("e2e");
    await host.getByRole("button", { name: "Create token" }).click();
    token = (await host.getByRole("status").locator("pre").innerText()).trim();
    expect(token).toMatch(/^pq_[\w-]{40,}$/);
    await expect(host.locator("pre").nth(1)).toContainText(`Bearer ${token}`); // setup is filled in
  });

  const client = await mcpClient(baseURL!, token);

  await test.step("tools are listed", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "create_quiz",
        "delete_quiz",
        "get_quiz",
        "get_results",
        "host_game",
        "list_games",
        "list_quizzes",
        "update_quiz",
      ].sort(),
    );
  });

  await test.step("an invalid quiz is refused with a message the model can act on", async () => {
    const bad = await client.callTool({
      name: "create_quiz",
      arguments: {
        title: "Bad",
        questions: [
          {
            text: "No correct answer",
            answers: [
              { text: "a", correct: false },
              { text: "b", correct: false },
            ],
          },
        ],
      },
    });
    expect(bad.isError).toBe(true);
    expect(text(bad)).toContain("Mark at least one correct answer");
  });

  await test.step("true/false: any case and order is normalized; two correct answers are refused", async () => {
    const ok = await client.callTool({
      name: "create_quiz",
      arguments: {
        title: "TF",
        questions: [
          {
            text: "Sky is blue.",
            type: "true_false",
            answers: [
              { text: "false", correct: false },
              { text: "TRUE", correct: true },
            ],
          },
        ],
      },
    });
    const tf = data(
      await client.callTool({
        name: "get_quiz",
        arguments: { quiz_id: data(ok).quiz_id },
      }),
    );
    expect(tf.questions[0].answers).toEqual([
      { text: "True", correct: true },
      { text: "False", correct: false },
    ]);
    await client.callTool({
      name: "delete_quiz",
      arguments: { quiz_id: data(ok).quiz_id },
    });
    const both = await client.callTool({
      name: "create_quiz",
      arguments: {
        title: "TF2",
        questions: [
          {
            text: "Both?",
            type: "true_false",
            answers: [
              { text: "True", correct: true },
              { text: "False", correct: true },
            ],
          },
        ],
      },
    });
    expect(both.isError).toBe(true);
    expect(text(both)).toContain("exactly one correct");
  });

  await test.step("a request over 1 MB is refused before parsing", async () => {
    const res = await fetch(new URL("/api/mcp", baseURL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/list",
        params: { pad: "x".repeat(1_100_000) },
      }),
    });
    expect(res.status).toBe(413);
  });

  let quizId = "";
  await test.step("create_quiz saves exactly what was sent", async () => {
    const created = await client.callTool({
      name: "create_quiz",
      arguments: {
        title: "MCP capitals",
        description: "Made by an assistant",
        questions: [
          {
            text: "Capital of France?",
            answers: [
              { text: "Paris", correct: true },
              { text: "Rome", correct: false },
              { text: "Oslo", correct: false },
            ],
          },
          {
            text: "Tokyo is in Japan.",
            type: "true_false",
            answers: [
              { text: "True", correct: true },
              { text: "False", correct: false },
            ],
            points: "double",
          },
        ],
      },
    });
    expect(created.isError).toBeFalsy();
    quizId = data(created).quiz_id;
    const got = data(
      await client.callTool({
        name: "get_quiz",
        arguments: { quiz_id: quizId },
      }),
    );
    expect(got.title).toBe("MCP capitals");
    expect(
      got.questions.map(
        (q: { type: string; points: string; time_limit_seconds: number }) => [
          q.type,
          q.points,
          q.time_limit_seconds,
        ],
      ),
    ).toEqual([
      ["quiz", "standard", 20],
      ["true_false", "double", 10],
    ]);
    const list = data(
      await client.callTool({ name: "list_quizzes", arguments: {} }),
    );
    expect(list).toHaveLength(1);
    await host.goto("/dashboard");
    await expect(host.locator("ul li").first()).toContainText("MCP capitals");
  });

  let game: {
    game_id: string;
    pin: string;
    host_url: string;
    join_url: string;
  };
  await test.step("host_game returns working links", async () => {
    game = data(
      await client.callTool({
        name: "host_game",
        arguments: { quiz_id: quizId },
      }),
    );
    expect(game.pin).toMatch(/^\d{6}$/);
    expect(game.join_url).toContain(`/join/${game.pin}`);
    await host.goto(game.host_url);
    await expect(
      host.getByRole("button", { name: "Start game" }),
    ).toBeVisible();
  });

  await test.step("people play it", async () => {
    const ann = await joinPlayer(browser, game.pin, "Ann", errors);
    const bob = await joinPlayer(browser, game.pin, "Bob", errors);
    await host.getByRole("button", { name: "Start game" }).click();
    await tile(ann, "Paris").click();
    await tile(bob, "Rome").click();
    await host.getByRole("button", { name: "Leaderboard" }).click();
    await host.getByRole("button", { name: "Next question" }).click();
    await tile(ann, "True").click();
    await tile(bob, "True").click();
    await host.getByRole("button", { name: "Final results" }).click();
    await expect(host.getByRole("heading", { name: "Podium" })).toBeVisible();
  });

  await test.step("get_results matches the database", async () => {
    const results = data(
      await client.callTool({
        name: "get_results",
        arguments: { game_id: game.game_id },
      }),
    );
    const { rows } = await db.query(
      `SELECT p.nickname, sum(a.points)::int AS score FROM answers a JOIN players p ON p.id = a.player_id
       WHERE a.game_id = $1 GROUP BY p.nickname ORDER BY score DESC`,
      [game.game_id],
    );
    expect(results.state).toBe("finished");
    expect(
      results.standings.map((s: { nickname: string; score: number }) => [
        s.nickname,
        s.score,
      ]),
    ).toEqual(rows.map((r) => [r.nickname, r.score]));
    expect(
      results.questions.map(
        (q: { percent_correct: number }) => q.percent_correct,
      ),
    ).toEqual([50, 100]);
    const games = data(
      await client.callTool({ name: "list_games", arguments: {} }),
    );
    expect(games[0]).toMatchObject({
      game_id: game.game_id,
      state: "finished",
      players: 2,
    });
  });

  await test.step("another host can't see or touch this host's quiz", async () => {
    const other = await (await browser.newContext()).newPage();
    await signUpHost(other, "Other Host");
    await other.goto("/connect");
    await other.getByLabel("Token name").fill("other");
    await other.getByRole("button", { name: "Create token" }).click();
    const otherToken = (
      await other.getByRole("status").locator("pre").innerText()
    ).trim();
    const otherClient = await mcpClient(baseURL!, otherToken);
    expect(
      data(await otherClient.callTool({ name: "list_quizzes", arguments: {} })),
    ).toEqual([]);
    for (const [name, args] of [
      ["get_quiz", { quiz_id: quizId }],
      ["host_game", { quiz_id: quizId }],
      ["delete_quiz", { quiz_id: quizId }],
      ["get_results", { game_id: game.game_id }],
    ] as const) {
      const r = await otherClient.callTool({ name, arguments: args });
      expect(r.isError, name).toBe(true);
    }
    await otherClient.close();
  });

  await test.step("delete_quiz, then a revoked token is refused", async () => {
    expect(
      data(
        await client.callTool({
          name: "delete_quiz",
          arguments: { quiz_id: quizId },
        }),
      ),
    ).toEqual({ deleted: quizId });
    await client.close();
    await host.goto("/connect");
    await host.getByRole("button", { name: "Revoke" }).click();
    await expect(host.getByText("No tokens yet.")).toBeVisible();
    const res = await fetch(new URL("/api/mcp", baseURL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
    // Token-only challenge: no OAuth metadata for clients to chase.
    expect(res.headers.get("www-authenticate")).not.toContain(
      "resource_metadata",
    );
  });

  await expectNoErrors(errors);
});
