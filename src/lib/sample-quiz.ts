import type { QuizInput } from "./quiz-input";

const id = () => crypto.randomUUID();

const q = (
  body: string,
  answers: string[],
  correct: number,
  extra: Partial<QuizInput["questions"][number]> = {},
): QuizInput["questions"][number] => ({
  id: id(),
  kind: "quiz",
  body,
  image_url: "",
  time_limit_s: 20,
  points: "standard",
  choices: answers.map((body, i) => ({
    id: id(),
    body,
    is_correct: i === correct,
  })),
  ...extra,
});

/** A ready-to-play quiz for empty dashboards, so a new host can try a game in seconds. */
export function sampleQuiz(): QuizInput {
  return {
    id: id(),
    title: "Postgres & Neon trivia",
    description: "Six quick questions to try a live game.",
    questions: [
      q(
        "Which SQL keyword removes duplicate rows from a result?",
        ["UNIQUE", "DISTINCT", "SINGLE", "ONLY"],
        1,
      ),
      q(
        "Neon branches are copy-on-write, so creating one is instant.",
        ["True", "False"],
        0,
        { kind: "truefalse", time_limit_s: 10 },
      ),
      q(
        "What does MVCC stand for?",
        [
          "Multi-Version Concurrency Control",
          "Managed Virtual Cluster Compute",
          "Multiple Value Column Cache",
          "Minimal Vacuum Cost Control",
        ],
        0,
      ),
      q(
        "Which index type does Postgres create by default?",
        ["Hash", "GIN", "B-tree", "BRIN"],
        2,
      ),
      q(
        "Which function returns the current transaction id?",
        ["txid()", "pg_current_xact_id()", "current_tx()", "pg_xid()"],
        1,
        { points: "double", time_limit_s: 30 },
      ),
      q(
        "JSONB stores JSON in a decomposed binary format.",
        ["True", "False"],
        0,
        {
          kind: "truefalse",
          time_limit_s: 10,
        },
      ),
    ],
  };
}
