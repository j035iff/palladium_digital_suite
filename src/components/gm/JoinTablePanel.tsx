import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  loadCharacterSave,
  resolveCharacterIndexRowDisplay,
  saveCharacterToStorage,
  isCharacterIndexInProgress,
} from '../../lib/characterIndex'
import {
  commitJoinTableNewAlias,
  coerceTableProjectedAliasId,
  JOIN_ADD_ALIAS_CANCEL_LABEL,
  JOIN_ADD_ALIAS_ENTER_LABEL,
  JOIN_ADD_ALIAS_OPTION_LABEL,
  listTableProjectionOptions,
  TABLE_ADD_ALIAS_OPTION_ID,
  TABLE_PROJECTED_REAL_NAME_ID,
} from '../../lib/characterAliases'
import {
  createBrowserWsTransport,
  defaultInterimWsUrl,
  probeInterimWsHost,
} from '../../lib/gm/browserWsTransport'
import {
  connectTargetFromLanSession,
  connectTargetFromManualFields,
  joiningDialogCopy,
  sendPartySnapshotOnJoin,
  waitForClientJoined,
  type JoinSessionConnectTarget,
  type JoiningDialogPhase,
} from '../../lib/gm/joinSessionConnect'
import { JOIN_PLAYER_NAME_PLACEHOLDER } from '../../lib/gm/joinPlayerNamePlaceholder'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import {
  listLanSessions,
  emptyLanBrowseHint,
  localBrowseHost,
  type LanSessionAdvertisement,
} from '../../lib/gm/sessionDiscovery'
import { resolveJoinSessionGate } from '../../lib/gm/sessionJoinGate'

const SESSION_POLL_MS = 2000

export type JoinTablePanelProps = {
  /** Open character id — seat for party.snapshot (Unified Path). */
  characterId: string
  morphus?: boolean
  /** Called after successful join + character re-hydrate (close drawer). */
  onJoinSuccess?: () => void
}

/**
 * In-sheet Join Table form — Name at the table + LAN Join Session.
 * Player display name uses {@link JOIN_PLAYER_NAME_PLACEHOLDER} until launch
 * sign-in; no Player Name field on this panel.
 */
export function JoinTablePanel({
  characterId,
  morphus = false,
  onJoinSuccess,
}: JoinTablePanelProps) {
  const {
    loadSavedCharacter,
    refreshSavedCharacterIndex,
    savedCharacterRows,
    inProgressCharacterRows,
  } = useCharacter()
  const runtime = useMemo(() => getSharedGmClientRuntime(), [])
  const [state, setState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )
  const [projectedAliasId, setProjectedAliasId] = useState<string>(
    TABLE_PROJECTED_REAL_NAME_ID,
  )
  const [addAliasOpen, setAddAliasOpen] = useState(false)
  const [addAliasDraft, setAddAliasDraft] = useState('')
  const [addAliasError, setAddAliasError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<LanSessionAdvertisement[]>([])
  const [browseReason, setBrowseReason] = useState<string | null>(null)
  const browseHost = useMemo(
    () =>
      localBrowseHost(
        typeof location !== 'undefined' ? location.hostname : '127.0.0.1',
      ),
    [],
  )
  const [manualWsHost, setManualWsHost] = useState(browseHost)
  const [codeOrUrl, setCodeOrUrl] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [playSessionId, setPlaySessionId] = useState('')
  const [joinToken, setJoinToken] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [attachError, setAttachError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogPhase, setDialogPhase] = useState<JoiningDialogPhase>('idle')
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [joiningCampaignName, setJoiningCampaignName] = useState<string | null>(
    null,
  )

  const effectiveCharacterId = characterId.trim()

  const gate = resolveJoinSessionGate({
    playerName: JOIN_PLAYER_NAME_PLACEHOLDER,
    characterId: effectiveCharacterId || null,
  })

  useEffect(() => runtime.subscribe(setState), [runtime])

  useEffect(() => {
    refreshSavedCharacterIndex()
  }, [refreshSavedCharacterIndex])

  useEffect(() => {
    if (!effectiveCharacterId) {
      setProjectedAliasId(TABLE_PROJECTED_REAL_NAME_ID)
      return
    }
    const save = loadCharacterSave(effectiveCharacterId)
    if (!save) {
      setProjectedAliasId(TABLE_PROJECTED_REAL_NAME_ID)
      return
    }
    setProjectedAliasId(
      coerceTableProjectedAliasId(save.aliases, save.tableProjectedAliasId) ??
        TABLE_PROJECTED_REAL_NAME_ID,
    )
  }, [effectiveCharacterId])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const result = await listLanSessions({ hostHint: browseHost })
      if (cancelled) return
      setBrowseReason(
        result.reason ??
          (result.sessions.length === 0 ? emptyLanBrowseHint(result) : null),
      )
      setSessions(result.sessions)
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), SESSION_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [browseHost])

  const runJoin = async (
    target: JoinSessionConnectTarget,
    campaignLabel: string | null,
  ) => {
    setAttachError(null)
    setDialogError(null)
    setJoiningCampaignName(campaignLabel)
    setDialogPhase('connecting')
    setDialogOpen(true)

    if (!gate.canJoin) {
      setDialogPhase('error')
      setDialogError(gate.disabledReason ?? 'Cannot join yet.')
      return
    }

    const save = loadCharacterSave(effectiveCharacterId)
    if (!save) {
      setDialogPhase('error')
      setDialogError('Character save not found on this device.')
      return
    }

    const nextProjected =
      projectedAliasId === TABLE_PROJECTED_REAL_NAME_ID
        ? null
        : coerceTableProjectedAliasId(save.aliases, projectedAliasId)
    const saveForJoin = {
      ...save,
      tableProjectedAliasId: nextProjected,
    }
    saveCharacterToStorage(saveForJoin)

    const probe = await probeInterimWsHost(target.wsHost)
    if (!probe.ok) {
      setDialogPhase('error')
      setDialogError(
        'Cannot reach the interim listener on the GM machine. Confirm same Wi‑Fi and that the GM opened the table.',
      )
      return
    }

    setDialogPhase('joining')

    const transport = createBrowserWsTransport({
      url: defaultInterimWsUrl(target.wsHost),
      role: 'client',
      client: {
        deviceId: state.deviceId,
        joinToken: target.joinToken || undefined,
        shortCode: target.shortCode || undefined,
      },
      onRelayError: (reason) => {
        setDialogPhase('error')
        setDialogError(reason)
        setAttachError(reason)
      },
      onRegistered: (info) => {
        if (info.campaignId) setCampaignId(info.campaignId)
        if (info.playSessionId) setPlaySessionId(info.playSessionId)
        if (info.joinToken) setJoinToken(info.joinToken)
        if (info.shortCode) setShortCode(info.shortCode)
        runtime.join({
          campaignId: info.campaignId ?? target.campaignId,
          playSessionId: info.playSessionId ?? target.playSessionId,
          joinToken: info.joinToken ?? target.joinToken,
          shortCode: info.shortCode ?? target.shortCode,
          // Stub until launch sign-in populates peer-visible display name.
          displayName: JOIN_PLAYER_NAME_PLACEHOLDER,
        })
      },
    })
    const unsub = runtime.attachTransport(transport)
    try {
      await transport.start()
    } catch (err) {
      unsub()
      setDialogPhase('error')
      setDialogError(
        err instanceof Error ? err.message : 'WebSocket connection failed',
      )
      return
    }

    const joined = await waitForClientJoined(runtime)
    if (!joined.ok) {
      setDialogPhase('error')
      setDialogError(joined.reason)
      return
    }

    setDialogPhase('attaching')
    const snap = sendPartySnapshotOnJoin(
      runtime,
      effectiveCharacterId,
      saveForJoin,
    )
    if (!snap.ok) {
      setDialogPhase('error')
      setDialogError(snap.reason)
      return
    }

    setDialogPhase('success')
    loadSavedCharacter(effectiveCharacterId)
    setDialogOpen(false)
    setDialogPhase('idle')
    onJoinSuccess?.()
  }

  const onJoinSession = (session: LanSessionAdvertisement) => {
    if (!gate.canJoin) return
    void runJoin(connectTargetFromLanSession(session), session.campaignName)
  }

  const onAdvancedConnect = () => {
    const resolved = connectTargetFromManualFields({
      codeOrUrl,
      shortCode,
      wsHost: manualWsHost,
      campaignId,
      playSessionId,
      joinToken,
    })
    if (!resolved.ok) {
      setAttachError(resolved.reason)
      return
    }
    setCampaignId(resolved.target.campaignId)
    setPlaySessionId(resolved.target.playSessionId)
    setJoinToken(resolved.target.joinToken)
    setShortCode(resolved.target.shortCode)
    setManualWsHost(resolved.target.wsHost)
    void runJoin(resolved.target, null)
  }

  const closeAddAliasDialog = () => {
    setAddAliasOpen(false)
    setAddAliasDraft('')
    setAddAliasError(null)
  }

  const onConfirmAddAlias = () => {
    const save = effectiveCharacterId
      ? loadCharacterSave(effectiveCharacterId)
      : null
    if (!save) {
      setAddAliasError('Character save not found on this device.')
      return
    }
    const next = commitJoinTableNewAlias(save, addAliasDraft)
    if (!next) {
      setAddAliasError('Enter an alias name.')
      return
    }
    saveCharacterToStorage(next)
    refreshSavedCharacterIndex()
    setProjectedAliasId(next.tableProjectedAliasId)
    closeAddAliasDialog()
  }

  const selectedRow =
    savedCharacterRows.find((r) => r.id === effectiveCharacterId) ??
    inProgressCharacterRows.find((r) => r.id === effectiveCharacterId)
  const selectedDisplay = selectedRow
    ? resolveCharacterIndexRowDisplay(selectedRow)
    : null
  const selectedIsDraft = selectedRow
    ? isCharacterIndexInProgress(selectedRow)
    : false
  const selectedSave = effectiveCharacterId
    ? loadCharacterSave(effectiveCharacterId)
    : null
  const projectionOptions = selectedSave
    ? listTableProjectionOptions(selectedSave)
    : []

  const labelCls = morphus ? 'text-violet-300' : 'text-slate-500'
  const inputCls = morphus
    ? 'rounded-lg border border-violet-700 bg-slate-950 px-3 py-2 text-sm text-violet-50'
    : 'rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900'
  const mutedCls = morphus ? 'text-violet-200/80' : 'text-slate-500'
  const sessionBtnCls = morphus
    ? 'w-full rounded-lg border border-violet-500 bg-violet-950/60 px-4 py-3 text-left text-sm font-bold text-violet-50 transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-40'
    : 'w-full rounded-lg border border-blue-500 bg-blue-50 px-4 py-3 text-left text-sm font-bold text-blue-950 transition hover:border-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="space-y-6">
      <p className={`text-xs ${mutedCls}`}>
        Joining as{' '}
        <strong className={morphus ? 'text-violet-50' : 'text-slate-900'}>
          {selectedDisplay?.mainLabel ?? 'this character'}
        </strong>
        . Pick the name at the table, then join a LAN session.
      </p>

      <p
        className={`rounded-lg border px-3 py-2 text-[11px] ${
          morphus
            ? 'border-violet-700 bg-slate-950/60 text-violet-200'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
        role="note"
        title="Placeholder until launch sign-in populates the peer-visible display name"
      >
        Player name (peers): <strong>{JOIN_PLAYER_NAME_PLACEHOLDER}</strong>
        <span className="mt-0.5 block font-normal">
          Placeholder until launch sign-in — not editable here.
        </span>
      </p>

      {selectedIsDraft ? (
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
          In progress — opens forge after join
        </p>
      ) : null}

      {selectedSave ? (
        <label
          className={`block text-[10px] font-bold uppercase tracking-wide ${labelCls}`}
        >
          Name at the table
          <select
            value={projectedAliasId}
            onChange={(e) => {
              const next = e.target.value
              if (next === TABLE_ADD_ALIAS_OPTION_ID) {
                setAddAliasDraft('')
                setAddAliasError(null)
                setAddAliasOpen(true)
                return
              }
              setProjectedAliasId(next)
            }}
            className={`mt-1 w-full ${inputCls}`}
            aria-label="Name at the table"
          >
            {projectionOptions.map((opt) => (
              <option key={opt.id || 'real'} value={opt.id}>
                {opt.isAddAlias
                  ? JOIN_ADD_ALIAS_OPTION_LABEL
                  : opt.isRealName
                    ? `${opt.label} (real name)`
                    : opt.label}
              </option>
            ))}
          </select>
          <span
            className={`mt-1 block text-[11px] font-normal normal-case tracking-normal ${mutedCls}`}
          >
            Other players see this name. The GM always sees the real character
            name.
          </span>
        </label>
      ) : (
        <p
          className={`rounded-lg border px-3 py-2 text-xs ${
            morphus
              ? 'border-amber-800 bg-amber-950/40 text-amber-100'
              : 'border-amber-300 bg-amber-50 text-amber-900'
          }`}
          role="status"
        >
          Character save not found on this device — cannot join.
        </p>
      )}

      <section>
        <h2
          className={`text-[10px] font-bold uppercase tracking-wide ${labelCls}`}
        >
          Join Session
        </h2>
        {!gate.canJoin ? (
          <p
            className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
              morphus
                ? 'border-amber-800 bg-amber-950/40 text-amber-100'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
            role="status"
          >
            {gate.disabledReason}
          </p>
        ) : null}
        <div className="mt-2 space-y-2">
          {sessions.length === 0 ? (
            <p
              className={`rounded-lg border px-3 py-4 text-center text-sm ${
                morphus
                  ? 'border-violet-700 bg-slate-950/60 text-violet-200'
                  : 'border-blue-200 bg-slate-50 text-slate-600'
              }`}
              role="status"
            >
              no session available
              {browseReason ? (
                <span className={`mt-2 block text-[11px] ${mutedCls}`}>
                  {browseReason}
                </span>
              ) : null}
            </p>
          ) : (
            sessions.map((session) => {
              const disabled = !gate.canJoin
              return (
                <button
                  key={`${session.hostHint}:${session.campaignId}:${session.playSessionId}`}
                  type="button"
                  disabled={disabled}
                  title={
                    disabled
                      ? (gate.disabledReason ?? undefined)
                      : `Join ${session.campaignName}`
                  }
                  onClick={() => onJoinSession(session)}
                  className={sessionBtnCls}
                >
                  {session.campaignName}
                </button>
              )
            })
          )}
        </div>
      </section>

      <details
        className={`rounded-lg border p-3 text-xs ${
          morphus
            ? 'border-violet-700 text-violet-200'
            : 'border-blue-200 text-slate-600'
        }`}
      >
        <summary
          className={`cursor-pointer font-bold uppercase tracking-wide ${labelCls}`}
        >
          Advanced — manual code / IP (if browse fails)
        </summary>
        <p className={`mt-2 text-[11px] leading-relaxed ${mutedCls}`}>
          Use when Join Session browse cannot reach the GM host (failure mode
          only). Paste a join link from QR, or enter short code + GM Wi‑Fi IP.
        </p>
        <div className="mt-3 space-y-3">
          <label
            className={`block text-[10px] font-bold uppercase tracking-wide ${labelCls}`}
          >
            Join link or paste from QR
            <input
              value={codeOrUrl}
              onChange={(e) => setCodeOrUrl(e.target.value)}
              placeholder="ws://… or leave blank and fill fields below"
              className={`mt-1 w-full font-mono ${inputCls}`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`block text-[10px] font-bold uppercase tracking-wide ${labelCls}`}
            >
              Short code
              <input
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                className={`mt-1 w-full font-mono tracking-widest ${inputCls}`}
              />
            </label>
            <label
              className={`block text-[10px] font-bold uppercase tracking-wide ${labelCls}`}
            >
              GM host (Wi‑Fi IP)
              <input
                value={manualWsHost}
                onChange={(e) => setManualWsHost(e.target.value)}
                className={`mt-1 w-full font-mono ${inputCls}`}
              />
            </label>
          </div>
          <div className="space-y-2">
            <input
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="campaignId"
              className={`w-full font-mono ${inputCls}`}
            />
            <input
              value={playSessionId}
              onChange={(e) => setPlaySessionId(e.target.value)}
              placeholder="playSessionId"
              className={`w-full font-mono ${inputCls}`}
            />
            <input
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="joinToken"
              className={`w-full font-mono ${inputCls}`}
            />
          </div>
          {attachError ? (
            <p
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800"
              role="status"
            >
              {attachError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!gate.canJoin}
            title={
              !gate.canJoin
                ? (gate.disabledReason ?? undefined)
                : 'Connect with advanced fields'
            }
            onClick={onAdvancedConnect}
            className="w-full rounded-lg bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Connect (advanced)
          </button>
        </div>
      </details>

      {addAliasOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-add-alias-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <h2
              id="join-add-alias-title"
              className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300"
            >
              Add alias
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Other players will see this name at the table. The GM still sees
              your real character name.
            </p>
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Alias
              <input
                autoFocus
                value={addAliasDraft}
                onChange={(e) => {
                  setAddAliasDraft(e.target.value)
                  if (addAliasError) setAddAliasError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onConfirmAddAlias()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    closeAddAliasDialog()
                  }
                }}
                placeholder="Enter an alias"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                aria-label="Alias name"
              />
            </label>
            {addAliasError ? (
              <p
                className="mt-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200"
                role="status"
              >
                {addAliasError}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={onConfirmAddAlias}
                className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-cyan-600 sm:w-auto"
              >
                {JOIN_ADD_ALIAS_ENTER_LABEL}
              </button>
              <button
                type="button"
                onClick={closeAddAliasDialog}
                className="w-full rounded-lg border border-slate-600 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-200 hover:border-slate-400 sm:w-auto"
              >
                {JOIN_ADD_ALIAS_CANCEL_LABEL}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="joining-session-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <h2
              id="joining-session-title"
              className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300"
            >
              Joining Session
            </h2>
            {joiningCampaignName ? (
              <p className="mt-2 text-sm font-semibold text-white">
                {joiningCampaignName}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-300" role="status">
              {dialogPhase === 'error'
                ? (dialogError ?? joiningDialogCopy('error'))
                : joiningDialogCopy(dialogPhase)}
            </p>
            {dialogPhase === 'error' ? (
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false)
                  setDialogPhase('idle')
                  setDialogError(null)
                }}
                className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-slate-400"
              >
                Close
              </button>
            ) : (
              <p className="mt-4 text-[10px] uppercase tracking-wide text-slate-500">
                Please wait…
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
