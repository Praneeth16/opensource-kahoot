"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "./client";

// Social sign-in buttons. List only providers enabled on the Neon branch (`neon neon-auth oauth-provider
// list`): Google works out of the box with Neon's shared credentials; GitHub and Vercel need your own
// OAuth app. A button for a provider the branch doesn't have fails on click.
const SOCIAL_PROVIDERS = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "google")
  .split(",")
  .map((p) => p.trim())
  .filter((p): p is "google" | "github" | "vercel" =>
    ["google", "github", "vercel"].includes(p),
  );

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        window.location.assign("/dashboard");
        // Never settles, so the auth UI doesn't also navigate client-side.
        return new Promise<never>(() => {});
      }}
      Link={Link}
      defaultTheme="light"
      localization={{
        SIGN_IN: "Sign in",
        SIGN_UP: "Sign up",
        SIGN_IN_ACTION: "Sign in",
        SIGN_UP_ACTION: "Create account",
        SIGN_IN_DESCRIPTION: "Enter your email to sign in.",
        SIGN_UP_DESCRIPTION: "Create a host account to write and run quizzes.",
      }}
      redirectTo="/dashboard"
      social={
        SOCIAL_PROVIDERS.length ? { providers: SOCIAL_PROVIDERS } : undefined
      }
    >
      {children}
    </NeonAuthUIProvider>
  );
}
