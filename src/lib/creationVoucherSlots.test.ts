import { describe, expect, it } from 'vitest'

import type { PalladiumOcc } from '../types'
import {
  collectOpenCreationVoucherBookCategories,
  creationVoucherDisplayName,
  creationVoucherLibraryCategory,
  formatCreationVoucherScopeLabel,
  isCreationVoucherLibraryCategory,
  isSkillInCreationVoucherRefScope,
  listCreationVoucherTaskRefs,
  listLibraryCreationVoucherTaskRefs,
  listOpenCreationVoucherAddTargets,
  resolveCreationVoucherDisplayNumber,
  resolveCreationVoucherLibraryCategoryRef,
} from './creationVoucherSlots'

const highSchoolOcc = {
  id: 'occ_general_citizen',
  name: 'General Citizen',
  occSkillsCore: [],
  occRelatedSkills: {
    initialSlotsCount: 9,
    categoryRules: [],
    skillVouchers: [
      {
        id: 'related_domestic',
        choiceCount: 3,
        label: 'Three Domestic skills',
        allowedCategories: ['Domestic'],
      },
      {
        id: 'related_technical',
        choiceCount: 1,
        label: 'One Technical skill',
        allowedCategories: ['Technical'],
      },
    ],
  },
  specializations: [
    {
      id: 'high_school_educated',
      name: 'High School Educated',
      description: 'test',
      occRelatedSkills: {
        replaceBaseline: true,
        initialSlotsCount: 9,
        categoryRules: [],
        skillVouchers: [
          {
            id: 'related_domestic',
            choiceCount: 3,
            label: 'Three Domestic skills',
            allowedCategories: ['Domestic'],
          },
          {
            id: 'related_technical',
            choiceCount: 1,
            label: 'One Technical skill',
            allowedCategories: ['Technical'],
          },
        ],
      },
    },
  ],
} as unknown as PalladiumOcc

describe('creationVoucherSlots', () => {
  it('numbers high school domestic and technical vouchers in order', () => {
    const refs = listCreationVoucherTaskRefs(
      highSchoolOcc,
      'high_school_educated',
    )
    expect(refs).toHaveLength(2)
    expect(creationVoucherDisplayName(1)).toBe('Voucher 1')
    expect(creationVoucherLibraryCategory(1)).toBe('Voucher 1')
    expect(creationVoucherLibraryCategory(2)).toBe('Voucher 2')
    expect(isCreationVoucherLibraryCategory('Vouchers')).toBe(false)
    expect(isCreationVoucherLibraryCategory('Voucher 1')).toBe(true)
    expect(resolveCreationVoucherLibraryCategoryRef('Voucher 1', refs)?.task.id).toBe(
      'related_domestic',
    )
    expect(resolveCreationVoucherLibraryCategoryRef('Voucher 2', refs)?.task.id).toBe(
      'related_technical',
    )
    expect(resolveCreationVoucherLibraryCategoryRef('Vouchers', refs)).toBeUndefined()
    expect(resolveCreationVoucherDisplayNumber('related_domestic', refs)).toBe(1)
    expect(resolveCreationVoucherDisplayNumber('related_technical', refs)).toBe(2)
    expect(formatCreationVoucherScopeLabel(refs[0]!)).toBe('Three Domestic skills')
    expect(formatCreationVoucherScopeLabel(refs[1]!)).toBe('One Technical skill')
  })

  it('scopes library browse and add targets per voucher category', () => {
    const refs = listLibraryCreationVoucherTaskRefs(
      highSchoolOcc,
      'high_school_educated',
    )
    const voucher1 = resolveCreationVoucherLibraryCategoryRef('Voucher 1', refs)!
    const voucher2 = resolveCreationVoucherLibraryCategoryRef('Voucher 2', refs)!
    const catalogIds = ['skill_cook', 'skill_computer_operation']
    expect(
      isSkillInCreationVoucherRefScope(
        'skill_cook',
        voucher1,
        highSchoolOcc,
        'high_school_educated',
        {},
        {},
        {},
        'nightbane',
        catalogIds,
        [],
      ),
    ).toBe(true)
    expect(
      isSkillInCreationVoucherRefScope(
        'skill_cook',
        voucher2,
        highSchoolOcc,
        'high_school_educated',
        {},
        {},
        {},
        'nightbane',
        catalogIds,
        [],
      ),
    ).toBe(false)

    const targets = listOpenCreationVoucherAddTargets(
      'skill_cook',
      refs,
      {},
      {},
      {},
      highSchoolOcc,
      'high_school_educated',
      'nightbane',
      catalogIds,
      [],
      undefined,
      'related_domestic',
    )
    expect(targets).toEqual([
      {
        displayNumber: 1,
        taskId: 'related_domestic',
        slot: 0,
        choiceCount: 3,
        kind: 'related',
      },
    ])
  })

  it('lists only open voucher book categories', () => {
    const refs = listLibraryCreationVoucherTaskRefs(
      highSchoolOcc,
      'high_school_educated',
    )
    const open = collectOpenCreationVoucherBookCategories(
      refs,
      {},
      {},
      {},
      'nightbane',
      ['skill_cooking'],
      [],
    )
    expect(open.has('Domestic')).toBe(true)
    expect(open.has('Technical')).toBe(true)
    expect(open.has('Pilot')).toBe(false)
  })

  it('maps W.P. vouchers to WP library filter categories', () => {
    const wpOcc = {
      id: 'occ_wp_test',
      occSkillsCore: [
        {
          choiceCount: 1,
          bonusPercent: 0,
          allowedCategories: ['Weapon Proficiencies'],
        },
      ],
      occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
    } as unknown as import('../types').PalladiumOcc
    const refs = listCreationVoucherTaskRefs(wpOcc, null)
    const open = collectOpenCreationVoucherBookCategories(
      refs,
      {},
      {},
      {},
      'nightbane',
      ['wp_revolver'],
      [],
    )
    expect(open.has('WP: Ancient')).toBe(true)
    expect(open.has('WP: Modern')).toBe(true)
  })
})
