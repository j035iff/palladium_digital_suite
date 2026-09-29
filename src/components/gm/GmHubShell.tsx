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
import { GmHubSettingsDialog } from './GmHubSettingsDialog'
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

function ReturnToLauncherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 3h6v6M10 14 21 3"
      />
    </svg>
  )
}

function SettingsGearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.1.7.7 1.2 1.5 1.3H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
      />
    </svg>
  )
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
  const [settingsOpen, setSettingsOpen] = useState(false)

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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReturnToLauncher}
                title="Return to launcher"
                aria-label="Return to launcher"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400 hover:text-white"
              >
                <ReturnToLauncherIcon />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
                aria-label="Settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400 hover:text-white"
              >
                <SettingsGearIcon />
              </button>
            </div>
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
      <GmHubSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
