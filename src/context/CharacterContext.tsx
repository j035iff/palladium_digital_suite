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
   * Dot-path attribute setter. Examples:
   * - `facade.attributes.iq` / `morphus.attributes.pp`
   * - `morphus.attributes.ps.score` / `…ps.tier` (`tier` must be a valid P.S. tier string)
   * - Shorthand `attributes.spd` → updates the **currently active** form.
   */
  updateAttribute: (path: string, value: number | string) => void
  /** Vitality header scale from current form pools (combat_logic.md §1). */
  getVitalityType: () => VitalityCombatScale
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Character>(() => characterFixture)
  const [activeForm, setActiveForm] = useState<ActiveForm>('facade')
  const [psychicTier, setPsychicTierState] = useState<PsychicTier>(() =>
    characterFixture.occCategory === 'psychic' ? 'master' : 'none',
  )

  const occPsychicLocked = character.occCategory === 'psychic'
  const gateBypassed = character.psychicGateBypassed === true
  const psychicSeedRef = useRef(false)

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
