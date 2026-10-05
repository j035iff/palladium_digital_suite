import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  GENRE_MANIFEST,
  isGenreId,
  type GenreId,
} from '../../data/genres'
import {
  formatCharacterIndexLabel,
  isCharacterIndexInProgress,
  loadCharacterSave,
  resolveCharacterIndexRowDisplay,
  saveCharacterToStorage,
  type CharacterIndexEntry,
} from '../../lib/characterIndex'
import {
  coerceTableProjectedAliasId,
  listTableProjectionOptions,
  TABLE_PROJECTED_REAL_NAME_ID,
} from '../../lib/characterAliases'
import { createBlankCharacterForGenre } from '../../lib/characterRoot'
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
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import {
  listLanSessions,
  emptyLanBrowseHint,
  localBrowseHost,
  type LanSessionAdvertisement,
} from '../../lib/gm/sessionDiscovery'
import { PLAYER_RETURN_LEAVES_TABLE_CONFIRM } from '../../lib/gm/joinTableLeave'
import { resolveJoinSessionGate } from '../../lib/gm/sessionJoinGate'
import { PortalChromeActions } from '../chrome/PortalChromeActions'

const SESSION_POLL_MS = 2000

/**
 * Same-SPA “Join table” viewport — Player Name + My Characters + Join Session
 * list (LAN browse). On success: party.snapshot + Character Sheet / Forge handoff.
 * Picker includes spawned + save-for-later drafts; Create new character starts a
 * blank draft on the shared forge path. Advanced keeps manual code/IP fallback.
 */
export function GmJoinTableViewport() {
  const {
    returnToLauncher,
    loadSavedCharacter,
    savedCharacterRows,
    inProgressCharacterRows,
    refreshSavedCharacterIndex,
  } = useCharacter()
  const runtime = useMemo(() => getSharedGmClientRuntime(), [])
  const [state, setState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )
  const [playerName, setPlayerName] = useState('')
  const [characterId, setCharacterId] = useState('')
  /** Empty = real character name; otherwise an alias id. */
  const [projectedAliasId, setProjectedAliasId] = useState<string>(
    TABLE_PROJECTED_REAL_NAME_ID,
  )
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
  const [createGenreOpen, setCreateGenreOpen] = useState(false)

  const joinableRows = useMemo(() => {
    const byId = new Map<string, CharacterIndexEntry>()
    for (const row of savedCharacterRows) byId.set(row.id, row)
    for (const row of inProgressCharacterRows) byId.set(row.id, row)
    return [...byId.values()].sort((a, b) => {
      const aDraft = isCharacterIndexInProgress(a)
      const bDraft = isCharacterIndexInProgress(b)
      if (aDraft !== bDraft) return aDraft ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [savedCharacterRows, inProgressCharacterRows])

  const gate = resolveJoinSessionGate({
    playerName,
    characterId: characterId || null,
  })

  useEffect(() => runtime.subscribe(setState), [runtime])

  useEffect(() => {
    refreshSavedCharacterIndex()
  }, [refreshSavedCharacterIndex])

  useEffect(() => {
    if (!characterId) {
      setProjectedAliasId(TABLE_PROJECTED_REAL_NAME_ID)
      return
    }
    const save = loadCharacterSave(characterId)
    if (!save) {
      setProjectedAliasId(TABLE_PROJECTED_REAL_NAME_ID)
      return
    }
    setProjectedAliasId(
      coerceTableProjectedAliasId(save.aliases, save.tableProjectedAliasId) ??
        TABLE_PROJECTED_REAL_NAME_ID,
    )
  }, [characterId])

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

    const save = loadCharacterSave(characterId)
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

    const url = defaultInterimWsUrl(target.wsHost)
    setDialogPhase('joining')

    const transport = createBrowserWsTransport({
      url,
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
          displayName: playerName.trim(),
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
    const snap = sendPartySnapshotOnJoin(runtime, characterId, saveForJoin)
    if (!snap.ok) {
      setDialogPhase('error')
      setDialogError(snap.reason)
      return
    }

    setDialogPhase('success')
    // Shared forge / sheet path — drafts open Character Creation Forge.
    loadSavedCharacter(characterId)
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

  const onCreateNewCharacter = (genreId: GenreId) => {
    const blank = createBlankCharacterForGenre(genreId)
    saveCharacterToStorage(blank)
    refreshSavedCharacterIndex()
    setCharacterId(blank.id)
    setCreateGenreOpen(false)
  }

  const selectedRow = joinableRows.find((r) => r.id === characterId)
  const selectedDisplay = selectedRow
    ? resolveCharacterIndexRowDisplay(selectedRow)
    : null
  const selectedIsDraft = selectedRow
    ? isCharacterIndexInProgress(selectedRow)
    : false
  const selectedSave = characterId ? loadCharacterSave(characterId) : null
  const projectionOptions = selectedSave
    ? listTableProjectionOptions(selectedSave)
    : []

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/90">
            Join table
          </p>
          <h1 className="text-xl font-black tracking-wide text-white sm:text-2xl">
            {state.hello?.campaignName ?? 'Join a session'}
          </h1>
          <p className="text-[11px] text-slate-400">
            Enter your player name, pick a character (or create one), then join
            a LAN session.
          </p>
        </div>
        <PortalChromeActions
          onReturnToLauncher={() => {
            const joined = state.status === 'joined'
            if (joined && !window.confirm(PLAYER_RETURN_LEAVES_TABLE_CONFIRM)) {
              return
            }
            if (joined) runtime.leave()
            returnToLauncher()
          }}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-lg space-y-6">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Player Name
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Visible to everyone in the session"
              autoComplete="nickname"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                My Characters
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => refreshSavedCharacterIndex()}
                  className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:border-slate-400"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setCreateGenreOpen((v) => !v)}
                  className="rounded border border-cyan-700/60 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-200 hover:border-cyan-400"
                >
                  Create new character
                </button>
              </div>
            </div>
            {createGenreOpen ? (
              <div
                className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                role="group"
                aria-label="Choose setting for new character"
              >
                <p className="text-[11px] text-slate-400">
                  Choose a setting. A draft is saved and selected — join a
                  session to open Character Creation Forge at the table.
                </p>
                <ul className="mt-2 space-y-1">
                  {GENRE_MANIFEST.filter((g) => g.playable !== false).map(
                    (genre) => (
                      <li key={genre.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isGenreId(genre.id)) return
                            onCreateNewCharacter(genre.id)
                          }}
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-white hover:border-cyan-500"
                        >
                          <span className="font-semibold">{genre.label}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {genre.description}
                          </span>
                        </button>
                      </li>
                    ),
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => setCreateGenreOpen(false)}
                  className="mt-2 text-[10px] uppercase text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              aria-label="My Characters"
            >
              <option value="">Select a character</option>
              {joinableRows.map((row) => (
                <CharacterOption key={row.id} row={row} />
              ))}
            </select>
            {selectedDisplay ? (
              <p className="mt-2 text-xs text-slate-500">
                Selected: {selectedDisplay.mainLabel}
                <sup className="ml-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  {selectedDisplay.genreLabel}
                </sup>
                {selectedIsDraft ? (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-400/90">
                    In progress — opens forge after join
                  </span>
                ) : null}
              </p>
            ) : joinableRows.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No characters on this device — create a new character or finish
                a save-for-later draft (same forge path as the launcher).
              </p>
            ) : null}
          </section>

          {selectedSave ? (
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Name at the table
              <select
                value={projectedAliasId}
                onChange={(e) => setProjectedAliasId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                aria-label="Name at the table"
              >
                {projectionOptions.map((opt) => (
                  <option key={opt.id || 'real'} value={opt.id}>
                    {opt.isRealName
                      ? `${opt.label} (real name)`
                      : opt.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
                Other players see this name. The GM always sees the real
                character name.
              </span>
            </label>
          ) : null}

          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Join Session
            </h2>
            {!gate.canJoin ? (
              <p
                className="mt-2 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100/90"
                role="status"
              >
                {gate.disabledReason}
              </p>
            ) : null}
            <div className="mt-2 space-y-2">
              {sessions.length === 0 ? (
                <p
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-sm text-slate-400"
                  role="status"
                >
                  no session available
                  {browseReason ? (
                    <span className="mt-2 block text-[11px] text-slate-500">
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
                      className="w-full rounded-lg border border-cyan-700/50 bg-cyan-950/40 px-4 py-3 text-left text-sm font-bold text-cyan-50 transition hover:border-cyan-400 hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500 disabled:opacity-60"
                    >
                      {session.campaignName}
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <details className="rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
            <summary className="cursor-pointer font-bold uppercase tracking-wide text-slate-500">
              Advanced — manual code / IP (if browse fails)
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Use when Join Session browse cannot reach the GM host (failure
              mode only — e.g. AP client isolation). Paste a join link from QR,
              or enter short code + GM Wi‑Fi IP.
            </p>
            <div className="mt-3 space-y-3">
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
                    value={manualWsHost}
                    onChange={(e) => setManualWsHost(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                  />
                </label>
              </div>
              <div className="space-y-2">
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
              {attachError ? (
                <p
                  className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200"
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
                className="w-full rounded-lg bg-slate-700 px-4 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Connect (advanced)
              </button>
            </div>
          </details>
        </div>
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
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

function CharacterOption({ row }: { row: CharacterIndexEntry }) {
  const { mainLabel, genreLabel } = resolveCharacterIndexRowDisplay(row)
  const draft = isCharacterIndexInProgress(row)
  return (
    <option value={row.id} title={formatCharacterIndexLabel(row)}>
      {draft ? `[Draft] ${mainLabel} (${genreLabel})` : `${mainLabel} (${genreLabel})`}
    </option>
  )
}
