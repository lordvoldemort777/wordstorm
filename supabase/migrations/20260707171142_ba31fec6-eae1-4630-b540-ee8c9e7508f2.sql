
-- Tighten scores INSERT policy: no more WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert scores" ON public.scores;

CREATE POLICY "Anyone can insert valid scores"
ON public.scores
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(nickname)) BETWEEN 1 AND 20
  AND score BETWEEN 0 AND 10000
  AND play_date = CURRENT_DATE
);

-- Restrict Realtime channel subscriptions: only allow the scores-live topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow scores realtime read" ON realtime.messages;
CREATE POLICY "Allow scores realtime read"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  realtime.topic() LIKE 'scores-live%'
);
