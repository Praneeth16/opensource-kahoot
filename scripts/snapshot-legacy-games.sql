-- One-off migration for databases created before games played snapshots (quizzes.source_quiz_id).
-- For every editable quiz that games point at directly, the existing row (with its questions, choices
-- and the answers that reference them) becomes the frozen snapshot of those games, and a fresh editable
-- copy takes its place on the host's dashboard. Idempotent: a second run finds nothing to do.
-- Run with: psql "$DATABASE_URL" -f scripts/snapshot-legacy-games.sql
BEGIN;
DO $$
DECLARE
  legacy record;
  copy_id uuid;
BEGIN
  FOR legacy IN
    SELECT z.* FROM quizzes z
    WHERE z.source_quiz_id IS NULL AND EXISTS (SELECT 1 FROM games g WHERE g.quiz_id = z.id)
    FOR UPDATE
  LOOP
    INSERT INTO quizzes (owner_id, title, description, created_at, updated_at)
    VALUES (legacy.owner_id, legacy.title, legacy.description, legacy.created_at, legacy.updated_at)
    RETURNING id INTO copy_id;

    WITH qmap AS MATERIALIZED (
      SELECT id AS old_id, gen_random_uuid() AS new_id FROM questions WHERE quiz_id = legacy.id
    ), qs AS (
      INSERT INTO questions (id, quiz_id, position, kind, body, image_url, time_limit_s, points)
      SELECT m.new_id, copy_id, q.position, q.kind, q.body, q.image_url, q.time_limit_s, q.points
      FROM questions q JOIN qmap m ON m.old_id = q.id
    )
    INSERT INTO choices (question_id, position, body, is_correct)
    SELECT m.new_id, c.position, c.body, c.is_correct FROM choices c JOIN qmap m ON m.old_id = c.question_id;

    UPDATE quizzes SET source_quiz_id = copy_id WHERE id = legacy.id;
    RAISE NOTICE 'quiz % (%) -> snapshot of new editable quiz %', legacy.id, legacy.title, copy_id;
  END LOOP;
END $$;
COMMIT;
