/**
 * Browser verify: Dam like-die display merge (CS-21).
 * Requires: npm run dev on 127.0.0.1:5173
 *
 * Usage: node scripts/verify-dam-dice-merge.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:5173'
const OUT_DIR =
  '/cursor/stores/bc-a47a0a74-67c3-4007-9bcc-0877b814b552/media/dam-dice-merge'
const SHOT_MERGE = path.join(OUT_DIR, 'combat-action-dam-merged-4d6.png')
const SHOT_KEEP = path.join(OUT_DIR, 'combat-action-dam-separate-1d8-3d6.png')
const VERIFY = path.join(OUT_DIR, 'verify.json')

fs.mkdirSync(OUT_DIR, { recursive: true })

const CHAR_ID = 'char_dam_dice_merge_verify'
const CLUB_ID = 'wpn_club_merge_verify'
const MACE_ID = 'wpn_mace_keep_verify'

function formState(psScore, psTier = 'supernatural') {
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
        id: 'hand_to_hand_expert',
        catalogSkillId: 'hand_to_hand_expert',
        name: 'Hand to Hand: Expert',
        level: 1,
        restricted: false,
      },
    ],
  }
}

function buildSave({ name, psScore, weapon }) {
  return {
    id: CHAR_ID,
    name,
    creationGenreId: 'nightbane',
    hostGenreId: 'nightbane',
    schemaVersion: 3,
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
    primary: formState(psScore),
    morphus: formState(psScore),
    inventory: {
      items: [weapon],
      equippedArmorId: null,
      readyWeaponIds: [weapon.id, null],
      ammoReserves: {},
    },
  }
}

// SN 22 + 1D6 club → raw 1D6+3D6+7 → display 4D6+7
const mergeSave = buildSave({
  name: 'Dam Merge Verify',
  psScore: 22,
  weapon: {
    id: CLUB_ID,
    itemType: 'weapon',
    name: 'Club',
    category: 'Blunt',
    damage: '1D6',
    strikeBonus: 0,
    weightLbs: 3,
    isEquipped: true,
  },
})

// SN 24 + 1D8 mace → 1D8+3D6+9 (different faces stay separate)
const keepSave = buildSave({
  name: 'Dam Keep Verify',
  psScore: 24,
  weapon: {
    id: MACE_ID,
    itemType: 'weapon',
    name: 'Mace',
    category: 'Blunt',
    damage: '1D8',
    strikeBonus: 0,
    weightLbs: 4,
    isEquipped: true,
  },
})

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

const result = {
  pass: false,
  mergedDam: null,
  separateDam: null,
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
  await seedAndOpen(mergeSave)
  await page.locator('text=Ancient').first().waitFor({ timeout: 15_000 })
  const merged = await page
    .locator('text=/4D6\\+7/')
    .first()
    .innerText()
    .catch(async () =>
      page
        .locator('xpath=//*[normalize-space()="Dam"]/following-sibling::*[1]')
        .first()
        .innerText(),
    )
  result.mergedDam = merged.trim()
  await page.screenshot({ path: SHOT_MERGE, fullPage: false })
  result.screenshots.push(SHOT_MERGE)

  await seedAndOpen(keepSave)
  await page.locator('text=Ancient').first().waitFor({ timeout: 15_000 })
  const separate = await page
    .locator('text=/1D8\\+3D6\\+9/')
    .first()
    .innerText()
    .catch(async () =>
      page
        .locator('xpath=//*[normalize-space()="Dam"]/following-sibling::*[1]')
        .first()
        .innerText(),
    )
  result.separateDam = separate.trim()
  await page.screenshot({ path: SHOT_KEEP, fullPage: false })
  result.screenshots.push(SHOT_KEEP)

  const mergeOk = /4D6\+7/.test(result.mergedDam ?? '')
  const keepOk = /1D8\+3D6\+9/.test(result.separateDam ?? '')
  result.pass =
    mergeOk &&
    keepOk &&
    fs.existsSync(SHOT_MERGE) &&
    fs.existsSync(SHOT_KEEP)
  if (!mergeOk) result.notes.push(`merged Dam unexpected: ${result.mergedDam}`)
  if (!keepOk) result.notes.push(`separate Dam unexpected: ${result.separateDam}`)
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
