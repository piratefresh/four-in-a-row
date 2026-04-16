# AI Player Setup Guide

This guide explains how to set up and use AI players in Word Poker using OpenRouter.

## Overview

The AI system uses **OpenRouter** to provide intelligent bot opponents with:
- ✅ Strategic betting decisions (fold/check/call/raise)
- ✅ Intelligent word building during showdown
- ✅ Adjustable difficulty levels (Easy, Medium, Hard)
- ✅ Realistic pacing and natural gameplay
- ✅ Fallback logic if API is unavailable

## Quick Start

### 1. Get an OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up or log in
3. Navigate to **Keys** section
4. Create a new API key
5. Copy your key (starts with `sk-or-v1-...`)

### 2. Configure Convex Environment

Set your OpenRouter API key in Convex:

```bash
bunx convex env set OPENROUTER_API_KEY your-api-key-here
```

Verify it's set:

```bash
bunx convex env list
```

### 3. Test with Bots

1. Start your dev server:
   ```bash
   bun run dev
   ```

2. In another terminal, start Convex:
   ```bash
   bunx convex dev
   ```

3. Join a room and add bots:
   ```bash
   # In the Convex dashboard or via debugFillRoomWithBots mutation
   ```

4. Watch the AI bots make intelligent betting and word-building decisions!

## Architecture

### File Structure

```
convex/
├── ai.ts                  # AI decision-making actions
├── aiStrategy.ts          # Difficulty levels & model config
├── gameRules.ts          # Game rules for AI context
└── games.ts              # Bot turn processing (updated)

src/lib/
├── openrouter.ts         # OpenRouter client (client-side)
└── ai-hooks.ts          # Client-side AI hooks
```

### AI Difficulty Levels

| Difficulty | Model | Strategy | Bluff Rate |
|------------|-------|----------|------------|
| **Easy** | `meta-llama/llama-3.3-70b-instruct:free` | Conservative | 5% |
| **Medium** | `anthropic/claude-3.5-haiku:beta` | Balanced | 15% |
| **Hard** | `anthropic/claude-3.5-sonnet` | Aggressive | 25% |

### How AI Works

#### 1. Betting Decisions (`aiDecideBet`)

When it's a bot's turn during betting rounds:

1. **Analyzes hand strength** using:
   - Vowel-consonant ratio
   - Letter values
   - Revealed community tiles
   - Pot odds and chip stack

2. **Considers strategic factors**:
   - Current game stage (pre-flop, flop, turn, river)
   - Pot size vs. bet amount
   - Number of opponents
   - Risk tolerance based on difficulty

3. **Makes decision**:
   - **Fold**: If hand is weak and bet is too high
   - **Check**: If no bet and hand is mediocre
   - **Call**: If hand is decent and pot odds are good
   - **Raise**: If hand is strong and wants to pressure opponents

4. **Returns decision with reasoning** (logged for debugging)

#### 2. Word Building (`aiSubmitWord`)

During showdown phase:

1. **Receives all available tiles**:
   - 2 private hand tiles
   - 5 revealed community tiles
   - Letter values and choice tile options

2. **Analyzes word possibilities**:
   - Prioritizes longer words (more points + full rack bonus)
   - Uses high-value letters strategically
   - Ensures word is dictionary-valid

3. **Generates word submission**:
   - Word string
   - Tiles used (with source: hand or community)
   - Choice tile selections (if applicable)
   - Estimated score

4. **Validates and submits** via dictionary API

### AI Timing

- **Betting turns**: 300ms delay (configurable)
- **Showdown submissions**: 3-15 seconds (randomized for realism)

### Fallback Behavior

If OpenRouter API fails or is unavailable:

1. **Betting fallback**:
   - Simple hand strength calculation
   - Conservative strategy (check/call if affordable, fold otherwise)

2. **Word building fallback**:
   - Greedy selection of highest-value letters
   - Forms simple word from available tiles

## Customization

### Change AI Difficulty

Edit [convex/games.ts](convex/games.ts):

```typescript
// In internalProcessBotTurn
const decision = await ctx.runAction(internal.ai.aiDecideBet, {
  difficulty: "hard", // Change to: "easy", "medium", or "hard"
  // ...
});

// In internalProcessBotShowdown
const wordResult = await ctx.runAction(internal.ai.aiSubmitWord, {
  difficulty: "hard", // Change to: "easy", "medium", or "hard"
  // ...
});
```

### Use Different Models

Edit [convex/aiStrategy.ts](convex/aiStrategy.ts:14-18):

```typescript
export const AI_MODELS = {
  [AI_DIFFICULTY.EASY]: "meta-llama/llama-3.3-70b-instruct:free",
  [AI_DIFFICULTY.MEDIUM]: "anthropic/claude-3.5-haiku:beta",
  [AI_DIFFICULTY.HARD]: "anthropic/claude-3.5-sonnet", // Or any OpenRouter model
} as const;
```

See [OpenRouter Models](https://openrouter.ai/models) for available options.

### Adjust Betting Strategy

Edit [convex/aiStrategy.ts](convex/aiStrategy.ts:21-45):

```typescript
export const BETTING_PROFILES = {
  [AI_DIFFICULTY.HARD]: {
    name: "Aggressive",
    foldThreshold: 0.2,      // Lower = folds less often
    raiseThreshold: 0.6,     // Lower = raises more often
    bluffFrequency: 0.25,    // Higher = bluffs more often
    maxRaiseRatio: 1.0,      // Max raise relative to pot
    riskTolerance: 0.7,      // Higher = takes more risks
  },
  // ...
};
```

### Modify AI Decision Delay

Edit [convex/games.ts](convex/games.ts:24):

```typescript
const BOT_ACTION_DELAY_MS = 300; // Change to your preferred delay (ms)
```

For showdown delays, edit [convex/games.ts](convex/games.ts:2564):

```typescript
const delay = 3000 + Math.floor(Math.random() * 12000); // Min 3s, max 15s
```

## Debugging

### Enable AI Logging

AI decisions include reasoning strings. Check Convex logs:

```bash
bunx convex logs
```

You'll see:
```
AI betting decision: { action: "raise", reasoning: "Strong hand with E, A, R...", confidence: 0.85 }
AI word submission: { word: "MASTER", estimatedScore: 24, reasoning: "6-letter word..." }
```

### Test AI Actions Directly

You can test AI actions via Convex dashboard:

1. Go to **Functions** → **ai** → **aiDecideBet**
2. Provide test input:
   ```json
   {
     "difficulty": "medium",
     "handTiles": [
       { "kind": "single", "letter": "E", "baseValue": 1 },
       { "kind": "single", "letter": "A", "baseValue": 1 }
     ],
     "communityTiles": [
       { "kind": "single", "letter": "T", "baseValue": 2, "revealed": true },
       { "kind": "single", "letter": "R", "baseValue": 2, "revealed": true }
     ],
     "stage": "flop",
     "currentBet": 20,
     "chips": 980,
     "pot": 60,
     "raiseLadder": [20, 40, 60, 80, 100],
     "maxRaises": 3,
     "currentRaises": 0
   }
   ```
3. Click **Run**

## Cost Estimation

OpenRouter pricing varies by model:

- **Free models**: `meta-llama/llama-3.3-70b-instruct:free` - $0/request (rate limited)
- **Haiku**: `anthropic/claude-3.5-haiku:beta` - ~$0.001/request
- **Sonnet**: `anthropic/claude-3.5-sonnet` - ~$0.003/request

Typical game (4 bots, 10 rounds):
- **Betting decisions**: 40-60 API calls
- **Word submissions**: 4-8 API calls
- **Total cost** (Medium difficulty): ~$0.05-0.10 per game

See [OpenRouter Pricing](https://openrouter.ai/docs#models) for current rates.

## Troubleshooting

### AI not making decisions

1. **Check API key**:
   ```bash
   bunx convex env list | grep OPENROUTER
   ```

2. **Check Convex logs**:
   ```bash
   bunx convex logs
   ```

3. **Verify bots are active**:
   - Bots have `authUserId` starting with `dev-bot:`
   - Check via `debugFillRoomWithBots` mutation

### API errors

**"Invalid API key"**
- Verify key is correct: `bunx convex env set OPENROUTER_API_KEY <key>`

**"Rate limit exceeded"**
- Free models have rate limits
- Upgrade to paid models or wait

**"Model not found"**
- Check model ID in [convex/aiStrategy.ts](convex/aiStrategy.ts)
- See [OpenRouter Models](https://openrouter.ai/models)

### Bots folding too often

- Lower `foldThreshold` in [convex/aiStrategy.ts](convex/aiStrategy.ts)
- Increase difficulty to "medium" or "hard"

### Bots submitting invalid words

- AI uses dictionary validation
- Fallback generates simple greedy words
- Check Convex logs for word validation errors

## Advanced Features

### Per-Bot Difficulty

Store difficulty in player metadata:

```typescript
// In convex/schema.ts
players: defineTable({
  // ...
  aiDifficulty: v.optional(v.string()), // "easy", "medium", "hard"
}),

// In convex/games.ts
const difficulty = player.aiDifficulty || "medium";
const decision = await ctx.runAction(internal.ai.aiDecideBet, {
  difficulty,
  // ...
});
```

### Custom AI Personalities

Extend [convex/aiStrategy.ts](convex/aiStrategy.ts:71-76):

```typescript
export const AI_PERSONALITIES = {
  CAUTIOUS: "cautious",      // Never bluffs, folds often
  BALANCED: "balanced",      // Standard play
  AGGRESSIVE: "aggressive",  // Raises frequently
  UNPREDICTABLE: "unpredictable", // Random behavior
} as const;
```

### AI Learning (Future)

Track bot performance and adjust strategy:

```typescript
// Store game history
// Analyze win rates
// Adjust betting profiles dynamically
```

## Next Steps

1. ✅ **Set up API key** (see Quick Start)
2. ✅ **Test with bots** in development
3. 🔄 **Adjust difficulty** based on player feedback
4. 🔄 **Monitor costs** with OpenRouter dashboard
5. 🔄 **Fine-tune strategies** for better gameplay

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)
- [Word Poker Rules](WORD_POKER_RULES.md)

---

**Need help?** Check Convex logs (`bunx convex logs`) or open an issue on GitHub.
