/**
 * Between the Shadows psionics pp. 116–117 (Healer, Sensitive, Physical sections).
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPsionicsFromDir } from './lib/psionics-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')

const btsSource = (page) => ({
  gameSystem: 'nightbane',
  reference: 'Between the Shadows',
  pageNumber: page,
})

const astralTravelPrerequisite = {
  type: 'other_psionic_any_of',
  psionicIds: ['psionic_astral_projection', 'psionic_astral_transference'],
}

/** @type {Record<string, { category: string, patch: object }>} */
export const BTS_116_117_ROWS = {
  psionic_bio_regeneration_healer: {
    category: 'healer',
    patch: {
      sources: [btsSource(116)],
      description:
        'Mentally heal oneself of disease, poison, or physical damage. Self only — cannot help others. Requires one full minute of concentration; does not restore missing limbs. Heals 2D6 hit points or 3D6 S.D.C. per melee round with no scarring. Can regenerate as often as once every other minute.',
      limitations: {
        selfOnly: true,
        otherLimitations: 'Regenerate at most once every other minute.',
      },
    },
  },
  psionic_detect_psionics: {
    category: 'healer',
    patch: {
      sources: [btsSource(116)],
      description:
        'Mental probe indicating psionic energy in the area. Cannot pinpoint exact location or precise power level — only a vague sense of weak, medium, or powerful. Directed at a person, reveals whether they are psychic (not type or strength beyond low/medium/high). Also detects group mind block and psionic possession.',
    },
  },
  psionic_restore_isp: {
    category: 'healer',
    patch: {
      sources: [btsSource(116)],
      description:
        'Transfers some of the psychic\'s I.S.P. to another psychic (does not create new I.S.P.). Costs 2 I.S.P. plus the amount transferred — e.g. transferring 10 I.S.P. costs 12 I.S.P. total. Mind block prevents transfer.',
    },
  },
  psionic_restore_ppe: {
    category: 'healer',
    patch: {
      sources: [btsSource(116)],
      description:
        'Converts the psychic\'s I.S.P. to P.P.E. and transfers it to another person (2 I.S.P. = 1 P.P.E.). Conversion and transfer cost 4 I.S.P. plus the I.S.P. converted — e.g. 10 I.S.P. becomes 5 P.P.E. for a total cost of 14 I.S.P. Mind block prevents transfer.',
      isp: {
        baseActivation: 4,
        notes: '4 I.S.P. plus the amount of I.S.P. converted (2:1 ratio to P.P.E.).',
        dynamicCosts: [
          {
            trigger: 'Conversion and transfer',
            costFormula: '4 I.S.P. plus the I.S.P. amount converted at 2:1 to P.P.E.',
          },
        ],
      },
    },
  },
  psionic_suppress_fear: {
    category: 'healer',
    patch: {
      sources: [btsSource(116)],
      description:
        'Temporarily suppresses chemical and psychological fear in the subject, enabling rational action instead of fight-or-flight. While active, automatically succeeds on horror factor checks, even if magically induced. Usable on self or others by touch.',
    },
  },
  psionic_astral_bolts: {
    category: 'sensitive',
    patch: {
      sources: [btsSource(116)],
      prerequisites: [astralTravelPrerequisite],
      description:
        'Usable only in the Astral Plane; draws on ambient ectoplasm. Astral bolts inflict 1D4 S.D.C. per level of the caster and are +3 to strike. Targets may dodge normally.',
      save: { summary: 'Targets may dodge normally.', saveKind: 'special' },
    },
  },
  psionic_astral_navigation: {
    category: 'sensitive',
    patch: {
      sources: [btsSource(116)],
      prerequisites: [astralTravelPrerequisite],
      description:
        'Communion with the Astral Plane for easier navigation. Skill rolls once per hour. In the Outer Layer, a successful roll returns the psychic to body or physical world (via astral transference) without using the Nightbane RPG astral return table. In the Inner Plane, successful rolls allow travel via Dragon Roads by visualizing a destination.',
      baseSkill: {
        label: 'Astral Navigation',
        basePercent: 45,
        perLevel: 4,
        notes:
          'Roll once per hour. Destination well known (+48h stay): +25%. Known (visited once): +5%. Heard of but never visited: -5%. Inner Plane: no modifier. Outer Layer: -10%. Void: -15%.',
      },
    },
  },
  psionic_dreamdance_minor: {
    category: 'sensitive',
    patch: {
      sources: [btsSource(117)],
      description:
        'Enter the Dreamstream while the body remains in trance (like astral projection, but no silver cord). Dream projection appears near the character\'s Dream Pool with S.D.C. equal to combined physical S.D.C. and hit points; dream constructs use S.D.C. only. Damage to the projection does not affect the body unless the projection is destroyed. Leaving the Dreamstream is automatic unless blocked — then resolve with Dream Combat rules. Can search for a sleeping person\'s Dream Pool (see resolution table).',
      limitations: {
        selfOnly: true,
        otherLimitations:
          'Projection destruction does not harm the body unless the dream construct is completely destroyed.',
      },
    },
  },
  psionic_ethereal_mirage_minor: {
    category: 'sensitive',
    patch: {
      sources: [btsSource(117)],
      description:
        'Visual illusion projected into minds within range. Successful save reveals the illusion. Any shape or form; no sound and not substantial. Functions only in the Dreamstream and Astral Plane.',
      limitations: {
        otherLimitations: 'Dreamstream and Astral Plane only; illusion is visual only.',
      },
    },
  },
  psionic_sense_dimensional_anomaly: {
    category: 'sensitive',
    patch: {
      sources: [btsSource(117)],
      description:
        'Detects dimensional anomalies — portals or Rifts to astral or dream domains — and disturbances from teleportation, temporal magic, or other reality-disrupting powers within the area.',
    },
  },
  psionic_activate_dimensional_portal: {
    category: 'physical',
    patch: {
      sources: [btsSource(117)],
      description:
        'Open existing dimensional portals (cannot create new ones). Applies only to portals linking the Astral Plane, astral domains/kingdoms, Dream Pools, the Dreamstream, and the Nightlands. Protected portals resist with a standard save modified by the creator\'s bonuses.',
    },
  },
  psionic_telekinetic_punch: {
    category: 'physical',
    patch: {
      sources: [btsSource(117)],
      description:
        'Deliver a telekinetic punch or kick through directed energy, used with a normal physical attack that can be parried or dodged. Punch: 4D6 + P.S. bonus; kick: 5D6 + P.S. bonus. I.S.P. spent whether or not the attack hits. On each use, save 14+ or take 1D6 damage from wrenched muscles or a dislocated joint.',
    },
  },
  psionic_telekinetic_leap: {
    category: 'physical',
    patch: {
      sources: [btsSource(117)],
      description:
        'Telekinetically boost leaping — +3 feet (0.9 m) high and +5 feet (1.5 m) long per level. Usable with a leap kick (6D6+6 + P.S. bonuses); user takes 2D6 impact damage. Acrobatics, gymnastics, or roll with punch/fall/impact may be needed to land safely.',
    },
  },
}

export const BTS_116_117_IDS = Object.keys(BTS_116_117_ROWS)

/** @returns {Map<string, object[]>} category file slug → rows */
export function buildBetweenShadowsPsionics116117() {
  const catalog = loadPsionicsFromDir(psionicsDir)
  const byId = new Map(catalog.map((row) => [row.id, row]))
  const byCategory = new Map()

  for (const [id, { category, patch }] of Object.entries(BTS_116_117_ROWS)) {
    const existing = byId.get(id)
    if (!existing) throw new Error(`Missing catalog row for ${id}`)
    const row = structuredClone(existing)
    Object.assign(row, patch)
    if (patch.prerequisites) {
      delete row.psionicPrerequisites
    }
    row.genrePlacements = [{ genreId: 'nightbane', category }]
    row.gameSystems = ['nightbane']
    const list = byCategory.get(category) ?? []
    list.push(row)
    byCategory.set(category, list)
  }
  return byCategory
}

if (process.argv[1]?.endsWith('build-between-shadows-psionics-116-117.mjs')) {
  const groups = buildBetweenShadowsPsionics116117()
  let n = 0
  for (const [cat, rows] of groups) {
    for (const row of rows) {
      console.log(`  ${row.id} — ${row.name} (${cat}, p.${row.sources?.[0]?.pageNumber})`)
      n++
    }
  }
  console.log(`Built ${n} Between the Shadows psionics (pp. 116–117)`)
}
