// drizzle-kit auto-loads only `.env`; this app uses `.env.local` (written by `neon env pull`), so preload
// it first. The import's side effect runs before defineConfig reads process.env.
import "./src/lib/load-env";

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL. Run `neon deploy` (first time) or `neon env pull`.",
  );
}

export default defineConfig({
  schema: "./src/lib/schema.ts",
  dialect: "postgresql",
  // Only manage PopQuiz's tables, so `drizzle-kit push` against a shared
  // database never proposes dropping other tables.
  tablesFilter: [
    "quizzes",
    "questions",
    "choices",
    "games",
    "players",
    "answers",
    "api_tokens",
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
