import { describe, expect, it } from 'vitest'
import { getLibraryOccById } from '../data/library/registry'
import { projectCreationSkillsToSheet, applySpawnSheetHandoff } from './spawnSheetHandoff'
import { rawOccSkillBonusPercent } from './creationPsychicSkills'
import { createBlankCharacterForGenre } from './characterRoot'
import { patchCharacterCreationFromOcc, applyOccStartingSkillPicks } from './occCreationDerivation'
import { snapshotOccForCharacter } from '../data/occDefinitions'
import { getOccById } from '../data/occDefinitions'

describe('spawnSheetHandoff', () => {
  it('projects creation skill ids onto sheet rows with names and basePercent', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    const occView = getOccById('occ_ex_government_agent')
    expect(occLib).toBeDefined()
    expect(occView).toBeDefined()

    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occLib!),
    }
    root = applyOccStartingSkillPicks(
      patchCharacterCreationFromOcc(root, occLib!),
      occLib!,
    )
    root = {
      ...root,
      creationRelatedSkillIds: ['skill_pick_locks'],
    }

    const rows = projectCreationSkillsToSheet(root, occLib)
    expect(rows.length).toBeGreaterThan(5)
    const intel = rows.find((r) => r.id === 'skill_intelligence')
    expect(intel?.name).toBeTruthy()
    expect(intel?.catalogSkillId).toBe('skill_intelligence')
    expect(intel?.basePercent).toBeGreaterThan(0)
    const related = rows.find((r) => r.id === 'skill_pick_locks')
    expect(related).toBeDefined()
    expect(related?.catalogSkillId).toBe('skill_pick_locks')
  })

  it('projects selectionCategory onto sheet rows for multi-category picks', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    expect(occLib).toBeDefined()

    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occLib!),
      creationRelatedSkillPicks: [
        {
          instanceId: 'prowl-rogue',
          skillId: 'skill_prowl',
          selectionCategory: 'Rogue',
        },
      ],
    }

    const rows = projectCreationSkillsToSheet(root, occLib)
    const prowl = rows.find((r) => r.id === 'prowl-rogue')
    expect(prowl?.catalogSkillId).toBe('skill_prowl')
    expect(prowl?.selectionCategory).toBe('Rogue')
  })

  it('applySpawnSheetHandoff copies skills to facade and morphus', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    const occView = getOccById('occ_ex_government_agent')
    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occLib!),
      creationVitalityCommitted: true,
    }
    root = applyOccStartingSkillPicks(
      patchCharacterCreationFromOcc(root, occLib!),
      occLib!,
    )

    const finalized = applySpawnSheetHandoff(root)
    expect(finalized.isFinalized).toBe(true)
    expect(finalized.physicalSkillModsApplied).toBe(true)
    expect(finalized.primary.skills.length).toBeGreaterThan(0)
    expect(finalized.morphus.skills.length).toBe(finalized.primary.skills.length)
    expect(finalized.primary.skills[0]?.name).not.toMatch(/^skill_/)
  })

  it('applySpawnSheetHandoff applies catalog physical skill attribute flats to primary', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occLib!),
      creationAttributeAssignments: { ps: 10, pp: 10, pe: 10, spd: 10 },
    }
    root = applyOccStartingSkillPicks(
      patchCharacterCreationFromOcc(root, occLib!),
      occLib!,
    )
    root = {
      ...root,
      creationSecondarySkillPicks: [
        { instanceId: 'boxing', skillId: 'skill_boxing' },
      ],
    }

    const beforePs = root.primary.attributes.ps.score
    const finalized = applySpawnSheetHandoff(root)
    expect(finalized.primary.attributes.ps.score).toBe(beforePs + 2)
  })

  it('projects only the selected Hand-to-Hand upgrade, not the O.C.C. default', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    expect(occLib).toBeDefined()

    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occLib!),
    }
    root = applyOccStartingSkillPicks(
      patchCharacterCreationFromOcc(root, occLib!),
      occLib!,
    )
    root = {
      ...root,
      creationHandToHandTier: 'martial_arts',
      // Stale ladder default that must not survive spawn when Martial Arts was chosen.
      creationOccSkillIds: [
        ...(root.creationOccSkillIds ?? []),
        'skill_hand_to_hand_basic',
      ],
    }

    const finalized = applySpawnSheetHandoff(root)
    const hthIds = finalized.primary.skills
      .map((s) => s.catalogSkillId ?? s.id)
      .filter((id) => String(id).includes('hand_to_hand') || String(id).startsWith('hth_'))
    expect(hthIds.some((id) => String(id).includes('martial_arts'))).toBe(true)
    expect(
      hthIds.some(
        (id) =>
          String(id).includes('hand_to_hand_basic') ||
          String(id).includes('hand_to_hand_expert') ||
          id === 'hth_basic' ||
          id === 'hth_expert',
      ),
    ).toBe(false)
  })

  it('halves O.C.C. related skill bonus % for Major psychic on spawn', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    const occView = getOccById('occ_ex_government_agent')
    expect(occLib).toBeDefined()

    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occLib!),
      creationPsychicTier: 'major',
    }
    root = applyOccStartingSkillPicks(
      patchCharacterCreationFromOcc(root, occLib!),
      occLib!,
    )
    root = {
      ...root,
      creationRelatedSkillIds: ['skill_pick_locks'],
    }

    const rawBonus = rawOccSkillBonusPercent(
      occLib,
      'skill_pick_locks',
      new Set(['skill_pick_locks']),
    )
    expect(rawBonus).toBeGreaterThan(0)

    const noneRows = projectCreationSkillsToSheet(root, occLib, 'primary', 'none')
    const majorRows = projectCreationSkillsToSheet(root, occLib, 'primary', 'major')
    const nonePick = noneRows.find((r) => r.id === 'skill_pick_locks')
    const majorPick = majorRows.find((r) => r.id === 'skill_pick_locks')
    expect(nonePick).toBeDefined()
    expect(majorPick).toBeDefined()
    if (!nonePick || !majorPick) return
    const nonePct = nonePick.basePercent ?? 0
    const majorPct = majorPick.basePercent ?? 0
    expect(majorPct).toBeLessThan(nonePct)
    expect(majorPct).toBe(nonePct - (rawBonus - Math.floor(rawBonus * 0.5)))
  })
})
