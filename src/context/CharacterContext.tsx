import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { characterFixture } from '../data/characterFixture'
import {
  computeIsMDC,
  computeLiveBonuses,
  type LiveBonuses,
} from '../lib/characterDerived'
import type {
  ActiveForm,
  Character,
  CharacterAttributes,
  FormState,
  ScalarAttributeKey,
} from '../types'
import { getFormState } from '../types'

function isScalarAttributeKey(k: string): k is ScalarAttributeKey {
  return (
    k === 'iq' ||
    k === 'me' ||
    k === 'ma' ||
    k === 'pp' ||
    k === 'pe' ||
    k === 'pb' ||
    k === 'spd'
  )
}

type CharacterContextValue = {
  character: Character
  activeForm: ActiveForm
  activeFormState: FormState
  liveBonuses: LiveBonuses
  /** Active form uses M.D.C. structural or HP scaling — for Vitality Header / combat bridge. */
  isMDC: boolean
  toggleForm: () => void
  updateAttribute: (
    form: ActiveForm,
    attr: string,
    value: number,
  ) => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Character>(() => characterFixture)
  const [activeForm, setActiveForm] = useState<ActiveForm>('facade')

  const activeFormState = useMemo(
    () => getFormState(character, activeForm),
    [character, activeForm],
  )

  const liveBonuses = useMemo(
    () => computeLiveBonuses(activeFormState.attributes),
    [activeFormState.attributes],
  )

  const isMDC = useMemo(
    () => computeIsMDC(activeFormState),
    [activeFormState],
  )

  const toggleForm = useCallback(() => {
    setActiveForm((f) => (f === 'facade' ? 'morphus' : 'facade'))
  }, [])

  const updateAttribute = useCallback(
    (form: ActiveForm, attr: string, value: number) => {
      setCharacter((prev) => {
        const key = form === 'facade' ? 'facade' : 'morphus'
        const branch = prev[key]
        let nextAttrs: CharacterAttributes

        if (attr === 'ps') {
          nextAttrs = {
            ...branch.attributes,
            ps: { ...branch.attributes.ps, score: value },
          }
        } else if (isScalarAttributeKey(attr)) {
          nextAttrs = { ...branch.attributes, [attr]: value }
        } else {
          return prev
        }

        return {
          ...prev,
          [key]: { ...branch, attributes: nextAttrs },
        }
      })
    },
    [],
  )

  const value = useMemo<CharacterContextValue>(
    () => ({
      character,
      activeForm,
      activeFormState,
      liveBonuses,
      isMDC,
      toggleForm,
      updateAttribute,
    }),
    [
      character,
      activeForm,
      activeFormState,
      liveBonuses,
      isMDC,
      toggleForm,
      updateAttribute,
    ],
  )

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  )
}

/** Co-located hook for this provider; Fast Refresh expects components in the default module pattern. */
// eslint-disable-next-line react-refresh/only-export-components -- public hook paired with CharacterProvider
export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext)
  if (!ctx) {
    throw new Error('useCharacter must be used within CharacterProvider')
  }
  return ctx
}
