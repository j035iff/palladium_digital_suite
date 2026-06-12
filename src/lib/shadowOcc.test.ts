import { describe, expect, it } from 'vitest'
import type { Race } from '../types'
import {
  creationUsesOccSkillProgram,
  raceForcedOccId,
  resolveCreationOccLibraryRow,
  shadowOccMountMessage,
} from './shadowOcc'

const guardianRace = {
  id: 'race_guardian',
  name: 'Guardian',
  canPickOcc: false,
  forcedOccId: 'occ_guardian',
} as Race

describe('shadowOcc', () => {
  it('reads forcedOccId from race rows', () => {
    expect(raceForcedOccId(guardianRace)).toBe('occ_guardian')
    expect(raceForcedOccId({ ...guardianRace, forcedOccId: '  ' })).toBeUndefined()
  })

  it('treats shadow R.C.C.s as using an O.C.C. skill program', () => {
    expect(creationUsesOccSkillProgram(guardianRace)).toBe(true)
    expect(
      creationUsesOccSkillProgram({
        ...guardianRace,
        canPickOcc: false,
        forcedOccId: undefined,
      }),
    ).toBe(false)
    expect(
      creationUsesOccSkillProgram({
        ...guardianRace,
        canPickOcc: true,
        forcedOccId: undefined,
      }),
    ).toBe(true)
  })

  it('resolves shadow O.C.C. from race metadata instead of character occ id', () => {
    expect(
      resolveCreationOccLibraryRow(guardianRace, 'occ_human_soldier'),
    ).toBeUndefined()
  })

  it('formats auto-mount UI copy when forced occ is active', () => {
    expect(
      shadowOccMountMessage(guardianRace, {
        id: 'occ_guardian',
        name: 'Guardian',
      } as never),
    ).toBe('Guardian R.C.C. skills auto-mounted from Guardian.')
    expect(
      shadowOccMountMessage(guardianRace, {
        id: 'occ_other',
        name: 'Other',
      } as never),
    ).toBeNull()
  })
})
