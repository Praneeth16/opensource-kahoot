import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The single schema source: the app and `drizzle-kit push` both read it. Columns are declared snake_case
// on purpose. Realtime builds live rows from PostgreSQL's result names, so a camelCase JS property that
// mapped to a different column would give live rows different keys from server rows.

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The Managed Better Auth user id; only ever set from the session.
    owner_id: uuid("owner_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    // Set on the frozen copy a game plays (see createGame). Editing the original never touches a game
    // that is running or already played; deleting it deletes its snapshots and their games.
    source_quiz_id: uuid("source_quiz_id").references(
      (): AnyPgColumn => quizzes.id,
      { onDelete: "cascade" },
    ),
    created_at: createdAt(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quizzes_owner_idx").on(t.owner_id, t.updated_at),
    index("quizzes_source_idx").on(t.source_quiz_id),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quiz_id: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    kind: text("kind", { enum: ["quiz", "truefalse"] })
      .notNull()
      .default("quiz"),
    body: text("body").notNull(),
    image_url: text("image_url"),
    time_limit_s: smallint("time_limit_s").notNull().default(20),
    points: text("points", { enum: ["standard", "double", "none"] })
      .notNull()
      .default("standard"),
  },
  // Not unique: reordering rewrites positions row by row inside one statement.
  (t) => [index("questions_quiz_position_idx").on(t.quiz_id, t.position)],
);

export const choices = pgTable(
  "choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    question_id: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    body: text("body").notNull(),
    is_correct: boolean("is_correct").notNull().default(false),
  },
  (t) => [index("choices_question_idx").on(t.question_id, t.position)],
);

export const PHASES = [
  "lobby",
  "question",
  "reveal",
  "leaderboard",
  "ended",
] as const;
export type Phase = (typeof PHASES)[number];

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quiz_id: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    host_id: uuid("host_id").notNull(),
    pin: text("pin").notNull(),
    phase: text("phase", { enum: PHASES }).notNull().default("lobby"),
    // -1 in the lobby; the index (questions.position) of the current question afterwards.
    question_index: smallint("question_index").notNull().default(-1),
    question_started_at: timestamp("question_started_at", {
      withTimezone: true,
    }),
    locked: boolean("locked").notNull().default(false),
    created_at: createdAt(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // A PIN is unique among games still running; ended games free theirs.
    uniqueIndex("games_live_pin_idx")
      .on(t.pin)
      .where(sql`phase <> 'ended'`),
    index("games_host_idx").on(t.host_id, t.created_at),
  ],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    game_id: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    // sha256 of the random token in the player's cookie. The token itself is never stored.
    token_hash: text("token_hash").notNull(),
    kicked: boolean("kicked").notNull().default(false),
    created_at: createdAt(),
  },
  (t) => [
    uniqueIndex("players_game_nickname_idx").on(
      t.game_id,
      sql`lower(${t.nickname})`,
    ),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    game_id: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    player_id: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    question_id: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    choice_id: uuid("choice_id")
      .notNull()
      .references(() => choices.id, { onDelete: "cascade" }),
    is_correct: boolean("is_correct").notNull(),
    points: integer("points").notNull(),
    answered_ms: integer("answered_ms").notNull(),
    created_at: createdAt(),
  },
  (t) => [
    uniqueIndex("answers_player_question_idx").on(t.player_id, t.question_id),
    index("answers_game_question_idx").on(t.game_id, t.question_id),
  ],
);

export type Quiz = typeof quizzes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Choice = typeof choices.$inferSelect;
export type Game = typeof games.$inferSelect;
