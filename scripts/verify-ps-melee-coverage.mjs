/**
 * Browser verify: Joe ancient Flat/S.N. Dam chart (Action Dam).
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

const CHAR_ID = 'char_ps_chart_verify'

const CASES = [
  {
    id: 'wpn_short_sword',
    name: 'Short Sword',
    category: 'Short Swords',
    damage: '2D4',
    linkedWpSkillId: 'wp_sword',
    expect: /2D4\+\d/,
    shot: 'combat-action-short-swords-ps.png',
  },
  {
    id: 'wpn_halberd',
    name: 'Halberd',
    category: 'Pole Arms',
    damage: '3D6',
    linkedWpSkillId: 'wp_polearm',
    expect: /3D6\+\d/,
    shot: 'combat-action-polearms-ps.png',
  },
  {
    id: 'wpn_whip',
    name: 'Bull Whip',
    category: 'Whips',
    damage: '1D6',
    linkedWpSkillId: 'wp_whip',
    // Neither Flat nor S.N. — bare dice (no +PS)
    expect: /^1D6$/,
    shot: 'combat-action-whips-no-ps.png',
    exactDam: '1D6',
  },
  {
    id: 'wpn_short_bow',
    name: 'Short Bow',
    category: 'Missile',
    damage: '1D6',
    linkedWpSkillId: 'wp_archery_and_targeting',
    expect: /1D6\+\d/,
    shot: 'combat-action-bows-flat-ps.png',
  },
  {
    id: 'wpn_throwing_axe',
    name: 'Axe, Throwing',
    category: 'Axes',
    damage: '1D6',
    throwable: true,
    linkedWpSkillId: 'wp_battle_axe',
    // Default Dam = melee → Flat+eligible
    expect: /1D6\+\d/,
    shot: 'combat-action-axes-melee-ps.png',
    expandThrown: true,
  },
]

function formState(psScore = 20, psTier = 'standard') {
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
        id: 'wp_polearm',
        catalogSkillId: 'wp_polearm',
        name: 'W.P. Polearm',
        level: 1,
        restricted: false,
      },
      {
        id: 'wp_whip',
        catalogSkillId: 'wp_whip',
        name: 'W.P. Whip',
        level: 1,
        restricted: false,
      },
      {
        id: 'wp_archery_and_targeting',
        catalogSkillId: 'wp_archery_and_targeting',
        name: 'W.P. Archery and Targeting',
        level: 1,
        restricted: false,
      },
      {
        id: 'wp_battle_axe',
        catalogSkillId: 'wp_battle_axe',
        name: 'W.P. Battle Axe',
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
    name: `PS Chart ${weapon.name}`,
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
  for (const w of CASES) {
    const save = buildSave(w)
    await seedAndOpen(save)

    // Ancient Primary Dam value (first Dam label in Ancient Weapons block).
    const ancientBox = page.locator('text=Ancient').first()
    await ancientBox.waitFor({ timeout: 15_000 })
    const damText = await page
      .locator('xpath=//*[normalize-space()="Dam"]/following-sibling::*[1]')
      .first()
      .innerText()
      .catch(async () => {
        if (w.expect) {
          return page.locator('text=/' + w.expect.source + '/').first().innerText()
        }
        return ''
      })

    const shot = path.join(OUT_DIR, w.shot)
    await page.screenshot({ path: shot, fullPage: false })
    result.screenshots.push(shot)

    const trimmed = damText.trim()
    const ok = w.exactDam
      ? trimmed === w.exactDam || new RegExp(`^${w.damage}$`).test(trimmed)
      : w.expect.test(trimmed)

    const caseRow = {
      name: w.name,
      category: w.category,
      dam: trimmed,
      ok,
    }

    if (w.expandThrown) {
      // Weapon-row Expand (not Hand to Hand) — last Expand in Ancient section.
      const expandBtn = page
        .locator('button', { hasText: /^Expand$/i })
        .nth(1)
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click()
        await page.waitForTimeout(600)
        const thrownLabel = await page
          .locator('text=/Thrown Dam/i')
          .first()
          .isVisible()
          .catch(() => false)
        const thrownShot = path.join(OUT_DIR, 'combat-action-axes-thrown-expand.png')
        await page.screenshot({ path: thrownShot, fullPage: false })
        result.screenshots.push(thrownShot)
        caseRow.thrownDamVisible = thrownLabel
        if (!thrownLabel) {
          caseRow.ok = false
          result.notes.push(`${w.name}: Thrown Dam missing in Expand`)
        }
        const closeBtn = page.locator('button', { hasText: /^Close$/i }).first()
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
      }
    }

    result.cases.push(caseRow)
    if (!ok) result.notes.push(`${w.name}: unexpected Dam ${trimmed}`)
  }
  result.pass =
    result.cases.every((c) => c.ok) &&
    result.screenshots.every((p) => fs.existsSync(p))
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
