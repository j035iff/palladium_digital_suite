/** GM encounter archetype — lightweight random/minor NPC template (not forge-spawnable). */

export type EncounterSourceRef = {
  gameSystem: string
  reference: string
  pageNumber: number
}

export type EncounterNumberAppearing = {
  formula: string
  minimum?: number
  maximum?: number
  notes?: string
}

export type EncounterVitals = {
  sdc: number | string
  hp: number | string
  notes?: string
}

export type EncounterHandToHand = {
  skillId: string
  attacksPerMelee?: number
  notes?: string
}

export type EncounterLevelOutcome = {
  min: number
  max: number
  level: number
}

export type EncounterLevelBlock = {
  defaultLevel: number
  distributionRoll?: string
  outcomes?: EncounterLevelOutcome[]
  notes?: string
}

export type EncounterModifiers = {
  initiative?: number
  strike?: number
  parry?: number
  dodge?: number
  pullPunch?: number
  rollWithImpact?: number
  rollWithPunch?: number
  perception?: number
  save_horror_factor?: number
  save_magic?: number
  save_psionics?: number
  save_nightbane_horror_factor?: number
}

export type EncounterWeaponProficiencyRef = {
  skillId?: string
  category?: 'ancient' | 'modern' | 'any'
  notes: string
}

export type EncounterEquipmentEntry = {
  label: string
  damageFormula?: string
  notes?: string
}

export type EncounterArmorEntry = {
  label: string
  ar: number
  sdc: number
  notes?: string
}

export type EncounterHorrorFactorMorale = {
  saveTarget: number
  useNightbaneHorrorFactor?: boolean
  notes: string
}

export type EncounterComposition = {
  defaultBaseRaceId?: string
  alternateBaseRaceIds?: string[]
  speciesBaselineRaceId?: string
  notes?: string
}

export type EncounterArchetypeVariant = {
  variantId: string
  label: string
  baseRaceId?: string
  levelOffset?: number
  vitals?: EncounterVitals
  modifiers?: EncounterModifiers
  notes?: string
}

export type EncounterArchetype = {
  id: string
  name: string
  description: string
  gameSystems: readonly string[]
  sources: readonly EncounterSourceRef[]
  tags: readonly string[]
  packageNotes?: readonly string[]
  composition?: EncounterComposition
  numberAppearing: EncounterNumberAppearing
  alignmentNotes: string
  attributeNotes?: string
  vitals: EncounterVitals
  handToHand: EncounterHandToHand
  levelOfExperience: EncounterLevelBlock
  modifiers: EncounterModifiers
  weaponProficiencies: readonly EncounterWeaponProficiencyRef[]
  equipment: readonly EncounterEquipmentEntry[]
  armor?: readonly EncounterArmorEntry[]
  horrorFactorMorale?: EncounterHorrorFactorMorale
  dispositionNotes: readonly string[]
  variants?: readonly EncounterArchetypeVariant[]
  relatedRaceIds?: readonly string[]
  relatedOccIds?: readonly string[]
}
