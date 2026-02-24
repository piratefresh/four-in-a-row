# Ticket 11: Game Loop Polish and Edge Cases

## Objective
Handle edge cases and add polish to the core game loop for a smooth player experience.

## Why This Ticket Exists
With the core game loop implemented (word submission, turn advancement, winner detection), there are still edge cases and UX improvements needed:
- Single player games (AI opponent)
- Empty submissions / no words submitted
- Mid-game disconnections
- Resetting game state for "Play Again"
- Turn indicator and game status feedback

## Current State
- Core game loop works for 2+ players
- Some edge cases may cause crashes or unclear states
- Limited visual feedback for whose turn it is
- No "new game" flow after completion

## Scope
- Handle single-player vs AI scenarios
- Gracefully handle no word submissions
- Add clear turn indicators in UI
- Implement "Play Again" functionality
- Add loading/transition states
- Handle player disconnects mid-game

## Out of Scope
- AI word generation (use placeholder/auto-skip for now)
- Persistent leaderboards
- Game replay/history
- Advanced animations

## Implementation Plan

### 1) Add turn indicator UI

Update `RoomHandsBoard.tsx`:

```typescript
// Add props
interface RoomHandsBoardProps {
  // ... existing props ...
  currentTurnPlayerId?: string | null
  isMyTurn?: boolean
}

// In component:
{isMyTurn && (
  <div className="mb-4 rounded-lg bg-emerald-500/20 border border-emerald-500 px-4 py-2 text-center">
    <p className="text-emerald-300 font-semibold">🎯 Your Turn!</p>
  </div>
)}

{!isMyTurn && currentTurnPlayerId && (
  <div className="mb-4 rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2 text-center">
    <p className="text-slate-300">
      Waiting for {getPlayerName(currentTurnPlayerId, 0)}...
    </p>
  </div>
)}
```

### 2) Implement "Play Again" flow

Add mutation in `convex/games.ts`:

```typescript
export const createNextGame = mutation({
  args: {
    previousGameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const prevGame = await ctx.db.get(args.previousGameId)
    if (!prevGame) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Previous game not found.",
      })
    }

    if (prevGame.status !== "completed") {
      throw new ConvexError({
        code: "GAME_NOT_COMPLETED",
        message: "Previous game is not completed yet.",
      })
    }

    // Create new game for same room
    const roomId = prevGame.roomId
    const gameDoc = createInitialGameDocument(roomId, [])
    const newGameId = await ctx.db.insert("games", gameDoc)

    return {
      ok: true,
      newGameId,
      roomId,
    }
  },
})
```

Update UI in `rooms.$code.tsx`:

```typescript
const createNextGame = useMutation(api.games.createNextGame)

const handlePlayAgain = async () => {
  if (!game?._id) return
  try {
    const result = await createNextGame({ previousGameId: game._id })
    setGameMessage("New game created!")
  } catch (error) {
    setGameMessage("Failed to create new game")
  }
}

// In completed game section:
<button onClick={handlePlayAgain} ...>
  Play Again
</button>
```

### 3) Handle AI dealer auto-skip

Add to `convex/games.ts`:

```typescript
const AI_DEALER_PLAYER_ID = "ai_dealer"

/**
 * Check if current turn is AI and auto-skip if so
 * TODO: Replace with actual AI word generation in future
 */
async function handleAITurnIfNeeded(
  ctx: MutationCtx,
  game: Doc<"games">,
  hands: Array<Doc<"playerHands">>,
): Promise<boolean> {
  const orderedHands = sortHandsByTurnOrder(hands)
  const currentHand = orderedHands[game.currentPlayerIndex]

  if (!currentHand || currentHand.playerId !== AI_DEALER_PLAYER_ID) {
    return false // Not AI's turn
  }

  if (currentHand.hasActed || currentHand.hasFolded) {
    return false // Already acted
  }

  // Auto-skip for AI (placeholder)
  const now = Date.now()
  await ctx.db.patch(currentHand._id, {
    hasFolded: true,
    hasActed: true,
    updatedAt: now,
  })

  console.log("AI dealer auto-skipped turn")
  return true
}
```

Call in turn advancement logic:

```typescript
// After any player action, check AI turn
const aiActed = await handleAITurnIfNeeded(ctx, game, hands)
if (aiActed) {
  // Recursively check turn advancement
  // ... continue turn/stage advancement logic
}
```

### 4) Add game status indicator

Update `rooms.$code.tsx`:

```typescript
function getGameStatusMessage(
  game: typeof gameData,
  isMyTurn: boolean,
): string {
  if (!game) return "No game in progress"

  if (game.status === "waiting") {
    return "⏳ Waiting to start..."
  }

  if (game.status === "completed") {
    return "🏁 Game finished"
  }

  // Active game
  const stageNames = {
    preflop: "Pre-Flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
    final: "Final",
  }

  const stageName = stageNames[game.stage] ?? game.stage

  if (isMyTurn) {
    return `🎯 ${stageName} - Your Turn!`
  }

  return `${stageName} - Waiting...`
}

// In render:
<div className="mb-4 rounded-lg bg-slate-800/70 border border-slate-600 px-4 py-2">
  <p className="text-center text-lg font-semibold text-cyan-300">
    {getGameStatusMessage(game, canSkipRound)}
  </p>
</div>
```

### 5) Handle no submissions edge case

Update `determineWinner`:

```typescript
async function determineWinner(
  ctx: QueryCtx | MutationCtx,
  gameId: Id<"games">,
): Promise<WinnerResult | null> {
  const submissions = await ctx.db
    .query("wordSubmissions")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect()

  if (submissions.length === 0) {
    console.log("No word submissions - no winner")
    return null
  }

  // ... rest of logic
}
```

Ensure UI handles null winner gracefully (already done in Ticket 10).

### 6) Add loading states

Update `RoomHandsBoard.tsx`:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

const handleSubmitWord = async () => {
  // ... validation ...

  setIsSubmitting(true)
  try {
    // ... submit word ...
  } finally {
    setIsSubmitting(false)
  }
}

// Button disabled state:
<button
  disabled={isValidating || isSubmitting}
  ...
>
  {isValidating ? 'Validating...' : isSubmitting ? 'Submitting...' : 'Submit Word'}
</button>
```

### 7) Handle disconnected players

Add to `convex/games.ts`:

```typescript
/**
 * Cron job or periodic check to auto-skip inactive players
 * TODO: Implement when time limits are added
 */
export const checkInactivePlayers = internalMutation({
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    for (const game of activeGames) {
      const hands = await ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect()

      const orderedHands = sortHandsByTurnOrder(hands)
      const currentHand = orderedHands[game.currentPlayerIndex]

      if (!currentHand) continue

      // Check if player is inactive (no heartbeat in 2 minutes)
      const players = await ctx.db
        .query("players")
        .withIndex("playerToken", (q) => q.eq("playerToken", currentHand.playerId))
        .first()

      if (players && Date.now() - players.lastSeenAt > 120_000) {
        // Auto-skip inactive player
        await ctx.db.patch(currentHand._id, {
          hasFolded: true,
          hasActed: true,
          updatedAt: Date.now(),
        })

        console.log(`Auto-skipped inactive player ${currentHand.playerId}`)
      }
    }
  },
})
```

(Note: This is a placeholder for future work)

### 8) Add visual feedback for stage transitions

Update `rooms.$code.tsx`:

```typescript
const [lastStage, setLastStage] = useState<string | null>(null)
const [showStageChange, setShowStageChange] = useState(false)

useEffect(() => {
  if (game && lastStage && game.stage !== lastStage) {
    setShowStageChange(true)
    setTimeout(() => setShowStageChange(false), 3000)
  }
  if (game) {
    setLastStage(game.stage)
  }
}, [game?.stage])

// In render:
{showStageChange && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 pointer-events-none">
    <div className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-3xl font-bold text-white shadow-2xl">
      {lastStage?.toUpperCase()} → {game?.stage.toUpperCase()}
    </div>
  </div>
)}
```

## Data and Validation Constraints
- AI dealer must auto-skip (for now)
- Turn indicators must be accurate
- Loading states prevent double-submissions
- Stage transitions are smooth and clear

## File-Level Changes
- Update: `convex/games.ts` (createNextGame, handleAITurnIfNeeded, checkInactivePlayers)
- Update: `src/components/rooms/RoomHandsBoard.tsx` (turn indicators, loading states)
- Update: `src/routes/rooms.$code.tsx` (status messages, play again, stage transitions)

## Acceptance Criteria
1. Turn indicators clearly show whose turn it is
2. "Your Turn" is highlighted for current player
3. "Play Again" creates new game after completion
4. AI dealer auto-skips (placeholder behavior)
5. Game status message shows current stage
6. Loading states prevent double-clicks
7. Stage transitions are visible to all players
8. No submissions handled gracefully (no winner message)

## Verification Checklist
- Play with 2 players → turn indicator updates correctly
- Play solo → AI auto-skips and game progresses
- Complete game → "Play Again" works
- All players skip → "no winner" displayed
- Stage changes → visual feedback appears
- Submit word twice quickly → prevented by loading state

## Risks
- Turn indicator sync issues in multiplayer
- AI auto-skip causing infinite loops
- Race conditions in "Play Again" flow

## Dependencies
- Ticket 8 (word submission)
- Ticket 9 (turn advancement)
- Ticket 10 (winner detection)

## Done Definition
This ticket is done when the game loop handles all common edge cases gracefully, provides clear visual feedback for all game states, and "Play Again" functionality works reliably.
