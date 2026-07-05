import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import {
  buildPendingDiceBlocks,
  filterPendingDiceBlocksByScope,
  flattenPendingDiceRolls,
  pendingDiceBlockRunningTotal,
} from './spawnDiceBlocks'

describe('spawnDiceBlocks', () => {
  it('mirrors S.D.C. ledger dice groups for P.A.B. Psychic Agent skills', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationOccSkillIds: [],
      creationRelatedSkillPicks: [],
      creationSecondarySkillPicks: [
        { instanceId: 'a', skillId: 'skill_athletics_general' },
        { instanceId: 'b', skillId: 'skill_running' },
        { instanceId: 'c', skillId: 'skill_wrestling' },
      ],
    }
    const blocks = buildPendingDiceBlocks(character, human, occ, {
      psychicTier: 'major',
    })
    const sdc = blocks.find((block) => block.id === 'sdc')
    expect(sdc?.groups.find((g) => g.kind === 'race')?.display).toBe('1D4x10')
    expect(sdc?.groups.find((g) => g.kind === 'occ')?.display).toBe('2D6')
    expect(sdc?.groups.find((g) => g.kind === 'skills')?.display).toBe('1D8 + 5D6')
  })

  it('lists Athletics (general) Spd dice on the Review attribute block', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationAttributeAssignments: { spd: 14 },
      creationOccSkillIds: [],
      creationRelatedSkillPicks: [],
      creationSecondarySkillPicks: [
        { instanceId: 'ath', skillId: 'skill_athletics_general' },
      ],
    }
    const blocks = buildPendingDiceBlocks(character, human, occ, {
      psychicTier: 'major',
    })
    const spd = blocks.find((block) => block.id === 'attr_spd')
    expect(spd?.flatBaseline).toBe(14)
    const skillRoll = spd?.groups
      .find((g) => g.kind === 'skills')
      ?.rolls.find((r) => r.notation === '1D6')
    expect(skillRoll?.source).toBe('Athletics (general)')
    expect(
      flattenPendingDiceRolls(blocks).some(
        (roll) => roll.source === 'Athletics (general)' && roll.notation === '1D6',
      ),
    ).toBe(true)
  })

  it('lists post-strip O.C.C. Spd dice for P.A.B. Psychic Agent', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationAttributeAssignments: { spd: 11 },
      creationSecondarySkillPicks: [],
    }
    const blocks = buildPendingDiceBlocks(character, human, occ, {
      psychicTier: 'major',
    })
    const spd = blocks.find((block) => block.id === 'attr_spd')
    expect(spd?.groups.find((g) => g.kind === 'occ')?.rolls[0]?.notation).toBe('1D6')
  })

  it('orders Review dice blocks as Attributes, HP, SDC, PPE, ISP', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationAttributeAssignments: { spd: 14 },
      creationSecondarySkillPicks: [
        { instanceId: 'ath', skillId: 'skill_athletics_general' },
      ],
    }
    const blocks = buildPendingDiceBlocks(character, human, occ, {
      psychicTier: 'major',
    })
    const ids = blocks.map((block) => block.id)
    const attrIndex = ids.findIndex((id) => id.startsWith('attr_'))
    const hpIndex = ids.indexOf('hp')
    const sdcIndex = ids.indexOf('sdc')
    const ppeIndex = ids.indexOf('ppe')
    const ispIndex = ids.indexOf('isp')
    expect(attrIndex).toBeGreaterThanOrEqual(0)
    expect(hpIndex).toBeGreaterThan(attrIndex)
    expect(sdcIndex).toBeGreaterThan(hpIndex)
    expect(ppeIndex).toBeGreaterThan(sdcIndex)
    expect(ispIndex).toBeGreaterThan(ppeIndex)
  })

  it('updates running total from flat baseline plus entered rolls', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const blocks = buildPendingDiceBlocks(
      {
        ...characterFixture,
        creationAttributeAssignments: { pe: 12 },
      },
      human,
      {
        ...occ!,
        ppeEngine: {
          baseFormula: 'PEx10 + 2D6',
          perLevelFormula: '1D6',
          progressionRoadmap: [],
        },
      },
      { psychicTier: 'major' },
    )
    const ppe = blocks.find((block) => block.id === 'ppe')!
    const occRoll = ppe.groups
      .find((group) => group.kind === 'occ')
      ?.rolls.find((roll) => roll.notation === '2D6')
    expect(ppe.flatBaseline).toBe(120)
    expect(
      pendingDiceBlockRunningTotal(ppe, {
        [occRoll!.id]: 7,
      }),
    ).toBe(127)
  })

  it('does not double Nightbane P.P.E. dice when O.C.C. already defines the formula', () => {
    const nightbane = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const blocks = buildPendingDiceBlocks(
      { ...characterFixture, creationAttributeAssignments: { pe: 12 } },
      nightbane,
      occ,
      { psychicTier: 'none', supportsDualForm: true },
    )
    const ppe = blocks.find((block) => block.id === 'ppe')!
    const diceRolls = ppe.groups.flatMap((group) => group.rolls)
    expect(diceRolls).toHaveLength(2)
    expect(diceRolls.map((roll) => roll.notation)).toEqual(['3D6x10', '3D6'])
    expect(ppe.hint).toBe('O.C.C.: 3D6x10 (+3D6/level)')
    expect(ppe.flatBaseline).toBe(32)
  })

  it('includes morphus trait S.D.C. dice on the morphus pending block', () => {
    const nightbane = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const blocks = buildPendingDiceBlocks(
      {
        ...characterFixture,
        creationAttributeAssignments: { pe: 12 },
        morphusTraitSlotResolutions: [
          {
            slotId: 'plan:0',
            catalogEntryId: 'animal_arachnid_full',
          },
        ],
      },
      nightbane,
      occ,
      { psychicTier: 'none', supportsDualForm: true },
    )
    const morphusSdc = blocks.find((block) => block.id === 'morphus_sdc')
    expect(morphusSdc).toBeDefined()
    const traitGroup = morphusSdc?.groups.find((group) => group.kind === 'traits')
    expect(traitGroup).toBeDefined()
    const rollNotations = traitGroup?.rolls.map((r) => r.notation) ?? []
    expect(rollNotations).toContain('3D6x10')
    expect(traitGroup?.rolls.find((r) => r.notation === '3D6x10')).toEqual(
      expect.objectContaining({ min: 30, max: 180 }),
    )
  })

  it('includes morphus trait attribute and H.F. dice on the review tab', () => {
    const nightbane = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const blocks = buildPendingDiceBlocks(
      {
        ...characterFixture,
        creationAttributeAssignments: { spd: 10 },
        morphusTraitSlotResolutions: [
          { slotId: 'plan:0', catalogEntryId: 'animal_arachnid_full' },
          { slotId: 'plan:1', catalogEntryId: 'stigmata_body_faces' },
        ],
      },
      nightbane,
      occ,
      { psychicTier: 'none', supportsDualForm: true },
    )
    const morphus = filterPendingDiceBlocksByScope(blocks, 'morphus')
    expect(morphus.some((block) => block.id === 'morphus_attr_spd')).toBe(true)
    expect(morphus.some((block) => block.id === 'morphus_hf')).toBe(true)
    const spdRoll = morphus
      .find((block) => block.id === 'morphus_attr_spd')
      ?.groups[0]?.rolls[0]
    expect(spdRoll?.notation).toBe('1D4x10')
    expect(spdRoll).toEqual(expect.objectContaining({ min: 10, max: 40 }))
  })

  it('splits trait dice flats into block baseline and dice-only rolls on Review', () => {
    const nightbane = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const blocks = buildPendingDiceBlocks(
      {
        ...characterFixture,
        creationAttributeAssignments: { pe: 12 },
        morphusTraitSlotResolutions: [
          { slotId: 'plan:0', catalogEntryId: 'mythical_creature_cyclops' },
        ],
      },
      nightbane,
      occ,
      { psychicTier: 'none', supportsDualForm: true },
    )
    const morphusSdc = blocks.find((block) => block.id === 'morphus_sdc')!
    const cyclopsRoll = morphusSdc.groups
      .flatMap((group) => group.rolls)
      .find((roll) => roll.source === 'Cyclops/Giant')
    expect(cyclopsRoll?.notation).toBe('1D6x10')
    expect(cyclopsRoll).toEqual(expect.objectContaining({ min: 10, max: 60 }))
    expect(
      pendingDiceBlockRunningTotal(morphusSdc, {
        [cyclopsRoll!.id]: 40,
      }),
    ).toBe(morphusSdc.flatBaseline + 40)
    expect(morphusSdc.flatBaseline).toBeGreaterThanOrEqual(20)
  })

  it('splits facade and morphus pending dice blocks for dual-form builds', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const blocks = buildPendingDiceBlocks(characterFixture, human, occ, {
      supportsDualForm: true,
      psychicTier: 'major',
    })
    const primary = filterPendingDiceBlocksByScope(blocks, 'primary')
    const morphus = filterPendingDiceBlocksByScope(blocks, 'morphus')
    expect(primary.some((block) => block.id === 'hp')).toBe(true)
    expect(primary.some((block) => block.id.startsWith('morphus_'))).toBe(false)
    expect(morphus.map((block) => block.id)).toEqual(
      expect.arrayContaining(['morphus_hp', 'morphus_sdc', 'morphus_hf']),
    )
    const morphusHp = morphus.find((block) => block.id === 'morphus_hp')
    const morphusHpRolls = morphusHp?.groups.flatMap((group) => group.rolls) ?? []
    expect(morphusHpRolls).toHaveLength(1)
    expect(morphusHpRolls[0]?.notation).toBe('2D6')
  })
})
