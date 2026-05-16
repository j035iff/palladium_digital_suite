import type { Character } from '../../types'
import {
  occPsychicGateBypassed,
  occStartingRelatedSkillIds,
} from '../../lib/occCatalogEngine'
import {
  getLibraryOccById,
  resolveOccXpTable,
  snapshotLibraryOcc,
} from '../library'

const sorcererOcc = getLibraryOccById('nightbane_sorcerer')!

/** Level 3 Nightbane Sorcerer — universal schema stress test. */
export const nightbaneSorcererMock: Character = {
  name: 'Kael Thorn',
  level: 3,
  xp: 4200,
  ppe: { current: 42, maximum: 48 },
  occ: snapshotLibraryOcc(sorcererOcc, resolveOccXpTable(sorcererOcc)),
  raceId: 'nightbane',
  lineage: 'nightbane',
  psychicGateBypassed: occPsychicGateBypassed(sorcererOcc),
  occSkillSlotBudget: sorcererOcc.progression?.occSkillSlotBudget,
  occRelatedSkillSlotBudget: sorcererOcc.progression?.occRelatedSkillSlotBudget,
  creationOccSkillIds: sorcererOcc.occSkillsCore.map((s) => s.skillId),
  creationRelatedSkillIds: occStartingRelatedSkillIds(sorcererOcc),
  selectedAbilities: [
    'leathery_wings',
    'razor_hide',
    'energy_bolt',
    'armor_ithan',
    'fireball',
    'mind_block',
    'telekinesis',
  ],
  creationAbilityBudget: sorcererOcc.progression?.creationAbilityBudget,
  startingSpellLevelCap: sorcererOcc.progression?.startingSpellLevelCap,
  isFinalized: true,
  creationVitalityCommitted: true,
  facade: {
    alignment: 'Unprincipled',
    hitPoints: { current: 14, maximum: 18, scaling: 'sdc_hp' },
    structuralDamageCapacity: {
      current: 22,
      maximum: 24,
      scaling: 'sdc_hp',
    },
    isp: { current: 0, maximum: 0 },
    attributes: {
      iq: 13,
      me: 12,
      ma: 10,
      ps: { score: 11, tier: 'standard' },
      pp: 14,
      pe: 12,
      pb: 12,
      spd: 11,
    },
    skills: [
      { id: 'literacy', name: 'Literacy: American', restricted: false, basePercent: 30 },
    ],
  },
  morphus: {
    alignment: 'Miscreant',
    hitPoints: { current: 28, maximum: 36, scaling: 'mdc' },
    structuralDamageCapacity: {
      current: 44,
      maximum: 56,
      scaling: 'mdc',
    },
    isp: { current: 18, maximum: 22 },
    attributes: {
      iq: 14,
      me: 16,
      ma: 8,
      ps: { score: 22, tier: 'supernatural' },
      pp: 17,
      pe: 18,
      pb: 6,
      spd: 20,
    },
    skills: [
      {
        id: 'hand_to_hand_basic',
        name: 'Hand to Hand: Basic',
        restricted: false,
        basePercent: 26,
      },
    ],
  },
}
