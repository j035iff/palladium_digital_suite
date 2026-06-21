/**
 * Nightbane sensitive psionics (RPG pp. 71–77; section intro p. 70).
 * Export for sandbox writers; optional merge into production catalog.
 * Run: node scripts/build-nightbane-sensitive-psionics.mjs
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadPsionicsFromDir,
  writePsionicsToDir,
} from './lib/psionics-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')

const source = (page) => ({
  gameSystem: 'nightbane',
  reference: 'Nightbane RPG',
  pageNumber: page,
})

function row(entry) {
  const { sourcePage = 71, ...rest } = entry
  return {
    gameSystems: ['nightbane'],
    sources: [source(sourcePage)],
    genrePlacements: [{ genreId: 'nightbane', category: 'sensitive' }],
    ...rest,
  }
}

const catalog = [
  row({
    id: 'psionic_astral_projection',
    name: 'Astral Projection',
    sourcePage: 71,
    description:
      'Through intense concentration/meditation (4D4 minutes of preparation) the psychic frees his astral body from his physical form. A silver cord links astral and physical selves; severing it is likely fatal. The physical body falls into a helpless coma-like trance. Astral form can coexist in the material world (ghostly, visible to psychics, children under 13, animals, and most supernatural beings) or enter the astral plane. Material-world astral form can float, fly (Mach 1 / 670 mph max), see the invisible, pass through solid objects, and is impervious to physical harm, but cannot speak, smell, or touch the material plane except via telepathy or empathy. Astral body and silver cord each have Astral S.D.C. equal to twice combined physical H.P. and S.D.C.; cord is -6 to strike. Magic and psychic influence affect the astral body fully; exorcism forces the traveler to leave a 400 ft radius for 24 hours. Entering the astral plane requires ~1 minute of concentration; return requires percentile rolls (up to 3 per melee) until "definitely certain" (77–00). One minute material time equals one week astral plane time.',
    isp: { baseActivation: 8 },
    preparation: { summary: '4D4 minutes of concentration/meditation before projection.', minutes: '4D4' },
    range: { summary: 'Self' },
    duration: {
      summary: '5 minutes per level of experience.',
      kind: 'minute',
      perLevel: '5 minutes',
    },
    limitations: {
      selfOnly: true,
      concentrationRequired: true,
      otherLimitations:
        'Partner travel is safer. Material-plane return to where the body was left; if moved/hidden, 60% per melee to sense location. Astral plane return table: 1–30 hopelessly lost, 31–50 uncertain, 51–76 fairly certain, 77–00 definitely certain.',
    },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_clairvoyance',
    name: 'Clairvoyance',
    sourcePage: 72,
    description:
      'Meditation or intense concentration on a person, event, or place yields brief glimpses of a possible future. Unpredictable; not voluntary on/off. Failed skill roll means no insight but still costs I.S.P. and time. +5% base skill if the subject is a friend or loved one. May occur unintentionally as dreams/nightmares or rare waking flashes. Cannot act during a vision or it stops. Attemptable twice per day; usually 2D4 melees concentration before the image.',
    isp: { baseActivation: 4 },
    range: { summary: 'Self (image may pertain to people or places thousands of miles away).' },
    duration: { summary: '6D6 melees', kind: 'melee_round', durationValue: '6D6' },
    baseSkill: {
      label: 'Clairvoyance',
      basePercent: 58,
      perLevel: 2,
      notes: '+5% if subject is friend or loved one.',
    },
    limitations: {
      selfOnly: true,
      otherLimitations: 'Brief glimpses only — not a full motion picture of the future.',
    },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_death_trance',
    name: 'Death Trance',
    sourcePage: 72,
    description:
      'Mind over matter slows metabolism to suspended animation, simulating death. Without hospital facilities a medical doctor is 1–89% likely to believe the character is dead. Drugs, toxins, and chemicals are slowed but take full effect when the trance ends unless treated first. Cannot be roused or respond to stimulation, including psychic probes; incapable of attack or defense until broken.',
    isp: { baseActivation: 2 },
    range: { summary: 'Self' },
    duration: {
      summary: 'As long as needed, up to four days maximum.',
      kind: 'day',
      durationValue: 4,
    },
    limitations: { selfOnly: true },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_divination',
    name: 'Divination',
    sourcePage: 73,
    description:
      'Precognitive impressions of the future via fortunetelling focus items — less accurate and detailed than clairvoyance; no image, sound, or tangible memory, only impression. Requires 15–20 minutes meditation. Cannot answer highly specific questions; answers should stay general. Diviner may read own future at -10% skill penalty, or one other person\'s future with up to 13 questions (roll per question). Character must select one or two divination focus methods; cannot divine without them.',
    isp: { baseActivation: 3 },
    range: { summary: 'Self' },
    duration: { summary: '2D4 minutes', kind: 'minute', durationValue: '2D4' },
    baseSkill: {
      label: 'Divination',
      basePercent: 42,
      perLevel: 2,
      notes: '-10% when reading own future.',
    },
    limitations: {
      otherLimitations: 'Limited to one or two chosen divination focus methods.',
    },
    subAbilities: [
      { id: 'arithmancy', name: 'Arithmancy', description: 'Numbers in patterns or random selection.' },
      { id: 'astragalomancy', name: 'Astragalomancy', description: 'Dice or marked bones; includes rune casting.' },
      { id: 'belomancy', name: 'Belomancy', description: 'Thrown arrows and ground patterns.' },
      { id: 'cartomancy', name: 'Cartomancy', description: 'Tarot or playing cards.' },
      { id: 'cephalomancy', name: 'Cephalomancy', description: 'Skull bumps and depressions.' },
      { id: 'chiromancy', name: 'Chiromancy', description: 'Palmistry — palm lines.' },
      { id: 'crystallomancy', name: 'Crystallomancy', description: 'Crystal ball focus.' },
      { id: 'empromancy', name: 'Empromancy', description: 'Sacrificial fire, smoke, and flame shapes.' },
      { id: 'geomancy', name: 'Geomancy', description: 'Tossed pebbles and patterns.' },
      { id: 'hydromancy', name: 'Hydromancy', description: 'Ripples in a small pool of water.' },
      { id: 'ichthyomancy', name: 'Ichthyomancy', description: 'Fish entrails.' },
      { id: 'kleidomancy', name: 'Kleidomancy', description: 'Pendulum over alphabet; related to Ouija.' },
      { id: 'lecanomancy', name: 'Lecanomancy', description: 'Gems dropped in still water.' },
      { id: 'molybdomancy', name: 'Molybdomancy', description: 'Molten lead patterns.' },
      { id: 'numerology', name: 'Numerology', description: 'Name and birth date number analysis.' },
      { id: 'pessomancy', name: 'Pessomancy', description: 'Random pebble size/shape/texture.' },
      { id: 'phyllorhodomancy', name: 'Phyllorhodomancy', description: 'Rose petals and leaves.' },
      { id: 'pyromancy', name: 'Pyromancy', description: 'Flames, smoke, and sparks.' },
      { id: 'tasseography', name: 'Tasseography', description: 'Tea leaf reading.' },
      { id: 'xylomancy', name: 'Xylomancy', description: 'Thrown spikes; related to I Ching.' },
    ],
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_empathy',
    name: 'Empathy',
    sourcePage: 74,
    description:
      'Awareness of emotions in other people, animals, and supernatural creatures. Strongest emotions (hate, anger, terror, love) are easiest. Cannot pinpoint invisible/hiding targets, but can establish something is nearby. Useful with ghosts and supernatural beings. Can compare emotions to verbal responses (circumstantial, not court-admissible). Haunting ghosts rarely mask emotions.',
    isp: { baseActivation: 4 },
    range: { summary: '100 foot area (30.5 m)', kind: 'area' },
    duration: {
      summary: 'Two minutes (8 melees) per level of experience.',
      kind: 'melee_round',
      perLevel: '8 melees',
    },
    save: {
      summary: 'Standard; save once each melee. Mind block prevents empathic reading.',
      saveKind: 'standard',
    },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_empathic_transmission',
    name: 'Empathic Transmission',
    sourcePage: 74,
    description:
      'Instill a powerful emotion into one living creature (person, animal, or supernatural being) per attack. Usually 2 or 3 empathic attacks per melee.',
    isp: { baseActivation: 6 },
    range: { summary: '60 feet (18.2 m)' },
    duration: { summary: '2D6 minutes', kind: 'minute', durationValue: '2D6' },
    save: { summary: 'Standard', saveKind: 'standard' },
    limitations: { attacksPerMeleeLimit: 'Equal to individual psychic attacks per melee; one target per transmission.' },
    subAbilities: [
      {
        id: 'despair_sorrow',
        name: 'Despair or Sorrow',
        description: '50% chance victim surrenders or leaves without battle; -2 parry and dodge.',
      },
      {
        id: 'confusion',
        name: 'Confusion',
        description: '-3 strike, parry, dodge; lose initiative.',
      },
      {
        id: 'fear',
        name: 'Fear',
        description: '-3 strike, parry, dodge; 66% chance to turn and run.',
      },
      {
        id: 'hate_anger',
        name: 'Hate or Anger',
        description: '60% chance to attack/harm/betray disliked targets; +1 strike, -1 parry and dodge.',
      },
      {
        id: 'love_peacefulness',
        name: 'Love or Peacefulness',
        description: '60% chance hostile opponents reconsider, show mercy, or leave without cruelty.',
      },
      {
        id: 'trust',
        name: 'Trust',
        description: 'Victims believe what the psionic tells them while influenced; life-threatening suggestions against deep ideals grant +3 save.',
      },
    ],
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_meditation',
    name: 'Meditation',
    sourcePage: 74,
    innateStarter: true,
    description:
      'Mental discipline through focus on a notion, object, or mantra to achieve relaxation, insight, or harmony. Often required to use psychic and magic powers. Not a psychic power per se — costs no I.S.P.',
    isp: { baseActivation: 'none', notes: 'Costs no I.S.P.' },
    range: { summary: 'Self' },
    duration: { summary: 'Varies with the person\'s needs.', kind: 'special' },
    limitations: { selfOnly: true },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_mediumship_clairsentience',
    name: 'Mediumship/Clairsentience (Seance)',
    sourcePage: 74,
    description:
      'Opens the psychic as a beacon to ghosts/entities and as a medium for communication. Operates as temporary possession of a seance participant (mediator asks questions) or direct medium channel. Communications are brief (seldom over five minutes). Seance chain of hand-holders contributes P.P.E. (+2% base skill per P.P.E. point contributed; opposed participants -2% per P.P.E.). Breaking the hand-holding chain instantly ends the seance. Non-psychic seances use linked P.P.E. as base skill percent.',
    isp: { baseActivation: 4 },
    range: { summary: 'Self' },
    duration: {
      summary: '2D4 minutes active contact, plus 3D4 minutes preparation.',
      kind: 'minute',
      durationValue: '2D4',
    },
    baseSkill: {
      label: 'Seance success',
      basePercent: 30,
      perLevel: '2% per P.P.E. point drawn on (including seance chain)',
    },
    limitations: {
      otherLimitations:
        'Requires at least one other participant; medium remembers nothing while possessed. Nega-psychic in chain: -4% per P.P.E. point.',
    },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_mind_block',
    name: 'Mind Block',
    sourcePage: 75,
    description:
      'Completely close oneself from psychic/mental emanations. While blocked, cannot sense, use psionics, or be influenced by others. Blocks telepathy, empathy, hypnotic suggestion, and empathic transmission. +1 to save vs all psychic and mental attacks.',
    isp: { baseActivation: 4, notes: '4 I.S.P. per each 10-minute duration period.' },
    range: { summary: 'Self' },
    duration: {
      summary: '10 minutes per level of experience.',
      kind: 'minute',
      perLevel: '10 minutes',
    },
    save: { summary: 'None', saveKind: 'none' },
    combatBonuses: { save_vs_psionics: 1 },
    limitations: {
      selfOnly: true,
      cannotUseWhile: ['sensing supernatural forces', 'using other psionic powers'],
    },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_object_read',
    name: 'Object Read (Psychometry)',
    sourcePage: 75,
    description:
      'Receive impressions and images from an object about its use, history, and last owner by touch and concentration. Impressions cover alignment, emotional state, purpose, whether last owner lives, magic/supernatural use, enchantment/possession. Images show brief past-event snippets. Present glimpse costs +4 I.S.P. with no success guarantee. Once read by the same psychic, an object cannot be read again by them even on failure. Possessed items make reader vulnerable to psychic attack (no save bonuses).',
    isp: { baseActivation: 6, notes: '+4 I.S.P. for optional present glimpse.' },
    range: { summary: 'Touch' },
    duration: { summary: 'Varies; usually about 2D6 minutes.', kind: 'minute', durationValue: '2D6' },
    save: { summary: 'None', saveKind: 'none' },
    baseSkill: [
      { label: 'Impressions', basePercent: 56, perLevel: 2 },
      { label: 'Images', basePercent: 48, perLevel: 2 },
      { label: 'Present', basePercent: 38, perLevel: 2 },
    ],
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_presence_sense',
    name: 'Presence Sense',
    sourcePage: 75,
    innateStarter: true,
    description:
      'Sixth-sense alert to supernatural and magic creatures in the area. Cannot pinpoint location but indicates near (within 50 ft) vs far (beyond 90 ft) and vague count: one (1–2), few (3–6), several (7–14), or many (15+). Human presences sensed with less accuracy — feeling of "we are not alone" only (~50% accurate on count).',
    isp: { baseActivation: 4 },
    range: { summary: '120 foot / 36 m area', kind: 'area' },
    duration: {
      summary: '2 minutes (8 melees) per level of experience.',
      kind: 'melee_round',
      perLevel: '8 melees',
    },
    save: { summary: 'None', saveKind: 'none' },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_see_aura',
    name: 'See Aura',
    sourcePage: 76,
    innateStarter: true,
    description:
      'Perceive auras on visible targets within range. Indicates general experience level (low 1–3, medium 4–7, high 8+), presence of magic (not power level), psychic abilities, high/low base P.P.E., possessing entity, and unusual human aberration (serious illness, non-human, or mutant — not which). Cannot determine alignment from see aura. Mind block hides psychic abilities, P.P.E. level, and possession.',
    isp: { baseActivation: 6 },
    range: { summary: '60 feet (18.3 m); target must be visible.' },
    duration: { summary: '2 melees (30 seconds)', kind: 'melee_round', durationValue: 2 },
    save: { summary: 'None; mind block hides relevant aura data.', saveKind: 'none' },
    durationType: 'instant',
  }),
  row({
    id: 'psionic_see_the_invisible',
    name: 'See the Invisible',
    sourcePage: 76,
    description:
      'See forces, objects, and creatures that are invisible or naturally invisible, including ghosts, entities, and astral bodies (vaporous image or energy sphere).',
    isp: { baseActivation: 4 },
    range: { summary: '120 foot / 36 m' },
    duration: {
      summary: '1 minute per level of experience.',
      kind: 'minute',
      perLevel: '1 minute',
    },
    save: { summary: 'None', saveKind: 'none' },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_sense_evil',
    name: 'Sense Evil',
    sourcePage: 76,
    innateStarter: true,
    description:
      'Refined sense of supernatural evil. Psychic sensitives automatically feel supernatural evil without spending I.S.P.; using the power gives clearer detail. Indicates count (one, few 2–6, several 7–14, many 15+), intensity, and location (room, possessed object/person, or distance: very near within 15 ft, near within 50 ft, far 60–140 ft). Can track like a bloodhound. Human evil only if immediate evil intent plus psychic powers or psychosis; mind block masks intent.',
    isp: { baseActivation: 2, notes: 'Automatic vague sense of supernatural evil costs no I.S.P.' },
    range: { summary: '140 foot / 42.7 m area', kind: 'area' },
    duration: {
      summary: '2 minutes (8 melees) per level of experience.',
      kind: 'melee_round',
      perLevel: '8 melees',
    },
    save: { summary: 'None', saveKind: 'none' },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_sense_magic',
    name: 'Sense Magic',
    sourcePage: 76,
    description:
      'Feel magic energy; near (within 20 ft) vs far (up to 120 ft) and trace to place, room, person, or object. Sense enchanted items, active spells (not psychic powers), magic use in area, and spellcasting. Invisible magical creatures/objects trace only to general area.',
    isp: { baseActivation: 3 },
    range: { summary: '120 foot / 36 m area', kind: 'area' },
    duration: {
      summary: '2 minutes per level of experience.',
      kind: 'minute',
      perLevel: '2 minutes',
    },
    save: { summary: 'None', saveKind: 'none' },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_sixth_sense',
    name: 'Sixth Sense',
    sourcePage: 76,
    description:
      'Automatic precognitive flash of imminent life-threatening danger to self or someone cared about within 90 ft, within the next 60 seconds (4 melees). Triggered only by unexpected danger already in motion — not callable for traps/ambush. Inoperative if all I.S.P. expended.',
    isp: { baseActivation: 2 },
    range: { summary: '90 feet / 27.4 m (self or cared-for ally)' },
    duration: { summary: 'Until the danger passes or happens.', kind: 'until_condition' },
    save: { summary: 'None', saveKind: 'none' },
    combatBonuses: {
      initiative: 6,
      parry: 2,
      dodge: 3,
    },
    limitations: {
      otherLimitations:
        'Bonuses apply only to the initial melee when the attack occurs. Cannot be surprised from behind.',
    },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_speed_reading',
    name: 'Speed Reading',
    sourcePage: 77,
    description:
      'Read and comprehend written text extremely quickly at 30 pages per minute (4 melees); retention is normal. Highly technical texts halve speed to 15 pages/minute and may require two readings.',
    isp: { baseActivation: 2 },
    range: { summary: 'Self' },
    duration: {
      summary: '3 minutes per level of experience.',
      kind: 'minute',
      perLevel: '3 minutes',
    },
    limitations: { selfOnly: true },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_suggestion',
    name: 'Suggestion (Hypnosis)',
    sourcePage: 77,
    description:
      'Psychically boosted simple hypnosis: calm, light sleep, focus on a thought, or implant subtle ideas through conversation. Cannot create full mind control or absurd compulsions. Successful save means idea not implanted; may retry at cost of another 2 I.S.P. per idea.',
    isp: { baseActivation: 2, perTarget: '2 per idea or implant attempt' },
    range: { summary: '12 feet / 3.6 m with eye contact.' },
    duration: {
      summary: 'Varies; rarely more than a few hours maximum.',
      kind: 'special',
    },
    save: { summary: 'Standard', saveKind: 'standard' },
    durationType: 'narrative',
  }),
  row({
    id: 'psionic_telepathy',
    name: 'Telepathy',
    sourcePage: 77,
    description:
      'Read surface thoughts of one focused target at a time (not deep memory; no simultaneous multi-target reading). Limited one-way message sending to one person — brief, clear thoughts only. Two-way telepathic conversation only between two telepathic psychics. Mind block prevents probes and communication.',
    isp: { baseActivation: 4 },
    range: {
      summary:
        'Read surface thoughts up to 60 ft (18.3 m); two-way telepathic communication up to 140 ft (42.7 m).',
    },
    duration: {
      summary: '2 minutes per level of experience.',
      kind: 'minute',
      perLevel: '2 minutes',
    },
    save: {
      summary: 'Conditional — standard save if target suspects probing. Mind block prevents contact.',
      saveKind: 'conditional',
    },
    durationType: 'narrative',
  }),
]

/** Physical-section rows that must not be re-written by the sensitive builder. */
export const SENSITIVE_BUILD_EXCLUDE_IDS = [
  'psionic_summon_inner_strength',
  'psionic_total_recall',
]

/** @param {{ maxSourcePage?: number, excludeIds?: string[] }} [options] */
export function buildNightbaneSensitivePsionics(options = {}) {
  const { maxSourcePage = Infinity, excludeIds = SENSITIVE_BUILD_EXCLUDE_IDS } = options
  const excluded = new Set(excludeIds)
  return catalog.filter((entry) => {
    if (excluded.has(entry.id)) return false
    const page = entry.sources?.[0]?.pageNumber
    return page == null || page <= maxSourcePage
  })
}

if (process.argv[1] && process.argv[1].endsWith('build-nightbane-sensitive-psionics.mjs')) {
  const sensitiveIds = new Set(catalog.map((row) => row.id))
  const existing = loadPsionicsFromDir(psionicsDir).filter(
    (row) => row?.id && !sensitiveIds.has(row.id),
  )

  const merged = [...existing, ...catalog].sort((a, b) => a.id.localeCompare(b.id))
  writePsionicsToDir(psionicsDir, merged)
  console.log(
    `Wrote ${catalog.length} sensitive psionics (${merged.length} total) under ${psionicsDir}`,
  )
}
