# Ticket 12: AI Word Generation (Optional Enhancement)

## Objective
Replace AI dealer auto-skip placeholder with actual AI-generated word submissions using OpenRouter and the TanStack AI integration.

## Why This Ticket Exists
Currently, the AI dealer (added for single-player games) just auto-skips every turn. To make single-player mode playable and interesting, the AI should actually generate valid words using the existing OpenRouter + AI hooks infrastructure.

## Current State
- AI dealer exists as a player with ID `"ai_dealer"`
- AI auto-skips on its turn (placeholder behavior)
- OpenRouter integration exists in `src/lib/openrouter.ts`
- AI hooks exist in `src/lib/ai-hooks.ts` with `aiChooseWord` function
- Game rules context is prepared in `src/lib/game-rules.ts`

## Scope
- Integrate `aiChooseWord` into game mutation when AI's turn
- Convert AI hand tiles format for AI function input
- Handle AI word validation and submission
- Add fallback to auto-skip if AI fails
- Test single-player mode with AI opponent

## Out of Scope
- Multiple difficulty levels (easy/medium/hard)
- AI betting/strategy (just word generation)
- AI learning/improvement over time
- Training custom AI models

## Implementation Plan

### 1) Create backend AI word generation helper

Add to `convex/games.ts`:

```typescript
import { aiChooseWord } from "../src/lib/ai-hooks" // Note: May need to move to convex/ai.ts

/**
 * Generate word for AI player using OpenRouter
 */
async function generateAIWord(
  handTiles: Array<{ letter: string; baseValue: number }>,
  communityTiles: Array<{ letter: string; baseValue: number; revealed: boolean }>,
): Promise<{
  word: string
  tiles: Array<{ letter: string; baseValue: number; source: "hand" | "community" }>
} | null> {
  try {
    // Only use revealed community tiles
    const revealedCommunity = communityTiles.filter(t => t.revealed)

    const result = await aiChooseWord(
      handTiles.map(t => ({ letter: t.letter, value: t.baseValue })),
      revealedCommunity.map(t => ({ letter: t.letter, value: t.baseValue })),
    )

    if (!result || !result.word || result.tiles.length === 0) {
      console.log("AI could not generate word")
      return null
    }

    // Convert AI response to game format
    const gameTiles = result.tiles.map(tile => ({
      letter: tile.letter,
      baseValue: tile.value,
      source: tile.source,
    }))

    return {
      word: result.word,
      tiles: gameTiles,
    }
  } catch (error) {
    console.error("AI word generation failed:", error)
    return null
  }
}
```

### 2) Update AI turn handler to generate words

Modify `handleAITurnIfNeeded` in `convex/games.ts`:

```typescript
async function handleAITurnIfNeeded(
  ctx: MutationCtx,
  game: Doc<"games">,
  hands: Array<Doc<"playerHands">>,
): Promise<{ acted: boolean; submitted?: boolean }> {
  const orderedHands = sortHandsByTurnOrder(hands)
  const currentHand = orderedHands[game.currentPlayerIndex]

  if (!currentHand || currentHand.playerId !== AI_DEALER_PLAYER_ID) {
    return { acted: false } // Not AI's turn
  }

  if (currentHand.hasActed || currentHand.hasFolded) {
    return { acted: false } // Already acted
  }

  // Try to generate word
  const aiWord = await generateAIWord(
    currentHand.tiles,
    game.communityTiles,
  )

  const now = Date.now()

  if (aiWord) {
    // AI found a word - submit it
    console.log(`AI submitting word: ${aiWord.word}`)

    // Validate tiles (same as player submission)
    const validation = validateTilesAvailable(
      aiWord.word,
      aiWord.tiles,
      currentHand.tiles,
      game.communityTiles,
    )

    if (!validation.valid) {
      console.error("AI generated invalid word:", validation.error)
      // Fall back to skip
      await ctx.db.patch(currentHand._id, {
        hasFolded: true,
        hasActed: true,
        updatedAt: now,
      })
      return { acted: true, submitted: false }
    }

    // Calculate score
    const score = calculateWordScore(aiWord.tiles)

    // Store submission
    await ctx.db.insert("wordSubmissions", {
      gameId: game._id,
      playerId: AI_DEALER_PLAYER_ID,
      word: aiWord.word.toLowerCase(),
      tiles: aiWord.tiles,
      score,
      stage: game.stage,
      submittedAt: now,
    })

    // Mark as acted
    await ctx.db.patch(currentHand._id, {
      hasActed: true,
      updatedAt: now,
    })

    console.log(`AI submitted word: ${aiWord.word} (${score} pts)`)
    return { acted: true, submitted: true }
  } else {
    // AI couldn't find word - skip
    console.log("AI skipping turn (no word found)")
    await ctx.db.patch(currentHand._id, {
      hasFolded: true,
      hasActed: true,
      updatedAt: now,
    })
    return { acted: true, submitted: false }
  }
}
```

### 3) Move AI hooks to Convex actions

Since mutations can't call external APIs directly in some Convex setups, create an action wrapper:

Create `convex/ai.ts`:

```typescript
import { action } from "./_generated/server"
import { v } from "convex/values"

// Import from shared lib (may need to adjust imports)
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const freeModel = "stepfun/step-3.5-flash:free"

export const generateAIWord = action({
  args: {
    handTiles: v.array(v.object({
      letter: v.string(),
      baseValue: v.number(),
    })),
    communityTiles: v.array(v.object({
      letter: v.string(),
      baseValue: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const handLetters = args.handTiles.map(t => `${t.letter}(${t.baseValue})`).join(", ")
    const communityLetters = args.communityTiles.map(t => `${t.letter}(${t.baseValue})`).join(", ")

    const prompt = `You are playing a word game. Build the highest-scoring word possible.

Available tiles:
- Your hand: ${handLetters}
- Community (shared): ${communityLetters}

Rules:
- Use tiles from your hand AND/OR community
- Each tile can only be used once
- Must be a valid English word
- Score = sum of tile values

Respond with ONLY a JSON object:
{
  "word": "your_word",
  "tiles": [
    {"letter": "A", "value": 1, "source": "hand"},
    {"letter": "T", "value": 1, "source": "community"}
  ],
  "reasoning": "brief explanation"
}

Choose your best word:`

    try {
      const { text } = await generateText({
        model: openrouter(freeModel),
        prompt,
      })

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("AI response not JSON:", text)
        return null
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (!parsed.word || !parsed.tiles) {
        console.error("AI response missing word or tiles:", parsed)
        return null
      }

      return {
        word: parsed.word,
        tiles: parsed.tiles.map((t: any) => ({
          letter: t.letter,
          baseValue: t.value,
          source: t.source,
        })),
        reasoning: parsed.reasoning,
      }
    } catch (error) {
      console.error("AI generation error:", error)
      return null
    }
  },
})
```

### 4) Call action from mutation

Update `handleAITurnIfNeeded` to use the action:

```typescript
// In mutation, call the action:
const aiWord = await ctx.runAction(internal.ai.generateAIWord, {
  handTiles: currentHand.tiles,
  communityTiles: game.communityTiles.filter(t => t.revealed),
})
```

### 5) Add AI submission to UI

Update `rooms.$code.tsx` to show when AI is thinking:

```typescript
const [isAIThinking, setIsAIThinking] = useState(false)

// Detect when it's AI's turn
useEffect(() => {
  if (currentTurnPlayerId === DEALER_PLAYER_ID && game?.status === "active") {
    setIsAIThinking(true)
  } else {
    setIsAIThinking(false)
  }
}, [currentTurnPlayerId, game?.status])

// In render:
{isAIThinking && (
  <div className="mb-4 rounded-lg bg-purple-500/20 border border-purple-500 px-4 py-2 text-center">
    <p className="text-purple-300 font-semibold animate-pulse">
      🤖 AI is thinking...
    </p>
  </div>
)}
```

### 6) Add AI submissions to game results

Ensure `getGameResults` query and UI display AI submissions with "AI Dealer" name:

```typescript
// In rooms.$code.tsx when displaying submissions:
const playerName = playerId === DEALER_PLAYER_ID
  ? "🤖 AI Dealer"
  : (memberById.get(playerId)?.name ?? "Unknown Player")
```

## Data and Validation Constraints
- AI must only use tiles it has access to
- AI-generated words must pass same validation as player words
- AI must submit in valid format (word + tiles array)
- AI failure must gracefully fall back to skip

## File-Level Changes
- Create: `convex/ai.ts` (AI action for external API calls)
- Update: `convex/games.ts` (integrate AI word generation)
- Update: `src/routes/rooms.$code.tsx` (AI thinking indicator)
- Update: `convex/schema.ts` (ensure OPENROUTER_API_KEY in env)

## Acceptance Criteria
1. AI generates valid words on its turn in single-player mode
2. AI submissions are stored in `wordSubmissions` table
3. AI words are scored correctly
4. AI falls back to skip if it can't find a word or errors occur
5. UI shows "AI is thinking" when it's AI's turn
6. AI submissions appear in game results with "AI Dealer" label
7. Single-player games are playable and competitive

## Verification Checklist
- Start single-player game → AI is added as opponent
- Play through stages → AI submits words (not just skips)
- AI word is valid and uses correct tiles
- AI score calculation is accurate
- Complete game → AI submission appears in results
- AI fails to generate → gracefully skips without crashing

## Risks
- OpenRouter API rate limits or failures
- AI generating invalid words (not in dictionary)
- AI using tiles it doesn't have access to
- High latency making AI turns feel slow

## Dependencies
- Ticket 8 (word submission mutation)
- Ticket 9 (turn advancement)
- OpenRouter integration already exists
- AI hooks infrastructure already exists

## Done Definition
This ticket is done when single-player games are fully playable with the AI dealer generating competitive word submissions, with proper error handling and visual feedback for AI turns.
