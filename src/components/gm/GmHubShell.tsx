import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import { formatGenreSlug } from '../../data/genres'
import { conversionRuleLabel } from '../../lib/gm/campaignForge'
import { activePlaySession } from '../../lib/gm/playSession'
import { GmCastPanel } from './GmCastPanel'
import { GmCombatPanel } from './GmCombatPanel'
import { GmGearPanel } from './GmGearPanel'
import { GmJoinHostChrome } from './GmJoinHostChrome'
import { GmPartyPanel } from './GmPartyPanel'
import { GmSessionsPanel } from './GmSessionsPanel'
import { GmTabBar } from './GmTabBar'
import { UnitsPreferenceToggle } from '../units/UnitsPreferenceToggle'

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
    joinCapability,
    joinListening,
    joinCredentials,
    joinSeats,
    joinUrl,
    joinLanHint,
    joinLastError,
    startJoinListen,
    stopJoinListen,
    kickJoinedDevice,
    refreshJoinProbe,
  } = useGmSession()
  const livePlay = session ? activePlaySession(session) : null
  const canOpen = Boolean(session) && livePlay == null

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div>
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
              {livePlay ? ` · Players see ${livePlay.playerLabel}` : ''} ·
              campaigns stay on this machine
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Open a campaign from the launcher. Join listen needs an open play
              sitting.
            </p>
          )}
        </div>
        <div className="flex min-w-[11rem] flex-col gap-2">
          <UnitsPreferenceToggle tone="launcher" className="self-end" />
          <button
            type="button"
            onClick={returnToLauncher}
            className="rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 hover:text-white"
          >
            Return to launcher
          </button>
          <button
            type="button"
            disabled={!canOpen}
            title={
              !session
                ? 'Open a campaign from the launcher first'
                : livePlay
                  ? 'A session is already open. Close it before opening another.'
                  : 'Players will see this campaign name and today’s date'
            }
            onClick={() => openPlaySession()}
            className="rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            Open Session
          </button>
          {livePlay ? (
            <button
              type="button"
              onClick={() => closePlaySession()}
              className="rounded-lg border border-slate-500 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-300 hover:text-white"
            >
              Close Session
            </button>
          ) : null}
        </div>
      </header>
      {session ? (
        <GmJoinHostChrome
          capability={joinCapability}
          listening={joinListening}
          credentials={joinCredentials}
          seats={joinSeats}
          joinUrl={joinUrl}
          playerLabel={livePlay?.playerLabel ?? null}
          lanHint={joinLanHint}
          onStartListen={() => {
            void refreshJoinProbe().then(() => startJoinListen())
          }}
          onStopListen={() => {
            void stopJoinListen()
          }}
          onKick={kickJoinedDevice}
        />
      ) : null}
      {joinLastError ? (
        <p
          className="border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-[11px] text-red-200"
          role="status"
        >
          {joinLastError}
        </p>
      ) : null}
      <GmTabBar
        mode={hubMode}
        tabId={hubTabId}
        onModeChange={setHubMode}
        onTabChange={setHubTabId}
        campaignOpen={Boolean(session)}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <GmHubWorkspace />
      </div>
    </div>
  )
}
