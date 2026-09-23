// Type Answer typo-assistance QA: correct / Did You Mean / invalid-domain /
// valid-but-incorrect across Flags, Capitals, Languages, Currencies
// (Easy/Medium/Expert, including both Expert code forms).
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
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p }
}

function setConfig(p, config) {
  return p.addInitScript((c) => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify(c))
  }, config)
}

async function correctName(p) {
  return p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
}
async function fillInput(p, value) {
  await p.locator('#quiz-type-answer-input').fill(value)
}
async function pressEnter(p) {
  await p.locator('#quiz-type-answer-input').press('Enter')
}

/**
 * A fixed sleep after submitting an answer is a race: the auto-advance
 * delay (QUIZ_FEEDBACK_DELAY_MS / _INCORRECT_MS in timing.ts) is 800ms /
 * 1400ms, and under system load (background compilation, many concurrent
 * browser contexts, etc.) a "should be enough" sleep like 900ms can lose
 * that race — which previously surfaced as a Did You Mean check silently
 * failing (the page was still locked on the OLD question) immediately
 * followed by an UNCAUGHT exception on the next `.suggestion` click
 * (nothing rendered because nothing new had loaded), which killed the
 * entire script and silently skipped every remaining section. Polling for
 * the input to become enabled again is the actual, reliable signal that a
 * fresh question is ready, independent of how loaded the machine is.
 */
async function waitForAnswering(p, tag, timeoutMs = 5000) {
  try {
    await p.waitForFunction(
      () => {
        const el = document.querySelector('#quiz-type-answer-input')
        return !!el && !el.disabled
      },
      undefined,
      { timeout: timeoutMs, polling: 50 },
    )
    return true
  } catch {
    check(`${tag}: next question became interactive within ${timeoutMs}ms (no stale-lock race)`, false)
    return false
  }
}

/** Never lets one section's crash silently swallow every later section's checks (see waitForAnswering's doc comment on why this used to happen). */
async function runSection(tag, fn) {
  try {
    await fn()
  } catch (err) {
    check(`${tag}: section completed without throwing`, false, err?.message ?? String(err))
  }
}

/** A wrong probe guaranteed different from `correct`, since preferred and fallback are always two different values — see exerciseFiveStates's doc comment. */
function pickWrong(correct, preferred, fallback) {
  return correct === preferred ? fallback : preferred
}

// ------------------------------------------------------------------
// Exercise five states in sequence for a forward-direction Type Answer
// question (the correct answer is fully known and typeable):
//   Q1: a typo of the CORRECT answer -> Did You Mean -> accept -> correct
//   Q2: a typo of a WRONG-but-real domain value (THE information-leak fix,
//       proven live) -> Did You Mean -> accept -> genuine incorrect
//   Q3: invalid nonsense -> contextual message -> recover with the real answer
//   Q4: a real-but-wrong EXACT value (no typo at all) -> normal incorrect
// A `wrongRealValue` must be a real domain value guaranteed different from
// whatever question's correct answer it's being submitted against. Q2 and
// Q4 each draw their OWN fresh, independently-random question (after Q1's
// and Q3's advances) — a single value picked once against Q1's correct
// answer is NOT safe for them: e.g. "Euro" and "Spanish" each collided
// live with a later question's own correct answer often enough to fail
// (the Familiar pool has several Eurozone countries and, separately, a
// Spanish-speaking one). So `pickWrong(correct, preferred, fallback)` is
// called fresh at EVERY usage point, against that specific question's own
// correct answer — since preferred and fallback are always two different
// values, at most one of them can ever equal any single `correct`, so the
// picked value is unconditionally safe every time it's called.
// ------------------------------------------------------------------
async function exerciseFiveStates(mode, config, tag, wrongPreferred, wrongFallback) {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode, ...config, answerStyle: 'type-answer', questionCount: 10 })
  await p.goto(`${BASE}/quiz/${mode}`)
  await p.waitForTimeout(300)

  // Q1. Did You Mean for the CORRECT answer: append the last letter twice (safe 1-edit typo).
  {
    const correct = await correctName(p)
    const typo = correct + correct.slice(-1)
    await fillInput(p, typo)
    await pressEnter(p)
    check(`${tag}: typo of the CORRECT answer shows Did You Mean helper (no score/progress change)`, await p.getByText(/Did you mean/).isVisible())
    check(`${tag}: Did You Mean does NOT use red incorrect styling`, (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
    check(`${tag}: still Question 1 (input not consumed)`, await p.getByText('Question 1 of 10').isVisible())
    await p.screenshot({ path: `${OUT}/typo-${tag}-did-you-mean-correct.png` })
    await p.locator('.quiz-type-answer__suggestion').click()
    check(`${tag}: accepting the suggestion shows Correct!`, await p.getByText('Correct!').isVisible())
    check(`${tag}: score incremented after accepting a correct suggestion`, await p.getByText('Score: 1').isVisible())
    await waitForAnswering(p, tag)
  }

  // Q2. THE INFORMATION-LEAK FIX, proven live: a typo of a domain value
  // that is WRONG for this question must ALSO get a suggestion, styled
  // identically to Q1's, and accepting it must be a genuine incorrect
  // submission — not silently rescued, not visually distinguishable
  // beforehand.
  {
    check(`${tag}: now on Question 2 (leak-fix check)`, await p.getByText('Question 2 of 10').isVisible())
    const correct = await correctName(p)
    const wrongRealValue = pickWrong(correct, wrongPreferred, wrongFallback)
    check(`${tag}: Q2 sanity — wrongRealValue ("${wrongRealValue}") does not collide with this question's correct answer ("${correct}")`, correct !== wrongRealValue)
    const wrongTypo = wrongRealValue + wrongRealValue.slice(-1)
    await fillInput(p, wrongTypo)
    await pressEnter(p)
    check(`${tag}: a typo of a WRONG domain value ALSO shows Did You Mean (the leak fix)`, await p.getByText(/Did you mean/).isVisible())
    const suggestionText = await p.locator('.quiz-type-answer__suggestion').isVisible().then((v) => (v ? p.locator('.quiz-type-answer__suggestion').innerText() : Promise.resolve('')))
    check(`${tag}: leak-fix suggestion text is "${wrongRealValue}"`, suggestionText === wrongRealValue, suggestionText)
    check(`${tag}: leak-fix Did You Mean also has no red styling (identical pre-acceptance treatment)`, (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
    check(`${tag}: leak-fix Did You Mean does not change score before acceptance`, await p.getByText('Score: 1').isVisible())
    await p.screenshot({ path: `${OUT}/typo-${tag}-did-you-mean-wrong.png` })
    await p.locator('.quiz-type-answer__suggestion').click()
    check(`${tag}: accepting the WRONG suggestion produces genuine red incorrect feedback`, (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
    check(`${tag}: accepting the WRONG suggestion reveals the real correct answer`, await p.getByText(/^Correct answer:/).isVisible())
    check(`${tag}: score NOT incremented by accepting a wrong suggestion`, await p.getByText('Score: 1').isVisible())
    await p.screenshot({ path: `${OUT}/typo-${tag}-wrong-suggestion-accepted.png` })
    await waitForAnswering(p, tag)
  }

  // Q3. Invalid domain: "Zzqxvv" is never a real value in any of our domains.
  {
    check(`${tag}: now on Question 3`, await p.getByText('Question 3 of 10').isVisible())
    await fillInput(p, 'Zzqxvv')
    await pressEnter(p)
    check(`${tag}: invalid input shows contextual helper`, await p.getByText(/^Please enter a valid/).isVisible())
    check(`${tag}: invalid input does NOT use red incorrect styling`, (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
    check(`${tag}: still Question 3 after invalid input (not consumed)`, await p.getByText('Question 3 of 10').isVisible())
    check(`${tag}: score unchanged by invalid input`, await p.getByText('Score: 1').isVisible())
    await p.screenshot({ path: `${OUT}/typo-${tag}-invalid.png` })
    const correct = await correctName(p)
    await fillInput(p, correct)
    await pressEnter(p)
    check(`${tag}: recovers with the real answer after an invalid attempt`, await p.getByText('Correct!').isVisible())
    await waitForAnswering(p, tag)
  }

  // Q4. Valid-but-incorrect: a real domain value, EXACT (no typo), wrong for this question.
  {
    check(`${tag}: now on Question 4`, await p.getByText('Question 4 of 10').isVisible())
    const correct = await correctName(p)
    const wrongRealValue = pickWrong(correct, wrongPreferred, wrongFallback)
    check(`${tag}: Q4 sanity — wrongRealValue ("${wrongRealValue}") does not collide with this question's correct answer ("${correct}")`, correct !== wrongRealValue)
    await fillInput(p, wrongRealValue)
    await pressEnter(p)
    check(`${tag}: real-but-wrong exact answer shows normal red incorrect feedback`, (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
    check(`${tag}: real-but-wrong exact answer reveals "Correct answer:"`, await p.getByText(/^Correct answer:/).isVisible())
    check(`${tag}: score NOT incremented by a real-but-wrong exact answer`, await p.getByText('Score: 2').isVisible())
    await p.screenshot({ path: `${OUT}/typo-${tag}-valid-wrong-exact.png` })
    await waitForAnswering(p, tag)
    check(`${tag}: auto-advanced to Question 5 after the longer incorrect delay`, await p.getByText('Question 5 of 10').isVisible())
  }

  await context.close()
}

await runSection('Flags', () => exerciseFiveStates('flags', { countryPool: 'familiar' }, 'Flags', 'China', 'Brazil'))
await runSection('Capitals', () => exerciseFiveStates('capitals', { countryPool: 'familiar' }, 'Capitals', 'Beijing', 'Cairo'))
await runSection('Languages', () => exerciseFiveStates('languages', { countryPool: 'familiar' }, 'Languages', 'Ukrainian', 'Bengali'))
await runSection('Currencies-Easy', () => exerciseFiveStates('currencies', { countryPool: 'familiar' }, 'Currencies-Easy', 'Euro', 'Yen'))

// ------------------------------------------------------------------
// THE Denmark "Krona" regression case (Krona -> Krone -> correct) AND its
// critical leak-fix counterpart (Euor -> Euro -> incorrect) — cycle
// Currencies Easy questions until Denmark appears twice in the same
// Unlimited session, once for each half of the proof.
// ------------------------------------------------------------------
await runSection('Denmark Krona/Euor', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)

  let foundKrona = false
  for (let i = 0; i < 150 && !foundKrona; i++) {
    const heading = await p.getByRole('heading', { level: 1 }).innerText()
    if (heading.includes('Denmark')) {
      foundKrona = true
      await fillInput(p, 'Krona')
      await pressEnter(p)
      check('Denmark "Krona": shows "Did you mean Krone?"', await p.getByText(/Did you mean/).isVisible())
      const suggestionText = await p.locator('.quiz-type-answer__suggestion').innerText()
      check('Denmark "Krona": suggestion is "Krone" (not silently accepted, not treated as Euro/invalid)', suggestionText === 'Krone', suggestionText)
      await p.screenshot({ path: `${OUT}/typo-denmark-krona.png` })
      await p.locator('.quiz-type-answer__suggestion').click()
      check('Denmark "Krona": accepting the suggestion shows Correct!', await p.getByText('Correct!').isVisible())
      await waitForAnswering(p, 'Denmark Krona')
      break
    }
    const correct = await correctName(p)
    await fillInput(p, correct)
    await pressEnter(p)
    await waitForAnswering(p, 'Denmark Krona cycling')
  }
  check('Denmark "Krona" case: Denmark question was found within 150 tries', foundKrona)

  // THE critical leak-fix counterpart: cycle (same session) until Denmark
  // appears again, then submit "Euor" (a typo of Euro — a real currency,
  // but WRONG for Denmark) and prove it gets the identical Did You Mean
  // treatment as "Krona" did, then becomes a genuine incorrect answer.
  let foundEuor = false
  for (let i = 0; i < 150 && !foundEuor; i++) {
    const heading = await p.getByRole('heading', { level: 1 }).innerText()
    if (heading.includes('Denmark')) {
      foundEuor = true
      await fillInput(p, 'Euor')
      await pressEnter(p)
      check('Denmark "Euor" (leak-fix): shows "Did you mean Euro?"', await p.getByText(/Did you mean/).isVisible())
      const suggestionText = await p.locator('.quiz-type-answer__suggestion').innerText()
      check('Denmark "Euor": suggestion is "Euro"', suggestionText === 'Euro', suggestionText)
      check('Denmark "Euor": no red styling before acceptance (identical to the Krona case)', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
      await p.screenshot({ path: `${OUT}/typo-denmark-euor-did-you-mean.png` })
      await p.locator('.quiz-type-answer__suggestion').click()
      check('Denmark "Euor": accepting "Euro" produces genuine RED incorrect feedback', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
      check('Denmark "Euor": accepting "Euro" reveals "Correct answer: Danish Krone"', await p.getByText('Correct answer: Danish Krone').isVisible())
      await p.screenshot({ path: `${OUT}/typo-denmark-euor-accepted-incorrect.png` })
      break
    }
    const correct = await correctName(p)
    await fillInput(p, correct)
    await pressEnter(p)
    await waitForAnswering(p, 'Denmark Euor cycling')
  }
  check('Denmark "Euor" leak-fix case: Denmark question was found within 150 tries', foundEuor)

  await context.close()
})

// ------------------------------------------------------------------
// Currencies Medium Type — whichever mechanic appears (reverse or fallback).
// ------------------------------------------------------------------
await runSection('Currencies Medium', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  const heading = await p.getByRole('heading', { level: 1 }).innerText()
  console.log('  [Currencies Medium] question:', heading)
  const correct = await correctName(p)
  const typo = correct + correct.slice(-1)
  await fillInput(p, typo)
  await pressEnter(p)
  check('Currencies Medium: typo shows Did You Mean', await p.getByText(/Did you mean/).isVisible())
  await p.locator('.quiz-type-answer__suggestion').click()
  check('Currencies Medium: accepting suggestion shows Correct!', await p.getByText('Correct!').isVisible())
  await context.close()
})

// ------------------------------------------------------------------
// Currencies Expert — cycle for BOTH code-forward and code-reverse forms.
// ------------------------------------------------------------------
async function cycleExpertForm(matchPrompt, tag) {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  for (let i = 0; i < 40; i++) {
    const prompt = await p.getByRole('heading', { level: 1 }).innerText()
    if (matchPrompt(prompt)) {
      console.log(`  [${tag}] matched: "${prompt}"`)
      return { context, p }
    }
    const correct = await correctName(p)
    await fillInput(p, correct)
    await pressEnter(p)
    await waitForAnswering(p, `${tag} cycling`)
  }
  check(`${tag}: found within 40 tries`, false)
  await context.close()
  return null
}

await runSection('Expert code-forward', async () => {
  // Matches both the MC wording ("What is X's currency code?") and the
  // Type Answer wording ("Enter the currency code for X") — these differ
  // (see currencyQuestions.ts's buildCodeForward), so anchoring on the
  // "code?" suffix alone (MC-only) silently missed every Type Answer hit.
  const hit = await cycleExpertForm((p) => /currency code/i.test(p), 'Expert code-forward')
  if (hit) {
    const { p } = hit
    await fillInput(p, 'ABC')
    await pressEnter(p)
    check('Expert code-forward: invalid code shows "Please enter a valid currency code."', await p.getByText('Please enter a valid currency code.').isVisible())
    await fillInput(p, 'EUR')
    await pressEnter(p)
    check('Expert code-forward: a real-but-wrong code shows normal incorrect feedback (no Did You Mean for codes)', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
    check('Expert code-forward: no Did You Mean ever appeared for a 3-letter code', (await p.locator('.quiz-type-answer__helper--suggestion').count()) === 0)
    await p.screenshot({ path: `${OUT}/typo-expert-code-forward.png` })
    await hit.context.close()
  }
})
await runSection('Expert code-reverse', async () => {
  const hit = await cycleExpertForm((p) => /^Which currency does .* represent\?$/.test(p), 'Expert code-reverse')
  if (hit) {
    const { p } = hit
    const correct = await correctName(p)
    const typo = correct + correct.slice(-1)
    await fillInput(p, typo)
    await pressEnter(p)
    check('Expert code-reverse: typo of the CORRECT currency name shows Did You Mean', await p.getByText(/Did you mean/).isVisible())
    await p.locator('.quiz-type-answer__suggestion').click()
    check('Expert code-reverse: accepting suggestion shows Correct!', await p.getByText('Correct!').isVisible())
    await p.screenshot({ path: `${OUT}/typo-expert-code-reverse-correct.png` })
    const ready = await waitForAnswering(p, 'Expert code-reverse')
    if (!ready) {
      await hit.context.close()
      return
    }

    // Leak-fix counterpart: a typo of a currency name that is WRONG for
    // whichever code came up next must also get a suggestion. Expert mode
    // coin-flips between 'code-forward' (country -> code) and
    // 'code-reverse' (code -> currency name) per question (see
    // currencyQuestions.ts's buildCodeQuestion), so the very next question
    // is only ~50% likely to be code-reverse again — landing on a
    // code-forward question instead would mean typing a currency-name typo
    // into a currency-CODE domain, where Did You Mean is deliberately
    // disabled (see buildCurrencyCodeAnswerDomain's own doc comment). That
    // is correct product behaviour, not a leak-fix failure, so re-cycle
    // (same pattern as cycleExpertForm) until a code-reverse prompt comes
    // back around rather than assuming the very next question is one.
    let onCodeReverse = /^Which currency does .* represent\?$/.test(await p.getByRole('heading', { level: 1 }).innerText())
    for (let i = 0; i < 40 && !onCodeReverse; i++) {
      const skipCorrect = await correctName(p)
      await fillInput(p, skipCorrect)
      await pressEnter(p)
      await waitForAnswering(p, 'Expert code-reverse re-cycle')
      onCodeReverse = /^Which currency does .* represent\?$/.test(await p.getByRole('heading', { level: 1 }).innerText())
    }
    if (!onCodeReverse) {
      check('Expert code-reverse leak-fix: a second code-reverse question came up within 40 tries', false)
      await hit.context.close()
      return
    }
    const nextCorrect = await correctName(p)
    const wrongProbe = nextCorrect === 'Japanese Yen' ? 'Nigerian Naira' : 'Japanese Yen'
    const wrongTypo = wrongProbe + wrongProbe.slice(-1)
    await fillInput(p, wrongTypo)
    await pressEnter(p)
    check('Expert code-reverse: typo of a WRONG currency name ALSO shows Did You Mean (leak fix)', await p.getByText(/Did you mean/).isVisible())
    check('Expert code-reverse: no red styling before acceptance', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
    await p.screenshot({ path: `${OUT}/typo-expert-code-reverse-wrong.png` })
    if (await p.locator('.quiz-type-answer__suggestion').isVisible()) {
      await p.locator('.quiz-type-answer__suggestion').click()
      check('Expert code-reverse: accepting the wrong suggestion produces genuine incorrect feedback', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
    } else {
      check('Expert code-reverse: accepting the wrong suggestion produces genuine incorrect feedback', false, 'no suggestion was rendered to click')
    }
    await hit.context.close()
  }
})

// ------------------------------------------------------------------
// Interaction QA: on-screen keyboard + edit-clears-stale-suggestion.
// ------------------------------------------------------------------
await runSection('Interaction', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  const typo = correct + correct.slice(-1)
  await fillInput(p, typo)
  await pressEnter(p)
  check('Interaction: Did You Mean visible after typo', await p.getByText(/Did you mean/).isVisible())
  const onScreenKeyboard = p.locator('.quiz-type-answer__keyboard')
  // Edit the input via the on-screen keyboard's Backspace — should clear the stale suggestion.
  await onScreenKeyboard.getByRole('button', { name: 'Backspace' }).click()
  check('Interaction: Backspace via on-screen keyboard clears the stale suggestion', !(await p.getByText(/Did you mean/).isVisible()))
  // Physical-keyboard-equivalent letter press should still insert text.
  await onScreenKeyboard.getByRole('button', { name: 'A', exact: true }).click()
  const inputValue = await p.locator('#quiz-type-answer-input').inputValue()
  check('Interaction: on-screen keyboard letter key still inserts text', inputValue.endsWith('a'), inputValue)
  await context.close()
})

// ------------------------------------------------------------------
// Dark mode + desktop visual spot check for both helper states.
// ------------------------------------------------------------------
await runSection('Dark mode desktop', async () => {
  const { context, p } = await newCtx('dark', { width: 1280, height: 900 })
  await setConfig(p, { mode: 'languages', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  const typo = correct + correct.slice(-1)
  await fillInput(p, typo)
  await pressEnter(p)
  check('Dark mode desktop: Did You Mean renders', await p.getByText(/Did you mean/).isVisible())
  await p.screenshot({ path: `${OUT}/typo-dark-desktop-did-you-mean.png` })
  await p.locator('.quiz-type-answer__suggestion').click()
  await p.waitForTimeout(300)
  await context.close()
})
await runSection('Dark mode 360px', async () => {
  const { context, p } = await newCtx('dark', { width: 360, height: 900 })
  await setConfig(p, { mode: 'languages', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  await fillInput(p, 'Zzqxvv')
  await pressEnter(p)
  check('Dark mode 360px: invalid-domain helper renders', await p.getByText(/^Please enter a valid/).isVisible())
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('Dark mode 360px: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/typo-dark-360-invalid.png` })
  await context.close()
})

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
