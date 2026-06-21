/**
 * Nightbane Alien Shape — sandbox re-ingest (production-seeded).
 *
 * Copies production verbatim, then patches descriptions + structured mechanics
 * from book PDFs. Does NOT change trait roster, ids, percentiles, or tableCategory.
 *
 * Run: node scripts/build-nightbane-alien-shape-sandbox.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sortSourcesByGenreReferenceOrder } from './lib/genre-source-reference-order.mjs'
import {
  normalizeSkillCatalogId,
  normalizeSkillReferencesInJson,
} from './lib/normalize-skill-id.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const productionPath = join(root, 'src/data/content/morphus/tables/alien_shape.json')
const sandboxPath = join(
  root,
  'src/data/source/ingest-briefs/output/nightbane-morphus-alien_shape-sandbox.json',
)

function deepClone(value) {
  return structuredClone(value)
}

/** Dark Designs Alien Shape Table I default — table intro line. */
const ALIEN_SHAPE_IMPOSSIBLE_SOCIAL_SKILLS = [
  { targetType: 'skill_id', targetValue: 'skill_disguise', impossibleInMorphus: true },
  { targetType: 'skill_id', targetValue: 'skill_seduction', impossibleInMorphus: true },
  { targetType: 'skill_id', targetValue: 'skill_undercover_ops', impossibleInMorphus: true },
]

/** Traits sourced from Dark Designs Table I (core + WB6). */
const DARK_DESIGNS_TABLE_I_TRAIT_IDS = new Set([
  'alien_shape_bony_exoskeleton',
  'alien_shape_crystalline',
  'alien_shape_hulking_monster',
  'alien_shape_living_tattoos',
  'alien_shape_mouth_covered_body',
  'alien_shape_plasmoid',
  'alien_shape_unusual_skin_color',
])

function overrideKey(override) {
  return `${override.targetType ?? 'skill_id'}:${override.targetValue}`
}

function mergeSkillOverride(existing, incoming) {
  if (!existing) return incoming
  const next = { ...existing, ...incoming }
  if (incoming.impossibleInMorphus === true) next.impossibleInMorphus = true
  if (existing.impossibleInMorphus === true) next.impossibleInMorphus = true
  if (incoming.modifierPercent != null && existing.modifierPercent == null) {
    next.modifierPercent = incoming.modifierPercent
  }
  if (incoming.grantUnlearnedValue != null && existing.grantUnlearnedValue == null) {
    next.grantUnlearnedValue = incoming.grantUnlearnedValue
  }
  return next
}

function mergeSkillModifiers(base, patch) {
  const merged = new Map()
  for (const row of base?.specificSkillOverrides ?? []) {
    const normalized = { ...row }
    if (normalized.targetType === 'skill_id') {
      const canonical = normalizeSkillCatalogId(normalized.targetValue)
      if (canonical) normalized.targetValue = canonical
    }
    merged.set(overrideKey(normalized), normalized)
  }
  for (const row of patch?.specificSkillOverrides ?? []) {
    const normalized = { ...row }
    if (normalized.targetType === 'skill_id') {
      const canonical = normalizeSkillCatalogId(normalized.targetValue)
      if (canonical) normalized.targetValue = canonical
    }
    merged.set(overrideKey(normalized), mergeSkillOverride(merged.get(overrideKey(normalized)), normalized))
  }
  const specificSkillOverrides = [...merged.values()]
  const next = { ...(base ?? {}), ...(patch ?? {}) }
  if (specificSkillOverrides.length) next.specificSkillOverrides = specificSkillOverrides
  return Object.keys(next).length ? next : undefined
}

function applyDarkDesignsSocialSkillDefaults(entry) {
  if (!DARK_DESIGNS_TABLE_I_TRAIT_IDS.has(entry.id)) return entry
  const next = deepClone(entry)
  next.skillModifiers = mergeSkillModifiers(next.skillModifiers, {
    specificSkillOverrides: ALIEN_SHAPE_IMPOSSIBLE_SOCIAL_SKILLS,
  })
  return next
}

/** Patch description/mechanics only — never id, name, percentile, tableCategory. */
const BOOK_PATCHES = {
  alien_shape_abnormally_large_sensory_organs: {
    description:
      'The eyes, ears, nose, tongue and fingertips of this Nightbane are extremely large, but the senses are proportionately better too.',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_plant_life: {},
  alien_shape_armored_scales: {
    description:
      "Thick, heavy scales like an alligator's cover the Nightbane like armor, protecting him and adding to his frightening, alien appearance.",
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_baggy_flaps_of_skin: {
    description:
      "The character's skin seems too large for his body, or there seems to be too much skin for his frame, causing it to sag, flap, and fold in triple and quadruple layers all over. This occurs most prominently at the neck, upper arms, legs and belly, but the skin sags everywhere.",
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 73 }],
    customOneOffs: ['Can easily hide small objects beneath the folds of skin.'],
    skillModifiers: {
      specificSkillOverrides: [
        { targetType: 'skill_id', targetValue: 'skill_concealment', modifierPercent: 25 },
        { targetType: 'skill_id', targetValue: 'skill_disguise', modifierPercent: -30 },
        { targetType: 'category', targetValue: 'physical', modifierPercent: -10 },
      ],
    },
  },
  alien_shape_bony_exoskeleton: {
    description:
      'The Nightbane is covered with bone-like plates or large scales, often with horn-like protrusions and short spikes.',
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 136 },
    ],
  },
  alien_shape_brute: {
    description:
      'Increase body size and weight by 50%, limbs are muscular and thick, teeth have fangs and the Brute has claws in place of fingernails. Body hair is dense and looks more like fur, and the face has a Neanderthal appearance.',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 73 }],
  },
  alien_shape_cone_head: {
    description:
      "The character's head is elongated and conical rather like the aliens in the movie of the same name, or straight up as if the forehead was 4x higher than usual.",
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 73 }],
    skillModifiers: {
      specificSkillOverrides: [
        { targetType: 'skill_id', targetValue: 'skill_acrobatics', modifierPercent: -10 },
        { targetType: 'skill_id', targetValue: 'skill_climbing', modifierPercent: -10 },
        { targetType: 'skill_id', targetValue: 'skill_gymnastics', modifierPercent: -10 },
        { targetType: 'skill_id', targetValue: 'skill_disguise', modifierPercent: -30 },
      ],
    },
  },
  alien_shape_crystalline: {
    description:
      'The character looks predominately human, but has crystals that resemble quartz or diamonds growing out of his skin along the fingers, the bones of the hands, along the back of the arms up and down the spine and at the elbow, shoulders and knees. The head can look completely human or the hair can be replaced with a cap of crystals or a crown of tall, jutting crystal.',
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 136 },
    ],
  },
  alien_shape_hulking_monster: {
    description:
      'The character transforms into a huge, hulking brute with a large barrel chest, hunched back, long gorilla-like arms, and a comparatively tiny (human-sized) head. The face may be human, alien, animal, or monstrous in appearance.',
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 136 },
    ],
    customOneOffs: [
      'The misshapen hulk stands 1D6+6 feet (2.1 to 3.7 m) tall (and that’s with a hunched back).',
      'Weighs 800 pounds (360 kg) per every foot (0.3 m) of height (Dark Designs).',
    ],
  },
  alien_shape_living_tattoos: {
    description:
      "The Nightbane's skin is covered with tattoos. Unlike normal body decorations, however, these tattoos change and move! The changes may reflect the character's current state of mind (i.e., an angry Nightbane might suddenly display violent or threatening tattoos) or might be controlled directly by the character (50-50 chance or select one). In the first case, the Nightbane has no control over the tattoos; they react to his emotions and may start squirming at any given moment.",
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 136 },
    ],
    customOneOffs: [],
  },
  alien_shape_mouth_covered_body: {
    description:
      "The Nightbane's body is covered by 2D6x10 tiny mouths! The mouths can make gestures, stick out their tongues, whistle, hoot, growl or even scream in a hellish chorus. However, they cannot speak. The character can also grapple an enemy and let the tiny mouths bite him (this inflicts 1D4 damage per mouth; typically 1D6 mouths will bite at the same time).",
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 136 },
    ],
  },
  alien_shape_multiple_heads: {
    description:
      'The Nightbane has two or more heads resting on his shoulders (01-75% two heads, 76-98% three, 99-00% four heads). These heads usually have the same personality, however Nightbane with multiple personalities or multiple Morphus characteristics could have a different head for each personality or each Morphus. Each head is capable of speech and can look in a different direction from the others.',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_no_bones: {
    description:
      'This Nightbane may appear normal (or as other Morphus forms allow), but his freakish movement suggests he has no bones. The arms, legs, neck, etc., move and bend any which way, yet somehow the appendages and body parts keep their shape.',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
    customOneOffs: [
      'Does not allow the Nightbane any type of stretching power or shape shifting abilities.',
    ],
  },
  alien_shape_on_fire: {
    description:
      'This is an odd one, perhaps the product of someone who is deathly afraid of fire, or fascinated by it. The Nightbane remains unchanged in appearance except that he is on fire in Morphus form. The fire may only cover his head, neck and shoulders or the entire body. This fire cannot be put out as it does not rely on oxygen (though the Nightbane still needs air to breathe), nor does it produce smoke. Even stranger, the flames catch flammable items on fire only when the Nightbane wishes it (although scorch marks are left everywhere).',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 73 }],
    skillModifiers: {
      specificSkillOverrides: [
        { targetType: 'skill_id', targetValue: 'skill_prowl', impossibleInMorphus: true },
      ],
    },
    customOneOffs: [],
  },
  alien_shape_plasmoid: {
    description:
      "The Nightbane's body has a semi-liquid consistency; he is made up of jelly-like blood! The basic shape of the character remains that of a bipedal humanoid (it can even have the exact outline of his Facade), but it can be changed at will, stretched, spread or even puddled into any shape the character wills.",
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 135 },
    ],
  },
  alien_shape_shadow_man: {
    description:
      'This character appears pitch black, like a three-dimensional shadow or silhouette with no visible features. Makes no sound when he moves and is 80% invisible in darkness (this does not count if lights, such as street lamps or headlights, are turned on the Nightbane).',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_shaggy_hairy: {
    description:
      "The Nightbane's body is covered by thick, shaggy hair. The hair can be any color the player desires, even unnatural colors like green or blue. The hair covers every part of the Nightbane's body except the palms of the hands and the soles of the feet. It may even cover the face and hang over the eyes unless it is moved aside, or the face may be more like an orangutan, hairy everywhere but on the face around the eyes, nose and mouth.",
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_slimy_slug_like_skin: {
    description:
      "Disgusting slime-covered skin that moves and ripples in strange ways covers the Nightbane's body. The Nightbane leaves slime on everything he touches (-10% to Prowl) and everyone who touches him needs to save vs Horror Factor or they will be so disgusted that they can't bear to touch him again.",
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_unusual_skin_color: {
    description:
      "The Nightbane's skin has an inhuman hue. The color is too intense and sharp to be normal, body paint or dyes. Colors can include shades of yellows, reds, greens, blues, purple/violets, copper, gold, metallic grey, silver, pitch black, and stark white. Roll or pick one.",
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core Rulebook', pageNumber: 103 },
      { gameSystem: 'nightbane', reference: 'Dark Designs (WB6)', pageNumber: 136 },
    ],
    customOneOffs: [],
  },
  alien_shape_wrinkled_skin: {
    description:
      'The body is covered by a tough, wrinkled hide similar to that of a rhinoceros.',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane Survival Guide (WB5)', pageNumber: 72 }],
  },
  alien_shape_combination_of_two: {},
}

/** Entries that stay verbatim from production (roster / user catalog policy). */
const PRODUCTION_VERBATIM_IDS = new Set([
  'alien_shape_plant_life',
  'alien_shape_combination_of_two',
])

/** Book-only playable traits (DD Table I) — logged; user ruled: keep production roster. */
export const BOOK_ONLY_TRAITS = ['Bark-like Skin', 'Thorns']

/** Production catalog choices retained by user ruling. */
export const PRODUCTION_ONLY_TRAITS = ['Alien Plantlife', 'Combination of 2']

function applyPatch(entry, productionEntry) {
  if (PRODUCTION_VERBATIM_IDS.has(entry.id)) return deepClone(productionEntry)
  const patch = BOOK_PATCHES[entry.id]
  if (!patch || Object.keys(patch).length === 0) return deepClone(productionEntry)
  const next = deepClone(productionEntry)
  for (const [key, value] of Object.entries(patch)) {
    if (['id', 'name', 'percentile', 'tableCategory'].includes(key)) continue
    if (key === 'skillModifiers') {
      next.skillModifiers = mergeSkillModifiers(next.skillModifiers, value)
      continue
    }
    next[key] = deepClone(value)
  }
  return next
}

export function buildNightbaneAlienShapeSandbox() {
  const production = JSON.parse(readFileSync(productionPath, 'utf8'))
  const table = deepClone(production)
  const bands = production.description.includes('Percentile bands:')
    ? production.description.split('Percentile bands:')[1].trim()
    : ''
  table.description =
    'Alien Shape Morphus table (Nightbane Core Rulebook, p. 103; Nightbane Survival Guide (WB5), pp. 72-73; Dark Designs (WB6), pp. 135-136). ' +
    'In most cases, Disguise, Seduction and Undercover Ops skills are impossible (Dark Designs). ' +
    (bands ? `Percentile bands: ${bands}` : production.description)
  table.entries = production.entries.map((entry) => {
    let next = applyPatch(entry, entry)
    next = applyDarkDesignsSocialSkillDefaults(next)
    if (next.sources?.length > 1) {
      next.sources = sortSourcesByGenreReferenceOrder('nightbane', next.sources)
    }
    return next
  })
  normalizeSkillReferencesInJson(table)
  return table
}

const promote = process.argv.includes('--promote')

if (process.argv[1]?.endsWith('build-nightbane-alien-shape-sandbox.mjs')) {
  const table = buildNightbaneAlienShapeSandbox()
  mkdirSync(dirname(sandboxPath), { recursive: true })
  writeFileSync(sandboxPath, `${JSON.stringify(table, null, 2)}\n`, 'utf8')
  console.log(`OK  seeded ${table.entries.length} traits from production → ${sandboxPath}`)
  if (promote) {
    writeFileSync(productionPath, `${JSON.stringify(table, null, 2)}\n`, 'utf8')
    console.log(`OK  promoted sandbox → ${productionPath}`)
  }
  console.log(`    Book-only (needs ruling): ${BOOK_ONLY_TRAITS.join(', ')}`)
  console.log(`    Production-only vs DD Table I: ${PRODUCTION_ONLY_TRAITS.join(', ')}`)
}
