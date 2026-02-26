# Word Poker Prototype Rules (Aligned)

## Card Types

The game uses three card types:

1. `Regular Card`: one fixed letter (example: `A`, `T`).
2. `Multi-Choice Card`: one card with multiple letter options (example: `A/E`, `S/T/R`).
3. `Combo Card`: one card containing multiple letters that must be used together (example: `TH`, `ING`, `QU`).

## Card Usage Rules

- A card can be used at most once in a submitted word.
- `Regular Card`: contributes its printed single letter.
- `Multi-Choice Card`: contributes exactly one chosen option letter when submitted.
- `Combo Card`: contributes all printed letters as a single token when submitted.

## Multi-Choice Resolution

- The chosen letter for a multi-choice card is selected at submission time.
- A multi-choice card cannot represent more than one letter in the same word.
- Once submitted, the chosen letter is locked for scoring and breakdown display.

## Combo Card Constraints

- All letters on a combo card must be consumed together.
- Combo letters must remain in printed order (for example, `TH` cannot be used as `H...T`).
- Combo letters cannot be split across separate positions or reused.

## Validation Requirements

Word validation must support token matching, not letter-only matching.

- Valid token types: single-letter tokens, chosen multi-choice token, and combo token.
- A submitted word is valid only if it can be formed by a one-time use of available card tokens under the rules above.
- Dictionary validity still applies after token resolution.

## Scoring Baseline

- Regular and multi-choice cards score by the resolved letter value.
- Combo cards score as the sum of included letters unless explicitly balanced otherwise.
- If a joker/wildcard exists, it should be documented separately from multi-choice cards.

## UI Requirements

- Cards must clearly display their type and behavior:
  - Regular: `A`
  - Multi-choice: `A/E`
  - Combo: `TH`
- On score breakdown, show resolved values (for example: `A/E -> E`).
