"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createGame } from "@/app/actions/game";
import { saveQuiz } from "@/app/actions/quiz";
import {
  type QuestionInput,
  type QuizInput,
  TIME_LIMITS,
} from "@/lib/quiz-input";
import { Icon } from "@/ui/icons";
import { ANSWER_STYLES, Shape } from "@/ui/shapes";

const id = () => crypto.randomUUID();

export function blankQuestion(
  kind: "quiz" | "truefalse" = "quiz",
): QuestionInput {
  return {
    id: id(),
    kind,
    body: "",
    image_url: "",
    time_limit_s: kind === "truefalse" ? 10 : 20,
    points: "standard",
    choices:
      kind === "truefalse"
        ? [
            { id: id(), body: "True", is_correct: true },
            { id: id(), body: "False", is_correct: false },
          ]
        : [0, 1, 2, 3].map(() => ({ id: id(), body: "", is_correct: false })),
  };
}

/** Blank optional answers (3rd and 4th) are dropped rather than blocking a save. */
function normalize(q: QuestionInput): QuestionInput {
  if (q.kind !== "quiz") return q;
  return { ...q, choices: q.choices.filter((c, i) => i < 2 || c.body.trim()) };
}

/** Problems that block a save, per question, so the rail can flag them. */
function problems(raw: QuestionInput) {
  const q = normalize(raw);
  const list: string[] = [];
  if (!q.body.trim()) list.push("Add the question text.");
  if (q.choices.some((c) => !c.body.trim())) list.push("Fill in every answer.");
  if (!q.choices.some((c) => c.is_correct))
    list.push("Mark at least one correct answer.");
  if (q.image_url && !/^https:\/\//.test(q.image_url))
    list.push("Image URLs must start with https://.");
  return list;
}

export function QuizEditor({
  initial,
  isNew = false,
}: {
  initial: QuizInput;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [quiz, setQuiz] = useState(initial);
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState(!isNew);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = quiz.questions[selected]!;

  function update(patch: Partial<QuizInput>) {
    setQuiz((q) => ({ ...q, ...patch }));
    setDirty(true);
  }
  function updateQuestion(patch: Partial<QuestionInput>) {
    update({
      questions: quiz.questions.map((q, i) =>
        i === selected ? { ...q, ...patch } : q,
      ),
    });
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= quiz.questions.length) return;
    const next = [...quiz.questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    update({ questions: next });
    setSelected(to);
  }
  function remove(index: number) {
    if (quiz.questions.length === 1) return;
    update({ questions: quiz.questions.filter((_, i) => i !== index) });
    setSelected(Math.max(0, Math.min(selected, quiz.questions.length - 2)));
  }
  function add(kind: "quiz" | "truefalse") {
    update({ questions: [...quiz.questions, blankQuestion(kind)] });
    setSelected(quiz.questions.length);
  }

  function save(thenHost = false) {
    setError(null);
    const firstBad = quiz.questions.findIndex((q) => problems(q).length);
    if (!quiz.title.trim()) return setError("Give the quiz a title.");
    if (firstBad >= 0) {
      setSelected(firstBad);
      return setError(
        `Question ${firstBad + 1}: ${problems(quiz.questions[firstBad]!)[0]}`,
      );
    }
    startTransition(async () => {
      const result = await saveQuiz({
        ...quiz,
        questions: quiz.questions.map(normalize),
      });
      if (result.kind === "rejected") return setError(result.reason);
      setDirty(false);
      setSaved(true);
      if (thenHost) await createGame(result.id);
      else if (isNew) router.replace(`/quizzes/${result.id}/edit`);
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="btn-ghost -ml-3" href="/dashboard">
          <Icon name="back" /> Quizzes
        </Link>
        <div className="flex items-center gap-2">
          <span aria-live="polite" className="mr-2 text-sm text-navy-500">
            {pending
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : saved
                  ? "All changes saved"
                  : ""}
          </span>
          <button
            className="btn-quiet"
            disabled={pending}
            onClick={() => save()}
            type="button"
          >
            Save
          </button>
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() => save(true)}
            type="button"
          >
            <Icon name="play" /> Save and host
          </button>
        </div>
      </div>

      {error && (
        <p className="notice-error mb-5" role="alert">
          {error}
        </p>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-[2fr_3fr]">
        <div>
          <label className="field-label" htmlFor="title">
            Title
          </label>
          <input
            className="input text-lg font-semibold"
            id="title"
            maxLength={120}
            onChange={(e) => update({ title: e.currentTarget.value })}
            placeholder="Friday team trivia"
            value={quiz.title}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="description">
            Description{" "}
            <span className="font-normal text-navy-500">(optional)</span>
          </label>
          <input
            className="input"
            id="description"
            maxLength={500}
            onChange={(e) => update({ description: e.currentTarget.value })}
            placeholder="What's this quiz about?"
            value={quiz.description}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label="Questions" className="flex flex-col gap-2">
          <ol className="flex flex-col gap-1.5">
            {quiz.questions.map((q, i) => {
              const bad =
                problems(q).length > 0 &&
                (q.body || q.choices.some((c) => c.body));
              return (
                <li key={q.id}>
                  <button
                    aria-current={i === selected ? "true" : undefined}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${i === selected ? "border-navy bg-white" : "border-transparent hover:bg-oat-200"}`}
                    onClick={() => setSelected(i)}
                    type="button"
                  >
                    <span className="tabular mt-0.5 w-5 shrink-0 font-mono text-sm text-navy-500">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`line-clamp-2 text-sm ${q.body ? "font-medium" : "text-navy-500 italic"}`}
                      >
                        {q.body || "Untitled question"}
                      </span>
                      <span className="mt-0.5 block text-xs text-navy-500">
                        {q.kind === "truefalse" ? "True or false" : "Quiz"} ·{" "}
                        {q.time_limit_s}s
                        {bad && (
                          <span className="ml-1.5 font-semibold text-lava-600">
                            · needs work
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              className="btn-quiet text-sm"
              onClick={() => add("quiz")}
              type="button"
            >
              <Icon name="plus" /> Quiz
            </button>
            <button
              className="btn-quiet text-sm"
              onClick={() => add("truefalse")}
              type="button"
            >
              <Icon name="plus" /> True/false
            </button>
          </div>
        </nav>

        <section
          aria-label={`Question ${selected + 1}`}
          className="surface p-5 lg:p-7"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Question {selected + 1}</h2>
            <div className="flex items-center gap-1">
              <button
                aria-label="Move question up"
                className="btn-ghost"
                disabled={selected === 0}
                onClick={() => move(selected, selected - 1)}
                type="button"
              >
                <Icon name="up" />
              </button>
              <button
                aria-label="Move question down"
                className="btn-ghost"
                disabled={selected === quiz.questions.length - 1}
                onClick={() => move(selected, selected + 1)}
                type="button"
              >
                <Icon name="down" />
              </button>
              <button
                className="btn-ghost hover:text-lava-600"
                disabled={quiz.questions.length === 1}
                onClick={() => remove(selected)}
                type="button"
              >
                <Icon name="trash" /> Delete
              </button>
            </div>
          </div>

          <label className="field-label" htmlFor="q-body">
            Question
          </label>
          <textarea
            className="input min-h-24 resize-y text-lg"
            id="q-body"
            maxLength={300}
            onChange={(e) => updateQuestion({ body: e.currentTarget.value })}
            placeholder="Type your question"
            value={current.body}
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="q-kind">
                Type
              </label>
              <select
                className="input"
                id="q-kind"
                onChange={(e) => {
                  const kind = e.currentTarget.value as "quiz" | "truefalse";
                  const fresh = blankQuestion(kind);
                  updateQuestion({ kind, choices: fresh.choices });
                }}
                value={current.kind}
              >
                <option value="quiz">Quiz (2–4 answers)</option>
                <option value="truefalse">True or false</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="q-time">
                Time limit
              </label>
              <select
                className="input"
                id="q-time"
                onChange={(e) =>
                  updateQuestion({
                    time_limit_s: Number(e.currentTarget.value),
                  })
                }
                value={current.time_limit_s}
              >
                {TIME_LIMITS.map((t) => (
                  <option key={t} value={t}>
                    {t < 60
                      ? `${t} seconds`
                      : `${t / 60} minute${t > 60 ? "s" : ""}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="q-points">
                Points
              </label>
              <select
                className="input"
                id="q-points"
                onChange={(e) =>
                  updateQuestion({
                    points: e.currentTarget.value as QuestionInput["points"],
                  })
                }
                value={current.points}
              >
                <option value="standard">Standard</option>
                <option value="double">Double</option>
                <option value="none">No points</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="field-label" htmlFor="q-image">
              Image URL{" "}
              <span className="font-normal text-navy-500">
                (optional, https)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                className="input"
                id="q-image"
                inputMode="url"
                onChange={(e) =>
                  updateQuestion({ image_url: e.currentTarget.value.trim() })
                }
                placeholder="https://…"
                value={current.image_url}
              />
              {current.image_url && /^https:\/\//.test(current.image_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-11 shrink-0 rounded-lg border border-oat-300 object-cover"
                  src={current.image_url}
                />
              )}
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="field-label">
              Answers{" "}
              <span className="font-normal text-navy-500">
                · tick the correct ones
              </span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {current.choices.map((c, i) => {
                const style = ANSWER_STYLES[i]!;
                return (
                  <div
                    className={`flex items-center gap-3 rounded-[var(--radius-tile)] border-2 bg-white p-2 pl-3 transition-colors ${c.is_correct ? "border-green-600" : "border-oat-300"}`}
                    key={c.id}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${style.tile}`}
                    >
                      <Shape className="size-5" index={i} />
                    </span>
                    <input
                      aria-label={`Answer ${i + 1} (${style.name})`}
                      className="min-w-0 flex-1 bg-transparent py-2 font-medium outline-none placeholder:font-normal placeholder:text-navy-500"
                      maxLength={120}
                      onChange={(e) => {
                        const body = e.currentTarget.value;
                        updateQuestion({
                          choices: current.choices.map((x) =>
                            x.id === c.id ? { ...x, body } : x,
                          ),
                        });
                      }}
                      placeholder={`Answer ${i + 1}${i >= 2 && current.kind === "quiz" ? " (optional)" : ""}`}
                      readOnly={current.kind === "truefalse"}
                      value={c.body}
                    />
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-navy-500 hover:bg-oat-200">
                      <input
                        checked={c.is_correct}
                        className="size-4 accent-green-600"
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          updateQuestion({
                            choices: current.choices.map((x) =>
                              current.kind === "truefalse"
                                ? { ...x, is_correct: x.id === c.id }
                                : x.id === c.id
                                  ? { ...x, is_correct: checked }
                                  : x,
                            ),
                          });
                        }}
                        type={
                          current.kind === "truefalse" ? "radio" : "checkbox"
                        }
                        name={`correct-${current.id}`}
                      />
                      Correct
                    </label>
                  </div>
                );
              })}
            </div>
            {current.kind === "quiz" && (
              <div className="mt-3 flex gap-2">
                {current.choices.length < 4 && (
                  <button
                    className="btn-ghost text-sm"
                    onClick={() =>
                      updateQuestion({
                        choices: [
                          ...current.choices,
                          { id: id(), body: "", is_correct: false },
                        ],
                      })
                    }
                    type="button"
                  >
                    <Icon name="plus" /> Add answer
                  </button>
                )}
                {current.choices.length > 2 && (
                  <button
                    className="btn-ghost text-sm"
                    onClick={() =>
                      updateQuestion({ choices: current.choices.slice(0, -1) })
                    }
                    type="button"
                  >
                    Remove last answer
                  </button>
                )}
              </div>
            )}
          </fieldset>
        </section>
      </div>
    </main>
  );
}
