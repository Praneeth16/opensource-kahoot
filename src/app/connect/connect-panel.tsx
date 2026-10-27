"use client";

import { type FormEvent, useState, useTransition } from "react";

import { createToken } from "@/app/actions/tokens";
import { Icon } from "@/ui/icons";

const PLACEHOLDER = "<your token>";

function setups(url: string, token: string) {
  return [
    {
      name: "Claude Code",
      code: `claude mcp add --transport http popquiz ${url} \\\n  --header "Authorization: Bearer ${token}"`,
    },
    {
      name: "Codex",
      code: `export POPQUIZ_TOKEN=${token}\ncodex mcp add popquiz --url ${url} \\\n  --bearer-token-env-var POPQUIZ_TOKEN`,
      note: 'Codex asks before each tool call. To skip that (needed for codex exec), add default_tools_approval_mode = "approve" under [mcp_servers.popquiz] in ~/.codex/config.toml.',
    },
    {
      name: "Cursor, Windsurf and other JSON configs",
      code: JSON.stringify(
        {
          mcpServers: {
            popquiz: { url, headers: { Authorization: `Bearer ${token}` } },
          },
        },
        null,
        2,
      ),
    },
    {
      name: "Claude Desktop (through mcp-remote)",
      code: JSON.stringify(
        {
          mcpServers: {
            popquiz: {
              command: "npx",
              args: [
                "-y",
                "mcp-remote",
                url,
                "--header",
                `Authorization: Bearer ${token}`,
              ],
            },
          },
        },
        null,
        2,
      ),
    },
  ];
}

function CopyBlock({
  label,
  code,
  note,
}: {
  label: string;
  code: string;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <button
          className="btn-ghost min-h-8 text-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          type="button"
        >
          <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-navy px-4 py-3 font-mono text-sm leading-relaxed text-oat">
        {code}
      </pre>
      {note && <p className="mt-1.5 text-sm text-navy-500">{note}</p>}
    </div>
  );
}

export function ConnectPanel({ mcpUrl }: { mcpUrl: string }) {
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createToken(name);
      if (result.kind === "rejected") return setError(result.reason);
      setToken(result.token);
      setName("");
    });
  }

  return (
    <>
      <section className="surface mt-8 p-5 lg:p-7">
        <h2 className="text-xl font-bold">1. Create a token</h2>
        <p className="mt-1 text-sm text-navy-500">
          It lets the assistant manage your quizzes. Make one per device, and
          revoke it here if it leaks.
        </p>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={submit}>
          <label className="sr-only" htmlFor="token-name">
            Token name
          </label>
          <input
            className="input min-w-0 flex-1 basis-60"
            id="token-name"
            maxLength={60}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Claude Code on my laptop"
            value={name}
          />
          <button
            className="btn-primary"
            disabled={pending || !name.trim()}
            type="submit"
          >
            {pending ? "Creating…" : "Create token"}
          </button>
        </form>
        {error && (
          <p className="notice-error mt-3" role="alert">
            {error}
          </p>
        )}
        {token && (
          <div className="mt-4" role="status">
            <CopyBlock
              code={token}
              label="Your token. Copy it now: it won't be shown again."
            />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">2. Add PopQuiz to your assistant</h2>
        <p className="mt-1 mb-5 text-sm text-navy-500">
          Server URL <span className="font-mono">{mcpUrl}</span>
          {token
            ? ". Your token is filled in below."
            : `. Replace ${PLACEHOLDER} with your token.`}
        </p>
        <div className="flex flex-col gap-6">
          {setups(mcpUrl, token ?? PLACEHOLDER).map((s) => (
            <CopyBlock
              code={s.code}
              key={s.name}
              label={s.name}
              note={s.note}
            />
          ))}
        </div>
      </section>
    </>
  );
}
