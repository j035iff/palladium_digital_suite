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
import type { GenreId } from '../data/genres'
import { listEncounterArchetypes } from '../data/library/encounterArchetypeCatalogLoader'
import { listFinalizedCharacters, loadCharacterSave } from '../lib/characterIndex'
import type { CharacterIndexEntry } from '../lib/characterIndex'
import type { CharacterRootState } from '../types'
import { assembleGmCombatRoster } from '../lib/gm/combatRoster'
import type { GmHubMode, GmHubTabId } from '../lib/gm/hubTabs'
import { createNpcFromArchetype } from '../lib/gm/npcInstance'
import {
  addNpcInstance,
  addPartyMember,
  adjustNpcPool,
  emitHorrorFactor,
  lockInitiative,
  patchNpcInstance,
  patchPartyOverlay,
  recordNpcStrike,
  recordPartyHfSave,
  recordPcApmSpendEvent,
  removeNpcInstance,
  removePartyMember,
  renameSession,
  setNpcInitiativeRoll,
  setPartyInitiativeRoll,
  setScratchpad,
  spendNpcApm,
  startNewMeleeRound,
  unlockInitiative,
  createGmSession,
  openPlaySession as stampOpenPlaySession,
  closePlaySession as stampClosePlaySession,
} from '../lib/gm/sessionModel'
import {
  deleteGmSession,
  listGmSessions,
  loadActiveGmSessionId,
  loadGmSession,
  saveGmSession,
  setActiveGmSessionId,
} from '../lib/gm/sessionPersistence'
import {
  buildPartyObserverSlice,
  partyHorrorSaveBonus,
  type GmPartyObserverSlice,
} from '../lib/gm/partyObserver'
import type { ActiveForm } from '../types'
import type {
  GmConversionPolicy,
  GmNpcInstance,
  GmSessionIndexEntry,
  GmSessionRecord,
} from '../lib/gm/sessionTypes'
import {
  blankCampaignForgeDraft,
  campaignForgeReady,
  patchCampaignForgeValue,
  readCampaignForgeConversion,
  readCampaignForgeGenre,
  readCampaignForgeName,
  type CampaignForgeDraft,
  type CampaignForgeOptionId,
} from '../lib/gm/campaignForge'
import { resolveJoinListenCapability } from '../lib/gm/desktopHostCapability'
import {
  createGmHostListenController,
  initialHostListenUiState,
  type GmHostListenController,
  type GmHostListenUiState,
} from '../lib/gm/gmHostListenController'
import { loadCachedJoinedCharacter } from '../lib/gm/sessionPartyCache'
import { activePlaySession } from '../lib/gm/playSession'
import type { GmJoinCredentials } from '../lib/gm/sessionJoinCode'
import type { GmSeat } from '../lib/gm/sessionPresence'
import type { GmJoinListenCapability } from '../lib/gm/desktopHostCapability'

type GmSessionContextValue = {
  hubMode: GmHubMode
  setHubMode: (mode: GmHubMode) => void
  hubTabId: GmHubTabId
  setHubTabId: (tab: GmHubTabId) => void
  sessionList: GmSessionIndexEntry[]
  session: GmSessionRecord | null
  partySlices: GmPartyObserverSlice[]
  missingPartyIds: string[]
  finalizedCharacters: CharacterIndexEntry[]
  refreshCharacters: () => void
  refreshSessionList: () => void
  campaignForgeDraft: CampaignForgeDraft
  resetCampaignForgeDraft: () => void
  setCampaignForgeValue: (id: CampaignForgeOptionId, value: string) => void
  commitCampaignForge: () => boolean
  createSession: (input: {
    name: string
    hostGenreId: GenreId
    conversionPolicy: GmConversionPolicy
  }) => void
  openSession: (id: string) => void
  removeSession: (id: string) => void
  applySession: (next: GmSessionRecord) => void
  updateScratchpad: (text: string) => void
  updateSessionName: (name: string) => void
  openPlaySession: () => void
  closePlaySession: () => void
  addCharacterToParty: (characterId: string) => void
  dropCharacterFromParty: (characterId: string) => void
  setViewForm: (characterId: string, form: ActiveForm) => void
  setPcInitiative: (characterId: string, d20: number | null) => void
  spawnArchetype: (archetypeId: string, variantId?: string) => void
  dropNpc: (instanceId: string) => void
  setNpcNotes: (instanceId: string, notes: string) => void
  setNpcInit: (instanceId: string, d20: number | null) => void
  tapNpcApm: (instanceId: string) => void
  bumpNpcPool: (instanceId: string, pool: 'hp' | 'sdc', delta: number) => void
  lockInit: () => void
  unlockInit: () => void
  newMeleeRound: () => void
  emitNpcHf: (instanceId: string) => void
  recordPcHfSave: (characterId: string, d20: number) => void
  recordStrike: (instanceId: string, d20: number, strikeBonus: number) => void
  npcById: (instanceId: string) => GmNpcInstance | undefined
  /** Client join host chrome */
  joinCapability: GmJoinListenCapability
  joinListening: boolean
  joinCredentials: GmJoinCredentials | null
  joinSeats: GmSeat[]
  joinUrl: string | null
  joinLanHint: string | null
  joinLastError: string | null
  startJoinListen: () => Promise<void>
  stopJoinListen: () => Promise<void>
  kickJoinedDevice: (deviceId: string) => void
  refreshJoinProbe: () => Promise<void>
}

const GmSessionContext = createContext<GmSessionContextValue | null>(null)

function persist(next: GmSessionRecord): GmSessionRecord {
  saveGmSession(next)
  return next
}

export function GmSessionProvider({ children }: { children: ReactNode }) {
  const [hubMode, setHubModeState] = useState<GmHubMode>('story')
  const [hubTabId, setHubTabId] = useState<GmHubTabId>('home')

  const goToStoryHome = useCallback(() => {
    setHubModeState('story')
    setHubTabId('home')
  }, [])

  const setHubMode = useCallback((mode: GmHubMode) => {
    setHubModeState(mode)
    setHubTabId('home')
  }, [])
  const [sessionList, setSessionList] = useState<GmSessionIndexEntry[]>(() =>
    listGmSessions(),
  )
  const [session, setSession] = useState<GmSessionRecord | null>(() => {
    const active = loadActiveGmSessionId()
    return active ? loadGmSession(active) : null
  })
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const [finalizedCharacters, setFinalizedCharacters] = useState<
    CharacterIndexEntry[]
  >(() => listFinalizedCharacters())

  const [campaignForgeDraft, setCampaignForgeDraft] = useState<CampaignForgeDraft>(
    () => blankCampaignForgeDraft(),
  )

  const [joinUi, setJoinUi] = useState<GmHostListenUiState>(() =>
    initialHostListenUiState(),
  )
  const joinControllerRef = useRef<GmHostListenController | null>(null)

  const refreshList = useCallback(() => {
    setSessionList(listGmSessions())
  }, [])

  const refreshSessionList = refreshList

  const refreshCharacters = useCallback(() => {
    setFinalizedCharacters(listFinalizedCharacters())
  }, [])

  const applySession = useCallback((next: GmSessionRecord) => {
    setSession(persist(next))
    setSessionList(listGmSessions())
  }, [])

  const patchSession = useCallback((fn: (prev: GmSessionRecord) => GmSessionRecord) => {
    setSession((prev) => {
      if (!prev) return prev
      return persist(fn(prev))
    })
    setSessionList(listGmSessions())
  }, [])

  useEffect(() => {
    const controller = createGmHostListenController(
      {
        getSession: () => sessionRef.current,
        applySession: (next) => {
          setSession(persist(next))
          setSessionList(listGmSessions())
        },
        applyPcInitiative: (characterId, d20) => {
          setSession((prev) => {
            if (!prev) return prev
            return persist(setPartyInitiativeRoll(prev, characterId, d20))
          })
        },
        applyPcHfSave: (characterId, d20) => {
          setSession((prev) => {
            if (!prev) return prev
            const save =
              loadCharacterSave(characterId) ??
              (loadCachedJoinedCharacter(prev.id, characterId) as CharacterRootState | null)
            if (!save) return prev
            const overlay = prev.partyOverlays[characterId]
            const bonus = partyHorrorSaveBonus(
              save,
              prev.hostGenreId,
              overlay?.viewForm ?? 'primary',
              Boolean(prev.combat.activeHfEmit?.useNightbaneHorrorFactor),
            )
            const label =
              typeof save.name === 'string' && save.name.trim()
                ? save.name.trim()
                : characterId
            const result = recordPartyHfSave(prev, characterId, label, d20, bonus)
            return result ? persist(result.session) : prev
          })
        },
        applyPcApmSpend: (characterId, actions) => {
          setSession((prev) => {
            if (!prev) return prev
            const save =
              loadCharacterSave(characterId) ??
              (loadCachedJoinedCharacter(prev.id, characterId) as CharacterRootState | null)
            const label =
              save && typeof save.name === 'string' && save.name.trim()
                ? save.name.trim()
                : characterId
            return persist(recordPcApmSpendEvent(prev, characterId, label, actions))
          })
        },
        applyPartySnapshot: (characterId, label) => {
          setSession((prev) => {
            if (!prev) return prev
            return persist(addPartyMember(prev, characterId, label))
          })
        },
      },
      setJoinUi,
    )
    joinControllerRef.current = controller
    void controller.refreshCapabilityProbe()
    return () => {
      void controller.dispose()
      joinControllerRef.current = null
    }
  }, [])

  const createSession = useCallback(
    (input: {
      name: string
      hostGenreId: GenreId
      conversionPolicy: GmConversionPolicy
    }) => {
      const created = createGmSession(input)
      applySession(created)
      goToStoryHome()
    },
    [applySession, goToStoryHome],
  )

  const resetCampaignForgeDraft = useCallback(() => {
    setCampaignForgeDraft(blankCampaignForgeDraft())
  }, [])

  const setCampaignForgeValue = useCallback(
    (id: CampaignForgeOptionId, value: string) => {
      setCampaignForgeDraft((prev) => patchCampaignForgeValue(prev, id, value))
    },
    [],
  )

  const commitCampaignForge = useCallback(() => {
    const takenNames = listGmSessions().map((row) => row.name)
    if (!campaignForgeReady(campaignForgeDraft, { takenNames })) return false
    const name = readCampaignForgeName(campaignForgeDraft)
    const hostGenreId = readCampaignForgeGenre(campaignForgeDraft)
    const conversionPolicy = readCampaignForgeConversion(campaignForgeDraft)
    if (!hostGenreId || !conversionPolicy) return false
    const created = createGmSession({
      name,
      hostGenreId,
      conversionPolicy,
    })
    applySession(created)
    setCampaignForgeDraft(blankCampaignForgeDraft())
    goToStoryHome()
    return true
  }, [applySession, campaignForgeDraft, goToStoryHome])

  const openSession = useCallback((id: string) => {
    const loaded = loadGmSession(id)
    if (!loaded) return
    setActiveGmSessionId(id)
    setSession(loaded)
    goToStoryHome()
  }, [goToStoryHome])

  const removeSession = useCallback(
    (id: string) => {
      deleteGmSession(id)
      if (session?.id === id) setSession(null)
      refreshList()
    },
    [session?.id, refreshList],
  )

  const partyLoad = useMemo(() => {
    if (!session) return { slices: [] as GmPartyObserverSlice[], missing: [] as string[] }
    const slices: GmPartyObserverSlice[] = []
    const missing: string[] = []
    for (const id of session.partyCharacterIds) {
      const save =
        loadCharacterSave(id) ??
        (loadCachedJoinedCharacter(session.id, id) as CharacterRootState | null)
      if (!save) {
        missing.push(id)
        continue
      }
      const overlay = session.partyOverlays[id]
      slices.push(
        buildPartyObserverSlice(
          save,
          session.hostGenreId,
          session.conversionPolicy,
          overlay?.viewForm ?? 'primary',
        ),
      )
    }
    return { slices, missing }
  }, [session])

  const updateScratchpad = useCallback(
    (text: string) => {
      patchSession((s) => setScratchpad(s, text))
    },
    [patchSession],
  )

  const updateSessionName = useCallback(
    (name: string) => {
      patchSession((s) => renameSession(s, name))
    },
    [patchSession],
  )

  const openPlaySession = useCallback(() => {
    patchSession((s) => stampOpenPlaySession(s))
  }, [patchSession])

  const closePlaySession = useCallback(() => {
    void joinControllerRef.current?.stopListen('Play sitting closed.')
    patchSession((s) => stampClosePlaySession(s))
  }, [patchSession])

  const startJoinListen = useCallback(async () => {
    const result = await joinControllerRef.current?.startListen()
    if (result && !result.ok) {
      setJoinUi((prev) => ({ ...prev, lastError: result.reason }))
    }
  }, [])

  const stopJoinListen = useCallback(async () => {
    await joinControllerRef.current?.stopListen('Listener stopped by GM.')
  }, [])

  const kickJoinedDevice = useCallback((deviceId: string) => {
    joinControllerRef.current?.kickDevice(deviceId)
  }, [])

  const refreshJoinProbe = useCallback(async () => {
    await joinControllerRef.current?.refreshCapabilityProbe()
  }, [])

  const joinCapability = useMemo(
    () =>
      resolveJoinListenCapability({
        playSessionOpen: Boolean(session && activePlaySession(session)),
        interimHostReachable: joinUi.interimReachable,
      }),
    [session, joinUi.interimReachable],
  )

  const addCharacterToParty = useCallback(
    (characterId: string) => {
      const row = finalizedCharacters.find((c) => c.id === characterId)
      patchSession((s) => addPartyMember(s, characterId, row?.name ?? characterId))
    },
    [patchSession, finalizedCharacters],
  )

  const dropCharacterFromParty = useCallback(
    (characterId: string) => {
      const label =
        partyLoad.slices.find((p) => p.characterId === characterId)?.name ??
        characterId
      patchSession((s) => removePartyMember(s, characterId, label))
    },
    [patchSession, partyLoad.slices],
  )

  const setViewForm = useCallback(
    (characterId: string, form: ActiveForm) => {
      patchSession((s) => patchPartyOverlay(s, characterId, { viewForm: form }))
    },
    [patchSession],
  )

  const setPcInitiative = useCallback(
    (characterId: string, d20: number | null) => {
      patchSession((s) => setPartyInitiativeRoll(s, characterId, d20))
    },
    [patchSession],
  )

  const spawnArchetype = useCallback(
    (archetypeId: string, variantId?: string) => {
      patchSession((s) => {
        const row = listEncounterArchetypes(s.hostGenreId).find(
          (a) => a.id === archetypeId,
        )
        if (!row) return s
        return addNpcInstance(s, createNpcFromArchetype(row, variantId))
      })
    },
    [patchSession],
  )

  const dropNpc = useCallback(
    (instanceId: string) => {
      patchSession((s) => removeNpcInstance(s, instanceId))
    },
    [patchSession],
  )

  const setNpcNotes = useCallback(
    (instanceId: string, notes: string) => {
      patchSession((s) => patchNpcInstance(s, instanceId, { notes }))
    },
    [patchSession],
  )

  const setNpcInit = useCallback(
    (instanceId: string, d20: number | null) => {
      patchSession((s) => setNpcInitiativeRoll(s, instanceId, d20))
    },
    [patchSession],
  )

  const tapNpcApm = useCallback(
    (instanceId: string) => {
      patchSession((s) => spendNpcApm(s, instanceId, 1))
    },
    [patchSession],
  )

  const bumpNpcPool = useCallback(
    (instanceId: string, pool: 'hp' | 'sdc', delta: number) => {
      patchSession((s) => adjustNpcPool(s, instanceId, pool, delta))
    },
    [patchSession],
  )

  const lockInit = useCallback(() => {
    patchSession((s) => {
      const next = lockInitiative(s)
      joinControllerRef.current?.broadcastFromSession(next, 'initiativeLock')
      return next
    })
  }, [patchSession])

  const unlockInit = useCallback(() => {
    patchSession((s) => {
      const next = unlockInitiative(s)
      joinControllerRef.current?.broadcastFromSession(next, 'initiativeUnlock')
      return next
    })
  }, [patchSession])

  const newMeleeRound = useCallback(() => {
    patchSession((s) => {
      const next = startNewMeleeRound(s)
      joinControllerRef.current?.broadcastFromSession(next, 'hfClear')
      joinControllerRef.current?.broadcastFromSession(next, 'initiativeUnlock')
      return next
    })
  }, [patchSession])

  const emitNpcHf = useCallback(
    (instanceId: string) => {
      patchSession((s) => {
        const npc = s.npcs.find((n) => n.instanceId === instanceId)
        if (!npc) return s
        const arch = listEncounterArchetypes(s.hostGenreId).find(
          (a) => a.id === npc.archetypeId,
        )
        const morale = arch?.horrorFactorMorale
        if (!morale) return s
        const next = emitHorrorFactor(
          s,
          npc,
          morale.saveTarget,
          Boolean(morale.useNightbaneHorrorFactor),
          morale.notes,
        )
        joinControllerRef.current?.broadcastFromSession(next, 'hfEmit')
        return next
      })
    },
    [patchSession],
  )

  const recordPcHfSave = useCallback(
    (characterId: string, d20: number) => {
      patchSession((s) => {
        const save =
          loadCharacterSave(characterId) ??
          (loadCachedJoinedCharacter(s.id, characterId) as CharacterRootState | null)
        if (!save) return s
        const overlay = s.partyOverlays[characterId]
        const bonus = partyHorrorSaveBonus(
          save,
          s.hostGenreId,
          overlay?.viewForm ?? 'primary',
          Boolean(s.combat.activeHfEmit?.useNightbaneHorrorFactor),
        )
        const slice = partyLoad.slices.find((p) => p.characterId === characterId)
        const result = recordPartyHfSave(
          s,
          characterId,
          slice?.name ?? characterId,
          d20,
          bonus,
        )
        return result?.session ?? s
      })
    },
    [patchSession, partyLoad.slices],
  )

  const recordStrike = useCallback(
    (instanceId: string, d20: number, strikeBonus: number) => {
      patchSession((s) => {
        const npc = s.npcs.find((n) => n.instanceId === instanceId)
        if (!npc) return s
        return recordNpcStrike(s, npc, d20, strikeBonus)
      })
    },
    [patchSession],
  )

  const npcById = useCallback(
    (instanceId: string) => session?.npcs.find((n) => n.instanceId === instanceId),
    [session],
  )

  const value = useMemo<GmSessionContextValue>(
    () => ({
      hubMode,
      setHubMode,
      hubTabId,
      setHubTabId,
      sessionList,
      session,
      partySlices: partyLoad.slices,
      missingPartyIds: partyLoad.missing,
      finalizedCharacters,
      refreshCharacters,
      refreshSessionList,
      campaignForgeDraft,
      resetCampaignForgeDraft,
      setCampaignForgeValue,
      commitCampaignForge,
      createSession,
      openSession,
      removeSession,
      applySession,
      updateScratchpad,
      updateSessionName,
      openPlaySession,
      closePlaySession,
      addCharacterToParty,
      dropCharacterFromParty,
      setViewForm,
      setPcInitiative,
      spawnArchetype,
      dropNpc,
      setNpcNotes,
      setNpcInit,
      tapNpcApm,
      bumpNpcPool,
      lockInit,
      unlockInit,
      newMeleeRound,
      emitNpcHf,
      recordPcHfSave,
      recordStrike,
      npcById,
      joinCapability,
      joinListening: joinUi.listening,
      joinCredentials: joinUi.credentials,
      joinSeats: joinUi.presence?.seats ?? [],
      joinUrl: joinUi.joinUrl,
      joinLanHint: joinUi.lanHost
        ? `${joinUi.lanHost}:${joinUi.lanPort}`
        : null,
      joinLastError: joinUi.lastError,
      startJoinListen,
      stopJoinListen,
      kickJoinedDevice,
      refreshJoinProbe,
    }),
    [
      hubMode,
      setHubMode,
      hubTabId,
      sessionList,
      session,
      partyLoad,
      finalizedCharacters,
      refreshCharacters,
      refreshSessionList,
      campaignForgeDraft,
      resetCampaignForgeDraft,
      setCampaignForgeValue,
      commitCampaignForge,
      createSession,
      openSession,
      removeSession,
      applySession,
      updateScratchpad,
      updateSessionName,
      openPlaySession,
      closePlaySession,
      addCharacterToParty,
      dropCharacterFromParty,
      setViewForm,
      setPcInitiative,
      spawnArchetype,
      dropNpc,
      setNpcNotes,
      setNpcInit,
      tapNpcApm,
      bumpNpcPool,
      lockInit,
      unlockInit,
      newMeleeRound,
      emitNpcHf,
      recordPcHfSave,
      recordStrike,
      npcById,
      joinCapability,
      joinUi,
      startJoinListen,
      stopJoinListen,
      kickJoinedDevice,
      refreshJoinProbe,
    ],
  )

  return (
    <GmSessionContext.Provider value={value}>{children}</GmSessionContext.Provider>
  )
}

export function useGmSession(): GmSessionContextValue {
  const ctx = useContext(GmSessionContext)
  if (!ctx) {
    throw new Error('useGmSession must be used within GmSessionProvider')
  }
  return ctx
}

/** Roster helper for Combat tab — not on context to keep the value small. */
export function useGmCombatRoster() {
  const { session, partySlices } = useGmSession()
  return useMemo(() => {
    if (!session) return []
    const archetypesByKey = new Map(
      listEncounterArchetypes(session.hostGenreId).map((row) => [
        `${row.catalogGenreId}:${row.id}`,
        row,
      ]),
    )
    return assembleGmCombatRoster({
      session,
      party: partySlices,
      overlays: session.partyOverlays,
      archetypesByKey,
    })
  }, [session, partySlices])
}
