/**
 * Browser verify: Combat Abilities category tabs + filters.
 * Requires: npm run dev on 127.0.0.1:5173
 *
 * Usage: node scripts/verify-combat-abilities-tabs.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:5173'
const OUT_DIR =
  '/cursor/stores/bc-a47a0a74-67c3-4007-9bcc-0877b814b552/media/combat-abilities'
const SHOT = path.join(OUT_DIR, 'combat-abilities-category-tabs.png')
const VERIFY = path.join(OUT_DIR, 'combat-abilities-category-tabs-verify.json')

fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

const result = {
  pass: false,
  visibleTabs: [],
  ppeAboveTabs: false,
  hasSearch: false,
  hasTypeFilter: false,
  placeholderGone: false,
  selectedTab: null,
  screenshot: SHOT,
  notes: [],
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.getByRole('button', { name: /Create Character/i }).click()
  await page.waitForTimeout(200)
  await page.locator('button', { hasText: 'Nightbane' }).first().click()
  await page.waitForTimeout(300)
  await page.locator('button', { hasText: 'NightbaneDual-form' }).first().click()
  await page.waitForTimeout(300)
  await page.locator('button', { hasText: 'General Citizen' }).first().click()
  await page.waitForTimeout(300)
  await page.locator('button', { hasText: 'Skip → Review' }).first().click()
  await page.waitForTimeout(1200)
  await page.locator('button:not([disabled])', { hasText: /Spawn character/i }).first().click()
  await page.waitForTimeout(400)
  await page.locator('button', { hasText: /Spawn character/i }).last().click()
  await page.waitForTimeout(2000)

  await page.locator('button', { hasText: /^COMBAT$/i }).first().click()
  await page.waitForTimeout(400)
  await page.locator('button', { hasText: /^ABILITIES$/i }).last().click()
  await page.waitForTimeout(400)

  const region = page.getByLabel('Combat abilities')
  await region.waitFor({ timeout: 15_000 })

  result.ppeAboveTabs = await region
    .getByText('P.P.E.', { exact: true })
    .first()
    .isVisible()
  const regionText = await region.innerText()
  result.placeholderGone = !/coming next/i.test(regionText)

  result.visibleTabs = await region.locator('button').evaluateAll((els) =>
    els
      .map((e) => e.textContent.trim())
      .filter((t) => /^(Natural|OCC|Magic|Psionics|Talents)$/i.test(t)),
  )

  const prefer = ['Talents', 'Natural', 'Magic', 'Psionics', 'OCC'].find((t) =>
    result.visibleTabs.some((v) => v.toLowerCase() === t.toLowerCase()),
  )
  if (prefer) {
    await region.locator('button', { hasText: new RegExp(`^${prefer}$`, 'i') }).first().click()
    await page.waitForTimeout(300)
    result.selectedTab = prefer
  }

  result.hasSearch = await region.locator('input[type="search"]').first().isVisible().catch(() => false)
  result.hasTypeFilter = await region.locator('select').first().isVisible().catch(() => false)

  await region.screenshot({ path: SHOT })

  result.pass =
    result.ppeAboveTabs &&
    result.placeholderGone &&
    result.visibleTabs.length > 0 &&
    fs.existsSync(SHOT)
} catch (err) {
  result.notes.push(String(err?.message ?? err))
  await page
    .screenshot({
      path: path.join(OUT_DIR, 'combat-abilities-verify-error.png'),
      fullPage: true,
    })
    .catch(() => {})
} finally {
  fs.writeFileSync(VERIFY, JSON.stringify(result, null, 2))
  await browser.close()
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass ? 0 : 1)
}
