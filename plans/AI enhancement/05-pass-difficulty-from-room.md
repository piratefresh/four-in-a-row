# Ticket 05: User-Controlled Difficulty from Room to AI Calls

## Status: ⬜

## Depends on: None (independent)

## Summary

Let users choose bot difficulty for offline bot games, store that difficulty on the room, and pass it into AI betting/showdown calls instead of hardcoding `"medium"`.

Offline bot games default to `"medium"`. Tutorial bot games use fixed `"easy"` difficulty unless a later ticket explicitly exposes tutorial difficulty.

## Files

- `convex/schema.ts` — add `difficulty` field to rooms table
- `convex/rooms/helpers.ts` — extend room creation options with difficulty
- `convex/rooms/lifecycle.ts` — persist difficulty in `createOpenRoom`
- `convex/rooms/players.ts` — thread difficulty through `createRoomWithHostOptions` and `createRoomWithHost`
- `convex/rooms/handlers/roomMutations.ts` — accept difficulty in `createRoom`
- `convex/rooms/tutorial.ts` — create tutorial rooms with fixed easy difficulty
- `convex/games/gamesRuntime.ts` — include room in runtime state
- `convex/games/gamesBetting.ts` — read room difficulty, pass difficulty and personality to AI
- `convex/games/gamesShowdown.ts` — read room difficulty, pass to AI
- `src/routes/index.tsx` — store selected offline difficulty and pass it to `createRoom`
- `src/components/home/HomeModeMenu.tsx` — render difficulty selector for offline bot games
- `src/components/home/HomeModeMenu.test.tsx` — update props/tests

## Changes

### `convex/schema.ts`

Add `difficulty` field to the `rooms` table:

```typescript
difficulty: v.optional(v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
)),
```

If unset, bot AI defaults to `"medium"`.

### `convex/rooms/helpers.ts`

Extend `CreateOpenRoomOptions`:

```typescript
difficulty?: "easy" | "medium" | "hard";
```

### `convex/rooms/lifecycle.ts`

Persist the option in `createOpenRoom`:

```typescript
difficulty: options?.difficulty,
```

### `convex/rooms/players.ts`

Extend `createRoomWithHostOptions` options with difficulty and pass it into `createOpenRoom`.

Update `createRoomWithHost` to accept optional difficulty and default to `"medium"`:

```typescript
export async function createRoomWithHost(
  ctx: MutationCtx,
  rawName: string,
  difficulty: AIDifficulty = AI_DIFFICULTY.MEDIUM,
) {
  return createRoomWithHostOptions(ctx, rawName, {
    isBotGame: true,
    difficulty,
  });
}
```

### `convex/rooms/handlers/roomMutations.ts`

Update `createRoom` args:

```typescript
args: {
  name: v.string(),
  difficulty: v.optional(v.union(
    v.literal("easy"),
    v.literal("medium"),
    v.literal("hard"),
  )),
}
```

Pass `args.difficulty ?? "medium"` to `createRoomWithHost`.

### `convex/rooms/tutorial.ts`

Tutorial rooms should use fixed easy difficulty:

```typescript
const room = await createRoomWithHostOptions(ctx, args.name, {
  tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
  difficulty: "easy",
});
```

### `convex/games/gamesRuntime.ts`

Include the room in runtime state:

```typescript
return { game, room, hands, players };
```

This lets betting and showdown handlers read the room difficulty without additional duplicated queries.

### `convex/games/gamesBetting.ts`

In `internalProcessBotTurnHandler`, replace hardcoded medium difficulty:

```typescript
const difficulty = (runtimeState.room?.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
const decision = await ctx.runAction(internal.ai.aiDecideBet, {
  difficulty,
  personality,
  ...
});
```

Also pass `personality` from the bot character. Ticket 04 adds the `personality` arg to `aiDecideBet`.

### `convex/games/gamesShowdown.ts`

Use the same room difficulty pattern:

```typescript
const difficulty = (runtimeState.room?.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
const wordResult = await ctx.runAction(internal.ai.aiSubmitWord, {
  difficulty,
  personality,
  ...
});
```

### `src/routes/index.tsx`

Add local state:

```typescript
const [offlineDifficulty, setOfflineDifficulty] = useState<"easy" | "medium" | "hard">("medium");
```

Pass it to `HomeModeMenu` and to offline room creation:

```typescript
await createRoom({ name: displayName, difficulty: offlineDifficulty });
```

Do not pass selected difficulty to tutorial creation; tutorial stays fixed easy.

### `src/components/home/HomeModeMenu.tsx`

Add props:

```typescript
offlineDifficulty: "easy" | "medium" | "hard";
onOfflineDifficultyChange: (difficulty: "easy" | "medium" | "hard") => void;
```

Render an offline difficulty selector inside the Offline Play card, near the start button. Suggested copy:

- Easy: more mistakes, folds more often
- Medium: balanced
- Hard: sharper and more aggressive

Keep the UI compact and consistent with the existing dark/gold offline card style.

## Acceptance Criteria

- [ ] `rooms` table has optional `difficulty` field
- [ ] Offline bot game creation accepts `easy | medium | hard`
- [ ] Offline bot game UI exposes a difficulty selector and defaults to `medium`
- [ ] Tutorial bot rooms are created with fixed `easy` difficulty
- [ ] `internalGetGameRuntimeState` returns `room`
- [ ] `gamesBetting.ts` no longer hardcodes `difficulty: "medium"`
- [ ] `gamesShowdown.ts` no longer hardcodes `difficulty: "medium"`
- [ ] Difficulty is read from room, defaulting to `"medium"` if unset
- [ ] Personality is passed from bot character to `aiDecideBet`
- [ ] Existing bot turns still work with rooms that do not yet have difficulty set
- [ ] Tests pass: `bun test convex/aiStrategy.test.ts convex/gameRules.test.ts`
- [ ] Schema/function generation validates via `bunx convex dev`
