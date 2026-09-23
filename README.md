# Daily Word Duel

Build a single-page word puzzle game with a shared team leaderboard. Use Lovable Cloud (the built-in backend) so that everyone who opens the link shares one live leaderboard — no login required.

FLOW:

1. Start screen: game title, a one-line "how to play", a text field for a nickname, and a "Play" button that stays disabled until a nickname is typed.

2. Game screen:

   - A 4x4 grid of letter tiles. Generate a vowel-rich, playable letter set, and use the SAME board for every player on a given day (seed the board by the date) so scores are fairly comparable.

   - A countdown timer starting at 90 seconds.

   - The player forms a word by clicking tiles; each click appends that letter and highlights the tile. Each tile can be used once per word — clicking a highlighted tile deselects it. Show the word currently being built, with "Submit" and "Clear" buttons.

   - Validate submitted words against a common English word list. A word must be at least 3 letters, valid, and not already used this round. (If a full dictionary is impractical, bundle a list of a few thousand common English words.)

   - Scoring by length: 3 letters = 1 pt, 4 = 2, 5 = 4, 6 = 6, 7+ = 10. Show the running score and a list of words found so far.

   - Quick feedback: valid words flash green, invalid ones do a short red shake.

3. When the timer hits 0: automatically save {nickname, score, date} to the shared leaderboard, then go to the leaderboard screen.

4. Leaderboard screen: ranked list (rank, nickname, score) sorted highest first, top 3 visually highlighted, and the current player's row emphasized. Include a "Play again" button and a small note that scores are shared live across the team.

DESIGN: clean, modern, minimalist indie-game feel — like a polished daily word game. One accent color, rounded tiles with soft shadows, satisfying press states, clear readable type, mobile-friendly. Keep it neat and uncluttered.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wordstorm.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c927c6ae-35bc-4fcc-952d-1f39e8715f04).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
