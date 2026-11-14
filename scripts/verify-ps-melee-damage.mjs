/**
 * Browser verify: P.S. damage bonus on melee Action Dam (CS-17).
 * Requires: npm run dev on 127.0.0.1:5173
 *
 * Usage: node scripts/verify-ps-melee-damage.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:5173'
const OUT_DIR =
  '/cursor/stores/bc-a47a0a74-67c3-4007-9bcc-0877b814b552/media/ps-melee-damage'
const SHOT_STD = path.join(OUT_DIR, 'combat-action-melee-ps-damage.png')
const SHOT_EXPAND = path.join(OUT_DIR, 'combat-action-melee-ps-expand.png')
const SHOT_SN = path.join(OUT_DIR, 'combat-action-melee-sn-ps-damage.png')
const VERIFY = path.join(OUT_DIR, 'verify.json')

fs.mkdirSync(OUT_DIR, { recursive: true })

const CHAR_ID = 'char_ps_melee_verify'
const SWORD_ID = 'wpn_long_sword_verify'
const KNIFE_ID = 'wpn_knife_sn_verify'

function formState(psScore, psTier = 'standard') {
  return {
    alignment: 'Scrupulous',
    hitPoints: { current: 20, maximum: 20, scaling: 'sdc_hp' },
    structuralDamageCapacity: {
      current: 30,
      maximum: 30,
      scaling: 'sdc_hp',
    },
    isp: { current: 0, maximum: 0 },
    attributes: {
      iq: 12,
      me: 10,
      ma: 10,
      ps: { score: psScore, tier: psTier },
      pp: 12,
      pe: 12,
      pb: 10,
      spd: 10,
    },
    skills: [
      {
        id: 'wp_sword',
        catalogSkillId: 'wp_sword',
        name: 'W.P. Sword',
        level: 1,
        restricted: false,
      },
      {
        id: 'hand_to_hand_expert',
        catalogSkillId: 'hand_to_hand_expert',
        name: 'Hand to Hand: Expert',
        level: 1,
        restricted: false,
      },
    ],
  }
}

function buildSave({ name, psScore, psTier, weapon }) {
  return {
    id: CHAR_ID,
    name,
    creationGenreId: 'nightbane',
    hostGenreId: 'nightbane',
    schemaVersion: 2,
    isFinalized: true,
    level: 3,
    xp: 5000,
    ppe: { current: 20, maximum: 20 },
    raceId: 'race_human',
    lineage: 'megaversal',
    psychicGateBypassed: true,
    physicalSkillModsApplied: true,
    occ: {
      id: 'occ_ex_government_agent',
      name: 'Ex-Government Agent',
      category: 'standard',
      xpTable: { floors: [0, 2000, 4000, 8000] },
    },
    primary: formState(psScore, psTier),
    morphus: formState(psScore, psTier),
    inventory: {
      items: [weapon],
      equippedArmorId: null,
      readyWeaponIds: [weapon.id, null],
      ammoReserves: {},
    },
  }
}

const swordSave = buildSave({
  name: 'PS Melee Verify',
  psScore: 20,
  psTier: 'standard',
  weapon: {
    id: SWORD_ID,
    itemType: 'weapon',
    name: 'Long Sword',
    category: 'Large Swords',
    damage: '2D6',
    strikeBonus: 0,
    weightLbs: 4,
    isEquipped: true,
    linkedWpSkillId: 'wp_sword',
    wpCategory: 'W.P. Sword',
    catalogWeaponId: 'weapon_ancient_long_sword',
  },
})

const snKnifeSave = buildSave({
  name: 'PS SN Melee Verify',
  psScore: 24,
  psTier: 'supernatural',
  weapon: {
    id: KNIFE_ID,
    itemType: 'weapon',
    name: 'Knife',
    category: 'Knives',
    damage: '1D8',
    strikeBonus: 0,
    weightLbs: 1,
    isEquipped: true,
    throwable: true,
    linkedWpSkillId: 'wp_knife',
    wpCategory: 'W.P. Knife',
  },
})

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

const result = {
  pass: false,
  standardDam: null,
  expandDam: null,
  supernaturalDam: null,
  screenshots: [],
  notes: [],
}

async function seedAndOpen(save) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.evaluate(
    ({ save, indexKey, savePrefix }) => {
      localStorage.setItem(`${savePrefix}${save.id}`, JSON.stringify(save))
      localStorage.setItem(
        indexKey,
        JSON.stringify([
          {
            id: save.id,
            name: save.name,
            creationGenreId: save.creationGenreId,
            hostGenreId: save.hostGenreId,
            updatedAtMs: Date.now(),
            inProgress: false,
            raceName: 'Human',
            occName: save.occ.name,
          },
        ]),
      )
    },
    { save, indexKey: 'pds:characterIndex', savePrefix: 'pds:characterSave:' },
  )
  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 })
  await page.getByRole('button', { name: new RegExp(save.name, 'i') }).first().click()
  await page.waitForTimeout(800)
  await page.locator('button', { hasText: /^COMBAT$/i }).first().click()
  await page.waitForTimeout(500)
  await page.locator('button', { hasText: /^ACTION$/i }).first().click()
  await page.waitForTimeout(500)
}

try {
  await seedAndOpen(swordSave)

  const ancientBox = page.locator('text=Ancient').first()
  await ancientBox.waitFor({ timeout: 15_000 })

  // Dam quick-stat on Primary row
  const damLine = page.locator('text=/^Dam\\b/').first()
  const damRow = damLine.locator('xpath=ancestor::*[contains(., "PRIMARY") or contains(., "Primary")][1]')
  const damText = await page
    .locator('xpath=//*[normalize-space()="Dam"]/following-sibling::*[1]')
    .first()
    .innerText()
    .catch(async () => {
      // Fallback: grab any Dam value near Ancient
      return page.locator('text=/2D6\\+/').first().innerText()
    })
  result.standardDam = damText.trim()

  await page.screenshot({ path: SHOT_STD, fullPage: false })
  result.screenshots.push(SHOT_STD)

  // Expand primary weapon
  const expandBtn = page
    .locator('button', { hasText: /^Expand$/i })
    .first()
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click()
    await page.waitForTimeout(500)
    const expandDam = await page
      .locator('text=/2D6\\+/')
      .first()
      .innerText()
      .catch(() => null)
    result.expandDam = expandDam
    await page.screenshot({ path: SHOT_EXPAND, fullPage: false })
    result.screenshots.push(SHOT_EXPAND)
    const closeBtn = page.locator('button', { hasText: /^Close$/i }).first()
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
  }

  // Supernatural knife case
  await seedAndOpen(snKnifeSave)
  const snDam = await page
    .locator('text=/1D8\\+3D6\\+9/')
    .first()
    .innerText()
    .catch(async () => {
      return page
        .locator('xpath=//*[normalize-space()="Dam"]/following-sibling::*[1]')
        .first()
        .innerText()
    })
  result.supernaturalDam = snDam.trim()
  await page.screenshot({ path: SHOT_SN, fullPage: false })
  result.screenshots.push(SHOT_SN)

  const stdOk = /2D6\+\d/.test(result.standardDam ?? '')
  const snOk = /1D8\+3D6\+9/.test(result.supernaturalDam ?? '')
  result.pass = stdOk && snOk && fs.existsSync(SHOT_STD) && fs.existsSync(SHOT_SN)
  if (!stdOk) result.notes.push(`standard Dam unexpected: ${result.standardDam}`)
  if (!snOk) result.notes.push(`supernatural Dam unexpected: ${result.supernaturalDam}`)
} catch (err) {
  result.notes.push(String(err?.message ?? err))
  await page
    .screenshot({
      path: path.join(OUT_DIR, 'verify-error.png'),
      fullPage: true,
    })
    .catch(() => {})
} finally {
  fs.writeFileSync(VERIFY, JSON.stringify(result, null, 2))
  await browser.close()
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass ? 0 : 1)
}
