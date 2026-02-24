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
    const convexUrl = import.meta.env.VITE_CONVEX_URL
    if (!convexUrl) {
      return false
    }

    const response = await fetch(`${convexUrl}/validateWord?word=${encodeURIComponent(word)}`)
    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return !!data?.valid
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
    const convexUrl = import.meta.env.VITE_CONVEX_URL
    if (!convexUrl) {
      return null
    }

    const response = await fetch(`${convexUrl}/validateWord?word=${encodeURIComponent(word)}`)
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data?.definition ?? null
  } catch (error) {
    console.error('Error getting word definition:', error)
    return null
  }
}
