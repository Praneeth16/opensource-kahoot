import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: { default: "PopQuiz", template: "%s · PopQuiz" },
  description:
    "An open-source live quiz game built on Neon: Postgres, Managed Better Auth, Realtime and Functions.",
};

export const viewport: Viewport = { themeColor: "#f9f7f4" };

// Direction contract (impeccable). Kept in the emitted markup so the finish review can audit it.
const CONTRACT = `<!--
THESIS: The host screen is a stage and the phone is a controller. One idea per screen, readable from the back of the room. Refuses the purple confetti game-show and the SaaS card grid.
OWN-WORLD: Databricks light. Oat ground, Navy ink, Lava as the single action color; an answer quartet (Lava triangle, Blue diamond, Gold circle, Green square) as full-bleed tiles. DM Sans tight display at stage scale, DM Mono only for PINs and timers; scores and counts in DM Sans tabular figures. Flat, 1px oat rules, 14px tiles, one soft lift.
STORY: Players type a PIN and a name and are in. Hosts write a quiz, press Start, and run the room.
FIRST VIEWPORT: Landing: the PIN field is the page, centered, mono, huge; Host link top right. Host stage: question at display size, full-width Navy timer bar that turns Lava in the final five seconds, answer tiles filling the lower half.
FORM: Brief-pinned world (Databricks palette and font, light). The concept-seed roll (scripts/concept-seed.mjs) was not run, so the free composition axes were never rolled and no seed key exists; the composition is the builder's own. Code-led.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // On the auth pages, next-themes (inside NeonAuthUIProvider) sets class and color-scheme on <html>
    // before hydration. This suppresses <html>'s own attributes only.
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-oat text-navy">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
