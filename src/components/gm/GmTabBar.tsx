import type { GmHubTab } from '../../lib/gm/sessionTypes'

const TABS: { id: GmHubTab; label: string; hint: string }[] = [
  { id: 'sessions', label: 'Sessions', hint: 'Lobby, scratchpad, conversion policy' },
  { id: 'party', label: 'Party', hint: 'Cached player sheets' },
  { id: 'cast', label: 'Cast', hint: 'Encounter archetypes' },
  { id: 'combat', label: 'Combat', hint: 'Initiative, APM, Quick-Blocks' },
]

export function GmTabBar({
  tab,
  onChange,
  sessionOpen,
}: {
  tab: GmHubTab
  onChange: (tab: GmHubTab) => void
  sessionOpen: boolean
}) {
  return (
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/80 px-3 py-2"
      aria-label="GM Hub workspaces"
    >
      {TABS.map((row) => {
        const active = tab === row.id
        const locked = !sessionOpen && row.id !== 'sessions'
        return (
          <button
            key={row.id}
            type="button"
            disabled={locked}
            title={
              locked
                ? 'Open or create a session first'
                : row.hint
            }
            onClick={() => onChange(row.id)}
            className={`rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
              locked
                ? 'cursor-not-allowed text-slate-600'
                : active
                  ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/70'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            {row.label}
          </button>
        )
      })}
    </nav>
  )
}
