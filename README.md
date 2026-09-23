# WordStorm

A daily word puzzle game with a shared, live team leaderboard. Everyone gets the same 4×4 letter board each day, has 90 seconds to find as many words as possible, and competes on one leaderboard. No login needed.

**Play it live:** https://wordstorm.lovable.app

Screenshot of the app's homepage:
<img width="1512" height="858" alt="Screenshot 2026-09-23 at 3 58 57 PM" src="https://github.com/user-attachments/assets/6810a89c-2d62-40a3-a554-9c471a74a035" />

## Features

- **Daily seeded board**: the 4×4 grid is generated from the date, so every player gets the same vowel-rich board and scores are fairly comparable.
- **90-second rounds**: tap tiles to build words, with each tile usable once per word and tap-again to deselect.
- **Word validation**: words must be 3+ letters, in the bundled English word list, and not already found this round.
- **Length-based scoring**: 3 letters = 1 pt, 4 = 2, 5 = 4, 6 = 6, 7+ = 10.
- **Instant feedback**: valid words flash green, invalid ones give a quick red shake.
- **Live shared leaderboard**: scores save automatically when time runs out; the top 3 are highlighted and your own row is emphasized.
- **No accounts**: just enter a nickname and play.
- **Mobile-friendly**: clean, minimalist indie-game design with one accent color, rounded tiles and satisfying press states.

## How to play

1. Enter a nickname and press **Play**.
2. Tap tiles to spell a word, then **Submit** (or **Clear** to start over).
3. Find as many words as you can before the timer hits zero.
4. Check where you rank on the team leaderboard and **Play again**.

## Tech stack

- React + TypeScript, built with Vite
- Tailwind CSS
- Lovable Cloud backend for the shared, real-time leaderboard
- Built with [Lovable](https://lovable.dev) (AI-assisted development), version-controlled and maintained on GitHub with two-way sync

## How it was built

WordStorm started as a single detailed product prompt describing the game flow, rules, scoring and design direction, which I used to generate the first version in Lovable. From there I iterated on the game and now maintain the code in this repository.

The original prompt is kept in [PROMPT.md](PROMPT.md) to show how the product was specified.

## Run locally

Requires Node.js and npm.

```sh
git clone https://github.com/lordvoldemort777/wordstorm.git
cd wordstorm
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## What I learned

- Writing a clear, testable product spec for an AI builder: flow, rules, edge cases and design in one prompt
- Making a fair daily game with a date-seeded board
- Syncing a shared leaderboard across players without accounts

## Next steps

- Show all possible words on the board after the round ends
- Daily and all-time leaderboard tabs
- Streaks and shareable results

## Author

**Abhinaya Hari** · [LinkedIn](www.linkedin.com/in/abhinayahari) · [Portfolio]("In Progress")
