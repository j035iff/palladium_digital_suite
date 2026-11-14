/**
 * Browser verify: P.S. Dam on clear melee categories (CS-19).
 * Requires: npm run dev on 127.0.0.1:5173
 *
 * Usage: node scripts/verify-ps-melee-coverage.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:5173'
const OUT_DIR =
  '/cursor/stores/bc-a47a0a74-67c3-4007-9bcc-0877b814b552/media/ps-melee-coverage'
const VERIFY = path.join(OUT_DIR, 'verify.json')

fs.mkdirSync(OUT_DIR, { recursive: true })

const CHAR_ID = 'char_ps_melee_coverage'
const WEAPONS = [
  {
    id: 'wpn_short_sword_cov',
    name: 'Short Sword',
    category: 'Short Swords',
    damage: '2D4',
    linkedWpSkillId: 'wp_sword',
    wpCategory: 'W.P. Sword',
    // Simulate pre-CS-19 forge stamp; hydrate migrate should clear it.
    forgeProperties: { editorDraft: { addsPsDamageBonus: false } },
    expect: /2D4\+\d/,
  },
  {
    id: 'wpn_battle_axe_cov',
    name: 'Battle Axe',
    category: 'Axes',
    damage: '2D6',
    linkedWpSkillId: 'wp_axe',
    wpCategory: 'W.P. Axe',
    forgeProperties: { editorDraft: { addsPsDamageBonus: false } },
    expect: /2D6\+\d/,
  },
  {
    id: 'wpn_mace_cov',
    name: 'Mace',
    category: 'Blunt',
    damage: '1D8',
    linkedWpSkillId: 'wp_blunt',
    wpCategory: 'W.P. Blunt',
    forgeProperties: { editorDraft: { addsPsDamageBonus: false } },
    expect: /1D8\+\d/,
  },
  {
    id: 'wpn_long_sword_cov',
    name: 'Long Sword',
    category: 'Large Swords',
    damage: '2D6',
    linkedWpSkillId: 'wp_sword',
    wpCategory: 'W.P. Sword',
    expect: /2D6\+\d/,
  },
]

function formState(psScore = 20) {
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
      ps: { score: psScore, tier: 'standard' },
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
        id: 'wp_axe',
        catalogSkillId: 'wp_axe',
        name: 'W.P. Axe',
        level: 1,
        restricted: false,
      },
      {
        id: 'wp_blunt',
        catalogSkillId: 'wp_blunt',
        name: 'W.P. Blunt',
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

function buildSave(weapon) {
  return {
    id: CHAR_ID,
    name: `PS Coverage ${weapon.name}`,
    creationGenreId: 'nightbane',
    hostGenreId: 'nightbane',
    // v2 so migrate clears stamped addsPsDamageBonus:false
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
    primary: formState(20),
    morphus: formState(20),
    inventory: {
      items: [
        {
          itemType: 'weapon',
          strikeBonus: 0,
          weightLbs: 3,
          isEquipped: true,
          ...weapon,
        },
      ],
      equippedArmorId: null,
      readyWeaponIds: [weapon.id, null],
      ammoReserves: {},
    },
  }
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

const result = {
  pass: false,
  cases: [],
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
  for (const w of WEAPONS) {
    const save = buildSave(w)
    await seedAndOpen(save)
    const damText = await page
      .locator('text=/' + w.expect.source + '/')
      .first()
      .innerText()
      .catch(async () => {
        return page
          .locator('xpath=//*[normalize-space()="Dam"]/following-sibling::*[1]')
          .first()
          .innerText()
      })
    const shot = path.join(
      OUT_DIR,
      `combat-action-${w.category.toLowerCase().replace(/\s+/g, '-')}-ps.png`,
    )
    await page.screenshot({ path: shot, fullPage: false })
    result.screenshots.push(shot)
    const ok = w.expect.test(damText.trim())
    result.cases.push({
      name: w.name,
      category: w.category,
      dam: damText.trim(),
      ok,
    })
    if (!ok) result.notes.push(`${w.name}: unexpected Dam ${damText}`)
  }
  result.pass = result.cases.every((c) => c.ok) && result.screenshots.every((p) => fs.existsSync(p))
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
