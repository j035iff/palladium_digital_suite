import { useEffect, useMemo, useState } from 'react'
import { CreationFlowShell } from '../creation/CreationFlowShell'
import { LevelUpModal } from '../live/LevelUpModal'
import { LiveSheetTabBody } from '../live/LiveSheetTabBody'
import { LiveSheetChromeStrip } from '../live/LiveSheetChromeStrip'
import { LiveSheetTabOverlay } from '../live/LiveSheetTabOverlay'
import { LiveSheetToolCluster } from '../live/LiveSheetToolCluster'
import { LiveSheetLevelBadge } from '../live/LiveSheetLevelBadge'
import { LiveSheetLevelOverlay } from '../live/LiveSheetLevelOverlay'
import { LiveSheetStatusEffectsOverlay } from '../live/LiveSheetStatusEffectsOverlay'
import { SheetJoinTableDrawer } from '../live/SheetJoinTableDrawer'
import { useCharacter } from '../../context/CharacterContext'
import { PLAYER_RETURN_LEAVES_TABLE_CONFIRM } from '../../lib/gm/joinTableLeave'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import { resolveEffectiveCreationAbilityBudget } from '../../lib/creationAbilityBudget'
import { resolveLiveSheetVitalsChromeFlags } from '../../lib/liveSheetVitalsChrome'
import {
  type LiveSheetMode,
  type LiveSheetOverlayTabId,
} from '../../lib/liveSheetTabs'
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
  const [levelOverlayOpen, setLevelOverlayOpen] = useState(false)
  const [statusEffectsOpen, setStatusEffectsOpen] = useState(false)
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
    activeForm,
    activeFormState: form,
    activeStats,
    supportsDualForm,
    toggleForm,
    vitalityFlash,
    levelUpQueue,
    resolveLevelUpRitual,
    psychicTier,
    activeRace,
    effectiveOcc,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'
  const showCreation = character.isFinalized !== true

  const abilityBudget = useMemo(
    () =>
      resolveEffectiveCreationAbilityBudget({
        occ: effectiveOcc,
        raceId: activeRace?.id,
        psychicTier,
        storedBudget: character.creationAbilityBudget,
        creationGenreId: creationGenreId ?? undefined,
        hostGenreId: hostGenreId ?? undefined,
      }),
    [
      effectiveOcc,
      activeRace?.id,
      psychicTier,
      character.creationAbilityBudget,
      creationGenreId,
      hostGenreId,
    ],
  )
  const vitalsFlags = useMemo(
    () =>
      resolveLiveSheetVitalsChromeFlags({
        race: activeRace,
        occ: effectiveOcc,
        abilityBudget,
      }),
    [activeRace, effectiveOcc, abilityBudget],
  )

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

  const leaveSheetToLauncher = () => {
    const runtime = getSharedGmClientRuntime()
    const joined = runtime.getState().status === 'joined'
    if (joined && !window.confirm(PLAYER_RETURN_LEAVES_TABLE_CONFIRM)) {
      return
    }
    if (joined) runtime.leave()
    returnToLauncher()
  }

  const leaveTableStayOnSheet = () => {
    const runtime = getSharedGmClientRuntime()
    if (runtime.getState().status !== 'joined') return
    if (
      !window.confirm(
        `Leave ${seatedTableName ?? 'this table'}? You will stay on this character sheet.`,
      )
    ) {
      return
    }
    runtime.leave()
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
          {/* Layer 1 — Level · identity stack · Join/Portal/Settings */}
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
              <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <LiveSheetLevelBadge
                  level={character.level}
                  morphusActive={morphusActive}
                  open={levelOverlayOpen}
                  onToggle={() => {
                    setStatusEffectsOpen(false)
                    setLevelOverlayOpen((v) => !v)
                  }}
                />
                <div className="min-w-0 flex-1">
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
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <LiveSheetToolCluster
                  tone={morphusActive ? 'morphus' : 'sheet'}
                  seatedTableName={seatedTableName}
                  onJoinTable={() => {
                    setOverlayTabId(null)
                    setLevelOverlayOpen(false)
                    setStatusEffectsOpen(false)
                    setJoinDrawerOpen(true)
                  }}
                  onLeaveTable={leaveTableStayOnSheet}
                  onReturnToLauncher={leaveSheetToLauncher}
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
              setLevelOverlayOpen(false)
              setStatusEffectsOpen(false)
              setOverlayTabId((cur) => (cur === id ? null : id))
            }}
            sheetMode={sheetMode}
            onSelectSheetMode={(mode) => {
              setSheetMode(mode)
              setOverlayTabId(null)
              setLevelOverlayOpen(false)
              setStatusEffectsOpen(false)
            }}
            statusEffectsOpen={statusEffectsOpen}
            onToggleStatusEffects={() => {
              setOverlayTabId(null)
              setLevelOverlayOpen(false)
              setStatusEffectsOpen((v) => !v)
            }}
            vitalityFlash={vitalityFlash}
            quickRef={{
              hpCurrent: activeStats.hitPoints.current,
              hpMax: activeStats.hitPoints.maximum,
              sdcCurrent: activeStats.structuralDamageCapacity.current,
              sdcMax: activeStats.structuralDamageCapacity.maximum,
              ppeCurrent: character.ppe.current,
              ppeMax: character.ppe.maximum,
              showPpe: vitalsFlags.showPpe,
              showIsp: vitalsFlags.showIsp,
              ispCurrent: form.isp.current,
              ispMax: form.isp.maximum,
            }}
          />
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
          <main
            className={`mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col px-4 py-4 text-left ${
              sheetMode === 'combat' ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
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
      {levelOverlayOpen && !showCreation ? (
        <LiveSheetLevelOverlay
          morphusActive={morphusActive}
          onClose={() => setLevelOverlayOpen(false)}
        />
      ) : null}
      {statusEffectsOpen && !showCreation ? (
        <LiveSheetStatusEffectsOverlay
          morphusActive={morphusActive}
          onClose={() => setStatusEffectsOpen(false)}
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
    </div>
  )
}
