# WordStorm: original build prompt

This is the prompt used to generate the first version of WordStorm in [Lovable](https://lovable.dev). It's kept here as a record of how the product was specified. See the [README](README.md) for the project overview.

---

Build a single-page word puzzle game with a shared team leaderboard. Use Lovable Cloud (the built-in backend) so that everyone who opens the link shares one live leaderboard — no login required.

## Flow

1. **Start screen:** game title, a one-line "how to play", a text field for a nickname, and a "Play" button that stays disabled until a nickname is typed.

2. **Game screen:**

   - A 4x4 grid of letter tiles. Generate a vowel-rich, playable letter set, and use the SAME board for every player on a given day (seed the board by the date) so scores are fairly comparable.

   - A countdown timer starting at 90 seconds.

   - The player forms a word by clicking tiles; each click appends that letter and highlights the tile. Each tile can be used once per word — clicking a highlighted tile deselects it. Show the word currently being built, with "Submit" and "Clear" buttons.

   - Validate submitted words against a common English word list. A word must be at least 3 letters, valid, and not already used this round. (If a full dictionary is impractical, bundle a list of a few thousand common English words.)

   - Scoring by length: 3 letters = 1 pt, 4 = 2, 5 = 4, 6 = 6, 7+ = 10. Show the running score and a list of words found so far.

   - Quick feedback: valid words flash green, invalid ones do a short red shake.

3. **When the timer hits 0:** automatically save {nickname, score, date} to the shared leaderboard, then go to the leaderboard screen.

4. **Leaderboard screen:** ranked list (rank, nickname, score) sorted highest first, top 3 visually highlighted, and the current player's row emphasized. Include a "Play again" button and a small note that scores are shared live across the team.

## Design

Clean, modern, minimalist indie-game feel — like a polished daily word game. One accent color, rounded tiles with soft shadows, satisfying press states, clear readable type, mobile-friendly. Keep it neat and uncluttered.
