import Link from "next/link";

import { UserMenu } from "@/auth/user-menu";

import { Wordmark } from "./shapes";

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-oat-300 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link aria-label="Dashboard" href="/dashboard">
          <Wordmark />
        </Link>
        <UserMenu email={email} />
      </div>
    </header>
  );
}
