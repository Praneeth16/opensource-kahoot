"use client";

import { type FormEvent, useState, useTransition } from "react";

import { joinGame } from "@/app/actions/player";

export function NicknameForm({ pin }: { pin: string }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinGame({ pin, nickname });
      // A full page load: the game page starts with a fresh Realtime client.
      if (result.kind === "joined")
        window.location.assign(`/play/${result.gameId}`);
      else setError(result.reason);
    });
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={submit}>
      <label className="sr-only" htmlFor="nickname">
        Nickname
      </label>
      <input
        aria-describedby="nickname-error"
        aria-invalid={error ? true : undefined}
        autoComplete="nickname"
        autoFocus
        className="h-16 w-full rounded-2xl border-2 border-rule bg-surface text-center text-2xl font-semibold text-ink shadow-lift outline-none placeholder:font-normal placeholder:text-ink-muted/60 focus:border-ink focus-visible:outline-none"
        id="nickname"
        maxLength={20}
        onChange={(e) => setNickname(e.currentTarget.value)}
        placeholder="Your name"
        value={nickname}
      />
      <button
        className="btn-primary btn-lg"
        disabled={!nickname.trim() || pending}
        type="submit"
      >
        {pending ? "Joining…" : "Join game"}
      </button>
      <p
        aria-live="polite"
        className="min-h-5 text-center text-sm text-action"
        id="nickname-error"
      >
        {error}
      </p>
    </form>
  );
}
