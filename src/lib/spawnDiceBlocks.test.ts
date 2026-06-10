import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import {
  buildPendingDiceBlocks,
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
    expect(sdc?.groups.find((g) => g.kind === 'occ')?.display).toBe('1D4x10+2D6')
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
    const rollId = ppe.groups[0]?.rolls[1]?.id
    expect(ppe.flatBaseline).toBe(120)
    expect(
      pendingDiceBlockRunningTotal(ppe, {
        [rollId!]: 7,
      }),
    ).toBe(127)
  })
})
