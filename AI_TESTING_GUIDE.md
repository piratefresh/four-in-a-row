# AI Player Testing Guide

## Quick Test (5 minutes)

### Step 1: Set Up OpenRouter API Key

```bash
# Get your free API key from https://openrouter.ai/
bunx convex env set OPENROUTER_API_KEY sk-or-v1-your-key-here

# Verify it's set
bunx convex env list
```

### Step 2: Start Development Servers

```bash
# Terminal 1: Start Convex
bunx convex dev

# Terminal 2: Start frontend
bun run dev
```

### Step 3: Create a Test Room with Bots

**Option A: Via UI**
1. Open browser to `http://localhost:3000`
2. Create a room (join any room)
3. Open browser DevTools console (F12)
4. Run this command to add bots:
   ```javascript
   // Get your room code from URL (e.g., /rooms/ABC123)
   const roomCode = "ABC123"; // Replace with your room code

   // Add 2-3 bots to the room
   await convex.mutation("rooms:debugFillRoomWithBots", {
     code: roomCode,
     count: 3
   });
   ```

**Option B: Via Convex Dashboard**
1. Go to Convex Dashboard: `https://dashboard.convex.dev`
2. Select your project
3. Go to **Functions** → **rooms** → **debugFillRoomWithBots**
4. Run with:
   ```json
   {
     "code": "YOUR_ROOM_CODE",
     "count": 3
   }
   ```

### Step 4: Start the Game

1. In the room, click **Ready** (all bots auto-ready)
2. Game will start automatically when all players are ready
3. Watch the AI bots make decisions!

### Step 5: Watch AI in Action

**During Betting Rounds:**
- Bots will automatically check/call/raise/fold
- Watch the Convex logs to see AI reasoning:
  ```bash
  bunx convex logs --tail
  ```

**During Showdown:**
- Bots will submit words after 3-15 seconds
- You'll see their word submissions appear

---

## Testing Without OpenRouter (Fallback Mode)

If you don't have an API key yet, the AI will use fallback logic:

```bash
# Don't set OPENROUTER_API_KEY
# Just start the servers and play
```

**Fallback behavior:**
- ✅ Bots still play (using rule-based logic)
- ✅ Betting: Conservative strategy (check/call if affordable, fold otherwise)
- ✅ Word building: Greedy selection of highest-value letters
- ❌ No strategic AI reasoning
- ❌ No OpenRouter API calls

---

## Detailed Testing Scenarios

### Test 1: AI Betting Decisions

**Goal:** Verify AI makes intelligent betting decisions

1. **Start a game with 1 human + 3 AI bots**
2. **Observe AI behavior in different stages:**
   - **Pre-flop**: Should be conservative (fold weak hands)
   - **Flop**: Should evaluate synergy with community tiles
   - **Turn**: Should calculate pot odds
   - **River**: Should be more confident with full info

3. **Check Convex logs for AI reasoning:**
   ```bash
   bunx convex logs --tail | grep "AI"
   ```

   You should see:
   ```
   AI betting decision: {
     action: "raise",
     reasoning: "Strong hand with E, A, R in community. Can form RATE or TEAR.",
     confidence: 0.85
   }
   ```

**Expected behaviors:**
- ✅ Easy bots fold frequently (conservative)
- ✅ Hard bots raise more often (aggressive)
- ✅ Bots check when no bet to match
- ✅ Bots fold when chips are low and bet is high

### Test 2: AI Word Building (Showdown)

**Goal:** Verify AI submits valid, high-scoring words

1. **Play through to showdown stage**
2. **Wait 3-15 seconds** (AI submission delay)
3. **Check submitted words:**
   - Should be 2-7 letters
   - Should use available tiles correctly
   - Should be dictionary-valid

4. **Verify in Convex logs:**
   ```bash
   bunx convex logs --tail | grep "word"
   ```

   You should see:
   ```
   AI word submission: {
     word: "MASTER",
     estimatedScore: 24,
     reasoning: "6-letter word using high-value M, scores 19 base + 5 valid word bonus"
   }
   ```

**Expected behaviors:**
- ✅ Bots submit within 3-15 seconds
- ✅ Words are dictionary-valid
- ✅ Tiles are used correctly (no duplicates)
- ✅ Choice tiles are resolved properly
- ✅ Bots forfeit if they can't form a word

### Test 3: Different Difficulty Levels

**Goal:** Compare Easy vs Medium vs Hard AI

1. **Modify AI difficulty in code:**

   Edit `convex/games.ts` line 527:
   ```typescript
   const decision = await ctx.runAction(internal.ai.aiDecideBet, {
     difficulty: "easy", // Change to: "easy", "medium", "hard"
     // ...
   });
   ```

2. **Play multiple games and observe:**
   - **Easy**: Folds often, rarely raises, conservative
   - **Medium**: Balanced play, some raises
   - **Hard**: Aggressive, raises frequently, bluffs

3. **Compare in logs:**
   ```bash
   bunx convex logs --tail | grep "confidence"
   ```

### Test 4: Choice Tiles Handling

**Goal:** Verify AI correctly handles choice tiles (A/E, T/S, etc.)

1. **Start a game** (choice tiles appear randomly)
2. **Check Convex logs when bot has choice tile:**
   ```
   AI analyzing: [E/I](1/1), T(2), R(2)
   ```
3. **Verify AI selects appropriate letter:**
   ```
   AI word: "TIRE" using choice tile E/I -> selected I
   ```

**Expected:**
- ✅ AI recognizes choice tiles
- ✅ Picks best letter option for word formation
- ✅ Correctly submits `choiceResolutions` in word submission

### Test 5: Error Handling & Fallback

**Goal:** Verify system gracefully handles API failures

1. **Set invalid API key:**
   ```bash
   bunx convex env set OPENROUTER_API_KEY invalid-key
   ```

2. **Start a game with bots**

3. **Observe behavior:**
   - ✅ Bots still make decisions (fallback logic)
   - ✅ Game continues normally
   - ✅ Logs show "using fallback strategy"

4. **Check logs:**
   ```bash
   bunx convex logs --tail
   ```

   You should see:
   ```
   AI betting decision failed, using fallback: [Error: Invalid API key]
   Fallback strategy (API unavailable)
   ```

### Test 6: Performance & Timing

**Goal:** Verify AI responds in reasonable time

1. **Start game with 4 AI bots**
2. **Measure response times:**
   - **Betting turns**: Should be ~300-500ms
   - **Showdown**: 3-15 seconds (randomized)

3. **Check for delays in logs:**
   ```bash
   bunx convex logs --tail --timestamps
   ```

**Expected:**
- ✅ No significant lag between turns
- ✅ Showdown submissions staggered (not all at once)
- ✅ Game progresses smoothly

---

## Manual Testing Checklist

### Betting Phase
- [ ] AI checks when bet is 0
- [ ] AI calls when hand is decent
- [ ] AI raises when hand is strong
- [ ] AI folds when hand is weak + bet is high
- [ ] AI doesn't raise beyond chip limit
- [ ] AI respects max raises per round (3)
- [ ] AI follows raise ladder (20, 40, 60, etc.)

### Showdown Phase
- [ ] AI submits word within 3-15 seconds
- [ ] Word is 2-7 letters long
- [ ] Word is dictionary-valid
- [ ] Tiles are correctly used
- [ ] No duplicate tile usage
- [ ] Choice tiles are resolved
- [ ] Score calculation is accurate
- [ ] AI forfeits if can't form word

### Edge Cases
- [ ] AI with insufficient chips folds
- [ ] AI all-in when chips < bet
- [ ] Single bot remaining auto-wins
- [ ] All bots fold → game ends
- [ ] Bot disconnection handled gracefully

---

## Testing via Convex Dashboard

### Test `aiDecideBet` Action

1. Go to Convex Dashboard → **Functions** → **ai** → **aiDecideBet**
2. Use this test input:

```json
{
  "difficulty": "medium",
  "handTiles": [
    { "kind": "single", "letter": "E", "baseValue": 1 },
    { "kind": "single", "letter": "A", "baseValue": 1 }
  ],
  "communityTiles": [
    { "kind": "single", "letter": "T", "baseValue": 2, "revealed": true },
    { "kind": "single", "letter": "R", "baseValue": 2, "revealed": true },
    { "kind": "single", "letter": "S", "baseValue": 2, "revealed": false }
  ],
  "stage": "flop",
  "currentBet": 20,
  "chips": 980,
  "pot": 60,
  "raiseLadder": [20, 40, 60, 80, 100, 120, 140, 160, 200],
  "maxRaises": 3,
  "currentRaises": 0
}
```

3. Click **Run**
4. Verify response:
   ```json
   {
     "action": "call",
     "reasoning": "Good hand with E, A, T, R - can form RATE, TEAR, etc.",
     "confidence": 0.72
   }
   ```

### Test `aiSubmitWord` Action

1. Go to **Functions** → **ai** → **aiSubmitWord**
2. Use this test input:

```json
{
  "difficulty": "medium",
  "handTiles": [
    { "kind": "single", "letter": "M", "baseValue": 4 },
    { "kind": "single", "letter": "A", "baseValue": 1 }
  ],
  "communityTiles": [
    { "kind": "single", "letter": "S", "baseValue": 2, "revealed": true },
    { "kind": "single", "letter": "T", "baseValue": 2, "revealed": true },
    { "kind": "single", "letter": "E", "baseValue": 1, "revealed": true },
    { "kind": "single", "letter": "R", "baseValue": 2, "revealed": true },
    { "kind": "single", "letter": "Y", "baseValue": 4, "revealed": true }
  ]
}
```

3. Click **Run**
4. Verify response contains:
   - Valid word (e.g., "MASTER", "STREAM")
   - Correct tiles used
   - Reasonable estimated score

---

## Debugging Common Issues

### Issue: Bots not acting

**Check:**
1. Are bots actually in the game?
   ```bash
   bunx convex dashboard
   # Go to Data → playerHands → verify bot playerIds
   ```

2. Is it the bot's turn?
   ```bash
   bunx convex logs | grep "Current player index"
   ```

3. Is scheduler running?
   ```bash
   bunx convex logs | grep "scheduleBotTurnIfNeeded"
   ```

### Issue: API errors

**Check logs:**
```bash
bunx convex logs --tail | grep -i error
```

Common errors:
- **"Invalid API key"**: Re-check your key
  ```bash
  bunx convex env set OPENROUTER_API_KEY sk-or-v1-...
  ```

- **"Rate limit"**: Using free tier? Wait or upgrade

- **"Model not found"**: Check model ID in `convex/aiStrategy.ts`

### Issue: Invalid words submitted

**Debug:**
1. Check what word AI tried to submit:
   ```bash
   bunx convex logs | grep "AI word"
   ```

2. Manually validate the word:
   ```bash
   curl "https://api.dictionaryapi.dev/api/v2/entries/en/WORD"
   ```

3. Check tile usage in logs:
   ```bash
   bunx convex logs | grep "tiles"
   ```

### Issue: Bots always fold

**Possible causes:**
- Difficulty too low (use "medium" or "hard")
- `foldThreshold` too high in `aiStrategy.ts`
- API returning conservative decisions

**Fix:**
```typescript
// convex/aiStrategy.ts
[AI_DIFFICULTY.MEDIUM]: {
  foldThreshold: 0.2, // Lower = folds less (was 0.25)
  // ...
}
```

---

## Load Testing

### Test with Multiple Games

1. **Create multiple rooms**
2. **Fill each with bots**
3. **Monitor API usage:**
   - OpenRouter Dashboard: https://openrouter.ai/activity
   - Check request counts and costs

4. **Check performance:**
   ```bash
   bunx convex logs --tail | grep "execution time"
   ```

### Stress Test (10 concurrent games)

```javascript
// Run in browser console
for (let i = 0; i < 10; i++) {
  await convex.mutation("rooms:createRoom", { name: `Test ${i}` });
  const rooms = await convex.query("rooms:listRooms");
  const room = rooms[i];
  await convex.mutation("rooms:debugFillRoomWithBots", {
    code: room.code,
    count: 4
  });
}
```

**Monitor:**
- ✅ No timeouts
- ✅ No database conflicts
- ✅ API rate limits not exceeded

---

## Cost Tracking

### Monitor OpenRouter Usage

1. Go to https://openrouter.ai/activity
2. Check **Requests** and **Cost**
3. Typical costs per game:
   - Easy (free): $0
   - Medium: ~$0.05-0.10
   - Hard: ~$0.10-0.20

### Set Budget Alerts

In OpenRouter dashboard:
1. Go to **Settings** → **Billing**
2. Set monthly budget limit
3. Enable email alerts

---

## Automated Testing (Future)

### Unit Tests for AI Logic

```typescript
// convex/gameRules.test.ts
describe("estimateHandStrength", () => {
  it("should rate high-value tiles higher", () => {
    const hand = [
      { letter: "Q", baseValue: 10 },
      { letter: "Z", baseValue: 10 }
    ];
    const strength = estimateHandStrength(hand);
    expect(strength).toBeGreaterThan(0.5);
  });
});
```

### Integration Tests

```typescript
// Test full AI betting flow
test("AI bot makes betting decision", async () => {
  const game = await createTestGame();
  const result = await internalProcessBotTurn({ gameId: game._id });
  expect(result.ok).toBe(true);
  expect(["fold", "check", "call", "raise"]).toContain(result.action);
});
```

---

## Quick Verification Script

Save this to `test-ai.sh`:

```bash
#!/bin/bash

echo "🧪 Testing AI Player System..."

# 1. Check API key
echo "1. Checking API key..."
bunx convex env list | grep OPENROUTER_API_KEY && echo "✅ API key set" || echo "❌ API key missing"

# 2. Check logs for AI activity
echo "2. Checking recent AI activity..."
bunx convex logs --limit 10 | grep -i "AI" && echo "✅ AI active" || echo "⚠️  No recent AI activity"

# 3. Check for errors
echo "3. Checking for errors..."
bunx convex logs --limit 50 | grep -i error && echo "⚠️  Errors found" || echo "✅ No errors"

echo "✨ Test complete!"
```

Run with:
```bash
chmod +x test-ai.sh
./test-ai.sh
```

---

## Success Criteria

Your AI system is working correctly when:

- ✅ Bots join games and act automatically
- ✅ Bots make decisions in ~300ms during betting
- ✅ Bots submit valid words during showdown
- ✅ No errors in Convex logs
- ✅ Game progresses smoothly without timeouts
- ✅ Fallback works when API unavailable
- ✅ Different difficulty levels show behavioral differences
- ✅ Logs show AI reasoning and confidence scores

---

**Ready to test?** Start with the [Quick Test](#quick-test-5-minutes) above! 🚀
