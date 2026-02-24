/**
 * Validates if a word exists using the Free Dictionary API
 * @param word - The word to validate
 * @returns Promise<boolean> - True if word is valid, false otherwise
 */
export async function validateWord(word: string): Promise<boolean> {
  if (!word || word.length < 2) {
    return false
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
    )
    return response.ok
  } catch (error) {
    console.error('Error validating word:', error)
    return false
  }
}

/**
 * Gets the definition of a word using the Free Dictionary API
 * @param word - The word to look up
 * @returns Promise<string | null> - The first definition or null if not found
 */
export async function getWordDefinition(word: string): Promise<string | null> {
  if (!word || word.length < 2) {
    return null
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const firstMeaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition
    return firstMeaning || null
  } catch (error) {
    console.error('Error getting word definition:', error)
    return null
  }
}
