# PopQuiz

An open-source live quiz game, like Kahoot, built on [Neon](https://neon.com). Hosts write a quiz and run it on a big screen. Players join from their phones with a game PIN and a nickname. They do not need an account.

**Live demo:** https://opensource-kahoot.vercel.app

It is inspired by the Supabase community's [kahoot-alternative](https://github.com/supabase-community/kahoot-alternative). This version uses Neon for everything on the backend.

| Host screen                                                    | Player phone                                            |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| ![Lobby with PIN and QR code](docs/screenshots/host-lobby.png) | ![Answer buttons](docs/screenshots/player-question.png) |
| ![Question with timer](docs/screenshots/host-question.png)     | ![Correct answer](docs/screenshots/player-correct.png)  |
| ![Reveal with answer counts](docs/screenshots/host-reveal.png) |                                                         |
| ![Podium](docs/screenshots/host-podium.png)                    |                                                         |

## Features

- **Quizzes.** Create, edit, duplicate and delete quizzes. Each question is a quiz question with 2 to 4 answers, or a true or false question. Set a time limit (5 seconds to 4 minutes), points (standard, double or none) and an optional image. A sample quiz gets new hosts started.
- **Live games.** The lobby shows the PIN, a QR code and the players as they join. The host can lock the lobby and remove players. Each question shows a countdown. The answer is revealed when time runs out or when everyone has answered. Then come the answer counts, a leaderboard and a podium at the end.
- **Kahoot-style scoring.** A correct answer is worth up to 1000 points. The value falls to 500 at the time limit, so faster answers score more. The database clock decides the time, not the browser.
- **No cheating by inspection.** The correct answer and the scores are hidden in SQL until the host reveals them. A player who reads the network traffic sees nothing early.
- **Reports.** Final standings, accuracy per question and a CSV download.

## How it uses Neon

| Neon service            | What it does here                                                                                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Postgres**            | Stores quizzes, games, players and answers. It is the only source of truth. Scores are computed inside the insert that records an answer.                                                                                                                                                                      |
| **Managed Better Auth** | Hosts sign up and sign in. Players do not use it. They get a random token in an httpOnly cookie, and the database keeps only its hash.                                                                                                                                                                         |
| **Realtime**            | Every live screen is a live SQL query: game state, current question, players, answer counts, standings and the player's own answers. The server seals each query after it checks the host session or the player cookie. Writes return their transaction id, so the screen updates the moment the change lands. |
| **Functions**           | `functions/janitor.ts` runs every 15 minutes on a schedule trigger. It ends games that the host abandoned for 2 hours, and deletes lobbies that never started after a day.                                                                                                                                     |

The app itself is a Next.js 16 App Router project, hosted on Vercel. It uses Drizzle with `node-postgres`.

## Run it yourself

You need Node.js 22.18 or newer and a Neon account. Functions currently run in `aws-us-east-1`, `aws-us-east-2`, `aws-eu-central-1` and `aws-ap-southeast-1`, so create your project in one of those regions.

```bash
git clone https://github.com/Praneeth16/opensource-kahoot.git && cd opensource-kahoot
npm install
npm i -g neon@latest
neon login
neon init -y --services postgres,auth,functions,realtime   # links or creates a Neon project
neon deploy --update-existing                              # enables Auth and Realtime, deploys the janitor, writes .env.local
printf '\nNEON_AUTH_COOKIE_SECRET=%s\n' "$(openssl rand -base64 32)" >> .env.local
npm run db:push                                            # creates the tables
npm run dev                                                # http://localhost:3000
```

### Social sign-in

Hosts can sign in with Google out of the box: Neon enables it on every branch with shared credentials. Those show Neon's name on Google's consent screen, so use your own Google OAuth app for production. GitHub and Vercel sign-in always need your own OAuth app.

1. Create the OAuth app with the provider. Set its callback (redirect) URI to `{NEON_AUTH_BASE_URL}/callback/{provider}`, for example `.../neondb/auth/callback/github`.
2. Add it to the branch: `neon neon-auth oauth-provider add --provider-id github --oauth-client-id <id> --oauth-client-secret <secret>`.
3. List it for the sign-in page: `NEXT_PUBLIC_OAUTH_PROVIDERS=google,github` (default `google`), locally in `.env.local` and on Vercel.

See Neon's [Set up OAuth](https://neon.com/docs/auth/guides/setup-oauth) guide for details.

Next.js must run on port 3000, because that is the origin Realtime allows in `neon.ts`. If port 3000 is busy, the live screens stay stuck on connecting.

## Deploy to Vercel

1. Import the repo in Vercel, or run `npx vercel`.
2. Set these environment variables from your `.env.local`: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET` and `NEON_AUTH_COOKIE_SECRET`.
3. Add your Vercel URL to `preview.realtime.allowedOrigins` in `neon.ts`, then run `neon deploy --update-existing`.
4. Trust the domain for sign-in: `neon neon-auth domain add https://your-app.vercel.app`.

`npm run build` needs no environment variables, so builds work without secrets.

## Project layout

```
neon.ts                     Neon services: Auth, Realtime origins, the janitor Function and its schedule
functions/janitor.ts        The Neon Function
src/lib/schema.ts           Drizzle schema (snake_case columns, which Realtime needs)
src/lib/live.ts             Every live query, with answer masking in SQL
src/app/actions/            Server Actions for quizzes, host controls and players
src/app/api/games/[id]/live Renews sealed live queries for hosts and players
src/app/host/[gameId]       The host's big screen
src/app/play/[gameId]       The player's phone
src/app/quizzes/            The quiz editor
src/app/reports/            Reports and CSV
```

## License

MIT
