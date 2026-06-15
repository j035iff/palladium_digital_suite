import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isTier1ChargenComplete,
  SCHEMA_TOP_LEVEL_KEYS,
  TALENT_TIER2_PLAY_KEYS,
} from '../../scripts/talent-engine-contract.mjs'

describe('talent engine contract', () => {
  it('marks a complete chargen row as Tier 1 ready', () => {
    expect(
      isTier1ChargenComplete({
        id: 'talent_example',
        name: 'Example',
        description: 'Desc',
        gameSystems: ['nightbane'],
        sources: [{ gameSystem: 'nightbane', reference: 'Dark Designs', pageNumber: 62 }],
        talentTier: 'common',
        ppe: { permanentBurnToAcquire: 1, baseActivation: 12 },
      }),
    ).toBe(true)
  })

  it('schema properties cover all contract top-level keys (except $schema)', () => {
    const schemaPath = join(
      process.cwd(),
      'src/data/schemas/palladium-talent.schema.json',
    )
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
    const schemaProps = new Set(Object.keys(schema.properties ?? {}))
    schemaProps.add('$schema')

    for (const key of SCHEMA_TOP_LEVEL_KEYS) {
      expect(schemaProps.has(key), `schema missing property: ${key}`).toBe(true)
    }
  })

  it('lists Tier 2 play keys used in catalog', () => {
    expect(TALENT_TIER2_PLAY_KEYS).toContain('powerModes')
    expect(TALENT_TIER2_PLAY_KEYS).toContain('combatMechanics')
    expect(TALENT_TIER2_PLAY_KEYS).toContain('vampiricResourceRecovery')
  })
})
