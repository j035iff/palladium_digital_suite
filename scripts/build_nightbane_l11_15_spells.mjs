/**
 * Nightbane core wizard spells levels 11–15 (RPG pp. 146–150).
 * Run: node scripts/build_nightbane_l11_15_spells.mjs
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIZARD_PATH = join(root, 'src/data/content/magic/wizard.json');
const SCHEMAS_DIR = join(root, 'src/data/schemas');

const TARGET_IDS = [
  'magic_wizard_control_nightlands_denizen',
  'magic_wizard_create_magic_scroll',
  'magic_wizard_curse_neurosis',
  'magic_wizard_nightlands_passage',
  'magic_wizard_remove_curse',
  'magic_wizard_summon_and_control_animals',
  'magic_wizard_summon_fog',
  'magic_wizard_summon_nightlord_avatar',
  'magic_wizard_amulet',
  'magic_wizard_calm_storms',
  'magic_wizard_metamorphosis_mist',
  'magic_wizard_summon_and_control_rain',
  'magic_wizard_enchant_weapon',
  'magic_wizard_protection_circle_superior',
  'magic_wizard_summon_storm',
  'magic_wizard_summon_nightlord',
  'magic_wizard_sanctum',
  'magic_wizard_talisman',
  'magic_wizard_close_rift',
  'magic_wizard_id_barrier',
  'magic_wizard_restoration',
  'magic_wizard_dimensional_portal',
  'magic_wizard_teleport_superior',
];

const CITE_RE = /\s*\[cite:\s*[^\]]+\]/g;

function stripCites(value) {
  if (typeof value === 'string') return value.replace(CITE_RE, '').replace(/\s{2,}/g, ' ').trim();
  if (Array.isArray(value)) return value.map(stripCites);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripCites(v);
    return out;
  }
  return value;
}

function deepMerge(base, patch) {
  if (patch == null) return base;
  if (Array.isArray(patch)) return patch.map((item, i) => deepMerge(base?.[i], item) ?? item);
  if (typeof patch !== 'object') return patch;
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  for (const [k, v] of Object.entries(patch)) {
    out[k] =
      k in out && typeof out[k] === 'object' && !Array.isArray(out[k]) && v && typeof v === 'object' && !Array.isArray(v)
        ? deepMerge(out[k], v)
        : v;
  }
  return out;
}

const REPLACE_KEYS = new Set([
  'inflictedModifiers',
  'grantedModifiers',
  'effectProfiles',
  'reveals',
  'sources',
  'ritualProfile',
  'alarmTrigger',
  'spawnedPresence',
  'materialComponents',
  'healing',
  'damage',
  'save',
  'permanentCosts',
  'resolutionTable',
  'formTransformation',
  'forgedOutputs',
  'limitations',
  'range',
  'duration',
  'ppe',
]);

function applyPatch(spell, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (REPLACE_KEYS.has(k) || v == null || typeof v !== 'object' || Array.isArray(v)) {
      spell[k] = v;
    } else if (spell[k] && typeof spell[k] === 'object' && !Array.isArray(spell[k])) {
      spell[k] = deepMerge(spell[k], v);
    } else {
      spell[k] = v;
    }
  }
  return spell;
}

const DESCRIPTIONS = {
  magic_wizard_control_nightlands_denizen:
    'An incantation specially designed to control the servants of the Nightlords (Hounds, Hunters and Dopplegangers). This ritual does not summon the creatures, but enables the sorcerer to control them when encountered, or if summoned through a different spell. The sorcerer can control two Dopplegangers or one Hound or Hunter every time the incantation is used. The creatures get to make a saving throw vs magic. This saving throw is at +4 if the sorcerer is directly working against the Nightlords, and at -4 if the mystic is serving the Nightlords, directly or indirectly. A successful save means the creature is not controlled by the arcanist. A failed roll means it will obey the arcanist to the best of its ability. At the end of the mandatory service to the arcanist, the mage can try to renew his control by using the invocation once again. Alternatively, he may try to banish the creature or just let his control slip away. If the latter happens, the creature may decide to turn against the sorcerer.',
  magic_wizard_create_magic_scroll:
    'The arcanist is able to transfer mystic energy and powers into an inanimate object. In this case, the mage can magically make the words to a magic spell appear on paper. The only real limitation other than sufficient P.P.E. is that the mage must be able to read and write. Some modern-day sorcerers have been able to transfer the spell to a computer disk instead of paper! The "scroll" must still be read aloud for its magic to work, but some "techno-wizards" have taken to carrying desktops with several "scrolls" loaded into their hard disks! Computerized scrolls cannot be "copied" successfully; each document thus created is the only one, and it disappears from the computer\'s memory when used. The invocation is created by writing the words of the spell in the sand or dirt with a stick while speaking the words aloud. The words magically appear on the paper (or computer screen) as he writes and speaks them. When done the spell has been transferred to the paper and can be read and used by anybody who can read the particular language it was written in. Because the paper or parchment has been charged with P.P.E., anyone, fellow mage or housewife, can read the scroll and the magic spell will be cast. To activate the scroll the spell must be read aloud. The words on a scroll disappear the moment they are read aloud, leaving only a blank piece of paper. No camera of any kind can photograph (record) the mystic writing (appears blank) and nobody can copy the spell down. This is why scroll conversion is so difficult. Note: the power of the scroll-spell can be controlled by its creator and can range from level one potency to the current level of its creator. However, the creator\'s enhanced spell strength cannot be transferred, so all saving throws from scroll magic are 12 if created as a spell or 16 if created as a ritual.',
  magic_wizard_curse_neurosis:
    'The incantation afflicts its victim with a neurotic disorder. The sorcerer can implant one specific neurosis or roll on the random neurosis table of the insanity section. The insanity is temporary and fades away several days after the duration time has elapsed.',
  magic_wizard_nightlands_passage:
    'This invocation instantly transports the caster and anybody/anything within the radius of the effect (10 ft/3.0 m per level of experience) into or out of the Nightlands. The caster and other "passengers" will be transported into the corresponding point in the Nightlands. Unwilling passengers get a saving throw vs magic; a success means they remain behind as the rest are teleported out.',
  magic_wizard_remove_curse:
    'The mage can attempt to remove any type of curse using this incantation. To determine success a 20-sided die is rolled (plus bonuses) to save vs magic. A successful save means that the curse is instantly gone. A failed roll to save means the curse is still in effect. Try again with a new invocation and another 140 P.P.E. The remove curse is a powerful magic that provides bonuses to save vs magic and to remove that curse. Those bonuses are: Spell: +5 to save. Ritual: +10 to save.',
  magic_wizard_summon_and_control_animals:
    'A superior summoning pentacle, the invocation empowers the arcanist to summon and control any type of animal. Tiny animals like frogs and mice — 40 per level of experience. Medium-sized animals like dogs and cats (up to 30 lbs/13.6 kg) — 8 per level of experience. Large animals like horses — 6 per level of experience. Exotic animals, including animals which are not indigenous to the area (such as a tiger, panther or elephant in New York City) — only one per level of experience. As usual, any animal who comes into the arcanist\'s 600 foot (183 m) range while in the pentagram will obey the mage unless it makes a successful save vs magic. Familiars are not influenced by the control of this pentagram.',
  magic_wizard_summon_fog:
    'The spell caster can call forth a dense fog that will impair vision and make travel difficult. The fog is so thick that a person can only see clearly for four feet (1.2 m) and see only blurred, shadowy figures and shapes for about another 10 ft (3.0 m). Anything beyond 10 ft (3.0 m) is totally obscured by fog. The fog can be made to cover a one mile area (1.6 km) per level of the sorcerer. Safe travel is slowed to a crawl. On foot, a safe speed is 10 or less, and even then there is a 30% chance of tripping over something every 30 ft (9.1 m) or so. A completely safe speed is 3. Running faster than a speed of 10 is hazardous, with a likelihood (60%) of falling every 30 ft (9.1 m) of travel. All sense of direction is lost. A safe speed for an automobile is 5 mph (8 kmph). Up to 20 mph (32 kmph) can be attained, but the risk of running off the road is 60%, and for every half mile there is a 40% chance of crashing into something. Traveling faster than 25 mph (40 kmph) is certain disaster, with an 85% likelihood of running off the road and a 70% of crashing. Roll for every 600 ft (183 m). Air travel is impossible. Bonuses and Penalties: The fog adds a +20% to prowl skills. Long range combat and gunfights are extremely difficult. All such attacks, including distance magic and psychic attacks, are -5 to strike and opponents are +2 to dodge each other\'s attacks. The summoner can cancel the fog at any time or let it last out its full duration. It can be summoned day or night, any time of the year.',
  magic_wizard_summon_nightlord_avatar:
    'This risky ritual summons a specific Avatar of a Nightlord. The Avatar must be known by its given name and must be still active/living. The invocation will summon the Avatar from anywhere in the Nightlands or Earth, but if the Avatar is reluctant to be summoned, he resists the spell with an additional +5 to his saving throw. A reluctantly summoned avatar will arrive ready to fight and punish the sorcerer who dares to summon him. Even one who does not resist the summoning may have done so just to be able to teach the impudent mortal a lesson. The invocation does not offer any way to control or restrain the creature. For the most part, it is only used by cultists and servants of the Ba\'al.',
  magic_wizard_amulet:
    'The "amulet" is a potent invocation that instills a medallion of charm with mystic properties that will protect an individual from magic or supernatural forces. The only requirement of the invocation is that the amulet be made of one metal purified by fire or made of semiprecious stone. The sole purpose of an amulet is to protect. Protection is provided in several different ways. Any one of the following can be created by the amulet invocation.',
  magic_wizard_calm_storms:
    'Using ritual magic the mystic can turn a torrential rain into a drizzle, reduce winds to a gentle breeze, shrink ocean waves to normal, disperse a tornado in an instant and get the sun to peek through clearing skies.',
  magic_wizard_metamorphosis_mist:
    'Said to be the most powerful of all the metamorph magics, the mage can transform himself into a mist. As a mist, no physical or energy attacks can harm him. No locked door can stop him, for he can slip through the tiniest crack or keyhole. Although the mystic cannot communicate or cast magic, he can hear and see events around him as would a normal human being. Of course, he can materialize (naked) with a thought. The mist moves at a maximum speed of 14. Prowls (natural, innate ability) at an 80% skill proficiency, is completely silent, can hover up to 100 ft (30.5 m) high, and is semi-transparent.',
  magic_wizard_summon_and_control_rain:
    'The sorcerer can create a rainstorm out of thin air. The rain can be controlled to be a drizzle, light rain or downpour. One mile (1.6 km) per level of experience can be affected by the rain. A heavy storm will reduce visibility and slow travel.',
  magic_wizard_enchant_weapon:
    'This invocation is similar to the charm weapon spell but is more powerful. An enchanted weapon will permanently charge a weapon with mystical energy, enabling it to damage supernatural beings, including vampires. It will inflict double damage to all supernatural creatures (including Nightbane, Guardians, elementals and dragons), but does normal damage to humans and other S.D.C. beings. Missile weapons (guns, bows, crossbows, etc.) can be enchanted in the same manner, but it costs double the P.P.E. (600 points). Any projectile fired by the enchanted weapon will be considered to be enchanted and inflict double damage to supernatural foes.',
  magic_wizard_protection_circle_superior:
    'In principle and function, the superior protection circle is just like the simple circle, only stronger. The sorcerer must recite the invocation while drawing the circle in chalk or any substance. 250 P.P.E. are needed to initially create the circle, but a mere 20 P.P.E. will reactivate it. Anybody with sufficient P.P.E. and desire can reactivate a protection circle. The circle ceases to function only if it is seriously marred. The superior protection circle will protect everybody inside its radius by preventing any supernatural creatures from coming any closer than 20 ft (6.1 m) from its edge. Even greater beings (including the Nightlords) are held at bay. Lesser beings cannot stand to be within line of sight of the circle and are forced to leave (even if it\'s only to the next room with the door shut). This means no attacks are possible from the lesser beings. The circle also provides the following bonuses to all occupants: +5 to save vs all magic and psychic attacks, impervious to possession, +8 to save vs horror factor. Plus it provides an extra 10 P.P.E. to each mage and 10 I.S.P. to each psychic. Of course, the characters are vulnerable to conventional weapons and thrown objects.',
  magic_wizard_summon_storm:
    'The spell caster can create a destructive storm out of thin air. A rainstorm will create a torrential downpour of 4 inches of rain per hour, causing flooding even in cities. Flooded roads will immobilize all vehicles (water is 3 to 5 ft/0.9 to 1.5 m in height). Poor visibility will slow travel to about 20 mph (32 kmph). Traveling fast is likely to cause an accident. Roll on the following table for every two miles (3.2 km) traveled: 01-30 No problem, keep going. 31-39 Vehicle stalls out. 1-50% chance of restarting. 40-69 Vehicle runs off road and is immobilized. 70-00 Vehicle crashes into an obstacle or another vehicle. Vehicle is immobilized. All passengers roll 2D6 damage for every 10 mph (16 kmph) of vehicle speed. The storm is accompanied by damaging winds gusting to 35 and 45 mph (54 to 72 kmph). The rain and wind makes air travel impossible. A windstorm may be accompanied by light rain, but the real threat is high winds. Winds gust up to 70 and 90 mph (112 to 144 kmph), uprooting small trees, knocking down tree branches and electrical wires, and even overturning an occasional car. Travel on foot is very difficult, reducing a character\'s speed by 90%. Travel in automobiles is slowed to about 20 mph (32 kmph). Traveling any faster is likely to cause the vehicle to run off the road and flip over. Roll 40% + 10% for every 10 mph (16 kmph) above 20 mph (32 kmph). Roll once for every 4 miles (6.4 km) of travel. Air travel is extremely hazardous.',
  magic_wizard_summon_nightlord:
    'This dangerous and little-known invocation will summon a Nightlord from anywhere on Earth or the Nightlands. However, if the Nightlord does not wish to be summoned, his normal saving throw vs magic is at +8. If he fails his save, the Nightlord will arrive in a state of rage, ready to destroy the sorcerer unless he can be somehow restrained or convinced otherwise. For the most part, the ritual is cast only by sorcerers who are allied or work for the Nightlord, and when their master is expecting the summons. The title/given name (not the real name) of the Nightlord is necessary to cast the invocation.',
  magic_wizard_sanctum:
    'The mage can protect a room of up to 30 x 30 ft (9.1 x 9.1 m) from mystic influence by using the sanctum invocation. The room is instantly turned into a safe haven, or sanctum, free of mystic disturbance. While inside the room, the mage cannot be found by the locate spell, cannot be seen by second sight, and cannot be affected by bonding magic. These protections work only within the room. Even more impressive is that animated dead and undead cannot enter the sanctum. Lesser monsters cannot enter unless they save vs magic (included Hounds and Hunters). Greater beings and humans are not affected and enter at will.',
  magic_wizard_talisman:
    'The term talisman is believed to have its roots in the Arabic language and means "to make marks like a magician." Indeed, that is what a talisman is, an extension of magic, an item that contains magic power. A talisman can be made from almost anything, although it is most commonly designed as a medallion, necklace, mantle, pin, charm, small statue, headdress, or hand-held symbol. A talisman is designed to perform one function only. The invocation enables the sorcerer to empower an ordinary object with magic powers. The only substances which cannot be used are iron and plastic, and the object cannot be larger than two feet (0.6 m) tall, long or wide. Once an object is transformed into a talisman, the sorcerer can empower it with one magic spell. The spell can be selected from levels one through eight, excluding illusion types. Of course, to implant the spell the sorcerer must already know it and it must be a spell invocation, not a ritual. After its initial creation, the talisman can be used to cast its one spell for a total of three times. After all three have been cast, the object is drained. The mystic who created the talisman can replace its three exhausted spells by casting that same spell invocation combined with part of the talisman spell or ritual. The cost of the recharge is 50 P.P.E. plus the cost of the spell invocation. Note that the process must be repeated for each of the three identical spells (each at the cost of 50 P.P.E. plus the spell\'s P.P.E. cost). Thus, to recharge all three identical spells would cost 150 P.P.E. points plus the spells P.P.E. costs. The aspect of three spells attributed to magic items may be the source of legends that grant three wishes. A talisman can be used for one purpose other than spells. The mage can elect to make it a potential psychic energy battery. Instead of spells, the mystic can put up to 50 P.P.E. into it initially and recharge it with 30 P.P.E. at the cost of 60. The talisman can then be used at a later time to bolster the character\'s normal P.P.E. reserve. A P.P.E. battery can never hold spells. A talisman can be destroyed by smashing it. That\'s all there is to it. If the arcanist who created it is killed or cannot be found, the talisman will be good for whatever number of spells that are currently inside it, and cannot be recharged. Remember, only the mage who created it can recharge it.',
  magic_wizard_close_rift:
    'The master of magic can close a Rift by sheer force of will. However, the monumental effort permanently drains the mage of two P.P.E. points from his permanent base whether successful or not. The mystic nature of the dimensional gateway gives it an automatic save versus magic attack. Consequently a Close Rift Ritual will increase one\'s odds for success. The Rift will automatically vanish if successful. A failure means the Rift is not affected and the wizard has lost 2 P.P.E. forever.',
  magic_wizard_id_barrier:
    'The character can erect a powerful, defensive shield of semi-transparent energy. The barrier itself emanates horror, and a character must save vs horror factor 14 to even come within 10 ft of it. Those who fail to save vs horror factor cannot pass through the barrier. Anybody who braves the barrier must roll again, this time to save vs magic. A successful save means the character passes through the barrier with only a headache and loses one attack that melee. A failed save means the character must face an apparition of his greatest fear. The apparition is exactly like the sixth level invocation and will last as long as the barrier remains up. Only the mage who created the Id Barrier can make the apparition vanish, or cancel the barrier before its normal duration time.',
  magic_wizard_restoration:
    'This powerful incantation will instantly and completely heal wounds, cuts, bruises, burns, etc., restoring full S.D.C. and hit points, while leaving minimal scarring. It is so powerful a magic that it can heal internal organs and mend bones. Even bullets or shrapnel will magically disappear and the wounds heal. The invocation can also restore severed limbs, such as a hand, arm, or leg, providing that the limb has not been severed from its body for more than 48 hours. Substitute limbs and organs cannot be used. Nor can this invocation restore life or replace missing limbs or organs.',
  magic_wizard_dimensional_portal:
    'The dimensional portal invocation opens a two-way door to another dimension. The mage can open a door to a specific world or randomly. This is the only way a greater being can enter into our dimension. Once the dimensional portal closes, the only way back in or out is to open another portal. One of the real dangers of using this magic is that some unwanted "thing" always slips through.',
  magic_wizard_teleport_superior:
    'The sorcerer can instantly transport himself and up to 1000 lbs (450 kg) per level of experience, hundreds of miles away. To teleport, the mage must have a mental picture of his destination. The best results can be achieved when the character is personally acquainted with the target destination, some place he has visited or knows well. However, locations seen in photographs or described in detail can also be reached, but there is always a chance of a miscalculation. The mage can teleport himself alone, or other people and objects within 20 ft (6.1 m) of him. The total number of people and items which the mystic can teleport is limited by the amount of weight he can handle (1000 lbs/450 kg per level of experience). Chances of a Successful Teleport: 1) Teleporting to a familiar location or a destination visible from one\'s starting point — 99%. 2) A place seen only a few times before (2-6 times) — 85%. 3) A place seen in a photo (the photograph is being looked at during the moment of teleportation) — 80%. 4) A place never seen before, but described in detail — 58%. 5) A place never before visited and known only by name or brief description — 20%.',
};

const AMULET_PROFILES = [
  {
    name: 'Charm',
    description: 'A general ward against magic that provides a bonus of +1 to save versus magic and psychic attacks.',
    ppeOverride: { baseActivation: 290 },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: { saveMagic: 1 },
    },
  },
  {
    name: 'Protection Against Sickness',
    description: 'Amulet that specifically protects against the eight level magic invocation "sickness." Bonus of +6 to save.',
    ppeOverride: { baseActivation: 290 },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: { saveMagic: 6, notes: 'Applies vs sickness invocation only.' },
    },
  },
  {
    name: 'Protection Against Insanity',
    description: 'Adds a bonus of +4 to save against all magically induced insanities.',
    ppeOverride: { baseActivation: 320 },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: { saveMagic: 4, notes: 'Applies vs magically induced insanities only.' },
    },
  },
  {
    name: 'Protection Against the Supernatural',
    description: 'Adds a bonus of +2 to save vs horror factor.',
    ppeOverride: { baseActivation: 300 },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: { saveHorrorFactor: 2 },
    },
  },
  {
    name: 'See the Invisible',
    description: 'Enables only the wearer of the medallion to see the invisible.',
    ppeOverride: { baseActivation: 500 },
    grantedModifiers: {
      target: 'touch',
      immunities: ['see_the_invisible'],
    },
  },
  {
    name: 'Sense the Presence of Spirits',
    description: 'The amulet changes color whenever an entity(s) is in the area. Range: 60 ft (18.3 m).',
    ppeOverride: { baseActivation: 310 },
  },
  {
    name: 'Turn the Undead',
    description:
      'A charm that will prevent any of the undead from physically touching them while they wear or hold the amulet. The amulet works much like a cross does against vampires. Effective against all undead.',
    ppeOverride: { baseActivation: 400 },
    grantedModifiers: {
      target: 'touch',
      immunities: ['undead_touch'],
    },
  },
];

const STORM_TRAVEL_TABLE = {
  rollKind: 'd100',
  label: 'Rainstorm Vehicle Travel (per 2 miles / 3.2 km)',
  resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
  entries: [
    { percentile: { min: 1, max: 30 }, label: 'No Problem', effect: 'Keep going.' },
    {
      percentile: { min: 31, max: 39 },
      label: 'Stall',
      effect: 'Vehicle stalls out. 1-50% chance of restarting.',
    },
    {
      percentile: { min: 40, max: 69 },
      label: 'Run Off Road',
      effect: 'Vehicle runs off road and is immobilized.',
    },
    {
      percentile: { min: 70, max: 100 },
      label: 'Crash',
      effect:
        'Vehicle crashes into an obstacle or another vehicle. Vehicle is immobilized. All passengers roll 2D6 damage for every 10 mph (16 kmph) of vehicle speed.',
    },
  ],
};

const PATCHES = {
  magic_wizard_control_nightlands_denizen: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['utility', 'mind_control', 'nightlands'],
    range: { summary: '30 ft (9.1 m)', kind: 'distance', distanceValue: 30, distanceUnit: 'feet' },
    duration: { summary: '24 hours per level of experience.', kind: 'day', perLevel: '24 hours' },
    save: {
      summary: 'Standard (+4 vs Nightlords, -4 if serving Nightlords).',
      saveKind: 'standard',
      bonus: '+4 or -4 conditionally',
    },
    targetCountFormula: '2 Dopplegangers or 1 Hound/Hunter',
  },
  magic_wizard_create_magic_scroll: {
    magicKind: 'enchantment',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'enchantment', 'scroll'],
    ppe: {
      baseActivation: '100 + spell cost',
      notes: '100 plus the P.P.E. needed to cast the magic spell placed on the scroll.',
    },
    range: { summary: 'Identical to spell placed on scroll.', kind: 'special' },
    duration: { summary: 'As per scroll.', kind: 'special' },
    save: { summary: 'Standard magic save (12 spell / 16 ritual).', saveKind: 'magic' },
    limitations: {
      otherLimitations:
        'The mage must be able to read and write. All saving throws from scroll magic are 12 if created as a spell or 16 if created as a ritual.',
    },
    forgedOutputs: [
      {
        outputTemplateId: 'template_magic_scroll',
        count: 1,
        destination: 'caster_inventory',
        initialPresence: 'carried',
        bindToCaster: false,
      },
    ],
  },
  magic_wizard_curse_neurosis: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['offensive', 'curse', 'insanity'],
    limitations: { touchRequired: true },
    range: { summary: 'Touch', kind: 'touch' },
    duration: { summary: '24 hours per level of experience.', kind: 'day', perLevel: '24 hours' },
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: { statusEffects: ['neurosis'] },
  },
  magic_wizard_nightlands_passage: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'movement', 'nightlands', 'teleport'],
    range: {
      summary: '10 ft (3.0 m) radius per level of experience.',
      kind: 'radius',
      radiusValue: '10 * level',
      radiusUnit: 'feet',
    },
    areaOfEffect: { summary: '10 ft (3.0 m) radius per level of experience.' },
    duration: { summary: 'Instant', kind: 'instant' },
    save: { summary: 'Standard if unwilling to be transported.', saveKind: 'standard' },
  },
  magic_wizard_remove_curse: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'healing', 'curse'],
    range: { summary: 'Touch or 10 ft (3.0 m).', kind: 'touch' },
    duration: { summary: 'Instant removal', kind: 'instant' },
    save: { summary: 'None (caster rolls save vs magic to remove curse).', saveKind: 'none' },
    notes: 'Remove curse provides +5 to save as spell, +10 as ritual.',
  },
  magic_wizard_summon_and_control_animals: {
    magicKind: 'summoning',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['utility', 'summoning', 'animals'],
    range: { summary: '600 ft (183 m)', kind: 'distance', distanceValue: 600, distanceUnit: 'feet' },
    duration: { summary: '5 hours per level of experience.', kind: 'hour', perLevel: '5 hours' },
    save: { summary: 'Standard for animals.', saveKind: 'standard' },
    targetCountFormula:
      'Tiny: 40/level; Medium: 8/level; Large: 6/level; Exotic: 1/level. Familiars not affected.',
    spawnedPresence: {
      kind: 'creature',
      label: 'Summoned animals',
      countFormula: 'Varies by size category',
      notes: 'Superior summoning pentacle. Animals in range obey unless they save vs magic.',
    },
  },
  magic_wizard_summon_fog: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'weather', 'area'],
    range: {
      summary: 'Up to 10 miles (16 km) per level of experience.',
      kind: 'distance',
      distanceValue: '10 * level',
      distanceUnit: 'miles',
    },
    areaOfEffect: { summary: 'One mile area (1.6 km) per level of the sorcerer.' },
    duration: { summary: '1 hour per level of experience.', kind: 'hour', perLevel: '1 hour' },
    save: { summary: 'None.', saveKind: 'none' },
    inflictedModifiers: {
      combatModifiers: { strike: -5 },
      globalSkillModifier: { value: 20, notes: 'Prowl only.' },
    },
    grantedModifiers: {
      target: 'area',
      combatModifiers: { dodge: 2 },
      grantedSkills: [{ name: 'Prowl', basePercentage: '+20%' }],
    },
  },
  magic_wizard_summon_nightlord_avatar: {
    magicKind: 'summoning',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['summoning', 'nightlands', 'nightlord'],
    range: { summary: 'Immediate', kind: 'touch' },
    duration: { summary: '1 hour per level of experience.', kind: 'hour', perLevel: '1 hour' },
    save: {
      summary: 'Standard if the Avatar resists the summons (+5 to save).',
      saveKind: 'standard',
      bonus: '+5 if reluctant',
    },
    spawnedPresence: {
      kind: 'creature',
      label: 'Nightlord Avatar',
      notes: 'Must be known by given name and still active. No built-in control or restraint.',
    },
  },
  magic_wizard_amulet: {
    magicKind: 'enchantment',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'enchantment', 'protection'],
    ppe: {
      baseActivation: '290 or more',
      notes: 'Cost varies based on the specific amulet profile selected.',
    },
    range: { summary: 'Holder/wearer of the amulet.', kind: 'touch' },
    duration: { summary: 'Exists as long as the medallion is not destroyed.', kind: 'permanent' },
    save: { summary: 'None.', saveKind: 'none' },
    effectProfiles: AMULET_PROFILES,
    materialComponents: {
      label: 'Amulet Materials',
      entries: [
        {
          label: 'Medallion',
          quantity: { kind: 'fixed', value: 1 },
          condition: 'other',
          notes: 'Made of one metal purified by fire or made of semiprecious stone.',
        },
      ],
    },
    forgedOutputs: [
      {
        outputTemplateId: 'template_amulet',
        count: 1,
        destination: 'caster_inventory',
        initialPresence: 'carried',
        bindToCaster: false,
      },
    ],
  },
  magic_wizard_calm_storms: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['utility', 'weather'],
    range: {
      summary: 'Immediate area; one mile (1.6 km) per level of experience.',
      kind: 'distance',
      distanceValue: '1 * level',
      distanceUnit: 'miles',
    },
    areaOfEffect: { summary: 'One mile (1.6 km) area per level of experience.' },
    duration: { summary: '1 hour per level of experience.', kind: 'hour', perLevel: '1 hour' },
    save: { summary: 'None.', saveKind: 'none' },
  },
  magic_wizard_metamorphosis_mist: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'metamorphosis', 'movement'],
    range: { summary: 'Self, or others through ritual magic.', kind: 'self' },
    duration: { summary: '20 minutes per level of experience.', kind: 'minute', perLevel: '20 minutes' },
    save: { summary: 'None or standard if an unwilling subject.', saveKind: 'standard' },
    grantedModifiers: {
      target: 'self',
      immunities: ['physical_damage', 'energy_damage'],
      movement: { flightSpeed: '14 mph (23 km/h)', hover: true },
      grantedSkills: [{ name: 'Prowl', basePercentage: '80%' }],
    },
    formTransformation: {
      mode: 'sheet_replacement',
      targetTemplateId: 'template_mist_form',
      masksCharacterSheet: true,
      preservedAspects: ['mind', 'alignment', 'ppe_pool'],
      notes: 'Cannot communicate or cast magic while mist. Can materialize naked at will.',
    },
  },
  magic_wizard_summon_and_control_rain: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['utility', 'weather'],
    range: {
      summary: 'Immediate area or up to 10 miles (16 km) away per level of experience.',
      kind: 'distance',
      distanceValue: '10 * level',
      distanceUnit: 'miles',
    },
    areaOfEffect: { summary: 'One mile (1.6 km) per level of experience.' },
    duration: { summary: '1 hour per level of experience.', kind: 'hour', perLevel: '1 hour' },
    save: { summary: 'None.', saveKind: 'none' },
  },
  magic_wizard_enchant_weapon: {
    magicKind: 'enchantment',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['utility', 'enchantment', 'buff'],
    ppe: {
      baseActivation: 300,
      notes: '600 P.P.E. if enchanting a missile weapon.',
    },
    range: { summary: 'Touch', kind: 'touch' },
    duration: { summary: 'Permanent, or until the weapon is destroyed.', kind: 'permanent' },
    save: { summary: 'None.', saveKind: 'none' },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: { damageMultiplier: 2, damageCondition: 'against supernatural beings' },
    },
    forgedOutputs: [
      {
        outputTemplateId: 'template_enchanted_weapon',
        count: 1,
        destination: 'touch_target_inventory',
        initialPresence: 'carried',
        bindToCaster: false,
      },
    ],
  },
  magic_wizard_protection_circle_superior: {
    magicKind: 'circle',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['utility', 'ward', 'protection'],
    ppe: {
      baseActivation: 250,
      notes: 'Reactivate for 20 P.P.E. when duration expires.',
    },
    range: { summary: 'Radius of the circle.', kind: 'radius' },
    duration: {
      summary: '24 hours, but can be reactivated.',
      kind: 'day',
      durationValue: 1,
      upkeep: {
        interval: { summary: 'When duration expires', kind: 'day', durationValue: 1 },
        cost: { resource: 'ppe', amount: 20 },
        timing: 'before_expiry',
        resetsDuration: true,
        failureState: { summary: 'Circle deactivates' },
      },
    },
    save: { summary: 'None.', saveKind: 'none' },
    grantedModifiers: {
      target: 'area',
      immunities: ['possession'],
      combatModifiers: { saveMagic: 5, saveHorrorFactor: 8 },
    },
    notes: 'Lesser beings forced to leave line of sight. +10 P.P.E. per mage and +10 I.S.P. per psychic inside circle.',
  },
  magic_wizard_summon_storm: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['offensive', 'weather', 'area'],
    range: {
      summary: 'Immediate area or up to 10 miles (16 km) away.',
      kind: 'distance',
      distanceValue: 10,
      distanceUnit: 'miles',
    },
    duration: { summary: '1 hour per level of experience.', kind: 'hour', perLevel: '1 hour' },
    save: { summary: 'None.', saveKind: 'none' },
    resolutionTable: STORM_TRAVEL_TABLE,
    inflictedModifiers: {
      statAdjustments: {
        spd: { kind: 'multiplier', value: 0.1, rounding: 'floor', notes: 'Foot travel in windstorm.' },
      },
    },
  },
  magic_wizard_summon_nightlord: {
    magicKind: 'summoning',
    isRitual: true,
    spellStrengthBase: 16,
    tags: ['summoning', 'nightlands', 'nightlord'],
    range: { summary: 'Immediate', kind: 'touch' },
    duration: { summary: '30 minutes per level of experience.', kind: 'minute', perLevel: '30 minutes' },
    save: { summary: 'If the Nightlord is unwilling, he saves at +8.', saveKind: 'magic', bonus: '+8 if unwilling' },
    spawnedPresence: {
      kind: 'creature',
      label: 'Nightlord',
      notes: 'Requires title/given name (not real name). No built-in control.',
    },
  },
  magic_wizard_sanctum: {
    magicKind: 'enchantment',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'ward', 'protection'],
    range: {
      summary: '30x30 ft (9.1x9.1 m) room; up to 200 miles (320 km) away.',
      kind: 'distance',
      distanceValue: 200,
      distanceUnit: 'miles',
    },
    areaOfEffect: { summary: '30x30 ft (9.1x9.1 m) room.' },
    duration: { summary: 'The lifetime of the mage or until canceled.', kind: 'permanent' },
    save: { summary: 'None (lesser monsters save vs magic to enter).', saveKind: 'none' },
    grantedModifiers: {
      target: 'area',
      immunities: ['locate', 'second_sight', 'bonding_magic', 'undead_entry'],
    },
    notes: 'Hounds and Hunters must save vs magic to enter. Greater beings and humans enter at will.',
  },
  magic_wizard_talisman: {
    magicKind: 'enchantment',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'enchantment'],
    ppe: {
      baseActivation: 500,
      notes:
        'Recharge each of three spell uses: 50 P.P.E. plus spell cost. P.P.E. battery: 50 initial, recharge 30 at cost of 60.',
    },
    limitations: {
      otherLimitations:
        'Iron and plastic cannot be used. Object cannot exceed 2 ft (0.6 m) in any dimension. Spell levels 1-8 only, no illusions.',
    },
    range: { summary: 'Varies with type of spell.', kind: 'special' },
    duration: { summary: 'Talisman exists until destroyed.', kind: 'permanent' },
    save: { summary: 'Standard.', saveKind: 'standard' },
    forgedOutputs: [
      {
        outputTemplateId: 'template_talisman',
        count: 1,
        destination: 'caster_inventory',
        initialPresence: 'carried',
        bindToCaster: false,
      },
    ],
  },
  magic_wizard_close_rift: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'dimensional'],
    ppe: {
      baseActivation: 200,
      notes: 'Plus permanently drains 2 P.P.E. from caster base whether successful or not.',
    },
    range: { summary: '100 feet (30.5 m)', kind: 'distance', distanceValue: 100, distanceUnit: 'feet' },
    duration: { summary: 'Instant', kind: 'instant' },
    save: { summary: 'Standard (Rift has automatic save vs magic).', saveKind: 'standard' },
    permanentCosts: [
      {
        resource: 'ppe_max',
        reduction: { kind: 'fixed', value: 2 },
        trigger: 'on_cast',
        notes: 'Permanently drains 2 P.P.E. from permanent base whether successful or not.',
      },
    ],
    notes: 'Close Rift Ritual improves odds of success.',
  },
  magic_wizard_id_barrier: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['defensive', 'ward', 'illusion'],
    range: {
      summary: 'Up to 200 ft (61.0 m) away, plus 100 ft (30.5 m) per level of experience.',
      kind: 'distance',
      distanceValue: '200 + (100 * level)',
      distanceUnit: 'feet',
    },
    duration: { summary: '3 minutes per level of experience.', kind: 'minute', perLevel: '3 minutes' },
    save: { summary: 'Standard, and vs horror factor 14 to approach within 10 ft.', saveKind: 'standard' },
    horrorFactor: 14,
    spawnedPresence: {
      kind: 'construct',
      name: 'Id Barrier',
      notes: 'Failed magic save triggers sixth-level apparition of greatest fear until barrier ends.',
    },
  },
  magic_wizard_restoration: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['healing'],
    range: { summary: 'Touch or 3 ft away (0.9 m).', kind: 'touch' },
    duration: { summary: 'Instant and permanent.', kind: 'permanent' },
    save: { summary: 'None.', saveKind: 'none' },
    healing: {
      hpFormula: '100%',
      sdcFormula: '100%',
      cures: ['wounds', 'burns', 'internal_damage', 'broken_bones', 'severed_limbs'],
      notes:
        'Restores full S.D.C. and hit points. Severed limbs if detached less than 48 hours. Cannot restore life or replace missing limbs.',
    },
  },
  magic_wizard_dimensional_portal: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'dimensional', 'movement'],
    range: { summary: 'A few feet away.', kind: 'distance', distanceValue: 10, distanceUnit: 'feet' },
    duration: {
      summary: '30 seconds (2 melees) per level as spell; one minute per level as ritual.',
      kind: 'special',
      perLevel: '30 seconds (spell) or 1 minute (ritual)',
    },
    save: { summary: 'None.', saveKind: 'none' },
    notes: 'Two-way door to another dimension. Some unwanted entity always slips through.',
  },
  magic_wizard_teleport_superior: {
    magicKind: 'invocation',
    isRitual: false,
    spellStrengthBase: 12,
    tags: ['utility', 'movement', 'teleport'],
    range: {
      summary: 'Self or others within 20 ft (6.1 m); 300 miles (480 km) per level of experience.',
      kind: 'distance',
      distanceValue: '300 * level',
      distanceUnit: 'miles',
    },
    duration: { summary: 'Instant', kind: 'instant' },
    save: { summary: 'None', saveKind: 'none' },
    resolutionTable: {
      rollKind: 'd100',
      label: 'Results of an Unsuccessful Teleport',
      resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
      entries: [
        {
          percentile: { min: 1, max: 40 },
          label: 'Wrong Place (Far)',
          effect: 'Appear at the wrong place. No idea of present location, 3D6x100 miles (480 to 2900 km) off course.',
        },
        {
          percentile: { min: 41, max: 75 },
          label: 'Wrong Place (Near)',
          effect: 'Appear at the wrong place. No idea of present location, 1D6x100 miles (160 to 960 km) off course.',
        },
        {
          percentile: { min: 76, max: 98 },
          label: 'Fall',
          effect: 'Teleport several feet above the ground; everybody falls, suffering 2D6 damage.',
        },
        {
          percentile: { min: 99, max: 100 },
          label: 'Instant Death',
          effect: 'Teleport into an object; instant death.',
        },
      ],
    },
    notes:
      'Weight limit 1000 lbs (450 kg) per level. Success: familiar/visible 99%; seen 2-6 times 85%; photo 80%; described 58%; name only 20%.',
  },
};

export function buildNightbaneL11to15Spells() {
  const wizard = JSON.parse(fs.readFileSync(WIZARD_PATH, 'utf8'));
  const byId = new Map(wizard.map((row) => [row.id, row]));

  return TARGET_IDS.map((id) => {
    const base = byId.get(id);
    if (!base) throw new Error(`Missing wizard spell: ${id}`);

    let spell = stripCites(JSON.parse(JSON.stringify(base)));
    if (DESCRIPTIONS[id]) spell.description = DESCRIPTIONS[id];
    if (PATCHES[id]) applyPatch(spell, PATCHES[id]);
    delete spell.ranges;

    return spell;
  });
}

function spliceIntoWizard(spells) {
  const wizard = JSON.parse(fs.readFileSync(WIZARD_PATH, 'utf8'));
  const patchById = new Map(spells.map((row) => [row.id, row]));
  let updated = 0;

  const merged = wizard.map((row) => {
    const patch = patchById.get(row.id);
    if (!patch) return row;
    updated += 1;
    return patch;
  });

  fs.writeFileSync(WIZARD_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  return updated;
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
    if (!validate(spell)) {
      errors.push({ id: spell.id, errors: validate.errors });
    }
  }
  return { ok: errors.length === 0, errors, count: spells.length };
}

if (process.argv[1] && process.argv[1].endsWith('build_nightbane_l11_15_spells.mjs')) {
  const patchPath = join(root, 'scripts/_nightbane_l11_15_patch.json');
  const extractPath = join(root, 'scripts/_nb_spells_l11_15_extract.txt');

  const spells = buildNightbaneL11to15Spells();
  fs.writeFileSync(patchPath, `${JSON.stringify(spells, null, 2)}\n`);
  console.log('Wrote', spells.length, 'spells to', patchPath);

  const updated = spliceIntoWizard(spells);
  console.log('Spliced', updated, 'spells into wizard.json');

  const validation = validateSpells(spells);
  if (validation.ok) {
    console.log('Validation: PASS — all', validation.count, 'spells valid against palladium-magic.schema.json');
  } else {
    console.error('Validation: FAIL —', validation.errors.length, 'spell(s) with errors');
    for (const row of validation.errors) {
      console.error(`  ${row.id}:`, JSON.stringify(row.errors, null, 2));
    }
    process.exitCode = 1;
  }

  for (const temp of [patchPath, extractPath]) {
    if (fs.existsSync(temp)) {
      fs.unlinkSync(temp);
      console.log('Deleted', temp);
    }
  }
}
