# Dhara Rakshak — Quest for a Greener Bharat (web edition)

An electronic version of the Dhara Rakshak board game, built from the official rulebook and
laid out like the board picture: the illustrated board and header on the left, the game
console (play, rules and spaces) on the right, and the component tray along the bottom.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). No install or build step is needed.
To host it, upload the whole `web/` folder to any static web host.

- 2–6 players or teams share one screen; the next player in turn order acts as Game Keeper.
- Progress is saved automatically in the browser, so a refresh offers to resume.
- Keyboard: `R` or `Space` rolls the die / takes the main action.
- Fonts load from Google Fonts. Offline, the game falls back to system fonts.

## Rules implemented

Everything in the rulebook: 55 spaces (START, FINISH and 53 on the track) across eight realms, following section 17's layout. Also: the 2-token
scoring with the +1 environmental bonus, Karma markers and the three ways to clear them,
Tapasya Trials (3-token wager, 3 stages, 2 minutes), three one-use Mahashakti Portals (4-token wager,
5 stages, 3 minutes, Emblems), Shortcuts and Setbacks that do not activate their destination,
the Grand Green Challenge (4 of 5 subjects plus Memory and Creative Action), the final round,
Karma reckoning and the tie-breaker.

Two choices the rulebook leaves open:

- **Dhara Rules.** The Grand Challenge's memory stage asks for "rules revealed during the game".
  A waste-management rule is revealed the first time anyone enters each realm.
- **Ordinary route.** Declining (or being ineligible for) a portal gives a normal subject challenge.

## Files

| Path | What it holds |
| --- | --- |
| `js/board.js` | Track geometry over the picture, the space layout, realms, SVG board rendering |
| `js/cards.js` | All decks: questions, Eco-Missions, actions, Tapasya / Mahashakti / Grand Challenge cards, generated memory and concentration puzzles |
| `js/challenges.js` | Card modal, timers and every challenge type |
| `js/game.js` | Game state, turn flow, space rules, rendering, setup and saving |
| `js/ui.js` | Modals, choice dialogs, toasts and icons |
| `css/style.css` | Styling for the board, console and tray, plus the phone layout |
| `assets/` | Images cut from the board picture |
| `tools/export_assets.py` | Regenerates `assets/` from the picture (`python web/tools/export_assets.py`, needs Pillow) |

To add questions, append to the arrays in `js/cards.js`. Multiple-choice options list the
correct answer first; the game shuffles them.
