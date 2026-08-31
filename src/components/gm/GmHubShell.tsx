import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import { formatGenreSlug } from '../../data/genres'
import { conversionRuleLabel } from '../../lib/gm/campaignForge'
import { activePlaySession } from '../../lib/gm/playSession'
import { GmCastPanel } from './GmCastPanel'
import { GmCombatPanel } from './GmCombatPanel'
import { GmPartyPanel } from './GmPartyPanel'
import { GmSessionsPanel } from './GmSessionsPanel'
import { GmTabBar } from './GmTabBar'

function GmHubWorkspace() {
  const { hubMode, hubTabId } = useGmSession()

  if (hubTabId === 'party') return <GmPartyPanel />
  if (hubTabId === 'cast') return <GmCastPanel />
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
              {livePlay ? ` · Players see ${livePlay.playerLabel}` : ''} · local
              only
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Open a campaign from the launcher. LAN / QR join is not in this
              build.
            </p>
          )}
        </div>
        <div className="flex min-w-[11rem] flex-col gap-2">
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
