import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  hasPhysicalTrainingProgression as contractHasPhysicalTraining,
  hasPercentileProgression as contractHasPercentile,
} from '../../scripts/skill-engine-contract.mjs'
import {
  hasPercentileProgression,
  hasPhysicalTrainingProgression,
} from './skillCatalogProgression'

describe('skillCatalogProgression', () => {
  it('matches skill-engine-contract for physical.json rows', () => {
    const rows = JSON.parse(
      readFileSync(
        join(process.cwd(), 'src/data/content/skills/physical.json'),
        'utf8',
      ),
    ) as unknown[]
    for (const row of rows) {
      expect(hasPercentileProgression(row as never)).toBe(
        contractHasPercentile(row),
      )
      expect(hasPhysicalTrainingProgression(row as never)).toBe(
        contractHasPhysicalTraining(row),
      )
    }
  })

  it('classifies known stats-only physical skills', () => {
    const statsOnlyIds = [
      'skill_athletics_general',
      'skill_body_building_weight_lifting',
      'skill_boxing',
      'skill_kick_boxing',
      'skill_outdoorsmanship',
      'skill_physical_labor',
      'skill_running',
      'skill_wrestling',
    ]
    const rows = JSON.parse(
      readFileSync(
        join(process.cwd(), 'src/data/content/skills/physical.json'),
        'utf8',
      ),
    ) as Array<{ id: string }>
    const byId = new Map(rows.map((r) => [r.id, r]))
    for (const id of statsOnlyIds) {
      const row = byId.get(id)
      expect(row, id).toBeTruthy()
      expect(hasPhysicalTrainingProgression(row as never)).toBe(true)
    }
  })
})
