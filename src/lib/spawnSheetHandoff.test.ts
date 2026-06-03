import { describe, expect, it } from 'vitest'
import { getLibraryOccById } from '../data/library/registry'
import { projectCreationSkillsToSheet, applySpawnSheetHandoff } from './spawnSheetHandoff'
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
      occ: snapshotOccForCharacter(occView!),
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
    expect(intel?.basePercent).toBeGreaterThan(0)
    const related = rows.find((r) => r.id === 'skill_pick_locks')
    expect(related).toBeDefined()
  })

  it('applySpawnSheetHandoff copies skills to facade and morphus', () => {
    const occLib = getLibraryOccById('occ_ex_government_agent')
    const occView = getOccById('occ_ex_government_agent')
    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      occ: snapshotOccForCharacter(occView!),
      creationVitalityCommitted: true,
    }
    root = applyOccStartingSkillPicks(
      patchCharacterCreationFromOcc(root, occLib!),
      occLib!,
    )

    const finalized = applySpawnSheetHandoff(root)
    expect(finalized.isFinalized).toBe(true)
    expect(finalized.facade.skills.length).toBeGreaterThan(0)
    expect(finalized.morphus.skills.length).toBe(finalized.facade.skills.length)
    expect(finalized.facade.skills[0]?.name).not.toMatch(/^skill_/)
  })
})
