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
import { getFeatureById } from '../data/library/registry'
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
import { computeMaxApm } from '../lib/meleeCombat'
import { computeCarryCapacityLbs } from '../lib/carryCapacity'
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
import type {
  ActiveForm,
  ActiveMeleeDuration,
  Armor,
  AttacksPerMeleeState,
  Character,
  CombatVitalityChange,
  FormState,
  InventoryItem,
  CombatHudDamagePulse,
  CombatNarrativeEntry,
  FeatureModifiers,
  PsychicTier,
  VitalityFlashKind,
  Weapon,
  XpGainEvent,
} from '../types'
import { getFormState } from '../types'

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
  character: Character
  activeForm: ActiveForm
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
  /**
   * Step 5 — apply rolled H.P./S.D.C./P.P.E./I.S.P. in one atomic update (Spawn).
   * Sets creationVitalityCommitted.
   */
  commitSpawnVitalityRolls: (rolls: SpawnVitalityRolls) => void
  /** Locks the sheet and hides creation UI (character_creation.md §5). */
  finalizeCharacter: () => void
  /** Live combat — A.P.M. tracker (combat_logic.md §3). */
  attacksPerMelee: AttacksPerMeleeState
  spendCombatAction: () => void
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
  /** Carry limit from active form P.S. score × tier multiple (attribute_and_stat.md §4, combat_logic.md §2). */
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

function ensureCharacterOcc(c: Character): Character {
  if (c.occ?.xpTable?.floors?.length) return c
  const def = getOccById('city_rat')
  if (!def) return c
  return { ...c, occ: snapshotOccForCharacter(def) }
}

function hydrateCharacterFromStorage(base: Character): Character {
  const persisted = loadPersistedAbilityIds(base.name)
  const fromFixture = base.selectedAbilities ?? []
  const meta = loadCharacterMeta(base.name)
  return ensureCharacterOcc({
    ...base,
    selectedAbilities: persisted ?? fromFixture,
    isFinalized: meta?.isFinalized ?? base.isFinalized ?? false,
    creationVitalityCommitted:
      meta?.creationVitalityCommitted ??
      base.creationVitalityCommitted ??
      false,
  })
}

/** Returns updated character if the pick is legal; otherwise null. */
function nextCharacterIfAddAbility(prev: Character, id: string): Character | null {
  const def = getFeatureById(id)
  if (!def) return null
  const selected = prev.selectedAbilities ?? []
  if (selected.includes(id)) return null

  const spellCap = prev.startingSpellLevelCap ?? 4
  const spellLevel =
    typeof def.metadata?.level === 'number' ? def.metadata.level : undefined
  const cat = featureBudgetCategory(def)
  if (cat === 'Spell' && spellLevel != null && spellLevel > spellCap) return null

  const b = prev.creationAbilityBudget ?? {
    spellSlots: 8,
    psionicSlots: 6,
    talentSlots: 4,
  }
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

function bumpAllHitPoints(prev: Character, roll: number): Character {
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
  const [character, setCharacter] = useState<Character>(() =>
    hydrateCharacterFromStorage(characterFixture),
  )
  const [levelUpQueue, setLevelUpQueue] = useState<number[]>(() =>
    outstandingLevelUpTargets(hydrateCharacterFromStorage(characterFixture)),
  )
  const [xpHistory, setXpHistory] = useState<XpGainEvent[]>(() =>
    loadXpHistory(hydrateCharacterFromStorage(characterFixture).name),
  )
  const [activeForm, setActiveForm] = useState<ActiveForm>('facade')
  const [psychicTier, setPsychicTierState] = useState<PsychicTier>(() =>
    ensureCharacterOcc(characterFixture).occ.category === 'psychic'
      ? 'master'
      : 'none',
  )

  const occPsychicLocked = character.occ.category === 'psychic'
  const gateBypassed = character.psychicGateBypassed === true
  const psychicSeedRef = useRef(false)
  const wasFinalizedRef = useRef(false)

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
    saveXpHistory(character.name, xpHistory)
  }, [character.name, xpHistory])

  useEffect(() => {
    const finalized = character.isFinalized === true
    if (finalized && !wasFinalizedRef.current) {
      setLevelUpQueue(outstandingLevelUpTargets(character))
    }
    wasFinalizedRef.current = finalized
  }, [character])

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

  const activeFormState = useMemo(
    () => getFormState(character, activeForm),
    [character, activeForm],
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

  const carryLimitLbs = useMemo(
    () => computeCarryCapacityLbs(activeFormState.attributes.ps),
    [activeFormState.attributes.ps],
  )

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
      activeForm,
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
    activeForm,
    activeFormState.hitPoints,
    activeFormState.structuralDamageCapacity,
    liveBonuses,
  ])

  const sheetPassiveModifiers = useMemo(
    () => aggregateAllPassiveModifiers(character, activeForm),
    [character, activeForm],
  )

  const sheetDisplayScalars = useMemo(
    () => computeDisplayScalars(character, activeForm, sheetPassiveModifiers),
    [character, activeForm, sheetPassiveModifiers],
  )

  const sheetCombatDerived = useMemo(
    () => computeSheetCombatDerived(character, activeForm),
    [character, activeForm],
  )

  const isMDC = useMemo(
    () => computeIsMDC(activeFormState),
    [activeFormState],
  )

  const skillSlotMultiplier = useMemo(() => {
    const lib = getLibraryOccById(character.occ.id)
    if (lib) return resolveSkillSlotMultiplier(lib.skillSlotPolicy, psychicTier)
    return skillSlotMultiplierForTier(psychicTier)
  }, [character.occ.id, psychicTier])

  const saveVsPsionicsTarget = useMemo(
    () => saveVsPsionicsForTier(psychicTier),
    [psychicTier],
  )

  const saveProfileDerived = useMemo(
    () => computeSaveProfile(character, activeForm, saveVsPsionicsTarget),
    [character, activeForm, saveVsPsionicsTarget],
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
    () => computeMaxApm(activeFormState.attributes, character.level),
    [activeFormState.attributes, character.level],
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

  const spendCombatAction = useCallback(() => {
    setApmCurrentRaw((c) => {
      const cur = Math.min(c, maxApm)
      return cur > 0 ? cur - 1 : 0
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
    [inventoryItems, equippedArmorId],
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
    (weaponId: string) => lookupWeaponBonuses(character, activeForm, inventoryItems, weaponId),
    [character, activeForm, inventoryItems],
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
        activeForm,
        inventoryItems,
        equippedArmorId,
        opts,
      )
      if (!r) return
      setCharacter(r.nextCharacter)
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
      activeForm,
      inventoryItems,
      equippedArmorId,
      readyWeaponIds,
      triggerVitalityFlash,
      triggerCombatHudDamagePulse,
    ],
  )

  const applyCombatVitalityChange = useCallback(
    (change: CombatVitalityChange) => {
      setCharacter((prev) => {
        const r = computeCombatVitalityDelta(prev, activeForm, change)
        if (!r) return prev
        setTimeout(() => {
          triggerVitalityFlash(r.flashKind)
        }, 0)
        return r.next
      })
    },
    [activeForm, triggerVitalityFlash],
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

  const setSelectedOcc = useCallback(
    (occId: string) => {
      const def = getOccById(occId)
      const lib = getLibraryOccById(occId)
      if (!def || !lib) return
      const tier: PsychicTier = def.category === 'psychic' ? 'master' : 'none'
      setPsychicTierState(tier)
      setCharacter((prev) => {
        const branch = getFormState(prev, activeForm)
        const nextBranch =
          prev.psychicGateBypassed === true || lib.psychicGateBypassed
            ? branch
            : applyPsychicTierToFormState(branch, tier)
        return {
          ...prev,
          [activeForm]: nextBranch,
          occ: snapshotOccForCharacter(def),
          psychicGateBypassed: lib.psychicGateBypassed ?? prev.psychicGateBypassed,
          occSkillSlotBudget: lib.occSkillSlotBudget ?? prev.occSkillSlotBudget,
          occRelatedSkillSlotBudget:
            lib.occRelatedSkillSlotBudget ?? prev.occRelatedSkillSlotBudget,
          creationAbilityBudget:
            lib.creationAbilityBudget ?? prev.creationAbilityBudget,
          startingSpellLevelCap:
            lib.startingSpellLevelCap ?? prev.startingSpellLevelCap,
          creationOccSkillIds: [...def.startingOccSkillIds],
          creationRelatedSkillIds: [...def.startingRelatedSkillIds],
        }
      })
    },
    [activeForm],
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
        (prev) => nextCharacterIfAddAbility(prev, id) ?? prev,
      )
    },
    [],
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
    setCharacter((prev) => {
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
        setCharacter((prev) => {
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
      character,
      activeForm,
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
      character,
      activeForm,
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
