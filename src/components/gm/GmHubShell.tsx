import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import { formatGenreSlug } from '../../data/genres'
import { conversionRuleLabel } from '../../lib/gm/campaignForge'
import { GM_RETURN_CLOSES_TABLE_CONFIRM } from '../../lib/gm/joinTableLeave'
import { activePlaySession } from '../../lib/gm/playSession'
import {
  hubTableControlClickAction,
  hubTableControlDisabledReason,
  hubTableControlKind,
  hubTableControlLabel,
  playersPanelAfterCloseTable,
  playersPanelAfterPointerLeave,
  playersPanelAfterTableOpenClick,
  playersPanelForTableOpenState,
} from '../../lib/gm/hubTableChrome'
import { GmCastPanel } from './GmCastPanel'
import { GmCombatPanel } from './GmCombatPanel'
import { GmGearPanel } from './GmGearPanel'
import { PortalChromeActions } from '../chrome/PortalChromeActions'
import { GmJoinHostChrome } from './GmJoinHostChrome'
import { GmPartyPanel } from './GmPartyPanel'
import { GmSessionsPanel } from './GmSessionsPanel'
import { GmTabBar } from './GmTabBar'

function GmHubWorkspace() {
  const { hubMode, hubTabId } = useGmSession()

  if (hubTabId === 'party') return <GmPartyPanel />
  if (hubTabId === 'cast') return <GmCastPanel />
  if (hubTabId === 'gear') return <GmGearPanel />
  if (hubMode === 'combat') return <GmCombatPanel />
  return <GmSessionsPanel />
}

export function GmHubShell() {
  const { returnToLauncher } = useCharacter()
  const {
    hubMode,
    setHubMode,
    hubTabId,
    setHubTabId,
    session,
    openPlaySession,
    closePlaySession,
    joinListening,
    joinSeats,
    joinLanHint,
    joinLastError,
    kickJoinedDevice,
    partyTabBlink,
    partySlices,
  } = useGmSession()
  const [playersPanelExpanded, setPlayersPanelExpanded] = useState(false)

  const livePlay = session ? activePlaySession(session) : null
  const tableOpen = livePlay != null
  const controlKind = hubTableControlKind(tableOpen)
  const controlDisabledReason = hubTableControlDisabledReason({
    campaignOpen: Boolean(session),
    tableOpen,
  })
  const canPublish = controlDisabledReason == null && !tableOpen
  const panelExpanded = playersPanelForTableOpenState(
    tableOpen,
    playersPanelExpanded,
  )

  useEffect(() => {
    if (!tableOpen) setPlayersPanelExpanded(false)
  }, [tableOpen])

  const characterNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const slice of partySlices) {
      map.set(slice.characterId, slice.name)
    }
    return map
  }, [partySlices])

  const handleReturnToLauncher = () => {
    if (tableOpen) {
      if (!window.confirm(GM_RETURN_CLOSES_TABLE_CONFIRM)) return
      closePlaySession()
    }
    returnToLauncher()
  }

  const handleTableControlClick = () => {
    const action = hubTableControlClickAction({
      tableOpen,
      canPublish,
    })
    if (action === 'publish') {
      void openPlaySession()
      return
    }
    if (action === 'toggle_players_panel') {
      setPlayersPanelExpanded((prev) => playersPanelAfterTableOpenClick(prev))
    }
  }

  const handleCloseTable = () => {
    setPlayersPanelExpanded(playersPanelAfterCloseTable())
    closePlaySession()
  }

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="shrink-0 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/90">
              Gamemaster Hub
            </p>
            <h1 className="text-xl font-black tracking-wide text-white sm:text-2xl">
              {session?.name ?? 'No campaign open'}
            </h1>
            {session ? (
              <p className="text-[11px] text-slate-400">
                Host {formatGenreSlug(session.hostGenreId)} ·{' '}
                {conversionRuleLabel(session.conversionPolicy)}
                {livePlay ? ` · Table open` : ''} · campaigns stay on this
                machine
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Open a campaign from the launcher. Open Table publishes the
                sitting on the LAN.
              </p>
            )}
            <div className="mt-3">
              <GmTabBar
                mode={hubMode}
                tabId={hubTabId}
                onModeChange={setHubMode}
                onTabChange={setHubTabId}
                campaignOpen={Boolean(session)}
                partyTabBlink={partyTabBlink}
              />
            </div>
          </div>

          <div
            className="relative flex shrink-0 flex-col items-end gap-2"
            onMouseLeave={() => {
              if (panelExpanded) {
                setPlayersPanelExpanded(playersPanelAfterPointerLeave())
              }
            }}
          >
            <PortalChromeActions onReturnToLauncher={handleReturnToLauncher} />
            <button
              type="button"
              disabled={controlDisabledReason != null}
              title={
                controlDisabledReason ??
                (tableOpen
                  ? 'Show players in this session'
                  : 'Publish this campaign on the LAN (open sitting + start listen)')
              }
              aria-expanded={tableOpen ? panelExpanded : undefined}
              onClick={handleTableControlClick}
              className={`rounded-lg px-4 py-2.5 text-[11px] font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${
                tableOpen
                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              {hubTableControlLabel(controlKind)}
            </button>
            {session && tableOpen ? (
              <GmJoinHostChrome
                expanded={panelExpanded}
                listening={joinListening}
                seats={joinSeats}
                campaignName={session.name}
                lanHint={joinLanHint}
                characterNameById={characterNameById}
                onCloseTable={handleCloseTable}
                onKick={kickJoinedDevice}
                onPointerLeaveZone={() =>
                  setPlayersPanelExpanded(playersPanelAfterPointerLeave())
                }
              />
            ) : null}
          </div>
        </div>
      </header>
      {joinLastError ? (
        <p
          className="border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-[11px] text-red-200"
          role="status"
        >
          {joinLastError}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <GmHubWorkspace />
      </div>
    </div>
  )
}
