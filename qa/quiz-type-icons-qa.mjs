// Quiz Type card icon QA: verifies all 6 PNG icons (Flags/Capitals/
// Currencies/Languages/Facts/Mixed) load correctly, sizing is consistent,
// selected/unselected states, no missing requests, no layout
// shift/stretch/clip — across desktop/tablet/mobile and light/dark.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme = 'light', viewport = { width: 360, height: 900 }) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  const failedRequests = []
  p.on('requestfailed', (req) => failedRequests.push(req.url()))
  p.on('response', (res) => {
    if (res.status() >= 400 && /\/icons\//.test(res.url())) failedRequests.push(`${res.status()} ${res.url()}`)
  })
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p, failedRequests }
}

async function runSection(tag, fn) {
  try {
    await fn()
  } catch (err) {
    check(`${tag}: section completed without throwing`, false, err?.message ?? String(err))
  }
}

const MAP = {
  Flags: 'flags',
  Capitals: 'capitals',
  Currencies: 'currencies',
  Languages: 'languages',
  Facts: 'facts',
  Mixed: 'mixed',
}

await runSection('All 6 icons load, no missing-image requests', async () => {
  const { context, p, failedRequests } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(200)
  for (const [label, file] of Object.entries(MAP)) {
    const option = p.getByRole('radio', { name: label })
    const img = option.locator(`img[src="/icons/${file}.png"]`)
    check(`${label}: icon present`, (await img.count()) === 1)
    const natural = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight, complete: el.complete }))
    check(`${label}: icon actually loaded`, natural.w > 0 && natural.complete, JSON.stringify(natural))
  }
  check('No failed/missing icon requests', failedRequests.length === 0, failedRequests.join(', '))
  await context.close()
})

await runSection('Icon display size is consistent (28x28) across all 6 icons', async () => {
  const { context, p } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(200)
  const sizes = await p.evaluate(() =>
    Array.from(document.querySelectorAll('.quiz-option__icon-img')).map((el) => {
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }),
  )
  check('Exactly 6 icons rendered', sizes.length === 6, JSON.stringify(sizes))
  check('All 6 render at the same size (no stretching to fill differently)', sizes.every((s) => s.w === sizes[0].w && s.h === sizes[0].h), JSON.stringify(sizes))
  await context.close()
})

await runSection('object-fit: contain — no stretching/cropping despite differing artwork proportions', async () => {
  const { context, p } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(200)
  const objectFits = await p.evaluate(() =>
    Array.from(document.querySelectorAll('.quiz-option__icon-img')).map((el) => getComputedStyle(el).objectFit),
  )
  check('All 6 icons use object-fit: contain', objectFits.length === 6 && objectFits.every((f) => f === 'contain'), JSON.stringify(objectFits))
  await context.close()
})

await runSection('Selected/unselected state: selecting Capitals updates the selected card, icon unaffected', async () => {
  const { context, p } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(200)
  const capitals = p.getByRole('radio', { name: 'Capitals' })
  const flags = p.getByRole('radio', { name: 'Flags' })
  await capitals.click()
  check('Capitals becomes selected (aria-checked)', (await capitals.getAttribute('aria-checked')) === 'true')
  check('Capitals has the selected class', await capitals.evaluate((el) => el.classList.contains('quiz-option--selected')))
  check('Capitals icon still present after selecting', (await capitals.locator('img[src="/icons/capitals.png"]').count()) === 1)
  check('Flags is not selected', (await flags.getAttribute('aria-checked')) === 'false')
  check('Flags icon still present (unaffected by Capitals selection)', (await flags.locator('img[src="/icons/flags.png"]').count()) === 1)
  const facts = p.getByRole('radio', { name: 'Facts' })
  await facts.click()
  check('Facts becomes selected (aria-checked)', (await facts.getAttribute('aria-checked')) === 'true')
  check('Facts icon still present after selecting', (await facts.locator('img[src="/icons/facts.png"]').count()) === 1)
  check('Capitals is no longer selected', (await capitals.getAttribute('aria-checked')) === 'false')
  await context.close()
})

await runSection('No layout shift: all 6 Quiz Type tiles remain the same size after the icon swap', async () => {
  const { context, p } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(200)
  const sizes = await p.evaluate(() =>
    Array.from(document.querySelectorAll('.quiz-option--tile')).map((el) => {
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }),
  )
  check('6 Quiz Type tiles present', sizes.length === 6, JSON.stringify(sizes))
  check('All 6 tiles share the same height (icon swap did not grow any card)', sizes.every((s) => s.h === sizes[0].h), JSON.stringify(sizes))
  await context.close()
})

// ------------------------------------------------------------------
// Visual QA — desktop, tablet, mobile, light/dark.
// ------------------------------------------------------------------
const VIEWPORTS = [
  { w: 1200, h: 900, label: 'desktop' },
  { w: 1000, h: 900, label: 'tablet' },
  { w: 360, h: 900, label: 'mobile' },
]
for (const { w, h, label } of VIEWPORTS) {
  for (const theme of ['light', 'dark']) {
    await runSection(`Visual — ${label} ${theme}`, async () => {
      const { context, p } = await newCtx(theme, { width: w, height: h })
      await p.goto(`${BASE}/quiz`)
      await p.waitForTimeout(200)
      const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
      check(`${label} ${theme}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
      // Also select Capitals so the screenshot shows one selected + one unselected state.
      await p.getByRole('radio', { name: 'Capitals' }).click()
      await p.waitForTimeout(300) // let the .quiz-option--selected border-color transition finish before capturing
      await p.screenshot({ path: `${OUT}/quiz-type-icons-${label}-${theme}.png` })
      await context.close()
    })
  }
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
