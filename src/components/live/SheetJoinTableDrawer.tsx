import { JoinTablePanel } from '../gm/JoinTablePanel'

type Props = {
  open: boolean
  characterId: string
  morphusActive: boolean
  onClose: () => void
}

/**
 * In-sheet Join Table drawer — opened from the Persistent Core TABLE / Join
 * table control. Shared session client / party.snapshot stay on one path.
 */
export function SheetJoinTableDrawer({
  open,
  characterId,
  morphusActive,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-join-table-title"
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-2 shadow-2xl sm:rounded-2xl ${
          morphusActive
            ? 'border-violet-600 bg-slate-950 text-violet-50'
            : 'border-blue-300 bg-white text-slate-900'
        }`}
      >
        <header
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 ${
            morphusActive ? 'border-violet-800' : 'border-blue-100'
          }`}
        >
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.28em] ${
                morphusActive ? 'text-violet-400' : 'text-blue-600'
              }`}
            >
              Table
            </p>
            <h2
              id="sheet-join-table-title"
              className="text-lg font-black tracking-tight"
            >
              Join table
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              morphusActive
                ? 'border-violet-600 text-violet-100 hover:bg-violet-900/50'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <JoinTablePanel
            characterId={characterId}
            morphus={morphusActive}
            onJoinSuccess={onClose}
          />
        </div>
      </div>
    </div>
  )
}
