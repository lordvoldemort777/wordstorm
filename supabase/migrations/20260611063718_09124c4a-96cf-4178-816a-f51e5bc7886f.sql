
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 32),
  score INT NOT NULL CHECK (score >= 0 AND score <= 100000),
  play_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.scores TO anon, authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scores" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scores" ON public.scores FOR INSERT WITH CHECK (true);
CREATE INDEX scores_date_score_idx ON public.scores (play_date, score DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
