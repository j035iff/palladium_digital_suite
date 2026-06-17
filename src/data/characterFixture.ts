import type { Character } from '../types'
import { getOccById, snapshotOccForCharacter } from './occDefinitions'

const demoOcc = snapshotOccForCharacter(getOccById('occ_ex_government_agent')!)

/**
 * Demo sheet — structure must satisfy {@link Character}.
 */
export const characterFixture: Character = {
  name: 'Alex Mercer',
  /** Demo defaults — launcher / saves supply authoritative genre stamps. */
  level: 3,
  xp: 4200,
  ppe: { current: 28, maximum: 32 },
  occ: demoOcc,
  raceId: 'race_human',
  occSkillSlotBudget: 8,
  occRelatedSkillSlotBudget: 10,
  /** Demo human — single Facade form; Nightbane-only UI uses {@link Character.lineage} `nightbane`. */
  lineage: 'megaversal',
  psychicGateBypassed: true,
  isFinalized: false,
  creationVitalityCommitted: false,
  creationOccSkillIds: [
    'skill_intelligence',
    'skill_surveillance_systems',
    'skill_prowl',
    'skill_computer_operation',
    'skill_radio_basic',
    'skill_cryptography',
  ],
  creationRelatedSkillPicks: [
    { instanceId: 'skill_electronics', skillId: 'skill_electronics' },
    { instanceId: 'skill_wp_handguns', skillId: 'skill_wp_handguns' },
  ],
  selectedAbilities: ['energy_bolt'],
  creationAbilityBudget: {
    spellSlots: 0,
    psionicSlots: 0,
    talentSlots: 0,
  },
  primary: {
    alignment: 'Scrupulous',
    hitPoints: { current: 12, maximum: 18, scaling: 'sdc_hp' },
    structuralDamageCapacity: {
      current: 10,
      maximum: 12,
      scaling: 'sdc_hp',
    },
    isp: { current: 0, maximum: 0 },
    attributes: {
      iq: 12,
      me: 10,
      ma: 11,
      ps: { score: 10, tier: 'standard' },
      pp: 12,
      pe: 11,
      pb: 14,
      spd: 10,
    },
    skills: [
      { id: 'skill_literacy', name: 'Literacy', restricted: false, basePercent: 30 },
      {
        id: 'skill_mech_eng',
        name: 'Mechanical Engineering',
        restricted: true,
        restrictionReason:
          'AND gate unmet (skill_selection.md): requires Literacy AND Electronics. Add Electronics to unlock.',
      },
      {
        id: 'occ_only',
        name: 'Cybernetic Surgery (O.C.C. only)',
        restricted: true,
        restrictionReason:
          'Tagged O.C.C. only — not valid as a secondary for this build (skill_selection.md §1).',
      },
    ],
  },
  morphus: {
    alignment: 'Miscreant',
    hitPoints: { current: 45, maximum: 80, scaling: 'mdc' },
    structuralDamageCapacity: {
      current: 120,
      maximum: 200,
      scaling: 'mdc',
    },
    isp: { current: 8, maximum: 44 },
    attributes: {
      iq: 14,
      me: 16,
      ma: 8,
      ps: { score: 24, tier: 'supernatural' },
      pp: 18,
      pe: 20,
      pb: 6,
      spd: 22,
    },
    skills: [
      { id: 'skill_climbing', name: 'Climbing', restricted: false, basePercent: 26 },
      {
        id: 'mech_eng',
        name: 'Mechanical Engineering',
        restricted: true,
        restrictionReason:
          'OR gate unmet (skill_selection.md): needs Math: Basic OR Math: Advanced before engineering skills apply.',
      },
    ],
  },
}
