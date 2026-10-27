import { defineConfig } from "@neon/config/v1";

// `neon deploy` applies this to the linked branch: Managed Better Auth, Realtime, the janitor Function
// and its schedule, then writes the Neon env vars to .env.local.
export default defineConfig({
  auth: true,
  preview: {
    realtime: {
      // Browser origins allowed to open the Realtime WebSocket. Add each deployed origin, then run
      // `neon deploy`. A missing origin doesn't error: live screens just stay connecting.
      allowedOrigins: ["http://localhost:3000"],
    },
  },
  functions: {
    janitor: { name: "PopQuiz janitor", source: "functions/janitor.ts" },
  },
  triggers: {
    "janitor-15m": {
      type: "schedule",
      function: "janitor",
      cron: "*/15 * * * *",
    },
  },
});
