/**
 * Nightbane core wizard spells levels 1–5 (RPG pp. 128–136).
 * Run: node scripts/build_nightbane_l1_5_spells.mjs
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIZARD_PATH = join(root, 'src/data/content/magic/wizard.json');

const TARGET_IDS = [
  'magic_wizard_blinding_flash',
  'magic_wizard_cloud_of_smoke',
  'magic_wizard_death_trance',
  'magic_wizard_globe_of_daylight',
  'magic_wizard_see_aura',
  'magic_wizard_see_the_invisible',
  'magic_wizard_sense_evil',
  'magic_wizard_sense_magic',
  'magic_wizard_sense_nightbane',
  'magic_wizard_sense_ppe',
  'magic_wizard_thunderclap',
  'magic_wizard_befuddle',
  'magic_wizard_climb',
  'magic_wizard_concealment',
  'magic_wizard_detect_concealment',
  'magic_wizard_extinguish_fire',
  'magic_wizard_fear',
  'magic_wizard_heavy_breathing',
  'magic_wizard_levitation',
  'magic_wizard_mystic_alarm',
  'magic_wizard_ritual_call_creature_of_light',
  'magic_wizard_breathe_without_air',
  'magic_wizard_energy_bolt',
  'magic_wizard_fingers_of_wind',
  'magic_wizard_float_in_air',
  'magic_wizard_fuel_flame',
  'magic_wizard_ignite_fire',
  'magic_wizard_impervious_to_fire',
  'magic_wizard_impression',
  'magic_wizard_invisibility_simple',
  'magic_wizard_magic_armor',
  'magic_wizard_negate_poisons_toxins',
  'magic_wizard_ritual_call_nightlands_denizen',
  'magic_wizard_telekinesis',
  'magic_wizard_astral_projection',
  'magic_wizard_charismatic_aura',
  'magic_wizard_cure_minor_disorders',
  'magic_wizard_energy_field',
  'magic_wizard_fire_bolt',
  'magic_wizard_nightvision',
  'magic_wizard_repel_animals',
  'magic_wizard_shadow_meld',
  'magic_wizard_swim_as_fish_minor',
  'magic_wizard_trance',
  'magic_wizard_calling',
  'magic_wizard_charm_weapon',
  'magic_wizard_circle_of_flame',
  'magic_wizard_domination',
  'magic_wizard_energy_disruption',
  'magic_wizard_escape',
  'magic_wizard_eyes_of_thoth',
  'magic_wizard_fly',
  'magic_wizard_heal_wounds',
  'magic_wizard_horrific_illusion',
  'magic_wizard_midnight_wind',
  'magic_wizard_sleep',
  'magic_wizard_superhuman_strength',
  'magic_wizard_superhuman_speed',
  'magic_wizard_swim_as_fish_superior',
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
  magic_wizard_blinding_flash:
    'This invocation creates a sudden burst of intense white light, temporarily blinding everyone in its ten foot (3.0 m) radius. Victims are blinded for one to four (1D4) melee rounds, with a penalty of -5 to strike, and -10 to parry and dodge. The chance of falling is 50% every 10 ft (3.0 m). The magic can be cast up to 60 ft (18.3 m) away. Saving throw is standard; those who successfully save versus magic are not blinded.',
  magic_wizard_cloud_of_smoke:
    'This magic enables the sorcerer to create a cloud of dense, black smoke (30 ft/9.1 m x 30 ft/9.1 m x 30 ft/9.1 m maximum size) up to ninety feet (27.4 m) away. Victims caught in the cloud will be unable to see anything beyond the cloud, and their impaired vision allows them to see no more than three feet (0.9 m) in the cloud (and that means only a blurry shape). While in the cloud, victims will be at -5 to strike, parry and dodge.',
  magic_wizard_death_trance:
    'A magically induced trance which makes the mage appear to be dead. There is no breathing, pulse, heartbeat, or any other signs of life. While in the trance, the sorcerer is quite helpless, unable to speak, move or invoke magic. Only minor physical sensations felt by the mage are recognizable, like being jostled, carried or hearing voices, but no specific identification or memories are possible. The magic can be canceled at will.',
  magic_wizard_globe_of_daylight:
    'A small globe or sphere of true daylight is magically created. The light is bright enough to illuminate a 12 ft (3.65 m) area per each level of its creator\'s experience. Because it is daylight, it can ward off most vampires, keeping them at bay just beyond the edge of light. The creator of the globe can mentally move it along with himself, or send it up to 30 feet (9.1 m) ahead. The maximum speed at which the globe can travel is equal to a speed attribute of 12.',
  magic_wizard_see_aura:
    'All things, organic and inorganic, have an aura. The aura has many distinctions, and can be used to see or sense things invisible to the eye. Seeing an aura will indicate the following: estimate the general level of experience (low 1–3, medium 4–7, high 8th and up); the presence of magic (no indication of what or power levels); the presence of psychic abilities; high or low base P.P.E.; the presence of a possessing entity; the presence of an unusual human aberration, which indicates a serious illness, non-human, or alien, but does not specify which. Cannot tell one\'s alignment from this spell.',
  magic_wizard_see_the_invisible:
    'The character can see forces, objects and creatures which can turn invisible or are naturally invisible. Even if the creature has no form per se, the mystic will be able to discern the vaporous image or energy sphere which is the being. This includes ghosts, entities and astral bodies.',
  magic_wizard_sense_evil:
    'The sense evil invocation will enable its spell caster to feel or sense the presence of supernatural evil. It will indicate how many supernatural evil presences are within the 90 foot (27.4 m) area (one, a few 2–6, several 7–14, or many 15 or more). It can also register the intensity of the evil and pinpoint the general location of the source(s) to a particular room(s), possessed object, person, or an approximate distance (very close, near, far, etc.). Evil emanations from human beings are much less distinct and cannot be sensed unless the source/person has an immediate evil intention. Nightbane and other supernatural beings who are not necessarily evil are only detected if their alignment is diabolic or miscreant, or if they harbor evil intentions towards the caster.',
  magic_wizard_sense_magic:
    'This magic ability enables the character to sense or feel the presence of magic. Like a Geiger counter, the individual can tell if he is near (within 20 ft/6.1 m) or far (toward the limit of the range). The ability can also indicate whether a person or object is enchanted/under a magic spell (this does not include psychic powers or Nightbane talents), is in the process of invoking magic, or if magic is being used in the range area. Men of magic and most supernatural beings do not register as magic except when actually casting a spell/using magic.',
  magic_wizard_sense_nightbane:
    'This invocation works like the natural Nightbane ability to sense others of their kind, enabling the sorcerer to sense the presence of Nightbane within the area. The ability does not tell the exact location or numbers of Nightbane, but will reveal whether there is more than one, and roughly how far away they are (within 30 ft/9.1 m).',
  magic_wizard_sense_ppe:
    'This invocation allows the sorcerer to sense the presence of potential psychic energy (P.P.E.). Like a Geiger counter, the individual can tell if he is near (within 20 ft/6.1 m) or far (at the limit of the magic\'s range). This magic ability should not be confused with "sense magic." It cannot pick up magic emanations, so it will not identify most magic objects, enchantments or spell casting. What this magic does provide is an indication of potential psychic energy within the area — people, places, supernatural beings, animals and other sources of P.P.E. The arcanist can determine the approximate amount of P.P.E. each individual currently possesses: little is 1–5, typical is 6–15, medium is 16–30, a lot is 31–60, vast (and often unnatural) is 61 and higher, incredible is 500 P.P.E. and higher. Objects only register potential psychic energy if they are possessed/inhabited by a living force.',
  magic_wizard_thunderclap:
    'The invocation produces a booming clap of thunder so loud that it seems to make the air vibrate. A thunderclap is an excellent means of alerting or signaling allies, as well as a means of intimidation. As an intimidation device, it will momentarily startle and distract everyone other than the spell caster. This provides the creator of the thunder with a bonus of +5 on his initiative, +1 to strike, parry and dodge, and creates a horror factor of 8 (all characters within 30 ft/9.1 m must roll to save vs horror factor, except the mage who made the thunder).',
  magic_wizard_befuddle:
    'An enchantment that temporarily causes its victim to become confused and disoriented. Concentration and reactions are impaired. Those affected are -2 to strike, parry and dodge; attacks per melee are reduced by one half and all skills suffer a penalty of -20%. Each invocation affects only one person each time it is cast. A successful save vs magic means the intended victim suffers no impairment.',
  magic_wizard_climb:
    'An enchantment that enables the enchanted person to climb with exceptional, almost inhuman, skill, speed, and agility. Skill level is 98% for normal, rough, climbable surfaces; speed is equal to the speed attribute. Smooth, presumably unclimbable or extremely difficult surfaces to climb normally can be scaled with a skill level of 60%. Rappelling is included.',
  magic_wizard_concealment:
    'This magic makes any small object sort of invisible. Actually, it affects the perception of anybody who looks at it. Unless the person(s) makes a successful saving throw, the item cannot be seen. This can be applied to one item on one\'s person or out in the open. Only one object is affected each time the magic is invoked. The object cannot be living and must be smaller than 14 inches (0.35 m) in length and height, 6 inches (0.15 m) in width, and weigh 14 pounds (6.4 kg) or less. Each person who looks at the place where the enchanted object is resting must roll a saving throw versus magic. A failed roll means that particular individual will not see it until the magic lapses. If the object is used as a weapon or picked up by the mage or anyone who does see it, the enchantment is broken and it becomes clearly visible to all.',
  magic_wizard_detect_concealment:
    'A magic invocation that will instantly negate any concealment spells and reveal any objects which may have been mystically concealed. Can be directed at a specific area or individual, or made to affect an entire area of up to 30 ft/9.1 m.',
  magic_wizard_extinguish_fire:
    'The sorcerer can instantly put out up to a 20 foot (6.1 m) area of fire 80 ft (24.4 m) away. A total of 40 ft (12.2 m) can be extinguished every melee round.',
  magic_wizard_fear:
    'The invocation creates a sensation of fear over a particular area (20 ft/6.1 m maximum area of effect). The mystic can place the enchantment on an area occupied with people, or an area that is not presently occupied. Anybody entering the area of enchantment must roll to save vs horror factor 16. A failed roll means the person is suddenly washed with terror and will be momentarily stunned, lose initiative, and will be the last person to attack and will not be able to defend himself against an opponent\'s first strike each melee the person is in the area of fear.',
  magic_wizard_heavy_breathing:
    'The sorcerer is able to conjure a mysterious, frightful sound of heavy, labored breathing, as if something invisible is lurking about. The mage can mentally manipulate the sound, increasing or decreasing the breathing rhythm, and move the sound around up to 60 ft (18.3 m) away. The breathing can be heard in a six foot (1.8 m) radius. Those hearing the breathing will become fearful and panicky. There is a 60% chance that the frightened fellow will flee in terror. Those who hear the breathing, but do not run, will be -2 to strike, and -1 to parry and dodge as they shake in their boots. Saving throw: standard; those who save are not affected/fearful.',
  magic_wizard_levitation:
    'Magic levitation enables the invoker of the magic to raise himself, or other people, or an object, straight up into the air and suspend it there (hover). Movement is limited to straight up and down; no horizontal motion is possible. Weight is restricted to 200 lbs (90 kg) plus 20 lbs (9 kg) per level of experience. Unwilling victims of the magic get a saving throw; a successful roll means the person is not affected by the levitation and remains planted firmly on the ground. Maximum height possible is 60 ft (18.3 m) plus 10 ft (3.0 m) per level of experience. Targets can be affected up to 60 ft (18.3 m) away.',
  magic_wizard_mystic_alarm:
    'The sorcerer can protect his possessions and domicile by placing mystic alarms on them. The invocation creates invisible, ward-like symbols on any one, specific, non-living object. If this object is touched or disturbed by anyone other than the spell caster, a silent alarm will alert him instantly, even if he is thousands of miles away or in another dimension. Once disturbed, the alarms disappear. The mystic alarm has a limited life of one year per level of the sorcerer.',
  magic_wizard_ritual_call_creature_of_light:
    'This ritual invocation contacts the nearest creature of light in the area. The Guardians are just one such group; more of these mysterious beings will be described in future Nightbane sourcebooks. The creature of light will sense that his/her presence is required by the spell caster and the ritual will also impart an empathic flash of the summoner\'s personality and intentions. This means that an evil sorcerer trying to ambush the creature of light will be automatically unmasked by the invocation. Whether or not any creatures of light are nearby, or willing to help, is up to the Game Master.',
  magic_wizard_breathe_without_air:
    'This invocation enables the person to function normally without air, whether it be underwater or in a vacuum, or in an area with little or no oxygen. Unfortunately, the magic does not protect the person from magic toxins or other types of magic, but does protect against natural and man-made gases.',
  magic_wizard_energy_bolt:
    'The incantation creates an energy bolt that the mage can mentally direct by simply looking at his intended target. The bolt may appear to fire from a hand or finger or the eyes, but needs no physical gesture, such as pointing. Damage is normally 4D6, but is increased to 6D6 under the influence of a ley line and 8D6 at a ley line nexus. P.P.E. cost is still only five despite the increased damage capability. One energy bolt can be fired at one target per each spell invocation.',
  magic_wizard_fingers_of_wind:
    'The magician can conjure a wind and manipulate it to touch, tap, bump or press against a person or object. It can also put out candles, slam doors, shut, or move or knock over small items weighing less than 10 lbs (4.5 kg).',
  magic_wizard_float_in_air:
    'This spell creates air currents which hold a person or object aloft, hovering about one foot (0.3 m) above the ground. It can be used to slow someone\'s descent from a fall or used to float on top of water. Movement is awkward and slow while in the air. The floating person suffers the following penalties: all attacks, strikes, parries and dodges are at -1; normal speed/movement is reduced by half.',
  magic_wizard_fuel_flame:
    'The magic feeds any existing fire, doubling it in size. It can affect a flame from 10 ft (3.0 m) up to 100 ft (30.5 m) away.',
  magic_wizard_ignite_fire:
    'A magic that causes spontaneous combustion. The magic will ignite any material that can burn. This means the mystic could set on fire a chair, a jacket, hair, and so on. Volatile substances inside a container, like gasoline in the gas tank of a car, cannot be ignited. The target to be set on fire must be clearly visible. Maximum area of effect is 3 ft (0.9 m). If somebody\'s clothes or hair are set on fire, they have two melees (30 seconds) to get it off or put the fire out before damage is inflicted; no other combat or action is possible. Damage from the small fire is 2D6 S.D.C. per melee (beginning after the first 2 rounds).',
  magic_wizard_impervious_to_fire:
    'A magic invocation that makes the individual temporarily impervious to fire. Normal and magical fires do no damage to the person or to anything he is wearing/on his person.',
  magic_wizard_impression:
    'The sorcerer is magically instilled with the ability to receive psychic impressions from an object about its previous owner. The following information will be revealed: general alignment (good, selfish, or evil); human or not human (specific nature of the inhumanness is not revealed); old or young; male or female; healthy, sick or hurt; whether the object is important or valuable to the individual, although the reason is not revealed.',
  magic_wizard_invisibility_simple:
    'The spell caster and anything he is wearing or carrying at the time of the invocation are turned completely invisible. Any object picked up after the character has become invisible remains visible. Likewise, any item on his person that is dropped becomes visible. Neither normal nor nightvision can detect invisibility; only beings who can naturally, psychically or magically "see the invisible" are able to see the spell caster. Infrared and heat detectors can also pinpoint an invisible person. Although the invisible person is imperceptible to the eye, he still retains physical mass. This means that he cannot go through walls nor can weapons pass harmlessly through him. The character still makes noise, leaves footprints, and physical magical contacts/attacks still affect him as usual. At the game master\'s option, an attacker who makes a difficult Perception roll can try to attack the invisible character (this requires a called shot at -2 to strike). While invisible, the mage can talk, weave spells, walk, climb, run, open doors, carry objects and perform other acts of physical exertion, including combat. The invisibility is terminated when the magic\'s duration time elapses or the mage cancels the spell. If cut, only the blood is visible.',
  magic_wizard_magic_armor:
    'This powerful spell instantly creates an invisible, weightless, noiseless, full suit of mystic armor upon the spell caster (or other). This mystic armor has an A.R. of 14 and an S.D.C. of 100 plus 10 per level of the caster; fire, lightning and cold do one-half damage.',
  magic_wizard_negate_poisons_toxins:
    'The sorcerer can magically turn a poisonous substance inert, rendering it harmless. The magic can also be used to instantly negate poison in the bloodstream of a person, preventing further damage by the foul substance. However, any damage caused by the poison before the magic is used cannot be reversed.',
  magic_wizard_ritual_call_nightlands_denizen:
    'This ritual requires a mirror or other reflective surface. At the completion of the ritual, the mirror will turn black and open into the Nightlands, calling the nearest Nightland denizen in the area (this includes Dopplegangers, Hounds, Hunters, Ashmedai and Nemtar, but not Nightbane and Nightlords). The creature may or may not answer the call, or use the breach in the Mirrorwall to cross over and cause mischief, so typically this ritual is conducted when and where the sorcerer is ready to deal with a hostile Nightlands monster. This ritual will automatically awaken a Doppleganger.',
  magic_wizard_telekinesis:
    'The telekinesis invocation temporarily empowers the spell caster with the psychic ability to move objects with thought. This power can be used to move or hurl objects, bring them to him, open doors, flick switches, press buttons, and so on. Maximum total weight is 60 pounds (27 kg). Attacks per melee equal the number of hand to hand attacks per melee that the character may have. Bonuses to strike +3 with telekinesis; physical and skill bonuses to strike do not apply. Bonuses to parry +4; physical and skill bonuses do not apply to telekinesis. Object being manipulated must be visible. Telekinesis can be combined with hand to hand combat, but does not add extra attacks per melee. Influence from ley line energy doubles the amount of weight and range possible. Ley line nexus energy triples the amount of weight and range.',
  magic_wizard_astral_projection:
    'The incantation sends the spell caster\'s astral body into the astral plane/dimension. This magic functions exactly like the psychic sensitive ability of the same name.',
  magic_wizard_charismatic_aura:
    'A particularly handsome tool of deception, this magic can be cast upon the spell caster or another person. The spell instantly enhances the person\'s physical beauty by eight, increasing his charisma so he can charm all who behold him. Although the focal point of the spell is the person on whom it was cast, it affects everybody in a 60 foot (18.3 m) radius (emanating from the person with the charismatic aura). Thus, everybody in that radius is allowed a saving throw vs magic. Those who successfully save will not be affected at all; those who fail to save are affected and will respond accordingly. The person with a charismatic aura can invoke one of three responses: friendship/trust, power/fear, and successful deception.',
  magic_wizard_cure_minor_disorders:
    'A unique bit of curative magic that will instantly relieve minor physical disorders and illness, such as headaches, indigestion, gas, heartburn, nausea, hiccups, muscle stiffness, low fever (under 101 degrees) and similar. This invocation will also negate simple curses that inflict minor disorders.',
  magic_wizard_energy_field:
    'The magic creates a protective field of energy around the mystic, others, or an object. The maximum area of protection is about 8 ft (2.4 m), which means it can protect a small roomful of people (about 6 to 8 individuals). The energy field appears as a semitransparent wall or bubble that shimmers with a blue-white light. The field normally provides a total protection of 60 S.D.C., but is doubled at ley lines and tripled at ley line nexuses.',
  magic_wizard_fire_bolt:
    'Like the energy bolt, the sorcerer can create and direct a bolt of fire. Bonus to strike is +4. Damage is normally 6D6, but increases to 8D6 at ley lines and to 1D6x10 at a ley line nexus.',
  magic_wizard_nightvision:
    'This invocation gives the character the power to see in absolute darkness; range of the vision: 200 ft (61 m) plus 100 feet (30.5 m) per level of experience.',
  magic_wizard_repel_animals:
    'An enchantment that will make even a hostile predatory animal stop, turn, and leave the area without harming the mage or anybody near him. The animal will not return for hours. The enchantment can affect six animals simultaneously.',
  magic_wizard_shadow_meld:
    'This unique magic enables the mage to step into shadows, becoming totally invisible, even to a "see the invisible" spell. The shadow must be at least five feet (1.5 m) tall to become an effective hiding place. The shadow serves as a superior means of hiding or moving unseen. The mage can move, walk, or run throughout the length of shadows or from shadow to shadow. While in shadow/darkness, the mage prowls at 60% proficiency (or at +15% to normal skill, whichever is higher). Intense light will dispel the shadow, leaving the mage revealed. Of course, sanctuary can be found by fleeing into another shadow. Feeble light, less than 10 torches or 300 watts, will only create more shadows. While hidden in shadows, the character is still susceptible to magic, psychic and physical attacks, although attackers are at -5 to strike him (because they cannot see him). Area effect magic does not suffer any penalty. Infrared optics are the only means that can be used to see somebody in a shadow.',
  magic_wizard_swim_as_fish_minor:
    'An incantation that provides the character with exceptional swimming abilities. Equal to Advanced Swimming and S.C.U.B.A. skills combined. Base skill is 96%, can swim a distance of 100 x P.S. in yards/meters without tiring, the caster has an additional +1 to parry and dodge while in water, and can hold his/her breath for two minutes at a time.',
  magic_wizard_trance:
    'This enchantment places another person into a zombie-like state in which the entranced person is in a hypnotic daze, unaware of his environment or the happenings around him. He cannot formulate thoughts, use skills, or act on his own. While entranced, the individual is only aware of the enchanter\'s voice and will follow extremely simple commands, such as stay, sit, follow me, get inside, lay down, give me your hand, etc. The entranced victim cannot engage in any type of combat, nor any actions that require skill or thought, and offers no resistance. The magic is meant to incapacitate more than it is to enslave. Evil sorcerers often use trance on prisoners or on the intended victims of a human sacrifice. While entranced, the person cannot be made to reveal secrets, betray a friend, harm himself, or act against his alignment. All physical attributes function as if they are half of what they really are. The victim of a trance will remember nothing of the events that occurred while entranced. Cannot affect people inside vehicles.',
  magic_wizard_calling:
    'The calling is like a limited form of telepathic communication in which the sorcerer can mentally call a specific individual. To use "the call," the mystic must know the person\'s whole name (first and last), must have personally met the individual (even if only briefly) and must be within range. The call sends a telepathic message to that particular person, calling him or her by full name, and leaves an impression of where the mage can be found. A typical call message will be something like "Richard Burke, I need you." Only the individual to whom the call is made can hear it. If a successful saving throw is made, the call, and impression of location, is heard only once. If the saving throw is not successful, the call will repeat itself over and over again, three times per melee, until the spell elapses or the person goes to the mage. Nothing except a mind block can stop the call.',
  magic_wizard_charm_weapon:
    'This ritual temporarily enchants a weapon to make it more effective against supernatural beings. The weapon will inflict double damage to any supernatural creature, or normal damage to beings who cannot normally be harmed by most weapons (like vampires or entities). For example, a sword that normally inflicts 1D8 damage will do 2D8 against Nightspawn or other supernatural beings, and 1D8 against vampires. This ritual will affect both hand to hand and missile weapons; if a missile weapon is thus enchanted, any missiles (bullets or arrows, for example) it fires will be automatically charmed. The weapon to be charmed has a saving throw, with a bonus of +1 if it is a missile weapon, or +3 if it is a high-tech weapon (a gun, for example).',
  magic_wizard_circle_of_flame:
    'The mystic can create a circle of flame around himself. No combustible material is required. The flame is five feet (1.5 m) tall and inflicts 6D6 S.D.C. damage to anybody who tries to pass through the fire.',
  magic_wizard_domination:
    'Domination is another trance-like enchantment that enables the mystic to impose his will over his victim\'s, forcing the person to do his biding. The victim of domination will appear to be acting oddly dazed, confused, slow and unfriendly (ignoring friends, etc.). The enchanted person has one goal, to fulfill the command of the mage. Under the enchantment of domination, the character\'s alignment does not apply. He will steal, lie, assist in crimes, kidnap, betray friends, reveal secrets and so on. The victim is under (almost) complete control of the spell caster. The only things the bewitched character will not do are commit suicide, inflict self-harm, or kill a friend or loved one. A good aligned character, principled, scrupulous, and even unprincipled, cannot be made to kill anybody; it is too deeply against their alignment. The enchanted person is not himself and suffers the following penalties. Attacks per melee, skills and speed are all halved, speech is slow, and the person seems distracted or a little dazed. A successful saving throw versus magic means the magic has no effect. The person is 100% his normal self. The effects of the domination magic cannot be faked.',
  magic_wizard_energy_disruption:
    'A particularly useful magic in a tech environment. The invocation will temporarily knock-out, stop, or immobilize, any electrical device it is aimed at. This includes normal automobiles, computers, radios, surveillance cameras, sensors, appliances, entire fuse boxes, batteries, electrical alarm systems, etc. The apparatus is not harmed in any way, it simply ceases to function. When the magic elapses, the item(s) will work perfectly, with no sign of malfunction or energy loss.',
  magic_wizard_escape:
    'The escape invocation enables the sorcerer to magically escape any bonds, or open any locking mechanism that bars his way. This includes being tied with rope, handcuffs, prison cells, doors, trunks, locks, strait jackets, etc. One restraint or lock can be undone per each invocation (one per melee is possible). Only gagging the mage will prevent the use of this magic.',
  magic_wizard_eyes_of_thoth:
    'Thoth is the god of knowledge and wisdom of the ancient Egyptians and is said to know all languages. This invocation enables the character to read and understand ALL written languages, modern and ancient. However, the spoken languages are incomprehensible unless a tongues spell is also invoked or the person has an education in that language.',
  magic_wizard_fly:
    'The sorcerer can magically bestow the power of flight only to an inanimate object not made of metal or plastic. He or she can then use the object to fly. This is the origin of the myths about the witch and her broom and flying carpets. The object must be big enough to hold onto or, preferably, large enough to sit on. If the item is small, the mage must hold on for dear life, and if his grip should give way, he will fall to his doom. To avoid muscle strain, it is best that the object can be comfortably sat upon. The maximum length and width of the enchanted object must not exceed six feet (1.8 m). This is enough to accommodate three additional adult passengers or six children. The magic will not work if the object has any metal or plastic on it, including nails. Maximum altitude is 1000 ft (305 m). Maximum speed is 35 mph (56 km); the object can be made to hover in a stationary position.',
  magic_wizard_heal_wounds:
    'This powerful invocation will heal physical wounds, such as bruises, cuts, gashes, bullet wounds, burned flesh and pulled muscles. It will not help against illness, internal damage to organs or nerves, broken bones or poisons/drugs. In the case of bullet wounds, the bullet should be removed first. If the bullet is left inside a person, it will be a constant irritant causing chronic pain; reduce the character\'s P.E. and P.P. attributes by one each due to stiffness and discomfort. The heal wound magic restores 3D6 S.D.C. and 1D6 Hit Points.',
  magic_wizard_horrific_illusion:
    'The sorcerer creates a frightening, illusionary image of a horrible sight using common images, such as a hundred large (presumably poisonous) spiders or other bugs or snakes, or a vicious, rabid animal(s), or fire, and similar. Everybody who sees the illusion must roll to save vs horror factor 14. A failed roll means that the character is momentarily stunned, with the usual horror factor combat penalties applicable to that one melee. However, the illusion is so real that any character who fails to save will not go past the illusion, but can try to find another route around it.',
  magic_wizard_midnight_wind:
    'This incantation creates a cold, hurricane-force wind and also temporarily darkens the sky in the area. Lights will dim and the temperature will drop 15 degrees Fahrenheit in the area affected. Once per melee round, the spell caster can unleash a powerful gust of wind against one target (+3 to strike), inflicting 3D6 points of damage. If the damage is greater than half the P.S. of the target, the victim is also knocked down by the freezing blast of wind.',
  magic_wizard_sleep:
    'The invocation can turn any normal, drinkable fluid or food into a sleep-inducing potion. Immediately after two bites of enchanted food or two gulps of fluid, the person will fall into an enchanted sleep. The victim cannot be awakened by any means except by the mage canceling the magic or until the spell\'s duration time lapses. A successful save means the enchanted food or drink has no effect.',
  magic_wizard_superhuman_strength:
    'The incantation magically increases the character\'s physical strength (P.S.) to 30, physical endurance (P.E.) to 24 and adds 30 S.D.C. for the duration of the magic. This enhanced strength is supernatural (see the Supernatural Strength Damage Table).',
  magic_wizard_superhuman_speed:
    'The invocation bestows the character with the incredible speed attribute of 44 (equal to 30 mph/48 kmph) and adds a bonus of +2 to parry and +6 to dodge for the duration of the magic. All movements performed during this period are done without fatigue.',
  magic_wizard_swim_as_fish_superior:
    'This spell can be cast on oneself or on one or two people at a time by speaking the incantation and touching the intended targets. The enchanted persons are then able to breathe underwater and swim expertly (at a speed of 20). Base skill 98%. No distance or fatigue factor; swims with ease for the full duration of the spell. Bonus of +2 to parry and dodge while in water.',
};

const PATCHES = {
  magic_wizard_see_aura: {
    reveals: [
      'Estimate the general level of experience (low 1–3, medium 4–7, high 8th and up)',
      'The presence of magic (no indication of what or power levels)',
      'The presence of psychic abilities',
      'High or low base P.P.E.',
      'The presence of a possessing entity',
      'The presence of an unusual human aberration (serious illness, non-human, or alien)',
    ],
    notes: 'Cannot tell alignment from this spell. A psychic mind block will mask psychic abilities, P.P.E. level, and possession.',
  },
  magic_wizard_sense_evil: {
    notes: 'Psychic mind block or protection from a magic pentacle prevents the spell on anyone in the circle. The psychic equivalent of sense evil is not blocked by the magic pentacle.',
  },
  magic_wizard_sense_magic: {
    notes: 'Does not detect psychic powers or Nightbane talents. Men of magic and most supernatural beings do not register except when actively casting.',
  },
  magic_wizard_befuddle: {
    notes: 'Skills suffer -20% penalty. Attacks per melee reduced by half.',
    inflictedModifiers: {
      statusEffects: ['confused'],
      globalSkillModifier: { value: -20 },
      combatModifiers: { strike: -2, parry: -2, dodge: -2, attacksPerMelee: -1 },
    },
  },
  magic_wizard_concealment: {
    limitations: {
      otherLimitations:
        'One non-living object per casting; max 14 in (0.35 m) length/height, 6 in (0.15 m) width, 14 lb (6.4 kg). Enchantment breaks if the object is used as a weapon or picked up by anyone who can see it.',
    },
  },
  magic_wizard_mystic_alarm: {
    alarmTrigger: {
      summary: 'Mystic alarm ward on one specific non-living object.',
      satisfy: 'any_condition',
      conditions: [
        {
          kind: 'intruder',
          notes: 'Anyone other than the spell caster touches or disturbs the warded object.',
        },
      ],
      onTrigger: {
        effect: 'mental_alert',
        alertTarget: 'caster',
        summary:
          'Silent psychic alarm alerts the caster instantly, even across dimensions; ward then dissipates.',
      },
    },
  },
  magic_wizard_ritual_call_creature_of_light: {
    magicKind: 'summoning',
    spawnedPresence: {
      kind: 'creature',
      label: 'Nearest creature of light',
      notes: 'GM determines availability and willingness. Empathic flash reveals summoner intent to the contacted being.',
    },
  },
  magic_wizard_magic_armor: {
    notes: 'Mystic armor A.R. 14; fire, lightning and cold do one-half damage.',
    grantedModifiers: {
      target: 'touch',
      forceField: { sdcFormula: '100 + 10 per level of the caster' },
      resistances: ['fire', 'lightning', 'cold'],
    },
  },
  magic_wizard_negate_poisons_toxins: {
    healing: { cures: ['poison', 'toxin'] },
  },
  magic_wizard_ritual_call_nightlands_denizen: {
    spellLevel: 3,
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 132 }],
    magicKind: 'summoning',
    isRitual: true,
    spellStrengthBase: 16,
    materialComponents: {
      label: 'Focal Object',
      entries: [
        {
          label: 'A mirror or other reflective surface',
          quantity: { kind: 'fixed', value: 1 },
          unit: 'each',
          consumption: 'reusable_tool',
        },
      ],
    },
    ritualProfile: {
      craftingDuration: { summary: 'One hour.', kind: 'hour', durationValue: 1 },
      materialComponents: {
        label: 'Focal Object',
        entries: [
          {
            label: 'A mirror or other reflective surface',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'each',
            consumption: 'reusable_tool',
          },
        ],
      },
    },
    spawnedPresence: {
      kind: 'creature',
      label: 'Nearest Nightlands denizen',
      notes: 'May include Dopplegangers, Hounds, Hunters, Ashmedai, and Nemtar — not Nightbane or Nightlords. Automatically awakens a Doppleganger.',
    },
  },
  magic_wizard_telekinesis: {
    spellLevel: 3,
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 132 }],
    notes:
      'Hurled object damage: 6 oz–1 lb 1D4; 1.5–2.5 lb 1D6; 3–4.5 lb 2D4; 5–10 lb 3D4; 11–25 lb 3D6; 26–60 lb 4D6; add 1D6 per additional 20 lb (9 kg). Ley line doubles weight/range; nexus triples.',
    damage: {
      entries: [
        { weightRange: '6 oz–1 lb', formula: '1D4' },
        { weightRange: '1.5–2.5 lb', formula: '1D6' },
        { weightRange: '3–4.5 lb', formula: '2D4' },
        { weightRange: '5–10 lb', formula: '3D4' },
        { weightRange: '11–25 lb', formula: '3D6' },
        { weightRange: '26–60 lb', formula: '4D6' },
      ],
      notes: 'Add 1D6 for each additional 20 lb (9 kg) of weight.',
    },
    grantedModifiers: {
      target: 'self',
      combatModifiers: {
        strike: 3,
        parry: 4,
        notes: 'Physical and skill bonuses to strike and parry do not apply. Maximum weight 60 lb (27 kg).',
      },
    },
  },
  magic_wizard_charismatic_aura: {
    effectProfiles: [
      {
        name: 'Friendship/Trust',
        description:
          'The first few words spoken will set up the response. A statement of friendship, peace or trust inspires those sentiments in everyone affected who failed their save.',
        save: { summary: 'Standard', saveKind: 'standard' },
      },
      {
        name: 'Power/Fear',
        description:
          'A statement of power, anger, strength, or vile intent strikes awe and fear into everyone affected who failed their save.',
        save: { summary: 'Save vs Horror Factor', saveKind: 'horror_factor' },
        horrorFactor: 13,
      },
      {
        name: 'Successful Deception',
        description:
          'Enables the charismatic aura person to convincingly lie like a master con-man. 80% chance that those affected will believe anything he tells them. Triggered by a phrase like "Trust me completely…" or "I would never lie to you."',
        save: { summary: 'Standard', saveKind: 'standard' },
      },
    ],
    notes: 'Caster chooses one of three responses after casting. All observers in radius get a standard save vs magic.',
  },
  magic_wizard_energy_field: {
    grantedModifiers: {
      target: 'touch',
      forceField: { sdcFormula: '60 S.D.C. (doubled at ley lines, tripled at nexuses)' },
    },
  },
  magic_wizard_charm_weapon: {
    ppe: { baseActivation: 12 },
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 134 }],
    ritualProfile: {
      craftingDuration: { summary: 'One hour', kind: 'hour', durationValue: 1 },
    },
    save: {
      summary: 'Standard; the weapon to be charmed also rolls a saving throw (+1 missile weapon, +3 high-tech weapon).',
      saveKind: 'standard',
    },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: {
        damageMultiplier: 2,
        damageCondition: 'against supernatural beings; normal damage vs vampires/entities normally immune to weapons',
      },
    },
  },
  magic_wizard_circle_of_flame: {
    magicKind: 'circle',
    sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 134 }],
  },
  magic_wizard_fly: {
    limitations: {
      otherLimitations:
        'Object must be inanimate with no metal or plastic (including nails). Max 6 ft (1.8 m) length/width; max altitude 1000 ft (305 m).',
    },
  },
  magic_wizard_heal_wounds: {
    notes: 'Bullet should be removed first; retained bullet reduces P.E. and P.P. by 1 each from chronic pain.',
  },
  magic_wizard_swim_as_fish_superior: {
    grantedModifiers: {
      target: 'touch',
      immunities: ['drowning'],
      combatModifiers: { parry: 2, dodge: 2 },
      grantedSkills: [{ name: 'Swimming', basePercentage: '98%', notes: 'Speed 20; no distance or fatigue limit.' }],
    },
    notes: 'Can be cast on self or one or two people by touch.',
  },
};

export function buildNightbaneL1to5Spells() {
  const wizard = JSON.parse(fs.readFileSync(WIZARD_PATH, 'utf8'));
  const byId = new Map(wizard.map((row) => [row.id, row]));

  return TARGET_IDS.map((id) => {
    const base = byId.get(id);
    if (!base) throw new Error(`Missing wizard spell: ${id}`);

    let spell = stripCites(JSON.parse(JSON.stringify(base)));
    if (DESCRIPTIONS[id]) spell.description = DESCRIPTIONS[id];
    if (PATCHES[id]) applyPatch(spell, PATCHES[id]);

    return spell;
  });
}

if (process.argv[1] && process.argv[1].endsWith('build_nightbane_l1_5_spells.mjs')) {
  const spells = buildNightbaneL1to5Spells();
  fs.writeFileSync('scripts/_nightbane_l1_5_patch.json', JSON.stringify(spells, null, 2) + '\n');
  console.log('Wrote', spells.length, 'spells');
}
