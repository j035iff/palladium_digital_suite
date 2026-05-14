import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { characterFixture } from '../data/characterFixture'
import { getAbilityById } from '../data/abilityLibrary'
import {
  loadPersistedAbilityIds,
  savePersistedAbilityIds,
} from '../lib/creationAbilityPersistence'
import {
  loadCharacterMeta,
  saveCharacterMeta,
} from '../lib/characterMetaPersistence'
import { tryApplyNumericSheetPath, isNumericSheetPath } from '../lib/vitalityPathUpdate'
import { applyAttributeTail, parseAttributePath } from '../lib/attributePathUpdate'
import { mergeVitalityFromAttributes } from '../lib/derivedVitality'
import {
  computeIsMDC,
  computeLiveBonuses,
  getVitalityTypeFromForm,
  type LiveBonuses,
  type VitalityCombatScale,
} from '../lib/characterDerived'
import {
  applyPsychicTierToFormState,
  saveVsPsionicsForTier,
  skillSlotMultiplierForTier,
  tierFromTestPotential,
  rollD100,
} from '../lib/psychicGate'
import type { SpawnVitalityRolls } from '../lib/spawnFinalVitality'
import type { ActiveForm, Character, FormState, PsychicTier } from '../types'
import { getFormState } from '../types'

/** Active-form combat sheet slice (vitality pools + attribute bonuses). */
type ActiveStats = {
  hitPoints: FormState['hitPoints']
  structuralDamageCapacity: FormState['structuralDamageCapacity']
  bonuses: LiveBonuses
}

type CharacterContextValue = {
  character: Character
  activeForm: ActiveForm
  activeFormState: FormState
  /** Memoized H.P., S.D.C. pools, and natural bonuses for the active form. */
  activeStats: ActiveStats
  /** @see getVitalityType — true when active form is on the M.D.C. track (combat_logic.md §1). */
  isMDC: boolean
  /** Psychic Gate tier (psychic_gate.md); drives save target & skill tax. */
  psychicTier: PsychicTier
  /** O.C.C. related skill slot multiplier (0.5 when Major; psychic_gate.md §2). */
  skillSlotMultiplier: number
  /** Save vs. Psionics roll target for the current tier. */
  saveVsPsionicsTarget: 15 | 12 | 10
  setPsychicTier: (tier: PsychicTier) => void
  /** Standard entry: roll d100 and apply {@link tierFromTestPotential} bands. */
  testPsychicPotential: () => number
  toggleForm: () => void
  /**
   * Dot-path setter for attributes and numeric sheet pools.
   * Attributes: `facade.attributes.iq`, `attributes.pp` (active form), `morphus.attributes.ps.score`, …
   * Vitality / P.P.E.: `facade.hitPoints.maximum`, `ppe.current`, `morphus.isp.maximum`, …
   */
  updateAttribute: (path: string, value: number | string) => void
  /** Vitality header scale from current form pools (combat_logic.md §1). */
  getVitalityType: () => VitalityCombatScale
  /**
   * Spend P.P.E. (character pool) or I.S.P. (active form). Returns false if insufficient
   * (sn_abilities_selection.md §4, vision Pillar 8).
   */
  spendEnergy: (source: 'ppe' | 'isp', amount: number) => boolean
  /** Creation Step 4: add ability id if budget + Pillar 8 + form gates allow. */
  addSelectedAbility: (id: string) => void
  removeSelectedAbility: (id: string) => void
  /** Step 3 — persist O.C.C. / related skill picks on the character record. */
  setCreationSkillPicks: (occ: string[], related: string[]) => void
  /**
   * Step 5 — apply rolled H.P./S.D.C./P.P.E./I.S.P. in one atomic update (Spawn).
   * Sets creationVitalityCommitted.
   */
  commitSpawnVitalityRolls: (rolls: SpawnVitalityRolls) => void
  /** Locks the sheet and hides creation UI (character_creation.md §5). */
  finalizeCharacter: () => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

function hydrateCharacterFromStorage(base: Character): Character {
  const persisted = loadPersistedAbilityIds(base.name)
  const fromFixture = base.selectedAbilities ?? []
  const meta = loadCharacterMeta(base.name)
  return {
    ...base,
    selectedAbilities: persisted ?? fromFixture,
    isFinalized: meta?.isFinalized ?? base.isFinalized ?? false,
    creationVitalityCommitted:
      meta?.creationVitalityCommitted ??
      base.creationVitalityCommitted ??
      false,
  }
}

/** Returns updated character if the pick is legal; otherwise null. */
function nextCharacterIfAddAbility(
  prev: Character,
  id: string,
  form: ActiveForm,
): Character | null {
  const def = getAbilityById(id)
  if (!def) return null
  const selected = prev.selectedAbilities ?? []
  if (selected.includes(id)) return null
  if (def.morphusOnly && form !== 'morphus') return null

  const spellCap = prev.startingSpellLevelCap ?? 4
  if (
    def.category === 'Spell' &&
    def.spellLevel != null &&
    def.spellLevel > spellCap
  ) {
    return null
  }

  const b = prev.creationAbilityBudget ?? {
    spellSlots: 8,
    psionicSlots: 6,
    talentSlots: 4,
  }
  const countCat = (cat: 'Spell' | 'Psionic' | 'Talent') =>
    selected.filter((x) => getAbilityById(x)?.category === cat).length

  if (def.category === 'Spell' && countCat('Spell') >= b.spellSlots) {
    return null
  }
  if (def.category === 'Psionic' && countCat('Psionic') >= b.psionicSlots) {
    return null
  }
  if (def.category === 'Talent' && countCat('Talent') >= b.talentSlots) {
    return null
  }

  return { ...prev, selectedAbilities: [...selected, id] }
}

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Character>(() =>
    hydrateCharacterFromStorage(characterFixture),
  )
  const [activeForm, setActiveForm] = useState<ActiveForm>('facade')
  const [psychicTier, setPsychicTierState] = useState<PsychicTier>(() =>
    characterFixture.occCategory === 'psychic' ? 'master' : 'none',
  )

  const occPsychicLocked = character.occCategory === 'psychic'
  const gateBypassed = character.psychicGateBypassed === true
  const psychicSeedRef = useRef(false)

  useEffect(() => {
    savePersistedAbilityIds(
      character.name,
      character.selectedAbilities ?? [],
    )
  }, [character.name, character.selectedAbilities])

  useEffect(() => {
    saveCharacterMeta(character.name, {
      isFinalized: character.isFinalized === true,
      creationVitalityCommitted:
        character.creationVitalityCommitted === true,
    })
  }, [
    character.name,
    character.isFinalized,
    character.creationVitalityCommitted,
  ])

  useEffect(() => {
    if (!occPsychicLocked || psychicSeedRef.current) return
    psychicSeedRef.current = true
    setPsychicTierState('master')
    setCharacter((prev) => {
      const branch = getFormState(prev, activeForm)
      return {
        ...prev,
        [activeForm]: applyPsychicTierToFormState(branch, 'master'),
      }
    })
  }, [occPsychicLocked, activeForm])

  const activeFormState = useMemo(
    () => getFormState(character, activeForm),
    [character, activeForm],
  )

  const liveBonuses = useMemo(
    () => computeLiveBonuses(activeFormState.attributes),
    [activeFormState.attributes],
  )

  const activeStats = useMemo<ActiveStats>(
    () => ({
      hitPoints: activeFormState.hitPoints,
      structuralDamageCapacity: activeFormState.structuralDamageCapacity,
      bonuses: liveBonuses,
    }),
    [
      activeFormState.hitPoints,
      activeFormState.structuralDamageCapacity,
      liveBonuses,
    ],
  )

  const isMDC = useMemo(
    () => computeIsMDC(activeFormState),
    [activeFormState],
  )

  const skillSlotMultiplier = useMemo(
    () => skillSlotMultiplierForTier(psychicTier),
    [psychicTier],
  )

  const saveVsPsionicsTarget = useMemo(
    () => saveVsPsionicsForTier(psychicTier),
    [psychicTier],
  )

  const getVitalityType = useCallback(
    (): VitalityCombatScale => getVitalityTypeFromForm(activeFormState),
    [activeFormState],
  )

  const toggleForm = useCallback(() => {
    setActiveForm((f) => (f === 'facade' ? 'morphus' : 'facade'))
  }, [])

  const setPsychicTier = useCallback(
    (tier: PsychicTier) => {
      if (gateBypassed) return
      if (occPsychicLocked && tier !== 'master') return

      setPsychicTierState(tier)
      setCharacter((prev) => {
        const branch = getFormState(prev, activeForm)
        return {
          ...prev,
          [activeForm]: applyPsychicTierToFormState(branch, tier),
        }
      })
    },
    [activeForm, gateBypassed, occPsychicLocked],
  )

  const testPsychicPotential = useCallback((): number => {
    if (gateBypassed) return 0
    if (occPsychicLocked) return 0
    const roll = rollD100()
    const tier = tierFromTestPotential(roll)
    setPsychicTierState(tier)
    setCharacter((prev) => {
      const branch = getFormState(prev, activeForm)
      return {
        ...prev,
        [activeForm]: applyPsychicTierToFormState(branch, tier),
      }
    })
    return roll
  }, [activeForm, gateBypassed, occPsychicLocked])

  const updateAttribute = useCallback(
    (path: string, value: number | string) => {
      setCharacter((prev) => {
        if (typeof value === 'number' && isNumericSheetPath(path)) {
          return tryApplyNumericSheetPath(prev, path, value) ?? prev
        }

        const parsed = parseAttributePath(path, activeForm)
        if (!parsed) return prev

        const { formKey, tail } = parsed
        if (tail.length === 0) return prev

        const branch = prev[formKey]
        const nextAttrs = applyAttributeTail(branch.attributes, tail, value)
        if (!nextAttrs) return prev

        const withAttrs = { ...branch, attributes: nextAttrs }
        const merged = mergeVitalityFromAttributes(withAttrs, nextAttrs)

        return {
          ...prev,
          [formKey]: merged,
        }
      })
    },
    [activeForm],
  )

  const setCreationSkillPicks = useCallback(
    (occ: string[], related: string[]) => {
      setCharacter((prev) => ({
        ...prev,
        creationOccSkillIds: occ,
        creationRelatedSkillIds: related,
      }))
    },
    [],
  )

  const commitSpawnVitalityRolls = useCallback((rolls: SpawnVitalityRolls) => {
    setCharacter((prev) => {
      const pairs: [string, number][] = [
        ['facade.hitPoints.maximum', rolls.facadeHp],
        ['facade.hitPoints.current', rolls.facadeHp],
        ['facade.structuralDamageCapacity.maximum', rolls.facadeSdc],
        ['facade.structuralDamageCapacity.current', rolls.facadeSdc],
        ['morphus.hitPoints.maximum', rolls.morphusHp],
        ['morphus.hitPoints.current', rolls.morphusHp],
        ['morphus.structuralDamageCapacity.maximum', rolls.morphusSdc],
        ['morphus.structuralDamageCapacity.current', rolls.morphusSdc],
        ['ppe.maximum', rolls.ppeMax],
        ['ppe.current', rolls.ppeMax],
        ['morphus.isp.maximum', rolls.morphusIspMax],
        ['morphus.isp.current', rolls.morphusIspMax],
      ]
      let next: Character = prev
      for (const [path, v] of pairs) {
        next = tryApplyNumericSheetPath(next, path, v) ?? next
      }
      return {
        ...next,
        creationVitalityCommitted: true,
      }
    })
  }, [])

  const finalizeCharacter = useCallback(() => {
    setCharacter((prev) => ({ ...prev, isFinalized: true }))
  }, [])

  const addSelectedAbility = useCallback(
    (id: string) => {
      setCharacter(
        (prev) => nextCharacterIfAddAbility(prev, id, activeForm) ?? prev,
      )
    },
    [activeForm],
  )

  const removeSelectedAbility = useCallback((id: string) => {
    setCharacter((prev) => ({
      ...prev,
      selectedAbilities: (prev.selectedAbilities ?? []).filter((x) => x !== id),
    }))
  }, [])

  const spendEnergy = useCallback(
    (source: 'ppe' | 'isp', amount: number): boolean => {
      if (amount <= 0) return true
      if (source === 'ppe') {
        if (character.ppe.current < amount) return false
      } else {
        if (activeFormState.isp.current < amount) return false
      }

      setCharacter((prev) => {
        if (source === 'ppe') {
          if (prev.ppe.current < amount) return prev
          return {
            ...prev,
            ppe: { ...prev.ppe, current: prev.ppe.current - amount },
          }
        }
        const branch = getFormState(prev, activeForm)
        if (branch.isp.current < amount) return prev
        return {
          ...prev,
          [activeForm]: {
            ...branch,
            isp: { ...branch.isp, current: branch.isp.current - amount },
          },
        }
      })
      return true
    },
    [character.ppe, activeFormState.isp, activeForm],
  )

  const value = useMemo<CharacterContextValue>(
    () => ({
      character,
      activeForm,
      activeFormState,
      activeStats,
      isMDC,
      psychicTier,
      skillSlotMultiplier,
      saveVsPsionicsTarget,
      setPsychicTier,
      testPsychicPotential,
      toggleForm,
      updateAttribute,
      getVitalityType,
      spendEnergy,
      addSelectedAbility,
      removeSelectedAbility,
      setCreationSkillPicks,
      commitSpawnVitalityRolls,
      finalizeCharacter,
    }),
    [
      character,
      activeForm,
      activeFormState,
      activeStats,
      isMDC,
      psychicTier,
      skillSlotMultiplier,
      saveVsPsionicsTarget,
      setPsychicTier,
      testPsychicPotential,
      toggleForm,
      updateAttribute,
      getVitalityType,
      spendEnergy,
      addSelectedAbility,
      removeSelectedAbility,
      setCreationSkillPicks,
      commitSpawnVitalityRolls,
      finalizeCharacter,
    ],
  )

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- public hook paired with CharacterProvider
export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext)
  if (!ctx) {
    throw new Error('useCharacter must be used within CharacterProvider')
  }
  return ctx
}
