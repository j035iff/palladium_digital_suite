/**
 * Between the Shadows master (super) psionics pp. 113–115.
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

/** Master psionic row ids in book order (printed pp. 113–115). */
export const BTS_SUPER_IDS = [
  'psionic_astral_transference',
  'psionic_bio_regeneration_superior',
  'psionic_block_breaker',
  'psionic_dreamdance_superior',
  'psionic_gestalt_circle',
  'psionic_group_mind_block',
  'psionic_mind_block_auto_defense',
  'psionic_mind_bond',
  'psionic_mind_wipe',
  'psionic_ppe_shield',
  'psionic_possession',
  'psionic_psi_shield',
  'psionic_psi_sword',
  'psionic_psychic_mirage_superior',
  'psionic_supercharge',
  'psionic_telekinetic_force_field',
  'psionic_telemechanics',
]

/** @type {Record<string, object>} */
const PATCHES = {
  psionic_astral_transference: {
    sources: [btsSource(113)],
    description:
      'Transforms the entire body into an astral energy construct for extended astral travel — a "super" astral projection with no body left behind and no silver cord. All astral projection benefits from Nightbane RPG apply except the cord.',
    prerequisites: [{ type: 'psionic', psionicId: 'psionic_astral_projection' }],
  },
  psionic_bio_regeneration_superior: {
    sources: [btsSource(113)],
    limitations: { selfOnly: true },
  },
  psionic_block_breaker: {
    sources: [btsSource(113)],
    save: {
      summary: 'Standard psionic save; attacker may spend +10 I.S.P. per -1 to defender save.',
      saveKind: 'psionic',
    },
  },
  psionic_dreamdance_superior: {
    sources: [btsSource(113)],
    prerequisites: [{ type: 'psionic', psionicId: 'psionic_dreamdance_minor' }],
    limitations: {
      selfOnly: true,
      otherLimitations: 'Cannot escape the Dreamstream by waking up; reappears at departure point when duration ends or user returns.',
    },
  },
  psionic_gestalt_circle: {
    sources: [btsSource(113)],
    limitations: {
      otherLimitations:
        'Max 8 participants. Circle overrides mind blocks between members. Only the designated key may use enhanced powers; simultaneous use by another member fails (half I.S.P. lost). Participants cannot use other skills, fight, or parry without breaking the circle; dodge at -5 without breaking ranks. Breaking hands ends the circle instantly; rebuilding costs another 30 I.S.P. Two attacks per melee per participant while linked.',
    },
  },
  psionic_group_mind_block: {
    sources: [btsSource(114)],
    description:
      'Instantly erects a mind block protecting everyone within 120 feet (36.5 m). Works like individual mind block — blocks probes and telepathy/empathy from outside forces. Effect is undetectable to those blocked; Detect Psionics reveals a group mind block.',
  },
  psionic_mind_block_auto_defense: {
    sources: [btsSource(114)],
    isp: {
      baseActivation: 0,
      notes:
        'Permanently sacrifice 10 I.S.P. when this power is selected. Auto mind block engages at no further I.S.P. cost during telepathic/empathic probes or attacks until the probe ends.',
    },
  },
  psionic_mind_bond: {
    sources: [btsSource(114)],
    resolutionTable: {
      rollKind: 'd100',
      label: 'Permanent insanity from alien or extremely disturbed mind',
      resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
      entries: [
        { effect: 'No insanity.', percentile: { min: 1, max: 40 } },
        { effect: 'Phobia.', percentile: { min: 41, max: 80 } },
        { effect: 'Affective disorder.', percentile: { min: 81, max: 90 } },
        { effect: 'Neurosis.', percentile: { min: 91, max: 100 } },
      ],
    },
  },
  psionic_mind_wipe: {
    sources: [btsSource(114)],
    isp: {
      baseActivation: 10,
      notes: 'Temporary wipe: 10 I.S.P. per 1D4 days erased. Permanent specific wipe: 50 I.S.P. Complete blank wipe: 50 I.S.P. plus 4 permanent M.E. (even if save succeeds).',
      dynamicCosts: [
        { trigger: 'Temporary wipe', costFormula: '10 I.S.P. per 1D4 days of memory erased.' },
        { trigger: 'Permanent specific memory', costFormula: '50 I.S.P.' },
        { trigger: 'Complete blank mind wipe', costFormula: '50 I.S.P. and permanently lose 4 M.E.' },
      ],
    },
  },
  psionic_possession: {
    sources: [btsSource(114)],
    description:
      'Transfers the psychic\'s essence into another person\'s body. Retains own knowledge and identity; cannot read the host\'s mind or access their memory — controls the body like a living robot. Host is in a trance with no memory of possession; psychic\'s body is in a vulnerable coma. May return to own body at any time regardless of distance; host wakes instantly when essence departs.',
  },
  psionic_psi_sword: {
    sources: [btsSource(115)],
    prerequisites: [{ type: 'level_minimum', level: 3, label: 'Third level of experience (cannot select before level 3).' }],
    damage: {
      formula: '6D6 at level 3; +1D6 at levels 4, 7, 9, 12, and 15',
      notes: 'Minimum 2D6 or increased in +1D6 steps up to current maximum. Appearance reflects creator; damage is independent of form.',
    },
  },
  psionic_psychic_mirage_superior: {
    sources: [btsSource(115)],
    limitations: {
      otherLimitations:
        'Works on Earth, Nightlands, Astral Plane, and Dreamstream. Illusionary damage is not permanent; targets who believe they were killed collapse unconscious.',
    },
  },
  psionic_supercharge: {
    sources: [btsSource(115)],
    prerequisites: [{ type: 'psionic', psionicId: 'psionic_summon_inner_strength' }],
  },
  psionic_telekinetic_force_field: {
    sources: [btsSource(115)],
    limitations: {
      otherLimitations:
        'Smallest field: 3 ft (0.9 m) area. Largest: 10 ft (3.0 m) per level. Must be within line of sight; can be placed up to 40 ft (12.2 m) per level. Field cannot be moved once created. Multiple fields allowed as I.S.P. permits. Parry roll required to intercept an incoming attack.',
    },
  },
  psionic_telemechanics: {
    sources: [btsSource(115)],
    duration: {
      summary: '10 minutes plus 2 minutes per level of experience.',
      kind: 'minute',
      flat: 10,
      perLevel: '2 minutes',
    },
    baseSkill: {
      label: 'Machine operation',
      basePercent: 80,
      perLevel: 0,
      notes: '88% for computers; includes operation, repair, and access codes. Knowledge is temporary for the duration.',
    },
  },
}

function applyPatch(row, patch) {
  const next = structuredClone(row)
  Object.assign(next, patch)
  if (patch.prerequisites) delete next.psionicPrerequisites
  next.genrePlacements = [{ genreId: 'nightbane', category: 'super' }]
  next.gameSystems = ['nightbane']
  if (patch.sources) next.sources = patch.sources
  return next
}

export function buildBetweenShadowsSuperPsionics113115() {
  const byId = new Map(loadPsionicsFromDir(psionicsDir).map((row) => [row.id, row]))
  return BTS_SUPER_IDS.map((id) => {
    const row = byId.get(id)
    if (!row) throw new Error(`Missing catalog row for ${id}`)
    const patch = PATCHES[id] ?? { sources: [btsSource(row.sources?.[0]?.pageNumber ?? 113)] }
    return applyPatch(row, patch)
  })
}

if (process.argv[1]?.endsWith('build-between-shadows-psionics-super-113-115.mjs')) {
  for (const row of buildBetweenShadowsSuperPsionics113115()) {
    console.log(`  ${row.id} — ${row.name} (p.${row.sources?.[0]?.pageNumber})`)
  }
  console.log(`Built ${BTS_SUPER_IDS.length} master psionics`)
}
