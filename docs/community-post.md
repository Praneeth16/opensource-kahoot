# Draft: Neon community post

Post this yourself in the Neon Discord (#showcase) or on the Neon community forum. Replace `<demo-url>` with the Vercel URL first.

---

**Title:** PopQuiz: an open-source Kahoot alternative on Neon Postgres, Auth, Realtime and Functions

Hi everyone. Our Kahoot license ran out, so we built our own live quiz game on Neon and made it open source.

- Repo: https://github.com/Praneeth16/opensource-kahoot
- Live demo: <demo-url>

**How it works.** A host signs in, writes a quiz and starts a game. Players join from their phones with a 6-digit PIN and a nickname. They don't need an account. The game runs through a lobby, timed questions, a reveal with answer counts, a leaderboard and a podium. Afterwards there is a report with a CSV download.

**What each Neon service does:**

- **Postgres** is the only source of truth. Scores are computed in the same `INSERT` that records an answer, from the database clock. A correct answer earns up to 1000 points, falling to 500 at the time limit.
- **Managed Better Auth** handles host sign-up and sign-in.
- **Realtime** drives every live screen with six live SQL queries. The server seals each one after checking the host session or the player's cookie. The correct answer and the scores are masked in SQL with a `CASE` on the game phase until the reveal, so reading the network traffic doesn't give the answer away. Each write returns `pg_current_xact_id()`, and the client waits on `awaitTxId()`, so the host's buttons and the players' phones stay in step.
- **Functions** host a small janitor on a 15-minute schedule trigger. It ends games the host abandoned and cleans up lobbies that never started.

The app is Next.js 16 on Vercel, with Drizzle and `node-postgres`. Setup is `neon init`, `neon deploy`, `npm run db:push`, then `npm run dev`.

**One thing we learned.** Two live queries that depend on each other (the game row and the current question) can arrive at the client a moment apart. We put the question's position in its live row and only act when it matches the game's current index. Before that fix, the host screen sometimes auto-revealed a new question the instant it opened.

It's inspired by the Supabase community's kahoot-alternative. Feedback and PRs are welcome.
