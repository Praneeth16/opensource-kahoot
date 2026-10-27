import { createMcpHandler, getPublicOrigin, withMcpAuth } from "mcp-handler";
import { z } from "zod";

import { verifyApiToken } from "@/lib/api-tokens";
import { TIME_LIMITS, type QuizInput } from "@/lib/quiz-input";
import { createGameFor, deleteQuizFor, saveQuizFor } from "@/lib/quiz-store";
import { getQuizDocument, listQuizzes, listRecentGames } from "@/lib/quizzes";
import { getReport } from "@/lib/reports";
import { getDb } from "@/lib/db";
import { games } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The PopQuiz MCP server: AI assistants (Claude Code, Codex, Cursor, …) author quizzes, start games and
// read results for the host who owns the personal access token. A person still runs the live game on
// the host screen. Writes go through the same code as the web editor (src/lib/quiz-store.ts).

const answer = z.object({
  text: z.string().describe("Answer text, 1–120 characters."),
  correct: z.boolean().describe("Whether this answer is correct."),
});

const question = z.object({
  text: z.string().describe("The question, 1–300 characters."),
  type: z
    .enum(["quiz", "true_false"])
    .default("quiz")
    .describe(
      '"quiz" has 2–4 answers; "true_false" has exactly the answers True and False.',
    ),
  answers: z
    .array(answer)
    .min(2)
    .max(4)
    .describe("2–4 answers, at least one correct. Several may be correct."),
  time_limit_seconds: z
    .number()
    .int()
    .optional()
    .describe(
      `One of ${TIME_LIMITS.join(", ")}. Default 20 (10 for true_false).`,
    ),
  points: z
    .enum(["standard", "double", "none"])
    .default("standard")
    .describe(
      "standard: up to 1000 for a fast correct answer, down to 500 at the time limit. double: twice that. none: 0.",
    ),
  image_url: z
    .string()
    .optional()
    .describe("Optional https image shown on the host screen."),
});

const quizFields = {
  title: z.string().describe("Quiz title, 1–120 characters."),
  description: z
    .string()
    .default("")
    .describe("Optional, up to 500 characters."),
  questions: z
    .array(question)
    .min(1)
    .max(100)
    .describe("1–100 questions, in play order."),
};

type FriendlyQuestion = z.infer<typeof question>;

// True/false answers are always stored as "True" then "False". Accept either order and any case from
// the model, keep which one it marked correct, and leave anything else for validation to reject.
function trueFalse(answers: FriendlyQuestion["answers"]) {
  const find = (label: string) =>
    answers.find((a) => a.text.trim().toLowerCase() === label);
  const t = find("true");
  const f = find("false");
  if (answers.length !== 2 || !t || !f) return answers;
  return [
    { text: "True", correct: t.correct },
    { text: "False", correct: f.correct },
  ];
}

function toQuizInput(
  id: string,
  title: string,
  description: string,
  qs: FriendlyQuestion[],
): QuizInput {
  return {
    id,
    title,
    description,
    questions: qs.map((q) => ({
      id: crypto.randomUUID(),
      kind: q.type === "true_false" ? "truefalse" : "quiz",
      body: q.text,
      image_url: q.image_url ?? "",
      time_limit_s: q.time_limit_seconds ?? (q.type === "true_false" ? 10 : 20),
      points: q.points,
      choices: (q.type === "true_false" ? trueFalse(q.answers) : q.answers).map(
        (a) => ({
          id: crypto.randomUUID(),
          body: a.text,
          is_correct: a.correct,
        }),
      ),
    })),
  };
}

function fromQuizInput(doc: QuizInput) {
  return {
    quiz_id: doc.id,
    title: doc.title,
    description: doc.description,
    questions: doc.questions.map((q) => ({
      text: q.body,
      type: q.kind === "truefalse" ? "true_false" : "quiz",
      answers: q.choices.map((c) => ({ text: c.body, correct: c.is_correct })),
      time_limit_seconds: q.time_limit_s,
      points: q.points,
      ...(q.image_url ? { image_url: q.image_url } : {}),
    })),
  };
}

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});
const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

type Ctx = {
  http?: { authInfo?: { extra?: Record<string, unknown> }; req?: Request };
};
const userOf = (ctx: Ctx) => ctx.http?.authInfo?.extra?.userId as string;
const originOf = (ctx: Ctx) =>
  ctx.http?.req ? getPublicOrigin(ctx.http.req) : "";
const uuid = z.uuid();

const mcp = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_quizzes",
      {
        title: "List quizzes",
        description:
          "Lists your quizzes, newest first, with question counts and how often each was played.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async (_args, ctx) => {
        const rows = await listQuizzes(userOf(ctx));
        return json(
          rows.map((q) => ({
            quiz_id: q.id,
            title: q.title,
            questions: q.question_count,
            times_played: q.play_count,
            updated_at: q.updated_at,
          })),
        );
      },
    );

    server.registerTool(
      "get_quiz",
      {
        title: "Get a quiz",
        description:
          "Returns one of your quizzes with every question and answer, in the same shape create_quiz takes.",
        inputSchema: z.object({ quiz_id: z.string() }),
        annotations: { readOnlyHint: true },
      },
      async ({ quiz_id }, ctx) => {
        if (!uuid.safeParse(quiz_id).success)
          return fail("quiz_id must be a UUID from list_quizzes.");
        const doc = await getQuizDocument(userOf(ctx), quiz_id);
        return doc
          ? json(fromQuizInput(doc))
          : fail("No quiz of yours has that id.");
      },
    );

    server.registerTool(
      "create_quiz",
      {
        title: "Create a quiz",
        description:
          "Creates a quiz from a title and its questions. Returns the quiz id and a link to edit it. Use host_game to play it.",
        inputSchema: z.object(quizFields),
      },
      async ({ title, description, questions }, ctx) => {
        const id = crypto.randomUUID();
        const result = await saveQuizFor(
          userOf(ctx),
          toQuizInput(id, title, description, questions),
        );
        if (result.kind === "rejected")
          return fail(`Not saved: ${result.reason}`);
        return json({
          quiz_id: id,
          questions: questions.length,
          edit_url: `${originOf(ctx)}/quizzes/${id}/edit`,
        });
      },
    );

    server.registerTool(
      "update_quiz",
      {
        title: "Replace a quiz",
        description:
          "Replaces the title, description and all questions of one of your quizzes. Get the current content with get_quiz first. Games already played keep their own copy, so their results don't change.",
        inputSchema: z.object({ quiz_id: z.string(), ...quizFields }),
      },
      async ({ quiz_id, title, description, questions }, ctx) => {
        if (!uuid.safeParse(quiz_id).success)
          return fail("quiz_id must be a UUID from list_quizzes.");
        if (!(await getQuizDocument(userOf(ctx), quiz_id)))
          return fail("No quiz of yours has that id.");
        const result = await saveQuizFor(
          userOf(ctx),
          toQuizInput(quiz_id, title, description, questions),
        );
        if (result.kind === "rejected")
          return fail(`Not saved: ${result.reason}`);
        return json({
          quiz_id,
          questions: questions.length,
          edit_url: `${originOf(ctx)}/quizzes/${quiz_id}/edit`,
        });
      },
    );

    server.registerTool(
      "delete_quiz",
      {
        title: "Delete a quiz",
        description:
          "Deletes one of your quizzes and all its game reports. This can't be undone.",
        inputSchema: z.object({ quiz_id: z.string() }),
        annotations: { destructiveHint: true },
      },
      async ({ quiz_id }, ctx) => {
        if (!uuid.safeParse(quiz_id).success)
          return fail("quiz_id must be a UUID from list_quizzes.");
        return (await deleteQuizFor(userOf(ctx), quiz_id))
          ? json({ deleted: quiz_id })
          : fail("No quiz of yours has that id.");
      },
    );

    server.registerTool(
      "host_game",
      {
        title: "Host a game",
        description:
          "Opens a new game lobby for one of your quizzes (ending your earlier unfinished game of it) and returns the PIN, the host screen link and the player join link. The host opens host_url in a browser signed in to PopQuiz, puts it on the big screen, and presses Start when players have joined.",
        inputSchema: z.object({ quiz_id: z.string() }),
      },
      async ({ quiz_id }, ctx) => {
        if (!uuid.safeParse(quiz_id).success)
          return fail("quiz_id must be a UUID from list_quizzes.");
        const gameId = await createGameFor(userOf(ctx), quiz_id);
        if (!gameId)
          return fail("No quiz of yours with questions has that id.");
        const [game] = await getDb()
          .select({ pin: games.pin })
          .from(games)
          .where(eq(games.id, gameId));
        const origin = originOf(ctx);
        return json({
          game_id: gameId,
          pin: game!.pin,
          host_url: `${origin}/host/${gameId}`,
          join_url: `${origin}/join/${game!.pin}`,
        });
      },
    );

    server.registerTool(
      "list_games",
      {
        title: "List recent games",
        description:
          "Lists your most recent games with their state and player counts.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async (_args, ctx) => {
        const rows = await listRecentGames(userOf(ctx));
        return json(
          rows.map((g) => ({
            game_id: g.id,
            quiz_title: g.title,
            pin: g.pin,
            state:
              g.phase === "ended"
                ? "finished"
                : g.phase === "lobby"
                  ? "lobby"
                  : "playing",
            players: g.player_count,
            created_at: g.created_at,
          })),
        );
      },
    );

    server.registerTool(
      "get_results",
      {
        title: "Get game results",
        description:
          "Final standings and per-question accuracy for one of your games.",
        inputSchema: z.object({ game_id: z.string() }),
        annotations: { readOnlyHint: true },
      },
      async ({ game_id }, ctx) => {
        if (!uuid.safeParse(game_id).success)
          return fail("game_id must be a UUID from list_games or host_game.");
        const report = await getReport(game_id, userOf(ctx));
        if (!report) return fail("No game of yours has that id.");
        return json({
          quiz_title: report.game.title,
          state: report.game.phase === "ended" ? "finished" : "in progress",
          standings: report.players.map((p, i) => ({
            rank: i + 1,
            nickname: p.nickname,
            score: p.score,
            correct: p.correct,
            answered: p.answered,
            avg_seconds:
              p.avg_ms == null ? null : Number((p.avg_ms / 1000).toFixed(2)),
          })),
          questions: report.questions.map((q) => ({
            number: q.position + 1,
            text: q.body,
            answered: q.answered,
            correct: q.correct,
            percent_correct: q.answered
              ? Math.round((q.correct / q.answered) * 100)
              : 0,
          })),
          report_url: `${originOf(ctx)}/reports/${game_id}`,
        });
      },
    );
  },
  { serverInfo: { name: "popquiz", version: "1.0.0" } },
);

// Personal access tokens from /connect. withMcpAuth answers 401 without a valid one.
const authed = withMcpAuth(
  mcp,
  async (_req, token) => {
    const userId = await verifyApiToken(token);
    return userId
      ? { token: token!, clientId: userId, scopes: [], extra: { userId } }
      : undefined;
  },
  { required: true },
);

const MAX_BODY_BYTES = 1_000_000;

// mcp-handler parses the JSON body itself with no size cap, so read it here, streamed and bounded.
async function handler(req: Request) {
  let body: Uint8Array | undefined;
  if (req.body) {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return tooLarge();
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return tooLarge();
      }
      chunks.push(value);
    }
    body = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.byteLength;
    }
  }
  // A fresh Request: the original's body stream has been read and can't be reused.
  const res = await authed(
    new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: body as BodyInit | undefined,
      signal: req.signal,
    }),
  );
  if (res.status !== 401) return res;
  // There is no OAuth server here: a token-only challenge stops clients from trying OAuth discovery.
  const headers = new Headers(res.headers);
  headers.set(
    "WWW-Authenticate",
    'Bearer realm="popquiz", error="invalid_token", error_description="Create a personal access token on /connect"',
  );
  return new Response(res.body, { status: 401, headers });
}

const tooLarge = () =>
  Response.json({ error: "Request body larger than 1 MB" }, { status: 413 });

export { handler as GET, handler as POST, handler as DELETE };
