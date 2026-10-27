import Link from "next/link";

import { Wordmark } from "@/ui/shapes";

import { PinForm } from "./pin-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Wordmark />
        <Link className="btn-ghost" href="/dashboard">
          Host a quiz
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <h1 className="mb-2 text-center text-4xl font-bold sm:text-5xl">
          Join a game
        </h1>
        <p className="mb-8 text-center text-navy-500">
          Enter the PIN on the host&apos;s screen.
        </p>
        {notice === "removed" && (
          <p className="notice-error mb-4" role="alert">
            The host removed you from that game.
          </p>
        )}
        {notice === "ended" && (
          <p
            className="mb-4 rounded-xl bg-oat-200 px-3.5 py-2.5 text-sm"
            role="status"
          >
            That game has ended. Thanks for playing.
          </p>
        )}
        <PinForm />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-sm text-navy-500">
        Open source. Runs on{" "}
        <a
          className="underline decoration-oat-300 underline-offset-4 hover:text-navy"
          href="https://neon.com"
        >
          Neon
        </a>
        : Postgres, Auth, Realtime and Functions.
      </footer>
    </div>
  );
}
