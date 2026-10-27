import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";

import { Wordmark } from "@/ui/shapes";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-4">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <main className="auth-touch flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <p className="mb-6 max-w-sm text-center text-ink-muted">
          Hosts sign in to write and run quizzes. Players don&apos;t need an
          account.
        </p>
        {/* Without `redirectTo` here, the auth UI reads an unchecked `?redirectTo=` from the URL. */}
        <AuthView path={path} redirectTo="/dashboard" />
      </main>
    </div>
  );
}
