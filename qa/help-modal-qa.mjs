// How to Play modal QA: 9-tile examples, formatting note, responsive fit
// (no horizontal overflow) at every required width, in both themes.
import { chromium } from 'playwright'
const OUT = new URL('./screenshots', import.meta.url).pathname
const b = await chromium.launch()
const errors = []
const seed = (theme) => ({ 'daily-worldle:v1:prefs': JSON.stringify({ theme, hasSeenHelp: true }) })

async function ctx(opts = {}, storage) {
  const c = await b.newContext({ deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  if (storage) await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (!localStorage.getItem(k)) localStorage.setItem(k, v) }, storage)
  return { c, p }
}

async function openHelpAndInspect(p, tag, shotName) {
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="How to play"]')
  await p.waitForTimeout(350)
  const info = await p.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    const rows = [...dialog.querySelectorAll('[role="row"]')]
    const tileCounts = rows.map((r) => r.querySelectorAll('.tile').length)
    const offenders = [...dialog.querySelectorAll('*')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => ({ tag: el.tagName, cls: el.className, sw: el.scrollWidth, cw: el.clientWidth }))
    const tileRowOverflow = [...dialog.querySelectorAll('.help-tile-row')].map((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, over: el.scrollWidth > el.clientWidth + 1 }))
    const overflowing = offenders.length > 0
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      tileCounts,
      anyElementOverflow: overflowing,
      offenders,
      tileRowOverflow,
      formattingNoteText: dialog.querySelector('h4')?.parentElement?.textContent?.includes('Country name formatting')
        ? [...dialog.querySelectorAll('p')].find((p) => p.textContent.includes('COSTARICA'))?.textContent
        : null,
      exampleWords: rows.map((r) => [...r.querySelectorAll('.tile')].map((t) => t.textContent).join('')),
    }
  })
  console.log(`${tag}:`, JSON.stringify(info))
  await p.screenshot({ path: `${OUT}/${shotName}.png`, fullPage: false })
}

for (const w of [320, 390]) {
  const { c, p } = await ctx({ viewport: { width: w, height: 900 } }, seed('light'))
  await openHelpAndInspect(p, `light ${w}px`, `90-help-light-${w}`)
  await c.close()
}
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 900 } }, seed('light'))
  await openHelpAndInspect(p, 'light desktop', '91-help-light-desktop')
  await c.close()
}
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 900 }, colorScheme: 'dark' }, seed('dark'))
  await openHelpAndInspect(p, 'dark 390px', '92-help-dark-390')
  await c.close()
}
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' }, seed('dark'))
  await openHelpAndInspect(p, 'dark desktop', '93-help-dark-desktop')
  await c.close()
}
// also verify 375 and 430 for extra coverage of the required list
for (const w of [375, 430]) {
  const { c, p } = await ctx({ viewport: { width: w, height: 900 } }, seed('light'))
  await openHelpAndInspect(p, `light ${w}px`, `94-help-light-${w}`)
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
