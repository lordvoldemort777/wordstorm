
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS room_code text,
  ADD COLUMN IF NOT EXISTS words_found integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS scores_room_day_idx ON public.scores (room_code, play_date);

DROP POLICY IF EXISTS "Anyone can insert valid scores" ON public.scores;

CREATE POLICY "Anyone can insert valid scores"
ON public.scores
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(nickname)) BETWEEN 1 AND 20
  AND score BETWEEN 0 AND 10000
  AND words_found BETWEEN 0 AND 500
  AND play_date = CURRENT_DATE
  AND (room_code IS NULL OR room_code ~ '^WS-[A-Z0-9]{4}$')
);
