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
import { getAbilityById } from '../data/abilityLibrary'
import { characterFixture } from '../data/characterFixture'
import { initialInventoryItems } from '../data/inventoryFixture'
import {
  getFeatureById,
  getRaceById,
  raceAllowedInCharacterCreation,
} from '../data/library/registry'
import { getLibraryOccById } from '../data/occDefinitions'
import { aggregateAllPassiveModifiers, featureBudgetCategory } from '../lib/featureEngine'
import { effectiveStructuralPool } from '../lib/effectiveVitality'
import { resolveSkillSlotMultiplier } from '../data/library/types'
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
} from '../lib/psychicGate'
import type { SpawnVitalityRolls } from '../lib/spawnFinalVitality'
import { computeMaxApm } from '../lib/meleeCombat'
import {
  resolveHandToHandCombatProfile,
  type HandToHandCombatProfile,
} from '../lib/handToHandPipeline'
import { handToHandAttackBonus } from '../utils/combatCalculator'
import { evaluateStrengthFromPhysicalStat } from '../utils/strengthCalculator'
import type { StrengthCapacities } from '../types'
import { computeCombatVitalityDelta } from '../lib/combatVitalityApply'
import {
  computeDisplayScalars,
  computeSheetCombatDerived,
  type SheetCombatDerived,
} from '../lib/sheetBonuses'
import type { WeaponProfileBonuses } from '../lib/weaponBonuses'
import { getWeaponBonuses as lookupWeaponBonuses } from '../lib/weaponBonuses'
import { computeSaveProfile, type SaveProfileDerived } from '../lib/saveProfile'
import { applyInventoryAwareSdcVitality } from '../lib/inventoryVitalityApply'
import { syncArmorAndWeaponFlags } from '../lib/inventoryArmorSync'
import {
  applyReloadFromReserves,
  ensureReserveCategory,
  type AmmoReservesState,
} from '../lib/ammoReserves'
import { initialAmmoReserves } from '../data/ammoFixture'
import { loadXpHistory, saveXpHistory } from '../lib/xpHistoryPersistence'
import { getOccById, snapshotOccForCharacter } from '../data/occDefinitions'
import {
  LEVEL_CAP,
  newlyCrossedLevels,
  outstandingLevelUpTargets,
  xpProgressTowardNext,
} from '../data/xpTables'
import type { GenreId } from '../data/genres'
import {
  deleteCharacterSave,
  isCharacterIndexInProgress,
  listFinalizedCharacters,
  listInProgressCharacters,
  loadCharacterSave,
  resolveCharacterIndexRowDisplay,
  saveCharacterToStorage,
  type CharacterIndexEntry,
} from '../lib/characterIndex'
import { serializeCharacterRootForSave } from '../lib/characterSave'
import {
  createBlankCharacterForGenre,
  CREATION_PLACEHOLDER_OCC,
  ensureCharacterRoot,
  retainCharacterRoot,
} from '../lib/characterRoot'
import {
  deriveInventoryForHost,
  transformCharacterToHostEnvironment,
} from '../utils/genreTransformer'
import {
  buildMorphusPassiveBundle,
  type MorphusDerivedSheetSlice,
} from '../lib/morphusPassiveBridge'
import {
  collectMorphusHeightModifiers,
  collectMorphusWeightModifiers,
  EMPTY_CHARACTER_IDENTITY_PROFILE,
  normalizeIdentityProfile,
  resolveIdentityHeightInches,
  resolveIdentityWeightLbs,
} from '../lib/characterIdentity'
import {
  deriveMovementStats,
  type DerivedMovementStats,
} from '../lib/movementDerivation'
import {
  morphusBlocksTwoHandedWeapon,
  stackNaturalArmorFromTraits,
} from '../lib/morphusCharacteristicAggregation'
import { resolveActiveMorphusTraits } from '../lib/morphusPassiveBridge'
import type {
  ActiveForm,
  ActiveMeleeDuration,
  Armor,
  AttacksPerMeleeState,
  Character,
  CharacterIdentityProfile,
  CharacterRootState,
  CreationSkillPick,
  CombatVitalityChange,
  DerivedActiveState,
  DerivedInventoryItem,
  FormState,
  InventoryItem,
  CombatHudDamagePulse,
  CombatNarrativeEntry,
  FeatureModifiers,
  PsychicGateMajorAllocation,
  PsychicTier,
  MorphusStanceType,
  MorphusSurfaceType,
  VitalityFlashKind,
  Weapon,
  XpGainEvent,
} from '../types'
import { getFormState } from '../types'
import {
  characterHasDualForms,
  DEFAULT_RACE_ID,
} from '../lib/raceFormPolicy'
import {
  isOccAllowedForRace,
  mapRaceStrengthToPsTier,
  raceCanPickOcc as raceAllowsOccPick,
  raceLineageFromDefinition,
  raceStrengthCategoryLabel,
} from '../lib/raceEngine'
import { occSkillSlotPolicy } from '../lib/occCatalogEngine'
import { isGenreSupernaturalAbilitiesDisallowed } from '../data/genres'
import { resolveEffectiveCreationAbilityBudget } from '../lib/creationAbilityBudget'
import {
  listGatePsionicSelections,
  psychicGatePsionicPickAllowed,
  psychicGatePsionicRulesApply,
  psychicGateRequiredPickCount,
} from '../lib/psychicGatePsionicBudget'
import {
  occEnginePsionicPickAllowed,
  occEnginePsionicRulesApply,
} from '../lib/occSupernaturalSelection'
import {
  creationNeedsAbilitySelection,
  resolvePsychicGateBypassed,
} from '../lib/creationPhases'
import { applySpawnSheetHandoff } from '../lib/spawnSheetHandoff'
import { resolveCreationPsychicTier } from '../lib/creationPsychicSkills'
import type { CreationPhase } from '../lib/creationStep'
import type { CharacterCreationForgeTabId } from '../types'
import {
  buildCharacterCreationForgeContext,
  canSaveCreationForLater as raceOccStepAllowsSaveForLater,
  completeForgeTab,
  forgeTabToLegacyPhase,
  isMorphusLedgerUnlocked,
  legacyPhaseToForgeTab,
  morphusLedgerUnlockPatchIfEligible,
} from '../lib/forgeNavigation/characterCreationForge'
import type { ForgeAttrKey } from '../lib/attributeKeys'
import {
  applyFacadePendingDiceResolutions,
  applyMorphusPendingDiceResolutions,
  applyPendingDiceResolutionsToCharacter,
} from '../lib/spawnVitalityManual'
import { patchPendingDiceResolution } from '../lib/pendingDiceLedger'
import {
  defaultMorphusForgeState,
  morphusCrossroadsSnapshot,
  morphusTraitForgeSnapshot,
  resolveMorphusForgeState,
  type MorphusForgeSubTabId,
} from '../lib/morphusForgeNavigation'
import {
  clearMorphusForgeSlotState,
  clearMorphusSlotPathState,
  buildMorphusSlotTree,
  collectSelectedMorphusCatalogEntryIds,
  deriveMorphusSlotResolutionView,
  isMorphusSubTraitTablePickBlocked,
  isMorphusTraitPickAlreadySelected,
  patchMorphusForgeSlotState,
} from '../lib/morphusSlotResolution'
import { sanitizeMorphusCustomTraitInstance } from '../lib/morphusCustomTrait'
import { applyNightbaneMorphusBaseAttributes } from '../lib/morphusNightbaneBase'
import { markForgeTabComplete } from '../lib/forgeNavigation/engine'
import type { MorphusForgeState, MorphusForgeSlotState, MorphusHouseRules, MorphusSlotNode } from '../types'
import type { SlotActions } from '../components/creation/morphus/MorphusSlotNodeView'
import {
  abilityPassesOccSupernaturalRules,
  deriveOccCreation,
  occCreationAbilityBudget,
  occStartingSpellLevelCap,
  applyOccStartingSkillPicks,
  patchCharacterCreationFromOcc,
} from '../lib/occCreationDerivation'
import { occSupernaturalGrantedAbilityIds } from '../lib/occSupernaturalGrants'
import {
  getOccSpecialization,
  resolveEffectivePalladiumOcc,
} from '../lib/occComposition'
import type { PalladiumOcc } from '../types'
import type { Race } from '../types'
import { syncCreationAttributeBranches } from '../lib/creationAttributeSync'
import type { CreationHandToHandTier } from '../lib/creationHandToHandChoice'
import {
  creationInvalidationPatch,
} from '../lib/creationInvalidate'
import {
  mergeOccSkillIdsWithVouchers,
} from '../lib/occCoreSkillVouchers'
import { syncRaceOccFacadeSdc } from '../lib/creationRaceOccSync'
import {
  applyOccSelectionToCharacterState,
  clearOccSelectionState,
  raceForcedOccId,
  shadowOccMountMessage,
} from '../lib/shadowOcc'

export type AppViewport = 'launcher' | 'sheet'

/** Active-form combat sheet slice (vitality pools + attribute bonuses). */
type ActiveStats = {
  hitPoints: FormState['hitPoints']
  structuralDamageCapacity: FormState['structuralDamageCapacity']
  featureSdcBonus: number
  bonuses: LiveBonuses
}

/** Passive modifier totals + displayed attributes after features/skills that bump sheet stats (active form). */
type SheetScalars = ReturnType<typeof computeDisplayScalars>

type CharacterContextValue = {
  viewport: AppViewport
  /** Middleware-derived payload for UI (master_flow.md Step D). */
  character: DerivedActiveState
  /** Immutable save-shaped record (mutations write here). */
  rawCharacter: CharacterRootState
  readonly creationGenreId: string
  /** From genre manifest — mundane-only creation (no Psychic Gate or supernatural picks). */
  genreSupernaturalAbilitiesDisallowed: boolean
  hostGenreId: string
  setHostGenreId: (genreId: string) => void
  derivedInventoryItems: DerivedInventoryItem[]
  saveCharacter: () => void
  loadSavedCharacter: (id: string) => void
  startCreation: (genreId: GenreId) => void
  returnToLauncher: () => void
  /** Clears every creation tab and starts a fresh blank record for the current genre. */
  resetCreation: () => void
  /** Persists the in-progress draft and returns to the portal. */
  saveCreationForLater: () => void
  /** True after Race & O.C.C. Continue — required before Save for Later. */
  canSaveCreationForLater: boolean
  /** Returns to the portal without writing the current session. */
  leaveCreationWithoutSaving: () => void
  savedCharacterRows: CharacterIndexEntry[]
  inProgressCharacterRows: CharacterIndexEntry[]
  /** Permanently removes an in-progress draft (portal list). */
  deleteInProgressCharacter: (id: string) => void
  refreshSavedCharacterIndex: () => void
  /** Active terrain for Morphus mobility / surface-isolated skills (default hard_flat). */
  morphusSurfaceType: MorphusSurfaceType
  setMorphusSurfaceType: (surface: MorphusSurfaceType) => void
  /** Stacked natural A.R. from Morphus traits (absolute `naturalAr` rows). */
  morphusNaturalAr: number | undefined
  /** Additive A.R. shift from statModifiers.ar (e.g. Athlete Streamlined −2). */
  morphusRelativeArShift: number
  /** Hand capacity from active Morphus gear traits. */
  morphusHandCapacityOccupied: number
  morphusBlocksTwoHandedWeapons: boolean
  /** Posture gate for Ancient Warrior cavalry / cloak rows (mounted, dismounted, …). */
  morphusStanceType: MorphusStanceType
  setMorphusStanceType: (stance: MorphusStanceType) => void
  /** Natural weapons, companions, trait notes, and stance options from active Morphus traits. */
  morphusDerived: MorphusDerivedSheetSlice | null
  /** Active Gear-Head / burst ability keys (`traitId::abilityName`). */
  morphusActiveBurstKeys: readonly string[]
  toggleMorphusBurst: (burstKey: string) => void
  /** Active gimmick toy switch keys (`traitId::gimmick::ref`). */
  morphusActiveGimmickSwitchKeys: readonly string[]
  toggleMorphusGimmickSwitch: (switchKey: string) => void
  activeForm: ActiveForm
  /** Only Nightbane uses Facade/Morphus; all other races stay on Facade. */
  supportsDualForm: boolean
  /** Nightbane creation: Morphus Live Ledger unlocks when the Traits tab is reachable. */
  morphusLedgerUnlocked: boolean
  activeFormState: FormState
  /** Memoized H.P., S.D.C. pools, and natural bonuses for the active form. */
  activeStats: ActiveStats
  /** Sheet-first melee totals + line-by-line attribution (skills, traits, morphus modifiers). */
  sheetCombatDerived: SheetCombatDerived
  /** Attributes with passive deltas from modifiers (e.g. Boxing P.P., trait bumps). */
  sheetDisplayScalars: SheetScalars
  /** Convenience: merged passive modifier record for the active form. */
  sheetPassiveModifiers: FeatureModifiers
  /** Sheet-first saving throw targets + Horror Factor for the active form. */
  saveProfileDerived: SaveProfileDerived
  /** Derived movement payload (ground/swim/fly/leap) from movement engine spec. */
  movementDerived: DerivedMovementStats
  /** Identity height in inches (player entry + Morphus modifiers when Morphus is active). */
  identityResolvedHeightInches: number
  /** Identity weight in lbs when entered (plus Morphus modifiers when Morphus is active). */
  identityResolvedWeightLbs: number | undefined
  setCharacterName: (name: string) => void
  patchIdentityProfile: (patch: Partial<CharacterIdentityProfile>) => void
  /** @see getVitalityType — true when active form is on the M.D.C. track (combat_logic.md §1). */
  isMDC: boolean
  /** Psychic Gate tier (psychic_gate.md); drives save target & skill tax. */
  psychicTier: PsychicTier
  /** O.C.C. related skill slot multiplier (0.5 when Major; psychic_gate.md §2). */
  skillSlotMultiplier: number
  /** Save vs. Psionics roll target for the current tier. */
  saveVsPsionicsTarget: 15 | 12 | 10
  setPsychicTier: (tier: PsychicTier) => void
  setPsychicGateMajorAllocation: (allocation: PsychicGateMajorAllocation) => void
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
  setCreationSkillPicks: (
    occ: string[],
    related: CreationSkillPick[],
    secondary?: CreationSkillPick[],
  ) => void
  setCreationHandToHandTier: (tier: CreationHandToHandTier) => void
  /** Step 0 — O.C.C. package: fixed XP table, psychic category, and starting skill ids. */
  setSelectedOcc: (occId: string) => void
  /** Step 0 — sub-class branch when the O.C.C. defines {@link PalladiumOcc.specializations}. */
  setOccSpecializationId: (specializationId: string) => void
  /** Resolved library race row for the active character. */
  activeRace: Race | undefined
  /** Resolved O.C.C. catalog row (`content/occs/*.json`). */
  activeOcc: PalladiumOcc | undefined
  /** Baseline O.C.C. merged with {@link Character.occSpecializationId} when set. */
  effectiveOcc: PalladiumOcc | undefined
  /** Creation budgets and restrictions derived from {@link effectiveOcc} engines. */
  occCreationDerived: ReturnType<typeof deriveOccCreation> | null
  /**
   * Accumulated Hand-to-Hand progression for the active form (catalog + level ladder).
   * Drives A.P.M. ceiling and sheet combat badge lines.
   */
  handToHandCombatProfile: HandToHandCombatProfile
  /** False for self-contained R.C.C.s — O.C.C. selection UI is locked. */
  raceCanPickOcc: boolean
  /** Shadow O.C.C. auto-mount notice for R.C.C.s with forcedOccId. */
  shadowOccMountNotice: string | null
  /** Display label for the race strength scale (sheet / Attribute Forge). */
  raceStrengthLabel: string
  /** Library race id; drives conditional base S.D.C. with O.C.C. tags. */
  setRaceId: (raceId: string | null) => void
  /**
   * Step 5 — apply rolled H.P./S.D.C./P.P.E./I.S.P. in one atomic update (Spawn).
   * Sets creationVitalityCommitted.
   */
  commitSpawnVitalityRolls: (rolls: SpawnVitalityRolls) => void
  /** Locks the sheet and hides creation UI (forge-character_creation.md Tab 7). */
  finalizeCharacter: () => void
  /** Creation state machine — active phase. */
  setCreationPhase: (phase: CreationPhase) => void
  /** Universal Forge — active tab (seven-tab creation flow). */
  setCreationForgeTab: (tabId: CharacterCreationForgeTabId) => void
  /** Mark tab Green after explicit Continue (no viewport change). */
  markCreationForgeTabComplete: (tabId: CharacterCreationForgeTabId) => void
  setTraitForgeStubComplete: (complete: boolean) => void
  patchMorphusForgeState: (
    patch:
      | Partial<MorphusForgeState>
      | ((prev: MorphusForgeState) => MorphusForgeState),
  ) => void
  setMorphusForgeSubTab: (tabId: MorphusForgeSubTabId) => void
  markMorphusForgeSubTabComplete: (tabId: MorphusForgeSubTabId) => void
  addMorphusCustomTraitSlot: (catalogEntryId: string) => void
  setMorphusCustomTraitInstance: (
    slotId: string,
    instance: import('../types').MorphusCustomTraitInstance,
  ) => void
  removeMorphusCustomTraitSlot: (slotId: string) => void
  setMorphusHouseRules: (patch: MorphusHouseRules) => void
  morphusForgeSlotActions: SlotActions
  setCreationAttributePoolSlot: (index: number, value: number | null) => void
  setCreationAttributeAssignment: (attr: ForgeAttrKey, poolIndex: number) => void
  /** Set an attribute total directly (not tied to a pool slot). */
  setCreationAttributeValue: (attr: ForgeAttrKey, value: number | null) => void
  clearCreationAttributeAssignment: (attr: ForgeAttrKey) => void
  /** Dev-only — rolls and assigns all eight attributes in one update. */
  devAutoRollAndAssignAllAttributes?: () => void
  /** Dev-only — sets one attribute to an exceptional pool value (17–30). */
  devMakeAttributeExceptional?: (attr: ForgeAttrKey) => void
  /** Dev-only — fills vouchers, related, secondary, and Hand-to-Hand picks. */
  devAutoFillAllSkillSelections?: () => void
  /** Dev-only — rolls every pending spawn dice field on Review & Spawn. */
  devAutoRollAllPendingDice?: () => void
  /** Dev-only — Nightbane Basic through facade dice, then open Morphus Sub-Forge. */
  devSkipToMorphusCreation?: () => void
  setCreationOccVariableResolution: (taskId: string, value: number) => void
  setCreationOccCoreVoucherPick: (
    voucherId: string,
    picks: readonly (CreationSkillPick | null)[],
  ) => void
  setCreationOccGrantPickDetail: (
    skillId: string,
    pick: CreationSkillPick | null,
  ) => void
  setCreationPendingDiceResolution: (entryId: string, value: number) => void
  setAlignment: (alignment: string) => void
  /** Live combat — A.P.M. tracker (combat_logic.md §3). */
  attacksPerMelee: AttacksPerMeleeState
  spendCombatAction: (amount?: number) => void
  resetMeleeRound: () => void
  activeMeleeDurations: ActiveMeleeDuration[]
  registerActiveMeleeDuration: (abilityId: string, rounds: number) => void
  /** Apply damage or healing to H.P. or S.D.C. on the active form; drives vitality flash. */
  applyCombatVitalityChange: (change: CombatVitalityChange) => void
  /** Carried gear + armor rows (inventory engine). */
  inventoryItems: InventoryItem[]
  /** Equipped body armor id, or null. */
  equippedArmorId: string | null
  /** Resolved armor row when {@link equippedArmorId} matches an armor entry. */
  equippedArmor: Armor | null
  /** Sum of carried weights (lbs). */
  currentWeightLbs: number
  /** P.S. carry, lift, throw, and H2H damage for the active form (Nightbane RPG pp. 34–35). */
  strengthCapacities: StrengthCapacities
  /** Carry limit from {@link strengthCapacities}.carryingCapacityLbs. */
  carryLimitLbs: number
  /** True when {@link currentWeightLbs} exceeds {@link carryLimitLbs}. */
  overEncumbered: boolean
  /** Placeholder copy for future Spd penalty when over carry (attribute_and_stat.md §4). */
  encumbranceSpdNote: string
  /** Wear body armor (`null` clears equipped suit). Ruined armor (0 S.D.C.) cannot be equipped. */
  equipArmor: (id: string | null) => void
  /** Add a new armor row to inventory (Armory). */
  addArmorToInventory: (piece: {
    name: string
    ar: number
    maxSdc: number
    weightLbs: number
    morphusCompatible?: boolean
    humanSized?: boolean
  }) => void
  dropItem: (id: string) => void
  /** Up to two carried weapons flagged ready for the combat HUD strike row. */
  readyWeaponIds: readonly [string | null, string | null]
  /** Resolved weapon rows for {@link readyWeaponIds} (null if missing or not a weapon). */
  readyWeapons: readonly [Weapon | null, Weapon | null]
  setReadyWeapon: (slot: 0 | 1, weaponId: string | null) => void
  /** Ranged: subtract rounds from magazine (fire mode cost). */
  spendWeaponAmmo: (weaponId: string, rounds: number) => void
  /** @deprecated Use {@link spendWeaponAmmo} with mode cost. */
  spendWeaponRangedShot: (weaponId: string) => void
  /** Shared spare rounds by {@link Weapon.ammoCategory} (e.g. "9mm"). */
  ammoReserves: AmmoReservesState
  /** Refill magazine from category reserve; returns false if insufficient ammo. */
  reloadWeapon: (weaponId: string) => boolean
  /** Aggregated Strike / Parry / Throw bonuses for one inventory weapon (sheet-first). */
  getWeaponBonuses: (weaponId: string) => WeaponProfileBonuses | null
  /** Add spare rounds to a category reserve (Armory — Ammo management). */
  addAmmoToReserve: (category: string, rounds: number) => void
  /** Tactical narrative log (Pillar 6). */
  combatNarrativeLog: readonly CombatNarrativeEntry[]
  appendCombatNarrative: (message: string, tone?: CombatNarrativeEntry['tone']) => void
  clearCombatNarrative: () => void
  /**
   * S.D.C.-priority sheet: damage S.D.C. then H.P.; heal S.D.C. to max then H.P.
   * Optional strike total vs equipped armor A.R. routes damage to armor S.D.C. first when roll is below A.R.
   */
  applySdcPriorityVitality: (opts: {
    mode: 'damage' | 'heal'
    amount: number
    useAttackRollVsArmor?: boolean
    attackRoll?: number
  }) => void
  /** Pillar 5 — true briefly after a new melee round to nudge duration checks. */
  durationCheckPulse: boolean
  /** Pillar 6 — vitality header pulse after pool change. */
  vitalityFlash: VitalityFlashKind
  /** Tactical HUD — which pool flashed after last S.D.C. damage (A.R. gate routing). */
  combatHudDamagePulse: CombatHudDamagePulse
  /** Progress toward next level from cumulative XP (xpTables.ts). */
  xpProgress: {
    pct: number
    floorXp: number
    nextThresholdXp: number | null
    cap: number
  }
  /** Recent XP awards (newest appended). */
  xpHistory: XpGainEvent[]
  /** Levels waiting for level-up ritual (FIFO). */
  levelUpQueue: readonly number[]
  /** First pending ritual target level, or null. */
  pendingLevelUpTarget: number | null
  /** Add lifetime XP; may enqueue level-up rituals when thresholds are crossed. */
  grantXp: (amount: number, label?: string) => void
  /** Apply H.P. die result and advance to the next queued level. */
  resolveLevelUpRitual: (hpRoll: number) => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

function withSyncedMorphusTraitSlots(prev: CharacterRootState): CharacterRootState {
  const forgeState = resolveMorphusForgeState(prev)
  const view = deriveMorphusSlotResolutionView(forgeState, prev.morphusForgeSlotState)
  return {
    ...prev,
    morphusTraitSlotResolutions: view.traitSlots,
    activeMorphusCharacteristicIds: view.traitSlots.map((slot) => slot.catalogEntryId),
  }
}

function updateMorphusForgeSlotState(
  prev: CharacterRootState,
  nextSlotState: MorphusForgeSlotState,
): CharacterRootState {
  return withSyncedMorphusTraitSlots({
    ...prev,
    morphusForgeSlotState: nextSlotState,
    creationTraitForgeStubComplete: false,
  })
}

function morphusTraitPickWouldDuplicate(
  prev: CharacterRootState,
  node: Pick<MorphusSlotNode, 'kind' | 'path'>,
  pickEntryId: string,
): boolean {
  const forgeState = resolveMorphusForgeState(prev)
  const nodes = buildMorphusSlotTree(forgeState, prev.morphusForgeSlotState)
  const selectedIds = collectSelectedMorphusCatalogEntryIds(nodes, prev.morphusForgeSlotState)
  return isMorphusTraitPickAlreadySelected(
    node,
    pickEntryId,
    selectedIds,
    prev.morphusForgeSlotState,
  )
}

function ensureCharacterOcc(c: CharacterRootState): CharacterRootState {
  if (c.occ?.xpTable?.floors?.length) return c
  const def = getOccById('occ_ex_government_agent')
  if (!def) return c
  return { ...c, occ: snapshotOccForCharacter(def) }
}

function hydrateCharacterFromStorage(base: CharacterRootState): CharacterRootState {
  const rooted = ensureCharacterRoot(base, {
    creationGenreId: base.creationGenreId,
    hostGenreId: base.hostGenreId,
  })
  const persisted = loadPersistedAbilityIds(rooted.name)
  const fromFixture = rooted.selectedAbilities ?? []
  const meta = loadCharacterMeta(rooted.name)
  let next = ensureCharacterOcc({
    ...rooted,
    identityProfile: normalizeIdentityProfile(rooted.identityProfile),
    selectedAbilities: persisted ?? fromFixture,
    isFinalized: meta?.isFinalized ?? rooted.isFinalized ?? false,
    creationVitalityCommitted:
      meta?.creationVitalityCommitted ??
      rooted.creationVitalityCommitted ??
      false,
  })
  const occRow = getLibraryOccById(next.occ.id)
  if (occRow) next = retainCharacterRoot(next, patchCharacterCreationFromOcc(next, occRow))
  return next
}

/** Placeholder root until launcher load/create (not shown while viewport is launcher). */
const INITIAL_CHARACTER_SNAPSHOT: CharacterRootState = (() => {
  const root = ensureCharacterRoot(characterFixture, {
    creationGenreId: 'nightbane',
    hostGenreId: 'nightbane',
  })
  const hydrated = hydrateCharacterFromStorage(root)
  return hydrated.creationVitalityCommitted === true
    ? hydrated
    : syncRaceOccFacadeSdc(hydrated)
})()

/** Returns updated character if the pick is legal; otherwise null. */
function nextCharacterIfAddAbility(prev: CharacterRootState, id: string): CharacterRootState | null {
  if (isGenreSupernaturalAbilitiesDisallowed(prev.creationGenreId)) return null
  const def = getFeatureById(id)
  if (!def) return null
  const selected = prev.selectedAbilities ?? []
  if (selected.includes(id)) return null

  const occRow = getLibraryOccById(prev.occ.id)
  const tier = resolveCreationPsychicTier(prev, prev.creationPsychicTier ?? 'none')
  const abilityBudget = resolveEffectiveCreationAbilityBudget({
    occ: occRow,
    raceId: prev.raceId,
    psychicTier: tier,
    psychicGateBypassed: prev.psychicGateBypassed === true,
    majorAllocation: prev.creationPsychicGateMajorAllocation,
    storedBudget: prev.creationAbilityBudget,
    creationGenreId: prev.creationGenreId ?? prev.hostGenreId,
  })
  if (!creationNeedsAbilitySelection(abilityBudget, prev.creationGenreId)) {
    return null
  }
  const spellCap = occRow
    ? occStartingSpellLevelCap(occRow)
    : (prev.startingSpellLevelCap ?? 4)
  const cat = featureBudgetCategory(def)
  const spellLevel =
    typeof def.metadata?.level === 'number'
      ? def.metadata.level
      : typeof def.metadata?.spellLevel === 'number'
        ? def.metadata.spellLevel
        : undefined

  const genreId = prev.creationGenreId ?? prev.hostGenreId
  if (occRow) {
    const gate = abilityPassesOccSupernaturalRules(
      occRow,
      def,
      spellCap,
      genreId,
    )
    if (!gate.allowed) return null
  } else if (cat === 'Spell' && spellLevel != null && spellLevel > spellCap) {
    return null
  }

  const grantedIds = new Set(
    occSupernaturalGrantedAbilityIds(occRow, prev.occSpecializationId),
  )

  const countCat = (c: 'Spell' | 'Psionic' | 'Talent') =>
    selected.filter((x) => {
      if (grantedIds.has(x)) return false
      const f = getFeatureById(x)
      return f != null && featureBudgetCategory(f) === c
    }).length

  if (cat === 'Psionic') {
    const psychicGate = psychicGatePsionicPickAllowed({
      tier,
      majorAllocation: prev.creationPsychicGateMajorAllocation,
      psychicGateBypassed: prev.psychicGateBypassed === true,
      occ: occRow,
      selectedIds: selected,
      candidateId: id,
      genreId: genreId ?? 'nightbane',
    })
    if (psychicGate && !psychicGate.allowed) return null

    const occEngine = occEnginePsionicPickAllowed({
      occ: occRow,
      selectedIds: selected,
      candidateId: id,
      genreId: genreId ?? 'nightbane',
      grantedIds: [...grantedIds],
    })
    if (occEngine && !occEngine.allowed) return null
  }

  if (cat === 'Spell' && countCat('Spell') >= abilityBudget.spellSlots) return null
  if (cat === 'Psionic') {
    const gateApplies = psychicGatePsionicRulesApply(
      occRow,
      tier,
      prev.psychicGateBypassed === true,
    )
    if (gateApplies) {
      const required =
        psychicGateRequiredPickCount(tier, prev.creationPsychicGateMajorAllocation) ??
        abilityBudget.psionicSlots
      const gateTotal = listGatePsionicSelections(
        selected,
        genreId ?? 'nightbane',
      ).length
      if (gateTotal >= required) return null
    } else if (!occEnginePsionicRulesApply(occRow)) {
      if (countCat('Psionic') >= abilityBudget.psionicSlots) return null
    }
  }
  if (cat === 'Talent' && countCat('Talent') >= abilityBudget.talentSlots) return null
  if (!cat) return null

  return { ...prev, selectedAbilities: [...selected, id] }
}

function bumpAllHitPoints(prev: CharacterRootState, roll: number): CharacterRootState {
  const bump = (branch: FormState) => ({
    ...branch,
    hitPoints: {
      ...branch.hitPoints,
      maximum: branch.hitPoints.maximum + roll,
      current: branch.hitPoints.current + roll,
    },
  })
  return {
    ...prev,
    facade: bump(prev.facade),
    morphus: bump(prev.morphus),
  }
}

function mergeLevelQueues(existing: number[], crossed: number[]): number[] {
  const s = new Set([...existing, ...crossed])
  return [...s].sort((a, b) => a - b)
}

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<AppViewport>('launcher')
  const [rawCharacter, setRawCharacter] = useState<CharacterRootState>(
    () => INITIAL_CHARACTER_SNAPSHOT,
  )
  const [savedCharacterRows, setSavedCharacterRows] = useState<CharacterIndexEntry[]>(
    () => listFinalizedCharacters(),
  )
  const [inProgressCharacterRows, setInProgressCharacterRows] = useState<
    CharacterIndexEntry[]
  >(() => listInProgressCharacters())
  const [levelUpQueue, setLevelUpQueue] = useState<number[]>(() =>
    outstandingLevelUpTargets(INITIAL_CHARACTER_SNAPSHOT),
  )
  const [xpHistory, setXpHistory] = useState<XpGainEvent[]>(() =>
    loadXpHistory(INITIAL_CHARACTER_SNAPSHOT.name),
  )
  const [activeForm, setActiveForm] = useState<ActiveForm>('facade')
  const [morphusSurfaceType, setMorphusSurfaceType] =
    useState<MorphusSurfaceType>('hard_flat')
  const [morphusStanceType, setMorphusStanceType] =
    useState<MorphusStanceType>('mounted')
  const [morphusActiveBurstKeys, setMorphusActiveBurstKeys] = useState<
    readonly string[]
  >([])
  const [morphusActiveGimmickSwitchKeys, setMorphusActiveGimmickSwitchKeys] =
    useState<readonly string[]>([])
  const [psychicTier, setPsychicTierState] = useState<PsychicTier>(() =>
    ensureCharacterOcc(INITIAL_CHARACTER_SNAPSHOT).occ.category === 'psychic'
      ? 'master'
      : 'none',
  )

  const occPsychicLocked = rawCharacter.occ.category === 'psychic'
  const gateBypassed = rawCharacter.psychicGateBypassed === true
  const psychicSeedRef = useRef(false)
  const wasFinalizedRef = useRef(false)
  const prevMorphusLedgerUnlockedRef = useRef<boolean | null>(null)

  useEffect(() => {
    savePersistedAbilityIds(
      rawCharacter.name,
      rawCharacter.selectedAbilities ?? [],
    )
  }, [rawCharacter.name, rawCharacter.selectedAbilities])

  useEffect(() => {
    saveCharacterMeta(rawCharacter.name, {
      isFinalized: rawCharacter.isFinalized === true,
      creationVitalityCommitted:
        rawCharacter.creationVitalityCommitted === true,
    })
  }, [
    rawCharacter.name,
    rawCharacter.isFinalized,
    rawCharacter.creationVitalityCommitted,
  ])

  useEffect(() => {
    saveXpHistory(rawCharacter.name, xpHistory)
  }, [rawCharacter.name, xpHistory])

  useEffect(() => {
    const finalized = rawCharacter.isFinalized === true
    if (finalized && !wasFinalizedRef.current) {
      setLevelUpQueue(outstandingLevelUpTargets(rawCharacter))
    }
    wasFinalizedRef.current = finalized
  }, [rawCharacter])

  useEffect(() => {
    if (!occPsychicLocked || psychicSeedRef.current) return
    psychicSeedRef.current = true
    setPsychicTierState('master')
    setRawCharacter((prev) => {
      const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'facade'
      const branch = getFormState(prev, form)
      return {
        ...prev,
        creationPsychicTier: 'master',
        [form]: applyPsychicTierToFormState(branch, 'master'),
      }
    })
  }, [occPsychicLocked, activeForm, rawCharacter.raceId])

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() =>
    syncArmorAndWeaponFlags(
      [...initialInventoryItems],
      'synth_weave',
      ['vibro_knife', 'ion_pistol'],
    ),
  )
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(
    'synth_weave',
  )
  const [readyWeaponIds, setReadyWeaponIds] = useState<
    [string | null, string | null]
  >(['vibro_knife', 'ion_pistol'])
  const [ammoReserves, setAmmoReserves] = useState<AmmoReservesState>(() => ({
    ...initialAmmoReserves,
  }))
  const [combatNarrativeLog, setCombatNarrativeLog] = useState<
    CombatNarrativeEntry[]
  >([])

  const creationGenreId = rawCharacter.creationGenreId
  const hostGenreId = rawCharacter.hostGenreId
  const genreSupernaturalAbilitiesDisallowed = isGenreSupernaturalAbilitiesDisallowed(
    creationGenreId,
  )

  const character = useMemo(
    () =>
      transformCharacterToHostEnvironment(rawCharacter, hostGenreId, {
        inventoryItems,
      }),
    [rawCharacter, hostGenreId, inventoryItems],
  )

  const derivedInventoryItems = useMemo(
    () => deriveInventoryForHost(inventoryItems, hostGenreId),
    [inventoryItems, hostGenreId],
  )

  const refreshSavedCharacterIndex = useCallback(() => {
    setSavedCharacterRows(listFinalizedCharacters())
    setInProgressCharacterRows(listInProgressCharacters())
  }, [])

  const applyFreshCreationSession = useCallback((blank: CharacterRootState) => {
    setRawCharacter(syncRaceOccFacadeSdc(blank))
    setActiveForm('facade')
    setPsychicTierState('none')
    setXpHistory([])
    setLevelUpQueue([])
    psychicSeedRef.current = false
    prevMorphusLedgerUnlockedRef.current = null
  }, [])

  const persistCharacterSave = useCallback((state: CharacterRootState) => {
    saveCharacterToStorage(serializeCharacterRootForSave(state))
    refreshSavedCharacterIndex()
  }, [refreshSavedCharacterIndex])

  const saveCharacter = useCallback(() => {
    persistCharacterSave(rawCharacter)
  }, [rawCharacter, persistCharacterSave])

  const loadSavedCharacter = useCallback((id: string) => {
    const loaded = loadCharacterSave(id)
    if (!loaded) return
    const hydrated = hydrateCharacterFromStorage(
      ensureCharacterRoot(loaded, {
        creationGenreId: loaded.creationGenreId,
        hostGenreId: loaded.hostGenreId,
      }),
    )
    setRawCharacter(
      hydrated.creationVitalityCommitted ? hydrated : syncRaceOccFacadeSdc(hydrated),
    )
    setPsychicTierState(resolveCreationPsychicTier(hydrated))
    setViewport('sheet')
    setActiveForm('facade')
    setXpHistory(loadXpHistory(hydrated.name))
    setLevelUpQueue(outstandingLevelUpTargets(hydrated))
    prevMorphusLedgerUnlockedRef.current = null
  }, [])

  const startCreation = useCallback((genreId: GenreId) => {
    applyFreshCreationSession(createBlankCharacterForGenre(genreId))
    setViewport('sheet')
  }, [applyFreshCreationSession])

  const resetCreation = useCallback(() => {
    if (
      !window.confirm(
        'Reset all creation progress? Every tab will be cleared and this cannot be undone.',
      )
    ) {
      return
    }
    const genreId = rawCharacter.creationGenreId
    if (!genreId) return
    applyFreshCreationSession(createBlankCharacterForGenre(genreId as GenreId))
  }, [applyFreshCreationSession, rawCharacter.creationGenreId])

  const canSaveCreationForLater = raceOccStepAllowsSaveForLater(rawCharacter)

  const saveCreationForLater = useCallback(() => {
    if (!raceOccStepAllowsSaveForLater(rawCharacter)) return
    persistCharacterSave(rawCharacter)
    setViewport('launcher')
    refreshSavedCharacterIndex()
  }, [rawCharacter, persistCharacterSave, refreshSavedCharacterIndex])

  const leaveCreationWithoutSaving = useCallback(() => {
    if (
      !window.confirm(
        'Leave without saving? Your progress will not be saved and cannot be undone.',
      )
    ) {
      return
    }
    setViewport('launcher')
    refreshSavedCharacterIndex()
  }, [refreshSavedCharacterIndex])

  const deleteInProgressCharacter = useCallback(
    (id: string) => {
      const entry = inProgressCharacterRows.find((row) => row.id === id)
      if (!entry || !isCharacterIndexInProgress(entry)) return
      const label = resolveCharacterIndexRowDisplay(entry).mainLabel
      if (
        !window.confirm(
          `Delete "${label}"? This in-progress character will be permanently removed and cannot be undone.`,
        )
      ) {
        return
      }
      deleteCharacterSave(id)
      refreshSavedCharacterIndex()
    },
    [inProgressCharacterRows, refreshSavedCharacterIndex],
  )

  const returnToLauncher = useCallback(() => {
    setViewport('launcher')
    refreshSavedCharacterIndex()
  }, [refreshSavedCharacterIndex])

  const setHostGenreId = useCallback((genreId: string) => {
    setRawCharacter((prev) => ({ ...prev, hostGenreId: genreId }))
  }, [])

  const supportsDualForm = useMemo(
    () => characterHasDualForms(character),
    [character],
  )

  const activeRace = useMemo(
    () =>
      character.raceId?.trim() ? getRaceById(character.raceId) : undefined,
    [character.raceId],
  )

  const activeOcc = useMemo(
    () => getLibraryOccById(character.occ.id),
    [character.occ.id],
  )

  const effectiveOcc = useMemo(
    () =>
      activeOcc
        ? resolveEffectivePalladiumOcc(activeOcc, character.occSpecializationId)
        : undefined,
    [activeOcc, character.occSpecializationId],
  )

  const morphusLedgerUnlocked = useMemo(
    () =>
      isMorphusLedgerUnlocked(
        rawCharacter,
        activeRace,
        effectiveOcc ?? undefined,
        psychicTier,
      ),
    [rawCharacter, activeRace, effectiveOcc, psychicTier],
  )

  useEffect(() => {
    if (!supportsDualForm) {
      prevMorphusLedgerUnlockedRef.current = morphusLedgerUnlocked
      return
    }

    const prev = prevMorphusLedgerUnlockedRef.current
    prevMorphusLedgerUnlockedRef.current = morphusLedgerUnlocked

    if (!morphusLedgerUnlocked) {
      setActiveForm((form) => (form === 'morphus' ? 'facade' : form))
      return
    }

    if (prev === false) {
      setActiveForm('morphus')
    }
  }, [morphusLedgerUnlocked, supportsDualForm])

  const occCreationDerived = useMemo(
    () =>
      activeOcc ? deriveOccCreation(activeOcc, character.occSpecializationId) : null,
    [activeOcc, character.occSpecializationId],
  )

  const raceCanPickOcc = useMemo(
    () => raceAllowsOccPick(activeRace),
    [activeRace],
  )

  const shadowOccMountNotice = useMemo(
    () => shadowOccMountMessage(activeRace, activeOcc),
    [activeRace, activeOcc],
  )

  const raceStrengthLabel = useMemo(
    () =>
      activeRace
        ? raceStrengthCategoryLabel(activeRace.strengthCategory)
        : raceStrengthCategoryLabel('standard'),
    [activeRace],
  )

  const sheetActiveForm: ActiveForm = supportsDualForm ? activeForm : 'facade'

  const handToHandCombatProfile = useMemo(
    () => resolveHandToHandCombatProfile(character, sheetActiveForm, activeOcc),
    [character, sheetActiveForm, activeOcc],
  )

  const activeFormState = useMemo(
    () => getFormState(character, sheetActiveForm),
    [character, sheetActiveForm],
  )

  const equippedArmor = useMemo((): Armor | null => {
    if (!equippedArmorId) return null
    const row = inventoryItems.find((i) => i.id === equippedArmorId)
    return row?.itemType === 'armor' ? row : null
  }, [inventoryItems, equippedArmorId])

  const readyWeapons = useMemo((): [Weapon | null, Weapon | null] => {
    const resolve = (id: string | null): Weapon | null => {
      if (!id) return null
      const row = inventoryItems.find((i) => i.id === id)
      return row?.itemType === 'weapon' ? row : null
    }
    return [resolve(readyWeaponIds[0]), resolve(readyWeaponIds[1])]
  }, [inventoryItems, readyWeaponIds])

  const currentWeightLbs = useMemo(
    () => inventoryItems.reduce((s, i) => s + i.weightLbs, 0),
    [inventoryItems],
  )

  const strengthCapacities = useMemo(
    () => evaluateStrengthFromPhysicalStat(activeFormState.attributes.ps),
    [activeFormState.attributes.ps],
  )

  const carryLimitLbs = strengthCapacities.carryingCapacityLbs

  const overEncumbered = currentWeightLbs > carryLimitLbs

  const encumbranceSpdNote = overEncumbered
    ? 'Spd penalty pending rules pass — load exceeds P.S.-based carry limit.'
    : ''

  const liveBonuses = useMemo(
    () => computeLiveBonuses(activeFormState.attributes),
    [activeFormState.attributes],
  )

  const activeStats = useMemo<ActiveStats>(() => {
    const sdc = effectiveStructuralPool(
      character,
      sheetActiveForm,
      activeFormState.structuralDamageCapacity,
    )
    return {
      hitPoints: activeFormState.hitPoints,
      structuralDamageCapacity: sdc,
      featureSdcBonus: sdc.modifierBonus,
      bonuses: liveBonuses,
    }
  }, [
    character,
    sheetActiveForm,
    activeFormState.hitPoints,
    activeFormState.structuralDamageCapacity,
    liveBonuses,
  ])

  const morphusTraitRows = useMemo(
    () => resolveActiveMorphusTraits(rawCharacter),
    [rawCharacter.activeMorphusCharacteristicIds, rawCharacter.morphusTraitSlotResolutions],
  )

  const morphusNaturalAr = useMemo(
    () => stackNaturalArmorFromTraits(morphusTraitRows),
    [morphusTraitRows],
  )

  const morphusPassiveBundle = useMemo(
    () =>
      buildMorphusPassiveBundle(rawCharacter, sheetActiveForm, {
        surfaceType: morphusSurfaceType,
        stanceType: morphusStanceType,
        activeBurstKeys: morphusActiveBurstKeys,
        activeGimmickSwitchKeys: morphusActiveGimmickSwitchKeys,
      }),
    [
      rawCharacter,
      sheetActiveForm,
      morphusSurfaceType,
      morphusStanceType,
      morphusActiveBurstKeys,
      morphusActiveGimmickSwitchKeys,
    ],
  )

  const toggleMorphusBurst = useCallback((burstKey: string) => {
    setMorphusActiveBurstKeys((prev) =>
      prev.includes(burstKey)
        ? prev.filter((k) => k !== burstKey)
        : [...prev, burstKey],
    )
  }, [])

  const toggleMorphusGimmickSwitch = useCallback((switchKey: string) => {
    setMorphusActiveGimmickSwitchKeys((prev) =>
      prev.includes(switchKey)
        ? prev.filter((k) => k !== switchKey)
        : [...prev, switchKey],
    )
  }, [])

  const morphusRelativeArShift = morphusPassiveBundle?.relativeArShift ?? 0

  const morphusDerived = useMemo((): MorphusDerivedSheetSlice | null => {
    if (!morphusPassiveBundle) return null
    return {
      naturalWeapons: morphusPassiveBundle.naturalWeapons,
      weaponTraits: morphusPassiveBundle.weaponTraits,
      companions: morphusPassiveBundle.companions,
      traitNotes: morphusPassiveBundle.traitNotes,
      availableStanceTypes: morphusPassiveBundle.availableStanceTypes,
      stanceType: morphusPassiveBundle.stanceType,
      customSystemRolls: morphusPassiveBundle.customSystemRolls,
      burrowingEngine: morphusPassiveBundle.burrowingEngine,
      externalSensoryObfuscation: morphusPassiveBundle.externalSensoryObfuscation,
      polymorphicTemplates: morphusPassiveBundle.polymorphicTemplates,
      gimmickInventory: morphusPassiveBundle.gimmickInventory,
      disabledNaturalAttackTags: morphusPassiveBundle.disabledNaturalAttackTags,
      variableScaleNotes: morphusPassiveBundle.variableScaleNotes,
      jumpBonuses: morphusPassiveBundle.jumpBonuses,
      swimSpeedModifiers: morphusPassiveBundle.swimSpeedModifiers,
      swimSpeedBonus: morphusPassiveBundle.swimSpeedBonus,
      damageAffinityNotes: morphusPassiveBundle.damageAffinityNotes,
      limbComponents: morphusPassiveBundle.limbComponents,
      activatedAbilities: morphusPassiveBundle.activatedAbilities,
      combatInterceptions: morphusPassiveBundle.combatInterceptions,
      nightvisionRangeFlatBonus: morphusPassiveBundle.nightvisionRangeFlatBonus,
      sensoryFlags: morphusPassiveBundle.sensoryFlags,
      flightEngine: morphusPassiveBundle.flightEngine,
      activeBurstKeys: morphusPassiveBundle.activeBurstKeys,
      gimmickToySwitches: morphusPassiveBundle.gimmickToySwitches,
      activeGimmickSwitchKeys: morphusPassiveBundle.activeGimmickSwitchKeys,
      capabilitySummary: morphusPassiveBundle.capabilitySummary,
      balanceModifierPercent: morphusPassiveBundle.balanceModifierPercent,
      reachPercentBonus: morphusPassiveBundle.reachPercentBonus,
      jumpMultiplier: morphusPassiveBundle.jumpMultiplier,
      minimumJumpFeet: morphusPassiveBundle.minimumJumpFeet,
    }
  }, [morphusPassiveBundle])

  useEffect(() => {
    const available = morphusPassiveBundle?.availableStanceTypes ?? []
    if (!available.length) return
    if (!available.includes(morphusStanceType)) {
      setMorphusStanceType(available[0]!)
    }
  }, [morphusPassiveBundle?.availableStanceTypes, morphusStanceType])

  const sheetPassiveModifiers = useMemo(
    () =>
      aggregateAllPassiveModifiers(rawCharacter, sheetActiveForm, {
        surfaceType: morphusSurfaceType,
        stanceType: morphusStanceType,
        activeBurstKeys: morphusActiveBurstKeys,
        activeGimmickSwitchKeys: morphusActiveGimmickSwitchKeys,
      }),
    [
      rawCharacter,
      sheetActiveForm,
      morphusSurfaceType,
      morphusStanceType,
      morphusActiveBurstKeys,
      morphusActiveGimmickSwitchKeys,
    ],
  )

  const sheetDisplayScalars = useMemo(() => {
    const base = computeDisplayScalars(
      character,
      sheetActiveForm,
      sheetPassiveModifiers,
    )
    const mult = morphusPassiveBundle?.terrainSpdMultiplier ?? 1
    if (mult === 1) return base
    return {
      ...base,
      spd: Math.max(0, Math.floor(base.spd * mult)),
    }
  }, [
    character,
    sheetActiveForm,
    sheetPassiveModifiers,
    morphusPassiveBundle?.terrainSpdMultiplier,
  ])

  const sheetCombatDerived = useMemo(
    () =>
      computeSheetCombatDerived(character, sheetActiveForm, {
        skillName: handToHandCombatProfile.skillName,
        accumulated: handToHandCombatProfile.accumulated,
      }),
    [character, sheetActiveForm, handToHandCombatProfile],
  )

  const isMDC = useMemo(
    () => computeIsMDC(activeFormState),
    [activeFormState],
  )

  const skillSlotMultiplier = useMemo(() => {
    const lib = getLibraryOccById(character.occ.id)
    if (lib) return resolveSkillSlotMultiplier(occSkillSlotPolicy(lib), psychicTier)
    return skillSlotMultiplierForTier(psychicTier)
  }, [character.occ.id, psychicTier])

  const saveVsPsionicsTarget = useMemo(
    () => saveVsPsionicsForTier(psychicTier),
    [psychicTier],
  )

  const saveProfileDerived = useMemo(
    () =>
      computeSaveProfile(
        character,
        sheetActiveForm,
        saveVsPsionicsTarget,
        supportsDualForm,
      ),
    [character, sheetActiveForm, saveVsPsionicsTarget, supportsDualForm],
  )

  const morphusHeightModifiers = useMemo(
    () =>
      sheetActiveForm === 'morphus'
        ? collectMorphusHeightModifiers(morphusTraitRows)
        : [],
    [sheetActiveForm, morphusTraitRows],
  )

  const morphusWeightModifiers = useMemo(
    () =>
      sheetActiveForm === 'morphus'
        ? collectMorphusWeightModifiers(morphusTraitRows)
        : [],
    [sheetActiveForm, morphusTraitRows],
  )

  const identityResolvedHeightInches = useMemo(
    () =>
      resolveIdentityHeightInches(
        rawCharacter.identityProfile,
        morphusHeightModifiers,
      ),
    [rawCharacter.identityProfile, morphusHeightModifiers],
  )

  const identityResolvedWeightLbs = useMemo(
    () =>
      resolveIdentityWeightLbs(
        rawCharacter.identityProfile,
        morphusWeightModifiers,
      ),
    [rawCharacter.identityProfile, morphusWeightModifiers],
  )

  const movementDerived = useMemo(
    () =>
      deriveMovementStats({
        landSpdAttribute: sheetDisplayScalars.spd,
        ps: activeFormState.attributes.ps.score,
        totalHeightInches: identityResolvedHeightInches,
        skills: activeFormState.skills,
        isMorphusActive: sheetActiveForm === 'morphus',
        canSwimPhysically:
          sheetActiveForm !== 'morphus' ||
          !morphusTraitRows.some((t) => t.mobility?.aquaticTraits?.buoyancy === 'sink'),
        swimSpeedModifiers: morphusPassiveBundle?.swimSpeedModifiers,
        jumpBonuses: morphusPassiveBundle?.jumpBonuses,
        jumpMultiplier: morphusPassiveBundle?.jumpMultiplier,
        minimumJumpFeet: morphusPassiveBundle?.minimumJumpFeet,
        flightEngine: morphusPassiveBundle?.flightEngine,
      }),
    [
      sheetDisplayScalars.spd,
      activeFormState.attributes.ps.score,
      identityResolvedHeightInches,
      activeFormState.skills,
      sheetActiveForm,
      morphusTraitRows,
      morphusPassiveBundle,
    ],
  )

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hudDamagePulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const durationPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [vitalityFlash, setVitalityFlash] = useState<VitalityFlashKind>('none')
  const [combatHudDamagePulse, setCombatHudDamagePulse] =
    useState<CombatHudDamagePulse>('none')
  const [durationCheckPulse, setDurationCheckPulse] = useState(false)
  const [apmCurrentRaw, setApmCurrentRaw] = useState(() =>
    computeMaxApm(characterFixture.facade.attributes, characterFixture.level),
  )
  const [activeMeleeDurations, setActiveMeleeDurations] = useState<
    ActiveMeleeDuration[]
  >([])

  const maxApm = useMemo(
    () =>
      computeMaxApm(
        activeFormState.attributes,
        character.level,
        handToHandAttackBonus(handToHandCombatProfile.accumulated),
      ),
    [activeFormState.attributes, character.level, handToHandCombatProfile.accumulated],
  )

  const attacksPerMelee = useMemo<AttacksPerMeleeState>(
    () => ({
      max: maxApm,
      current: Math.min(apmCurrentRaw, maxApm),
    }),
    [apmCurrentRaw, maxApm],
  )

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      if (hudDamagePulseTimerRef.current) {
        clearTimeout(hudDamagePulseTimerRef.current)
      }
      if (durationPulseTimerRef.current) {
        clearTimeout(durationPulseTimerRef.current)
      }
    }
  }, [])

  const triggerVitalityFlash = useCallback((kind: VitalityFlashKind) => {
    if (kind === 'none') return
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setVitalityFlash(kind)
    flashTimerRef.current = setTimeout(() => {
      setVitalityFlash('none')
      flashTimerRef.current = null
    }, 700)
  }, [])

  const triggerCombatHudDamagePulse = useCallback((pulse: CombatHudDamagePulse) => {
    if (pulse === 'none') return
    if (hudDamagePulseTimerRef.current) {
      clearTimeout(hudDamagePulseTimerRef.current)
    }
    setCombatHudDamagePulse(pulse)
    hudDamagePulseTimerRef.current = setTimeout(() => {
      setCombatHudDamagePulse('none')
      hudDamagePulseTimerRef.current = null
    }, 750)
  }, [])

  const spendCombatAction = useCallback((amount = 1) => {
    const cost = Math.max(1, Math.floor(amount))
    setApmCurrentRaw((c) => {
      const cur = Math.min(c, maxApm)
      return cur >= cost ? cur - cost : 0
    })
  }, [maxApm])

  const resetMeleeRound = useCallback(() => {
    setApmCurrentRaw(maxApm)
    setActiveMeleeDurations((prev) =>
      prev
        .map((d) => ({
          ...d,
          roundsRemaining: d.roundsRemaining - 1,
        }))
        .filter((d) => d.roundsRemaining > 0),
    )
    if (durationPulseTimerRef.current) {
      clearTimeout(durationPulseTimerRef.current)
    }
    setDurationCheckPulse(true)
    durationPulseTimerRef.current = setTimeout(() => {
      setDurationCheckPulse(false)
      durationPulseTimerRef.current = null
    }, 5200)
  }, [maxApm])

  const registerActiveMeleeDuration = useCallback(
    (abilityId: string, rounds: number) => {
      setActiveMeleeDurations((prev) => {
        const rest = prev.filter((d) => d.abilityId !== abilityId)
        return [
          ...rest,
          { abilityId, roundsRemaining: Math.max(1, Math.round(rounds)) },
        ]
      })
    },
    [],
  )

  const equipArmor = useCallback(
    (id: string | null) => {
      if (id === null) {
        setEquippedArmorId(null)
        setInventoryItems((prev) =>
          syncArmorAndWeaponFlags(prev, null, readyWeaponIds),
        )
        return
      }
      const row = inventoryItems.find((i) => i.id === id)
      if (!row || row.itemType !== 'armor') return
      if (row.currentSdc <= 0) return
      setEquippedArmorId(id)
      setInventoryItems((prev) =>
        syncArmorAndWeaponFlags(prev, id, readyWeaponIds),
      )
    },
    [inventoryItems, readyWeaponIds],
  )

  const addArmorToInventory = useCallback(
    (piece: {
      name: string
      ar: number
      maxSdc: number
      weightLbs: number
      morphusCompatible?: boolean
      humanSized?: boolean
    }) => {
      const id = `armor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
      const maxSdc = Math.max(1, Math.round(piece.maxSdc))
      const row: Armor = {
        id,
        itemType: 'armor',
        name: piece.name.trim() || 'Unnamed armor',
        weightLbs: Math.max(0, piece.weightLbs),
        ar: Math.max(0, Math.round(piece.ar)),
        maxSdc,
        currentSdc: maxSdc,
        isEquipped: false,
        morphusCompatible: piece.morphusCompatible !== false,
        humanSized: piece.humanSized === true,
      }
      setInventoryItems((prev) =>
        syncArmorAndWeaponFlags(
          [...prev, row],
          equippedArmorId,
          readyWeaponIds,
        ),
      )
    },
    [equippedArmorId, readyWeaponIds],
  )

  const setReadyWeapon = useCallback(
    (slot: 0 | 1, weaponId: string | null) => {
      setReadyWeaponIds(([a, b]) => {
        let next: [string | null, string | null]
        if (weaponId === null) {
          next = slot === 0 ? [null, b] : [a, null]
        } else {
          const row = inventoryItems.find((i) => i.id === weaponId)
          if (!row || row.itemType !== 'weapon') return [a, b]
          const w = row as Weapon
          const bundle = buildMorphusPassiveBundle(rawCharacter, sheetActiveForm, {
            surfaceType: morphusSurfaceType,
            stanceType: morphusStanceType,
            activeBurstKeys: morphusActiveBurstKeys,
            activeGimmickSwitchKeys: morphusActiveGimmickSwitchKeys,
          })
          if (
            bundle &&
            morphusBlocksTwoHandedWeapon(bundle.handCapacity, w.category)
          ) {
            return [a, b]
          }
          next =
            slot === 0
              ? [weaponId, b === weaponId ? null : b]
              : [a === weaponId ? null : a, weaponId]
        }
        setInventoryItems((inv) =>
          syncArmorAndWeaponFlags(inv, equippedArmorId, next),
        )
        return next
      })
    },
    [
      inventoryItems,
      equippedArmorId,
      rawCharacter,
      sheetActiveForm,
      morphusSurfaceType,
      morphusStanceType,
      morphusActiveBurstKeys,
      morphusActiveGimmickSwitchKeys,
    ],
  )

  const spendWeaponAmmo = useCallback(
    (weaponId: string, rounds: number) => {
      const n = Math.max(0, Math.round(rounds))
      if (n <= 0) return
      setInventoryItems((prev) => {
        const next = prev.map((it) => {
          if (it.itemType !== 'weapon' || it.id !== weaponId) return it
          const w = it as Weapon
          if (!w.payload || w.payload.current <= 0) return it
          const spent = Math.min(n, w.payload.current)
          return {
            ...w,
            payload: { ...w.payload, current: w.payload.current - spent },
          }
        })
        return syncArmorAndWeaponFlags(next, equippedArmorId, readyWeaponIds)
      })
    },
    [equippedArmorId, readyWeaponIds],
  )

  const spendWeaponRangedShot = useCallback(
    (weaponId: string) => spendWeaponAmmo(weaponId, 1),
    [spendWeaponAmmo],
  )

  const appendCombatNarrative = useCallback(
    (message: string, tone: CombatNarrativeEntry['tone'] = 'info') => {
      const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setCombatNarrativeLog((prev) =>
        [...prev, { id, message, atMs: Date.now(), tone }].slice(-40),
      )
    },
    [],
  )

  const clearCombatNarrative = useCallback(() => {
    setCombatNarrativeLog([])
  }, [])

  const reloadWeapon = useCallback(
    (weaponId: string): boolean => {
      const row = inventoryItems.find((i) => i.id === weaponId)
      if (!row || row.itemType !== 'weapon') return false
      const w = row as Weapon
      if (!w.payload) return false

      const result = applyReloadFromReserves(w, ammoReserves)
      if (!result) {
        const cat = w.ammoCategory ?? w.ammoPoolKey ?? w.category
        appendCombatNarrative(
          `Click! No ${cat} ammo remaining for ${w.name}.`,
          'failure',
        )
        return false
      }

      setAmmoReserves(result.reserves)
      setInventoryItems((prev) => {
        const next = prev.map((it) =>
          it.id === weaponId ? result.weapon : it,
        )
        return syncArmorAndWeaponFlags(next, equippedArmorId, readyWeaponIds)
      })
      appendCombatNarrative(
        `Reloaded ${w.name} (${result.roundsUsed} round${result.roundsUsed === 1 ? '' : 's'} from ${w.ammoCategory ?? w.ammoPoolKey ?? w.category} reserve).`,
        'success',
      )
      return true
    },
    [
      inventoryItems,
      ammoReserves,
      equippedArmorId,
      readyWeaponIds,
      appendCombatNarrative,
    ],
  )

  const getWeaponBonuses = useCallback(
    (weaponId: string) =>
      lookupWeaponBonuses(
        character,
        sheetActiveForm,
        inventoryItems,
        weaponId,
        handToHandCombatProfile.accumulated,
      ),
    [character, sheetActiveForm, inventoryItems, handToHandCombatProfile.accumulated],
  )

  const addAmmoToReserve = useCallback(
    (category: string, rounds: number) => {
      const n = Math.round(rounds)
      if (!Number.isFinite(n) || n <= 0 || !category.trim()) return
      const key = category.trim()
      setAmmoReserves((prev) => {
        const base = ensureReserveCategory(prev, key)
        return { ...base, [key]: (base[key] ?? 0) + n }
      })
      appendCombatNarrative(
        `Added ${n} round${n === 1 ? '' : 's'} to ${key} ammo reserve.`,
        'success',
      )
    },
    [appendCombatNarrative],
  )

  const dropItem = useCallback(
    (id: string) => {
      const nextEq = equippedArmorId === id ? null : equippedArmorId
      const nextW: [string | null, string | null] = [
        readyWeaponIds[0] === id ? null : readyWeaponIds[0],
        readyWeaponIds[1] === id ? null : readyWeaponIds[1],
      ]
      setEquippedArmorId(nextEq)
      setReadyWeaponIds(nextW)
      setInventoryItems((prev) =>
        syncArmorAndWeaponFlags(
          prev.filter((x) => x.id !== id),
          nextEq,
          nextW,
        ),
      )
    },
    [equippedArmorId, readyWeaponIds],
  )

  const applySdcPriorityVitality = useCallback(
    (opts: {
      mode: 'damage' | 'heal'
      amount: number
      useAttackRollVsArmor?: boolean
      attackRoll?: number
    }) => {
      if (!Number.isFinite(opts.amount) || opts.amount <= 0) return
      const r = applyInventoryAwareSdcVitality(
        character,
        sheetActiveForm,
        inventoryItems,
        equippedArmorId,
        opts,
      )
      if (!r) return
      setRawCharacter(retainCharacterRoot(rawCharacter, r.nextCharacter))
      let nextEq = equippedArmorId
      if (nextEq) {
        const arm = r.nextInventory.find(
          (i) => i.id === nextEq && i.itemType === 'armor',
        ) as Armor | undefined
        if (arm && arm.currentSdc <= 0) nextEq = null
      }
      setEquippedArmorId(nextEq)
      setInventoryItems(
        syncArmorAndWeaponFlags(r.nextInventory, nextEq, readyWeaponIds),
      )
      setTimeout(() => {
        triggerVitalityFlash(r.flashKind)
        if (opts.mode === 'damage' && r.sdcDamageRouting) {
          triggerCombatHudDamagePulse(r.sdcDamageRouting)
        }
      }, 0)
    },
    [
      character,
      rawCharacter,
      sheetActiveForm,
      inventoryItems,
      equippedArmorId,
      readyWeaponIds,
      triggerVitalityFlash,
      triggerCombatHudDamagePulse,
    ],
  )

  const applyCombatVitalityChange = useCallback(
    (change: CombatVitalityChange) => {
      setRawCharacter((prev) => {
        const r = computeCombatVitalityDelta(prev, sheetActiveForm, change)
        if (!r) return prev
        setTimeout(() => {
          triggerVitalityFlash(r.flashKind)
        }, 0)
        return retainCharacterRoot(prev, r.next)
      })
    },
    [sheetActiveForm, triggerVitalityFlash],
  )

  const getVitalityType = useCallback(
    (): VitalityCombatScale => getVitalityTypeFromForm(activeFormState),
    [activeFormState],
  )

  const toggleForm = useCallback(() => {
    if (!characterHasDualForms(character)) return
    setActiveForm((f) => (f === 'facade' ? 'morphus' : 'facade'))
  }, [character])

  const stripPsionicSelections = useCallback((ids: readonly string[]) => {
    return ids.filter((abilityId) => getAbilityById(abilityId)?.category !== 'Psionic')
  }, [])

  const setPsychicTier = useCallback(
    (tier: PsychicTier) => {
      if (gateBypassed) return
      if (occPsychicLocked && tier !== 'master') return
      if (!occPsychicLocked && tier === 'master') return

      setPsychicTierState(tier)
      setRawCharacter((prev) => {
        const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'facade'
        const branch = getFormState(prev, form)
        const tierChanged = prev.creationPsychicTier !== tier
        return {
          ...prev,
          creationPsychicTier: tier,
          creationPsychicTierChosen: true,
          creationPsychicGateMajorAllocation:
            tier === 'major'
              ? tierChanged
                ? undefined
                : prev.creationPsychicGateMajorAllocation
              : undefined,
          selectedAbilities: tierChanged
            ? stripPsionicSelections(prev.selectedAbilities ?? [])
            : prev.selectedAbilities,
          [form]: applyPsychicTierToFormState(branch, tier),
        }
      })
    },
    [activeForm, gateBypassed, occPsychicLocked, stripPsionicSelections],
  )

  const setPsychicGateMajorAllocation = useCallback(
    (allocation: PsychicGateMajorAllocation) => {
      setRawCharacter((prev) => {
        if (prev.creationPsychicGateMajorAllocation === allocation) return prev
        return {
          ...prev,
          creationPsychicGateMajorAllocation: allocation,
          selectedAbilities: stripPsionicSelections(prev.selectedAbilities ?? []),
        }
      })
    },
    [stripPsionicSelections],
  )

  const updateAttribute = useCallback(
    (path: string, value: number | string) => {
      setRawCharacter((prev) => {
        if (typeof value === 'number' && isNumericSheetPath(path)) {
          const applied = tryApplyNumericSheetPath(prev, path, value)
          return applied ? retainCharacterRoot(prev, applied) : prev
        }

        const parsed = parseAttributePath(path, sheetActiveForm)
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
    [sheetActiveForm],
  )

  const setCreationSkillPicks = useCallback(
    (occ: string[], related: CreationSkillPick[], secondary?: CreationSkillPick[]) => {
      setRawCharacter((prev) => ({
        ...prev,
        creationOccSkillIds: occ,
        creationRelatedSkillPicks: related,
        creationRelatedSkillIds: undefined,
        ...(secondary !== undefined
          ? {
              creationSecondarySkillPicks: secondary,
              creationSecondarySkillIds: undefined,
            }
          : {}),
      }))
    },
    [],
  )

  const setCreationHandToHandTier = useCallback((tier: CreationHandToHandTier) => {
    setRawCharacter((prev) => ({ ...prev, creationHandToHandTier: tier }))
  }, [])

  const setSelectedOcc = useCallback(
    (occId: string) => {
      if (!occId.trim()) {
        setPsychicTierState('none')
        setRawCharacter((prev) => clearOccSelectionState(prev, activeForm))
        return
      }
      const lib = getLibraryOccById(occId)
      if (!lib) return
      const race = character.raceId?.trim()
        ? getRaceById(character.raceId)
        : undefined
      if (!raceAllowsOccPick(race)) return
      if (!isOccAllowedForRace(race, lib)) return
      const tier: PsychicTier = lib && getOccById(occId)?.category === 'psychic' ? 'master' : 'none'
      setPsychicTierState(tier)
      setRawCharacter((prev) =>
        applyOccSelectionToCharacterState(prev, occId, { activeForm }),
      )
    },
    [activeForm, rawCharacter.raceId],
  )

  const setOccSpecializationId = useCallback((specializationId: string) => {
    setRawCharacter((prev) => {
      const lib = getLibraryOccById(prev.occ.id)
      if (!lib?.specializations?.length) return prev
      if (!getOccSpecialization(lib, specializationId)) return prev
      const withSpec: CharacterRootState = {
        ...prev,
        ...creationInvalidationPatch(prev, 'specialization'),
        occSpecializationId: specializationId,
      }
      return syncRaceOccFacadeSdc(
        syncCreationAttributeBranches(
          retainCharacterRoot(
            prev,
            applyOccStartingSkillPicks(
              patchCharacterCreationFromOcc(withSpec, lib),
              lib,
            ),
          ),
          lib,
        ),
      )
    })
  }, [])

  const setRaceId = useCallback((raceId: string | null) => {
    if (!raceId?.trim()) {
      setActiveForm('facade')
      setPsychicTierState('none')
      setRawCharacter((prev) => {
        const cleared = clearOccSelectionState(prev, 'facade')
        return syncCreationAttributeBranches(
          syncRaceOccFacadeSdc({
            ...cleared,
            ...creationInvalidationPatch(prev, 'race'),
            raceId: undefined,
            lineage: 'megaversal',
            psychicGateBypassed: resolvePsychicGateBypassed(
              undefined,
              undefined,
              prev.creationGenreId,
            ),
          }),
          undefined,
        )
      })
      return
    }
    const race = getRaceById(raceId)
    if (
      !race ||
      !raceAllowedInCharacterCreation(race, rawCharacter.hostGenreId)
    ) {
      return
    }
    const lineage = raceLineageFromDefinition(race)
    const psTier = mapRaceStrengthToPsTier(race.strengthCategory)
    setActiveForm('facade')
    setRawCharacter((prev) => {
      const withRace = syncRaceOccFacadeSdc({
        ...prev,
        ...creationInvalidationPatch(prev, 'race'),
        raceId: race.id,
        lineage,
        psychicGateBypassed: resolvePsychicGateBypassed(
          race.id,
          prev.occ?.id ? getLibraryOccById(prev.occ.id) : undefined,
          prev.creationGenreId,
        ),
      })

      let next: CharacterRootState = withRace
      if (raceAllowsOccPick(race)) {
        const occRow = prev.occ?.id ? getLibraryOccById(prev.occ.id) : undefined
        if (occRow && isOccAllowedForRace(race, occRow)) {
          next = syncCreationAttributeBranches(withRace, occRow)
        } else {
          next = clearOccSelectionState(withRace, activeForm)
        }
      } else {
        const forcedId = raceForcedOccId(race)
        if (forcedId) {
          next = applyOccSelectionToCharacterState(withRace, forcedId, {
            activeForm,
            invalidateScope: 'race',
            autoMountFromRace: { name: race.name },
          })
        } else {
          next = clearOccSelectionState(withRace, activeForm)
        }
      }

      if (!psTier) return next
      const applyTier = (attrs: Character['facade']['attributes']) => ({
        ...attrs,
        ps: { ...attrs.ps, tier: psTier },
      })
      return {
        ...next,
        facade: {
          ...next.facade,
          attributes: applyTier(next.facade.attributes),
        },
        morphus: {
          ...next.morphus,
          attributes: applyTier(next.morphus.attributes),
        },
      }
    })
    if (!raceAllowsOccPick(race)) {
      const forcedId = raceForcedOccId(race)
      if (forcedId) {
        const def = getOccById(forcedId)
        setPsychicTierState(def?.category === 'psychic' ? 'master' : 'none')
      } else {
        setPsychicTierState('none')
      }
    }
  }, [activeForm, rawCharacter.hostGenreId])

  const commitSpawnVitalityRolls = useCallback((rolls: SpawnVitalityRolls) => {
    setRawCharacter((prev) => {
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
      let next: CharacterRootState = prev
      for (const [path, v] of pairs) {
        const applied = tryApplyNumericSheetPath(next, path, v)
        next = applied ? retainCharacterRoot(prev, applied) : next
      }
      return {
        ...next,
        creationVitalityCommitted: true,
      }
    })
  }, [])

  const setCreationPhase = useCallback((phase: CreationPhase) => {
    setRawCharacter((prev) => ({
      ...prev,
      creationPhase: phase,
      creationForgeTab: legacyPhaseToForgeTab(phase),
    }))
  }, [])

  const setCreationForgeTab = useCallback((tabId: CharacterCreationForgeTabId) => {
    setRawCharacter((prev) => {
      const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
      const occLib = prev.occ?.id ? getLibraryOccById(prev.occ.id) : undefined
      const tier = resolveCreationPsychicTier(prev, psychicTier)
      const occ = occLib
        ? resolveEffectivePalladiumOcc(occLib, prev.occSpecializationId)
        : undefined
      return {
        ...prev,
        creationForgeTab: tabId,
        creationPhase: forgeTabToLegacyPhase(tabId),
        ...morphusLedgerUnlockPatchIfEligible(prev, tabId, race, occ, tier),
      }
    })
  }, [psychicTier])

  const markCreationForgeTabComplete = useCallback(
    (tabId: CharacterCreationForgeTabId) => {
      setRawCharacter((prev) => {
        const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
        const occLib = prev.occ?.id ? getLibraryOccById(prev.occ.id) : undefined
        const tier = resolveCreationPsychicTier(prev, psychicTier)
        const dual = characterHasDualForms(prev)
        let next: CharacterRootState = prev
        if (tabId === 'tab5_finalize') {
          next = applyFacadePendingDiceResolutions(next, race, occLib, {
            supportsDualForm: dual,
            psychicTier: tier,
          })
        } else if (tabId === 'tab6_traits' && dual) {
          next = applyMorphusPendingDiceResolutions(next, race, occLib, {
            supportsDualForm: true,
            psychicTier: tier,
          })
        }
        const ctxAfter = buildCharacterCreationForgeContext(
          { ...next, creationGenreId: next.creationGenreId },
          race,
          occLib,
          tier,
        )
        return {
          ...next,
          ...completeForgeTab(next, tabId, ctxAfter),
        }
      })
    },
    [psychicTier],
  )

  const setTraitForgeStubComplete = useCallback((complete: boolean) => {
    setRawCharacter((prev) => ({
      ...prev,
      creationTraitForgeStubComplete: complete,
    }))
  }, [])

  const patchMorphusForgeState = useCallback(
    (
      patch:
        | Partial<MorphusForgeState>
        | ((prev: MorphusForgeState) => MorphusForgeState),
    ) => {
      setRawCharacter((prev) => {
        const merged = {
          ...defaultMorphusForgeState(),
          ...prev.morphusForgeState,
        }
        const nextState =
          typeof patch === 'function' ? patch(merged) : { ...merged, ...patch }
        const pathChanged =
          typeof patch === 'function' ||
          (patch.path != null && patch.path !== merged.path) ||
          (patch.appearanceEntryId != null &&
            patch.appearanceEntryId !== merged.appearanceEntryId)
        const appearanceChanged =
          typeof patch !== 'function' &&
          patch.appearanceEntryId != null &&
          patch.appearanceEntryId !== merged.appearanceEntryId

        let next: CharacterRootState = {
          ...prev,
          morphusForgeState: nextState,
          ...(pathChanged
            ? {
                creationTraitForgeStubComplete: false,
                morphusForgeSlotState: clearMorphusForgeSlotState(),
                morphusTraitSlotResolutions: [],
                activeMorphusCharacteristicIds: [],
              }
            : appearanceChanged
              ? {
                  creationTraitForgeStubComplete: false,
                  morphusForgeSlotState: clearMorphusForgeSlotState(),
                  morphusTraitSlotResolutions: [],
                  activeMorphusCharacteristicIds: [],
                }
              : {}),
        }
        if (!nextState.baseStatsApplied) {
          next = applyNightbaneMorphusBaseAttributes(next, effectiveOcc ?? undefined)
          next = {
            ...next,
            morphusForgeState: {
              ...(next.morphusForgeState ?? nextState),
              baseStatsApplied: true,
            },
          }
        }
        return next
      })
    },
    [effectiveOcc],
  )

  const setMorphusForgeSubTab = useCallback((tabId: MorphusForgeSubTabId) => {
    patchMorphusForgeState({ activeSubTab: tabId })
  }, [patchMorphusForgeState])

  const markMorphusForgeSubTabComplete = useCallback(
    (tabId: MorphusForgeSubTabId) => {
      setRawCharacter((prev) => {
        const state = { ...defaultMorphusForgeState(), ...prev.morphusForgeState }
        const snapshot =
          tabId === 'crossroads'
            ? morphusCrossroadsSnapshot(state)
            : tabId === 'trait_forge'
              ? morphusTraitForgeSnapshot(state)
              : JSON.stringify({
                  finalized: prev.creationTraitForgeStubComplete === true,
                })
        const marked = markForgeTabComplete(tabId, snapshot, {
          completed: state.subTabCompleted ?? {},
          snapshots: state.subTabSnapshots ?? {},
        })
        return {
          ...prev,
          morphusForgeState: {
            ...state,
            subTabCompleted: marked.completed,
            subTabSnapshots: marked.snapshots,
          },
        }
      })
    },
    [psychicTier, activeRace, effectiveOcc],
  )

  const addMorphusCustomTraitSlot = useCallback((catalogEntryId: string) => {
    const slotId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `morphus-slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setRawCharacter((prev) => ({
      ...prev,
      morphusTraitSlotResolutions: [
        ...(prev.morphusTraitSlotResolutions ?? []),
        {
          slotId,
          catalogEntryId,
          customInstance: {
            displayName: '',
            description: '',
            gmApproved: false,
          },
        },
      ],
    }))
  }, [])

  const setMorphusCustomTraitInstance = useCallback(
    (slotId: string, instance: import('../types').MorphusCustomTraitInstance) => {
      setRawCharacter((prev) => {
        const slots = prev.morphusTraitSlotResolutions
        if (!slots?.length) return prev
        return {
          ...prev,
          morphusTraitSlotResolutions: slots.map((slot) =>
            slot.slotId === slotId ? { ...slot, customInstance: instance } : slot,
          ),
        }
      })
    },
    [],
  )

  const removeMorphusCustomTraitSlot = useCallback((slotId: string) => {
    setRawCharacter((prev) => ({
      ...prev,
      morphusTraitSlotResolutions: (prev.morphusTraitSlotResolutions ?? []).filter(
        (slot) => slot.slotId !== slotId,
      ),
    }))
  }, [])

  const setMorphusHouseRules = useCallback((patch: MorphusHouseRules) => {
    setRawCharacter((prev) => ({
      ...prev,
      morphusHouseRules: {
        ...prev.morphusHouseRules,
        ...patch,
      },
    }))
  }, [])

  const morphusForgeSlotActions = useMemo<SlotActions>(
    () => ({
      onTraitPick: (path, entryId, isCharacteristics) => {
        setRawCharacter((prev) => {
          if (
            !isCharacteristics &&
            morphusTraitPickWouldDuplicate(prev, { kind: 'table', path }, entryId)
          ) {
            return prev
          }
          const cleared = clearMorphusSlotPathState(prev.morphusForgeSlotState, path)
          const next = patchMorphusForgeSlotState(cleared, {
            ...(isCharacteristics
              ? { routingPicks: { [path]: entryId } }
              : { picks: { [path]: entryId } }),
          })
          return updateMorphusForgeSlotState(prev, next)
        })
      },
      onBranchPick: (path, tableId) => {
        setRawCharacter((prev) => {
          const cleared = clearMorphusSlotPathState(prev.morphusForgeSlotState, path)
          const next = patchMorphusForgeSlotState(cleared, {
            branchTableIds: { [path]: tableId },
          })
          return updateMorphusForgeSlotState(prev, next)
        })
      },
      onDiceValue: (path, value) => {
        setRawCharacter((prev) => {
          const parentPath = path.replace(/\/count$/, '')
          const cleared = clearMorphusSlotPathState(prev.morphusForgeSlotState, parentPath)
          const next =
            value == null
              ? cleared
              : patchMorphusForgeSlotState(cleared, {
                  diceValues: { [path]: value },
                })
          return updateMorphusForgeSlotState(prev, next)
        })
      },
      onSubTraitPick: (path, index, tableId) => {
        setRawCharacter((prev) => {
          const subTraitKey = `${path}#${index}`
          if (
            isMorphusSubTraitTablePickBlocked(
              tableId,
              prev.morphusForgeSlotState,
              prev.morphusHouseRules,
              subTraitKey,
            )
          ) {
            return prev
          }
          const subPath = `${path}/sub:${index}`
          const cleared = clearMorphusSlotPathState(prev.morphusForgeSlotState, subPath)
          const next = patchMorphusForgeSlotState(cleared, {
            subTraitPicks: { [`${path}#${index}`]: tableId },
          })
          return updateMorphusForgeSlotState(prev, next)
        })
      },
      onVariantPick: (path, label) => {
        setRawCharacter((prev) => {
          if (morphusTraitPickWouldDuplicate(prev, { kind: 'variant_choice', path }, label)) {
            return prev
          }
          const cleared = clearMorphusSlotPathState(prev.morphusForgeSlotState, path)
          const next = patchMorphusForgeSlotState(cleared, {
            variantPicks: { [path]: label },
          })
          return updateMorphusForgeSlotState(prev, next)
        })
      },
      onCustomTrait: (path, instance) => {
        setRawCharacter((prev) => {
          const next = patchMorphusForgeSlotState(prev.morphusForgeSlotState, {
            customInstances: {
              [path]: sanitizeMorphusCustomTraitInstance(instance),
            },
          })
          return updateMorphusForgeSlotState(prev, next)
        })
      },
      onClearPick: (path) => {
        setRawCharacter((prev) => {
          const next = clearMorphusSlotPathState(prev.morphusForgeSlotState, path)
          return updateMorphusForgeSlotState(prev, next)
        })
      },
    }),
    [],
  )

  const setCreationAttributePoolSlot = useCallback(
    (index: number, value: number | null) => {
      if (index < 0 || index > 7) return
      setRawCharacter((prev) => {
        const pool = [...(prev.creationAttributePool ?? Array(8).fill(null))]
        pool[index] =
          value != null && Number.isFinite(value) ? Math.round(value) : null
        return { ...prev, creationAttributePool: pool }
      })
    },
    [],
  )

  const setCreationAttributeAssignment = useCallback(
    (attr: ForgeAttrKey, poolIndex: number) => {
      if (poolIndex < 0 || poolIndex > 7) return
      setRawCharacter((prev) => {
        const pool = prev.creationAttributePool ?? []
        const value = pool[poolIndex]
        if (value == null || !Number.isFinite(value)) return prev

        const assignments = {
          ...(prev.creationAttributeAssignments ?? {}),
          [attr]: value,
        }
        const poolSlots = { ...(prev.creationAttributePoolSlots ?? {}) }
        for (const key of Object.keys(poolSlots) as ForgeAttrKey[]) {
          if (key !== attr && poolSlots[key] === poolIndex) {
            delete assignments[key]
            delete poolSlots[key]
          }
        }
        poolSlots[attr] = poolIndex

        const occ = getLibraryOccById(prev.occ.id) ?? undefined
        const withAssignments = {
          ...prev,
          creationAttributeAssignments: assignments,
          creationAttributePoolSlots: poolSlots,
        }
        return syncRaceOccFacadeSdc(
          syncCreationAttributeBranches(withAssignments, occ),
        )
      })
    },
    [],
  )

  const setCreationAttributeValue = useCallback(
    (attr: ForgeAttrKey, value: number | null) => {
      setRawCharacter((prev) => {
        const assignments = { ...(prev.creationAttributeAssignments ?? {}) }
        const poolSlots = { ...(prev.creationAttributePoolSlots ?? {}) }

        if (value == null || !Number.isFinite(value)) {
          delete assignments[attr]
          delete poolSlots[attr]
        } else {
          assignments[attr] = Math.round(value)
          delete poolSlots[attr]
        }

        const occ = getLibraryOccById(prev.occ.id) ?? undefined
        const withAssignments = {
          ...prev,
          creationAttributeAssignments: assignments,
          creationAttributePoolSlots: poolSlots,
        }
        return syncRaceOccFacadeSdc(
          syncCreationAttributeBranches(withAssignments, occ),
        )
      })
    },
    [],
  )

  const clearCreationAttributeAssignment = useCallback(
    (attr: ForgeAttrKey) => {
      setRawCharacter((prev) => {
        const assignments = { ...(prev.creationAttributeAssignments ?? {}) }
        delete assignments[attr]
        const poolSlots = { ...(prev.creationAttributePoolSlots ?? {}) }
        delete poolSlots[attr]
        const occ = getLibraryOccById(prev.occ.id) ?? undefined
        return syncCreationAttributeBranches(
          {
            ...prev,
            creationAttributeAssignments: assignments,
            creationAttributePoolSlots: poolSlots,
          },
          occ,
        )
      })
    },
    [],
  )

  const devAutoRollAndAssignAllAttributes = useCallback(() => {
    if (!import.meta.env.DEV) return
    void import('../lib/dev/devAutoAssignCreationAttributes').then(
      ({ buildDevAutoAttributeCreationState }) => {
        setRawCharacter((prev) => {
          const occ = getLibraryOccById(prev.occ.id) ?? undefined
          const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
          const withPool = buildDevAutoAttributeCreationState(
            prev,
            race?.attributes,
            occ,
          )
          return syncRaceOccFacadeSdc(
            syncCreationAttributeBranches(withPool, occ),
          )
        })
      },
    )
  }, [])

  const devMakeAttributeExceptional = useCallback((attr: ForgeAttrKey) => {
    if (!import.meta.env.DEV) return
    void import('../lib/dev/devMakeAttributeExceptional').then(
      ({ buildDevExceptionalAttributeState }) => {
        setRawCharacter((prev) => {
          const occ = getLibraryOccById(prev.occ.id) ?? undefined
          const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
          const withAttr = buildDevExceptionalAttributeState(
            prev,
            attr,
            race?.attributes,
          )
          return syncRaceOccFacadeSdc(
            syncCreationAttributeBranches(withAttr, occ),
          )
        })
      },
    )
  }, [])

  const devAutoFillAllSkillSelections = useCallback(() => {
    if (!import.meta.env.DEV) return
    void import('../lib/dev/devAutoFillCreationSkills').then(
      ({ buildDevAutoFillCreationSkillsState }) => {
        setRawCharacter((prev) => {
          const occ = getLibraryOccById(prev.occ.id)
          if (!occ) return prev
          const tier = resolveCreationPsychicTier(prev, psychicTier)
          return buildDevAutoFillCreationSkillsState(
            prev,
            occ,
            prev.hostGenreId ?? prev.creationGenreId,
            tier,
          )
        })
      },
    )
  }, [psychicTier])

  const devAutoRollAllPendingDice = useCallback(() => {
    if (!import.meta.env.DEV) return
    void import('../lib/dev/devAutoRollPendingDice').then(
      ({ buildAutoRolledPendingDiceResolutions }) => {
        setRawCharacter((prev) => {
          const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
          const occ = getLibraryOccById(prev.occ.id)
          const resolutions = buildAutoRolledPendingDiceResolutions(
            prev,
            race,
            occ,
            {
              supportsDualForm: characterHasDualForms(prev),
              psychicTier: resolveCreationPsychicTier(prev, psychicTier),
            },
          )
          return {
            ...prev,
            creationPendingDiceResolutions: {
              ...(prev.creationPendingDiceResolutions ?? {}),
              ...resolutions,
            },
          }
        })
      },
    )
  }, [psychicTier])

  const devSkipToMorphusCreation = useCallback(() => {
    if (!import.meta.env.DEV) return
    void import('../lib/dev/devSkipToMorphusCreation').then(
      ({ buildDevSkipToMorphusCreationState }) => {
        setActiveForm('facade')
        setPsychicTierState('none')
        setRawCharacter((prev) => buildDevSkipToMorphusCreationState(prev))
      },
    )
  }, [])

  const setCreationOccVariableResolution = useCallback(
    (taskId: string, value: number) => {
      setRawCharacter((prev) => {
        const occ = getLibraryOccById(prev.occ.id) ?? undefined
        const withResolution = {
          ...prev,
          creationOccVariableResolutions: {
            ...(prev.creationOccVariableResolutions ?? {}),
            [taskId]: value,
          },
        }
        return syncRaceOccFacadeSdc(
          syncCreationAttributeBranches(withResolution, occ),
        )
      })
    },
    [],
  )

  const setCreationOccCoreVoucherPick = useCallback(
    (voucherId: string, picks: readonly (CreationSkillPick | null)[]) => {
      setRawCharacter((prev) => {
        const occ = getLibraryOccById(prev.occ.id) ?? undefined
        const voucherPicks = {
          ...(prev.creationOccCoreVoucherPicks ?? {}),
          [voucherId]: picks,
        }
        return {
          ...prev,
          creationOccCoreVoucherPicks: voucherPicks,
          creationOccSkillIds: mergeOccSkillIdsWithVouchers(
            occ,
            prev.occSpecializationId,
            prev.creationOccSkillIds ?? [],
            voucherPicks,
          ),
        }
      })
    },
    [],
  )

  const setCreationOccGrantPickDetail = useCallback(
    (skillId: string, pick: CreationSkillPick | null) => {
      setRawCharacter((prev) => {
        const current = { ...(prev.creationOccGrantPickDetails ?? {}) }
        if (pick == null) {
          delete current[skillId]
        } else {
          current[skillId] = pick
        }
        return {
          ...prev,
          creationOccGrantPickDetails: current,
        }
      })
    },
    [],
  )

  const setCreationPendingDiceResolution = useCallback(
    (entryId: string, value: number) => {
      setRawCharacter((prev) => {
        const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
        const occLib = prev.occ?.id ? getLibraryOccById(prev.occ.id) : undefined
        const tier = resolveCreationPsychicTier(prev, psychicTier)
        return patchPendingDiceResolution(prev, entryId, value, {
          race,
          occ: occLib,
          psychicTier: tier,
          supportsDualForm: characterHasDualForms(prev),
        })
      })
    },
    [psychicTier],
  )

  const setAlignment = useCallback((alignment: string) => {
    setRawCharacter((prev) => ({
      ...prev,
      facade: { ...prev.facade, alignment },
      morphus: { ...prev.morphus, alignment },
    }))
  }, [])

  const setCharacterName = useCallback((name: string) => {
    setRawCharacter((prev) => ({ ...prev, name }))
  }, [])

  const patchIdentityProfile = useCallback((patch: Partial<CharacterIdentityProfile>) => {
    setRawCharacter((prev) => ({
      ...prev,
      identityProfile: {
        ...EMPTY_CHARACTER_IDENTITY_PROFILE,
        ...prev.identityProfile,
        ...patch,
      },
    }))
  }, [])

  const finalizeCharacter = useCallback(() => {
    setRawCharacter((prev) => {
      const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
      const occ = getLibraryOccById(prev.occ.id)
      const dual = characterHasDualForms(prev)
      const tier = prev.psychicGateBypassed ? 'none' : psychicTier
      let next = applyPendingDiceResolutionsToCharacter(prev, race, occ, {
        supportsDualForm: dual,
        psychicTier: tier,
        markVitalityCommitted: true,
      })
      next = applySpawnSheetHandoff(next, {
        psychicTier: resolveCreationPsychicTier(next, psychicTier),
      })
      persistCharacterSave(next)
      return next
    })
  }, [psychicTier, persistCharacterSave])

  const addSelectedAbility = useCallback(
    (id: string) => {
      setRawCharacter(
        (prev) => nextCharacterIfAddAbility(prev, id) ?? prev,
      )
    },
    [],
  )

  const removeSelectedAbility = useCallback((id: string) => {
    setRawCharacter((prev) => {
      const occRow = getLibraryOccById(prev.occ.id)
      const granted = new Set(
        occSupernaturalGrantedAbilityIds(occRow, prev.occSpecializationId),
      )
      if (granted.has(id)) return prev
      return {
        ...prev,
        selectedAbilities: (prev.selectedAbilities ?? []).filter((x) => x !== id),
      }
    })
  }, [])

  const spendEnergy = useCallback(
    (source: 'ppe' | 'isp', amount: number): boolean => {
      if (amount <= 0) return true
      if (source === 'ppe') {
        if (character.ppe.current < amount) return false
      } else {
        if (activeFormState.isp.current < amount) return false
      }

      setRawCharacter((prev) => {
        if (source === 'ppe') {
          if (prev.ppe.current < amount) return prev
          return {
            ...prev,
            ppe: { ...prev.ppe, current: prev.ppe.current - amount },
          }
        }
        const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'facade'
        const branch = getFormState(prev, form)
        if (branch.isp.current < amount) return prev
        return {
          ...prev,
          [form]: {
            ...branch,
            isp: { ...branch.isp, current: branch.isp.current - amount },
          },
        }
      })
      return true
    },
    [character.ppe, activeFormState.isp, activeForm],
  )

  const xpProgress = useMemo(() => {
    if (!character.occ?.xpTable?.floors?.length) {
      return {
        pct: 0,
        floorXp: 0,
        nextThresholdXp: null as number | null,
        cap: LEVEL_CAP,
      }
    }
    const seg = xpProgressTowardNext(
      character.level,
      character.xp,
      character.occ.xpTable,
    )
    return { ...seg, cap: LEVEL_CAP }
  }, [character.level, character.xp, character.occ])

  const pendingLevelUpTarget = useMemo(
    () => levelUpQueue[0] ?? null,
    [levelUpQueue],
  )

  const grantXp = useCallback((amount: number, label = 'XP award') => {
    if (!Number.isFinite(amount) || amount <= 0) return
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setRawCharacter((prev) => {
      if (!prev.occ?.xpTable?.floors?.length) return prev
      const prevXp = prev.xp
      const newXp = prevXp + amount
      const crossed = newlyCrossedLevels(
        prev.level,
        prevXp,
        newXp,
        prev.occ.xpTable,
      )
      if (crossed.length > 0) {
        setLevelUpQueue((q) => mergeLevelQueues(q, crossed))
      }
      return { ...prev, xp: newXp }
    })
    setXpHistory((h) => [...h, { id, amount, label, atMs: Date.now() }].slice(-30))
  }, [])

  const resolveLevelUpRitual = useCallback(
    (hpRoll: number) => {
      const r = Math.round(hpRoll)
      if (!Number.isFinite(r) || r < 1 || r > 6) return
      setLevelUpQueue((q) => {
        const target = q[0]
        if (!target) return q
        setRawCharacter((prev) => {
          if (!prev.occ?.xpTable?.floors?.length) return prev
          return {
            ...bumpAllHitPoints(prev, r),
            level: target,
          }
        })
        setTimeout(() => {
          triggerVitalityFlash('heal')
        }, 0)
        return q.slice(1)
      })
    },
    [triggerVitalityFlash],
  )

  const value = useMemo<CharacterContextValue>(
    () => ({
      viewport,
      character,
      rawCharacter,
      creationGenreId,
      genreSupernaturalAbilitiesDisallowed,
      hostGenreId,
      setHostGenreId,
      derivedInventoryItems,
      saveCharacter,
      loadSavedCharacter,
      startCreation,
      returnToLauncher,
      resetCreation,
      saveCreationForLater,
      canSaveCreationForLater,
      leaveCreationWithoutSaving,
      savedCharacterRows,
      inProgressCharacterRows,
      deleteInProgressCharacter,
      refreshSavedCharacterIndex,
      morphusSurfaceType,
      setMorphusSurfaceType,
      morphusNaturalAr,
      morphusRelativeArShift,
      morphusHandCapacityOccupied:
        morphusPassiveBundle?.handCapacity.occupiesHands ?? 0,
      morphusBlocksTwoHandedWeapons:
        morphusPassiveBundle?.handCapacity.blocksTwoHandedWeapons ?? false,
      morphusStanceType,
      setMorphusStanceType,
      morphusDerived,
      morphusActiveBurstKeys,
      toggleMorphusBurst,
      morphusActiveGimmickSwitchKeys,
      toggleMorphusGimmickSwitch,
      activeForm: sheetActiveForm,
      supportsDualForm,
      morphusLedgerUnlocked,
      activeRace,
      activeOcc,
      effectiveOcc,
      occCreationDerived,
      handToHandCombatProfile,
      raceCanPickOcc,
      shadowOccMountNotice,
      raceStrengthLabel,
      activeFormState,
      activeStats,
      sheetCombatDerived,
      sheetDisplayScalars,
      sheetPassiveModifiers,
      saveProfileDerived,
      movementDerived,
      identityResolvedHeightInches,
      identityResolvedWeightLbs,
      setCharacterName,
      patchIdentityProfile,
      isMDC,
      psychicTier,
      skillSlotMultiplier,
      saveVsPsionicsTarget,
      setPsychicTier,
      setPsychicGateMajorAllocation,
      toggleForm,
      updateAttribute,
      getVitalityType,
      spendEnergy,
      addSelectedAbility,
      removeSelectedAbility,
      setCreationSkillPicks,
      setCreationHandToHandTier,
      setSelectedOcc,
      setOccSpecializationId,
      setRaceId,
      commitSpawnVitalityRolls,
      finalizeCharacter,
      setCreationPhase,
      setCreationForgeTab,
      markCreationForgeTabComplete,
      setTraitForgeStubComplete,
      patchMorphusForgeState,
      setMorphusForgeSubTab,
      markMorphusForgeSubTabComplete,
      addMorphusCustomTraitSlot,
      setMorphusCustomTraitInstance,
      removeMorphusCustomTraitSlot,
      setMorphusHouseRules,
      morphusForgeSlotActions,
      setCreationAttributePoolSlot,
      setCreationAttributeAssignment,
      setCreationAttributeValue,
      clearCreationAttributeAssignment,
      devAutoRollAndAssignAllAttributes: import.meta.env.DEV
        ? devAutoRollAndAssignAllAttributes
        : undefined,
      devMakeAttributeExceptional: import.meta.env.DEV
        ? devMakeAttributeExceptional
        : undefined,
      devAutoFillAllSkillSelections: import.meta.env.DEV
        ? devAutoFillAllSkillSelections
        : undefined,
      devAutoRollAllPendingDice: import.meta.env.DEV
        ? devAutoRollAllPendingDice
        : undefined,
      devSkipToMorphusCreation: import.meta.env.DEV
        ? devSkipToMorphusCreation
        : undefined,
      setCreationOccVariableResolution,
      setCreationOccCoreVoucherPick,
      setCreationOccGrantPickDetail,
      setCreationPendingDiceResolution,
      setAlignment,
      attacksPerMelee,
      spendCombatAction,
      resetMeleeRound,
      activeMeleeDurations,
      registerActiveMeleeDuration,
      applyCombatVitalityChange,
      applySdcPriorityVitality,
      inventoryItems,
      equippedArmorId,
      equippedArmor,
      currentWeightLbs,
      strengthCapacities,
      carryLimitLbs,
      overEncumbered,
      encumbranceSpdNote,
      equipArmor,
      addArmorToInventory,
      dropItem,
      readyWeaponIds,
      readyWeapons,
      setReadyWeapon,
      spendWeaponAmmo,
      spendWeaponRangedShot,
      ammoReserves,
      reloadWeapon,
      getWeaponBonuses,
      addAmmoToReserve,
      combatNarrativeLog,
      appendCombatNarrative,
      clearCombatNarrative,
      vitalityFlash,
      combatHudDamagePulse,
      durationCheckPulse,
      xpProgress,
      xpHistory,
      levelUpQueue,
      pendingLevelUpTarget,
      grantXp,
      resolveLevelUpRitual,
    }),
    [
      viewport,
      character,
      rawCharacter,
      creationGenreId,
      genreSupernaturalAbilitiesDisallowed,
      hostGenreId,
      setHostGenreId,
      derivedInventoryItems,
      saveCharacter,
      loadSavedCharacter,
      startCreation,
      returnToLauncher,
      resetCreation,
      saveCreationForLater,
      canSaveCreationForLater,
      leaveCreationWithoutSaving,
      savedCharacterRows,
      inProgressCharacterRows,
      deleteInProgressCharacter,
      refreshSavedCharacterIndex,
      morphusSurfaceType,
      morphusPassiveBundle,
      morphusNaturalAr,
      morphusRelativeArShift,
      morphusStanceType,
      morphusDerived,
      morphusActiveBurstKeys,
      toggleMorphusBurst,
      morphusActiveGimmickSwitchKeys,
      toggleMorphusGimmickSwitch,
      sheetActiveForm,
      supportsDualForm,
      morphusLedgerUnlocked,
      activeRace,
      activeOcc,
      effectiveOcc,
      occCreationDerived,
      handToHandCombatProfile,
      raceCanPickOcc,
      shadowOccMountNotice,
      raceStrengthLabel,
      activeFormState,
      activeStats,
      sheetCombatDerived,
      sheetDisplayScalars,
      sheetPassiveModifiers,
      saveProfileDerived,
      movementDerived,
      identityResolvedHeightInches,
      identityResolvedWeightLbs,
      setCharacterName,
      patchIdentityProfile,
      isMDC,
      psychicTier,
      skillSlotMultiplier,
      saveVsPsionicsTarget,
      setPsychicTier,
      setPsychicGateMajorAllocation,
      toggleForm,
      updateAttribute,
      getVitalityType,
      spendEnergy,
      addSelectedAbility,
      removeSelectedAbility,
      setCreationSkillPicks,
      setCreationHandToHandTier,
      setSelectedOcc,
      setOccSpecializationId,
      setRaceId,
      commitSpawnVitalityRolls,
      finalizeCharacter,
      setCreationPhase,
      setCreationForgeTab,
      markCreationForgeTabComplete,
      setTraitForgeStubComplete,
      patchMorphusForgeState,
      setMorphusForgeSubTab,
      markMorphusForgeSubTabComplete,
      addMorphusCustomTraitSlot,
      setMorphusCustomTraitInstance,
      removeMorphusCustomTraitSlot,
      setMorphusHouseRules,
      morphusForgeSlotActions,
      setCreationAttributePoolSlot,
      setCreationAttributeAssignment,
      setCreationAttributeValue,
      clearCreationAttributeAssignment,
      devAutoRollAndAssignAllAttributes,
      devMakeAttributeExceptional,
      devAutoFillAllSkillSelections,
      devAutoRollAllPendingDice,
      devSkipToMorphusCreation,
      setCreationOccVariableResolution,
      setCreationOccCoreVoucherPick,
      setCreationOccGrantPickDetail,
      setCreationPendingDiceResolution,
      setAlignment,
      attacksPerMelee,
      spendCombatAction,
      resetMeleeRound,
      activeMeleeDurations,
      registerActiveMeleeDuration,
      applyCombatVitalityChange,
      applySdcPriorityVitality,
      inventoryItems,
      equippedArmorId,
      equippedArmor,
      currentWeightLbs,
      strengthCapacities,
      carryLimitLbs,
      overEncumbered,
      encumbranceSpdNote,
      equipArmor,
      addArmorToInventory,
      dropItem,
      readyWeaponIds,
      readyWeapons,
      setReadyWeapon,
      spendWeaponAmmo,
      spendWeaponRangedShot,
      ammoReserves,
      reloadWeapon,
      getWeaponBonuses,
      addAmmoToReserve,
      combatNarrativeLog,
      appendCombatNarrative,
      clearCombatNarrative,
      vitalityFlash,
      combatHudDamagePulse,
      durationCheckPulse,
      xpProgress,
      xpHistory,
      levelUpQueue,
      pendingLevelUpTarget,
      grantXp,
      resolveLevelUpRitual,
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
