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
import { initialInventoryItems } from '../data/inventoryFixture'
import { getFeatureById, getRaceById } from '../data/library/registry'
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
  tierFromTestPotential,
  rollD100,
} from '../lib/psychicGate'
import type { SpawnVitalityRolls } from '../lib/spawnFinalVitality'
import { rollFacadeSdcMaximum } from '../lib/spawnFinalVitality'
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
  listSavedCharacters,
  loadCharacterSave,
  saveCharacterToStorage,
  type CharacterIndexEntry,
} from '../lib/characterIndex'
import { serializeCharacterRootForSave } from '../lib/characterSave'
import {
  createBlankCharacterForGenre,
  ensureCharacterRoot,
  retainCharacterRoot,
} from '../lib/characterRoot'
import {
  deriveInventoryForHost,
  transformCharacterToHostEnvironment,
} from '../utils/genreTransformer'
import { buildMorphusPassiveBundle } from '../lib/morphusPassiveBridge'
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
  CharacterRootState,
  CombatVitalityChange,
  DerivedActiveState,
  DerivedInventoryItem,
  FormState,
  InventoryItem,
  CombatHudDamagePulse,
  CombatNarrativeEntry,
  FeatureModifiers,
  PsychicTier,
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
import {
  occPsychicGateBypassed,
  occSkillSlotPolicy,
} from '../lib/occCatalogEngine'
import {
  abilityPassesOccSupernaturalRules,
  deriveOccCreation,
  occCreationAbilityBudget,
  occStartingSpellLevelCap,
  applyOccStartingSkillPicks,
  patchCharacterCreationFromOcc,
} from '../lib/occCreationDerivation'
import {
  getOccSpecialization,
  resolveEffectivePalladiumOcc,
} from '../lib/occComposition'
import type { PalladiumOcc } from '../types'
import type { Race } from '../types'

export type AppViewport = 'launcher' | 'sheet'

/** Recompute Facade max S.D.C. from race vitals + O.C.C. tags (pre–vitality commit only). */
function syncRaceOccFacadeSdc(prev: CharacterRootState): CharacterRootState {
  if (prev.creationVitalityCommitted) return prev
  const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
  const lib = getLibraryOccById(prev.occ.id)
  if (!race || !lib || race.vitals?.sdc == null) return prev
  const occ = resolveEffectivePalladiumOcc(lib, prev.occSpecializationId)
  const max = rollFacadeSdcMaximum(prev.facade.attributes, { race, occ })
  const cur = Math.min(prev.facade.structuralDamageCapacity.current, max)
  return {
    ...prev,
    facade: {
      ...prev.facade,
      structuralDamageCapacity: {
        ...prev.facade.structuralDamageCapacity,
        maximum: max,
        current: cur,
      },
    },
  }
}

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
  hostGenreId: string
  setHostGenreId: (genreId: string) => void
  derivedInventoryItems: DerivedInventoryItem[]
  saveCharacter: () => void
  loadSavedCharacter: (id: string) => void
  startCreation: (genreId: GenreId) => void
  returnToLauncher: () => void
  savedCharacterRows: CharacterIndexEntry[]
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
  activeForm: ActiveForm
  /** Only Nightbane uses Facade/Morphus; all other races stay on Facade. */
  supportsDualForm: boolean
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
  /** Display label for the race strength scale (sheet / Attribute Forge). */
  raceStrengthLabel: string
  /** Library race id; drives conditional base S.D.C. with O.C.C. tags. */
  setRaceId: (raceId: string | null) => void
  /**
   * Step 5 — apply rolled H.P./S.D.C./P.P.E./I.S.P. in one atomic update (Spawn).
   * Sets creationVitalityCommitted.
   */
  commitSpawnVitalityRolls: (rolls: SpawnVitalityRolls) => void
  /** Locks the sheet and hides creation UI (character_creation.md §5). */
  finalizeCharacter: () => void
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
  const def = getFeatureById(id)
  if (!def) return null
  const selected = prev.selectedAbilities ?? []
  if (selected.includes(id)) return null

  const occRow = getLibraryOccById(prev.occ.id)
  const spellCap = occRow
    ? occStartingSpellLevelCap(occRow)
    : (prev.startingSpellLevelCap ?? 4)
  const cat = featureBudgetCategory(def)
  const spellLevel =
    typeof def.metadata?.level === 'number' ? def.metadata.level : undefined

  if (occRow) {
    const gate = abilityPassesOccSupernaturalRules(occRow, def, spellCap)
    if (!gate.allowed) return null
  } else if (cat === 'Spell' && spellLevel != null && spellLevel > spellCap) {
    return null
  }

  const b = occRow
    ? occCreationAbilityBudget(occRow)
    : (prev.creationAbilityBudget ?? {
        spellSlots: 8,
        psionicSlots: 6,
        talentSlots: 4,
      })
  const countCat = (c: 'Spell' | 'Psionic' | 'Talent') =>
    selected.filter((x) => {
      const f = getFeatureById(x)
      return f != null && featureBudgetCategory(f) === c
    }).length

  if (cat === 'Spell' && countCat('Spell') >= b.spellSlots) return null
  if (cat === 'Psionic' && countCat('Psionic') >= b.psionicSlots) return null
  if (cat === 'Talent' && countCat('Talent') >= b.talentSlots) return null
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
    () => listSavedCharacters(),
  )
  const [levelUpQueue, setLevelUpQueue] = useState<number[]>(() =>
    outstandingLevelUpTargets(INITIAL_CHARACTER_SNAPSHOT),
  )
  const [xpHistory, setXpHistory] = useState<XpGainEvent[]>(() =>
    loadXpHistory(INITIAL_CHARACTER_SNAPSHOT.name),
  )
  const [activeForm, setActiveForm] = useState<ActiveForm>('facade')
  const [morphusSurfaceType, setMorphusSurfaceType] =
    useState<MorphusSurfaceType>('hard_flat')
  const [psychicTier, setPsychicTierState] = useState<PsychicTier>(() =>
    ensureCharacterOcc(INITIAL_CHARACTER_SNAPSHOT).occ.category === 'psychic'
      ? 'master'
      : 'none',
  )

  const occPsychicLocked = rawCharacter.occ.category === 'psychic'
  const gateBypassed = rawCharacter.psychicGateBypassed === true
  const psychicSeedRef = useRef(false)
  const wasFinalizedRef = useRef(false)

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
    setSavedCharacterRows(listSavedCharacters())
  }, [])

  const saveCharacter = useCallback(() => {
    const pristine = serializeCharacterRootForSave(rawCharacter)
    saveCharacterToStorage(pristine)
    refreshSavedCharacterIndex()
  }, [rawCharacter, refreshSavedCharacterIndex])

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
    setViewport('sheet')
    setActiveForm('facade')
    setXpHistory(loadXpHistory(hydrated.name))
    setLevelUpQueue(outstandingLevelUpTargets(hydrated))
  }, [])

  const startCreation = useCallback((genreId: GenreId) => {
    const blank = createBlankCharacterForGenre(genreId)
    setRawCharacter(syncRaceOccFacadeSdc(blank))
    setViewport('sheet')
    setActiveForm('facade')
    setPsychicTierState('none')
    setXpHistory([])
    setLevelUpQueue([])
  }, [])

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
    () => getRaceById(character.raceId ?? DEFAULT_RACE_ID),
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

  const occCreationDerived = useMemo(
    () =>
      activeOcc ? deriveOccCreation(activeOcc, character.occSpecializationId) : null,
    [activeOcc, character.occSpecializationId],
  )

  const raceCanPickOcc = useMemo(
    () => raceAllowsOccPick(activeRace),
    [activeRace],
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
    [rawCharacter.activeMorphusCharacteristicIds],
  )

  const morphusNaturalAr = useMemo(
    () => stackNaturalArmorFromTraits(morphusTraitRows),
    [morphusTraitRows],
  )

  const morphusPassiveBundle = useMemo(
    () =>
      buildMorphusPassiveBundle(
        rawCharacter,
        sheetActiveForm,
        morphusSurfaceType,
      ),
    [rawCharacter, sheetActiveForm, morphusSurfaceType],
  )

  const morphusRelativeArShift = morphusPassiveBundle?.relativeArShift ?? 0

  const sheetPassiveModifiers = useMemo(
    () =>
      aggregateAllPassiveModifiers(
        rawCharacter,
        sheetActiveForm,
        morphusSurfaceType,
      ),
    [rawCharacter, sheetActiveForm, morphusSurfaceType],
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
    () => computeSaveProfile(character, sheetActiveForm, saveVsPsionicsTarget),
    [character, sheetActiveForm, saveVsPsionicsTarget],
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
          const bundle = buildMorphusPassiveBundle(
            rawCharacter,
            sheetActiveForm,
            morphusSurfaceType,
          )
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
    [inventoryItems, equippedArmorId, rawCharacter, sheetActiveForm, morphusSurfaceType],
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

  const setPsychicTier = useCallback(
    (tier: PsychicTier) => {
      if (gateBypassed) return
      if (occPsychicLocked && tier !== 'master') return

      setPsychicTierState(tier)
      setRawCharacter((prev) => {
        const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'facade'
        const branch = getFormState(prev, form)
        return {
          ...prev,
          [form]: applyPsychicTierToFormState(branch, tier),
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
    setRawCharacter((prev) => {
      const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'facade'
      const branch = getFormState(prev, form)
      return {
        ...prev,
        [form]: applyPsychicTierToFormState(branch, tier),
      }
    })
    return roll
  }, [activeForm, gateBypassed, occPsychicLocked])

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
    (occ: string[], related: string[]) => {
      setRawCharacter((prev) => ({
        ...prev,
        creationOccSkillIds: occ,
        creationRelatedSkillIds: related,
      }))
    },
    [],
  )

  const setSelectedOcc = useCallback(
    (occId: string) => {
      const def = getOccById(occId)
      const lib = getLibraryOccById(occId)
      if (!def || !lib) return
      const race = getRaceById(character.raceId ?? DEFAULT_RACE_ID)
      if (!raceAllowsOccPick(race)) return
      if (!isOccAllowedForRace(race, lib)) return
      const tier: PsychicTier = def.category === 'psychic' ? 'master' : 'none'
      setPsychicTierState(tier)
      setRawCharacter((prev) => {
        const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'facade'
        const branch = getFormState(prev, form)
        const nextBranch =
          prev.psychicGateBypassed === true || occPsychicGateBypassed(lib)
            ? branch
            : applyPsychicTierToFormState(branch, tier)
        const withOcc = applyOccStartingSkillPicks(
          patchCharacterCreationFromOcc(
            {
              ...prev,
              [form]: nextBranch,
              occ: snapshotOccForCharacter(def),
              occSpecializationId: undefined,
            },
            lib,
          ),
          lib,
        )
        return syncRaceOccFacadeSdc(
          retainCharacterRoot(prev, withOcc),
        )
      })
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
        occSpecializationId: specializationId,
      }
      return syncRaceOccFacadeSdc(
        retainCharacterRoot(
          prev,
          applyOccStartingSkillPicks(
            patchCharacterCreationFromOcc(withSpec, lib),
            lib,
          ),
        ),
      )
    })
  }, [])

  const setRaceId = useCallback((raceId: string | null) => {
    const id = raceId ?? DEFAULT_RACE_ID
    const race = getRaceById(id)
    const lineage = raceLineageFromDefinition(race)
    const psTier = race ? mapRaceStrengthToPsTier(race.strengthCategory) : undefined
    const psionicNone = race?.psionics.capabilityType === 'none'
    setActiveForm('facade')
    setRawCharacter((prev) => {
      const withRace = syncRaceOccFacadeSdc({
        ...prev,
        raceId: id,
        lineage,
        psychicGateBypassed:
          psionicNone === true ? true : prev.psychicGateBypassed,
      })
      if (!psTier) return withRace
      const applyTier = (attrs: Character['facade']['attributes']) => ({
        ...attrs,
        ps: { ...attrs.ps, tier: psTier },
      })
      return {
        ...withRace,
        facade: {
          ...withRace.facade,
          attributes: applyTier(withRace.facade.attributes),
        },
        morphus: {
          ...withRace.morphus,
          attributes: applyTier(withRace.morphus.attributes),
        },
      }
    })
  }, [])

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

  const finalizeCharacter = useCallback(() => {
    setRawCharacter((prev) => ({ ...prev, isFinalized: true }))
  }, [])

  const addSelectedAbility = useCallback(
    (id: string) => {
      setRawCharacter(
        (prev) => nextCharacterIfAddAbility(prev, id) ?? prev,
      )
    },
    [],
  )

  const removeSelectedAbility = useCallback((id: string) => {
    setRawCharacter((prev) => ({
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
      hostGenreId,
      setHostGenreId,
      derivedInventoryItems,
      saveCharacter,
      loadSavedCharacter,
      startCreation,
      returnToLauncher,
      savedCharacterRows,
      refreshSavedCharacterIndex,
      morphusSurfaceType,
      setMorphusSurfaceType,
      morphusNaturalAr,
      morphusRelativeArShift,
      morphusHandCapacityOccupied:
        morphusPassiveBundle?.handCapacity.occupiesHands ?? 0,
      morphusBlocksTwoHandedWeapons:
        morphusPassiveBundle?.handCapacity.blocksTwoHandedWeapons ?? false,
      activeForm: sheetActiveForm,
      supportsDualForm,
      activeRace,
      activeOcc,
      effectiveOcc,
      occCreationDerived,
      handToHandCombatProfile,
      raceCanPickOcc,
      raceStrengthLabel,
      activeFormState,
      activeStats,
      sheetCombatDerived,
      sheetDisplayScalars,
      sheetPassiveModifiers,
      saveProfileDerived,
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
      setSelectedOcc,
      setOccSpecializationId,
      setRaceId,
      commitSpawnVitalityRolls,
      finalizeCharacter,
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
      hostGenreId,
      setHostGenreId,
      derivedInventoryItems,
      saveCharacter,
      loadSavedCharacter,
      startCreation,
      returnToLauncher,
      savedCharacterRows,
      refreshSavedCharacterIndex,
      morphusSurfaceType,
      morphusPassiveBundle,
      morphusNaturalAr,
      morphusRelativeArShift,
      sheetActiveForm,
      supportsDualForm,
      activeRace,
      activeOcc,
      effectiveOcc,
      occCreationDerived,
      handToHandCombatProfile,
      raceCanPickOcc,
      raceStrengthLabel,
      activeFormState,
      activeStats,
      sheetCombatDerived,
      sheetDisplayScalars,
      sheetPassiveModifiers,
      saveProfileDerived,
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
      setSelectedOcc,
      setOccSpecializationId,
      setRaceId,
      commitSpawnVitalityRolls,
      finalizeCharacter,
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
