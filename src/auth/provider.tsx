"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "./client";

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
    >
      {children}
    </NeonAuthUIProvider>
  );
}
