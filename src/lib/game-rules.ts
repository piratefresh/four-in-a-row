/**
 * Condensed Game Rules for Four-in-a-Row Word Game
 *
 * This is a multiplayer word game combining elements of poker and Scrabble.
 */

export const GAME_RULES = {
  overview: 'A multiplayer word game where players use letter tiles from their hand and shared community tiles to build words.',

  gameplay: {
    initialHand: 'Small and big blinds post, then each player receives 2 private tiles',
    communityTiles: 'Shared tiles are revealed in stages (flop, turn, river) similar to poker',
    stages: ['preflop', 'flop', 'turn', 'river', 'reveal', 'showdown'],
    revealSchedule: {
      preflop: '0 community tiles revealed',
      flop: '3 community tiles revealed',
      turn: '1 additional tile',
      river: '1 additional tile',
      final: 'No additional tiles; river already reveals 5 total',
      showdown: '60 seconds to build the best word'
    }
  },

  wordBuilding: {
    sources: 'Players can use private tiles, community tiles, or any mix of both',
    uniqueness: 'Each tile can only be used once per word',
    validation: 'Words must be valid English dictionary words',
    scoring: 'Points are based on letter values (similar to Scrabble)',
  },

  turns: {
    order: 'Players take turns in order',
    actions: ['Fold', 'Check', 'Call', 'Raise', 'Submit a word during reveal'],
    skipPenalty: 'Folding exits the hand and forfeits bets already made'
  },

  winning: {
    objective: 'Build the highest-scoring valid word',
    elimination: 'Players who skip/fold are out for the round',
    lastPlayer: 'Game ends when only one player remains or showdown is reached'
  }
} as const

/**
 * Get a condensed prompt string for AI context
 */
export function getGameRulesPrompt(): string {
  return `Game Rules Summary:
- Multiplayer word game combining poker-style betting with Scrabble-style word building
- Blinds post before each hand, then every player gets 2 private tiles
- Pre-flop betting uses only private-tile information
- Community tiles reveal 3 on the flop, 1 on the turn, and 1 on the river
- Players build words using private tiles, community tiles, or any mix
- Each tile can only be used once per word
- Words must be valid English dictionary words
- Points are based on letter values (numbers indicate point value)
- Reveal gives players 60 seconds to submit a 2-7 letter word
- Goal: Build the highest-scoring valid word to win the round`
}
