import {
  seatTrayPresentation,
  type GmSeat,
  type GmSeatTrayPresentation,
} from '../../lib/gm/sessionPresence'
import { seatOverlayLines } from '../../lib/gm/hubTableChrome'

function seatDotClass(tone: GmSeatTrayPresentation['tone']): string {
  switch (tone) {
    case 'yellow':
      return 'bg-amber-400'
    case 'green':
      return 'bg-emerald-500'
    case 'neutral':
      return 'bg-slate-600'
  }
}

function seatNameClass(tone: GmSeatTrayPresentation['tone']): string {
  switch (tone) {
    case 'yellow':
      return 'text-amber-200'
    case 'green':
      return 'text-emerald-300'
    case 'neutral':
      return 'text-slate-300'
  }
}

/**
 * Players in Session overlay — expands under Table Open; hover leave collapses.
 * Close Table lives only here. Advanced code/QR/listen chrome is hidden this
 * pass; publish/listen/kick pipelines stay on the host runtime.
 */
export function GmJoinHostChrome({
  expanded,
  listening,
  seats,
  campaignName,
  lanHint,
  characterNameById,
  onCloseTable,
  onKick,
  onPointerLeaveZone,
}: {
  expanded: boolean
  listening: boolean
  seats: GmSeat[]
  campaignName: string | null
  lanHint: string | null
  characterNameById?: ReadonlyMap<string, string> | Record<string, string>
  onCloseTable: () => void
  onKick: (deviceId: string) => void
  onPointerLeaveZone: () => void
}) {
  if (!expanded) return null

  const joinedCount = seats.filter((s) => s.status === 'connected').length
  const joiningCount = seats.filter((s) => s.status === 'joining').length

  return (
    <section
      className="absolute right-0 top-full z-40 min-w-[18rem] max-w-[min(100vw-2rem,28rem)] pt-2"
      aria-label="Players in Session"
      onMouseLeave={onPointerLeaveZone}
    >
      <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
      <div className="min-w-0">
        <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
          Players in Session
        </h2>
        <p className="mt-1 text-[11px] text-slate-400">
          {campaignName ? (
            <span className="font-semibold text-slate-200">{campaignName}</span>
          ) : (
            'Table open'
          )}
          {listening ? (
            <span>
              {' '}
              · listening
              {lanHint ? ` · ${lanHint}` : ''}
            </span>
          ) : (
            <span className="text-amber-200/80"> · not published on LAN yet</span>
          )}
          {joinedCount > 0 || joiningCount > 0
            ? ` · ${joinedCount} joined${joiningCount > 0 ? ` · ${joiningCount} joining` : ''}`
            : ''}
        </p>
      </div>

      <div className="mt-3">
        {seats.length === 0 ? (
          <p className="text-xs text-slate-500">
            Waiting for devices. Players use Join Table on the launcher (LAN
            browse).
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {seats.map((seat) => {
              const presentation = seatTrayPresentation(seat.status)
              const lines = seatOverlayLines(seat, characterNameById)
              return (
                <li
                  key={seat.deviceId}
                  className="flex items-center gap-2 px-2 py-2 text-xs"
                >
                  <span
                    className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${seatDotClass(presentation.tone)}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`whitespace-nowrap font-medium ${seatNameClass(presentation.tone)}`}
                    >
                      {lines.playerLine}
                      {presentation.showJoiningLabel ? (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                          joining
                        </span>
                      ) : null}
                      {seat.status === 'reconnecting' ? (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          reconnecting
                        </span>
                      ) : null}
                    </p>
                    {lines.characterLine ? (
                      <p className="whitespace-nowrap text-[11px] text-sky-300">
                        {lines.characterLine}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onKick(seat.deviceId)}
                    className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:border-red-500 hover:text-red-300"
                  >
                    Kick
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onCloseTable}
        className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-950 hover:bg-amber-400"
      >
        Close Table
      </button>
      </div>
    </section>
  )
}
