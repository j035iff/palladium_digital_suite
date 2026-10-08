import { useEffect, useState } from 'react'
import { CreationFlowShell } from '../creation/CreationFlowShell'
import { LevelUpModal } from '../live/LevelUpModal'
import { LiveSheetTabBody } from '../live/LiveSheetTabBody'
import { LiveSheetChromeStrip } from '../live/LiveSheetChromeStrip'
import { LiveSheetTabOverlay } from '../live/LiveSheetTabOverlay'
import { LiveSheetSaveControls } from '../live/LiveSheetSaveControls'
import { UnsavedEditsDialog } from '../live/UnsavedEditsDialog'
import { useCharacter } from '../../context/CharacterContext'
import { PLAYER_RETURN_LEAVES_TABLE_CONFIRM } from '../../lib/gm/joinTableLeave'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
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
  /** Default collapsed so the Active Zone has room under the sticky core. */
  const [identityCollapsed, setIdentityCollapsed] = useState(true)
  const [sheetMode, setSheetMode] = useState<LiveSheetMode>('story')
  /** Overlay drill-down; null = mode Home (Campaigns / Combat) visible. */
  const [overlayTabId, setOverlayTabId] = useState<LiveSheetOverlayTabId | null>(
    null,
  )
  const [unsavedLeaveOpen, setUnsavedLeaveOpen] = useState(false)
  const {
    character,
    creationGenreId,
    hostGenreId,
    returnToLauncher,
    isLiveSheetDirty,
    saveCharacter,
    discardLiveSheetEdits,
    morphusSurfaceType,
    setMorphusSurfaceType,
    morphusStanceType,
    setMorphusStanceType,
    morphusDerived,
    morphusRelativeArShift,
    morphusNaturalAr,
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
                  collapsed={identityCollapsed}
                  onCollapsedChange={setIdentityCollapsed}
                  showExpandToggle={false}
                />
                {!identityCollapsed && morphusActive ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
                      Surface
                      <select
                        value={morphusSurfaceType}
                        onChange={(e) =>
                          setMorphusSurfaceType(
                            e.target.value as 'hard_flat' | 'rough_uneven' | 'soft_fluid',
                          )
                        }
                        className="rounded border border-violet-700 bg-slate-950 px-2 py-0.5 font-mono normal-case text-violet-100"
                      >
                        <option value="hard_flat">Hard / flat</option>
                        <option value="rough_uneven">Rough / uneven</option>
                        <option value="soft_fluid">Soft / fluid</option>
                      </select>
                    </label>
                    {(morphusDerived?.availableStanceTypes.length ?? 0) > 0 ? (
                      <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
                        Stance
                        <select
                          value={morphusStanceType}
                          onChange={(e) =>
                            setMorphusStanceType(
                              e.target.value as typeof morphusStanceType,
                            )
                          }
                          className="rounded border border-violet-700 bg-slate-950 px-2 py-0.5 font-mono normal-case text-violet-100"
                        >
                          {(morphusDerived?.availableStanceTypes ?? []).map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}
                {!identityCollapsed &&
                morphusActive &&
                (morphusRelativeArShift !== 0 || morphusNaturalAr != null) ? (
                  <p
                    className="mt-1 font-mono text-[10px] uppercase tracking-wide opacity-70"
                    style={{ color: '#94a3b8' }}
                  >
                    {morphusRelativeArShift !== 0
                      ? `Morphus A.R. ${morphusRelativeArShift >= 0 ? '+' : ''}${morphusRelativeArShift}`
                      : ''}
                    {morphusRelativeArShift !== 0 && morphusNaturalAr != null
                      ? ' · '
                      : ''}
                    {morphusNaturalAr != null ? `natural A.R. ${morphusNaturalAr}` : ''}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={
                    morphusActive
                      ? 'shrink-0 rounded-md border-2 border-violet-300 bg-violet-800 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-700'
                      : 'shrink-0 rounded-md border-2 border-blue-600 bg-blue-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'
                  }
                  aria-expanded={!identityCollapsed}
                  aria-controls="identity-header-details"
                  onClick={() => setIdentityCollapsed((value) => !value)}
                >
                  {identityCollapsed ? 'Expand' : 'Minimize'}
                </button>
                <LiveSheetSaveControls
                  dirty={isLiveSheetDirty}
                  onSave={saveCharacter}
                  morphusActive={morphusActive}
                />
                <PortalChromeActions
                  tone={morphusActive ? 'morphus' : 'sheet'}
                  onReturnToLauncher={requestReturnToLauncher}
                />
                {supportsDualForm ? (
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="shrink-0 rounded-lg border-4 px-4 py-2 text-sm font-bold uppercase tracking-wide shadow-lg outline-none ring-offset-2 focus-visible:ring-4"
                    style={{
                      borderColor: morphusActive ? '#fbbf24' : '#0f172a',
                      backgroundColor: morphusActive ? '#4c1d95' : '#eff6ff',
                      color: morphusActive ? '#fef9c3' : '#0f172a',
                      ...(morphusActive
                        ? { boxShadow: '0 0 0 2px #7c3aed' }
                        : { boxShadow: '0 0 0 2px #3b82f6' }),
                    }}
                    aria-pressed={morphusActive}
                    aria-label={
                      morphusActive
                        ? 'Become Facade: switch to human presentation'
                        : 'Become Morphus: switch to morphus form'
                    }
                  >
                    Become {morphusActive ? 'Facade' : 'Morphus'}
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <LiveSheetChromeStrip
            morphusActive={morphusActive}
            activeOverlayTabId={overlayTabId}
            onSelectOverlayTab={(id) => {
              setOverlayTabId((cur) => (cur === id ? null : id))
            }}
            vitalityFlash={vitalityFlash}
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={overlayTabId == null}
                  title={
                    overlayTabId == null
                      ? `${liveSheetModeLabel(sheetMode)} Home`
                      : 'Return to mode Home'
                  }
                  onClick={() => setOverlayTabId(null)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide transition ${
                    overlayTabId == null
                      ? morphusActive
                        ? 'bg-violet-600 text-white'
                        : 'bg-blue-600 text-white'
                      : morphusActive
                        ? 'border border-violet-600 text-violet-200 hover:bg-violet-900/40'
                        : 'border border-blue-300 text-blue-800 hover:bg-blue-50'
                  }`}
                >
                  Home
                </button>
                <p
                  className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    morphusActive ? 'text-violet-400/80' : 'text-slate-400'
                  }`}
                >
                  {sheetMode === 'combat' ? 'Combat HUD' : 'Campaigns Home'}
                </p>
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
          onClose={() => setOverlayTabId(null)}
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

