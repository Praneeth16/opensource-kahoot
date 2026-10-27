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

export const viewport: Viewport = {
  themeColor: "#f4eee4",
  viewportFit: "cover", // phones: content can use the notch area; pages pad with safe-area insets
};

// Direction contract (impeccable). Kept in the emitted markup so the finish review can audit it.
const CONTRACT = `<!--
THESIS: The host screen is a stage and the phone is a controller. One idea per screen, readable from the back of the room. Refuses the purple confetti game-show and the SaaS card grid.
OWN-WORLD: Warm muted, light. Parchment ground, warm charcoal ink, terracotta as the single action color; an answer quartet (terracotta triangle, dusty teal diamond, ochre circle, olive square) as full-bleed tiles. DM Sans tight display at stage scale; DM Mono only for PINs and timers; scores and counts in DM Sans tabular figures. Flat, 1px rules, 14px tiles, one soft lift. The host stage scales its root font with the viewport, so one layout fits 1280x720 to 4K.
STORY: Players type a PIN and a name and are in. Hosts write a quiz, press Start, and run the room.
FIRST VIEWPORT: Landing: the PIN field is the page, centered, mono, huge; Host link top right. Host stage: question at display size, a full-width ink timer bar that turns terracotta in the final five seconds, answer tiles filling the lower half; at reveal each tile carries its count and a fill bar.
FORM: Brief-pinned world, then a user-chosen palette refinement (Warm muted, 2026-10-28) with responsive adaptation. Refinement of an established world: impeccable runs no concept-seed roll for it, so no seed key exists. Code-led.
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
      <body className="min-h-dvh bg-ground text-ink">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
