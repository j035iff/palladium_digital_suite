/**
 * Through the Glass Darkly Mirrormage spells (pp. 71–76).
 * Run: node scripts/build_mirror_spells.mjs
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(root, 'src/data/content/magic/mirror.json');
const SCHEMAS_DIR = join(root, 'src/data/schemas');
const SOURCE = 'Through the Glass Darkly';

const SCRYING_LIMITATIONS =
  '1. May only look out of mirrors already seen (must be where expected). 2. Live sequence only — no past/future or fast-forward. 3. True mirrored surfaces only — not window glass or polished metal.';

function src(pageNumber) {
  return [{ gameSystem: 'nightbane', reference: SOURCE, pageNumber }];
}

function base(id, name, spellLevel, description, fields = {}) {
  const {
    pageNumber,
    magicKind,
    isRitual,
    spellStrengthBase,
    tags,
    ppe,
    range,
    duration,
    save,
    extra,
    ...rest
  } = fields;
  return {
    id,
    name,
    description,
    gameSystems: ['nightbane'],
    sources: src(pageNumber ?? 72),
    school: 'mirror',
    spellLevel,
    magicKind: magicKind ?? 'enchantment',
    isRitual: isRitual ?? false,
    spellStrengthBase: spellStrengthBase ?? (isRitual ? 16 : 12),
    tags: tags ?? ['mirrormagic'],
    ppe: ppe ?? { baseActivation: 0 },
    range: range ?? { summary: 'Touch', kind: 'touch' },
    duration: duration ?? { summary: 'Instant', kind: 'instant' },
    save: save ?? { summary: 'None', saveKind: 'none' },
    ...rest,
    ...extra,
  };
}

function ritual(id, name, spellLevel, description, fields = {}) {
  return base(id, name, spellLevel, description, {
    ...fields,
    isRitual: true,
    magicKind: 'ritual',
  });
}

const HIDDEN_REFLECTION_AFTEREFFECTS = {
  rollKind: 'd100',
  label: 'Hidden Reflection — aftereffects (61–80 or 31–40 recovery)',
  entries: [
    { percentile: { min: 1, max: 15 }, label: 'Shaken', effect: 'Shaken but okay; appears before the shattered mirror.' },
    { percentile: { min: 16, max: 30 }, label: 'Mirror fear', effect: 'Afraid to use mirrors for 1D6 days.' },
    {
      percentile: { min: 31, max: 55 },
      label: 'Mirror magic fear',
      effect: 'Afraid to use mirror magic for 2D6 days; mirrors make the character nervous.',
    },
    {
      percentile: { min: 56, max: 75 },
      label: 'Wrong reflection',
      effect: 'Afraid the reflection is not their own for 4D6 days; avoids mirrors and mirror magic.',
    },
    {
      percentile: { min: 76, max: 100 },
      label: 'Paranoid glimpses',
      effect: 'Sees movement in mirror reflections from the corner of the eye; paranoid for 1D6 days.',
    },
  ],
};

const SPELLS = [
  base('magic_mirror_manipulate_reflection', 'Manipulate Reflection', 1,
    'The Mirrormage may cast this spell either on a person (or creature), or on a mirror or reflective surface. If cast on a person (who may attempt to save), all reflections cast by that person for the duration of the spell are subtly altered — blood-red eyes, scars, sneers, blood stains, sickly pallor, strange runes, etc. The spell cannot prevent someone from casting a reflection, make their reflection look like someone else, or other gross disguises, but can incriminate, intimidate, and terrify. When cast upon a mirror or reflective surface, all reflections in that mirror are subtly changed (more youthful, hints of movement or objects not present, etc.). Only those looking into the mirror can see these illusionary aberrations.',
    {
      pageNumber: 72,
      tags: ['mirrormagic', 'illusion', 'utility'],
      ppe: { baseActivation: 4 },
      range: { summary: '20 feet (6 m)', kind: 'distance', distanceValue: 20, distanceUnit: 'feet' },
      duration: { summary: 'One day per level of experience.', kind: 'day', perLevel: '1 day' },
      save: { summary: 'Standard (person target only)', saveKind: 'conditional', notes: 'Mirror surface target — no save.' },
      effectProfiles: [
        {
          name: 'Enchant person',
          description: 'Alter how one person or creature\'s reflections appear.',
          save: { summary: 'Standard', saveKind: 'standard' },
        },
        {
          name: 'Enchant mirror',
          description: 'Alter all reflections appearing in one mirror or reflective surface.',
        },
      ],
    }),

  base('magic_mirror_mirror_calling', 'Mirror Calling', 1,
    'The Mirrormage can look into a mirror and call the name of a friend, ally or enemy, and be heard through any mirror that individual may look into. The call is limited to the person\'s name and three additional words (e.g. "Thom, help me," or "Collins, I\'ll get you"). The voice is always recognizable; magic only works on people the caster knows well, and only that specific person hears the message even if others use the mirror. The target must be looking into a mirror while the message is transmitted. Once the message is heard, it stops.',
    {
      pageNumber: 73,
      tags: ['mirrormagic', 'communication'],
      ppe: { baseActivation: 4 },
      range: { summary: 'Special — heard through any mirror the target looks into.', kind: 'special' },
      duration: { summary: 'Half an hour per level of experience.', kind: 'special', perLevel: '30 minutes' },
      limitations: {
        otherLimitations: 'Name plus three words maximum. Target must be looking into a mirror when transmitted.',
      },
    }),

  base('magic_mirror_aura_mirror', 'Aura Mirror', 2,
    'Cast upon a mirror up to 20 feet (6 m) away; affects all who look into it. For the duration, all who gaze into the mirror see their aura. Those who can interpret auras learn strength, health, general power level, good/selfish/evil lean, and human vs inhuman (not specific creature type). Those unused to auras are −3 on initiative and perception rolls until they look away or act.',
    {
      pageNumber: 73,
      tags: ['mirrormagic', 'detection'],
      ppe: { baseActivation: 6 },
      range: { summary: 'Cast on mirror up to 20 feet (6 m); affects viewers.', kind: 'distance', distanceValue: 20, distanceUnit: 'feet' },
      duration: { summary: 'Half an hour per level of experience.', kind: 'special', perLevel: '30 minutes' },
      reveals: ['aura', 'power_level_band', 'alignment_lean', 'human_vs_inhuman'],
      inflictedModifiers: {
        combatModifiers: { initiative: -3, notes: '−3 on perception rolls for viewers unused to auras.' },
      },
    }),

  base('magic_mirror_reflect_light', 'Reflect Light', 2,
    'The mage can use a hand-held mirror to reflect light with precision. Can signal others or flash light in an opponent\'s eyes: blinded for 4 seconds — victim loses one melee action and initiative per blinding. Sunglasses negate; shielded eyes avoid blindness but all combat bonuses are halved. Each blinding attempt counts as one melee action/attack and is an automatic successful strike. No damage; sunlight or another light source required.',
    {
      pageNumber: 73,
      tags: ['mirrormagic', 'offensive', 'utility'],
      ppe: { baseActivation: 5 },
      range: { summary: '20 feet (6 m) per level of experience.', kind: 'distance', distanceValue: '20 * level', distanceUnit: 'feet' },
      duration: { summary: 'One melee round per level of experience.', kind: 'melee_round', perLevel: '1 melee round' },
      inflictedModifiers: {
        statusEffects: ['blinded'],
        combatModifiers: { notes: 'Blinded 4 seconds: −1 melee action and initiative per blinding; shielded eyes halve combat bonuses.' },
      },
      limitations: { otherLimitations: 'Sunglasses negate blindness. Requires sunlight or another light source.' },
    }),

  base('magic_mirror_dorians_mirror', "Dorian's Mirror", 3,
    'Cast upon a mirror up to 20 feet (6 m); each viewer sees only themselves changed. The reflection shows guilt, regret, and acts of evil — snarling anger, demonic smiles, blood on hands, cruel aged faces on beautiful people. Nightbane usually see Facade or Morphus they loathe. Recent betrayals or innocent deaths may show blood or ghostly victims. Not all characters appear monstrous; those with few regrets may look weary or unchanged.',
    {
      pageNumber: 73,
      tags: ['mirrormagic', 'illusion', 'psychological'],
      ppe: { baseActivation: 10 },
      range: { summary: 'Cast on mirror up to 20 feet (6 m); per-viewer illusion.', kind: 'distance', distanceValue: 20, distanceUnit: 'feet' },
      duration: { summary: 'Half an hour per level of experience.', kind: 'special', perLevel: '30 minutes' },
    }),

  base('magic_mirror_lens_of_true_sight', 'Lens of True Sight', 3,
    'The Mirrormage enchants a thick lens (at least ½ inch — bottle bottom or chunky glass; not eyeglasses). While looking through it, the caster sees invisible creatures, sees through magical illusions and disguises, sees true Hollow Men construction, detects undead or possession, confirms Nightbane/werebeast/shape-changer nature in nonhuman form (not Facade identity), and detects enchanted or inhabited mirrors. Does not reveal spells, auras, or mundane disguises.',
    {
      pageNumber: 73,
      tags: ['mirrormagic', 'detection'],
      ppe: { baseActivation: 12 },
      range: { summary: 'Touch (thick glass lens).', kind: 'touch' },
      duration: { summary: '4 melee rounds (one minute).', kind: 'melee_round', durationValue: 4 },
      reveals: [
        'invisible',
        'magical_illusions',
        'magical_disguises',
        'hollow_men',
        'undead',
        'possession',
        'shape_changer_nature',
        'enchanted_mirror',
        'inhabited_mirror',
      ],
      materialComponents: {
        label: 'Thick glass lens',
        entries: [
          {
            label: 'Glass lens at least ½ inch thick',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'each',
            consumption: 'reusable_tool',
            timing: 'at_cast',
          },
        ],
      },
      grantedModifiers: {
        target: 'self',
      },
    }),

  base('magic_mirror_fear_mirror', 'Fear Mirror', 4,
    'Cast upon a mirror up to 20 feet (6 m). Each viewer sees their own fears — frailty, defeat, Nightlords in shadows, death, exposed secrets (Nightbane may see Morphus). May elicit horror factor 14; phobias trigger full phobia response. Each viewer sees only their own fear.',
    {
      pageNumber: 74,
      tags: ['mirrormagic', 'illusion', 'horror'],
      ppe: { baseActivation: 12 },
      range: { summary: 'Cast on mirror up to 20 feet (6 m); per-viewer illusion.', kind: 'distance', distanceValue: 20, distanceUnit: 'feet' },
      duration: { summary: '10 minutes per level of experience.', kind: 'minute', perLevel: '10 minutes' },
      horrorFactor: 14,
      notes: 'Phobia sufferers see greatest fear and suffer full phobia response.',
    }),

  base('magic_mirror_scrying_mirror_lesser', 'Scrying Mirror: Lesser', 4,
    `Look into a mirror and see out from any other true mirror within 2 miles (3.2 km) per level. Restrictions: ${SCRYING_LIMITATIONS}`,
    {
      pageNumber: 74,
      tags: ['mirrormagic', 'scrying'],
      ppe: { baseActivation: 20 },
      range: { summary: '2 miles (3.2 km) per level of experience.', kind: 'distance', distanceValue: '2 * level', distanceUnit: 'miles' },
      duration: { summary: 'One minute per level of experience.', kind: 'minute', perLevel: '1 minute' },
      reveals: ['remote_mirror_view'],
      limitations: { otherLimitations: SCRYING_LIMITATIONS },
      effectProfiles: [
        {
          name: 'Invocation',
          description: 'Standard range (2 miles/3.2 km per level) and duration (1 minute per level).',
          ppeOverride: { baseActivation: 20 },
          duration: { summary: 'One minute per level.', kind: 'minute', perLevel: '1 minute' },
        },
        {
          name: 'Ritual',
          description: 'Ten-fold range (20 miles/32 km per level) and duration (10 minutes per level); 20 minutes to perform.',
          ppeOverride: { baseActivation: 20 },
          duration: { summary: 'Ten minutes per level.', kind: 'minute', perLevel: '10 minutes' },
        },
      ],
    }),

  base('magic_mirror_draw_upon_the_mirror_wall', 'Draw Upon the Mirror Wall', 5,
    'Gaze into a mirror and spend 10 P.P.E. to open a pinhole to the Mirrorwall and draw random energy: 5D6 P.P.E. Syphoned P.P.E. lasts five minutes per level if unused. First use in 12 hours costs 10 P.P.E.; each subsequent use within 12 hours adds 1D6 P.P.E. to the cost. Frequent use may tear the Mirrorwall or open a dimensional portal (G.M.).',
    {
      pageNumber: 74,
      tags: ['mirrormagic', 'utility', 'ppe'],
      ppe: {
        baseActivation: 10,
        dynamicCosts: [
          { trigger: 'Each subsequent use within 12 hours', costFormula: '+1D6 P.P.E. to activation cost' },
        ],
        notes: 'May return less P.P.E. than spent; syphoned pool expires after 5 minutes per level.',
      },
      range: { summary: 'Self', kind: 'self' },
      duration: { summary: 'Instant draw; held P.P.E. lasts 5 minutes per level.', kind: 'instant' },
      limitations: { concentrationRequired: true, selfOnly: true },
      notes: 'Draws 5D6 P.P.E. from the Mirrorwall on cast. G.M. may rule frequent use tears the Mirrorwall or opens a portal.',
    }),

  base('magic_mirror_hidden_reflection', 'Hidden Reflection', 5,
    'Step into a mirror to hide. Hidden caster is a subtle part of the background unless moving or lunging out (leap out only — cannot attack or pull viewers in). Can see and hear as if in front of the mirror but cannot communicate, attack, or use magic or psionics. Shattering the mirror forces a percentile roll; stepping out voluntarily or at spell end has no ill effect.',
    {
      pageNumber: 75,
      tags: ['mirrormagic', 'utility', 'stealth'],
      ppe: { baseActivation: 25 },
      range: { summary: 'Self', kind: 'self' },
      duration: { summary: 'One minute per level of experience.', kind: 'minute', perLevel: '1 minute' },
      limitations: {
        selfOnly: true,
        otherLimitations: 'Cannot communicate, attack, or use magic/psionics while hidden. Voluntary exit or expiry — no penalty.',
      },
      resolutionTable: {
        rollKind: 'd100',
        label: 'When the hiding mirror is shattered',
        entries: [
          {
            percentile: { min: 1, max: 20 },
            label: 'Dreamstream',
            effect: 'Hurled into the Dreamstream; body destroyed; becomes dream-haunting phantom.',
          },
          {
            percentile: { min: 21, max: 30 },
            label: 'Astral Plane',
            effect: 'Body, mind, and soul hurled to Astral Plane; 01–06% to return without guide; 4D4 days to starve.',
          },
          {
            percentile: { min: 31, max: 40 },
            label: 'Trapped in shard',
            effect: 'Trapped in broken shard 2D6 hours (seems like days); reappears unharmed — roll aftereffects table.',
            followUpTable: HIDDEN_REFLECTION_AFTEREFFECTS,
          },
          {
            percentile: { min: 41, max: 60 },
            label: 'Nightlands',
            effect: 'Hurled to Nightlands; physically unharmed; needs Mirrorwalk or aid to return.',
          },
          {
            percentile: { min: 61, max: 80 },
            label: 'Dissolution and return',
            effect: 'White noise ordeal; reappears before shattered mirror 3D4 minutes later, physically whole.',
            followUpTable: HIDDEN_REFLECTION_AFTEREFFECTS,
          },
          {
            percentile: { min: 81, max: 100 },
            label: 'Vomited out',
            effect: 'Expelled instantly; suffers 2D6 damage and loses initiative for the first melee round.',
          },
        ],
      },
    }),

  base('magic_mirror_opening_the_mirrorwall', 'Opening the Mirrorwall', 6,
    'Smash a mirror at least 2 feet (0.6 m) across. Where it shatters, a void breach opens for the spell duration. Negate any one basic law of reality within 100 feet (30 m) — suspend gravity, stop combustion, stop magic, suspend mathematics, etc. May only negate, not reverse. Cannot stop living things from living or turn solids to gas. G.M. may allow importing a phenomenon from beyond the Mirrorwall.',
    {
      pageNumber: 75,
      tags: ['mirrormagic', 'dimensional', 'offensive'],
      ppe: { baseActivation: 40 },
      range: { summary: '100 feet (30 m)', kind: 'distance', distanceValue: 100, distanceUnit: 'feet' },
      duration: { summary: 'One melee per level of experience.', kind: 'melee_round', perLevel: '1 melee' },
      areaOfEffect: { summary: '100-foot (30 m) radius law negation centered on the breach.' },
      materialComponents: {
        label: 'Smashed mirror focus',
        entries: [
          {
            label: 'Mirror at least 2 feet (0.6 m) across',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'each',
            consumption: 'destroyed',
            timing: 'at_cast',
          },
        ],
      },
      notes: 'Void breach is dangerous if entered. G.M. chooses negated law or imported phenomenon.',
    }),

  ritual('magic_mirror_amend_reflection', 'Amend Reflection', 7,
    'Identical to Manipulate Reflection but effectively permanent. Curse, mark servants/enemies, or create disturbing mirrors. Requires victim present for the ritual, or an intimately associated object (clothing, lock of hair) for a person target.',
    {
      pageNumber: 75,
      tags: ['mirrormagic', 'illusion', 'curse'],
      ppe: { baseActivation: 50 },
      range: { summary: 'Special — victim present or sympathetic link.', kind: 'special' },
      duration: { summary: 'Indefinite', kind: 'permanent' },
      save: { summary: 'Standard', saveKind: 'standard' },
      effectProfiles: [
        { name: 'Enchant person (permanent)', description: 'Permanent reflection alteration on one person or creature.' },
        { name: 'Enchant mirror (permanent)', description: 'Permanent reflection alteration on one mirror surface.' },
      ],
      materialComponents: {
        label: 'Sympathetic link (person target)',
        entries: [
          {
            label: 'Intimately associated object (clothing, lock of hair, etc.)',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'each',
            consumption: 'returned',
            timing: 'over_crafting_period',
            notes: 'Required when victim is not present.',
          },
        ],
      },
    }),

  base('magic_mirror_steal_reflection', 'Steal Reflection', 8,
    'Steal a person, creature, or human-sized object\'s reflection into a specific mirror in the caster\'s possession. Target no longer casts a reflection; mirror owner can see the target at any distance (clothing, held objects, book being read — no sound, bystanders, or environment).',
    {
      pageNumber: 75,
      tags: ['mirrormagic', 'scrying', 'curse'],
      ppe: { baseActivation: 50 },
      range: { summary: '100 feet (30 m)', kind: 'distance', distanceValue: 100, distanceUnit: 'feet' },
      duration: { summary: 'One week per level of experience.', kind: 'week', perLevel: '1 week' },
      save: { summary: 'Standard', saveKind: 'standard' },
      reveals: ['stolen_reflection_remote_view'],
      inflictedModifiers: { statusEffects: ['no_reflection'] },
      limitations: { otherLimitations: 'Requires specific storage mirror in caster possession at cast time.' },
    }),

  base('magic_mirror_mirror_divination', 'Mirror Divination', 9,
    'Guaranteed divination without the skill. Peer into a mirror and concentrate; within 1D4 minutes an image appears — face, vision, warning about near or distant future. Usually reflects one concern; unfocused casters may receive random visions (G.M.).',
    {
      pageNumber: 76,
      tags: ['mirrormagic', 'divination', 'scrying'],
      ppe: { baseActivation: 70 },
      range: { summary: 'Self', kind: 'self' },
      duration: { summary: 'Instant after 1D4 minutes of gazing.', kind: 'instant' },
      reveals: ['divination_vision', 'future_warning'],
      limitations: { concentrationRequired: true },
      notes: 'Image appears within 1D4 minutes of mirror gazing.',
    }),

  ritual('magic_mirror_man_in_the_mirror', 'Man in the Mirror', 10,
    'Create an intelligence in a mirror or reflective surface. Caster sets appearance, personality, and knowledge. One skill per creator level (proficiency equal to creator at creation). Viewers see the entity instead of their reflection; it can see, hear, smell, and speak. Advisor, spy, or messenger — restricted to that mirror. Inhabited mirror cannot pierce the Mirrorwall.',
    {
      pageNumber: 76,
      tags: ['mirrormagic', 'enchantment', 'summoning'],
      ppe: { baseActivation: 120 },
      duration: { summary: 'One month per level of experience.', kind: 'special', perLevel: '1 month' },
      spawnedPresence: {
        kind: 'construct',
        name: 'Man in the Mirror',
        notes: 'One skill per creator level at creator proficiency; blocks all Mirrorwall piercing through this mirror.',
      },
      forgedOutputs: [
        {
          label: 'Enchanted inhabited mirror',
          count: 1,
          destination: 'ground_loot',
          initialPresence: 'stashed',
          bindToCaster: true,
        },
      ],
      limitations: {
        otherLimitations: 'Inhabited mirror cannot be used to pierce the Mirrorwall by any means.',
      },
    }),

  base('magic_mirror_scrying_mirror_greater', 'Scrying Mirror: Greater (Nightlands)', 12,
    `As Scrying Mirror: Lesser, but Earth mirrors at ten times Lesser range, plus mirrors in equivalent Nightlands locations and any known Nightlands mirror. ${SCRYING_LIMITATIONS}`,
    {
      pageNumber: 76,
      tags: ['mirrormagic', 'scrying', 'nightlands'],
      ppe: { baseActivation: 90 },
      range: { summary: 'Special — 10× Lesser range on Earth; Nightlands mirrors as described.', kind: 'special' },
      duration: { summary: '2 minutes per level of experience.', kind: 'minute', perLevel: '2 minutes' },
      reveals: ['remote_mirror_view', 'nightlands_mirror_view'],
      limitations: { otherLimitations: SCRYING_LIMITATIONS },
      effectProfiles: [
        {
          name: 'Invocation',
          description: '2 minutes per level; 10× Lesser Earth range (20 miles/32 km per level).',
          ppeOverride: { baseActivation: 90 },
          duration: { summary: '2 minutes per level.', kind: 'minute', perLevel: '2 minutes' },
        },
        {
          name: 'Ritual',
          description: 'Ten-fold duration (20 minutes per level).',
          ppeOverride: { baseActivation: 90 },
          duration: { summary: '20 minutes per level.', kind: 'minute', perLevel: '20 minutes' },
        },
      ],
    }),

  base('magic_mirror_walking_the_mirrorwall_lesser', 'Walking the Mirrorwall: Lesser', 12,
    'Open the Mirrorwall and step through a mirror into the Wall. Carry up to 30 lbs (13.6 kg). Wander the Wall, look out any mirror in any world, exit through any mirror. After one hour inside, magic expires and caster falls through current mirror into random Megaverse location (G.M.).',
    {
      pageNumber: 76,
      tags: ['mirrormagic', 'dimensional', 'travel'],
      ppe: { baseActivation: 80 },
      range: { summary: 'Special — enter through any mirror.', kind: 'special' },
      duration: { summary: 'One hour maximum safe transit.', kind: 'hour', durationValue: 1 },
      limitations: {
        selfOnly: true,
        otherLimitations: 'Portable cargo up to 30 lbs (13.6 kg). Overtime (>1 hour) — fall through mirror; G.M. determines destination.',
      },
    }),

  base('magic_mirror_walking_the_mirrorwall_greater', 'Walking the Mirrorwall: Greater', 14,
    'Open the Mirrorwall for a group of up to ten people (total weight including equipment ≤ 2000 lbs/910 kg), led by a Mirrormage. Travel inside the Wall as Lesser. After one hour, group falls through current mirror if still inside (G.M.).',
    {
      pageNumber: 76,
      tags: ['mirrormagic', 'dimensional', 'travel'],
      ppe: { baseActivation: 140 },
      range: { summary: 'Special — group enters through any mirror.', kind: 'special' },
      duration: { summary: 'One hour maximum safe transit.', kind: 'hour', durationValue: 1 },
      targetCountFormula: 'Up to 10 people',
      limitations: {
        otherLimitations: 'Total party weight ≤ 2000 lbs (910 kg). Must be led by a Mirrormage. Overtime (>1 hour) — fall through mirror; G.M. determines destination.',
      },
    }),

  ritual('magic_mirror_castle_of_oblivion', 'Castle of Oblivion', 15,
    'Enchant a human-sized or larger mirror until it is completely black and non-reflective (cannot be accessed from Mirrorwall). Suck one human or humanoid target (living, undead, dead, or inert) through into a timeless, inescapable Castle of Oblivion — cage, halls, or desolate plain. Time has no meaning. Excellent exile for unkillable enemies or indestructible artifacts.',
    {
      pageNumber: 76,
      tags: ['mirrormagic', 'banishment', 'ritual'],
      ppe: { baseActivation: 300, notes: '15 P.P.E. permanently lost from caster maximum.' },
      duration: { summary: 'Indefinite imprisonment.', kind: 'permanent' },
      save: [
        { summary: 'Standard if conscious.', saveKind: 'standard' },
        { summary: 'None if unconscious.', saveKind: 'none' },
      ],
      permanentCosts: [
        {
          resource: 'ppe_max',
          reduction: { kind: 'fixed', value: 15 },
          trigger: 'on_cast',
          notes: '15 of the 300 P.P.E. is permanently lost from caster maximum pool.',
        },
      ],
      materialComponents: {
        label: 'Black mirror prison',
        entries: [
          {
            label: 'Mirror at least human-sized',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'each',
            consumption: 'returned',
            timing: 'on_ritual_completion',
            notes: 'Becomes completely black and non-reflective.',
          },
        ],
      },
      forgedOutputs: [
        {
          label: 'Castle of Oblivion mirror',
          count: 1,
          destination: 'ground_loot',
          initialPresence: 'stashed',
          bindToCaster: false,
        },
      ],
      notes: 'Castle appearance varies (cage, halls, plain). Watches run at random speeds.',
    }),
];

export function buildMirrorSpells() {
  return SPELLS;
}

function validateSpells(spells) {
  const featureCommonSchema = JSON.parse(
    fs.readFileSync(join(SCHEMAS_DIR, 'palladium-feature-common.schema.json'), 'utf8'),
  );
  const magicSchema = JSON.parse(fs.readFileSync(join(SCHEMAS_DIR, 'palladium-magic.schema.json'), 'utf8'));

  const ajv = new Ajv2020({ allErrors: true, strict: false, validateSchema: false });
  addFormats(ajv);
  ajv.addSchema(featureCommonSchema);
  const validate = ajv.compile(magicSchema);

  const errors = [];
  for (const spell of spells) {
    if (!validate(spell)) errors.push({ id: spell.id, errors: validate.errors });
  }
  return { ok: errors.length === 0, errors, count: spells.length };
}

if (process.argv[1] && process.argv[1].endsWith('build_mirror_spells.mjs')) {
  const spells = buildMirrorSpells();
  if (spells.length !== 19) {
    console.error('Expected 19 spells, got', spells.length);
    process.exitCode = 1;
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(spells, null, 2)}\n`);

  const validation = validateSpells(spells);
  if (validation.ok) {
    console.log('Wrote', spells.length, 'spells to', OUT_PATH);
    console.log('Validation: PASS — all spells valid against palladium-magic.schema.json');
  } else {
    console.error('Validation: FAIL —', validation.errors.length, 'spell(s) with errors');
    for (const row of validation.errors) {
      console.error(`  ${row.id}:`, JSON.stringify(row.errors, null, 2));
    }
    process.exitCode = 1;
  }
}
