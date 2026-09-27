# Portfolio minigames

The portfolio and games are static GitHub Pages files. `arcade.js` adds the hero leaderboard and the three games above Contact; `arcade.css` contains their responsive styles.

## Leaderboard service

- Public API: `https://menghong-minigames-leaderboard.menghong20.chatgpt.site/api/leaderboard`
- Hosting: Sites, project `appgprj_6ab7ffd984048191a3238b3436d0e130`.
- Database: managed D1, `scores` table. The separate service source is in the sibling `leaderboard-service` checkout.
- GET returns the ten highest scores; POST accepts nickname, score, rounds and a random browser token. No privileged API key is shipped to the browser. Only a hash of the browser token is stored by the service.
- Each browser has one entry, updated only for a higher score. Scores are peak wallet balances; equal scores rank in order of achievement. Names and scores are public. Names are not unique identities.
- Games start with 1,000 free tokens. Browser storage preserves the active wallet, pending best score and browser identity. A reset starts a new run without deleting the published score. Clearing storage loses access to updating that browser’s entry; it does not erase the server record.
- A round’s stake is deducted before playing. Reloading mid-round forfeits that stake.
- Scores are self-reported from the browser. Validation and best-effort burst limits reject malformed input and some spam, but this is not a cheat-proof system. No real money or prizes.

## Verification

Run `node --test --test-isolation=none tests/arcade.test.cjs` (Node 22+). These tests exercise real game handlers with controlled card draws, payout edge cases, duplicate-click protection, resets, qualification and submission retries. Backend tests live in the service checkout and use an in-memory SQLite database. Production is not seeded with test scores.

Finishing a run with an unsubmitted best above 1,000 opens a nickname dialog. The wallet resets only after a confirmed server save or an explicit skip. Failed saves preserve the run and nickname for retry. Save high score also submits a retained best from earlier runs, even if leaderboard loading is unavailable.
