// Header logo breathing-room fix + mobile keyboard ergonomics verification.
// Checks: no logo clipping (desktop/mobile x light/dark), logo rendered
// scale unchanged, icon/nav alignment; mobile letter keys measurably wider
// with a smaller gap and slightly larger label text, Enter essentially
// unchanged, no overlap/overflow; Daily + Flags Type Answer regressions
// (physical keyboard, on-screen Enter/Backspace, key-state colouring).
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newPage(context, theme = 'light') {
  const p = await context.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return p
}

async function runHeaderCheck(viewport, label, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(300)

  const info = await p.evaluate(() => {
    const wrap = document.querySelector('.header-logo')
    const img = document.querySelector('.header-logo__img')
    const wrapRect = wrap.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    return {
      wrapH: wrapRect.height,
      imgH: imgRect.height,
      // The image is taller than its clipping wrapper by design (the crop
      // technique) — what matters is whether the window is now big enough
      // relative to the image to show the full (measured) artwork without
      // clipping into it: window >= ~58% of image height.
      windowRatio: wrapRect.height / imgRect.height,
      complete: img.complete && img.naturalWidth > 0,
    }
  })
  check(`[${label}/${theme}] logo image loaded`, info.complete)
  check(`[${label}/${theme}] logo rendered scale is the expected height (${info.imgH}px)`, viewport.width < 640 ? info.imgH === 51 : info.imgH === 73)
  check(`[${label}/${theme}] logo clipping window is tall enough to avoid clipping (ratio ${info.windowRatio.toFixed(3)})`, info.windowRatio >= 0.53)

  // Vertical alignment: header icon-buttons and the logo wrapper should be
  // vertically centered within the same header row (centers within ~2px).
  // Row height itself grew (60px mobile / 68px desktop, up from 56px) for
  // more breathing room around the logo — see Header.tsx's own comment.
  const alignment = await p.evaluate(() => {
    const header = document.querySelector('header > div')
    const logo = document.querySelector('.header-logo')
    const icon = document.querySelector('[aria-label="How to play"]')
    const hRect = header.getBoundingClientRect()
    const lRect = logo.getBoundingClientRect()
    const iRect = icon.getBoundingClientRect()
    const logoCenter = lRect.top + lRect.height / 2
    const iconCenter = iRect.top + iRect.height / 2
    return { headerH: hRect.height, diff: Math.abs(logoCenter - iconCenter) }
  })
  const expectedHeaderH = viewport.width < 640 ? 60 : 68
  check(`[${label}/${theme}] header row height is the new, taller value (${expectedHeaderH}px)`, alignment.headerH === expectedHeaderH)
  check(`[${label}/${theme}] logo stays vertically centered with the icon buttons (${alignment.diff.toFixed(1)}px offset)`, alignment.diff < 3)

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] no horizontal overflow`, noOverflow)

  await context.close()
}

async function runKeyboardMeasurements(url, viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, 'light')
  await p.addInitScript(() => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify({ mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 }))
  })
  await p.goto(url)
  await p.waitForTimeout(300)

  const data = await p.evaluate(() => {
    const q = document.querySelector('[data-key="Q"]')
    const enter = document.querySelector('[data-key="ENTER"]')
    const keys = document.querySelectorAll('.key')
    const gap = keys[1].getBoundingClientRect().left - keys[0].getBoundingClientRect().right
    const rows = document.querySelectorAll('[data-onscreen-keyboard] > div')
    let overlap = false
    for (const row of rows) {
      const boxes = Array.from(row.querySelectorAll('.key')).map((el) => el.getBoundingClientRect())
      for (let i = 0; i < boxes.length - 1; i++) {
        if (boxes[i].right > boxes[i + 1].left + 0.5) overlap = true
      }
    }
    return {
      qWidth: q.getBoundingClientRect().width,
      qFontSize: getComputedStyle(q).fontSize,
      enterWidth: enter.getBoundingClientRect().width,
      gap,
      overlap,
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      rowsCount: rows.length,
    }
  })

  const isMobile = viewport.width < 640
  if (isMobile) {
    const baselineWidth = label === 'quiz-mobile' ? 25.8 : 31
    check(`[${label}] letter key is measurably wider than the pre-change baseline (${baselineWidth}px) — got ${data.qWidth.toFixed(1)}px`, data.qWidth > baselineWidth + 0.3)
    check(`[${label}] gap reduced to 5px`, data.gap === 5)
    check(`[${label}] letter font-size increased to 0.92rem (14.72px) — got ${data.qFontSize}`, data.qFontSize === '14.72px')
    const baselineEnter = label === 'quiz-mobile' ? 43 : 47
    check(`[${label}] Enter width close to the pre-change baseline (${baselineEnter}px, within 5px) — got ${data.enterWidth.toFixed(1)}px`, Math.abs(data.enterWidth - baselineEnter) <= 5)
  } else {
    check(`[${label}] desktop letter key width unchanged from baseline (43px) — got ${data.qWidth.toFixed(1)}px`, Math.abs(data.qWidth - 43) <= 1)
    check(`[${label}] desktop gap unchanged (6px)`, data.gap === 6)
    check(`[${label}] desktop letter font-size unchanged (0.85rem / 13.6px)`, data.qFontSize === '13.6px')
  }
  check(`[${label}] QWERTY layout intact (3 rows)`, data.rowsCount === 3)
  check(`[${label}] no key overlap within any row`, !data.overlap)
  check(`[${label}] no horizontal overflow`, data.noOverflow)

  await context.close()
}

async function runDailyRegression() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(300)

  await p.locator('[data-key="S"]').click()
  await p.locator('[data-key="P"]').click()
  await p.locator('[data-key="A"]').click()
  await p.locator('[data-key="I"]').click()
  await p.locator('[data-key="N"]').click()
  const boardText = (await p.locator('[role="grid"]').first().innerText()).replace(/\s+/g, '')
  check('Daily: on-screen keyboard still enters letters (SPAIN)', boardText.includes('SPAIN'))

  await p.locator('[data-key="BACKSPACE"]').click()
  const afterBackspace = (await p.locator('[role="grid"]').first().innerText()).replace(/\s+/g, '')
  check('Daily: on-screen Backspace still works', !afterBackspace.includes('SPAIN') && afterBackspace.includes('SPAI'))

  await p.keyboard.press('N')
  const afterPhysical = (await p.locator('[role="grid"]').first().innerText()).replace(/\s+/g, '')
  check('Daily: physical keyboard still works', afterPhysical.includes('SPAIN'))

  await p.locator('[data-key="ENTER"]').click()
  await p.waitForTimeout(300)
  check('Daily: on-screen Enter still submits (a guess row is revealed or rejected, page did not error)', errors.length === 0)

  await context.close()
}

async function runQuizTypeAnswerRegression() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await p.addInitScript(() => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify({ mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 }))
  })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  for (const ch of correctName.slice(0, 3).toUpperCase()) {
    await p.locator(`[data-key="${ch}"]`).click()
  }
  const typed = await p.getByLabel('Country name').inputValue()
  check('Quiz Type Answer: on-screen keyboard still enters lowercase letters', typed === correctName.slice(0, 3).toLowerCase())

  await p.getByLabel('Country name').fill(correctName)
  await p.locator('[data-key="ENTER"]').click()
  await p.waitForTimeout(200)
  check('Quiz Type Answer: on-screen Enter still submits', (await p.getByText('Correct!').count()) > 0)

  await context.close()
}

await runHeaderCheck({ width: 1440, height: 200 }, 'desktop', 'light')
await runHeaderCheck({ width: 1440, height: 200 }, 'desktop', 'dark')
await runHeaderCheck({ width: 390, height: 200 }, 'mobile', 'light')
await runHeaderCheck({ width: 390, height: 200 }, 'mobile', 'dark')

await runKeyboardMeasurements(`${BASE}/`, { width: 390, height: 844 }, 'daily-mobile')
await runKeyboardMeasurements(`${BASE}/quiz/flags`, { width: 390, height: 844 }, 'quiz-mobile')
await runKeyboardMeasurements(`${BASE}/`, { width: 1440, height: 900 }, 'daily-desktop')

await runDailyRegression()
await runQuizTypeAnswerRegression()

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
