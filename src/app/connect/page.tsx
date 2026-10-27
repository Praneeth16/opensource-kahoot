import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { revokeToken } from "@/app/actions/tokens";
import { getUser } from "@/auth/server";
import { listApiTokens } from "@/lib/api-tokens";
import { AppHeader } from "@/ui/app-header";

import { ConnectPanel } from "./connect-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI assistants" };

export default async function ConnectPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const tokens = await listApiTokens(user.id);
  const h = await headers();
  const mcpUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/api/mcp`;

  return (
    <>
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <h1 className="text-4xl font-bold">Use PopQuiz from an AI assistant</h1>
        <p className="mt-3 max-w-2xl text-navy-500">
          Connect Claude, Codex, Cursor or any MCP client, then ask it to write
          a quiz, host it, or read the results. A person still runs the game on
          the big screen.
        </p>
        <p className="mt-4 rounded-xl bg-oat-200 px-4 py-3 text-sm">
          Try:{" "}
          <em>
            “Create a 10-question quiz about the solar system, mix in a few true
            or false questions, then host it.”
          </em>
        </p>

        <ConnectPanel mcpUrl={mcpUrl} />

        <section className="mt-12">
          <h2 className="mb-3 text-xl font-bold">Your tokens</h2>
          {tokens.length === 0 ? (
            <p className="text-navy-500">No tokens yet.</p>
          ) : (
            <ul className="surface divide-y divide-oat-300">
              {tokens.map((t) => (
                <li
                  className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3"
                  key={t.id}
                >
                  <span className="min-w-0 flex-1 font-semibold">{t.name}</span>
                  <span className="font-mono text-sm text-navy-500">
                    {t.prefix}…
                  </span>
                  <span className="tabular text-sm text-navy-500">
                    {t.last_used_at
                      ? `Last used ${t.last_used_at.toLocaleDateString("en", { month: "short", day: "numeric" })}`
                      : "Never used"}
                  </span>
                  <form action={revokeToken.bind(null, t.id)}>
                    <button
                      className="btn-ghost hover:text-lava-600"
                      type="submit"
                    >
                      Revoke
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
