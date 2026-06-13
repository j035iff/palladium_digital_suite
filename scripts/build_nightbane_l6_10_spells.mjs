/**
 * Nightbane core wizard spells levels 6–10 (RPG pp. 137–146).
 * Run: node scripts/build_nightbane_l6_10_spells.mjs
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
  'magic_wizard_apparition',
  'magic_wizard_call_lightning',
  'magic_wizard_compulsion',
  'magic_wizard_cure_illness',
  'magic_wizard_fire_ball',
  'magic_wizard_impervious_to_energy',
  'magic_wizard_mask_of_deceit',
  'magic_wizard_memory_bank',
  'magic_wizard_ritual_call_nightlord',
  'magic_wizard_teleport_lesser',
  'magic_wizard_time_slip',
  'magic_wizard_tongues',
  'magic_wizard_words_of_truth',
  'magic_wizard_agony',
  'magic_wizard_invisibility_superior',
  'magic_wizard_life_drain',
  'magic_wizard_metamorphosis_animal',
  'magic_wizard_paralysis_superior',
  'magic_wizard_purification_food_water',
  'magic_wizard_ritual_an_eye_for_an_eye',
  'magic_wizard_second_sight',
  'magic_wizard_wind_rush',
  'magic_wizard_hallucination',
  'magic_wizard_locate',
  'magic_wizard_luck_curse',
  'magic_wizard_metamorphosis_human',
  'magic_wizard_minor_curse',
  'magic_wizard_negation_of_magic',
  'magic_wizard_nightlands_portal',
  'magic_wizard_oracle',
  'magic_wizard_sickness',
  'magic_wizard_spoil_water_food',
  'magic_wizard_temporary_enchantment',
  'magic_wizard_curse_phobia',
  'magic_wizard_curse_temporary_insanity',
  'magic_wizard_familiar_link',
  'magic_wizard_metamorphosis_insect',
  'magic_wizard_protection_circle_simple',
  'magic_wizard_summon_and_control_canine',
  'magic_wizard_transferal',
  'magic_wizard_banishment',
  'magic_wizard_bind_nightbane',
  'magic_wizard_bonding',
  'magic_wizard_control_enslave_entity',
  'magic_wizard_curse_paranoia',
  'magic_wizard_metamorphosis_superior',
  'magic_wizard_summon_control_rodents',
  'magic_wizard_summon_nightlands_denizen',
  'magic_wizard_wards',
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
  magic_wizard_apparition:
    'The magician can create a realistic apparition in the form of a horrible creature or weird thing that will attack anybody who comes within 20 ft (6.1 m) of it. Apparitions are commonly used to block passages and guard entrances. Although an illusion, it will appear completely real, interacting with an opponent\'s actions. The illusion will appear to sweat and bleed, but cannot be killed or stopped. The illusion can appear as any known supernatural creature or imaginary "thing," like a man-eating refrigerator, and so on. There are only three ways to destroy the illusion: 1) A successful save vs magic will cause the thing to disappear (at least for that individual). Each character must make a saving throw. 2) Plunge a rod or something made of iron into it. 3) Wait for the magic\'s duration time to elapse. The person who sees the apparition will believe it to be real in every way and will even imagine it inflicting damage to him. Combat should be conducted as usual, although the damage is imaginary and disappears when the apparition is destroyed. Should the opponent of the apparition die (or so he believes), he will fall unconscious.',
  magic_wizard_call_lightning:
    'The spell creates a lightning bolt which can be directed at any specific target up to 300 ft (91.4 m) away. The lightning bolt shoots down from the sky, hitting the desired target. The target or area must be within the spell caster\'s line of vision. The lightning bolt does 3D6+6 plus 1D6 damage per level of the caster.',
  magic_wizard_compulsion:
    'The spell caster can implant a sudden desire or need in another person\'s mind. The focus of the irresistible impulse should be something reasonable and attainable, although the motive may seem quite irrational. The enchanted person will be consumed with the object or action of the implanted compulsion, whether it be something very simple, like a craving for a candy bar, or the need to visit somebody or something more extravagant. The victim will be obsessed with attaining whatever it is for the full duration time of the incantation or until it is attained. A remove curse spell will also negate the compulsion.',
  magic_wizard_cure_illness:
    'A potent magic that can cure ordinary disease and illness, such as fever, flu and other common diseases. The magic cannot cure cancer, lung disease, wounds, broken bones or internal damage to organs. Nor can it cure magically induced sicknesses or disorders.',
  magic_wizard_fire_ball:
    'The spell caster creates a large fire ball which hurls at its target at an awesome speed, inflicting 5D6 plus 1D6 damage per level of the caster. The fire ball is magically directed and seldom misses. Saving throw: None except dodge, but the victim must know the attack is coming and must roll an 18 or higher.',
  magic_wizard_impervious_to_energy:
    'The sorcerer can make himself impervious to all forms of energy including fire, heat, electricity, lasers and so on. Energy attacks do no damage whatsoever. Physical attacks, guns, knives, clubs, etc. do normal damage.',
  magic_wizard_mask_of_deceit:
    'A useful tool for deception, it magically creates an illusionary mask over the person\'s own facial gestures. Age, gender, skin color, hair, hair length and specific features are composed with thought. However, the magic is limited to facial features and does not apply to any other part of the body. The mage can attempt to imitate a specific person\'s face, but has a mere 20% +5% per level of experience skill level; if the character has the disguise skill, use that base skill instead. Saving throw: Everyone encountering the person gets a save vs magic, but is at -4 to succeed. A successful save means the true features are seen, not the mask.',
  magic_wizard_memory_bank:
    'The mage can implant a block of memory/information deep into another person\'s subconscious mind without them ever knowing what it is. The sorcerer can then retrieve it at any time with a mere touch. This technique can be used to safely record and hide phone numbers, addresses, incantations, or any other data under 100 words. The information can be stored for three months per level of the enchanter. Note: A mind block will make it impossible to implant or retrieve a memory bank. There is no limit to the number of memory banks a mage can implant in the same person. The memory will fade away after the magic\'s duration time has elapsed.',
  magic_wizard_ritual_call_nightlord:
    'The sorcerer can contact the Nightlords with this ritual. When successfully completed, the contacted Ba\'al or one of his avatars will sense they are being called, and will magically know where the call came from. The magic can reach across the Mirrorwall into both Earth and the Nightlands. There are two versions of this enchantment; one will call the nearest Nightlord or avatar in the area, whether he is on Earth or the Nightlands. The second version calls one specific Ba\'al or one of his avatars. Calling a Nightlord when he does not wish to be disturbed is, of course, a very dangerous pastime. Note: This spell is very rare outside the Cults of Night.',
  magic_wizard_teleport_lesser:
    'The power to transmit matter from one place to another. The lesser teleport invocation is limited to non-living substances. Up to 50 lbs (22.5 kg) can be instantly transported from the location of the spell weaver to any location miles away. The only requirements are that the mage touches the object to be teleported and that the location of where it is being sent to is known to him. Success ratio: 80% +2% per level of experience. An unsuccessful roll means that the object never arrived where it was supposed to and could be anywhere within the mage\'s range.',
  magic_wizard_time_slip:
    'The invocation momentarily suspends time, enabling the spell caster to slip 7 seconds into the future. The mage can move forward seven seconds while all around him are caught in the past. The magic is such that the arcanist cannot physically hurt any living creature, but can move about the physical environment, open doors, grab an item, run, etc. The effect will appear, to others, as if the character disappears for an instant and then suddenly reappears a few seconds later. All those around him lose two attacks that melee round, but the mystic retains all of his. The time slip is ideal for a quick escape. Note: Whatever actions the magician takes within the seven seconds are unseen and unknown to the other characters.',
  magic_wizard_tongues:
    'The magic enables the character to perfectly understand and speak all spoken languages (98% proficiency). An understanding of written languages is not provided by this magic (see the Eyes of Thoth).',
  magic_wizard_words_of_truth:
    'A person affected by this enchantment is compelled to answer all questions truthfully. The sorcerer must be within five feet (1.5 m) and can ask two brief questions per melee round. It is wise to keep questions simple and clear to avoid confusion. Saving throw: The enchanted person makes a saving throw for each question asked. A successful save means the enchanted person doesn\'t have to answer. Questions can be repeated.',
  magic_wizard_agony:
    'A particularly cruel and painful invocation that incapacitates its victim with pain. Under the influence of the magic, the victim has no attacks per melee, cannot move or even speak; only writhe in agony. Although there is no physical damage (no S.D.C. or Hit Points are lost), the pain is very real, and it will take another minute for the victim to regain his full composure. During the second minute his number of attacks and speed are reduced by half, and he suffers a penalty of -1 to strike, parry and dodge. Only one person can be affected per invocation.',
  magic_wizard_invisibility_superior:
    'A powerful incantation that makes the spell caster invisible to all means of detection. Infrared, ultraviolet, heat, motion detectors, and even an animal\'s sense of smell cannot locate the invisible person. No footprints are made, and little sound (Prowl 84%). The magic is broken only if the character makes a hostile move, engages in combat or attacks. At that instant, he becomes completely visible. Note: The invisible character is not ethereal and cannot walk through walls; he must still use a door. The act of forcing open a door or window, picking a lock, tapping somebody, accidentally bumping somebody, or accidentally getting shot or hurt, is not considered an act of aggression or combat, so invisibility is maintained.',
  magic_wizard_life_drain:
    'The life drain is a debilitating magic that weakens an opponent. The victim will turn pale and experience weakness. Reduce S.D.C. by half, hit points by half, attacks per melee by one, and skills by 10%. Low level sorcerers (1–3) can only affect one individual per spell cast, but at the fourth level the mage can also cast the magic on a 15 ft (4.6 m) area, affecting everyone who enters and remains in the area of enchantment. Once the magic\'s duration time has lapsed, the victim\'s skills and attacks per melee return to normal; S.D.C. at a rate of 8 per hour, and hit points return at a rate of 4 per hour. Reduced speed (half) and a feeling of weakness remains for six hours. A successful saving throw means the magic has no effect on the person.',
  magic_wizard_metamorphosis_animal:
    'The invocation can completely transform a character into a particular animal, from an alley cat or cocker spaniel to a lion, wolf, alligator or a bird. As the animal, the character gets all the inherent abilities and defenses which that animal form may offer, but retains his own I.Q., ability to speak, memory, S.D.C. and hit points. The mage can return to human form (naked) at will. To determine the general abilities of an animal type, use the Palladium Book of Monsters and Animals tables for claws, teeth, antlers, horns, hooves, speeds, and nocturnal animal bonuses.',
  magic_wizard_paralysis_superior:
    'This magic temporarily incapacitates its victim, paralyzing him completely. In this state the victim cannot move, or even speak. If damage is inflicted on the victim, the spell is broken and he can move once again. A successful save means the magic has no effect.',
  magic_wizard_purification_food_water:
    'The mystic can purify food or water, cleansing it of disease, bacteria and poisons/toxins. Up to 50 lbs (22.5 kg) of food or 10 gallons of water/fluids can be purified.',
  magic_wizard_ritual_an_eye_for_an_eye:
    'This powerful enchantment causes any attack that inflicts damage on the spell caster to magically wound the attacker as well! For example, if an assassin stabs the magician and inflicts 7 points of damage, an identical wound would appear on the assassin\'s back for the same amount of damage. Only damage that harms the caster\'s personal S.D.C. and Hit Points is affected by this spell. The caster remains injured by the attacks and must heal his/her wounds through other means.',
  magic_wizard_second_sight:
    'A unique use of magic that enables a mage to see and hear what another person is doing at that very moment. To use second sight, the arcanist must have previously encountered/met the individual. The sorcerer just has to think about that person and he will get a clairvoyant-like vision showing what that person is doing and saying, and who he/she is with. The vision is what one might expect to see in a crystal ball except that the arcanist sees it in his mind. The vision lasts only 30 seconds each time the magic is invoked. A sorcerer can also use second sight to transmit his present activity to another person. This is a great way to show somebody that you are in trouble. Note: The image always consists of true events showing exactly what is happening when it is happening. The vision cannot be altered or doctored in any way. Only a mind block will prevent the person from being seen through second sight.',
  magic_wizard_wind_rush:
    'This spell creates a short, powerful wind gusting at 60 mph (96 kmph), which is capable of knocking people down, knocking riders off mounts, blowing small objects 20 ft to 120 ft (6.1 to 36.5 m) away, or creating dust storms. The wind can be directed by the spell caster at a specific target or a general sweep (maximum wind width — 20 ft/6.1 m) can be made. Anyone caught in the wind is helpless and unable to attack or move forward. It takes an additional melee to recover, and 1D8 melees to gather up all items blown away. Saving throw: A roll of 18–20 saves one from losing one\'s balance and losing some item(s).',
  magic_wizard_hallucination:
    'The invocation creates a mystic illusion or delusion that the mage implants in the character\'s mind that only he/she experiences. Whatever the illusion is, whether it be a monster or fire, bottomless pit or a void, it seems completely real to its victim. The person hallucinating will react and interact with the hallucinatory image regardless of what anybody else may say or do. A successful save vs magic means that the magic has no effect. Note: A mind block adds a +3 bonus to save vs hallucinations.',
  magic_wizard_locate:
    'Locate is a magic invocation that enables the sorcerer to sense the general location of his quarry. The location is limited to a general area or environment, like a specific apartment building, house, shopping mall, church, park, on an airplane headed for New York (or wherever), etc. To locate a particular person the arcanist must have either personally encountered the individual or be provided a photograph. The success ratio for the spell is 41%. The success ratio for a ritual is 89%, but this also requires an object owned by the person or a lock of hair, or fingernail clippings, or dried blood from that person.',
  magic_wizard_luck_curse:
    'The incantation inflicts the person with bad luck. The victim\'s normal bonuses to strike, parry, dodge, and initiative, and roll with punch, are all reduced to zero; no bonuses! Critical strikes do normal damage (except a natural 20 always does double damage); a death or knockout/stun punch does only 1D4 damage. Kick attacks have a 60% chance of causing the character to trip and fall down. Prowl skill turns into a clumsy roll, making noise every time it is tried. All skills are at a -40%, but only during critical situations. The game master can also add other minor occurrences of bad luck. Only a remove curse invocation can negate the effect of this enchantment before its duration elapses.',
  magic_wizard_metamorphosis_human:
    'A human mage can change his shape, altering his physical structure. The ultimate disguise, the character can change his height, weight, age, hair color, hair length, skin color, gender, and features. A non-human being can transform itself to appear completely human. Note: Nightbane cannot alter their Morphus with this spell, only their Facade. For some reason, their "true shape" is immune to shape-changing magicks. To attempt to impersonate a real, existing person, the arcanist must have the disguise skill, even though he/she is mentally molding his/her features through magic. A good photograph is required. The success ratio for imitating/impersonating the appearance of a real person is the mage\'s disguise skill +20%. The better he knows the person the more complete the disguise. In a ritual version of this same magic, the mage can metamorphosize someone else, rather than himself. Also in the ritual magic, the mage can metamorphosize someone else into an exact duplicate of himself. Furthermore, a captive at the ceremony can be duplicated without flaw. Note: The metamorphosis process only changes the appearance of the body. The transformed person retains his own voice, memory, skills, and attributes/abilities.',
  magic_wizard_minor_curse:
    'The spell caster can inflict a curse in the form of minor physical disorders that cause a constant irritation. Such disorders include fever, gas, headache, hiccups, ingrown toenail, itching and rash, pimples, nausea, runny nose and cough, and vertigo. No normal medicine or cures will rid a character of a curse. Only a remove curse incantation can do it, or waiting until the duration time of the curse elapses. A negation spell can be tried, but it has only a 25% possibility of success.',
  magic_wizard_negation_of_magic:
    'This incantation will instantly cancel the effects or influence of most magic. To determine whether the negation is successful or not roll a saving throw. If the roll is a successful save against the magic used, its influence is immediately destroyed/negated/canceled. 12, 13, 14 or 15 is needed for spell magic depending on the experience level of the magic. A failed save means the negation attempt did not work. Try again if sufficient P.P.E. is available. Negation will not work against possession, exorcism, constrain being, banishment, talisman, amulet, enchanted objects, symbols/circles of protection, wards, summoning magic, zombies, golems, restoration or healing/cures. Negation can be attempted to cancel a curse, but only has a 25% possibility of succeeding, and that\'s only if the saving throw was successful. It also has no effect against psychic abilities or Nightspawn talents.',
  magic_wizard_nightlands_portal:
    'The sorcerer has the ability to open a dimensional gateway into the Nightlands (or, if cast in the Nightlands, to Earth). The portal reaches the corresponding place in that shadowy dimension. So, for example, if this invocation is conducted in an Earth city, the doorway will open to the middle of its corresponding Nightlands City-state. While the gate is open, anybody can cross into or out of the Nightlands, or vice-versa.',
  magic_wizard_oracle:
    'The oracle is the magic equivalent of clairvoyance. The arcanist receives a dream-like vision of a possible future. The focus of the vision will depend on what, when or whom the mage is thinking about. The same basic rules that apply to clairvoyance apply to the "oracle" invocation.',
  magic_wizard_sickness:
    'Sickness is a debilitating magic which afflicts its victims with the symptoms of a specific disease. Only the symptoms of the disease manifest themselves, not the actual disease. Consequently, a medical examination will show there to be no physical cause to the illness. At best, it will be diagnosed as psychological or unknown. No matter how ill or helpless the victim may become he cannot die from the magic sickness. But the character will suffer greatly. All sickness inflicted by this magic is severe, inflicting the following penalties and modifiers: Attacks per melee are reduced to one, physical endurance is reduced by 70%, -4 to strike, parry and dodge, no initiative, and skills are reduced by 40%. The person is very weak, disoriented and uncomfortable.',
  magic_wizard_spoil_water_food:
    'Basically, this magic is the opposite of the purification (food/water) incantation. In this case, the mage can instantly transform good food into spoiled, affecting 50 lbs (22.5 kg) or two gallons (37.9 liters) of water/fluids, making the food inedible and the water undrinkable. Anybody who forces himself to eat or drink the horrible tasting food or drink will get sick with stomach cramps and diarrhea. Penalties: -1 on initiative, -1 to strike, parry and dodge.',
  magic_wizard_temporary_enchantment:
    'This incantation enchants a weapon, allowing it to inflict double damage to supernatural creatures, or normal damage to creatures normally unaffected by normal weapons. A missile weapon enchanted in this manner will extend the enchantment to any ammunition it fires. The weapons get a saving throw, at +1 if it is an archaic missile weapon (like a bow or crossbow), or at +3 if it is a high-tech weapon (like a gun).',
  magic_wizard_curse_phobia:
    'The phobia curse implants in its victim an unreasoning fear of something (see phobia in the Insanity section). The sorcerer can select one of the phobias listed in the insanity section or make a random roll on that table or introduce a new phobia (new phobias must be approved by the game master). The victim of the curse will have a phobic reaction every time he encounters that fearful thing. Only a remove curse is a 100% cure, negation has a 25% chance of success, and, of course, the mage who created the curse can cancel it at any time.',
  magic_wizard_curse_temporary_insanity:
    'This invocation temporarily renders the person insane! Roll on the insanity tables to determine the exact nature of the curse. The effects of the madness can only be reversed by a remove curse (a negation has a 25% chance of working). If the spell is cast against a player character, the change in behavior should be role-played fully.',
  magic_wizard_familiar_link:
    'At third level, a practitioner of magic is experienced enough to mentally link with a small animal (mammal, bird or lizard). This link is permanent, producing a rather impressive symbiotic relationship. No matter how wild or mean the animal may have been, it will be instantly linked to the mage, becoming docile and submissive to him and him alone. The two are now one. The spell caster is its friend and master, an extension of the animal. The animal familiar will understand and obey any command, verbal or mental. For the mage, the familiar is now a sensory extension enabling him to see, hear, smell, taste and feel everything the animal experiences. Thus, familiars make great spies; listening to conversations and prowling into areas not easily accessible to its master. Although the familiar understands and obeys its master, it cannot actually speak to him. Just as the arcanist knows what the familiar is feeling, so does the familiar know what its master is experiencing. If one is in danger the other will know it. Because of the magical nature of the union, the mage and the familiar both get an additional six hit points. However, if the familiar is hurt or attacked, its master also takes the same damage even if miles apart. If the familiar is killed, the arcanist permanently loses 10 hit points. There is a 50% chance he will also suffer shock from the ordeal; if he does, he will lapse into a coma for 1–6 hours. Another familiar link cannot be tried again for at least 1/2 a year. Other limitations: telepathic/empathic communications maximum range 600 ft/183 m; familiar possesses its normal abilities; size 25 pounds (11 kg) maximum; usual animal types include cats, dogs, coyotes, foxes, weasels, rodents, birds, lizards, and snakes.',
  magic_wizard_metamorphosis_insect:
    'The mage can transform himself into an insect, including spiders, that is no smaller than a half inch (12.7 mm) and no larger than six inches (0.15 m). In insect form, the mage retains his own I.Q., memory, hit points and S.D.C.; however, the performance of human skills is impossible as a bug. Likewise, magic cannot be cast because as an insect he cannot speak. The metamorphosis can be canceled at will, but the sorcerer will be naked. Typical bug abilities include bite or sting damage, running/climbing/flying speeds, and the ability to walk on any surface.',
  magic_wizard_protection_circle_simple:
    'Even as a spell, this invocation might be considered a ritual, for it requires the physical drawing of a circle and symbols while the spell incantation is recited. Chalk or charcoal, or almost any substance, can be used to draw the circle. 45 P.P.E. points are needed to initially create the circle, but a mere four P.P.E. is all that is needed to reactivate it. Anybody with sufficient P.P.E. and desire can reactivate a protection circle. However, if the circle is damaged (scraped, scarred, rubbed out, etc.) it will not function and a new one will have to be created. The simple protection spell will protect everybody inside its radius by keeping lesser supernatural creatures five feet (1.5 m) away from the circle. The creatures cannot come any closer, nor enter the circle. The circle also provides its occupants with a bonus of +2 to save vs magic and psychic attacks. Although lesser supernatural creatures, such as entities, ghouls, and gremlins, cannot come near or enter the circle, they can hurl objects, use weapons, or use magic and psychic powers against the person(s) inside the circle. Greater beings, such as vampires, elementals, Hounds, Hunters, and Nightlords are not affected by the simple circle and can enter effortlessly. No bonuses vs magic apply against these powerful beings.',
  magic_wizard_summon_and_control_canine:
    'All pentacles and pentagrams are used for summoning or potentially evil intent. The summon and control canines pentacle will provide 1D4 canines (dogs, wolves, etc.) plus one additional canine per level of experience. The animals will be under the complete control of the mage, obeying his every command, and will fight to the death. The pentacle will also give the sorcerer the power to control any other canines which were not originally summoned, within 200 ft (61.0 m)/line of vision, as long as the mystic remains in the pentacle. The canines originally summoned will obey the arcanist in and out of the pentagram for the duration of the enchantment, then leave.',
  magic_wizard_transferal:
    'The spell caster can use this magic to temporarily transfer his mystic essence into another person by transferring all but 4 P.P.E. and experience into that individual. A See Aura would reveal no magic, little P.P.E. and no levels of mystic experience. It is an excellent way to hide one\'s mastery of magic when needed. The person to whom the P.P.E. and experience have been transferred to is completely unaware of the power within him and cannot use it. The mystic who has temporarily drained himself of magic retains his mystic knowledge, but has only 4 P.P.E. and can create magic only at first level of proficiency. He can regain his power by touching the person who holds it or by waiting until the magic\'s duration time elapses.',
  magic_wizard_banishment:
    'A useful invocation for controlling supernatural beings is Banishment. The magic forces one lesser supernatural being/demon per experience level of the spell caster, to leave the immediate area (600 ft/183 m radius). The creature(s) cannot return for at least two weeks per level of experience. Each lesser being gets to roll to save vs magic. A successful save means it is not banished and can stay to cause trouble. As always, a banishment ritual has a greater chance of success (16 or higher is needed to save). Note: Works against Hounds, Hunters and Ashmedai; if they fail to resist, they are banished back to the Nightlands. Does not affect Nightbane, Guardians, Nightprinces, avatars or Nightlords.',
  magic_wizard_bind_nightbane:
    'This incantation is designed to exert power over the Nightbane. It is known only by a few sorcerer brotherhoods and is very rarely passed on to outsiders. If the Nightbane(s) in the area fails his saving throw, he is partially controlled by the mage. The sorcerer can prevent the Nightbane from leaving the boundaries of the circle (or, alternatively, he can expel the Nightbane and make it impossible for him to enter the area affected). He can also keep the Nightbane from moving (the character can save every melee round to fight the paralysis; a successful save breaks the paralysis but does not remove the circle\'s power). More importantly, the caster can force the Nightbane to remain in either Morphus or Facade form! Typically, the arcanist will choose the weaker Facade for his victim(s).',
  magic_wizard_bonding:
    'Bonding is a powerful ritual incantation that combines magic to strike at somebody from a great distance. The arcanist makes a clay, straw or rag doll in the image of a man or woman. Then a lock of hair or fingernail clippings from the intended victim is glued to the doll effigy. To complete the magic the incantation is performed and the victim\'s true name (first, middle and last) must be known (if the person has no middle name, only the first and last must be known). When this has been done, the doll is magically linked to that specific individual. This means that non-energy magic, like befuddle, fear, breathe without air, trance, calling, heal wounds, compulsion, sickness, curses and so on, can be cast on the doll effigy and it will affect the real person. Summoning and protection magic, as well as energy magic like energy bolt, call lightning, fire bolt, telekinesis, etc., cannot be used on the doll with any effect. Pins and needles can be used to inflict stabbing pain into the victim. This is done by stabbing the doll with the instruments of torture. The victim will double over with pain, losing all but one attack that melee and is -4 to strike, parry and dodge. Despite the great pain, the needle inflicts only one S.D.C. point of damage each time. Fire can be used to wear a character down with fever-like symptoms: feels like he\'s burning up from heat, sweats profusely, speed is reduced by 25%, skills are at -5%, -1 to strike, parry and dodge. Needles and fire can be inflicted for a total of one minute per level of experience of the enchanter. The magic spells or ritual magic will last as long as the normal duration for that particular spell. No more than two spells can be inflicted on the victim at any one time. The initial bonding ritual requires 80 P.P.E. plus the P.P.E. cost of whichever invocation is being cast on the victim. The mystic assault happens as soon as the spell is finished and will last the usual length of that spell. Shortly after the spell is cast the bonding magic becomes too weak to transmit other magic. However, the link between the living person and the doll continues to exist. The mystic can bring the bonding magic back up to full power (and be able to inflict more magic on its victim) by repeating the bonding incantation and spending 40 P.P.E. points. Each renewal provides the sorcerer with the opportunity to inflict more magic on his victim or one minute per level of experience to use needles or fire on the doll. Remember, no more than two spells/invocations can be used on a person at any given time. Consequently, if the victim is still under the effect of an invocation, only one new one can be cast upon him. The victim always gets to save vs each magic spell. A successful save means it has no effect; try again.',
  magic_wizard_control_enslave_entity:
    'Another incantation used to control supernatural forces. This magic does not summon entities, but does enable the mage to control them when encountered. The arcanist can control two entities per level of experience. All varieties of entities are susceptible to this enchantment. Each individual entity gets to make a saving throw vs magic. A successful save means it is not controlled by the arcanist. A failed roll means it will obey the sorcerer to the best of its ability (some are barely intelligent). At the end of its mandatory service to the sorcerer, the mage can try to renew his control by using the invocation again, banish the creature, or simply let his control slip away. The latter can be dangerous, because the evil beings may turn on the mage to extract vengeance or just out of spite. On the other hand, the more intelligent types may willingly agree to work with the sorcerer, especially an evil one, if it will help the diabolical being in its own schemes to inflict pain and suffering.',
  magic_wizard_curse_paranoia:
    'This curse inflicts extreme paranoia on its victim. The poor individual will become convinced that he can trust or believe no one, regardless of past friendships. The afflicted character will see everybody as sinister and treacherous beings, probably associated with supernatural evil. They all covet his possessions, knowledge or death. Any act of aggression toward the paranoid will convince him of treachery and he will react in kind. General reactions will include secretiveness, hiding data and items of importance, staying aloof and alone, lying, and an immediate, hostile counter-response to any perceived threats.',
  magic_wizard_metamorphosis_superior:
    'The incantation enables the spell caster to transform himself into any real, living creature, animal, human, supernatural or insect. The usual limitations and abilities still apply. The mage can also transform himself to resemble a supernatural creature, but does not possess any of its power and abilities. A person other than the sorcerer can be transformed, but a lengthy ritual magic must be performed to do so. The individual will remain in metamorphosed form until the spell\'s duration elapses or the mage who invoked it cancels it.',
  magic_wizard_summon_control_rodents:
    'This pentacle of summoning produces an army of mice or rats that obey the will of the sorcerer who summoned them. As long as the mage stands in the pentagram he can control any other types of rodents. Note: Familiars are not affected. The sorcerer can summon 30 rodents per level of experience. Mice and rat bites inflict one point of damage each. Mice have one attack per melee, rats have two. All are +1 to dodge and are excellent climbers.',
  magic_wizard_summon_nightlands_denizen:
    'This ritual summons to Earth a Nightland creature of the caster\'s choice, limited to Hounds, Hunters and Dopplegangers. The Doppleganger of a living person, if one exists (Game Masters\' choice or 20% chance) can be summoned in this manner. This ritual does not provide any means to control the summoned creature, so the sorcerer must be prepared to deal with the newcomer in some other way. When the duration of the spell elapses, the creature is sent back to its homeland.',
  magic_wizard_wards:
    'The ward\'s invocation creates mystic symbols used to protect items of value, to protect dwellings, and as booby traps. The ward can be cast on a door or window, a section of floor, a cabinet or on a specific item, such as a book or statue. The ward symbols on the object are always obvious, to serve as a warning. When somebody other than the sorcerer who created them touches the object, a spell is triggered. The following wards can be created. Each ward invocation will create two separate wards, the ritual invocation will create three. The object to be warded must be present. After a ward has been triggered, its magic is used up and it disappears. A ward can last for centuries if left undisturbed. The life span of the ward is 150 years per level of the arcanist.',
};

const MINOR_CURSE_PROFILES = [
  {
    name: 'Fever',
    description: 'Fever ranges from 99 to 102 degrees; victim feels drained, tired, and uncomfortable.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      globalSkillModifier: { value: -5 },
      combatModifiers: { initiative: -2 },
      statAdjustments: {
        spd: { kind: 'multiplier', value: 0.75, rounding: 'floor' },
        pe: { kind: 'multiplier', value: 0.75, rounding: 'floor' },
      },
    },
  },
  {
    name: 'Gas',
    description: 'Some indigestion and nausea, bloated feeling. Farts once every two melees.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      combatModifiers: { initiative: -2, notes: 'Sneak attacks and prowls are impossible.' },
    },
  },
  {
    name: 'Headache',
    description: 'Dull, throbbing headache; sleep and concentration are difficult.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      globalSkillModifier: { value: -10 },
      combatModifiers: { notes: 'All saving throws are -1 (lack of focus).' },
    },
  },
  {
    name: 'Hiccups',
    description: 'Annoying; interrupts speaking constantly.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      statAdjustments: { ma: { kind: 'multiplier', value: 0.5, rounding: 'floor' } },
      combatModifiers: { notes: 'Language skills -15%. Prowl impossible. Spells can still be cast with little difficulty.' },
    },
  },
  {
    name: 'Ingrown Toenail',
    description: 'Painful to walk; victim limps.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      statAdjustments: { spd: { kind: 'multiplier', value: 0.66, rounding: 'floor' } },
      combatModifiers: { notes: 'Prowl is -10%, Climb is -15%.' },
    },
  },
  {
    name: 'Itching and Rash',
    description: 'Very uncomfortable; almost maddening itch relieved only by scratching.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      statAdjustments: { ma: { kind: 'multiplier', value: 0.5, rounding: 'floor' } },
      combatModifiers: { initiative: -4, attacksPerMelee: -1 },
    },
  },
  {
    name: 'Pimples',
    description: 'Dozens of pimples break out all over the face and arms.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      statAdjustments: { pb: { kind: 'multiplier', value: 0.5, rounding: 'floor' } },
    },
  },
  {
    name: 'Nausea',
    description: 'Stomach ache, loose bowels and vomiting slow this poor victim down.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      statAdjustments: { spd: { kind: 'multiplier', value: 0.5, rounding: 'floor' } },
      combatModifiers: {
        notes:
          'Running faster has a 50% chance of vomiting. Sudden movements, bumpy rides, or high speed chases (50 mph/80 kmph or faster) have a 60% chance of inducing vomiting or diarrhea. While vomiting: -6 strike/parry/dodge, no initiative.',
      },
    },
  },
  {
    name: 'Runny Nose and Cough',
    description: 'Nagging constant cough, watering eyes and runny nose.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      statAdjustments: { pb: { kind: 'multiplier', value: 0.75, rounding: 'floor' } },
      combatModifiers: { notes: 'Prowling and sneak attacks are impossible. Spell casting is unimpaired.' },
    },
  },
  {
    name: 'Vertigo',
    description: 'Character gets dizzy when running, during high speed chases, or when exposed to heights.',
    save: { summary: 'Standard', saveKind: 'standard' },
    inflictedModifiers: {
      combatModifiers: {
        notes:
          'When vertigo hits (speeds higher than 8, chases 50 mph/80 kmph or faster, or heights above 10 ft/3.0 m): 1 attack per melee, no initiative, -8 strike/parry/dodge.',
      },
    },
  },
];

const WARD_PROFILES = [
  {
    name: 'Alarm',
    description: 'A screeching, siren-like noise is instantly sounded and continues to blare for ten minutes. Easily heard through closed doors up to 100 ft (30.5 m) away.',
    duration: { summary: '10 minutes', kind: 'minute', durationValue: 10 },
  },
  {
    name: 'Fear',
    description: 'An aura of fear engulfs everybody within a 20 foot (6.1 m) area of the ward. Effects are identical to the second level fear invocation.',
    save: { summary: 'Save vs Horror Factor 16', saveKind: 'horror_factor', targetNumber: 16 },
    horrorFactor: 16,
  },
  {
    name: 'Fire Bolt',
    description: 'The person touching the item is struck by a fire bolt causing 6D6 damage; no saving throw is applicable. Same as the fourth level invocation.',
    damage: { formula: '6D6' },
  },
  {
    name: 'Paralysis (lesser)',
    description: 'The ward temporarily paralyses the person\'s hand and arm for 1D4 hours. Effects are identical to the third level invocation.',
    duration: { summary: '1D4 hours', kind: 'hour', durationValue: '1D4' },
    inflictedModifiers: { statusEffects: ['paralyzed'] },
  },
  {
    name: 'Sleep',
    description: 'The ward will put to sleep everybody within 10 foot (3.0 m) of it. Each person must roll to save versus magic. As per the fifth level spell.',
    duration: { summary: '6D6 minutes', kind: 'minute', durationValue: '6D6' },
    inflictedModifiers: { statusEffects: ['asleep'] },
  },
  {
    name: 'Agony',
    description: 'The person who touches the object is racked with agony for 2D8 melees. Effects are identical to the seventh level invocation.',
    duration: { summary: '2D8 melees', kind: 'melee_round', durationValue: '2D8' },
    inflictedModifiers: { statusEffects: ['writhing in agony'] },
  },
  {
    name: 'Curse (minor)',
    description: 'Inflicts a minor curse identical to the eighth level invocation except that it will linger for 1D6 weeks.',
    duration: { summary: '1D6 weeks', kind: 'week', durationValue: '1D6' },
  },
  {
    name: 'Curse (phobia)',
    description: 'Inflicts a phobia curse identical to the ninth level spell except that it will linger for 1D4 weeks.',
    duration: { summary: '1D4 weeks', kind: 'week', durationValue: '1D4' },
  },
  {
    name: 'Banishment',
    description:
      'Instantly forces lesser supernatural beings from the area, just like the tenth level invocation. Plus, the creature must leave the object where it rests. Counts as two wards.',
  },
];

const PATCHES = {
  magic_wizard_apparition: {
    notes: 'Destroy with iron rod, successful save, or duration lapse. Imaginary damage disappears when illusion ends.',
    spawnedPresence: {
      kind: 'construct',
      name: 'Apparition',
      notes: 'Illusionary creature that sweats and bleeds; cannot be killed. Opponent who "dies" falls unconscious.',
    },
  },
  magic_wizard_fire_ball: {
    save: {
      summary: 'Dodge (must know attack is coming; roll 18 or higher).',
      saveKind: 'dodge',
      targetNumber: 18,
    },
  },
  magic_wizard_impervious_to_energy: {
    notes: 'Self or others by ritual. Physical attacks still do normal damage.',
  },
  magic_wizard_mask_of_deceit: {
    notes: 'Facial features only. Imitate specific person at 20% +5% per level (or disguise skill). Onlookers save at -4.',
  },
  magic_wizard_memory_bank: {
    limitations: {
      otherLimitations: 'Data under 100 words. Mind block prevents implant or retrieval. No limit on banks per person.',
    },
  },
  magic_wizard_ritual_call_nightlord: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    ritualProfile: {
      craftingDuration: { summary: '1 hour', kind: 'hour', durationValue: 1 },
    },
    notes: 'Very rare outside the Cults of Night. Two versions: nearest Nightlord/avatar, or one specific Ba\'al/avatar.',
  },
  magic_wizard_teleport_lesser: {
    resolutionTable: {
      rollKind: 'd100',
      label: 'Lesser Teleport Accuracy',
      resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
      entries: [
        {
          percentile: { min: 1, max: 80 },
          label: 'Success',
          effect: 'Object arrives on target. Base 80% +2% per level of experience (adjust upper bound by level).',
        },
        {
          percentile: { min: 81, max: 100 },
          label: 'Failure',
          effect: 'Object never arrives where intended and could be anywhere within the mage\'s range.',
        },
      ],
    },
    notes: 'Success ratio is 80% +2% per level of experience.',
    limitations: {
      otherLimitations: 'Non-living matter only; up to 50 lbs (22.5 kg). Mage must touch object and know destination.',
    },
  },
  magic_wizard_time_slip: {
    notes: 'Mage cannot physically hurt living creatures during the seven-second slip. Others lose two attacks that melee round.',
  },
  magic_wizard_words_of_truth: {
    notes: 'Enchanted person makes a separate saving throw for each question asked.',
  },
  magic_wizard_agony: {
    notes: 'Only one person per invocation. Second minute of recovery: attacks and speed halved, -1 strike/parry/dodge.',
  },
  magic_wizard_invisibility_superior: {
    grantedModifiers: {
      target: 'touch',
      immunities: ['infrared', 'ultraviolet', 'heat sensors', 'motion detectors', 'scent tracking'],
      grantedSkills: [
        {
          name: 'Prowl',
          basePercentage: '84%',
          notes: 'No footprints. Broken by hostile move, combat, or attack.',
        },
      ],
    },
  },
  magic_wizard_life_drain: {
    notes: 'Levels 1–3: one target. Level 4+: may affect 15 ft (4.6 m) area. Weakness lingers six hours after spell ends.',
    inflictedModifiers: {
      statusEffects: ['weakened'],
      statAdjustments: {
        sdc: { kind: 'multiplier', value: 0.5, rounding: 'floor' },
        hp: { kind: 'multiplier', value: 0.5, rounding: 'floor' },
      },
      combatModifiers: {
        attacksPerMelee: -1,
        speedMultiplier: 0.5,
        notes: 'S.D.C. recovers 8/hour; H.P. 4/hour after duration. Reduced speed and weakness remain six hours.',
      },
      globalSkillModifier: { value: -10 },
    },
  },
  magic_wizard_metamorphosis_animal: {
    formTransformation: {
      mode: 'sheet_replacement',
      targetTemplateId: 'animal_form',
      masksCharacterSheet: true,
      preservedAspects: ['iq', 'memory', 'sdc', 'hp'],
      notes: 'Retains ability to speak. Returns to human form naked at will. Use Monsters & Animals tables for natural attacks and speeds.',
    },
    notes: 'Self or other by ritual.',
  },
  magic_wizard_purification_food_water: {
    notes: 'Purifies up to 50 lbs (22.5 kg) of food or 10 gallons of water/fluids.',
  },
  magic_wizard_ritual_an_eye_for_an_eye: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    ritualProfile: {
      craftingDuration: { summary: '1 minute (4 melee rounds)', kind: 'minute', durationValue: 1 },
    },
  },
  magic_wizard_second_sight: {
    notes: 'Requires prior meeting. Mind block prevents use. Vision shows true events only; cannot be altered.',
  },
  magic_wizard_wind_rush: {
    inflictedModifiers: {
      statusEffects: ['knocked down', 'helpless'],
      combatModifiers: {
        notes: 'Helpless and unable to attack or move forward. 1 melee to recover balance; 1D8 melees to gather blown items.',
      },
    },
  },
  magic_wizard_hallucination: {
    notes: 'Mind block adds +3 bonus to save vs hallucinations.',
  },
  magic_wizard_locate: {
    resolutionTable: {
      rollKind: 'd100',
      label: 'Locate Success',
      resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
      entries: [
        {
          percentile: { min: 1, max: 41 },
          label: 'Success (Spell)',
          effect: 'Sense the general location of the quarry.',
        },
        {
          percentile: { min: 42, max: 100 },
          label: 'Failure',
          effect: 'Location remains unknown.',
        },
      ],
    },
    notes: 'Ritual version has 89% success and requires an object owned by the person, hair, fingernail clippings, or dried blood.',
  },
  magic_wizard_luck_curse: {
    inflictedModifiers: {
      statusEffects: ['cursed with bad luck'],
      combatModifiers: {
        notes:
          'Bonuses to strike, parry, dodge, initiative, and roll with punch reduced to zero. Natural 20 criticals still double damage. Death/knockout punch does 1D4. Kick attacks 60% chance to trip.',
      },
      globalSkillModifier: { value: -40, notes: 'Penalty applies only during critical situations.' },
    },
    notes: 'Only remove curse can negate before duration elapses.',
  },
  magic_wizard_metamorphosis_human: {
    formTransformation: {
      mode: 'sheet_replacement',
      targetTemplateId: 'human_disguise',
      masksCharacterSheet: false,
      notes:
        'Appearance only; retains voice, memory, skills, and attributes. Nightbane Morphus immune — Facade only. Impersonation success: disguise skill +20%.',
    },
    notes: 'Self, or other by ritual. Ritual can duplicate another person exactly.',
  },
  magic_wizard_minor_curse: {
    effectProfiles: MINOR_CURSE_PROFILES,
    notes: 'Remove curse or wait for duration. Negation has 25% chance of success.',
  },
  magic_wizard_negation_of_magic: {
    save: {
      summary: 'Special — roll save against the magic to negate (12–15 depending on caster level).',
      saveKind: 'special',
    },
    notes: '25% chance vs curses if save succeeds. No effect on possession, circles, wards, summoning, healing, psychic abilities, or Nightspawn talents.',
  },
  magic_wizard_nightlands_portal: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    ritualProfile: {
      craftingDuration: { summary: 'One hour', kind: 'hour', durationValue: 1 },
    },
    notes: 'Opens corresponding location in Nightlands or Earth. Anybody may cross while gate is open.',
  },
  magic_wizard_sickness: {
    ppe: { baseActivation: 50 },
    inflictedModifiers: {
      statusEffects: ['sick'],
      globalSkillModifier: { value: -40 },
      statAdjustments: {
        pe: { kind: 'multiplier', value: 0.3, rounding: 'floor' },
        attacks_per_melee: { kind: 'override', value: 1 },
      },
      combatModifiers: { strike: -4, parry: -4, dodge: -4, notes: 'No initiative. Victim cannot die from magic sickness.' },
    },
  },
  magic_wizard_spoil_water_food: {
    notes: 'Spoils 50 lbs (22.5 kg) food or two gallons (37.9 liters) of water/fluids.',
  },
  magic_wizard_temporary_enchantment: {
    ppe: { baseActivation: 70 },
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    save: {
      summary: 'Standard; weapon rolls save (+1 archaic missile weapon, +3 high-tech weapon).',
      saveKind: 'standard',
    },
    grantedModifiers: {
      target: 'touch',
      combatModifiers: {
        damageMultiplier: 2,
        damageCondition: 'against supernatural beings; normal damage vs beings normally immune to weapons',
      },
    },
    notes: 'Missile weapons extend enchantment to ammunition fired.',
  },
  magic_wizard_curse_phobia: {
    notes: 'Remove curse is 100% cure; negation 25% chance. Caster can cancel at any time.',
  },
  magic_wizard_familiar_link: {
    permanentCosts: [
      {
        resource: 'hp_max',
        reduction: { kind: 'fixed', value: 10 },
        trigger: 'on_success',
        notes: 'Permanent loss if the familiar is killed. 50% chance of 1D6 hour coma. Cannot retry for 6 months.',
      },
    ],
    grantedModifiers: {
      target: 'self',
      statModifiers: { hp: 6 },
    },
    notes:
      'Sympathetic damage: master takes same damage as familiar even miles apart. Telepathic range 600 ft (183 m). Max familiar size 25 lb (11 kg). Mage and familiar each gain +6 hit points.',
    limitations: {
      otherLimitations:
        'Requires 3rd level practitioner. Familiar types: cats, dogs, coyotes, foxes, weasels, rodents, birds, lizards, snakes.',
    },
  },
  magic_wizard_metamorphosis_insect: {
    formTransformation: {
      mode: 'sheet_replacement',
      targetTemplateId: 'insect_form',
      masksCharacterSheet: true,
      preservedAspects: ['iq', 'memory', 'sdc', 'hp'],
      notes: 'Half inch to six inches. Cannot speak or cast magic as insect. Returns naked at will.',
    },
    notes: 'Self, or others through ritual magic.',
  },
  magic_wizard_protection_circle_simple: {
    magicKind: 'circle',
    notes:
      'Requires drawing circle and symbols. 4 P.P.E. to reactivate. Damaged circles must be recreated. Lesser supernatural kept 5 ft away; +2 save vs magic/psionics inside.',
  },
  magic_wizard_summon_and_control_canine: {
    magicKind: 'summoning',
    isRitual: true,
    spellStrengthBase: 16,
    spawnedPresence: {
      kind: 'creature',
      catalogRaceId: 'npc_canine',
      countFormula: '1D4',
      notes: 'Plus 1 additional canine per level. Pentacle required. Control other canines within 200 ft while in pentacle.',
    },
    notes: 'Summoned canines obey in and out of pentagram for duration, then leave.',
  },
  magic_wizard_banishment: {
    notes:
      'One lesser supernatural being per caster level within 600 ft (183 m). Ritual save needs 16+. Works on Hounds, Hunters, Ashmedai — not Nightbane, Guardians, Nightprinces, avatars, or Nightlords.',
  },
  magic_wizard_bind_nightbane: {
    notes:
      'Rare brotherhood spell. Can trap, expel, paralyze (save each melee), or force Morphus/Facade form. Victim saves every melee to break paralysis.',
  },
  magic_wizard_bonding: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    materialComponents: {
      label: 'Effigy Materials',
      entries: [
        {
          label: 'Clay, straw, or rag doll',
          quantity: { kind: 'fixed', value: 1 },
          unit: 'each',
          consumption: 'reusable_tool',
        },
        {
          label: 'Lock of hair or fingernail clippings from victim',
          quantity: { kind: 'fixed', value: 1 },
          unit: 'dose',
          consumption: 'destroyed',
        },
      ],
    },
    ritualProfile: {
      materialComponents: {
        label: 'Effigy Materials',
        entries: [
          {
            label: 'Clay, straw, or rag doll',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'each',
            consumption: 'reusable_tool',
          },
          {
            label: 'Lock of hair or fingernail clippings from victim',
            quantity: { kind: 'fixed', value: 1 },
            unit: 'dose',
            consumption: 'destroyed',
          },
        ],
      },
    },
    notes:
      'Victim\'s true name required. Non-energy spells affect doll-linked victim. Renewal costs 40 P.P.E. Max two concurrent spells on victim.',
  },
  magic_wizard_control_enslave_entity: {
    notes: 'Controls two entities per level when encountered (does not summon). Service may be renewed, or creature may turn on mage.',
  },
  magic_wizard_metamorphosis_superior: {
    formTransformation: {
      mode: 'sheet_replacement',
      targetTemplateId: 'superior_form',
      masksCharacterSheet: true,
      preservedAspects: ['iq', 'memory', 'sdc', 'hp'],
      notes: 'Any real living creature. Supernatural appearance only — no supernatural powers unless inherent to chosen form.',
    },
    notes: 'Self, or others by ritual only. Unwilling victims save vs magic.',
  },
  magic_wizard_summon_control_rodents: {
    magicKind: 'summoning',
    isRitual: true,
    spellStrengthBase: 16,
    spawnedPresence: {
      kind: 'creature',
      catalogRaceId: 'npc_rodent',
      countFormula: '30 per level of experience',
      notes: 'Pentacle required. Control other rodents within 600 ft while standing in pentagram. Familiars not affected.',
    },
  },
  magic_wizard_summon_nightlands_denizen: {
    magicKind: 'ritual',
    isRitual: true,
    spellStrengthBase: 16,
    spawnedPresence: {
      kind: 'creature',
      label: 'Nightlands denizen (Hound, Hunter, or Doppleganger)',
      notes:
        'Caster\'s choice. Doppleganger of living person possible (GM choice or 20%). No built-in control; creature returns when duration elapses.',
    },
    notes: 'Does not provide control — sorcerer must deal with summoned creature by other means.',
  },
  magic_wizard_wards: {
    effectProfiles: WARD_PROFILES,
    notes: 'Spell creates two wards; ritual creates three. Ward lifespan 150 years per caster level until triggered.',
  },
};

export function buildNightbaneL6to10Spells() {
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

if (process.argv[1] && process.argv[1].endsWith('build_nightbane_l6_10_spells.mjs')) {
  const patchPath = join(root, 'scripts/_nightbane_l6_10_patch.json');
  const extractPath = join(root, 'scripts/_nb_spells_l6_10_extract.txt');

  const spells = buildNightbaneL6to10Spells();
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
