/**
 * Public, human-readable country slug used in URLs such as
 * `/results/costa-rica`. Deterministic and independent from the gameplay
 * normalization in lib/text/normalize.ts (COSTARICA), which is a board format
 * and must never leak into a URL.
 *
 * Rules:
 *  1. strip diacritics (São Tomé -> Sao Tome)
 *  2. lowercase
 *  3. collapse every run of non-alphanumerics into a single hyphen
 *  4. trim leading/trailing hyphens
 *
 * This is also what `Country.id` is built from (see data/countries.ts), so a
 * country's id and its public results slug are one and the same value.
 */
export function toCountrySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Shape check for a slug that arrived from a URL: lowercase, hyphen-separated. */
export function isWellFormedCountrySlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}
