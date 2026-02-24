import { generateText } from 'ai'
import { openrouter, freeModel } from './openrouter'
import { getGameRulesPrompt } from './game-rules'

type Tile = {
  letter: string
  baseValue: number
}

type AIWordChoice = {
  word: string
  reasoning: string
}

/**
 * Generate text using OpenRouter's free model
 * @param prompt - The prompt to send to the AI
 * @returns Promise<string> - The generated text
 */
async function generateAIText(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openrouter(freeModel),
      prompt,
    })
    return text
  } catch (error) {
    console.error('Error generating AI text:', error)
    throw error
  }
}

/**
 * AI Player: Choose the best word from available letters
 * @param handTiles - Tiles in the player's hand
 * @param communityTiles - Tiles available in the community
 * @returns Promise<AIWordChoice> - The chosen word and reasoning
 */
export async function aiChooseWord(
  handTiles: Tile[],
  communityTiles: Tile[],
): Promise<AIWordChoice> {
  const handLetters = handTiles.map((t) => `${t.letter}(${t.baseValue})`).join(', ')
  const communityLetters = communityTiles.map((t) => `${t.letter}(${t.baseValue})`).join(', ')
  const gameRules = getGameRulesPrompt()

  const prompt = `${gameRules}

Your hand: ${handLetters}
Community tiles (shared): ${communityLetters}

Task: Choose the best word using available tiles.
- Use tiles from both your hand and community tiles
- Each tile can only be used once
- Try to make the longest valid English word with the highest point value
- Numbers in parentheses are the point values

Respond in this exact format:
WORD: [your chosen word in uppercase]
REASONING: [brief explanation of why this is the best choice]

Example:
WORD: EXAMPLE
REASONING: Uses 7 letters for maximum points and is a common valid word`

  try {
    const text = await generateAIText(prompt)

    const wordMatch = text.match(/WORD:\s*([A-Z]+)/i)
    const reasoningMatch = text.match(/REASONING:\s*(.+)/i)

    const word = wordMatch?.[1]?.toUpperCase() || ''
    const reasoning = reasoningMatch?.[1]?.trim() || 'AI could not provide reasoning'

    return { word, reasoning }
  } catch (error) {
    console.error('Error getting AI word choice:', error)
    return { word: '', reasoning: 'Error occurred' }
  }
}

/**
 * AI Player: Quick word suggestion (simpler, faster)
 * @param letters - All available letters
 * @returns Promise<string> - A single word suggestion
 */
export async function aiQuickWord(letters: string[]): Promise<string> {
  const prompt = `Make one valid English word using these letters (each letter once): ${letters.join(', ')}
Respond with ONLY the word, nothing else.`

  try {
    const text = await generateAIText(prompt)
    return text.trim().toUpperCase()
  } catch (error) {
    console.error('Error getting AI quick word:', error)
    return ''
  }
}
