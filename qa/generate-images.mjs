// Generates public/og.png (1200x630) and public/apple-touch-icon.png (180x180)
// from small inline HTML templates. Run: node qa/generate-images.mjs
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

const tile = (l, c) => `<div style="width:92px;height:92px;border-radius:6px;background:${c};color:#fff;font:800 52px/92px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-align:center">${l}</div>`
const row = (letters, colors) => `<div style="display:flex;gap:8px">${letters.split('').map((l, i) => tile(l, colors[i])).join('')}</div>`
const G = '#4a9350', Y = '#b8951f', X = '#6e7276'

await page.setContent(`<body style="margin:0;background:#f7f6f2;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;gap:72px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="display:flex;flex-direction:column;gap:8px">
    ${row('SPAIN', [G, X, Y, X, X])}
    ${row('KENYA', [X, X, X, X, G])}
    ${row('ITALY', [X, X, Y, X, X])}
    ${row('SAMOA', [G, G, G, G, G])}
  </div>
  <div style="max-width:520px">
    <div style="font-size:72px;font-weight:800;letter-spacing:-0.02em;color:#1b1b1c">Daily Worldle</div>
    <div style="margin-top:12px;font-size:30px;color:#6b6b6d">Guess today's mystery country in six tries. A new puzzle every day.</div>
  </div>
</body>`)
writeFileSync('public/og.png', await page.screenshot({ type: 'png' }))

await page.setViewportSize({ width: 180, height: 180 })
await page.setContent(`<body style="margin:0;width:180px;height:180px;background:#1b1b1c;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:26px;box-sizing:border-box">
  <div style="border-radius:10px;background:${G}"></div><div style="border-radius:10px;background:${Y}"></div>
  <div style="border-radius:10px;background:${X}"></div><div style="border-radius:10px;background:${G}"></div>
</body>`)
writeFileSync('public/apple-touch-icon.png', await page.screenshot({ type: 'png' }))
await browser.close()
console.log('wrote public/og.png and public/apple-touch-icon.png')
