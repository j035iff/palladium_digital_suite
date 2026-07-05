import { useContext } from 'react'
import { SupernaturalAbilitiesForgeContext } from './supernaturalAbilitiesForgeCtx'

export function useSupernaturalAbilitiesForge() {
  const ctx = useContext(SupernaturalAbilitiesForgeContext)
  if (!ctx) {
    throw new Error(
      'useSupernaturalAbilitiesForge must be used within SupernaturalAbilitiesForgeProvider',
    )
  }
  return ctx
}
