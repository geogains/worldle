/**
 * Centralized branding. The product name is provisional, so every user-facing
 * brand string lives here. index.html placeholders (%PRODUCT_NAME% etc.) are
 * filled from this file by the small plugin in vite.config.ts.
 *
 * NOTE: this file is imported by vite.config.ts (Node) as well as the app, so
 * keep it free of browser/React imports.
 */
export const branding = {
  /** Full product name shown in the header, share text and metadata. */
  name: 'Daily Worldle',
  /** Short name used where space is tight (e.g. "Next Daily Worldle"). */
  shortName: 'Daily Worldle',
  /** <title> for the document. */
  documentTitle: 'Daily Worldle – Guess the Country',
  /** Meta description / social description. */
  description:
    "Guess today's mystery country in six tries. A new country word puzzle every day.",
  /** Canonical site URL. Update when the production domain is known. */
  siteUrl: 'https://daily-worldle.vercel.app',
  /** Browser theme colour (light mode). */
  themeColor: '#38bdf8',
  /** localStorage namespace. Changing this abandons all existing player data. */
  storageNamespace: 'daily-worldle',
} as const

export type Branding = typeof branding
