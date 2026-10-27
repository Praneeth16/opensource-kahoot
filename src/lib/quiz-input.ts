import { z } from "zod";

// Shared by the editor (types, inline checks) and saveQuiz (the real validation).

export const TIME_LIMITS = [5, 10, 20, 30, 60, 90, 120, 240] as const;
export const POINTS = ["standard", "double", "none"] as const;

const choice = z.object({
  id: z.uuid(),
  body: z.string().trim().min(1, "Every answer needs text").max(120),
  is_correct: z.boolean(),
});

const question = z
  .object({
    id: z.uuid(),
    kind: z.enum(["quiz", "truefalse"]),
    body: z.string().trim().min(1, "Every question needs text").max(300),
    image_url: z
      .union([z.url({ protocol: /^https$/ }), z.literal("")])
      .transform((v) => v || null),
    time_limit_s: z
      .number()
      .int()
      .refine((n) => (TIME_LIMITS as readonly number[]).includes(n)),
    points: z.enum(POINTS),
    choices: z.array(choice).min(2).max(4),
  })
  .refine((q) => q.choices.some((c) => c.is_correct), {
    message: "Mark at least one correct answer",
  })
  .refine(
    (q) =>
      q.kind !== "truefalse" ||
      (q.choices.length === 2 &&
        q.choices[0]!.body === "True" &&
        q.choices[1]!.body === "False" &&
        q.choices.filter((c) => c.is_correct).length === 1),
    {
      message:
        'True or false questions have the answers "True" then "False", with exactly one correct',
    },
  );

export const quizInput = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Give the quiz a title").max(120),
  description: z.string().trim().max(500),
  questions: z
    .array(question)
    .min(1, "Add at least one question")
    .max(100, "100 questions at most"),
});

export type QuizInput = z.input<typeof quizInput>;
export type QuestionInput = QuizInput["questions"][number];

/** A new, empty question. Shared by the editor and the server-rendered "new quiz" page. */
export function blankQuestion(
  kind: "quiz" | "truefalse" = "quiz",
): QuestionInput {
  return {
    id: crypto.randomUUID(),
    kind,
    body: "",
    image_url: "",
    time_limit_s: kind === "truefalse" ? 10 : 20,
    points: "standard",
    choices:
      kind === "truefalse"
        ? [
            { id: crypto.randomUUID(), body: "True", is_correct: true },
            { id: crypto.randomUUID(), body: "False", is_correct: false },
          ]
        : [0, 1, 2, 3].map(() => ({
            id: crypto.randomUUID(),
            body: "",
            is_correct: false,
          })),
  };
}
