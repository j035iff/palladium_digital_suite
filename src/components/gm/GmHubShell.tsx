import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import { formatGenreSlug } from '../../data/genres'
import { GmCastPanel } from './GmCastPanel'
import { GmCombatPanel } from './GmCombatPanel'
import { GmPartyPanel } from './GmPartyPanel'
import { GmSessionsPanel } from './GmSessionsPanel'
import { GmTabBar } from './GmTabBar'

export function GmHubShell() {
  const { returnToLauncher } = useCharacter()
  const { tab, setTab, session } = useGmSession()

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/90">
            Gamemaster Hub
          </p>
          <h1 className="text-lg font-black tracking-wide text-white">
            {session?.name ?? 'No live session'}
          </h1>
          {session ? (
            <p className="text-[11px] text-slate-400">
              Host {formatGenreSlug(session.hostGenreId)} ·{' '}
              {session.conversionPolicy === 'apply_conversion'
                ? 'Conversion requested'
                : 'Non-native locked'}{' '}
              · local only
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Create a table on Sessions. LAN / QR join is not in this build.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={returnToLauncher}
          className="rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 hover:text-white"
        >
          Return to launcher
        </button>
      </header>
      <GmTabBar tab={tab} onChange={setTab} sessionOpen={Boolean(session)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === 'sessions' ? <GmSessionsPanel /> : null}
        {tab === 'party' ? <GmPartyPanel /> : null}
        {tab === 'cast' ? <GmCastPanel /> : null}
        {tab === 'combat' ? <GmCombatPanel /> : null}
      </div>
    </div>
  )
}
