import { useEffect, useMemo, useState } from 'react'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import { seatOverlayLines } from '../../lib/gm/hubTableChrome'
import { isSeatFullyJoined } from '../../lib/gm/sessionPresence'

/**
 * Compact peer-facing roster on the joined sheet / forge.
 * Shows each seat’s player name + projected character name (not GM canonical).
 */
export function JoinedTablePeerRoster() {
  const runtime = useMemo(() => getSharedGmClientRuntime(), [])
  const [state, setState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )

  useEffect(() => runtime.subscribe(setState), [runtime])

  if (state.status !== 'joined') return null

  const seats = state.seats.filter((s) => isSeatFullyJoined(s))
  if (seats.length === 0) return null

  return (
    <details className="fixed bottom-4 left-4 z-30 max-w-[min(100vw-2rem,16rem)] rounded-xl border border-slate-600 bg-slate-950/95 p-2.5 text-slate-100 shadow-xl backdrop-blur-sm">
      <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-300">
        At this table ({seats.length})
      </summary>
      <ul className="mt-2 space-y-1.5" aria-label="Players at this table">
        {seats.map((seat) => {
          const lines = seatOverlayLines(seat)
          const self = seat.deviceId === state.deviceId
          return (
            <li
              key={seat.deviceId}
              className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5"
            >
              <p className="text-[11px] font-semibold text-slate-100">
                {lines.playerLine}
                {self ? (
                  <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-cyan-400/90">
                    You
                  </span>
                ) : null}
              </p>
              {lines.characterLine ? (
                <p className="text-[10px] text-slate-400">{lines.characterLine}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
