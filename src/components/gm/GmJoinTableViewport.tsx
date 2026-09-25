import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  listFinalizedCharacters,
  loadCharacterSave,
} from '../../lib/characterIndex'
import {
  createBrowserWsTransport,
  defaultInterimWsUrl,
  probeInterimWsHost,
} from '../../lib/gm/browserWsTransport'
import {
  createGmClientRuntime,
  loadOrCreateDeviceId,
  parseJoinUrl,
  type GmClientRuntimeState,
} from '../../lib/gm/sessionClientRuntime'
import { normalizeShortCode } from '../../lib/gm/sessionJoinCode'
import { UnitsPreferenceToggle } from '../units/UnitsPreferenceToggle'

/**
 * Same-SPA “Join table” viewport — interacting sheet after hello.
 * Clients never read pds:gmSession:*; host remains authority.
 */
export function GmJoinTableViewport() {
  const { returnToLauncher } = useCharacter()
  const deviceId = useMemo(() => loadOrCreateDeviceId(), [])
  const runtime = useMemo(() => createGmClientRuntime(deviceId), [deviceId])
  const [state, setState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )
  const [displayName, setDisplayName] = useState('Player')
  const [codeOrUrl, setCodeOrUrl] = useState('')
  const [wsHost, setWsHost] = useState(() =>
    typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
  )
  const [campaignId, setCampaignId] = useState('')
  const [playSessionId, setPlaySessionId] = useState('')
  const [joinToken, setJoinToken] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [attachError, setAttachError] = useState<string | null>(null)
  const [characterId, setCharacterId] = useState('')
  const [initDie, setInitDie] = useState('')
  const [hfDie, setHfDie] = useState('')
  const [apmNote, setApmNote] = useState<string | null>(null)
  const [chars, setChars] = useState(() => listFinalizedCharacters())

  useEffect(() => runtime.subscribe(setState), [runtime])

  // Transport cleanup is owned by onConnect / leave; no lingering handle here.

  const onConnect = async () => {
    setAttachError(null)
    const trimmed = codeOrUrl.trim()
    let nextCampaign = campaignId.trim()
    let nextPlay = playSessionId.trim()
    let nextToken = joinToken.trim()
    let nextCode = normalizeShortCode(shortCode || trimmed)
    let url = defaultInterimWsUrl(wsHost)

    const parsed = trimmed.includes('://') ? parseJoinUrl(trimmed) : null
    if (parsed) {
      url = parsed.wsUrl.split('?')[0] ?? parsed.wsUrl
      nextCampaign = parsed.campaignId
      nextPlay = parsed.playSessionId
      nextToken = parsed.joinToken
      nextCode = normalizeShortCode(parsed.shortCode)
      setCampaignId(nextCampaign)
      setPlaySessionId(nextPlay)
      setJoinToken(nextToken)
      setShortCode(nextCode)
    }

    if (!nextCampaign || !nextPlay || (!nextToken && !nextCode)) {
      setAttachError(
        'Need a join link (QR) or campaign id + play session id + code/token from the GM.',
      )
      return
    }

    const probe = await probeInterimWsHost(wsHost)
    if (!probe.ok) {
      setAttachError(
        'Cannot reach the interim listener on the GM machine. Confirm same Wi‑Fi and that the GM started listen.',
      )
      return
    }

    const transport = createBrowserWsTransport({
      url,
      role: 'client',
      client: {
        deviceId,
        joinToken: nextToken || undefined,
        shortCode: nextCode || undefined,
      },
      onRelayError: (reason) => {
        setAttachError(reason)
      },
      onRegistered: (info) => {
        if (info.campaignId) setCampaignId(info.campaignId)
        if (info.playSessionId) setPlaySessionId(info.playSessionId)
        if (info.joinToken) setJoinToken(info.joinToken)
        if (info.shortCode) setShortCode(info.shortCode)
        runtime.join({
          campaignId: info.campaignId ?? nextCampaign,
          playSessionId: info.playSessionId ?? nextPlay,
          joinToken: info.joinToken ?? nextToken,
          shortCode: info.shortCode ?? nextCode,
          displayName,
        })
      },
    })
    const unsub = runtime.attachTransport(transport)
    try {
      await transport.start()
    } catch (err) {
      unsub()
      setAttachError(
        err instanceof Error ? err.message : 'WebSocket connection failed',
      )
    }
  }

  const onAttachCharacter = () => {
    setAttachError(null)
    const save = loadCharacterSave(characterId)
    if (!save) {
      setAttachError('Character save not found on this device.')
      return
    }
    runtime.sendPartySnapshot(characterId, save)
  }

  const initParsed = Number(initDie.trim())
  const hfParsed = Number(hfDie.trim())

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/90">
            Join table
          </p>
          <h1 className="text-xl font-black tracking-wide text-white sm:text-2xl">
            {state.hello?.sessionName ?? 'Connect to a play sitting'}
          </h1>
          <p className="text-[11px] text-slate-400">
            Interacting sheet — physical d20 on this device. No auto-parry / auto
            H.F. penalty / auto APM spend.
          </p>
        </div>
        <div className="flex min-w-[11rem] flex-col gap-2">
          <UnitsPreferenceToggle tone="launcher" className="self-end" />
          <button
            type="button"
            onClick={() => {
              runtime.leave()
              returnToLauncher()
            }}
            className="rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 hover:text-white"
          >
            Return to launcher
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {state.status !== 'joined' ? (
          <div className="mx-auto max-w-lg space-y-4">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Join link or paste from QR
              <input
                value={codeOrUrl}
                onChange={(e) => setCodeOrUrl(e.target.value)}
                placeholder="ws://… or leave blank and fill fields below"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Short code
                <input
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm tracking-widest text-amber-100"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                GM host (Wi‑Fi IP)
                <input
                  value={wsHost}
                  onChange={(e) => setWsHost(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                />
              </label>
            </div>
            <details className="rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
              <summary className="cursor-pointer font-bold uppercase tracking-wide text-slate-500">
                Advanced ids (from join link)
              </summary>
              <div className="mt-3 space-y-2">
                <input
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="campaignId"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono"
                />
                <input
                  value={playSessionId}
                  onChange={(e) => setPlaySessionId(e.target.value)}
                  placeholder="playSessionId"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono"
                />
                <input
                  value={joinToken}
                  onChange={(e) => setJoinToken(e.target.value)}
                  placeholder="joinToken"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono"
                />
              </div>
            </details>
            {attachError || state.lastError ? (
              <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200" role="status">
                {attachError ?? state.lastError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void onConnect()}
              className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-950 hover:bg-cyan-500"
            >
              Connect
            </button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Sitting
              </h2>
              <p className="mt-2 text-sm text-slate-200">
                {state.hello?.campaignName}
              </p>
              <p className="text-xs text-slate-400">
                Host genre {state.hello?.hostGenreId} ·{' '}
                {state.hello?.conversionPolicy}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Device {state.deviceId} · seats {state.seats.length}
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Attach character
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Sends party.snapshot from this device. Host caches JSON for the
                sitting (does not need your localStorage keys).
              </p>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              >
                <option value="">Select finalized save…</option>
                {chars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setChars(listFinalizedCharacters())}
                  className="rounded border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase text-slate-300"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  disabled={!characterId}
                  onClick={onAttachCharacter}
                  className="rounded bg-cyan-700 px-2 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40"
                >
                  Send snapshot
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                Initiative
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Physical d20 on this device. Greyed when the GM locks initiative.
              </p>
              <input
                type="number"
                inputMode="numeric"
                value={initDie}
                disabled={state.initiativeLocked || !characterId}
                title={
                  !characterId
                    ? 'Attach a character first'
                    : state.initiativeLocked
                      ? 'Initiative is locked by the GM'
                      : 'Enter physical d20'
                }
                onChange={(e) => setInitDie(e.target.value)}
                placeholder="Physical d20"
                className="mt-2 w-full rounded-lg border border-amber-700/60 bg-slate-950 px-2 py-2 text-center font-mono text-lg font-black text-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button
                type="button"
                disabled={
                  !characterId ||
                  state.initiativeLocked ||
                  !Number.isFinite(initParsed)
                }
                onClick={() => {
                  runtime.sendInitiative(characterId, initParsed)
                  setInitDie('')
                }}
                className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-[10px] font-black uppercase text-slate-950 disabled:opacity-40"
              >
                Submit initiative
              </button>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                Horror Factor save
              </h2>
              {state.activeHf ? (
                <p className="mt-1 text-xs text-violet-100">
                  Live H.F. save target {state.activeHf.saveTarget}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  No live H.F. emit from the host.
                </p>
              )}
              <input
                type="number"
                inputMode="numeric"
                value={hfDie}
                disabled={!state.activeHf || !characterId}
                title={
                  !characterId
                    ? 'Attach a character first'
                    : !state.activeHf
                      ? 'Waiting for GM H.F. emit'
                      : 'Enter physical d20'
                }
                onChange={(e) => setHfDie(e.target.value)}
                placeholder="Physical d20"
                className="mt-2 w-full rounded-lg border border-violet-700/60 bg-slate-950 px-2 py-2 text-center font-mono text-lg font-black text-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button
                type="button"
                disabled={
                  !characterId || !state.activeHf || !Number.isFinite(hfParsed)
                }
                onClick={() => {
                  runtime.sendHfSave(characterId, hfParsed)
                  setHfDie('')
                }}
                className="mt-2 rounded bg-violet-700 px-3 py-1.5 text-[10px] font-black uppercase text-white disabled:opacity-40"
              >
                Submit H.F. save
              </button>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                PC APM (player-managed)
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Tells the host you spent actions on your device. Hub does not
                auto-spend or change the combat roster pips.
              </p>
              <button
                type="button"
                disabled={!characterId}
                onClick={() => {
                  runtime.sendApmSpend(characterId, 1)
                  setApmNote('APM spend sent to host (logged only).')
                }}
                className="mt-2 rounded border border-slate-500 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-200 hover:border-cyan-400 disabled:opacity-40"
              >
                Spend 1 APM
              </button>
              {apmNote ? (
                <p className="mt-2 text-[11px] text-cyan-300/90">{apmNote}</p>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
