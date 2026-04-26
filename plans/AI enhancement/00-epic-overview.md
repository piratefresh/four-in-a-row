# Epic: Smarter AI Betting + User-Controlled Difficulty

## Goal

Make AI bots less perfect and more interesting by using Rate of Return (RR) from the cowboyprogramming.com poker AI article, probabilistic fold/call/raise behavior, personality modifiers, and user-controlled offline bot difficulty.

Tickets 01-05 are the current implementation focus. Tickets 06-08 remain future observability/cache work and should not be mixed into the first implementation pass.

## Problem

- Bots never fold because `getQuickRecommendation` only folds when `handStrength < 0.25 AND chipRisk > 0.15`, which almost never triggers since `estimateHandStrength` produces middling values (0.35–0.6) for most hands
- Betting decisions are fully deterministic (same inputs → same output), making bots feel robotic
- The article's Rate of Return approach (RR = handStrength / potOdds) is not used at all
- `FUTURE_BETTING_PERSONALITY_PROFILES` exist but are never applied to betting
- Difficulty is hardcoded to `"medium"` regardless of bot character
- Users cannot choose bot difficulty for offline bot tables
- Debug logs lack decision-reasoning detail

## Source Article

https://cowboyprogramming.com/2007/01/04/programming-poker-ai/

Key concepts we're adopting:
- **Rate of Return (RR)** = Hand Strength / Pot Odds — the core metric for deciding fold/call/raise
- **Probabilistic FCR table** — instead of deterministic thresholds, use probability distributions over fold/call/raise based on RR bucket
- **Stack protection** — if calling would leave fewer than 4× the ante in chips and hand strength < 0.5, override to fold
- **Never fold for free** — if amount to call is 0, always check

## Tickets

| # | Title | Status |
|---|-------|--------|
| 01 | Rate of Return & Hand Strength Breakdown | Current focus |
| 02 | Probabilistic FCR Betting Decision | Current focus |
| 03 | Personality & Difficulty Modifiers | Current focus |
| 04 | Wire Probabilistic Betting into AI Pipeline | Current focus |
| 05 | User-Controlled Difficulty from Room to AI Calls | Current focus |
| 06 | Enhanced Debug Logging & Trace Fields | Later |
| 07 | Action Cache Schema & Core Mutations | Later |
| 08 | Integrate Action Cache into Betting & Showdown | Later |

## Dependencies

```
01 → 02 → 03 → 04
                      → 05 (independent, can parallel with 04)
                      → 06 (after 04)
                      → 07 (independent)
                      08 (after 07 + 04)
```

Tickets 01-03 are pure functions with no side effects. Ticket 04 wires them into the betting pipeline. Ticket 05 adds user-controlled offline difficulty and passes room difficulty into bot betting/showdown calls. Ticket 06 is observability. Tickets 07-08 are the vector cache layer.

## Current Scope Notes

- Offline bot games expose `easy | medium | hard` difficulty to the user, defaulting to `medium`.
- Tutorial bot games use fixed `easy` difficulty unless a later ticket explicitly exposes tutorial difficulty.
- Betting behavior changes should be implemented before action cache work so cached decisions do not preserve the old deterministic behavior.
