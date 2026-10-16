import { useEffect, useMemo, useState } from 'react'
import { CreationFlowShell } from '../creation/CreationFlowShell'
import { LevelUpModal } from '../live/LevelUpModal'
import { LiveSheetTabBody } from '../live/LiveSheetTabBody'
import { LiveSheetChromeStrip } from '../live/LiveSheetChromeStrip'
import { LiveSheetTabOverlay } from '../live/LiveSheetTabOverlay'
import { LiveSheetSaveControls } from '../live/LiveSheetSaveControls'
import { SheetJoinTableDrawer } from '../live/SheetJoinTableDrawer'
import { UnsavedEditsDialog } from '../live/UnsavedEditsDialog'
import { useCharacter } from '../../context/CharacterContext'
import { PLAYER_RETURN_LEAVES_TABLE_CONFIRM } from '../../lib/gm/joinTableLeave'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import { shouldGuardLiveSheetLeave } from '../../lib/liveSheetSave'
import {
  liveSheetModeLabel,
  type LiveSheetMode,
  type LiveSheetOverlayTabId,
} from '../../lib/liveSheetTabs'
import { PortalChromeActions } from '../chrome/PortalChromeActions'
import { IdentityHeader } from './IdentityHeader'
import { GmPlayerDmTray } from '../gm/GmPlayerDmTray'
import { JoinedTablePeerRoster } from '../live/JoinedTablePeerRoster'

export function MainLayout() {
  const [spawnSplash, setSpawnSplash] = useState(false)
  const [sheetMode, setSheetMode] = useState<LiveSheetMode>('story')
  /** Overlay drill-down; null = mode Home (Campaigns / Combat) visible. */
  const [overlayTabId, setOverlayTabId] = useState<LiveSheetOverlayTabId | null>(
    null,
  )
  const [unsavedLeaveOpen, setUnsavedLeaveOpen] = useState(false)
  const [joinDrawerOpen, setJoinDrawerOpen] = useState(false)
  const gmClientRuntime = useMemo(() => getSharedGmClientRuntime(), [])
  const [gmClientState, setGmClientState] = useState<GmClientRuntimeState>(() =>
    gmClientRuntime.getState(),
  )
  const {
    character,
    creationGenreId,
    hostGenreId,
    returnToLauncher,
    isLiveSheetDirty,
    saveCharacter,
    discardLiveSheetEdits,
    activeForm,
    activeFormState: form,
    activeStats,
    supportsDualForm,
    toggleForm,
    vitalityFlash,
    levelUpQueue,
    resolveLevelUpRitual,
    psychicTier,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'
  const showCreation = character.isFinalized !== true
  const showIsp = psychicTier !== 'none' || form.isp.maximum > 0

  useEffect(() => gmClientRuntime.subscribe(setGmClientState), [gmClientRuntime])

  const seatedTableName =
    gmClientState.status === 'joined' && gmClientState.hello
      ? gmClientState.hello.campaignName?.trim() ||
        gmClientState.hello.sessionName?.trim() ||
        'Campaign'
      : null

  useEffect(() => {
    if (seatedTableName) setJoinDrawerOpen(false)
  }, [seatedTableName])

  useEffect(() => {
    if (!shouldGuardLiveSheetLeave(character.isFinalized === true, isLiveSheetDirty)) {
      return
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [character.isFinalized, isLiveSheetDirty])

  const leaveSheetToLauncher = (opts?: {
    saveFirst?: boolean
    discardFirst?: boolean
  }) => {
    if (opts?.saveFirst) saveCharacter()
    const runtime = getSharedGmClientRuntime()
    const joined = runtime.getState().status === 'joined'
    if (joined && !window.confirm(PLAYER_RETURN_LEAVES_TABLE_CONFIRM)) {
      return
    }
    if (opts?.discardFirst) discardLiveSheetEdits()
    if (joined) runtime.leave()
    returnToLauncher()
  }

  const requestReturnToLauncher = () => {
    if (
      shouldGuardLiveSheetLeave(character.isFinalized === true, isLiveSheetDirty)
    ) {
      setUnsavedLeaveOpen(true)
      return
    }
    leaveSheetToLauncher()
  }

  const handleUnsavedSaveAndLeave = () => {
    setUnsavedLeaveOpen(false)
    leaveSheetToLauncher({ saveFirst: true })
  }

  const handleUnsavedContinueWithoutSaving = () => {
    setUnsavedLeaveOpen(false)
    leaveSheetToLauncher({ discardFirst: true })
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {spawnSplash ? (
        <div
          className="pds-spawn-splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 px-6 text-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="spawn-splash-title"
        >
          <p
            id="spawn-splash-title"
            className="text-3xl font-black tracking-tight text-amber-200 drop-shadow-lg sm:text-4xl"
          >
            Character Spawned!
          </p>
          <p className="mt-4 max-w-md text-sm text-slate-200">
            Record locked — loading live sheet.
          </p>
        </div>
      ) : null}
      {!showCreation ? (
        <div
          className="sticky top-0 z-20 shrink-0 backdrop-blur-sm"
          aria-label="Persistent character core"
        >
          <header
            className="border-b-2 px-4 py-3"
            style={{
              borderColor: morphusActive ? 'rgb(139 92 246)' : 'rgb(59 130 246)',
              backgroundColor: morphusActive
                ? 'rgba(15, 23, 42, 0.92)'
                : 'rgba(255, 255, 255, 0.92)',
            }}
          >
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-left">
                <IdentityHeader
                  morphusActive={morphusActive}
                  creationGenreId={creationGenreId}
                  hostGenreId={hostGenreId}
                  collapsed
                  onCollapsedChange={() => {
                    /* Live sheet: summary strip only; details are the Identity tab. */
                  }}
                  showExpandToggle={false}
                />
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <LiveSheetSaveControls
                  dirty={isLiveSheetDirty}
                  onSave={saveCharacter}
                  morphusActive={morphusActive}
                />
                <PortalChromeActions
                  tone={morphusActive ? 'morphus' : 'sheet'}
                  onReturnToLauncher={requestReturnToLauncher}
                />
              </div>
            </div>
          </header>

          <LiveSheetChromeStrip
            morphusActive={morphusActive}
            supportsDualForm={supportsDualForm}
            onToggleForm={toggleForm}
            activeOverlayTabId={overlayTabId}
            onSelectOverlayTab={(id) => {
              setOverlayTabId((cur) => (cur === id ? null : id))
            }}
            vitalityFlash={vitalityFlash}
            tableName={seatedTableName}
            onJoinTable={() => {
              setOverlayTabId(null)
              setJoinDrawerOpen(true)
            }}
            quickRef={{
              hpCurrent: activeStats.hitPoints.current,
              hpMax: activeStats.hitPoints.maximum,
              sdcCurrent: activeStats.structuralDamageCapacity.current,
              sdcMax: activeStats.structuralDamageCapacity.maximum,
              ppeCurrent: character.ppe.current,
              ppeMax: character.ppe.maximum,
              showIsp,
              ispCurrent: form.isp.current,
              ispMax: form.isp.maximum,
            }}
          />

          <div
            className={`border-b-2 px-4 py-2 ${
              morphusActive
                ? 'border-violet-700/80 bg-slate-950/95'
                : 'border-blue-200 bg-white/95'
            }`}
            aria-label="Live sheet mode"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Character sheet mode"
              >
                {(['story', 'combat'] as const).map((mode) => {
                  const active = sheetMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSheetMode(mode)
                        setOverlayTabId(null)
                      }}
                      className={`rounded-full px-5 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                        active
                          ? morphusActive
                            ? 'bg-violet-700 text-white shadow'
                            : 'bg-blue-700 text-white shadow'
                          : morphusActive
                            ? 'border-2 border-violet-500 bg-transparent text-violet-200 hover:bg-violet-900/50'
                            : 'border-2 border-blue-500 bg-white text-blue-800 hover:bg-blue-50'
                      }`}
                    >
                      {liveSheetModeLabel(mode)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {character.isFinalized && levelUpQueue.length > 0 && character.occ?.xpTable?.floors?.length ? (
        <LevelUpModal
          key={levelUpQueue[0]}
          open
          morphus={morphusActive}
          character={character}
          targetLevel={levelUpQueue[0]}
          onConfirm={resolveLevelUpRitual}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showCreation ? (
          <main className="mx-0 flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden p-0 text-left">
            <CreationFlowShell
              onSpawnFinalize={(finalize) => {
                setSpawnSplash(true)
                window.setTimeout(() => {
                  finalize()
                  setSpawnSplash(false)
                }, 1500)
              }}
            />
          </main>
        ) : (
          <main className="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col overflow-y-auto px-4 py-4 text-left">
            <LiveSheetTabBody mode={sheetMode} tabId="home" />
          </main>
        )}
      </div>
      {overlayTabId && !showCreation ? (
        <LiveSheetTabOverlay
          mode={sheetMode}
          tabId={overlayTabId}
          morphusActive={morphusActive}
          supportsDualForm={supportsDualForm}
          onToggleForm={toggleForm}
          onSelectTab={setOverlayTabId}
          onClose={() => setOverlayTabId(null)}
        />
      ) : null}
      {!showCreation ? (
        <SheetJoinTableDrawer
          open={joinDrawerOpen}
          characterId={character.id}
          morphusActive={morphusActive}
          onClose={() => setJoinDrawerOpen(false)}
        />
      ) : null}
      <JoinedTablePeerRoster />
      <GmPlayerDmTray />
      <UnsavedEditsDialog
        open={unsavedLeaveOpen}
        onSave={handleUnsavedSaveAndLeave}
        onContinueWithoutSaving={handleUnsavedContinueWithoutSaving}
        onStay={() => setUnsavedLeaveOpen(false)}
      />
    </div>
  )
}

