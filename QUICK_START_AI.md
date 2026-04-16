# Quick Start: Playing Against AI

## TL;DR - 3 Steps to Play Against AI

### 1. Set OpenRouter API Key

```bash
bunx convex env set OPENROUTER_API_KEY sk-or-v1-your-key-here
```

Get free key: https://openrouter.ai/

### 2. Start Dev Servers

```bash
# Terminal 1
bunx convex dev

# Terminal 2
bun run dev
```

### 3. Add AI Bots in Game

1. Open browser to `http://localhost:3000`
2. Join/create a room
3. **Click "Add 2 AI bots 🤖" button** in Development section
4. Click "Ready" to start game
5. **Watch AI bots play!**

---

## Detailed Steps

### Step 1: Get OpenRouter API Key (Free!)

1. Go to https://openrouter.ai/
2. Sign up (free)
3. Go to **Keys** section
4. Click **Create Key**
5. Copy your key (starts with `sk-or-v1-...`)

### Step 2: Configure Convex

In your terminal:

```bash
bunx convex env set OPENROUTER_API_KEY sk-or-v1-paste-your-key-here
```

Verify:
```bash
bunx convex env list
# Should show: OPENROUTER_API_KEY=sk-or-v1-***
```

### Step 3: Start Development

**Terminal 1** - Start Convex backend:
```bash
bunx convex dev
```

**Terminal 2** - Start frontend:
```bash
bun run dev
```

Wait for both to be ready (you'll see "Ready" messages).

### Step 4: Create/Join Room

1. Open browser: `http://localhost:3000`
2. Log in / sign up
3. **Join any room** or create new one

### Step 5: Add AI Bots

**You'll see a "Development" section** with a blue button:

```
┌─────────────────────────────────┐
│ Development                     │
│                                 │
│ [Rejoin this room]              │
│ [Add 2 AI bots 🤖]             │
│                                 │
│ AI bots fill open seats with   │
│ intelligent betting and word-   │
│ building.                       │
└─────────────────────────────────┘
```

**Click "Add 2 AI bots 🤖"**

### Step 6: Start Game

1. Bots will appear in Players list as:
   - Dev Bot 1 ✓ Ready
   - Dev Bot 2 ✓ Ready

2. Click **"Ready"** to mark yourself ready

3. Game starts automatically when all players ready!

### Step 7: Watch AI Play

**During Betting:**
- AI bots will automatically:
  - ✅ Check/Call/Raise/Fold based on hand strength
  - ✅ Make strategic decisions
  - ✅ Act within ~300ms

**During Showdown:**
- AI bots will:
  - ✅ Submit valid words within 3-15 seconds
  - ✅ Use available tiles strategically
  - ✅ Aim for high scores

**Check Logs** to see AI reasoning:
```bash
bunx convex logs --tail
```

You'll see:
```
AI betting decision: { action: "raise", reasoning: "Strong hand...", confidence: 0.85 }
AI word: "MASTER" (score: 24)
```

---

## How It Works

### AI Makes 2 Types of Decisions

#### 1. **Betting Decisions** (Pre-flop, Flop, Turn, River)

AI analyzes:
- Hand tiles (your 2 private tiles)
- Revealed community tiles
- Current bet vs pot size
- Your chip stack
- Game stage

Then decides:
- **Fold** if hand is weak
- **Check** if no bet to match
- **Call** if hand is decent
- **Raise** if hand is strong

#### 2. **Word Building** (Showdown)

AI generates:
- Valid English word (2-7 letters)
- Uses tiles from hand + community
- Optimizes for score (length + high-value letters)
- Handles choice tiles (A/E, T/S, etc.)

---

## Troubleshooting

### "Development section not showing"

The Development section only appears in **development mode**. Make sure:
- You're running `bun run dev` (not production build)
- You're logged in

### "Add AI bots button is disabled"

This happens when:
- Room is already full (max 6 players)
- Already have 3+ members
- Bots are being added (wait a moment)

### "AI bots not making decisions"

**Check API key:**
```bash
bunx convex env list | grep OPENROUTER
```

If missing, set it:
```bash
bunx convex env set OPENROUTER_API_KEY your-key-here
```

**Check logs for errors:**
```bash
bunx convex logs --tail
```

### "Bots just folding/calling"

This is **fallback mode** (when OpenRouter API fails):
- Check your API key is valid
- Check OpenRouter dashboard for quota
- Free tier has rate limits

With valid API key, bots will be strategic!

---

## What Bots Can Do

✅ **Join games** automatically
✅ **Make strategic bets** (fold/check/call/raise)
✅ **Evaluate hand strength** based on tiles
✅ **Calculate pot odds**
✅ **Bluff occasionally** (based on difficulty)
✅ **Submit valid words** during showdown
✅ **Handle choice tiles** correctly
✅ **Forfeit if no word possible**

---

## Testing Different Difficulty

Want harder/easier bots? Edit the code:

**File:** `convex/games.ts`

**Line 527** (betting):
```typescript
difficulty: "hard", // Change to: "easy", "medium", "hard"
```

**Line 2615** (word building):
```typescript
difficulty: "hard", // Change to: "easy", "medium", "hard"
```

**Restart Convex** after changes:
```bash
# Ctrl+C in convex terminal, then:
bunx convex dev
```

---

## Alternative: Add Bots via Console

If you don't see the button, use browser console (F12):

```javascript
// Replace with your room code
const roomCode = "ABC123";

// Add 3 AI bots
await convex.mutation("rooms:debugFillRoomWithBots", {
  code: roomCode,
  count: 3
});
```

---

## Next Steps

- ✅ **Play multiple games** to see AI behavior
- ✅ **Check logs** to understand AI reasoning
- ✅ **Try different difficulties** (easy/medium/hard)
- ✅ **Add more bots** (up to 5)
- ✅ **Customize AI** (see AI_SETUP.md)

---

## Summary

**To add AI to a game:**

1. **Click the "Add 2 AI bots 🤖" button** (easiest!)
2. Or use console: `debugFillRoomWithBots({ code: "ABC123", count: 2 })`
3. Bots auto-ready and start playing with AI!

**That's it!** The AI integration is automatic - just add bots and they'll use intelligent decision-making. 🎮🤖
