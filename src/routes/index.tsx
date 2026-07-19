import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
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

type Phase = "start" | "game" | "results" | "leaderboard";
type ScoreRow = {
  id: string;
  nickname: string;
  score: number;
  play_date: string;
  created_at: string;
  words_found: number | null;
  room_code: string | null;
};

const ROOM_RE = /^WS-[A-Z0-9]{4}$/;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateRoomCode(): string {
  let s = "WS-";
  for (let i = 0; i < 4; i++) {
    s += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return s;
}

function WordstormPage() {
  const [phase, setPhase] = useState<Phase>("start");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalWords, setFinalWords] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [revealedAnchor, setRevealedAnchor] = useState<string>("");

  // Auto-detect ?room= on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("room");
    if (code) {
      const normalized = code.toUpperCase().trim();
      if (ROOM_RE.test(normalized)) {
        setRoomCode(normalized);
      }
    }
  }, []);

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        {phase === "start" && (
          <StartScreen
            nickname={nickname}
            setNickname={setNickname}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            onPlay={() => setPhase("game")}
          />
        )}
        {phase === "game" && (
          <GameScreen
            nickname={nickname.trim()}
            roomCode={roomCode}
            onFinish={(score, words, id, anchor, wordList) => {
              setFinalScore(score);
              setFinalWords(words);
              setFoundWords(wordList);
              setSubmittedId(id);
              setRevealedAnchor(anchor);
              setPhase("results");
            }}
          />
        )}
        {phase === "results" && (
          <ResultsScreen
            score={finalScore}
            words={foundWords}
            anchor={revealedAnchor}
            roomCode={roomCode}
            onSeeLeaderboard={() => setPhase("leaderboard")}
          />
        )}
        {phase === "leaderboard" && (
          <Leaderboard
            myId={submittedId}
            myScore={finalScore}
            myWords={finalWords}
            myName={nickname.trim()}
            roomCode={roomCode}
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
  roomCode,
  setRoomCode,
  onPlay,
}: {
  nickname: string;
  setNickname: (s: string) => void;
  roomCode: string | null;
  setRoomCode: (s: string | null) => void;
  onPlay: () => void;
}) {
  const canPlay = nickname.trim().length > 0;
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = useMemo(() => {
    if (!createdCode || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("room", createdCode);
    return url.toString();
  }, [createdCode]);

  const handleCreate = () => {
    const code = generateRoomCode();
    setCreatedCode(code);
    setRoomCode(code);
    setShowJoin(false);
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const normalized = joinInput.toUpperCase().trim().replace(/\s+/g, "");
    const withPrefix = normalized.startsWith("WS-") ? normalized : `WS-${normalized}`;
    if (!ROOM_RE.test(withPrefix)) {
      setJoinError("Enter a valid code like WS-4K9F");
      return;
    }
    setJoinError(null);
    setRoomCode(withPrefix);
    setShowJoin(false);
    setCreatedCode(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("room", withPrefix);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const leaveRoom = () => {
    setRoomCode(null);
    setCreatedCode(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-4">

      {/* Hero explainer row */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2">
        {[
          { icon: "⏱️", label: "90 seconds", sub: "per round" },
          { icon: "🔤", label: "9 letters", sub: "one shared grid" },
          { icon: "🏆", label: "Live team scores", sub: "real-time board" },
        ].map((it) => (
          <div
            key={it.label}
            className="rounded-xl bg-card/80 border border-border/60 px-3 py-2 flex items-center gap-2 min-[480px]:flex-col min-[480px]:text-center min-[480px]:gap-1"
          >
            <span className="text-xl shrink-0" aria-hidden>{it.icon}</span>
            <div className="min-w-0 leading-tight">
              <div className="text-xs font-semibold text-foreground truncate">{it.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden word teaser */}
      <div className="rounded-xl bg-accent/60 border border-accent px-4 py-2.5 text-center text-sm text-accent-foreground">
        <span className="font-semibold">All 9 letters form one hidden word</span> — find it for <span className="font-bold">25 points</span>
      </div>

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

      {/* Team rooms */}
      <div className="mt-8 space-y-3">
        {roomCode ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                In room
              </div>
              <div className="text-xl font-bold tracking-widest text-primary truncate">{roomCode}</div>
            </div>
            <button
              type="button"
              onClick={leaveRoom}
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition"
            >
              Leave
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-tile-active)] hover:brightness-110 active:translate-y-px transition"
            >
              Create a team room
            </button>
            <button
              type="button"
              onClick={() => {
                setShowJoin((v) => !v);
                setJoinError(null);
              }}
              className="flex-1 py-3 rounded-xl bg-transparent text-foreground font-semibold border-2 border-primary/60 hover:bg-primary/5 active:translate-y-px transition"
            >
              Join a room
            </button>
          </div>
        )}

        {createdCode && (
          <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Your room code
              </div>
              <div className="text-3xl sm:text-4xl font-bold tracking-[0.3em] text-primary">
                {createdCode}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex-1 py-2.5 rounded-xl bg-card border border-border font-medium hover:bg-muted transition"
              >
                {copied ? "✓ Copied!" : "Copy invite link"}
              </button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Share the link — teammates who open it join automatically.
            </p>
          </div>
        )}

        {showJoin && !roomCode && (
          <form onSubmit={handleJoin} className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
            <label className="block text-xs uppercase tracking-wider font-semibold text-muted-foreground" htmlFor="join">
              Enter room code
            </label>
            <div className="flex gap-2">
              <input
                id="join"
                autoFocus
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="WS-4K9F"
                maxLength={7}
                className="flex-1 px-3 py-2.5 rounded-xl bg-card border border-border text-foreground font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 active:translate-y-px transition"
              >
                Join
              </button>
            </div>
            {joinError && <p className="text-xs text-destructive">{joinError}</p>}
          </form>
        )}
      </div>

      {/* Divider */}
      <div className="mt-6 mb-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {roomCode ? "enter your nickname" : "or play solo"}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <details className="group rounded-xl border border-border/60 bg-muted/60 px-4 py-2">
        <summary className="cursor-pointer list-none flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <span>How scoring works</span>
          <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <div className="grid grid-cols-7 gap-1 text-center mt-3">
          {SCORE_TABLE.map((s) => (
            <div key={s.len} className="rounded-md bg-card border border-border/60 py-1">
              <div className="text-[10px] text-muted-foreground font-mono">{s.len}</div>
              <div className="text-sm font-bold text-primary tabular-nums">{s.pts}</div>
            </div>
          ))}
        </div>
      </details>


      <form
        className="mt-6 space-y-3"
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
          {roomCode ? `Play in ${roomCode}` : "Play"}
        </button>
      </form>
    </div>
    </div>
  );

}

function GameScreen({
  nickname,
  roomCode,
  onFinish,
}: {
  nickname: string;
  roomCode: string | null;
  onFinish: (score: number, words: number, id: string | null, anchor: string, wordList: string[]) => void;
}) {
  const boardKey = useMemo(() => todayKey(), []);
  const { tiles: board, anchor } = useMemo(() => generateBoard(boardKey), [boardKey]);
  const { dict, ready } = useDictionary();

  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [feedback, setFeedback] = useState<{ kind: "valid" | "invalid"; msg: string } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [celebrateWord, setCelebrateWord] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);


  const usedIndices = useMemo(() => {
    const used: number[] = [];
    const cleaned = input.toLowerCase().replace(/[^a-z]/g, "");
    const taken = new Set<number>();
    for (const ch of cleaned) {
      const idx = board.findIndex((t, i) => !taken.has(i) && t.toLowerCase() === ch);
      if (idx === -1) used.push(-1);
      else {
        taken.add(idx);
        used.push(idx);
      }
    }
    return new Set(used.filter((i) => i >= 0));
  }, [input, board]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    inputRef.current?.focus();
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem("wordstorm_played_before")) {
        setShowTip(true);
        const t = setTimeout(() => setShowTip(false), 4000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  // Dismiss tip as soon as the player types
  useEffect(() => {
    if (showTip && input.length > 0) setShowTip(false);
  }, [input, showTip]);



  useEffect(() => {
    if (timeLeft > 0 || submittedRef.current) return;
    submittedRef.current = true;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("wordstorm_played_before", "true");
      }
    } catch {
      // ignore
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("scores")
          .insert({
            nickname: nickname.slice(0, 20),
            score,
            play_date: boardKey,
            words_found: found.length,
            room_code: roomCode,
          })
          .select("id")
          .single();
        if (error) throw error;
        onFinish(score, found.length, data?.id ?? null, anchor, found);
      } catch (e) {
        console.error(e);
        onFinish(score, found.length, null, anchor, found);
      }
    })();
  }, [timeLeft, score, nickname, boardKey, onFinish, anchor, found.length, roomCode]);

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
    if (w.length === 9) {
      setCelebrateWord(w);
      setTimeout(() => setCelebrateWord(null), 1200);
      toast.success("YOU FOUND IT! +25 points", {
        duration: 3000,
        style: {
          background: "linear-gradient(135deg, oklch(0.82 0.17 85), oklch(0.75 0.19 75))",
          color: "oklch(0.2 0.05 60)",
          border: "1px solid oklch(0.65 0.19 75)",
          fontWeight: 700,
          letterSpacing: "0.05em",
        },
      });
    }
  };


  const mm = String(Math.floor(timeLeft / 60)).padStart(1, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const timeUrgent = timeLeft <= 10;
  const cleanedInput = input.toLowerCase().replace(/[^a-z]/g, "");
  const allOk = cleanedInput.length >= 3 && cleanedInput.length <= 9 && canBuildFrom(cleanedInput, board);

  return (
    <div className="space-y-5">
      {showTip && (
        <div
          role="status"
          className="animate-banner-in rounded-xl bg-foreground text-background px-4 py-2.5 text-sm text-center shadow-lg"
        >
          <span className="mr-1" aria-hidden>💡</span>
          <span className="font-semibold">Tip:</span> All 9 letters form one hidden word — find it for 25 points!
        </div>
      )}
      {roomCode && (
        <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">
          Room <span className="font-bold text-primary tracking-widest">{roomCode}</span>
        </div>
      )}

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
  myWords,
  myName,
  roomCode,
  anchor,
  onPlayAgain,
}: {
  myId: string | null;
  myScore: number;
  myWords: number;
  myName: string;
  roomCode: string | null;
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
  // Room mode always shows today only.
  const day = roomCode ? today : tab === "today" ? today : yesterday;
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const fetchRows = async () => {
      let query = supabase
        .from("scores")
        .select("id,nickname,score,play_date,created_at,words_found,room_code")
        .eq("play_date", day)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(50);
      if (roomCode) query = query.eq("room_code", roomCode);
      else query = query.is("room_code", null);
      const { data } = await query;
      if (mounted) {
        setRows((data ?? []) as ScoreRow[]);
        setLoading(false);
      }
    };
    fetchRows();
    const channelName = roomCode ? `scores-live-${roomCode}-${day}` : `scores-live-${day}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scores", filter: `play_date=eq.${day}` },
        () => fetchRows(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [day, roomCode]);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium uppercase tracking-wider">
          Round Over
        </div>
        <h2 className="text-4xl font-bold">You scored {myScore}</h2>
        <p className="text-sm text-muted-foreground">
          {roomCode ? (
            <>Room <span className="font-bold text-primary tracking-widest">{roomCode}</span> · live team board</>
          ) : (
            <>Live team leaderboard · resets daily</>
          )}
        </p>
        <p className="text-xs text-muted-foreground">You found {myWords} {myWords === 1 ? "word" : "words"}.</p>
      </div>

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

      {!roomCode && (
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
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">
            {roomCode
              ? `Room ${roomCode} — Today`
              : tab === "today"
                ? "Today's Top Players"
                : "Yesterday's Top Players"}
          </h3>
          <span className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "score" : "scores"}
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {roomCode ? "No scores in this room yet." : `No scores ${tab === "today" ? "yet today" : "for yesterday"}.`}
          </div>
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
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {r.words_found ?? 0} {(r.words_found ?? 0) === 1 ? "word" : "words"}
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
        Hi {myName || "player"} — your score has been added to the {roomCode ? "room" : "team"} board.
      </p>
    </div>
  );
}

function emojiForLen(len: number): string {
  if (len === 9) return "⭐";
  if (len >= 7) return "🟥";
  if (len === 6) return "🟧";
  if (len === 5) return "🟨";
  if (len === 4) return "🟩";
  return "🟦";
}

function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function useMidnightCountdown(): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  const diff = Math.max(0, midnight.getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ResultsScreen({
  score,
  words,
  anchor,
  roomCode,
  onSeeLeaderboard,
}: {
  score: number;
  words: string[];
  anchor: string;
  roomCode: string | null;
  onSeeLeaderboard: () => void;
}) {
  const countdown = useMidnightCountdown();
  const foundAnchor = useMemo(
    () => words.some((w) => w.toLowerCase() === anchor.toLowerCase()),
    [words, anchor],
  );
  const sorted = useMemo(
    () => [...words].sort((a, b) => b.length - a.length || a.localeCompare(b)),
    [words],
  );
  const bestWord = useMemo(() => {
    if (words.length === 0) return null;
    let best = words[0];
    let bestPts = scoreFor(best.length);
    for (const w of words) {
      const p = scoreFor(w.length);
      if (p > bestPts || (p === bestPts && w.length > best.length)) {
        best = w;
        bestPts = p;
      }
    }
    return best;
  }, [words]);

  const shareText = useMemo(() => {
    const emojis = sorted.map((w) => emojiForLen(w.length)).join("");
    return [
      `Wordstorm ${formatDate()}`,
      `Score: ${score} pts · ${words.length} words found`,
      emojis,
      `wordpuzzle-teams.lovable.app`,
    ].join("\n");
  }, [sorted, score, words.length]);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Score copied! Paste it into Slack or WhatsApp.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium uppercase tracking-wider">
          Round Over
        </div>
        <div className="text-6xl sm:text-7xl font-bold tabular-nums text-foreground">
          {score} <span className="text-2xl sm:text-3xl text-muted-foreground font-semibold">pts</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {words.length} {words.length === 1 ? "word" : "words"} found
          {bestWord && (
            <>
              {" · best word: "}
              <span className="font-semibold text-foreground uppercase tracking-wider">{bestWord}</span>
            </>
          )}
        </p>
      </div>

      {anchor && (
        <div
          className={`rounded-2xl p-4 text-center border ${
            foundAnchor
              ? "bg-success/10 border-success text-foreground"
              : "bg-card border-border"
          }`}
        >
          {foundAnchor ? (
            <>
              <div className="text-sm font-semibold text-success">⭐ You found {anchor.toUpperCase()}! +25 pts</div>
            </>
          ) : (
            <>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Today's hidden word was
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-[0.25em] uppercase text-primary">
                {anchor}
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={handleShare}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-[var(--shadow-tile-active)] hover:brightness-110 active:translate-y-px transition"
      >
        Share your score
      </button>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground/80">Your words</h3>
          <span className="text-xs text-muted-foreground">{words.length}</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">No words found this round.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((w) => (
              <li key={w} className="flex items-center justify-between py-2">
                <span className="font-semibold uppercase tracking-wider">{w}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{scoreFor(w.length)} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onSeeLeaderboard}
        className="w-full py-3 rounded-xl bg-card border border-border font-semibold hover:bg-muted active:translate-y-px transition"
      >
        See {roomCode ? `room ${roomCode}` : "today's"} leaderboard →
      </button>

      <div className="text-center text-sm text-muted-foreground">
        Come back tomorrow for the next puzzle
        <div className="mt-1 font-mono text-lg tabular-nums text-foreground">{countdown}</div>
      </div>
    </div>
  );
}
