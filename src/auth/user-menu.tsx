"use client";

import { authClient } from "./client";
import { leaveSession } from "./session-lost";

// The signed-in user's email and a Sign out button.
export function UserMenu({ email }: { readonly email: string }) {
  async function signOut() {
    await authClient.signOut();
    leaveSession();
  }

  return (
    <div className="flex min-w-0 items-center gap-1 text-sm text-ink-muted">
      <span className="hidden truncate sm:inline">{email}</span>
      <button className="btn-ghost" onClick={signOut} type="button">
        Sign out
      </button>
    </div>
  );
}
