import Link from "next/link";

import { Wordmark } from "@/ui/shapes";

import { NicknameForm } from "./nickname-form";

export const metadata = { title: "Join" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-4">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <p className="tabular mb-3 rounded-full bg-oat-200 px-3 py-1 font-mono text-sm">
          Game {pin}
        </p>
        <h1 className="mb-8 text-center text-4xl font-bold">Pick a nickname</h1>
        <NicknameForm pin={pin} />
      </main>
    </div>
  );
}
