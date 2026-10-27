"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { findGame } from "./actions/player";

export function PinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await findGame(pin);
      if (result.kind === "found") router.push(`/join/${pin}`);
      else setError(result.reason);
    });
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={submit}>
      <label className="sr-only" htmlFor="pin">
        Game PIN
      </label>
      <input
        aria-describedby={error ? "pin-error" : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        autoFocus
        className="tabular h-20 w-full rounded-2xl border-2 border-oat-300 bg-white text-center font-mono text-5xl tracking-[0.2em] text-navy shadow-lift outline-none focus:border-navy focus-visible:outline-none placeholder:font-sans placeholder:text-2xl placeholder:tracking-normal placeholder:text-navy-500"
        id="pin"
        inputMode="numeric"
        maxLength={6}
        onChange={(e) =>
          setPin(e.currentTarget.value.replace(/\D/g, "").slice(0, 6))
        }
        pattern="\d{6}"
        placeholder="6-digit PIN"
        value={pin}
      />
      <button
        className="btn-primary btn-lg"
        disabled={pin.length !== 6 || pending}
        type="submit"
      >
        {pending ? "Finding game…" : "Enter"}
      </button>
      <p
        aria-live="polite"
        className="min-h-5 text-center text-sm text-lava-600"
        id="pin-error"
      >
        {error}
      </p>
    </form>
  );
}
