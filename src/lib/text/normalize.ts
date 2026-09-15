/**
 * Normalization rules for gameplay (see README "Normalization rules"):
 *  1. strip diacritics (São Tomé -> Sao Tome)
 *  2. uppercase
 *  3. remove everything that is not A-Z (spaces, hyphens, apostrophes, dots…)
 *
 * The player guesses letters only, so "Costa Rica" and "Timor-Leste" become
 * COSTARICA and TIMORLESTE.
 */
export function normalizeCountryName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

/** Normalizes raw keyboard input the same way, so it can be compared to answers. */
export function normalizeInput(input: string): string {
  return normalizeCountryName(input)
}

export function isLetter(key: string): boolean {
  return /^[a-zA-Z]$/.test(key)
}
