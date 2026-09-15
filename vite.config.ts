/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { branding } from './src/config/branding.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // Injects centralized branding strings into index.html so renaming the
      // product only requires editing src/config/branding.ts.
      name: 'branding-html',
      transformIndexHtml(html) {
        return html
          .replaceAll('%PRODUCT_NAME%', branding.name)
          .replaceAll('%PRODUCT_TITLE%', branding.documentTitle)
          .replaceAll('%PRODUCT_DESCRIPTION%', branding.description)
          .replaceAll('%PRODUCT_URL%', branding.siteUrl)
          .replaceAll('%THEME_COLOR%', branding.themeColor)
      },
    },
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
})
