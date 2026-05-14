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
import { computeMaxApm } from '../lib/meleeCombat'
import { computeCarryCapacityLbs } from '../lib/carryCapacity'
import { computeCombatVitalityDelta } from '../lib/combatVitalityApply'
import { applyInventoryAwareSdcVitality } from '../lib/inventoryVitalityApply'
import { loadXpHistory, saveXpHistory } from '../lib/xpHistoryPersistence'
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
  equipArmor: (id: string) => void
  dropItem: (id: string) => void
  /** Up to two carried weapons flagged ready for the combat HUD strike row. */
  readyWeaponIds: readonly [string | null, string | null]
  /** Resolved weapon rows for {@link readyWeaponIds} (null if missing or not a weapon). */
  readyWeapons: readonly [Weapon | null, Weapon | null]
  setReadyWeapon: (slot: 0 | 1, weaponId: string | null) => void
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
    characterFixture.occCategory === 'psychic' ? 'master' : 'none',
  )

  const occPsychicLocked = character.occCategory === 'psychic'
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

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    () => [...initialInventoryItems],
  )
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(
    'synth_weave',
  )
  const [readyWeaponIds, setReadyWeaponIds] = useState<
    [string | null, string | null]
  >(['vibro_knife', 'ion_pistol'])

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

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const durationPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [vitalityFlash, setVitalityFlash] = useState<VitalityFlashKind>('none')
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
    (id: string) => {
      const row = inventoryItems.find((i) => i.id === id)
      if (!row || row.itemType !== 'armor') return
      if (row.currentSDC <= 0 || row.destroyed === true) return
      setEquippedArmorId(id)
    },
    [inventoryItems],
  )

  const setReadyWeapon = useCallback(
    (slot: 0 | 1, weaponId: string | null) => {
      setReadyWeaponIds(([a, b]) => {
        if (weaponId === null) {
          return slot === 0 ? [null, b] : [a, null]
        }
        const row = inventoryItems.find((i) => i.id === weaponId)
        if (!row || row.itemType !== 'weapon') return [a, b]
        if (slot === 0) {
          return [weaponId, b === weaponId ? null : b]
        }
        return [a === weaponId ? null : a, weaponId]
      })
    },
    [inventoryItems],
  )

  const dropItem = useCallback((id: string) => {
    setInventoryItems((prev) => prev.filter((x) => x.id !== id))
    setEquippedArmorId((eq) => (eq === id ? null : eq))
    setReadyWeaponIds(([a, b]) => [
      a === id ? null : a,
      b === id ? null : b,
    ])
  }, [])

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
      setInventoryItems(r.nextInventory)
      setTimeout(() => {
        triggerVitalityFlash(r.flashKind)
      }, 0)
    },
    [
      character,
      activeForm,
      inventoryItems,
      equippedArmorId,
      triggerVitalityFlash,
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

  const xpProgress = useMemo(() => {
    const kind = character.xpTableKind ?? 'standard'
    const seg = xpProgressTowardNext(character.level, character.xp, kind)
    return { ...seg, cap: LEVEL_CAP }
  }, [character.level, character.xp, character.xpTableKind])

  const pendingLevelUpTarget = useMemo(
    () => levelUpQueue[0] ?? null,
    [levelUpQueue],
  )

  const grantXp = useCallback((amount: number, label = 'XP award') => {
    if (!Number.isFinite(amount) || amount <= 0) return
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setCharacter((prev) => {
      const kind = prev.xpTableKind ?? 'standard'
      const prevXp = prev.xp
      const newXp = prevXp + amount
      const crossed = newlyCrossedLevels(prev.level, prevXp, newXp, kind)
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
        setCharacter((prev) => ({
          ...bumpAllHitPoints(prev, r),
          level: target,
        }))
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
      dropItem,
      readyWeaponIds,
      readyWeapons,
      setReadyWeapon,
      vitalityFlash,
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
      dropItem,
      readyWeaponIds,
      readyWeapons,
      setReadyWeapon,
      vitalityFlash,
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
