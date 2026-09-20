// Country results pages: Practice Tanzania completion -> /results/tanzania,
// card open/close/reopen, Play again, direct navigation, daily Results
// button, refresh restoration, responsive widths, themes, a11y, reduced motion.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const errors = []
const failures = []
const KEY = (n) => `daily-worldle:v1:${n}`
const prefs = (theme) => ({ [KEY('prefs')]: JSON.stringify({ theme, hasSeenHelp: true }) })
const practiceTanzania = (extra = {}) => ({
  [KEY('practice')]: JSON.stringify({
    answerId: 'tanzania',
    previousAnswerId: null,
    guesses: [],
    current: '',
    status: 'active',
    updatedAt: 1,
    ...extra,
  }),
})

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}
async function ctx(opts = {}, storage = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  // Seed once per context: on reload the init script runs again and must not
  // overwrite state the app has since written (e.g. the completed game).
  await p.addInitScript((s) => {
    if (sessionStorage.getItem('qa-seeded')) return
    sessionStorage.setItem('qa-seeded', '1')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
  }, storage)
  return { c, p }
}
async function type(p, word) { for (const ch of word) await p.keyboard.press(ch) }
async function shot(p, name) { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }
async function noHorizontalOverflow(p, name) {
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${name}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
}
const dialog = (p) => p.getByRole('dialog', { name: /tanzania results/i })

// A. Practice Tanzania: complete, watch the animation finish, land on /results/tanzania.
{
  const { c, p } = await ctx({}, { ...prefs('light'), ...practiceTanzania() })
  await p.goto(BASE + '/practice')
  await p.waitForTimeout(300)
  await type(p, 'ZIMBABWE'); await p.keyboard.press('Enter'); await p.waitForTimeout(3300)
  await type(p, 'MALAYSIA'); await p.keyboard.press('Enter'); await p.waitForTimeout(3300)
  await type(p, 'TANZANIA'); await p.keyboard.press('Enter')
  await p.waitForTimeout(2700) // reveal done, bounce in progress — must still be on /practice
  check('still on /practice during win bounce', p.url().endsWith('/practice'), p.url())
  await shot(p, '70-practice-win-bounce')
  await p.waitForTimeout(2200)
  check('URL becomes /results/tanzania', p.url().endsWith('/results/tanzania'), p.url())
  await p.waitForTimeout(400)
  const d = dialog(p)
  check('Tanzania results dialog open', await d.isVisible())
  const flag = d.getByRole('img', { name: 'Flag of Tanzania' })
  check('flag renders', await flag.isVisible())
  check('flag src is /flags/TZ.png', (await flag.getAttribute('src')) === '/flags/TZ.png')
  check('flag loaded (naturalWidth > 0)', await flag.evaluate((img) => img.complete && img.naturalWidth > 0))
  const box = await flag.boundingBox()
  check('flag not enormous', box && box.width <= 140, `${box?.width}px wide`)
  // Tanzania is the populated test case for the country-data layer: real
  // facts render, not "Coming soon" placeholders.
  check('real facts render, no placeholders', (await d.getByText('Coming soon', { exact: true }).count()) === 0)
  check('capital renders', await d.getByText('Dodoma').isVisible())
  check('population renders as the plain formatted value only', await d.getByText('69 million', { exact: true }).isVisible())
  check('population year is never rendered', (await d.getByText(/estimate as of|2026/i).count()) === 0)
  check('continent renders', await d.getByText('Africa', { exact: true }).isVisible())
  check('currency renders name+code+symbol', await d.getByText('Tanzanian Shilling (TZS) · TSh').isVisible())
  check('languages render (official only)', await d.getByText('Swahili, English').isVisible())
  check('fun fact renders', await d.getByText(/Mount Kilimanjaro/).isVisible())
  check('result summary', await d.getByText('Solved in 3/6').isVisible())
  check('title updated', (await p.title()) === 'Daily Worldle — Tanzania Results', await p.title())
  const rows = await p.locator('[role=grid] [role=row]').allInnerTexts()
  check('completed board beneath card (3 rows)', rows[0].replace(/\s/g, '') === 'ZIMBABWE' && rows[2].replace(/\s/g, '') === 'TANZANIA', JSON.stringify(rows.map((r) => r.replace(/\s/g, ''))))
  check('keyboard reflects completed game', (await p.locator('[data-key="T"].key--correct').count()) === 1)
  await noHorizontalOverflow(p, 'results 390 light')
  await shot(p, '71-results-card-390-light')

  // Close via X: URL unchanged, board visible, Results button reopens.
  await d.getByRole('button', { name: 'Close' }).click()
  await p.waitForTimeout(300)
  check('card closed', (await p.getByRole('dialog').count()) === 0)
  check('URL still /results/tanzania after close', p.url().endsWith('/results/tanzania'), p.url())
  check('completed board still visible', await p.locator('[role=grid]').isVisible())
  await shot(p, '72-results-card-closed-390')
  const results = p.getByRole('button', { name: 'Results', exact: true })
  check('Results button present', await results.isVisible())
  await results.click()
  await p.waitForTimeout(350)
  check('Results reopens Tanzania card', await dialog(p).isVisible())
  check('Results does not open Statistics', (await p.getByRole('dialog', { name: 'Statistics' }).count()) === 0)
  check('URL unchanged after reopen', p.url().endsWith('/results/tanzania'))

  // Refresh: restored from storage.
  await p.reload(); await p.waitForTimeout(500)
  check('refresh keeps URL', p.url().endsWith('/results/tanzania'))
  check('refresh restores card', await dialog(p).isVisible())
  const rows2 = await p.locator('[role=grid] [role=row]').allInnerTexts()
  check('refresh restores completed board', rows2[2].replace(/\s/g, '') === 'TANZANIA')
  await shot(p, '73-results-after-refresh')

  // Share reuses the spoiler-free share text.
  await c.grantPermissions(['clipboard-read', 'clipboard-write'])
  await dialog(p).getByRole('button', { name: /share/i }).click()
  await p.waitForTimeout(300)
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '')
  check('share text is spoiler-free practice grid', clip.startsWith('Daily Worldle Practice 3/6') && !clip.includes('TANZANIA'), JSON.stringify(clip))

  // Play again -> new practice game.
  await dialog(p).getByRole('button', { name: 'Play again' }).click()
  await p.waitForTimeout(400)
  check('Play again goes to /practice', p.url().endsWith('/practice'), p.url())
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('daily-worldle:v1:practice')))
  check('new practice game is active and different', saved.status === 'active' && saved.answerId !== 'tanzania' && saved.previousAnswerId === 'tanzania', JSON.stringify(saved))
  check('no dialog on new practice game', (await p.getByRole('dialog').count()) === 0)
  await type(p, 'AB')
  const typed = await p.evaluate(() => JSON.parse(localStorage.getItem('daily-worldle:v1:practice')).current)
  check('new practice game accepts input', typed === 'AB', typed)
  await shot(p, '74-play-again-new-practice')
  await c.close()
}

// B. Direct navigation with no completed game: standalone page, no fake result.
{
  const { c, p } = await ctx({}, prefs('light'))
  await p.goto(BASE + '/results/tanzania'); await p.waitForTimeout(400)
  check('direct: no dialog', (await p.getByRole('dialog').count()) === 0)
  check('direct: no board', (await p.locator('[role=grid]').count()) === 0)
  check('direct: heading', await p.getByRole('heading', { level: 1, name: 'Tanzania' }).isVisible())
  check('direct: flag', await p.getByRole('img', { name: 'Flag of Tanzania' }).isVisible())
  check('direct: no performance copy', (await p.getByText(/solved in|better luck/i).count()) === 0)
  await noHorizontalOverflow(p, 'direct 390')
  await shot(p, '75-direct-standalone-390')
  await p.goto(BASE + '/results/not-a-country'); await p.waitForTimeout(300)
  check('invalid slug: graceful not-found', await p.getByText(/isn't in Daily Worldle/i).isVisible())
  await shot(p, '76-results-invalid-slug')
  await c.close()
}

// C. Daily: completed today's puzzle (Tanzania), Results button -> country page with source daily.
{
  const { c, p } = await ctx({}, {
    ...prefs('light'),
    [KEY('daily')]: JSON.stringify({ puzzleNumber: 1, guesses: ['MALAYSIA', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 }),
  })
  await p.clock.install({ time: new Date('2026-09-15T12:00:00Z') })
  await p.goto(BASE + '/'); await p.waitForTimeout(400)
  await p.getByRole('button', { name: 'Results', exact: true }).click()
  await p.waitForTimeout(400)
  check('daily Results -> /results/tanzania', p.url().endsWith('/results/tanzania'), p.url())
  const d = dialog(p)
  check('daily card shows Daily Worldle #1', await d.getByText('Daily Worldle #1').first().isVisible())
  check('daily card summary', await d.getByText('Solved in 2/6').isVisible())
  check('daily: statistics not opened', (await p.getByRole('dialog', { name: 'Statistics' }).count()) === 0)
  check('daily: "View statistics" is no longer on the result card', (await d.getByRole('button', { name: /view statistics/i }).count()) === 0)
  await shot(p, '77-daily-results-card')
  // Header stats control still works independently — the feature itself is
  // untouched, only the post-game result-card shortcut to it was removed.
  // Close the result card first: it's a near-full-viewport modal and would
  // otherwise intercept the click on the header control behind it.
  await d.getByRole('button', { name: 'Close' }).click(); await p.waitForTimeout(300)
  await p.getByRole('button', { name: 'Statistics', exact: true }).click(); await p.waitForTimeout(350)
  check('header Statistics control opens Statistics', await p.getByRole('dialog', { name: 'Statistics' }).isVisible())
  await c.close()
}

// D. Responsive + themes (completed practice restored).
for (const theme of ['light', 'dark']) {
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [1280, 800]]) {
    const { c, p } = await ctx({ viewport: { width: w, height: h }, hasTouch: w < 700 }, {
      ...prefs(theme),
      ...practiceTanzania({ guesses: ['ZIMBABWE', 'MALAYSIA', 'ETHIOPIA', 'TANZANIA'], status: 'won' }),
    })
    await p.goto(BASE + '/results/tanzania'); await p.waitForTimeout(500)
    const d = dialog(p)
    check(`${theme} ${w}: card visible`, await d.isVisible())
    await noHorizontalOverflow(p, `${theme} ${w}`)
    const panel = await d.boundingBox()
    check(`${theme} ${w}: card within viewport width`, panel && panel.x >= 0 && panel.x + panel.width <= w + 0.5, JSON.stringify(panel))
    const radius = await d.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius))
    check(`${theme} ${w}: rounded corners visible (radius ${radius}px)`, radius > 0)
    if (w < 640) {
      // Near-full-viewport modal CARD, not an edge-to-edge full-screen page:
      // a small (~8px) backdrop margin stays visible around every side.
      check(`${theme} ${w}: small visible backdrop margin on all sides (not edge-to-edge)`,
        panel.x > 2 && panel.x < 14 && panel.y > 2 && panel.y < 14 && (w - (panel.x + panel.width)) > 2 && (h - (panel.y + panel.height)) > 2,
        JSON.stringify({ panel, w, h }))
      check(`${theme} ${w}: card occupies nearly the full viewport (width)`, panel.width >= w - 20, `${panel.width}px of ${w}px`)
      const fits = await d.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)
      // Section 10: 375x667/390x844/430x932 must fit with no scrolling;
      // 320x568 is below that documented floor and may need the
      // overflow-y:auto fallback in .modal-panel--result (index.css).
      if ([375, 390, 430].includes(w)) check(`${theme} ${w}: full result fits without vertical scrolling`, fits)
    } else {
      // Classic centered popup: constrained width, real backdrop margin,
      // and NOT stretched to near-full viewport height (content-sized).
      check(`${theme} ${w}: desktop modal is constrained width, not full viewport`, panel.width <= 640 && panel.width >= 400, `${panel.width}px`)
      check(`${theme} ${w}: desktop modal centered with real backdrop margin`, panel.x > 100 && (w - (panel.x + panel.width)) > 100, JSON.stringify(panel))
      check(`${theme} ${w}: desktop modal not stretched to near-full viewport height`, panel.height < h - 80, `${panel.height}px of ${h}px`)
    }
    check(`${theme} ${w}: "Back to today's puzzle" is gone, no replacement CTA in its place`,
      (await d.getByText("Back to today's puzzle").count()) === 0 && (await d.locator('.country-result__tertiary').count()) === 0)
    const cta = d.getByRole('button', { name: 'Play again' })
    await cta.scrollIntoViewIfNeeded()
    const cb = await cta.boundingBox()
    check(`${theme} ${w}: CTA reachable & >= 44px`, cb && cb.height >= 44 && cb.y + cb.height <= h, JSON.stringify(cb))
    await d.evaluate((el) => el.scrollTo(0, 0))
    const close = await d.getByRole('button', { name: 'Close' }).boundingBox()
    check(`${theme} ${w}: close control within viewport at top`, close && close.y >= 0 && close.x + close.width <= w)
    const cols = await d.locator('.country-result__facts').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    check(`${theme} ${w}: fact grid is two columns`, cols === 2)
    const langSpan = await d.locator('.country-result__fact').last().evaluate((el) => ({ w: el.getBoundingClientRect().width, grid: el.parentElement.getBoundingClientRect().width }))
    check(`${theme} ${w}: languages spans full width`, Math.abs(langSpan.w - langSpan.grid) < 1, JSON.stringify(langSpan))
    const bg = await d.evaluate((el) => getComputedStyle(el).backgroundColor)
    if (theme === 'light') check(`light ${w}: card is solid white`, bg === 'rgb(255, 255, 255)', bg)
    await d.evaluate((el) => el.scrollTo(0, 0))
    await shot(p, `78-results-${theme}-${w}x${h}`)
    if (w === 390) {
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await shot(p, `79-results-closed-${theme}-390`)
    }
    await c.close()
  }
}

// E. Accessibility: dialog semantics, focus trap, Escape, focus restoration, reduced motion.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 800 }, hasTouch: false }, {
    ...prefs('light'),
    ...practiceTanzania({ guesses: ['TANZANIA'], status: 'won' }),
  })
  await p.goto(BASE + '/results/tanzania'); await p.waitForTimeout(500)
  const d = dialog(p)
  check('a11y: role=dialog aria-modal', (await d.getAttribute('aria-modal')) === 'true')
  check('a11y: flag alt text', (await d.getByRole('img').getAttribute('alt')) === 'Flag of Tanzania')
  // Tab cycles within the dialog only.
  const seen = new Set()
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press('Tab')
    const info = await p.evaluate(() => {
      const a = document.activeElement
      return { inDialog: !!a?.closest('[role=dialog]'), label: a?.getAttribute('aria-label') || a?.textContent?.trim() || a?.tagName }
    })
    seen.add(info.label)
    if (!info.inDialog) { check('a11y: focus trapped in dialog', false, `escaped to ${info.label}`); break }
  }
  check('a11y: focus cycled through dialog controls', seen.has('Close') && seen.has('Play again'), [...seen].join(' | '))
  await p.keyboard.press('Shift+Tab')
  check('a11y: shift+tab stays in dialog', await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')))
  check('a11y: visible focus ring', await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'))
  await shot(p, '80-results-desktop-focus')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  check('a11y: Escape closes', (await p.getByRole('dialog').count()) === 0)
  check('a11y: URL unchanged after Escape', p.url().endsWith('/results/tanzania'))
  // Keyboard user: Tab to Results, Enter opens, Escape closes, focus restored to Results.
  await p.getByRole('button', { name: 'Results', exact: true }).focus()
  await p.keyboard.press('Enter'); await p.waitForTimeout(350)
  check('a11y: Enter on Results opens card', await dialog(p).isVisible())
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  const restored = await p.evaluate(() => document.activeElement?.textContent?.trim())
  check('a11y: focus restored to Results button', restored === 'Results', restored)
  // Physical keyboard cannot reach the locked board via the card.
  await p.keyboard.press('Enter'); await p.waitForTimeout(350)
  await type(p, 'ABC')
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('daily-worldle:v1:practice')))
  check('typing while card open changes nothing', st.current === '' && st.guesses.length === 1)
  await c.close()
}
{
  const { c, p } = await ctx({ reducedMotion: 'reduce' }, { ...prefs('dark'), ...practiceTanzania() })
  await p.goto(BASE + '/practice'); await p.waitForTimeout(300)
  await type(p, 'TANZANIA'); await p.keyboard.press('Enter')
  await p.waitForTimeout(2200)
  check('reduced motion: reaches results', p.url().endsWith('/results/tanzania'), p.url())
  const dur = await dialog(p).evaluate((el) => getComputedStyle(el).animationDuration)
  check('reduced motion: card animation ~0', dur === '0.001s', dur)
  await shot(p, '81-results-reduced-motion-dark')
  await c.close()
}

// F. Realistic-length and worst-case content — QA FIXTURES ONLY, injected
// into the rendered DOM. Production data stays placeholders.
const REALISTIC = {
  Capital: 'Dodoma',
  Population: '68.6 million',
  Continent: 'Africa',
  Currency: 'Tanzanian shilling',
  Languages: 'Swahili · English',
  fact: 'Layout fixture: a representative two-to-three line sentence of roughly one hundred and thirty characters used only to check wrapping.',
}
const STRESS = {
  Capital: 'Sri Jayawardenepura Kotte (administrative)',
  Population: '1,441,719,852 (2024 estimate)',
  Continent: 'Asia and Europe (transcontinental)',
  Currency: 'Bosnia and Herzegovina convertible mark',
  Languages: 'Bosnian · Croatian · Serbian · Hungarian',
  fact: 'Stress fixture: this deliberately overlong paragraph exists purely to confirm that a multi-line fun fact wraps naturally inside the card, keeps the coral eyebrow above it, never widens the panel, and still leaves the Play again and Share buttons reachable below it.',
}
async function applyFixture(p, fixture) {
  await p.evaluate((f) => {
    for (const fact of document.querySelectorAll('.country-result__fact')) {
      const label = fact.querySelector('dt').textContent.trim()
      const dd = fact.querySelector('dd')
      if (f[label]) { dd.textContent = f[label]; dd.classList.remove('country-result__fact-value--placeholder') }
    }
    const ff = document.querySelector('.country-result__fun-fact-text')
    ff.textContent = f.fact
    ff.classList.remove('country-result__fact-value--placeholder')
  }, fixture)
}
async function fixtureChecks(p, d, name, w, h) {
  await noHorizontalOverflow(p, name)
  const overflow = await d.evaluate((panel) => {
    const bad = []
    for (const el of panel.querySelectorAll('.country-result__fact, .country-result__fact-value, .country-result__fun-fact, .country-result__fun-fact-text, .country-result__actions'))
      if (el.scrollWidth > el.clientWidth + 1) bad.push(`${el.className}: ${el.scrollWidth}>${el.clientWidth}`)
    const r = panel.getBoundingClientRect()
    return { bad, panelRight: r.right, panelW: r.width, scrollable: panel.scrollHeight > panel.clientHeight }
  })
  check(`${name}: no fact/fun-fact/action overflow`, overflow.bad.length === 0, overflow.bad.join('; '))
  check(`${name}: card within viewport`, overflow.panelRight <= w + 0.5, `${overflow.panelRight} <= ${w}`)
  const factsW = await d.locator('.country-result__facts').evaluate((el) => el.getBoundingClientRect().width)
  const colW = await d.locator('.country-result__fact').first().evaluate((el) => el.getBoundingClientRect().width)
  check(`${name}: columns stay two (col ${Math.round(colW)}px of ${Math.round(factsW)}px)`, colW < factsW * 0.55)
  const lines = await d.locator('.country-result__fun-fact-text').evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))
  console.log(`${name}: fun fact wraps to ${lines} line(s); card scrollable: ${overflow.scrollable}`)
  await d.evaluate((el) => el.scrollTo(0, 0))
  const close = await d.getByRole('button', { name: 'Close' }).boundingBox()
  check(`${name}: close button visible at top`, close && close.y >= 0 && close.y + close.height <= h)
  const cta = d.getByRole('button', { name: 'Play again' })
  await cta.scrollIntoViewIfNeeded()
  const cb = await cta.boundingBox()
  const shareBtn = d.getByRole('button', { name: /share/i })
  await shareBtn.scrollIntoViewIfNeeded()
  const share = await shareBtn.boundingBox()
  check(`${name}: CTAs reachable`, cb && cb.y >= 0 && cb.y + cb.height <= h && share && share.y >= 0 && share.y + share.height <= h + 0.5, JSON.stringify({ cb, share }))
  const locked = await p.evaluate(() => ({ body: getComputedStyle(document.body).overflow, y: window.scrollY }))
  await p.mouse.wheel(0, 400)
  const after = await p.evaluate(() => window.scrollY)
  check(`${name}: background locked`, locked.body === 'hidden' && locked.y === 0 && after === 0)
  await d.evaluate((el) => el.scrollTo(0, 0))
}
const fixtureGame = practiceTanzania({ guesses: ['ZIMBABWE', 'MALAYSIA', 'ETHIOPIA', 'TANZANIA'], status: 'won' })
for (const theme of ['light', 'dark']) {
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [1280, 800]]) {
    const { c, p } = await ctx({ viewport: { width: w, height: h }, hasTouch: w < 700 }, { ...prefs(theme), ...fixtureGame })
    await p.goto(BASE + '/results/tanzania'); await p.waitForTimeout(500)
    const d = dialog(p)
    await applyFixture(p, REALISTIC)
    await fixtureChecks(p, d, `realistic ${theme} ${w}`, w, h)
    await shot(p, `cr-realistic-${theme}-${w}x${h}`)
    await c.close()
  }
}
{
  for (const [w, h] of [[320, 568], [390, 844]]) {
    const { c, p } = await ctx({ viewport: { width: w, height: h } }, { ...prefs('light'), ...fixtureGame })
    await p.goto(BASE + '/results/tanzania'); await p.waitForTimeout(500)
    const d = dialog(p)
    await applyFixture(p, STRESS)
    await fixtureChecks(p, d, `stress light ${w}`, w, h)
    await shot(p, `cr-stress-light-${w}x${h}`)
    if (w === 320) {
      await d.evaluate((el) => el.scrollTo(0, el.scrollHeight))
      await shot(p, `cr-stress-light-320x568-bottom`)
    }
    await c.close()
  }
  // Standalone page with realistic content: no regression.
  const { c, p } = await ctx({ viewport: { width: 320, height: 568 } }, prefs('light'))
  await p.goto(BASE + '/results/tanzania'); await p.waitForTimeout(400)
  check('standalone still renders without a game', (await p.getByRole('dialog').count()) === 0 && (await p.getByRole('heading', { level: 1, name: 'Tanzania' }).isVisible()))
  await applyFixture(p, STRESS)
  await noHorizontalOverflow(p, 'standalone stress 320')
  await shot(p, 'cr-standalone-stress-320')
  await c.close()
}

// G. Real long-content countries (not a DOM-injected fixture): Montenegro
// (10-letter name, near the max playable length; 5 official languages —
// the longest languages list in the dataset) and Congo (long currency name
// "Central African CFA Franc"), each completed via Practice.
const montenegro = { [KEY('practice')]: JSON.stringify({ answerId: 'montenegro', previousAnswerId: null, guesses: ['MONTENEGRO'], current: '', status: 'won', updatedAt: 1 }) }
const congo = { [KEY('practice')]: JSON.stringify({ answerId: 'congo', previousAnswerId: null, guesses: ['CONGO'], current: '', status: 'won', updatedAt: 1 }) }
for (const theme of ['light', 'dark']) {
  for (const [slug, storage, expectLang, expectCurrency] of [
    ['montenegro', montenegro, 'Montenegrin, Serbian, Bosnian, Albanian, Croatian', null],
    ['congo', congo, null, 'Central African CFA Franc (XAF) · FCFA'],
  ]) {
    const { c, p } = await ctx({ viewport: { width: 390, height: 844 } }, { ...prefs(theme), ...storage })
    await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(500)
    const d = p.getByRole('dialog', { name: new RegExp(`${slug} results`, 'i') })
    check(`${theme} ${slug}: results dialog open`, await d.isVisible())
    if (expectLang) check(`${theme} ${slug}: long languages list renders in full`, await d.getByText(expectLang).isVisible())
    if (expectCurrency) check(`${theme} ${slug}: long currency name renders, code+symbol preserved`, await d.getByText(expectCurrency).isVisible())
    await noHorizontalOverflow(p, `${theme} ${slug} 390`)
    const fits = await d.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)
    check(`${theme} ${slug} 390: fits without vertical scrolling`, fits)
    check(`${theme} ${slug}: fact grid stays two columns`, (await d.locator('.country-result__facts').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)) === 2)
    check(`${theme} ${slug}: Play again visible`, await d.getByRole('button', { name: 'Play again' }).isVisible())
    check(`${theme} ${slug}: Share visible`, await d.getByRole('button', { name: /share/i }).isVisible())
    check(`${theme} ${slug}: Close visible`, await d.getByRole('button', { name: 'Close' }).isVisible())
    await shot(p, `cr-longcontent-${slug}-${theme}-390x844`)
    await c.close()
  }
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
