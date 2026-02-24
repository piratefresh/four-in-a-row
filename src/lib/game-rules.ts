/**
 * Condensed Game Rules for Four-in-a-Row Word Game
 *
 * This is a multiplayer word game combining elements of poker and Scrabble.
 */

export const GAME_RULES = {
  overview: 'A multiplayer word game where players use letter tiles from their hand and shared community tiles to build words.',

  gameplay: {
    initialHand: 'Each player receives letter tiles at the start',
    communityTiles: 'Shared tiles are revealed in stages (flop, turn, river) similar to poker',
    stages: ['preflop', 'flop', 'turn', 'river', 'showdown'],
    revealSchedule: {
      preflop: '2 community tiles revealed',
      flop: '1 additional tile',
      turn: '1 additional tile',
      river: '1 additional tile',
      showdown: 'Final scoring'
    }
  },

  wordBuilding: {
    sources: 'Players can use tiles from their hand AND community tiles',
    uniqueness: 'Each tile can only be used once per word',
    validation: 'Words must be valid English dictionary words',
    scoring: 'Points are based on letter values (similar to Scrabble)',
  },

  turns: {
    order: 'Players take turns in order',
    actions: ['Submit a word', 'Skip round (lose points)'],
    skipPenalty: 'Skipping costs points and folds the player for that round'
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
- Players have private letter tiles in their hand
- Community tiles are revealed in stages (preflop, flop, turn, river, showdown)
- Players build words using tiles from their hand AND community tiles
- Each tile can only be used once per word
- Words must be valid English dictionary words
- Points are based on letter values (numbers indicate point value)
- Players can either submit a word or skip/fold (losing points)
- Goal: Build the highest-scoring valid word to win the round`
}
