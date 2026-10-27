# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Open community, any use: anyone who wants to run a live quiz. Two roles.

- **Hosts** sign in with Neon Auth, write quizzes, and run a live game, usually on a projector, a TV, or a shared video-call screen.
- **Players** join from a phone or laptop with a 6-digit game PIN and a nickname. They have no account and often join in under ten seconds.

## Product Purpose

PopQuiz is an open-source, self-hostable alternative to Kahoot. It exists because a Kahoot license expired and the team wants a free tool it controls. Success: a host can go from sign-in to a running game in about a minute, and every player screen stays in sync with the host screen without reloads.

## Positioning

A Neon reference app: Postgres is the only source of truth, live screens are Neon Realtime live SQL queries, hosts use Neon Managed Better Auth, and a Neon Function cleans up abandoned games. Anyone can fork it and deploy it to Vercel plus one Neon project.

## Operating Context

- Host screen is seen from across a room or through screen share, so it must read at distance.
- Player screens are phones held in one hand, often on slow networks.
- One game has a lobby, timed questions, a reveal, a leaderboard, and a podium.

## Capabilities and Constraints

- Quizzes: title, description, up to 100 questions. Each question is "quiz" (2 to 4 answers) or "true or false", with a time limit (5 to 240 s), points (standard, double, none), and an optional image URL.
- Scoring is speed-based like Kahoot: up to 1000 points for a correct answer, falling to 500 at the time limit.
- Hosts can lock the lobby, remove players, skip ahead, and end the game. Reports show final standings and per-question accuracy, with CSV export.
- Stack: Next.js 16 App Router, Tailwind v4, Drizzle, Neon Postgres, Neon Auth, Neon Realtime, Neon Functions, Vercel hosting.

## Brand Commitments

- Name: PopQuiz (working name).
- Binding from the user: light theme only; Databricks fonts (DM Sans and DM Mono); bloat-free and simple. Palette: "Warm muted", chosen by the user on 2026-10-28 to replace the brighter Databricks colors: parchment ground #F4EEE4, surface #FBF8F2, warm charcoal ink #2E2A27, terracotta #B8482E as the action color, answer quartet terracotta / dusty teal #2F6B78 / ochre #D69A2D / olive #5E7334.
- Every screen is supported: phones (portrait and landscape), tablets, laptops, desktops, and projectors or TVs up to 4K, where the host stage fits one screen without scrolling.
- Voice: playful but professional. Game moments (countdown, reveal, podium) can celebrate; everything else is plain and clear.
- Answer options always carry a shape (triangle, diamond, circle, square) as well as a color.

## Evidence on Hand

No testimonials, users, or metrics exist. Do not invent any.

## Product Principles

1. Joining a game takes a PIN and a nickname, nothing more.
2. The host screen is a stage: one idea at a time, readable from the back of the room.
3. Never leak the answer: correctness and scores appear only at reveal.
4. Small and forkable: few dependencies, plain code, one Neon project.

## Accessibility & Inclusion

Color is never the only signal (shapes and labels). Large touch targets on player screens. Respect reduced motion.
