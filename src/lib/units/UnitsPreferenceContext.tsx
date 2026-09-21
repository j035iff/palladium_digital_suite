import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_MEASUREMENT_SYSTEM,
  readUnitsPreference,
  writeUnitsPreference,
} from './preference'
import type { MeasurementSystem } from './types'

type UnitsPreferenceContextValue = {
  measurementSystem: MeasurementSystem
  setMeasurementSystem: (system: MeasurementSystem) => void
  toggleMeasurementSystem: () => void
}

const UnitsPreferenceContext = createContext<UnitsPreferenceContextValue | null>(
  null,
)

export function UnitsPreferenceProvider({ children }: { children: ReactNode }) {
  const [measurementSystem, setSystemState] = useState<MeasurementSystem>(
    DEFAULT_MEASUREMENT_SYSTEM,
  )

  useEffect(() => {
    setSystemState(readUnitsPreference())
  }, [])

  const setMeasurementSystem = useCallback((system: MeasurementSystem) => {
    setSystemState(system)
    writeUnitsPreference(system)
  }, [])

  const toggleMeasurementSystem = useCallback(() => {
    setSystemState((prev) => {
      const next: MeasurementSystem = prev === 'standard' ? 'metric' : 'standard'
      writeUnitsPreference(next)
      return next
    })
  }, [])

  return (
    <UnitsPreferenceContext.Provider
      value={{
        measurementSystem,
        setMeasurementSystem,
        toggleMeasurementSystem,
      }}
    >
      {children}
    </UnitsPreferenceContext.Provider>
  )
}

export function useUnitsPreference(): UnitsPreferenceContextValue {
  const ctx = useContext(UnitsPreferenceContext)
  if (!ctx) {
    throw new Error(
      'useUnitsPreference must be used within UnitsPreferenceProvider',
    )
  }
  return ctx
}
