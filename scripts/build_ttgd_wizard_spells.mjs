/**
 * Through the Glass Darkly sorcerer/wizard spells (pp. 56–63).
 * Run: node scripts/build_ttgd_wizard_spells.mjs
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIZARD_PATH = join(root, 'src/data/content/magic/wizard.json');
const SCHEMAS_DIR = join(root, 'src/data/schemas');
const SOURCE = 'Through the Glass Darkly';
const INSERT_BEFORE_ID = 'magic_wizard_astral_portal';

function src(pageNumber) {
  return [{ gameSystem: 'nightbane', reference: SOURCE, pageNumber }];
}

function base(id, name, spellLevel, description, fields = {}) {
  return {
    id,
    name,
    description,
    gameSystems: ['nightbane'],
    sources: src(fields.pageNumber ?? 56),
    school: 'wizard',
    spellLevel,
    magicKind: fields.magicKind ?? 'invocation',
    isRitual: fields.isRitual ?? false,
    spellStrengthBase: fields.spellStrengthBase ?? (fields.isRitual ? 16 : 12),
    tags: fields.tags ?? ['utility'],
    ppe: fields.ppe ?? { baseActivation: 0 },
    range: fields.range ?? { summary: 'Touch', kind: 'touch' },
    duration: fields.duration ?? { summary: 'Instant', kind: 'instant' },
    save: fields.save ?? { summary: 'None', saveKind: 'none' },
    ...fields.extra,
  };
}

const SPELLS = [
  base('magic_wizard_reanimate_flesh', 'Reanimate Flesh', 1,
    'With this spell, a mage can animate and control up to 15 lbs (6 kg) of dead flesh. It\'s important to note that this magic cannot be used to animate and control the entire body of any one creature, even if it\'s a tiny animal like a frog or mouse. Instead, it is used to animate a body part such as a hand, arm, foot, or the jaw of a head. The reanimated flesh can then be given simple verbal instructions by the caster ("grab this," "swallow this," "go there", "come here", "stop," etc.). The spell may have been invented to create a sort of temporary assistant for ceremonies and research ("hold this vial," "point that there," "keep this book open"), or as a means to frighten people. However, the spell also has more imaginative uses. Think about the word "handcuffs", for example, especially if the animated hand or arm is bigger than human size. Note that the reanimated flesh of a human hand or foot has 2D4+2 S.D.C., an arm and hand has 2D4+6 S.D.C., a human-sized head 2D6+4 S.D.C., internal organs (a beating heart, a squirming liver, etc.) have 1D6 S.D.C.; giant-sized limbs have twice the S.D.C. of human-sized counterparts. Note: Since the spell animates flesh, the body part cannot be dead more than 72 hours or it will not work.',
    {
      pageNumber: 56,
      tags: ['utility', 'necromancy', 'animation'],
      ppe: { baseActivation: 4 },
      duration: { summary: 'One hour', kind: 'hour', durationValue: 1 },
      spawnedPresence: {
        kind: 'construct',
        name: 'Reanimated flesh',
        notes: 'Up to 15 lbs (6 kg) of dead flesh; part cannot be dead more than 72 hours.',
      },
    }),

  base('magic_wizard_knowing_candle', 'The Knowing Candle', 2,
    'The magician creates the enchantment around a lit candle (or lantern, or electric flashlight even). The flame (or light) then burns lighter or darker depending upon its proximity to supernatural creatures, spells, psychic effects, etc. So, the sudden flaring of the light might suggest a spell being cast within the candle\'s range, or the flame might get slowly brighter as a supernatural creature gets closer and closer to it, or the magician might use the light to work out where a hidden magical artifact is (the light growing as s/he moves closer to it, and dimming as s/he moves away). The exact brightness of the light depends on the light\'s proximity to the supernatural effect or creature, and the power (level and P.P.E.) of that effect or creature.',
    {
      pageNumber: 57,
      tags: ['utility', 'detection'],
      ppe: { baseActivation: 5 },
      range: { summary: '100 feet (30 m)', kind: 'distance', distanceValue: 100, distanceUnit: 'feet' },
      duration: { summary: '4 melees (1 minute) per caster\'s level.', kind: 'melee_round', perLevel: '4 melees' },
      reveals: ['supernatural_presence', 'active_magic', 'psychic_effects'],
    }),

  base('magic_wizard_life_plant', 'Life Plant', 2,
    'The mage casts this spell on a seed or seedling, which is then planted by another person. The plant which grows from this then reflects the development and activities of the person who planted it. While the person is healthy the plant flourishes, but any illness or wound will lead to discoloration or wilting on the plant. If the person turns towards evil (has or develops an evil alignment) the leaves of the plant turn dark, and any fruit it bears will be bitter, and if s/he commits acts of violence then blood-red flecks will appear on it. Furthermore, wherever the person is in the world, the plant\'s leaves will turn to face that direction, when gone to another dimension the leaves point down, and when the person dies the plant dies too.',
    {
      pageNumber: 57,
      tags: ['utility', 'scrying', 'sympathetic'],
      ppe: { baseActivation: 8 },
      duration: { summary: 'Special — lasts until planter dies.', kind: 'special' },
    }),

  base('magic_wizard_bloodward', 'Bloodward', 3,
    'This spell allows a mage to inscribe a protective symbol onto a person or object, by using a little of his/her own freshly drawn blood. Drawing the blood (whether by knife or syringe) causes one hit point of damage to the spell caster. The symbol itself may be a crucifix, Norse rune, occult Chinese symbol, or anything else appropriate. Any evil supernatural creature wishing to approach within 10 feet (3 m) of the ward must save vs a horror factor of 15. Further, if inscribed onto a person, it gives a +1 bonus to save vs any magical or mind control effect. The symbol must be visible to have any effect, and although the blood dries quickly (by the end of the spell\'s casting), it can still be removed with water, fire, and any number of things. Unless prematurely removed, the duration of the ward can be determined by the mage when casting the spell. There is, in theory, no limit to the duration, but when first created, the caster must specify how long it will remain active for and must spend five P.P.E. per hour of its intended duration.',
    {
      pageNumber: 57,
      magicKind: 'ward',
      tags: ['utility', 'ward', 'protection'],
      ppe: {
        baseActivation: 5,
        notes: '5 P.P.E. per hour of intended duration.',
        dynamicCosts: [{ trigger: 'Per hour of ward duration', costFormula: '5 P.P.E. each' }],
      },
      duration: { summary: 'Variable — 5 P.P.E. per hour at casting.', kind: 'special' },
      save: { summary: 'Horror factor 15 for evil supernatural creatures approaching within 10 ft.', saveKind: 'horror_factor', targetNumber: 15 },
      horrorFactor: 15,
      grantedModifiers: {
        target: 'touch',
        combatModifiers: { saveMagic: 1, notes: '+1 vs magical and mind control effects when inscribed on a person.' },
      },
      permanentCosts: [
        {
          resource: 'hp',
          reduction: { kind: 'fixed', value: 1 },
          trigger: 'on_cast',
          notes: 'Drawing blood for the ward costs 1 HP.',
        },
      ],
    }),

  base('magic_wizard_scarlet_pepper', 'Scarlet Pepper', 4,
    'This spell allows a magician to take a handful of fire, transforming the flames into red crystals just as he or she touches them and casts this spell. The flames remain as crystals for so long as they remain in the caster\'s hand, and for 2D10 (or 1D20) hours thereafter. Note: The G.M. should roll this duration secretly, so the magician (player character) cannot tell how long the spell will last. Of course the mage can activate the flames whenever s/he wants prior to the end of the crystals\' duration. When the spell expires, the crystals turn back into flames. The fire created from the crystals is strong enough to inflict 1D6 damage and set fire to any flammable substance with which it is in contact. The spell itself is not dramatic, but with intelligence and cunning a magician can create explosive effects, convenient distractions, and countless acts of petty revenge and destruction (think, for example, about pouring the powder into a car\'s fuel tank, or sprinkling a few handfuls around a room).',
    {
      pageNumber: 58,
      tags: ['offensive', 'elemental', 'fire'],
      ppe: { baseActivation: 10 },
      duration: { summary: '2D10 (or 1D20) hours after leaving caster\'s hand; GM rolls secretly.', kind: 'hour', durationValue: '2D10' },
      damage: { formula: '1D6', notes: 'When crystals revert to flame.' },
    }),

  base('magic_wizard_traitorous_hand', 'Traitorous Hand', 4,
    'Through this spell, an arcanist can take control of a part of another person\'s body. Used subtly, this might be intended to cause a slight twitch in a finger ("I didn\'t mean to shoot! The gun just went off!") or more blatantly to control a whole limb (e.g. to make a knife-man attack himself or drop his weapon). The spell can be used to take control of a stomach or bladder too (e.g. to cause a stomach cramp or vomiting, or loss of control), or the tongue (to prevent speech or cause mumbling), and eyelid (to blink or twitch), but cannot be used for such refined actions as affecting breathing, vocal chords, heartbeat, blood circulation, etc., or to seize control of a pair of hands, arms, legs, etc.',
    {
      pageNumber: 58,
      tags: ['offensive', 'mind_control'],
      ppe: { baseActivation: 10 },
      range: { summary: '30 feet (9 m)', kind: 'distance', distanceValue: 30, distanceUnit: 'feet' },
      duration: { summary: 'One melee (15 seconds) per level of experience.', kind: 'melee_round', perLevel: '1 melee' },
      save: { summary: 'Standard', saveKind: 'standard' },
      inflictedModifiers: { statusEffects: ['partial_body_control'] },
    }),

  base('magic_wizard_destroy_dead_flesh', 'Destroy Dead Flesh', 5,
    'This spell utterly destroys the dead flesh of one carcass or corpse, up to 600 lbs (270 kg) in weight. The flesh smolders for several minutes (taking one minute per 100 lbs/45 kg), and crumbles into a black ashen residue which then evaporates. Very handy for destroying the evidence of fights and murders, or for covering up the destruction of supernatural creatures. Has no effect upon magically animated or otherwise "undead" flesh. Casting the spell requires the expenditure of three P.P.E. points per 100 lbs or part thereof of the target\'s weight, usually costing 6-9 P.P.E. to destroy most human bodies.',
    {
      pageNumber: 58,
      tags: ['utility', 'necromancy'],
      ppe: {
        baseActivation: 3,
        notes: '3 P.P.E. per 100 lbs (45 kg) or part thereof; usually 6-9 for humans.',
        dynamicCosts: [{ trigger: 'Per 100 lbs (45 kg) of corpse weight', costFormula: '3 P.P.E. each' }],
      },
      range: { summary: '10 feet (3 m)', kind: 'distance', distanceValue: 10, distanceUnit: 'feet' },
      duration: { summary: 'Instant (smolders 1 minute per 100 lbs).', kind: 'instant' },
      limitations: { otherLimitations: 'No effect on undead or magically animated flesh. Max 600 lbs (270 kg).' },
    }),

  base('magic_wizard_spirit_attack', 'Spirit Attack', 5,
    'This spell can be used to launch attacks on any supernatural creature which has no physical form (including entities, spirits, intelligent magic essences, astral beings/travelers, and the denizens of the Dreamstream™). The caster must know where the target creature is, or must make a very fine guess, but can use this spell to inflict 1D4x10 points of damage on any one known target. If the target does not have hit points, then the damage done is inflicted to the creature\'s P.P.E. total, although the creature will heal this psychic damage with time. The spell can, of course, be used to "attack" some sorts of spells, or the psychic manifestations which sometimes follow from spell casting. However, these "living" spells, too, will heal this psychic damage unless utterly destroyed, and this attack can only be used on "living magics" which have no physical manifestation. So, for example, it could not be used to destroy an enchantment in an object (unless the object were first physically obliterated), or to destroy an undead creature (as the magic is safely interwoven with the undead\'s physical form), etc. The spell always has some physical or visual manifestation, and so it cannot be cast secretly. In some versions this involves fingers of lightning dancing from the hands of the casting mage to the target; in others, the caster\'s eyes become reflective, showing an image of the target; in others, a shard of bone or energy appears in the mage\'s hand and is thrown at the target as the spell casting is completed (automatic hit); G.M.s and players are encouraged to create their own suitably atmospheric visual effects for this spell (and others).',
    {
      pageNumber: 58,
      tags: ['offensive', 'energy', 'astral'],
      ppe: { baseActivation: 15 },
      range: { summary: '30 feet (9 m)', kind: 'distance', distanceValue: 30, distanceUnit: 'feet' },
      damage: { formula: '1D4x10', notes: 'Inflicted to H.P. or P.P.E. if no hit points.' },
    }),

  base('magic_wizard_call_ectoplasm_from_others', 'Call Ectoplasm from Others', 6,
    'This spell forces P.P.E. to manifest in physical form as a translucent glob known as "ectoplasm". This ectoplasm may come from any source or sources within range — the caster may force his/her own P.P.E. to take physical form; the caster may draw P.P.E. out of any or all of the other people or animals within the area; or it may be drawn from physical supernatural creatures in range. P.P.E. cannot be drawn from ambient magic energy, spells, enchanted objects, supernatural creatures without physical form, or creatures that are not native to the caster\'s world (i.e. human and Nightbane casters can\'t cast the spell on Nightlands creatures), or people or creatures which are immune to either magical or psychic effects or who are practitioners of magic themselves. Ectoplasm oozes from those from whom it is being drawn, spilling from their fingers, eyes, or orifices (mouth, nose, etc.). It is usually a translucent white gel, but it may appear black (especially if drawn from an evil source), blood red, sickly yellow, etc. Ectoplasm pours from the contributors at a rate of 2D6 points of P.P.E. per melee round, and continues to gush out at this rate until the pawns have only one point of P.P.E. remaining. At this point, the outpouring stops; the last point of P.P.E. is never taken by this spell. This is an uncomfortable and restricting experience for those from whom the ectoplasm came, and who may find that they are too busy unleashing goo to actually do much else: all skills are effectively at -40% while ectoplasm is being drawn from them, plus Spd is halved, and all combat rolls are subject to a -5 modifier. The spell caster can then use and control the ectoplasm, same as the psionic power, for four minutes per level of experience, after which time it "evaporates," returning to the people or creatures from which it came (their P.P.E. recovering twice as quickly as usual). The spell may be used by magicians either to impress others, incapacitate enemies, or extract and use ectoplasm from others for their own purposes.',
    {
      pageNumber: 59,
      tags: ['utility', 'offensive'],
      ppe: { baseActivation: 20 },
      range: { summary: '20 feet (6 m)', kind: 'distance', distanceValue: 20, distanceUnit: 'feet' },
      duration: { summary: 'Ectoplasm usable 4 minutes per level; P.P.E. drawn at 2D6/melee until 1 P.P.E. remains.', kind: 'minute', perLevel: '4 minutes' },
      save: { summary: 'Standard', saveKind: 'standard' },
      inflictedModifiers: {
        globalSkillModifier: { value: -40 },
        combatModifiers: { strike: -5, parry: -5, dodge: -5 },
        statAdjustments: { spd: { kind: 'multiplier', value: 0.5, rounding: 'floor' } },
      },
    }),

  base('magic_wizard_watching_enchantment', 'Watching Enchantment', 6,
    'This ritual requires the sacrifice of a cat, dog, or similar tame animal, the spirit of which merges with the magic of this spell and thereafter patrols the area in which it was killed, watching for supernatural foes and mundane dangers. This spell will warn its master if a supernatural creature, entities, group of armed men, strangers, malignant enchantment, possessed people, and other similar threats approach. It also learns to distinguish individuals from one another (and so can tell frequent friendly visitors from strangers). Note that the enchantment may only be set over an area (an alley, a house, a basement, backyard, etc.), and can only "see" one thousand feet (305 m). It may not be set to watch a moving vehicle or specific object. While the spell is in effect, and while the caster is within 100 feet (30.5 m) from the point where the ritual occurred, he or she instinctively knows when danger approaches, and has an idea of how great the danger is. The watching spirit never actually "speaks" to the spell caster, but as a result of its presence, the mage\'s hands become clammy or his or her hair stands on end when danger approaches. In theory the enchantment lasts for one year, but in practice it may linger longer. The magic gains the temperament and personality of the animal sacrificed to create it, and unusually loyal or loving animals may loiter longer as enchantments (2D6 months). Keeping the corpse of the sacrificed animal in the area is also supposed to extend the duration of the spell (3D6 weeks). Note that such enchantments, like real animals, are usually very territorial; a Watching Enchantment created in an area where another already exists will be driven away, and will end up watching another, random area — finding a new master and a territory of its own. It has also been known for watching enchantments to "adopt" new masters after the end of the spell duration or following their creators\' deaths, leading to rumors of benign hauntings and watchful ghosts.',
    {
      pageNumber: 59,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['utility', 'ward', 'detection'],
      ppe: { baseActivation: 40 },
      range: { summary: '1000 feet (305 m) watch area; caster senses within 100 ft (30.5 m) of ritual site.', kind: 'distance', distanceValue: 1000, distanceUnit: 'feet' },
      duration: { summary: 'One year (may linger longer).', kind: 'year', durationValue: 1 },
      materialComponents: {
        label: 'Sacrifice',
        entries: [{ label: 'Cat, dog, or similar tame animal', quantity: { kind: 'fixed', value: 1 }, condition: 'living' }],
      },
      reveals: ['supernatural_threats', 'armed_groups', 'strangers', 'possession', 'malignant_enchantment'],
    }),

  base('magic_wizard_druids_head', "The Druid's Head", 7,
    'This ancient Celtic ritual involves taking the head of a corpse and embalming it in cedar oils to bind the ghost (spirit essence) of the deceased into the preserved head. A ghost which does not wish to be bound may make a standard saving throw. Thereafter, the bound ghost may look out through the eyes of its head, listen through its ears, smell through its nose, and speak in a hoarse whisper through its mouth. However, the spirit is under no obligation to cooperate with or serve the spell\'s caster, and although being stuck in a mummified head is likely to be an unpleasant and tedious experience for the trapped ghost, it can feel no physical pain through its flesh. A devious spell caster, however, can cajole or persuade a trapped ghost to speak to him or her, and many vindictive magicians might simply bind a ghost to its head as a way of tormenting it. The spell lasts until the head is physically destroyed. Its hit points are its I.Q. number times two.',
    {
      pageNumber: 59,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['utility', 'necromancy', 'binding'],
      ppe: { baseActivation: 40 },
      duration: { summary: 'Until the head is destroyed.', kind: 'special' },
      save: { summary: 'Standard if ghost resists binding.', saveKind: 'standard' },
      spawnedPresence: {
        kind: 'construct',
        name: "Druid's Head",
        notes: 'Bound ghost may perceive and speak; not compelled to serve caster. H.P. = I.Q. x2.',
      },
      materialComponents: {
        label: 'Embalming',
        entries: [{ label: 'Cedar oils', quantity: { kind: 'special' }, condition: 'other', notes: 'Corpse head embalmed in cedar oils.' }],
      },
    }),

  base('magic_wizard_draught_of_life_and_death', 'Draught of Life & Death', 8,
    'This spell allows magicians to take the illnesses and wounds from one character and transfer them into the body of another! Rather easier than having to actually heal damage and eradicate diseases. The sorcerer brews a potion of poisonous herbs and animal venoms, mixed with milk and blood, powdered bones, and various other ingredients (antibiotics often appear in modern mixtures, for example, while medieval mixtures include mandrake root). The sorcerer then administers this to two people, one injured, the other healthy. During the next 30 minutes, one character (specified by the caster) is "cured" of all physical illnesses and diseases, and regains 6D6 hit points (up to but not exceeding his/her natural maximum). The second individual, however, gains all of these illnesses or wounds, and loses an equal number of hit points. The two subjects must be within 100 feet (30.5 m) of each other when they drink the draught and for the whole of the 30 minutes that follow. If they wander more than 100 feet (30.5 m) apart, the magic fails.',
    {
      pageNumber: 59,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['healing', 'offensive'],
      ppe: { baseActivation: 50 },
      range: { summary: '100 feet (30.5 m) — both subjects must remain within range for 30 minutes.', kind: 'distance', distanceValue: 100, distanceUnit: 'feet' },
      duration: { summary: '30 minutes to take effect; permanent results.', kind: 'minute', durationValue: 30 },
      healing: { hpFormula: '6D6', notes: 'Cured subject regains up to natural maximum; wounds/illness transferred to second subject.' },
    }),

  base('magic_wizard_soul_in_a_bottle', 'Soul in a Bottle', 8,
    'By means of this spell, the caster extracts half of the "soul" (psychic energy) of the victim (who may choose to resist, making a saving throw), and stores it in some suitable glass receptacle (bottle, jar, etc.). As a result, the target loses half of his/her P.P.E. and I.S.P., some memories are "foggy" and skill performance is -10%. In the future, whenever the character would gain additional P.P.E. or I.S.P. (e.g. when going up a level), s/he only actually gains half the usual number of points, as the other half is siphoned off to the bottle. Furthermore, the split character cannot Astral Travel. The spell is usually used to protect the character, by taking part of his/her "soul" and keeping it somewhere safe and far away. The person therefore gains a +5 bonus to all rolls to save vs any magic, illusions, mind control, empathic attacks and possession. On the downside, psychic and magical effects may also be cast on the person\'s mind by casting them on the half of the soul in the bottle with NO special bonuses to protect it (standard saves) — so woe betide the target if the bottle ever got into the wrong hands. Further, the mage who initially cast the spell can gaze into the bottle to send dreams and telepathic messages to the target, and can read his/her current surface thoughts, giving the sorcerer a sort of crystal ball into the mind of the split soul. Finally, if the receptacle (bottle, jar, etc.) were ever broken, then the person\'s half-soul would be released to find and re-enter his/her body. However, if the physical portion of the body is not within 1000 miles (1600 km), or worse, not in the same dimension, the splintered half is likely (01-60%) to get lost and doomed to wander the world in search of its other half. In this spirit form, the essence fragment can fly (speed 20), hover, think and observe, but cannot affect the physical world. It can only communicate with Channellers, astral beings, and psychic beings with sensitive powers (telepathy, empathy, etc.). After 1D6x10 years, this spirit/essence fragment fades away, effectively dying (all penalties remain in force). To locate his other half, the physical half of the person must get within 100 miles (160 km; automatically sensing and finding each other). Channellers, Mystics, Astral Travellers and psychic sensitives may be useful in helping to locate the splintered essence. Note: Once separated, the one half does not know what the other is experiencing.',
    {
      pageNumber: 60,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['utility', 'binding', 'protection'],
      ppe: { baseActivation: 50 },
      duration: { summary: 'Permanent (see description).', kind: 'permanent' },
      save: { summary: 'Standard', saveKind: 'standard' },
      grantedModifiers: {
        target: 'touch',
        combatModifiers: { saveMagic: 5, notes: '+5 vs magic, illusions, mind control, empathic attacks, possession.' },
      },
      inflictedModifiers: {
        globalSkillModifier: { value: -10 },
        statusEffects: ['cannot_astral_travel', 'foggy_memories'],
      },
      forgedOutputs: [
        {
          outputTemplateId: 'template_soul_bottle',
          count: 1,
          destination: 'caster_inventory',
          initialPresence: 'carried',
          bindToCaster: false,
        },
      ],
      materialComponents: {
        label: 'Receptacle',
        entries: [{ label: 'Glass bottle or jar', quantity: { kind: 'fixed', value: 1 }, condition: 'other' }],
      },
    }),

  base('magic_wizard_create_zombie', 'Create Zombie', 9,
    'This ritual allows the caster to animate a corpse as an undead servant. The body\'s flesh should be mostly intact and relatively "fresh"; dead for less than two weeks. Some decomposition or bullet holes are no problem, but dismemberment or serious decomposition renders the corpse useless. The corpse has the same statistics as it did in life except that: 1) It has only animal intelligence (1D6); no desires or dreams. Effectively has no M.A., M.E. or alignment (its actions typically reflect those of its creator/master). 2) Add +1D6 to the P.E. and P.S. attributes. 3) Reduce the original P.P., P.B., and Spd. attributes to half. 4) It has no skills, except for Hand to Hand: Basic and land navigation 75%. 5) It has normal base hit points for a first level human (regardless of its actual nature), and 35 S.D.C. 6) Zombies regenerate physical damage at a rate of 6 points per each hour of being dormant, but cannot regenerate lost limbs. 7) Zombies are impervious to horror factor, possession, mind control, cold, poison and disease. The zombies are capable of understanding the caster\'s instructions in any spoken language. They cannot read, understand any other person\'s words, or follow complex orders. "Destroy anyone else who enters this room," "Go down into the village and kill everyone," "Protect me," and "Enter the house and bring me the blonde-haired child, alive," are the limits of their ability to comprehend. With time, however, zombies created by powerful magicians may begin to develop greater intelligence, along with their own personality quirks, often becoming quite unstable, unreliable and even dangerous. Normally, these creatures are slavishly loyal to their creators, whom they will never try to harm. Note: It\'s not only humans who can be animated in this way. Dead Nightbane, Hunters, cattle, horses, etc. — anything up to 600 lbs (270 kg) in weight may be animated by this spell. Damage Notes: The zombie takes little damage from piercing weapons and firearms (e.g. only 4 points from a 4D6 bullet or stabbing attack from a pole arm) but it suffers normal damage from explosives, acid, hacking and bludgeoning weapons, and unarmed attacks (punches and kicks). It suffers double normal damage from fire-based attacks. It is also damaged — burned — by sunlight. So, exposure to a few rays of sun (through chinks in a shuttered window, for example) inflicts 4D6 damage on the zombie, while exposure to full sunlight inflicts 2D6x10 damage per melee round (almost inevitably enough to destroy it immediately). Limitations: The zombie will function for a period of time up to 10 hours per the caster\'s level, but this need not always be at a stretch. At the zombie\'s creation, the caster can determine under what circumstances the undead slave will function, and these conditions cannot later be amended. Note that while inactive, the zombies do not seem to be undead, but ordinary corpses (though they are still magical, as the spell still lingers on them). Extending the Magic: 10 hours before the duration of the magic is about to elapse, the original creator can keep the zombie functioning by expending another 80 P.P.E. per each zombie.',
    {
      pageNumber: 60,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['necromancy', 'summoning', 'animation'],
      ppe: { baseActivation: 80, notes: '80 P.P.E. per zombie; +80 to extend 24 hours/level.' },
      duration: { summary: '24 hours per level; active 10 hours/day (conditions set at creation).', kind: 'day', perLevel: '24 hours' },
      spawnedPresence: {
        kind: 'creature',
        label: 'Zombie',
        countFormula: '1 per 80 P.P.E.',
        notes: 'Corpse up to 600 lbs; dead less than 2 weeks. Sunlight 4D6 partial / 2D6x10 full sun per melee.',
      },
      limitations: { otherLimitations: 'Activation conditions set at creation and cannot be amended.' },
    }),

  base('magic_wizard_friend_in_the_head', 'Friend in the Head', 9,
    'This spell creates a magical intelligence. An enchantment with its own I.Q. and personality which is placed in the head of the target subject. If the victim makes a saving throw, then the intelligence cannot get into his/her mind, but instead wanders free; perhaps as a "ghost," or perhaps entering a more vulnerable person such as a drug addict, mental patient, the empty physical body of an Astral Traveler, or inhabiting the head of an animal. The conjured intelligence cannot take control of the person whose head it inhabits, but it can "talk" to them — they hear its voice in their own mind. It can also eavesdrop on their surface thoughts and feel their emotions and anxieties. The personality (harmful or helpful) of this so-called "friend" is determined by the spell caster at the time the spell is cast and may be genuinely helpful and benevolent, or attempt to distract, confuse, tempt, or make promises or suggestions on behalf of its creator, or badger, torment and/or harm the poor soul. If the voice shouts, shrieks, laughs, nags, belittles, or otherwise attempts to distract or confuse, the victim\'s concentration is divided and the character suffers -3 on initiative and perception rolls, -1 on all other rolls, and -5% on all skill performance during this period. The voice may also keep the unfortunate awake for hours on end, which will lead to fatigue and an additional -10% skill penalty. If designed to harm its victim, it might give phoney information and unhelpful advice, and/or constantly tempt the victim into dangerous, stupid, emotional and evil courses of action. On the other hand, the voice (with its own I.Q. rolled as normal on 3D6) may make helpful suggestions, act as a vocal conscience, provide information (things it remembers from experiences since its creation) or may consider problems on the person\'s behalf (it has no skills, however). The voice will typically linger for a number of days equal to its victim\'s M.E., before fading away. Particularly strong willed individuals (with M.E. over 19) may make a saving throw every 24 hours to get rid of it. A successful save vs psionic attack/influence will end the magic. Victims with an M.E. of 8 or less, may find the voice of this "friend" lasts much longer than this; at least double, but possibly for months, G.M.\'s discretion. If the character comes to appreciate and embrace the voice, it may, at the G.M.\'s discretion, remain indefinitely; in all likelihood becoming a permanent schizophrenia insanity (hears voices ... one anyway). Initially, the voice\'s objectives and personality are fixed by the spell caster, who may intend the voice to mislead, advise, taunt, confuse, or infuriate the target. However, if the voice lingers for a year or more, it is likely to start developing its own personality and objectives, picking up new ideas (and skills at a rate of one every six months) from its host\'s thoughts, or striking up a complex relationship with the victim. In some cases, where the victim\'s M.E. is particularly low (6 or less), the "friend" (the magical intelligence inside the head) may in time, become the dominant personality, actually controlling the body, with the original human personality reduced to a whining voice in the back of its own mind. In other cases, despite its original malignant intent, the "friend" may come to respect and like its intended victim and actually become a "friend" that helps rather than harms. Of course, in other instances, the voice may, despite its host, continue to torment him/her and cause trouble (but not enough to kill the victim, for if that person dies so does the "friend).',
    {
      pageNumber: 61,
      tags: ['offensive', 'mind_control', 'insanity'],
      ppe: { baseActivation: 75 },
      range: { summary: '60 feet', kind: 'distance', distanceValue: 60, distanceUnit: 'feet' },
      duration: { summary: 'Uncertain — typically days equal to victim\'s M.E.', kind: 'special' },
      save: { summary: 'Standard', saveKind: 'standard' },
      inflictedModifiers: {
        combatModifiers: { initiative: -3, notes: 'When voice distracts: -1 all other rolls, -5% skills; fatigue -10% more.' },
        statusEffects: ['magical_intelligence', 'hears_voices'],
      },
    }),

  base('magic_wizard_fatal_growth', 'Fatal Growth', 10,
    'When this spell is cast, the bones of the target person begin to grow very rapidly, expanding, forming spines and spikes, twisting and generally causing all manners of deformity. This is extremely painful (the victim must roll to save vs pain, 16 or higher, or fall over, too pained to even move). The first melee after the spell is cast, the target takes 1D6 damage. The next melee this is doubled to 2D6, then the next to 4D6, then 8D6, then 16D6 and so on, until his/her body simply rips itself apart (Note: The Fleshsculptor\'s spell to heal living bones can only be used to stop the damage from exceeding 4D6 hit points per melee round, delaying the inevitable. Negate magic and remove curse will stop it instantly, but any damage sustained till that point remains). Damage is inflicted every melee round from the time that the spell is cast until the target dies, and is inflicted straight to hit points, S.D.C. and armor having no effect. However, the spell has four major drawbacks: 1. The high P.P.E. cost. 2. The target must be within sight or the caster must have some object intimately associated with the target (a stolen wedding ring, or vial of blood, for example). 3. The spell has a fairly short range, so that the mage must get quite close to the target, and then perform the ritual uninterrupted. The ritual takes 1D6+6 minutes to perform. 4. This magic will not work against other magicians, Nightbane, supernatural beings (including the Nightlords and Minions of the Nightlords), energy beings, astral beings, creatures of magic and similar inhumans. Likewise, mortals protected by a Bloodward are also impervious to this magic. Note: The spell caster can stop the magic at any time, causing the bones to return to normal, but all damage suffered by the victim remains.',
    {
      pageNumber: 61,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['offensive', 'necromancy'],
      ppe: { baseActivation: 95 },
      range: { summary: '100 feet (30.5 m)', kind: 'distance', distanceValue: 100, distanceUnit: 'feet' },
      duration: { summary: 'Special — until victim is slain or magic is negated.', kind: 'special' },
      save: { summary: 'Standard', saveKind: 'standard' },
      damage: { formula: 'escalating: 1D6, 2D6, 4D6, 8D6, 16D6... per melee to H.P.', notes: 'Save vs pain 16+ or immobilized.' },
      limitations: {
        lineOfSightRequired: true,
        otherLimitations:
          'Ritual 1D6+6 minutes. No effect on magicians, Nightbane, supernatural beings, astral beings, or Bloodward-protected mortals. Requires sight or intimate object of target.',
      },
      ritualProfile: { durationMinutes: '1D6+6', concentrationRequired: true },
    }),

  base('magic_wizard_destroy_undead_flesh', 'Destroy Undead Flesh', 11,
    'This spell works exactly like Destroy Dead Flesh, causing a carcass of up to 600 lbs (270 kg) in weight to smolder, crumble and evaporate. The spell, however, also works on undead flesh. So, the spell inflicts 1D6x10 damage per melee round on the undead (vampires, zombies, animated corpses, etc.). The target takes damage each melee round until either it saves vs the spell (roll once per round) or the spell ends. If the spell is still active when the target "dies," all of its flesh is then destroyed the following round by the magic.',
    {
      pageNumber: 62,
      tags: ['offensive', 'necromancy'],
      ppe: { baseActivation: 100 },
      range: { summary: '30 feet (9 m)', kind: 'distance', distanceValue: 30, distanceUnit: 'feet' },
      duration: { summary: 'One melee round per level of experience.', kind: 'melee_round', perLevel: '1 melee round' },
      save: { summary: 'Standard, each melee round.', saveKind: 'standard' },
      damage: { formula: '1D6x10', notes: 'Per melee round to undead; flesh destroyed on death if spell still active.' },
    }),

  base('magic_wizard_mictlantecutlis_command', "Mictlantecutli's Command", 12,
    'Note: This magic will not be used by characters of a good or unprincipled alignment. This ritual, originating amongst the Aztecs, provides an extreme method of gaining command over another\'s magics. The sorcerer must capture the magician whose magics he intends to control, and in an hour long ritual beneath the mid-day sun, flay the skin from the still living victim. The skin must be taken largely intact, and it is in this skin that the enchantment is laid. Its original owner\'s death (flaying will kill him) provides some or all of the P.P.E. for the enchantment (doubled at the moment of death). The skin may then be worn as an over-skin by another magician, and it will not naturally rot or decay. Hair still grows on its scalp, and it still sweats in the sunlight. Magically disguised by this skin, all spell knowledge known by the deceased sorcerer is now available to the magician wearing his or her flesh. This will also work to control any ongoing magic or magical servants which serve and obey the deceased mage. So, zombies will obey the commands of the person wearing their creator\'s skin as if that person were their creator; familiars, too, will obey the new skin\'s wearer; etc. Of course, magics which have their own I.Q.s may notice the strange orders being given to them by their master(?), and react accordingly.',
    {
      pageNumber: 62,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['necromancy', 'enchantment', 'binding'],
      ppe: { baseActivation: 150, notes: 'Victim\'s death at flaying may provide P.P.E. (doubled at moment of death).' },
      duration: { summary: 'Until the skin is destroyed.', kind: 'special' },
      forgedOutputs: [
        {
          outputTemplateId: 'template_flayed_skin',
          count: 1,
          destination: 'caster_inventory',
          initialPresence: 'carried',
          bindToCaster: false,
        },
      ],
      ritualProfile: { durationMinutes: '60', workspace: 'Mid-day sun' },
      limitations: { otherLimitations: 'Not used by good or unprincipled alignments.' },
    }),

  base('magic_wizard_open_pathway', 'Open Pathway', 12,
    'This spell allows a magician to call up and "open" a Pathway between his current location to any other known location on any other world or plane. The caster must have visited the place, or have an extremely good description of it. The Megaverse is a big place, and if the mage is at all imprecise about where s/he wants to go, then the odds are that s/he will end up somewhere s/he doesn\'t like — somewhere similar but entirely wrong. The only restriction is that the spell caster cannot open a Pathway to a location on the same world or plane as his current location. These "Pathways" are in fact living entities of some sort, and the spell bears more resemblance to a summon magic than a planar travel or teleport spell. There are several dozen pathways in existence, each with its own personality and appearance, and each with its own Open Pathway spell. If a magician wants to be able to call up a number of pathways, he will have to learn multiple versions of this spell. Knowing how to open one Pathway is sufficient, in any case, as any Pathway can lead between any two locations. Each Pathway is a little world to itself, with a clearly marked path (a road, path, or river, for example) snaking through it. Wandering away from the marked path is very dangerous, as wayward travelers could stumble off into any number of worlds or planes. Usually, to help guide people through, each Pathway creates an "embodiment" of itself to guide or carry travelers. When the spell is cast, the Pathway "opens" at a random point within 20 feet (6 m) of the caster. It remains open for 1D6 melees, and anyone may enter the gateway during that time. In theory, large objects such as vehicles may also enter, depending upon the size of the opening, which varies from pathway to pathway. Travelling through the Pathway usually then takes several minutes. Example Pathways: 1) Cyncjak (A young Pathway): entrance blends with surroundings; requires a bribe (candy, comic book, doll, toy). 2) Khasticx (An aging Pathway): entrance appears as an open grave bearing travelers\' names; requires a silver coin marked with a wheel. G.M.s should feel free to invent their own Pathways. Rules: Pathways cannot be opened from within or to another Pathway; no spell cast inside a Pathway affects another world; no dimensional travel/teleport/Mirrorwalk inside a Pathway. Pathways have no obligation to carry travelers — hostile behavior may dump passengers into arbitrary realities.',
    {
      pageNumber: 62,
      tags: ['utility', 'dimensional', 'movement', 'summoning'],
      ppe: { baseActivation: 170 },
      range: { summary: 'Opens within 20 feet (6 m) of caster.', kind: 'distance', distanceValue: 20, distanceUnit: 'feet' },
      duration: { summary: 'Gateway open 1D6 melees; transit takes several minutes.', kind: 'melee_round', durationValue: '1D6' },
      limitations: { otherLimitations: 'Cannot open to a location on the same world/plane as caster.' },
      effectProfiles: [
        {
          name: 'Cyncjak',
          description: 'Young pathway; unassuming entrance; requires child\'s toy bribe.',
          materialComponents: {
            label: 'Bribe',
            entries: [{ label: 'Candy, comic book, doll, or child\'s toy', quantity: { kind: 'fixed', value: 1 }, condition: 'other' }],
          },
        },
        {
          name: 'Khasticx',
          description: 'Aging pathway; open grave entrance; Charon ferryman embodiment.',
          materialComponents: {
            label: 'Offering',
            entries: [{ label: 'Silver coin marked with a wheel', quantity: { kind: 'fixed', value: 1 }, condition: 'other' }],
          },
        },
      ],
    }),

  base('magic_wizard_psychic_drain', 'Psychic Drain', 13,
    'This ritual enchants a small object, which draws P.P.E. from the unfortunate target. Several versions of the spell exists, each requiring a different sort of object as the focus of the spell; some a bone knife, some a crystal sphere, etc. All that is required is the object to be enchanted, and that during the ritual there also be some object intimately associated with the intended target (blood, hair, a favorite garment, etc.). The victim may roll once only to save, when the object is first created. For one week thereafter, so long as the victim remains within one mile (1.6 km) of the object, s/he cannot recover spent P.P.E. Any P.P.E. which would normally be recovered is siphoned off to this object. What happens to it then is entirely up to the GM. Does it form into any kind of shape? Extend the spell\'s duration? Imbue the enchantment with the victim\'s own personality? The spell caster may order the object to cease functioning at any time, and the enchantment ends after one week or if the object is destroyed.',
    {
      pageNumber: 63,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['offensive', 'binding'],
      ppe: { baseActivation: 200 },
      range: { summary: 'One mile (1.6 km) — victim cannot recover P.P.E. within range of object.', kind: 'distance', distanceValue: 1, distanceUnit: 'miles' },
      duration: { summary: 'One week.', kind: 'week', durationValue: 1 },
      save: { summary: 'Standard (once, when object is created).', saveKind: 'standard' },
      materialComponents: {
        label: 'Focus and link',
        entries: [
          { label: 'Object to enchant (bone knife, crystal sphere, etc.)', quantity: { kind: 'fixed', value: 1 }, condition: 'other' },
          { label: 'Object associated with target (blood, hair, garment, etc.)', quantity: { kind: 'fixed', value: 1 }, condition: 'other' },
        ],
      },
      forgedOutputs: [
        {
          outputTemplateId: 'template_psychic_drain_focus',
          count: 1,
          destination: 'caster_inventory',
          initialPresence: 'carried',
          bindToCaster: false,
        },
      ],
    }),

  base('magic_wizard_maggots_curse', 'Maggots Curse', 14,
    'The Maggots Curse is a particularly nasty spell, which causes a large nest of maggots to start feeding and multiplying inside the flesh of a living person. At the end of the first round after the spell\'s casting, the victim has shooting pains in his or her abdomen or limb, and takes 1D4 damage. The melee round afterwards, the character takes 1D6 damage, and must roll under his or her P.E. or fall down, writhing in agony for the subsequent melee rounds. At the end of each round thereafter, the target must make a new roll against P.E. and takes an additional 2D6 damage direct to hit points. Armor or being inside a locked vehicle or room is no protection, as the maggots are eating out from the inside. By the fourth round, some of the horrid larvae will poke through the skin, revealing the cause of the pain. The duration of the spell is determined by the caster\'s ability to keep concentrating on the target of this hideous affliction. If the caster loses sight of the target, desires to cast another spell, engages in some other activity requiring his concentration, or is knocked unconscious or dies, then the spell is automatically over and the maggots all disappear, but their damage remains. If the spell ends before the victim dies, all of the maggots die and fade away, although the character may later cough up or excrete a couple, just for horror\'s sake. If the target dies while the spell is still in operation, then the maggots continue to magically breed and consume at an exponential rate even after the spell has ended, until the body has been reduced to bare bones! Note: There is a 01-33% chance that a victim who survives will acquire a phobia concerning maggots. Numerous Fleshsculptor spells can restore damaged and eaten flesh and muscles, and even internal organs.',
    {
      pageNumber: 63,
      tags: ['offensive', 'curse', 'necromancy'],
      ppe: { baseActivation: 500 },
      range: { summary: '5 feet (1.5 m) per level of experience.', kind: 'distance', distanceValue: '5 * level', distanceUnit: 'feet' },
      duration: { summary: 'Conditionally, 4 melee rounds per level while caster concentrates.', kind: 'melee_round', perLevel: '4 melee rounds' },
      save: { summary: 'Standard (once only).', saveKind: 'standard' },
      damage: { formula: '1D4 round 1; 1D6 round 2; 2D6/round thereafter to H.P.', notes: 'P.E. roll each round or writhing in agony.' },
      limitations: { concentrationRequired: true, lineOfSightRequired: true },
    }),

  base('magic_wizard_someone_makes_them', 'Someone Makes Them', 15,
    'This spell (named from the comment that people aren\'t born as monsters, someone makes them that way) reconstructs the target\'s personality by going through their mind and restructuring, replacing and deleting all of their memories of their formative experiences. Thus, the spell can be used to delete memories of a caring family life, and replace them with memories of abuse or neglect, or equally, foul episodes can be replaced by constructive experiences. In this way, the magician can reconstruct the ways in which the target has learned to think about himself, other people, animals, drugs, culture, sex and so on. With a little malice and forethought, a mage can therefore turn a well-adjusted, kind human being into a twisted, pained sadist. And with more care (a successful I.Q. roll is required), the caster can cure or create addictions, implant or remove psychopathic urges or other insanities, change the character\'s alignment, manipulate the target\'s sense of who s/he is, implant or remove obsessions and cravings, give the target memories of nonexistent places or people (new friends and enemies), or generally do anything else which s/he wants to the poor victim\'s psyche.',
    {
      pageNumber: 63,
      magicKind: 'ritual',
      isRitual: true,
      tags: ['offensive', 'mind_control', 'insanity'],
      ppe: { baseActivation: 920 },
      duration: { summary: 'Indefinite', kind: 'permanent' },
      save: { summary: 'Standard', saveKind: 'standard' },
      inflictedModifiers: { statusEffects: ['personality_reconstruction', 'memory_alteration'] },
      limitations: { otherLimitations: 'Successful I.Q. roll required for precise psychiatric manipulation.' },
    }),
];

export function buildTtgdWizardSpells() {
  return SPELLS;
}

function spliceIntoWizard(spells) {
  const wizard = JSON.parse(fs.readFileSync(WIZARD_PATH, 'utf8'));
  const existingIds = new Set(wizard.map((r) => r.id));
  const duplicates = spells.filter((s) => existingIds.has(s.id));
  if (duplicates.length) {
    throw new Error(`Spells already in wizard.json: ${duplicates.map((s) => s.id).join(', ')}`);
  }

  const insertAt = wizard.findIndex((r) => r.id === INSERT_BEFORE_ID);
  if (insertAt < 0) throw new Error(`Insert anchor not found: ${INSERT_BEFORE_ID}`);

  const merged = [...wizard.slice(0, insertAt), ...spells, ...wizard.slice(insertAt)];
  fs.writeFileSync(WIZARD_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  return { inserted: spells.length, insertAt };
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

if (process.argv[1] && process.argv[1].endsWith('build_ttgd_wizard_spells.mjs')) {
  const extractPath = join(root, 'scripts/_ttgd_spells_extract.txt');
  const spells = buildTtgdWizardSpells();

  const { inserted, insertAt } = spliceIntoWizard(spells);
  console.log('Inserted', inserted, 'TTGD spells at index', insertAt);

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

  if (fs.existsSync(extractPath)) {
    fs.unlinkSync(extractPath);
    console.log('Deleted', extractPath);
  }
}
