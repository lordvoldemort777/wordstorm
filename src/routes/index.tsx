import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  canBuildFrom,
  generateBoard,
  scoreFor,
  SCORE_TABLE,
  todayKey,
  useDictionary,
} from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wordstorm — Daily Team Word Puzzle" },
      { name: "description", content: "Type as many words as you can in 90 seconds using today's 9 letters. Live team leaderboard." },
      { property: "og:title", content: "Wordstorm — Daily Team Word Puzzle" },
      { property: "og:description", content: "Type words from today's 9 letters. Live team leaderboard." },
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
  const [revealedAnchor, setRevealedAnchor] = useState<string>("");

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
            onFinish={(score, id, anchor) => {
              setFinalScore(score);
              setSubmittedId(id);
              setRevealedAnchor(anchor);
              setPhase("leaderboard");
            }}
          />
        )}
        {phase === "leaderboard" && (
          <Leaderboard
            myId={submittedId}
            myScore={finalScore}
            myName={nickname.trim()}
            anchor={revealedAnchor}
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
          Type as many words as you can from today's 9 letters. Min 3, max 9 letters. 90 seconds — and yes, all 9 letters form one word.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border/60 bg-muted/60 px-4 py-3">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-center mb-2">
          Scoring by word length
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {SCORE_TABLE.map((s) => (
            <div key={s.len} className="rounded-md bg-card border border-border/60 py-1">
              <div className="text-[10px] text-muted-foreground font-mono">{s.len}</div>
              <div className="text-sm font-bold text-primary tabular-nums">{s.pts}</div>
            </div>
          ))}
        </div>
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
  onFinish: (score: number, id: string | null, anchor: string) => void;
}) {
  const boardKey = useMemo(() => todayKey(), []);
  const { tiles: board, anchor } = useMemo(() => generateBoard(boardKey), [boardKey]);
  const { dict, ready } = useDictionary();

  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [feedback, setFeedback] = useState<{ kind: "valid" | "invalid"; msg: string } | null>(null);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute which board letter slots are "covered" by the current input
  const usedIndices = useMemo(() => {
    const used: number[] = [];
    const cleaned = input.toLowerCase().replace(/[^a-z]/g, "");
    const taken = new Set<number>();
    for (const ch of cleaned) {
      const idx = board.findIndex((t, i) => !taken.has(i) && t.toLowerCase() === ch);
      if (idx === -1) {
        used.push(-1);
      } else {
        taken.add(idx);
        used.push(idx);
      }
    }
    return new Set(used.filter((i) => i >= 0));
  }, [input, board]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        onFinish(score, data?.id ?? null, anchor);
      } catch (e) {
        console.error(e);
        onFinish(score, null, anchor);
      }
    })();
  }, [timeLeft, score, nickname, boardKey, onFinish, anchor]);

  const flash = (kind: "valid" | "invalid", msg: string) => {
    setFeedback({ kind, msg });
    setTimeout(() => setFeedback(null), kind === "valid" ? 600 : 500);
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const w = input.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return;
    if (w.length < 3) return flash("invalid", "Too short (min 3)");
    if (w.length > 9) return flash("invalid", "Too long (max 9)");
    if (!canBuildFrom(w, board)) return flash("invalid", "Uses letters not on the board");
    if (found.includes(w)) return flash("invalid", "Already found");
    if (!dict || !dict.has(w)) return flash("invalid", "Not in dictionary");
    const pts = scoreFor(w.length);
    setScore((s) => s + pts);
    setFound((f) => [w, ...f]);
    flash("valid", `+${pts}`);
    setInput("");
  };

  const shuffle = () => {
    // visual shuffle of tile order is intentionally not seeded — purely cosmetic
    // (we leave the board fixed to keep daily comparability; do nothing here)
  };
  void shuffle;

  const mm = String(Math.floor(timeLeft / 60)).padStart(1, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const timeUrgent = timeLeft <= 10;
  const cleanedInput = input.toLowerCase().replace(/[^a-z]/g, "");
  const allOk = cleanedInput.length >= 3 && cleanedInput.length <= 9 && canBuildFrom(cleanedInput, board);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground truncate max-w-[40%]">
          {nickname}
        </div>
        <div className={`px-4 py-1.5 rounded-full font-mono font-bold text-lg tabular-nums tracking-tight ${timeUrgent ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-card border border-border text-foreground"}`}>
          {mm}:{ss}
        </div>
        <div className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-lg tabular-nums">
          {score}
        </div>
      </div>

      {/* Letter bank — 3x3 (tap to append) */}
      <div className="grid grid-cols-3 gap-3 select-none max-w-sm mx-auto w-full">
        {board.map((ch, i) => {
          const active = usedIndices.has(i);
          const disabled = !ready || timeLeft <= 0 || input.length >= 9;
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => {
                setInput((v) => (v + ch).slice(0, 9).toUpperCase());
                inputRef.current?.focus();
              }}
              className={`aspect-square rounded-2xl text-4xl sm:text-5xl font-bold flex items-center justify-center transition-all duration-150 animate-pop active:scale-95 disabled:opacity-60 ${
                active
                  ? "bg-tile-active text-tile-active-foreground shadow-[var(--shadow-tile-active)] -translate-y-0.5"
                  : "bg-tile text-tile-foreground shadow-[var(--shadow-tile)]"
              }`}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {/* Mobile helper buttons */}
      <div className="flex gap-2 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={() => {
            setInput((v) => v.slice(0, -1));
            inputRef.current?.focus();
          }}
          disabled={!input || timeLeft <= 0}
          className="flex-1 py-2 rounded-xl bg-muted text-foreground font-medium border border-border disabled:opacity-40 active:translate-y-px"
        >
          ⌫ Delete
        </button>
        <button
          type="button"
          onClick={() => {
            setInput("");
            inputRef.current?.focus();
          }}
          disabled={!input || timeLeft <= 0}
          className="flex-1 py-2 rounded-xl bg-muted text-foreground font-medium border border-border disabled:opacity-40 active:translate-y-px"
        >
          Clear
        </button>
      </div>

      {/* Typing input */}
      <form onSubmit={submit} className="space-y-2">
        <div
          className={`bg-card border rounded-2xl flex items-center gap-2 px-2 py-2 transition ${
            feedback?.kind === "invalid" ? "animate-shake border-destructive" : feedback?.kind === "valid" ? "animate-flash border-success" : "border-border"
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 9))}
            placeholder={ready ? "Type a word and hit Enter…" : "Loading dictionary…"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={9}
            disabled={!ready || timeLeft <= 0}
            className="flex-1 bg-transparent px-3 py-2 text-2xl font-bold tracking-[0.15em] uppercase placeholder:text-muted-foreground/40 placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-base focus:outline-none"
          />
          <button
            type="submit"
            disabled={!allOk || timeLeft <= 0}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-tile-active)] hover:brightness-110 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition"
          >
            Enter
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 min-h-[18px]">
          <span>
            {feedback ? (
              <span className={feedback.kind === "valid" ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {feedback.msg}
              </span>
            ) : (
              "Use only the 9 letters above · 3–9 letters"
            )}
          </span>
          <span className="tabular-nums">{cleanedInput.length}/9</span>
        </div>
      </form>

      {/* Scoring legend */}
      <div className="bg-card/60 border border-border/60 rounded-xl px-3 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Scoring · 3–9 letters
          </span>
          <div className="flex flex-wrap gap-1">
            {SCORE_TABLE.map((s) => (
              <span
                key={s.len}
                className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-muted text-foreground/80"
              >
                {s.len}→<span className="font-bold text-primary">{s.pts}</span>
              </span>
            ))}
          </div>
        </div>
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
  anchor,
  onPlayAgain,
}: {
  myId: string | null;
  myScore: number;
  myName: string;
  anchor: string;
  onPlayAgain: () => void;
}) {
  const today = useMemo(() => todayKey(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [tab, setTab] = useState<"today" | "yesterday">("today");
  const day = tab === "today" ? today : yesterday;
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
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
      .channel(`scores-live-${day}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scores", filter: `play_date=eq.${day}` }, () => fetchRows())
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
          Live team leaderboard · resets daily
        </p>
      </div>

      {/* Reveal the 9-letter word */}
      {anchor && (
        <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-[var(--shadow-card)]">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Today's 9-letter word
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-[0.25em] uppercase text-primary">
            {anchor}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Worth {scoreFor(9)} points if you found it
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
        {(["today", "yesterday"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 rounded-lg font-semibold text-sm capitalize transition ${
              tab === t
                ? "bg-card text-foreground shadow-[var(--shadow-card)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">{tab === "today" ? "Today's" : "Yesterday's"} Top Players</h3>
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
