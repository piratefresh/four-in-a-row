# WORD POKER

## Complete Game Specification

---

# 1. PLAYER BALANCE SYSTEM

Word Poker uses two separate balances:

## Wallet Balance

The player's permanent account balance.

Wallet Coins are used to:

- Join tables
- Re-buy after losing a full Table Stack
- Receive remaining chips when leaving a table

Wallet Coins cannot be used directly for bets during a game.

## Table Stack

The chips currently available to the player at a specific table.

All bets, calls, raises, and all-ins must come from the player's Table Stack.

The Table Stack is created when the player pays the table's fixed buy-in.

### Example

Wallet before joining: 185,000 Coins
Table buy-in: 50,000 Coins

After joining:

- Wallet Balance: 135,000 Coins
- Table Stack: 50,000 Coins

Wallet Balance and Table Stack must always be stored separately.

---

# 2. TABLE BUY-INS

Each table has one fixed buy-in amount.

Every player joining the same table begins with the same Table Stack.

There are:

- No custom buy-ins
- No minimum-to-maximum buy-in ranges
- No buy-in slider
- No forced blinds

## Example Tables

### Beginner Table

Buy-In: 500 Coins
Maximum Players: 6

### Intermediate Table

Buy-In: 5,000 Coins
Maximum Players: 6

### High Stakes Table

Buy-In: 50,000 Coins
Maximum Players: 6

The fixed buy-in ensures that players with larger Wallet Balances cannot enter a low-stakes table with more betting power than everyone else.

Stacks may grow beyond the original buy-in after the game begins.

---

# 3. TABLE BROWSER

Each table card displays:

- Table Name
- Fixed Buy-In
- Current Player Count
- Maximum Player Count
- Join button

## Example

**High Stakes**

Buy-In: 50,000 Coins
Players: 4/6

[ JOIN ]

## Join Button Rules

The Join button is disabled when:

- The table is full
- The player's Wallet Balance is below the fixed buy-in
- The player is already seated at the table
- The table is temporarily unavailable

---

# 4. JOINING A TABLE

Pressing Join opens a confirmation modal.

The modal displays:

- Table Name
- Wallet Balance
- Fixed Buy-In
- Wallet Balance after joining
- Confirm and Join button
- Cancel button

## Example

**Join High Stakes?**

Wallet Balance: 185,000 Coins
Buy-In: 50,000 Coins
Remaining Wallet Balance: 135,000 Coins

[ CONFIRM & JOIN ]
[ CANCEL ]

## Joining Rules

- The player must have a Wallet Balance equal to or greater than the buy-in.
- The exact fixed buy-in is deducted from the Wallet.
- The same amount becomes the player's Table Stack.
- Partial buy-ins are not allowed.
- Custom buy-ins are not allowed.
- The player cannot use additional Wallet Coins after joining.
- A seat becomes occupied only after the transaction succeeds.

The Wallet deduction and Table Stack creation must happen as one transaction. The system must not deduct Coins unless the player successfully joins the table.

---

# 5. PLAYERS AND TABLE SETUP

Each table supports:

- Minimum recommended players: 4
- Maximum players: 6
- One house-controlled dealer
- Equal fixed buy-ins
- No small blind
- No big blind
- No ante
- No forced opening bet

The house dealer manages:

- Tile distribution
- Community tile reveals
- Player turn order
- Pots
- Showdowns
- Tie-breaker draws
- Round transitions

The dealer does not participate as a player.

## Dealer Button and Turn Order

A dealer-position marker rotates clockwise after each completed hand.

The first active player clockwise from the dealer position acts first during the first betting round.

The first remaining active player clockwise from the dealer position acts first during later betting rounds.

The dealer marker determines action order only. It does not require any forced bet.

---

# 6. LETTER VALUES AND SCORING

## Letter Point Values

| Points | Letters          |
| -----: | ---------------- |
|      1 | A, E, I, O, U    |
|      2 | R, S, T, L, N    |
|      3 | D, G             |
|      4 | B, C, M, P       |
|      5 | F, H, V, W, Y, K |
|      8 | J, X             |
|     10 | Q, Z             |

---

# 7. WORD SCORE CALCULATION

## Step 1: Calculate the Base Score

Add the values of every letter in the submitted word.

### Example: MARKET

- M = 4
- A = 1
- R = 2
- K = 5
- E = 1
- T = 2

Base Score:

4 + 1 + 2 + 5 + 1 + 2 = **15 points**

## Step 2: Apply Tile Multipliers

Individual tiles may have a score multiplier.

Possible multiplier tiles include:

- Double Letter
- Triple Letter

The multiplier applies to every letter printed on that tile.

### Double Letter Example

A normal M is worth 4 points.

A Double Letter M is worth:

4 × 2 = **8 points**

The bonus is applied only when that tile is used in the submitted word.

### Triple Letter Example

A normal Q is worth 10 points.

A Triple Letter Q is worth:

10 × 3 = **30 points**

## Step 3: Apply the Full Rack Bonus

Using all seven available tiles awards:

**+10 points**

The seven available tiles are:

- Two private tiles
- Five community tiles

A two-letter tile still counts as one tile for the Full Rack Bonus.

The player's submitted word may contain more than seven letters only when two-letter tiles are present, but every physical tile must be used to receive the Full Rack Bonus.

## Final Score Formula

**Final Score = Modified Letter Score + Full Rack Bonus**

There is no timer bonus.

Finishing quickly does not increase the player's score.

---

# 8. MONSTER SCORE EXAMPLE

Word: **MONSTER**

Tiles used: 7
Double Letter Tile: M

## Base Letter Values

- M = 4
- O = 1
- N = 2
- S = 2
- T = 2
- E = 1
- R = 2

Base Score:

4 + 1 + 2 + 2 + 2 + 1 + 2 = **14 points**

## Apply Double Letter M

M becomes:

4 × 2 = 8

Modified Letter Score:

8 + 1 + 2 + 2 + 2 + 1 + 2 = **18 points**

## Apply Full Rack Bonus

All seven tiles were used:

18 + 10 = **28 points**

Final Score: **28 points**

---

# 9. MULTIPLIER TILE GENERATION

Each eligible tile has a chance to receive a multiplier.

Recommended starting configuration:

- Approximately 15% chance for a tile to become a Double Letter tile
- Triple Letter tiles should be significantly rarer
- High-value letters may receive a slightly higher chance of becoming special tiles

The final probabilities should be configurable for balance testing.

## Multiplier Rules

- A multiplier belongs to the physical tile.
- The multiplier is visible to the tile's owner or to everyone when it is a community tile.
- The multiplier applies only when the tile is used.
- Unused multiplier tiles provide no points.
- Multipliers do not multiply the Full Rack Bonus.
- Multipliers do not stack unless the game explicitly introduces stacked modifiers later.

Special tiles should have a distinct visual treatment, such as:

- Different border color
- Glow
- Animated shimmer
- Double or Triple badge
- Reveal animation
- Sound effect

---

# 10. TWO-LETTER TILES

## What Is a Two-Letter Tile?

A two-letter tile contains two letters on one physical tile.

Examples:

- TH
- ER
- IN
- ED

Both letters are displayed together.

The tile counts as one physical tile but provides two letters when building a word.

## Two-Letter Tile Rules

- Both letters must be used together.
- The letters cannot be separated.
- The order printed on the tile must be preserved.
- Each letter scores independently.
- The tile counts as one tile for the Full Rack Bonus.
- A two-letter tile may appear as a private tile or community tile.
- Three-letter and four-letter tiles are not allowed.

### Example

A TH tile contributes:

- T = 2 points
- H = 5 points

Total value:

2 + 5 = **7 points**

If the TH tile has a Double Letter multiplier:

(2 + 5) × 2 = **14 points**

## Two-Letter Tile Frequency

A hand may contain a maximum of three two-letter tiles across:

- All private tiles dealt to players
- All five community tiles

Recommended distribution:

- Usually one private two-letter tile
- Usually one community two-letter tile
- Occasionally a third two-letter tile
- Never more than three total

The exact placement is controlled by the game system and may vary each hand.

## Example Choice Tiles

### Vowel Choices

- A/E
- E/I
- O/U
- A/I

### Consonant Choices

- T/S
- R/N
- D/T
- S/L

### High-Value Choices

- Q/K
- Z/X
- J/H

Choice tiles and fixed two-letter sequence tiles should be treated as separate tile types.

A fixed sequence tile such as TH must use both letters in that order.

A choice tile such as A/E allows the player to choose either A or E when submitting the word. It does not provide both letters.

The UI must clearly distinguish between:

- Fixed two-letter sequence tiles
- Either-or choice tiles

---

# 11. WORD VALIDATION

A submitted word must:

- Contain at least 2 letters
- Use only letters provided by the selected tiles
- Respect the printed order of fixed two-letter tiles
- Use each physical tile no more than once
- Appear in the configured dictionary
- Be submitted before the reveal timer expires

Supported dictionaries may include:

- TWL
- SOWPODS

The dictionary used by a table or game mode must be displayed before joining.

## Invalid Submissions

The player receives 0 points when:

- The word is not in the selected dictionary
- The word uses unavailable letters
- A two-letter tile is split
- A fixed sequence is reversed
- A tile is used more than once
- The player submits after the timer expires
- The player submits no word

A player with an invalid word may still lose chips already committed to the pot.

---

# 12. WORD LENGTH

A word must contain at least 2 letters.

The normal maximum is determined by the available tiles:

- Seven single-letter tiles can create up to a seven-letter word.
- Two-letter tiles may allow a word to contain more than seven letters.
- The player may never use more physical tiles than are available.

For example, seven physical tiles containing two two-letter tiles could create a nine-letter word.

The Full Rack Bonus is based on using all seven physical tiles, not on the number of letters in the final word.

---

# 13. HAND STRUCTURE

A complete hand contains the following phases:

1. Deal Private Tiles
2. First Betting Round
3. Flop
4. Second Betting Round
5. Turn
6. Third Betting Round
7. River
8. Final Betting Round
9. Word Building
10. Showdown
11. Pot Award
12. Next Hand

There are no blinds or antes.

---

# 14. PHASE 1: DEAL PRIVATE TILES

Each active player receives two private tiles.

Private tiles:

- Are visible only to their owner
- May contain single letters
- May contain two-letter tiles
- May contain choice tiles
- May contain tile multipliers

Players see their private tiles before making any bet.

After all private tiles have been dealt, the first betting round begins.

---

# 15. PHASE 2: FIRST BETTING ROUND

Players bet using only the information from their two private tiles.

Available actions depend on the current bet.

## When No Bet Exists

The player may:

- Check
- Bet
- Fold
- Go All In

## When a Bet Exists

The player may:

- Call
- Raise
- Fold
- Go All In

Checking is not available when the player must call an existing bet.

The betting round ends when:

- All remaining players have contributed the same amount, or
- All remaining players except one are all in, or
- Only one player remains in the hand

---

# 16. PHASE 3: THE FLOP

The dealer reveals three community tiles.

All active players may use these tiles.

The community tiles may contain:

- Single letters
- Two-letter tiles
- Choice tiles
- Double Letter tiles
- Triple Letter tiles

A new betting round begins after the reveal.

Available actions include:

- Check
- Bet
- Call
- Raise
- Fold
- All In

---

# 17. PHASE 4: THE TURN

The dealer reveals one additional community tile.

There are now four visible community tiles.

A new betting round begins.

Players may:

- Check
- Bet
- Call
- Raise
- Fold
- Go All In

---

# 18. PHASE 5: THE RIVER

The dealer reveals the fifth and final community tile.

Players now have access to:

- Two private tiles
- Five community tiles

A final betting round begins.

Players may:

- Check
- Bet
- Call
- Raise
- Fold
- Go All In

After betting is complete, the hand moves to Word Building.

---

# 19. PHASE 6: WORD BUILDING

Remaining players receive 60 seconds to create and submit their best word.

Players may use:

- Only private tiles
- Only community tiles
- A mixture of private and community tiles

Players do not have to use a private tile.

Players do not have to use every community tile.

## Submission Requirements

The player selects the tiles being used and arranges them into a valid word.

Two-letter sequence tiles:

- Must use both letters
- Must preserve their printed order
- Cannot be split

Choice tiles:

- Contribute one selected letter
- Must clearly show which option the player selected

The player may edit their submission until:

- They confirm it, or
- The 60-second timer expires

There is no bonus for submitting early.

## Timeout

When time expires:

- A confirmed word is locked.
- An unconfirmed draft may be automatically submitted only if the game explicitly supports auto-submit.
- Otherwise, no confirmed word results in 0 points.

The preferred default is that the player must confirm their word before time expires.

---

# 20. PHASE 7: SHOWDOWN

All remaining players reveal their submitted words.

Each submission displays:

- Submitted word
- Tiles used
- Base letter score
- Tile multiplier bonuses
- Full Rack Bonus
- Final score
- Validation result

The valid word with the highest final score wins the pot.

Folded players do not participate in the showdown.

---

# 21. TIE-BREAKER RULES

Ties are resolved in the following order:

## 1. Longest Valid Word

The word containing the most letters wins.

For this tie-breaker, both letters on a two-letter tile count individually.

## 2. Highest Single Letter Value

Compare the highest-value letter used in each tied word.

Example:

- A word containing Q has a highest letter value of 10.
- A word containing J has a highest letter value of 8.

The Q word wins.

Tile multipliers do not change the printed letter value for this tie-breaker.

## 3. High-Value Tile Draw

Each tied player receives one random temporary tile.

The player with the highest printed tile value wins.

For two-letter draw tiles, use the combined printed value unless the game configuration disables two-letter tiles in tie-breaker draws.

Drawn tiles are discarded after the tie-breaker.

If the draw is still tied, repeat until there is a winner.

---

# 22. BETTING AND TABLE STACK RULES

All bets use only the player's Table Stack.

Wallet Coins cannot:

- Cover a call
- Increase a raise
- Complete an all-in
- Automatically refill a stack
- Be transferred into the table during an active hand

## Betting Controls

The interface includes:

- Fold
- Check
- Bet
- Call
- Raise
- Raise Slider
- All In

Only actions currently available should be enabled.

## Raise Slider

The Raise Slider:

- Cannot exceed the player's available Table Stack
- Must respect the table's minimum raise
- Must display the total bet amount clearly
- Must account for chips already committed during the current betting round

## All In

All In commits the player's exact remaining Table Stack.

### Example

Current Table Stack: 3,420 Coins

Pressing All In commits:

**3,420 Coins**

The All In button should display the amount:

**ALL IN · 3,420**

---

# 23. CURRENT BET AND CALLING

The Current Bet is the highest amount committed by any active player during the current betting round.

To Call, a player contributes enough chips to match the Current Bet.

### Example

Current Bet: 500 Coins
Player already committed: 200 Coins

Call amount:

500 − 200 = **300 Coins**

If the player's remaining stack is less than the required call amount, the player may call by going all in.

---

# 24. WINNING CHIPS

The winning player receives the pot.

Winnings are added to the player's Table Stack, not directly to the Wallet.

Stacks are not capped after joining.

### Example

Original buy-in: 50,000 Coins
Current Table Stack before winning: 50,000 Coins
Pot won: 40,000 Coins

New Table Stack:

50,000 + 40,000 = **90,000 Coins**

The fixed buy-in limits only the amount initially brought to the table.

---

# 25. SIDE POTS

Side pots are required when one or more players go all in with different stack sizes.

A player may win only the portions of the pot they were eligible to contest.

## Example

- Player A commits 500 Coins.
- Player B commits 1,000 Coins.
- Player C commits 1,000 Coins.

Main Pot:

500 × 3 = 1,500 Coins

Player A, Player B, and Player C may win the Main Pot.

Side Pot:

500 additional Coins from Player B
500 additional Coins from Player C

Side Pot total: 1,000 Coins

Only Player B and Player C may win the Side Pot.

Each pot is evaluated independently using the same word scoring and tie-breaker rules.

---

# 26. WINNING WITHOUT A SHOWDOWN

If every player except one folds, the remaining player wins the pot immediately.

The winning player:

- Does not need to reveal private tiles
- Does not need to submit a word
- Receives the entire eligible pot
- Begins the next hand with the awarded chips in their Table Stack

---

# 27. RE-BUY RULES

A player may re-buy only when their Table Stack reaches zero.

When this happens, display:

**You are out of chips.**

[ RE-BUY ]
[ LEAVE TABLE ]

## Re-Buy Conditions

- Re-buy is allowed only between hands.
- Re-buy is never allowed during an active hand.
- The re-buy amount is always the table's fixed buy-in.
- There is no re-buy slider.
- Partial re-buys are not allowed.
- The full buy-in is deducted from the Wallet.
- The full buy-in becomes the new Table Stack.

## Example

Table buy-in: 5,000 Coins
Wallet Balance: 12,000 Coins
Table Stack: 0 Coins

After re-buy:

- Wallet Balance: 7,000 Coins
- Table Stack: 5,000 Coins

If the player's Wallet Balance is below the table buy-in:

- Re-Buy is disabled.
- The player must leave the table.
- The seat becomes available.

---

# 28. LEAVING THE TABLE

A player may leave:

- Between hands
- After being eliminated
- After choosing not to re-buy
- After returning from a disconnect

A player cannot voluntarily remove chips during an active hand.

When leaving:

- The remaining Table Stack is transferred to the Wallet.
- The Table Stack becomes zero.
- The seat becomes available.
- The player is removed from the table.

## Example

Wallet Balance: 135,000 Coins
Table Stack: 92,000 Coins

After leaving:

- Wallet Balance: 227,000 Coins
- Table Stack: 0 Coins

The transfer must occur as one transaction to prevent lost or duplicated chips.

---

# 29. DISCONNECT HANDLING

When a player disconnects:

- Their seat remains reserved.
- Their Table Stack remains at the table.
- Their Wallet Balance is unchanged.
- They are automatically folded when action reaches them.
- They cannot win new pots after being folded.

The default reconnect timeout is three minutes.

The timeout must be configurable.

## Reconnecting Before Timeout

If the player reconnects before the timeout expires:

- They return to the same seat.
- Their Table Stack is preserved.
- They may resume during the current hand if they have not already folded.
- If auto-fold already occurred, they must wait for the next hand.

## Timeout Expiration

If the player does not reconnect before the timeout expires:

- They are removed from the table.
- Their remaining Table Stack is returned to their Wallet.
- Their seat becomes available.
- Chips already committed to an active pot remain in the pot.
- Only uncommitted remaining stack is returned.

---

# 30. SEATED TABLE INTERFACE

The seated game view displays:

## Player Information

- Player name
- Avatar
- Seat position
- Connection status
- Folded status
- All-in status
- Remaining Table Stack

## Local Player Information

- Private tiles
- Current Table Stack
- Amount committed this round
- Total amount committed this hand
- Available actions
- Word-building timer when active

## Table Information

- Pot Size
- Side Pots
- Current Bet
- Community Tiles
- Current phase
- Active player
- Dealer-position marker
- Dictionary
- Table Buy-In

Wallet Balance may be shown in a secondary location, but it must not appear as part of the available betting balance.

---

# 31. BETTING CONTROL REQUIREMENTS

## Fold

- Ends the player's participation in the current hand.
- Chips already committed remain in the pot.
- Cannot be undone.

## Check

- Available only when the player does not need to call a bet.
- Passes action without adding chips.

## Bet

- Available when no Current Bet exists.
- Creates the Current Bet.

## Call

- Matches the Current Bet.
- Uses only the Table Stack.

## Raise

- Increases the Current Bet.
- Cannot exceed the player's remaining Table Stack.
- Must meet the minimum raise unless the player is going all in.

## All In

- Commits the player's exact remaining Table Stack.
- May be less than a full call or minimum raise.
- May create side pots.

---

# 32. GAMEPLAY EDGE CASES

## Wallet Below Buy-In

- Join is disabled.
- Re-Buy is disabled.
- The player may browse or join a cheaper table.

## Player Has Zero Stack During a Hand

A player who is all in remains eligible for the appropriate pot.

They do not take further betting actions.

## Player Folds After Betting

Previously committed chips remain in the pot.

## Player Leaves During a Hand

Voluntary leaving should normally be disabled until the hand ends.

If the client closes or disconnects:

- Disconnect rules apply.
- The player is auto-folded.
- Committed chips remain in the pot.

## Server Failure During Buy-In

The buy-in transaction must be atomic.

The player must never lose Wallet Coins without receiving a seat and Table Stack.

## Server Failure During Cash-Out

The cash-out transaction must be idempotent.

Repeating the operation must not duplicate Wallet Coins.

## Table Closes

If the table is closed:

- Active hands should finish when possible.
- Remaining Table Stacks are returned to Wallets.
- Committed pots are resolved or safely refunded according to server recovery rules.

---

# 33. ACCEPTANCE CRITERIA

## Wallet and Stack

- Wallet Balance and Table Stack are stored separately.
- Wallet Balance cannot be used directly for betting.
- Every bet uses only the Table Stack.
- Winning chips are added to the Table Stack.
- Table Stacks may grow beyond the original buy-in.
- Leaving returns the remaining Table Stack to the Wallet.

## Table Buy-In

- Every table displays one fixed buy-in amount.
- Every player pays the exact same buy-in.
- No buy-in range is shown.
- No buy-in slider is shown.
- Players cannot choose a custom amount.
- Join is disabled when Wallet Balance is below the buy-in.
- Joining deducts the exact buy-in from the Wallet.
- Joining creates a Table Stack equal to the buy-in.
- A confirmation modal appears before every table entry.

## Betting

- There are no blinds.
- There are no forced opening bets.
- Private tiles are dealt before betting begins.
- Players may check when no bet exists.
- Raise controls cannot exceed the Table Stack.
- All In commits the exact remaining Table Stack.
- Side pots are created when required.

## Re-Buy

- Re-Buy is available only when the Table Stack reaches zero.
- Re-Buy is available only between hands.
- Re-Buy always uses the table's fixed buy-in.
- Re-Buy does not have a slider.
- Re-Buy is disabled when the Wallet Balance is below the buy-in.

## Disconnects

- Disconnected players are automatically folded when action reaches them.
- Their seat and remaining stack are preserved during the reconnect timeout.
- Reconnecting before timeout restores the player to their seat.
- Timeout removal returns the remaining uncommitted Table Stack to the Wallet.
- Chips already committed to a pot are not refunded.

## Scoring

- Letter values match the defined scoring table.
- Tile multipliers affect only the letters on the tile.
- Using all seven physical tiles awards a 10-point bonus.
- Two-letter tiles count as one physical tile.
- Two-letter sequence tiles cannot be split.
- Invalid words score zero.
- Timeout submissions score zero.
- No timer bonus is awarded.
- Ties follow the defined tie-breaker order.

---

# 34. COMPLETE HAND SUMMARY

1. Players sit at a table using the same fixed buy-in.
2. The buy-in moves from each player's Wallet into their Table Stack.
3. The dealer gives every active player two private tiles.
4. Players see their private tiles.
5. The first betting round begins with no forced bet.
6. Three community tiles are revealed.
7. A second betting round occurs.
8. One Turn tile is revealed.
9. A third betting round occurs.
10. One River tile is revealed.
11. The final betting round occurs.
12. Remaining players receive 60 seconds to build a word.
13. Submitted words are validated and scored.
14. The highest-scoring valid word wins the appropriate pot.
15. Winnings are added to the winner's Table Stack.
16. Players with zero chips may re-buy between hands.
17. Players may leave between hands and return their remaining Table Stack to their Wallet.
18. The dealer-position marker rotates and the next hand begins.
