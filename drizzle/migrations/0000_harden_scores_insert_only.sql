-- Remove write privileges beyond insert/select for public roles
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.scores FROM anon, authenticated;
GRANT SELECT, INSERT ON public.scores TO anon, authenticated;
GRANT ALL ON public.scores TO service_role;

-- Hard data-integrity limits at the table level
ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_score_range;
ALTER TABLE public.scores ADD CONSTRAINT scores_score_range CHECK (score >= 0 AND score <= 2000);

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_words_found_range;
ALTER TABLE public.scores ADD CONSTRAINT scores_words_found_range CHECK (words_found >= 0 AND words_found <= 300);

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_nickname_len;
ALTER TABLE public.scores ADD CONSTRAINT scores_nickname_len CHECK (length(btrim(nickname)) BETWEEN 1 AND 20);

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_room_code_format;
ALTER TABLE public.scores ADD CONSTRAINT scores_room_code_format CHECK (room_code IS NULL OR room_code ~ '^WS-[A-Z0-9]{4}$');

-- Recreate the insert policy with the tighter score ceiling
DROP POLICY IF EXISTS "Anyone can insert valid scores" ON public.scores;
CREATE POLICY "Anyone can insert valid scores"
ON public.scores
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(nickname)) BETWEEN 1 AND 20
  AND score >= 0 AND score <= 2000
  AND words_found >= 0 AND words_found <= 300
  AND play_date = CURRENT_DATE
  AND (room_code IS NULL OR room_code ~ '^WS-[A-Z0-9]{4}$')
);
