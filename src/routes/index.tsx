import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WORDS } from "@/lib/words";
import { generateBoard, scoreFor, todayKey } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wordstorm — Daily Team Word Puzzle" },
      { name: "description", content: "Form as many words as you can in 90 seconds on today's shared board. Compete on the live team leaderboard." },
      { property: "og:title", content: "Wordstorm — Daily Team Word Puzzle" },
      { property: "og:description", content: "Form as many words as you can in 90 seconds. Live team leaderboard." },
    ],
  }),
  component: WordstormPage,
});

type Phase = "start" | "game" | "leaderboard";
type ScoreRow = { id: string; nickname: string; score: number; play_date: string; created_at: string };

function WordstormPage() {
  const [phase, setPhase] = useState<Phase>("start");
  const [nickname, setNickname] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        {phase === "start" && (
          <StartScreen
            nickname={nickname}
            setNickname={setNickname}
            onPlay={() => setPhase("game")}
          />
        )}
        {phase === "game" && (
          <GameScreen
            nickname={nickname.trim()}
            onFinish={(score, id) => {
              setFinalScore(score);
              setSubmittedId(id);
              setPhase("leaderboard");
            }}
          />
        )}
        {phase === "leaderboard" && (
          <Leaderboard
            myId={submittedId}
            myScore={finalScore}
            myName={nickname.trim()}
            onPlayAgain={() => setPhase("game")}
          />
        )}
      </div>
    </main>
  );
}

function StartScreen({
  nickname,
  setNickname,
  onPlay,
}: {
  nickname: string;
  setNickname: (s: string) => void;
  onPlay: () => void;
}) {
  const canPlay = nickname.trim().length > 0;
  return (
    <div className="bg-card rounded-3xl p-8 sm:p-10 shadow-[var(--shadow-card)] border border-border/60">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Daily Puzzle
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground">Wordstorm</h1>
        <p className="text-muted-foreground text-base max-w-sm mx-auto">
          Tap letters to spell as many words as you can in 90 seconds. Everyone plays today's board.
        </p>
      </div>

      <form
        className="mt-8 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canPlay) onPlay();
        }}
      >
        <label className="block text-sm font-medium text-foreground/80" htmlFor="nick">
          Your nickname
        </label>
        <input
          id="nick"
          autoFocus
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. wordsmith"
          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
        <button
          type="submit"
          disabled={!canPlay}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-[var(--shadow-tile-active)] hover:brightness-110 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition"
        >
          Play
        </button>
      </form>
    </div>
  );
}

function GameScreen({
  nickname,
  onFinish,
}: {
  nickname: string;
  onFinish: (score: number, id: string | null) => void;
}) {
  const boardKey = useMemo(() => todayKey(), []);
  const { tiles: board } = useMemo(() => generateBoard(boardKey), [boardKey]);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [feedback, setFeedback] = useState<"valid" | "invalid" | null>(null);
  const submittedRef = useRef(false);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // End of round — submit
  useEffect(() => {
    if (timeLeft > 0 || submittedRef.current) return;
    submittedRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("scores")
          .insert({ nickname: nickname.slice(0, 20), score, play_date: boardKey })
          .select("id")
          .single();
        if (error) throw error;
        onFinish(score, data?.id ?? null);
      } catch (e) {
        console.error(e);
        onFinish(score, null);
      }
    })();
  }, [timeLeft, score, nickname, boardKey, onFinish]);

  const word = selected.map((i) => board[i]).join("");

  const toggleTile = useCallback((i: number) => {
    setSelected((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  }, []);

  const clear = () => setSelected([]);

  const submit = () => {
    const w = word.toLowerCase();
    if (w.length < 3 || !WORDS.has(w) || found.includes(w)) {
      setFeedback("invalid");
      setTimeout(() => setFeedback(null), 450);
      return;
    }
    const pts = scoreFor(w.length);
    setScore((s) => s + pts);
    setFound((f) => [w, ...f]);
    setFeedback("valid");
    setSelected([]);
    setTimeout(() => setFeedback(null), 500);
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(1, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const timeUrgent = timeLeft <= 10;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
            {nickname}
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full font-mono font-bold text-lg tabular-nums tracking-tight ${timeUrgent ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-card border border-border text-foreground"}`}>
          {mm}:{ss}
        </div>
        <div className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-lg tabular-nums">
          {score}
        </div>
      </div>

      {/* Current word display */}
      <div
        className={`bg-card border border-border rounded-2xl p-4 min-h-[68px] flex items-center justify-center text-3xl font-bold tracking-[0.2em] uppercase ${feedback === "invalid" ? "animate-shake border-destructive text-destructive" : ""} ${feedback === "valid" ? "animate-flash border-success text-success" : ""}`}
      >
        {word || <span className="text-muted-foreground/40 text-base font-normal tracking-normal normal-case">Tap letters to spell a word</span>}
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3 select-none">
        {board.map((ch, i) => {
          const active = selected.includes(i);
          const order = selected.indexOf(i);
          return (
            <button
              key={i}
              onClick={() => toggleTile(i)}
              className={`relative aspect-square rounded-2xl text-3xl sm:text-4xl font-bold transition-all duration-100 active:scale-95 animate-pop ${
                active
                  ? "bg-tile-active text-tile-active-foreground shadow-[var(--shadow-tile-active)] -translate-y-0.5"
                  : "bg-tile text-tile-foreground shadow-[var(--shadow-tile)] hover:-translate-y-0.5"
              }`}
            >
              {ch}
              {active && (
                <span className="absolute top-1.5 right-2 text-[10px] font-mono opacity-80">
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={clear}
          disabled={selected.length === 0}
          className="py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Clear
        </button>
        <button
          onClick={submit}
          disabled={selected.length < 3}
          className="py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-tile-active)] hover:brightness-110 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition"
        >
          Submit
        </button>
      </div>

      {/* Found words */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground/80">Words found</h3>
          <span className="text-xs text-muted-foreground">{found.length}</span>
        </div>
        {found.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">None yet — go!</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {found.map((w) => (
              <span key={w} className="px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-sm font-medium">
                {w} <span className="opacity-60 text-xs">+{scoreFor(w.length)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Leaderboard({
  myId,
  myScore,
  myName,
  onPlayAgain,
}: {
  myId: string | null;
  myScore: number;
  myName: string;
  onPlayAgain: () => void;
}) {
  const day = useMemo(() => todayKey(), []);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchRows = async () => {
      const { data } = await supabase
        .from("scores")
        .select("id,nickname,score,play_date,created_at")
        .eq("play_date", day)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(50);
      if (mounted) {
        setRows((data ?? []) as ScoreRow[]);
        setLoading(false);
      }
    };
    fetchRows();
    const channel = supabase
      .channel("scores-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scores" }, () => fetchRows())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [day]);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium uppercase tracking-wider">
          Round Over
        </div>
        <h2 className="text-4xl font-bold">You scored {myScore}</h2>
        <p className="text-sm text-muted-foreground">
          Live team leaderboard · shared across everyone today
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Today's Top Players</h3>
          <span className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "score" : "scores"}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No scores yet today.</div>
        ) : (
          <ol className="divide-y divide-border">
            {rows.map((r, i) => {
              const rank = i + 1;
              const isMe = myId ? r.id === myId : false;
              const medals = ["🥇", "🥈", "🥉"];
              const topStyle =
                rank === 1
                  ? "bg-gradient-to-r from-accent/80 to-transparent"
                  : rank <= 3
                    ? "bg-accent/30"
                    : "";
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 px-5 py-3 ${topStyle} ${isMe ? "ring-2 ring-inset ring-primary" : ""}`}
                >
                  <div className="w-8 text-center font-bold text-muted-foreground tabular-nums">
                    {rank <= 3 ? <span className="text-xl">{medals[rank - 1]}</span> : `#${rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {r.nickname}
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-lg tabular-nums">{r.score}</div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-[var(--shadow-tile-active)] hover:brightness-110 active:translate-y-px transition"
      >
        Play again
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Hi {myName || "player"} — your score has been added to the team board.
      </p>
    </div>
  );
}
