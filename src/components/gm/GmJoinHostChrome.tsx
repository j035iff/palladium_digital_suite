import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { GmJoinCredentials } from '../../lib/gm/sessionJoinCode'
import type { GmJoinListenCapability } from '../../lib/gm/desktopHostCapability'
import type { GmSeat } from '../../lib/gm/sessionPresence'

/**
 * Host chrome: listening state, short code + QR, seats, kick.
 * Dumb UI — all listen/kick logic lives in GmSessionContext / lib.
 */
export function GmJoinHostChrome({
  capability,
  listening,
  credentials,
  seats,
  joinUrl,
  playerLabel,
  lanHint,
  onStartListen,
  onStopListen,
  onKick,
}: {
  capability: GmJoinListenCapability
  listening: boolean
  credentials: GmJoinCredentials | null
  seats: GmSeat[]
  joinUrl: string | null
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

  const connected = seats.filter((s) => s.status === 'connected').length

  return (
    <section
      className="border-b border-slate-800 bg-slate-950/60 px-4 py-3"
      aria-label="Table join"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500/90">
            Table join
          </h2>
          {playerLabel ? (
            <p className="mt-1 text-sm text-slate-200">
              Players see <span className="font-semibold text-white">{playerLabel}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No open play sitting.</p>
          )}
          {capability.productionDisabledReason ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {capability.productionDisabledReason}
            </p>
          ) : null}
          {capability.listenDisabledReason ? (
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <div className="min-w-[12rem] flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Connected · {connected}
            </p>
            {seats.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Waiting for devices. Players use Join table on the launcher.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-800 rounded-lg border border-slate-800">
                {seats.map((seat) => (
                  <li
                    key={seat.deviceId}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-200"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {seat.displayName}
                      <span className="ml-2 text-[10px] uppercase text-slate-500">
                        {seat.status}
                        {seat.characterId ? ` · ${seat.characterId}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onKick(seat.deviceId)}
                      className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:border-red-500 hover:text-red-300"
                    >
                      Kick
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
