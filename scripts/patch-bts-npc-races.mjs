/**
 * One-shot patch: BTS NPC races ingest (nightbane-races-bts-npc-ab).
 * Run: node scripts/patch-bts-npc-races.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npcPath = join(root, 'src/data/content/races/nightbane/npc.json');
const races = JSON.parse(readFileSync(npcPath, 'utf8'));

const BTS = {
  gameSystem: 'nightbane',
  reference: 'Between the Shadows',
};

function npcBase(id, name, description, pageNumber, attrs, vitals, opts = {}) {
  return {
    id,
    name,
    description,
    raceAudience: 'npc',
    gameSystems: ['nightbane'],
    sources: [{ ...BTS, pageNumber }],
    canPickOcc: false,
    lineage: 'nightbane',
    attributes: attrs,
    strengthCategory: opts.strengthCategory ?? 'supernatural',
    vitals,
    psionics: {
      capabilityType: opts.capabilityType ?? 'none',
      naturalIspFormula: opts.naturalIspFormula ?? '0',
    },
    occLimitations: { forbiddenCategories: [], forbiddenOccIds: [] },
    innateSkills: opts.innateSkills ?? [],
    innateBonuses: {
      modifiers: opts.modifiers ?? {},
      ...(opts.activation ? { activation: opts.activation } : {}),
      metadata: { npcStatBlock: true, ...opts.metadata },
    },
    demographics: {
      averageHeight: opts.averageHeight ?? 'Varies',
      averageWeight: opts.averageWeight ?? 'Varies',
      averageLifespan: opts.averageLifespan ?? 'Unknown',
      alignmentTendencies: opts.alignmentTendencies ?? ['Diabolic'],
      ...(opts.excludedAlignments ? { excludedAlignments: opts.excludedAlignments } : {}),
    },
    classAbilities: opts.classAbilities ?? [],
  };
}

const newRaces = [
  npcBase(
    'race_astral_entity',
    'Astral Entity',
    'Beings of pure psychic energy — psychic vampires of the Astral Plane (Lesser, Common, and Greater tiers). Not player characters. Invisible on Earth unless sensed by psychics; ghostly forms in the Astral Plane. Respect Millek; prey on humans and Tarantuloids; avoid Necrophim reprisals.',
    62,
    { iq: '3D4', me: '3D4', ma: '3D4', ps: '3D4', pp: '3D6', pe: '3D6', pb: '3D6', spd: '1D4*10' },
    { hpFormula: '2D4*10', averageStandardPpe: '2D6' },
    {
      alignmentTendencies: ['Selfish', 'Anarchist', 'Unprincipled', 'Scrupulous', 'Principled'],
      modifiers: {
        strike: 1,
        parry: 1,
        dodge: 1,
        rollWithImpact: 2,
        pullPunch: 1,
        save_magic: 2,
        save_psionics: 3,
        save_horror_factor: 15,
        horrorFactor: 10,
      },
      metadata: {
        entityTier: 'common',
        tierAttributeModifier: { lesser: -2, common: 0, greater: '2D6' },
        tierHitPoints: { lesser: '1D4*10', common: '2D4*10', greater: '4D6*10+20' },
        tierHorrorFactor: { lesser: '1D4+4', common: '1D4+6', greater: '1D4+8' },
        tierPpe: { lesser: '1D6', common: '2D6', greater: '5D6' },
        tierExperienceLevel: { lesser: '1-2', common: '1D4+1', greater: '2D4+3' },
        tierPsionicPicks: {
          lesser: '4 from any 2 categories (no master)',
          common: '8 from sensitive/healing/physical',
          greater: '10 lesser + 4 master',
        },
        psychicVampirismDrainPerMelee: '10 per level (I.S.P. or P.P.E.; 4 P.P.E. = 1 I.S.P.)',
        physicalPlaneInvisible: true,
        physicalPlaneFlyMph: 100,
        astralPlaneGhostForm: true,
        astralNavigationInnate: true,
        attacksPhysicalPlane: '2 psionic per melee (+1 at 3/6/8)',
        attacksAstralPlane: '2 psionic and/or physical (+1 at 3/6/8)',
        ppeDependencyMonthly: '2 P.P.E. or I.S.P. per level or lose 1 P.P.E. base/month',
        huntedByRaceIds: ['race_mountebank', 'race_necrophim', 'race_vampire_specter'],
        respectsRaceId: 'race_millek',
      },
      classAbilities: [
        { name: 'Tier Variants', description: 'Lesser (−2 all attributes), Common (baseline), Greater (+2D6 all attributes). Adjust H.P., H.F., P.P.E., psionic picks, and experience per metadata tier tables.' },
        { name: 'Psychic Vampirism', description: 'Drain up to 10 I.S.P. or P.P.E. per level per melee from unwilling targets (save vs psionic attack). P.P.E. converts to I.S.P. at 4:1.' },
        { name: 'Plane Abilities', description: 'Physical world: invisible, fly 100 mph, pass through walls, psionic-only attacks. Astral Plane: ghost form, normal speed flight, supernatural P.S. damage, speak all languages.' },
        { name: 'R.C.C. Skills', description: 'Lore: Astral (+25%).' },
      ],
    },
  ),
  npcBase(
    'race_mountebank',
    'Mountebank',
    'Astral-traveling dwarf-like bandits — scourge of astral domains and the Nightlands Waste. Not player characters. Travel in gangs of 6–12; ambush astral travelers and raid domains. Sunlight-sensitive; enemies of Dream Ghouls in the Dreamstream.',
    67,
    { iq: '3D4+2', me: '3D4', ma: '2D6', ps: '2D6+6', pp: '3D6+3', pe: '3D6', pb: '2D6', spd: '3D6' },
    { hpFormula: 'PE+1D6', sdc: 30, averageStandardPpe: '2D6' },
    {
      modifiers: { perception: 3, save_horror_factor: 3, horrorFactor: 7, apm: 1 },
      metadata: {
        astralSdc: 60,
        astralHpDoubled: true,
        groupHorrorFactor: 10,
        typicalGroupSize: '6-12',
        chameleonPower: true,
        senseDisarmTrapsPercent: '40+3%/level (15 I.S.P., 1 min; up to 5 helpers)',
        dimensionalTravelHours: 1,
        astralReconfigurationIspPerPound: 1,
        sunlightDamagePerMelee: '1D6',
        sunlightShadePenalty: { allActions: -4, apmFraction: 0.5 },
        naturalIspFormula: 'ME+1D4*10+2D4/level',
        handToHandStyleId: 'hth_assassin',
        typicalExperienceLevel: '1D4',
        leaderExperienceLevel: '1D6+2',
        enemyRaceIds: ['race_dream_ghoul'],
      },
      capabilityType: 'innate',
      naturalIspFormula: 'ME+1D4*10',
      classAbilities: [
        { name: 'Chameleon Power', description: 'Blend with environment; spotting motionless Mountebank requires difficult Perception (+3 if moving).' },
        { name: 'Trap Sense', description: 'Locate/disarm traps, locks, and domain defenses — see metadata.' },
        { name: 'Dimensional Travel', description: 'Enter/leave Astral regions in 1 hour — random destination on Earth, Nightlands, or Astral Plane (sunlight risk on Earth).' },
        { name: 'Astral Reconfiguration', description: 'Permanently charge objects with I.S.P. (1/lb) so gear works against astral beings in both worlds.' },
        { name: 'Psionics', description: 'Choose three physical-category powers. I.S.P.: M.E. + 1D4×10 + 2D4/level.' },
        { name: 'Sunlight Vulnerability', description: '1D6 damage/melee in direct sun; in shade −4 all actions and half attacks.' },
      ],
      excludedAlignments: ['Principled', 'Scrupulous', 'Unprincipled', 'Anarchist', 'Aberrant', 'Miscreant'],
      alignmentTendencies: ['Diabolic', 'Miscreant'],
      averageHeight: '4 feet (1.2 m)',
    },
  ),
  npcBase(
    'race_vampire_specter',
    'Vampire Specter',
    'Astral undead — the Dark Immortals. Diabolic predators with human torsos and blood-red liquid tendrils; talons and fangs in combat. Not true vampires (silver/stakes ineffective). Feud with Nightlord minions; rumored rulers of the astral Abode.',
    71,
    { iq: '2D6+12', me: '2D6+10', ma: '2D4+14', ps: '3D6+12', pp: '3D6+6', pe: '3D6+6', pb: '2D6', spd: '1D4*10' },
    { hpFormula: '0', sdc: '3D6*10+20', averageStandardPpe: '3D4' },
    {
      modifiers: {
        apm: 4,
        initiative: 1,
        perception: 2,
        strike: 3,
        parry: 3,
        dodge: 3,
        rollWithImpact: 4,
        pullPunch: 3,
        save_magic: 5,
        save_psionics: 5,
        save_horror_factor: 10,
        horrorFactor: 15,
      },
      metadata: {
        noHitPoints: true,
        regenerationPerMelee: '3D6',
        superHypnoticSuggestionLevel: 5,
        possessionPhysicalPlaneOnly: true,
        possessionSave: 'vs psionic attack',
        possessionBonuses: { psSupernatural: 4, sdc: 50 },
        talonDamage: '2D6',
        tendrilDamage: '2D4',
        biteDamage: '3D6',
        biteDrain: '1D6 P.P.E. or I.S.P.',
        astralProjectionFull: true,
        physicalPlaneEnergyForm: true,
        psionicGrantIds: [
          'psionic_mind_block',
          'psionic_empathy',
          'psionic_telepathy',
          'psionic_presence_sense',
        ],
        psionicPotencyLevel: 5,
        notTrueVampire: true,
        enemyMinionRaceIds: ['race_hound', 'race_hunter', 'race_necrophim'],
      },
      classAbilities: [
        { name: 'Regeneration', description: '3D6 S.D.C./H.P. per melee round.' },
        { name: 'Super-Hypnotic Mind Suggestion', description: 'As Nightbane RPG p.185 at 5th-level potency.' },
        { name: 'Possession', description: 'Earth/Nightlands only — save vs psionic attack or victim acts under control (+4 P.S. supernatural, +50 S.D.C. to possessed body; damage to bonus S.D.C. transfers to host).' },
        { name: 'Combat', description: 'Five H2H or psionic attacks. Talons +2D6; tendrils entangle/strike 2D4; bite 3D6 + drains 1D6 P.P.E./I.S.P.' },
        { name: 'Vulnerabilities', description: 'On physical plane immune to normal weapons; in Astral Plane harmed by psionics, magic, and physical attacks. Not affected by vampire taboos.' },
      ],
      excludedAlignments: ['Principled', 'Scrupulous', 'Unprincipled', 'Anarchist', 'Aberrant', 'Miscreant'],
    },
  ),
  npcBase(
    'race_torturian',
    'Torturian',
    'Broken former human psychics — astral sadists in leather armor with withered faces. Never player characters. Cannot materialize; whip astral forms from projecting psychics, mages, and Nightbane. Often commanded by Necrophim; feud with them when unsupervised.',
    78,
    { iq: '3D6', me: '3D6+2', ma: '2D6', ps: '3D6+10', pp: '4D6', pe: '4D6', pb: '2D6+3', spd: '4D6' },
    { hpFormula: '0', sdc: 'PE*5+1D4*10', averageStandardPpe: '3D6' },
    {
      modifiers: {
        strike: 1,
        parry: 1,
        dodge: 1,
        rollWithImpact: 2,
        pullPunch: 4,
        save_magic: 2,
        save_horror_factor: 6,
        horrorFactor: 14,
      },
      metadata: {
        noPhysicalForm: true,
        astralSdcPerLevel: 5,
        astralFormFlyMph: 670,
        astralFormIntangible: true,
        sensePainRadiusFeet: 120,
        nightvisionFeet: 2000,
        seeInvisible: true,
        astralNavigationInnate: true,
        handToHandStyleId: 'hth_assassin',
        naturalIspFormula: 'ME*3+2D4/level',
        psionicGrantIds: [
          'psionic_telepathy',
          'psionic_empathy',
          'psionic_see_aura',
          'psionic_mind_block',
        ],
        typicalExperienceLevel: '1D6+1',
        veteranExperienceLevel: '1D4+7',
        capturePreferenceDays: '2D4',
        horrorFactorVsNightlords: -6,
        whipAstralExtraction: true,
        barbedWhipDamage: '4D6',
        barbedWhipAgonyPenalty: { combat: -2, skills: -25 },
        swordDamage: '2D6+PS',
        commandedByRaceIds: ['race_necrophim'],
        enemyRaceIds: ['race_necrophim'],
        allyRaceIds: ['race_hound', 'race_hunter'],
      },
      capabilityType: 'innate',
      naturalIspFormula: 'ME*3',
      innateSkills: [
        { skillId: 'skill_lore_astral', basePercent: 15 },
        { skillId: 'skill_lore_nightlands', basePercent: 10 },
        { skillId: 'skill_interrogation_techniques', basePercent: 10 },
        { skillId: 'wp_whip' },
        { skillId: 'wp_sword' },
      ],
      classAbilities: [
        { name: 'Astral Form', description: 'Invisible energy being on Earth/Nightlands (visible to psychics, astral travelers, children under 13, Nightbane, most supernatural). Fly 670 mph, pass through walls; harmed only by magic, psionics, supernatural attacks.' },
        { name: 'Sense Pain', description: 'Automatic empathy for pain within 120 ft — physical wounds and emotional anguish.' },
        { name: 'Sadist Tactics', description: 'Prefer capture and 2D4-day torment over quick kills unless closely supervised.' },
        { name: 'Restraints', description: 'Magical disks — straps (P.S. 24), barbed wire (P.S. 24, −40% escape), fishing net (P.S. 25, −35% escape).' },
        { name: 'Torture Phobia', description: 'Captured Torturians save vs insanity (phobia: torture) or collapse under threat.' },
      ],
    },
  ),
  npcBase(
    'race_dream_ghoul',
    'Dream Ghoul',
    'Dreamstream bogeymen — embodiments of childhood fears. Monster NPCs (not P.C.s). May materialize through imaginative children\'s dreams; drain P.P.E. and haunt Dream Pools. Enemies of Mountebanks.',
    100,
    { iq: '3D4', me: '3D4', ma: '3D4', ps: '4D6', pp: '4D6', pe: '5D6', pb: '2D4', spd: '4D6' },
    { hpFormula: '0', sdc: '1D6*10', averageStandardPpe: '1D6+2' },
    {
      modifiers: {
        apm: 2,
        initiative: 1,
        strike: 2,
        parry: 2,
        dodge: 2,
        rollWithImpact: 3,
        pullPunch: 2,
        save_magic: 3,
        save_horror_factor: 5,
        horrorFactor: 11,
      },
      metadata: {
        supernaturalAttributes: true,
        noHitPoints: true,
        sdcIncludesPe: true,
        dreamManipulationHorrorFactor: '10+1/level (max 18; adults +4 save)',
        psychicVampirismFeedsPerNight: 3,
        materializeChance: '20% per night after 15+ P.P.E. absorbed (guaranteed night 5)',
        partialInvisibilityPhysical: true,
        regenerationPerHour: 1,
        ppeHealRate: '1D4 S.D.C. per 1 P.P.E.',
        dreamCombatResistBonusLevels: [1, 2, 4, 7],
        biteDamageRange: '1D6-4D6',
        childDeathChancePercent: 10,
        empoweredThresholdPpe: 100,
        empoweredBonuses: { attributes: 5, sdcMultiplier: 2, sizeGrowth: '1D4 feet' },
        typicalExperienceLevel: '1D6+1',
        maxTypicalLevel: 7,
        ppeWeeklyDependency: 1,
        packSizeWandering: '2D4',
        enemyRaceIds: ['race_mountebank'],
        allyRaceIds: ['race_living_nightmare'],
        psionicGrantIds: [
          'psionic_mind_block',
          'psionic_presence_sense',
          'psionic_telekinesis',
        ],
        psionicPowersProseOnly: ['See the Invisible (not in catalog — book ability)'],
      },
      capabilityType: 'innate',
      naturalIspFormula: '1D4*10+ME',
      innateSkills: [
        { skillId: 'skill_lore_dreamstream', basePercent: 20 },
        { skillId: 'skill_prowl', basePercent: 25 },
        { skillId: 'skill_concealment', basePercent: 15 },
        { skillId: 'skill_detect_concealment', basePercent: 15 },
      ],
      classAbilities: [
        { name: 'Dream Manipulation', description: 'Flimsy terror illusions (1 S.D.C./cu.ft); H.F. 10 +1/level (max 18).' },
        { name: 'Psychic Vampirism', description: 'On failed H.F. save victim loses half remaining P.P.E. — up to 3 feeds/night.' },
        { name: 'Enter Physical World', description: 'After absorbing 15+ P.P.E. in one night, cumulative 20% chance/night to materialize.' },
        { name: 'Partial Invisibility', description: 'Nearly invisible to mundane adults; psychics, animals, and children under 17 see on failed prowl.' },
      ],
      alignmentTendencies: ['Miscreant', 'Diabolic'],
      averageHeight: '1–4 feet (0.3–1.2 m)',
      averageWeight: '5–80 lbs (2.25–36 kg)',
    },
  ),
  npcBase(
    'race_guilt_eater',
    'Guilt Eater',
    'Dreamstream predators that weaponize guilt — hooded figures summoning avenging personas of those wronged by the target. Role-play heavy; combat often fails without atonement or self-forgiveness.',
    103,
    { iq: '1D6+16', me: '1D6+18', ma: '2D6+12', ps: '2D6+18', pp: '1D6+16', pe: '2D6+14', pb: '1D6', spd: '4D6' },
    { hpFormula: '0', sdc: 'PE*3+1D4*100', averageStandardPpe: '1D4*10' },
    {
      modifiers: {
        apm: 3,
        initiative: 2,
        strike: 3,
        parry: 3,
        dodge: 3,
        pullPunch: 4,
        save_horror_factor: 10,
        horrorFactor: 15,
      },
      metadata: {
        noHitPoints: true,
        punishmentDomainResistPenalty: -4,
        punishmentDomainSaveBonus: 10,
        siegeCombatHalved: true,
        summonAvengingPersonae: '2D6',
        avengingPersonaDamage: '2D6',
        avengingPersonaSdc: 60,
        avengingPersonaApm: 2,
        dreamManipulationDefenseBonus: 4,
        punishmentDomainTransportBonus: 8,
        magicImmunity: true,
        siegeInitiativeLoss: true,
        siegeSkillPenaltyPercent: -20,
        avengingSiegeCombatPenalty: -2,
      },
      classAbilities: [
        { name: 'Punishment Domain', description: 'Teleport self + up to 3 victims into guilt-replay pocket (dream manipulation, resisted at −4). Escape via atonement, realization, or brute force (domain saves at +10).' },
        { name: 'Summon Avenging Personae', description: '2D6 constructs of wronged people — 2D6 damage, 60 S.D.C., 2 attacks; victims −2 combat, −20% skills.' },
        { name: 'Magic Immunity', description: 'Immune to magic weapons and spell effects; psionics and talents work normally.' },
        { name: 'Resolution', description: 'Genuine remorse, atonement, or refusal to succumb to guilt may banish the Eater or grant +4 vs future summons of that person.' },
      ],
      alignmentTendencies: ['Aberrant'],
      excludedAlignments: ['Principled', 'Scrupulous', 'Unprincipled', 'Anarchist', 'Miscreant', 'Diabolic'],
    },
  ),
  npcBase(
    'race_living_nightmare',
    'Living Nightmare',
    'Rare personas reborn from Dream Storms — independent psychic constructs that can haunt both Dreamstream and Earth. Often evil reflections of trauma; may serve Nightlords as unreliable mercenaries.',
    107,
    { iq: '2D6+10', me: '2D6+10', ma: '3D6', ps: '4D6+6', pp: '4D6', pe: '4D6', pb: '4D6', spd: '5D6' },
    { hpFormula: '0', sdc: '4D6*10', averageStandardPpe: '2D6' },
    {
      modifiers: {
        apm: 1,
        initiative: 1,
        pullPunch: 2,
        save_magic: 2,
        save_psionics: 2,
        save_horror_factor: 12,
        horrorFactor: 10,
      },
      metadata: {
        supernaturalAttributes: true,
        sdcIncludesPe: true,
        sdcPerLevel: '1D6',
        horrorFactorFormula: '2D4+6',
        dreamTravelInnate: true,
        dreamManipulationSelfOnly: true,
        reshapeSelfIspCosts: { base: 5, pbOrHfPerPoint: 3, impersonate: 10 },
        increaseAttributesIsp: { perAttribute: 5, durationMinutesPerLevel: 3 },
        dreamCombatBonusLevels: [1, 3, 6, 10, 15],
        naturalIspFormula: '3D4*10+ME+2D6/level',
        handToHandStyleId: 'hth_assassin',
        typicalExperienceLevel: '1D6+1',
        veteranExperienceLevel: '1D6+5',
        inheritedPowersChancePercent: '1-60',
        dreamPoolBirthVulnerability: true,
        averageLifespanYears: '2D6*100',
      },
      capabilityType: 'innate',
      naturalIspFormula: '3D4*10+ME',
      classAbilities: [
        { name: 'Dream Travel', description: 'Innate Dreamdance (Superior) — indefinite duration, no I.S.P.; may exit within 100 ft of any sleeper whose Pool was entered.' },
        { name: 'Reshape Self', description: 'Alter appearance on Earth or in Dreamstream — see metadata I.S.P. costs (max P.B. 30, H.F. 18).' },
        { name: 'Increase Attributes', description: 'Raise P.S./P.E. +1 per M.E.; P.P. +1 per 4 M.E.; S.D.C. +M.E.×3 for 3 min/level — 5 I.S.P. per attribute.' },
        { name: 'Dream Pool Weakness', description: 'Returned to birth Dream Pool — loses dream-dance powers and half bonuses/combat (easier to destroy).' },
        { name: 'Inherited Powers', description: '1–60% chance to retain creator Nightbane talents, psionics, or magic tiers.' },
      ],
      alignmentTendencies: ['Diabolic', 'Miscreant', 'Anarchist'],
    },
  ),
  npcBase(
    'race_soul_leech',
    'Soul Leech',
    'Nightlord dream assassins — tentacle-headed horrors that drain sleepers through Dream Pools. Cannot enter the physical world; indigenous to the Dreamstream.',
    109,
    { iq: '1D6+12', me: '1D6+13', ma: '1D6+6', ps: '2D6+16', pp: '1D6+14', pe: '1D6+12', pb: '1D4', spd: '4D6+6' },
    { hpFormula: '0', sdc: '2D6*10', averageStandardPpe: '2D4' },
    {
      modifiers: {
        apm: 3,
        initiative: 2,
        perception: 1,
        strike: 2,
        parry: 4,
        dodge: 2,
        rollWithImpact: 1,
        pullPunch: 1,
        save_magic: 4,
        save_psionics: 5,
        save_horror_factor: 8,
        horrorFactor: 14,
      },
      metadata: {
        noHitPoints: true,
        sdcIncludesPe: true,
        soulDrainSave: 'vs psionics each minute',
        soulDrainPerMinute: '1D4 P.P.E. or I.S.P. then H.P.',
        dreamCombatSaveBonus: 5,
        seeInvisible: true,
        clawDamageBonus: '2D6',
        cannotEnterPhysicalWorld: true,
        releasesEnergyOnDeath: true,
        bodyguardForRaceId: 'race_morpheomoth',
        allyRaceIds: ['race_necrophim'],
        handToHandAttacks: 4,
      },
      innateSkills: [{ skillId: 'skill_lore_dreamstream', basePercent: 25 }],
      classAbilities: [
        { name: 'Soul Drain', description: 'In victim\'s Dream Pool — suppresses dreams, subdues personas, drains 1D4 P.P.E./I.S.P. per minute (save vs psionics) then bypasses S.D.C. to hit points until coma/death. Waking expels leech until next night.' },
        { name: 'Supernatural Senses', description: 'See invisible and through illusions.' },
        { name: 'Tactics', description: 'Prefer retreat unless cornered; dangerous H2H fighters in Dreamstream.' },
      ],
    },
  ),
  npcBase(
    'race_morpheomoth',
    'Morpheomoth',
    'Nightlord-corrupted independent dream personas. Drag sleepers into lethal Dream Pool traps. Cannot exist in the physical or Astral Plane; command Soul Leeches and serve Astral Avatars.',
    111,
    { iq: '3D6+4', me: '3D6+4', ma: '3D6', ps: '3D6+10', pp: '3D6+2', pe: '4D6', pb: '1D6', spd: '4D6' },
    { hpFormula: '0', sdc: '3D6*10+30', averageStandardPpe: '2D4' },
    {
      modifiers: {
        apm: 2,
        strike: 3,
        parry: 3,
        dodge: 1,
        pullPunch: 4,
        save_magic: 1,
        save_psionics: 2,
        save_horror_factor: 12,
        horrorFactor: 16,
      },
      metadata: {
        noHitPoints: true,
        sdcIncludesPe: true,
        sdcPerLevel: 10,
        dreamManipulationIspPerMinute: 10,
        dreamAttackDamage: '4D6+1D6/level',
        dreamAttackIsp: 10,
        createDreamObjectIspPerMinute: 12,
        dreamAbductionIsp: 20,
        dreamAbductionDurationMinutes: 20,
        dreamAbductionSave: 'vs psionic attack',
        dreamCombatBonusLevels: [1, 3, 5, 7, 10, 13],
        selfHealSdcPerIsp: '1D6',
        naturalIspFormula: '4D6*10+ME+10/level',
        cannotEnterPhysicalWorld: true,
        cannotEnterAstralPlane: true,
        typicalExperienceLevel: '2D4+1',
        commandsRaceIds: ['race_soul_leech', 'race_necrophim'],
        servesRaceIds: ['race_nightlord_avatar'],
        apmBonusLevels: [5, 7, 10],
      },
      capabilityType: 'innate',
      naturalIspFormula: '4D6*10+ME',
      innateSkills: [{ skillId: 'skill_lore_dreamstream', basePercent: 30 }],
      classAbilities: [
        { name: 'Dream Manipulation', description: 'Reshape dream landscape — H.F. 10 + level inside Pool; 10 I.S.P./minute.' },
        { name: 'Dream Attacks', description: 'Lethal dream-strike 4D6 + 1D6/level after winning dream combat roll — 10 I.S.P./attack.' },
        { name: 'Create Dream Object', description: 'Manifest objects/weapons — size 1 cu.ft/level, damage up to 2D6/level; 12 I.S.P./minute.' },
        { name: 'Dream Abduction', description: 'Drag sleeper into their Dream Pool (20 I.S.P., save vs psionics, 20 min +5 I.S.P./extra min). Damage in Pool carries to waking body.' },
        { name: 'Servants of the Ba\'al', description: 'Fear and obey Night Avatars; often lead Soul Leeches or Necrophim bands.' },
      ],
    },
  ),
];

// Patch Nightlord Avatar with BTS astral Night Avatar stats
const avatarIdx = races.findIndex((r) => r.id === 'race_nightlord_avatar');
if (avatarIdx === -1) throw new Error('race_nightlord_avatar not found');

const avatar = races[avatarIdx];
const hasBts = avatar.sources.some((s) => s.reference === 'Between the Shadows');
if (!hasBts) {
  avatar.sources.push({ gameSystem: 'nightbane', reference: 'Between the Shadows', pageNumber: 73 });
}
avatar.attributes.pp = '2D6+16';
avatar.attributes.spd = '1D6*10';
avatar.description =
  'Semi-independent extension of a `race_nightlord` — Physical (solid flesh, core p.175) or Astral Night Avatar (BTS pp.72–74): psychic-energy rulers of Ba\'al astral domains with ectoplasmic matter/energy control. Same mental stats as creator; used as war leaders and dream infiltrators. Destroying an Avatar weakens the parent Nightlord. Typical level ≈ half creator (1D4+3). Horror Factor 14.';
avatar.innateBonuses.modifiers.initiative = 3;
avatar.innateBonuses.modifiers.perception = 5;
avatar.innateBonuses.modifiers.strike = avatar.innateBonuses.modifiers.strike ?? 0;
avatar.innateBonuses.modifiers.save_psionics = 4;
Object.assign(avatar.innateBonuses.metadata, {
  btsAstralNightAvatar: true,
  createAstralDomain: true,
  matterEnergyControlTarget: 'ectoplasm',
  matterEnergyWorksInDreamstream: true,
  dreamCombatBonus: 4,
  commandedForcesBts: {
    race_hound: '10-60',
    race_hunter: '10-60',
    race_torturian: '5-30',
    race_necrophim: '2-12',
  },
  typicalExperienceLevelBts: '1D4+3',
  ppPerLevel: 20,
});
avatar.classAbilities.push(
  {
    name: 'BTS Astral Night Avatar',
    description:
      'Matter/energy control affects ectoplasmic matter (Astral Plane and Dreamstream). Can build astral domains (often by enslaving Astral Lords). Dream combat +4 plus M.E. bonuses.',
  },
  {
    name: 'Commanded Astral Forces (BTS)',
    description:
      'Typical entourage: 10–60 Hounds/Hunters, 5–30 Torturians (`race_torturian`), 2–12 Necrophim — see metadata.',
  },
);

// Append new races (skip if re-run)
const existingIds = new Set(races.map((r) => r.id));
for (const row of newRaces) {
  if (existingIds.has(row.id)) {
    console.warn(`SKIP existing ${row.id}`);
    continue;
  }
  races.push(row);
  console.log(`ADD ${row.id}`);
}

writeFileSync(npcPath, JSON.stringify(races, null, 2) + '\n', 'utf8');
console.log('Wrote', npcPath);
