import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { GmJoinCredentials } from '../../lib/gm/sessionJoinCode'
import type { GmJoinListenCapability } from '../../lib/gm/desktopHostCapability'
import {
  seatTrayPresentation,
  type GmSeat,
  type GmSeatTrayPresentation,
} from '../../lib/gm/sessionPresence'

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
 * Host chrome: Open Table publish state, Players in Session tray, Advanced code/QR.
 * Dumb UI — listen/kick/open logic lives in GmSessionContext / lib.
 */
export function GmJoinHostChrome({
  capability,
  tableOpen,
  listening,
  credentials,
  seats,
  joinUrl,
  campaignName,
  playerLabel,
  lanHint,
  onStartListen,
  onStopListen,
  onKick,
}: {
  capability: GmJoinListenCapability
  /** True when a play sitting is live (Open Table stamped). */
  tableOpen: boolean
  listening: boolean
  credentials: GmJoinCredentials | null
  seats: GmSeat[]
  joinUrl: string | null
  campaignName: string | null
  playerLabel: string | null
  lanHint: string | null
  onStartListen: () => void
  onStopListen: () => void
  onKick: (deviceId: string) => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!joinUrl) {
      setQrDataUrl(null)
      return
    }
    void QRCode.toDataURL(joinUrl, { margin: 1, width: 160 }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [joinUrl])

  const joinedCount = seats.filter((s) => s.status === 'connected').length
  const joiningCount = seats.filter((s) => s.status === 'joining').length

  return (
    <section
      className="border-b border-slate-800 bg-slate-950/60 px-4 py-3"
      aria-label="Players in Session"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500/90">
            Players in Session
          </h2>
          {!tableOpen ? (
            <p className="mt-1 text-sm text-slate-500">
              Open Table publishes this campaign on the LAN. The seat tray fills
              as players join.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-200">
              {campaignName ? (
                <>
                  Table open ·{' '}
                  <span className="font-semibold text-white">{campaignName}</span>
                </>
              ) : (
                'Table open'
              )}
              {listening ? (
                <span className="text-slate-400">
                  {' '}
                  · listening
                  {lanHint ? ` · ${lanHint}` : ''}
                </span>
              ) : (
                <span className="text-amber-200/80">
                  {' '}
                  · not published on LAN yet
                </span>
              )}
            </p>
          )}
          {capability.productionDisabledReason ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {capability.productionDisabledReason}
            </p>
          ) : null}
          {tableOpen && capability.listenDisabledReason && !listening ? (
            <p className="mt-1 text-[11px] text-amber-200/80" role="status">
              {capability.listenDisabledReason}
            </p>
          ) : null}
          {capability.mode === 'interim' && listening ? (
            <p className="mt-1 text-[11px] text-cyan-300/90">
              Interim same-WiFi listener active
              {lanHint ? ` · ${lanHint}` : ''}. Not the production desktop host.
            </p>
          ) : null}
          {playerLabel && tableOpen ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Event-log sitting label: {playerLabel}
            </p>
          ) : null}
        </div>
      </div>

      {tableOpen ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Seats
            {joinedCount > 0 || joiningCount > 0
              ? ` · ${joinedCount} joined${joiningCount > 0 ? ` · ${joiningCount} joining` : ''}`
              : ''}
          </p>
          {seats.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Waiting for devices. Players use Join Table on the launcher (LAN
              browse).
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-800 rounded-lg border border-slate-800">
              {seats.map((seat) => {
                const presentation = seatTrayPresentation(seat.status)
                return (
                  <li
                    key={seat.deviceId}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs"
                  >
                    <span
                      className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${seatDotClass(presentation.tone)}`}
                      aria-hidden
                    />
                    <span
                      className={`min-w-0 flex-1 truncate font-medium ${seatNameClass(presentation.tone)}`}
                    >
                      {seat.displayName}
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
                      {seat.characterId ? (
                        <span className="ml-2 text-[10px] font-normal uppercase text-slate-500">
                          · {seat.characterId}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => onKick(seat.deviceId)}
                      className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:border-red-500 hover:text-red-300"
                    >
                      Kick
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}

      {tableOpen ? (
        <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Advanced — join code / QR / manual listen
          </summary>
          <p className="mt-2 text-[11px] text-slate-500">
            Primary join is LAN browse (Join Session). Use code or QR if browse
            fails, or for same-machine debug.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!capability.canListen || listening}
              title={
                capability.listenDisabledReason ??
                (listening ? 'Already listening' : 'Start join listener')
              }
              onClick={onStartListen}
              className="rounded-lg bg-cyan-700 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              Start listen
            </button>
            <button
              type="button"
              disabled={!listening}
              title={
                listening
                  ? 'Stop listener (devices disconnect)'
                  : 'Listener is not running'
              }
              onClick={onStopListen}
              className="rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop listen
            </button>
          </div>
          {listening && credentials ? (
            <div className="mt-3 flex flex-wrap items-start gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Join code
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-amber-200">
                  {credentials.shortCode}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:border-slate-400"
                  onClick={async () => {
                    if (!joinUrl) return
                    try {
                      await navigator.clipboard.writeText(joinUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  {copied ? 'Copied link' : 'Copy join link'}
                </button>
              </div>
              {qrDataUrl ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    QR
                  </p>
                  <img
                    src={qrDataUrl}
                    alt="Join table QR code"
                    className="mt-1 rounded bg-white p-1"
                    width={160}
                    height={160}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </details>
      ) : null}
    </section>
  )
}
