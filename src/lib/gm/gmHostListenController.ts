/**
 * Host listen lifecycle: rotate token, interim WS transport, presence, outbound combat envelopes.
 * Used by GmSessionContext (lib/context boundary) — not by dumb panels.
 */

import {
  createBrowserWsTransport,
  defaultInterimWsUrl,
  probeInterimWsHost,
  type BrowserWsRegistration,
} from './browserWsTransport'
import { resolveJoinListenCapability } from './desktopHostCapability'
import { rotateJoinCredentials, type GmJoinCredentials } from './sessionJoinCode'
import {
  createGmHostRuntime,
  type GmHostRuntime,
  type GmHostRuntimeHooks,
} from './sessionHostRuntime'
import { createGmEnvelope } from './sessionMessages'
import type { GmPresenceState } from './sessionPresence'
import type { GmSessionRecord } from './sessionTypes'
import type { GmTransport } from './sessionTransport'
import { clearJoinedCharacterCache } from './sessionPartyCache'
import { activePlaySession } from './playSession'
import { buildJoinUrl } from './sessionClientRuntime'

export type GmHostListenUiState = {
  listening: boolean
  credentials: GmJoinCredentials | null
  presence: GmPresenceState | null
  interimReachable: boolean
  lanHost: string | null
  lanPort: number
  joinUrl: string | null
  lastError: string | null
}

export function initialHostListenUiState(): GmHostListenUiState {
  return {
    listening: false,
    credentials: null,
    presence: null,
    interimReachable: false,
    lanHost: null,
    lanPort: 8765,
    joinUrl: null,
    lastError: null,
  }
}

export type GmHostListenController = {
  runtime: GmHostRuntime
  getUi: () => GmHostListenUiState
  refreshCapabilityProbe: () => Promise<void>
  startListen: () => Promise<{ ok: true } | { ok: false; reason: string }>
  stopListen: (reason?: string) => Promise<void>
  kickDevice: (deviceId: string) => void
  broadcastFromSession: (
    session: GmSessionRecord,
    kind:
      | 'hfEmit'
      | 'hfClear'
      | 'initiativeLock'
      | 'initiativeUnlock'
      | 'hello',
  ) => void
  dispose: () => Promise<void>
}

export function createGmHostListenController(
  hooks: GmHostRuntimeHooks,
  onUi: (ui: GmHostListenUiState) => void,
): GmHostListenController {
  let ui = initialHostListenUiState()
  let transport: GmTransport | null = null
  let unsubTransport: (() => void) | null = null

  const runtime = createGmHostRuntime({
    ...hooks,
    onPresenceChange: (presence) => {
      ui = { ...ui, presence }
      onUi(ui)
      hooks.onPresenceChange?.(presence)
    },
  })

  const setUi = (patch: Partial<GmHostListenUiState>) => {
    ui = { ...ui, ...patch }
    onUi(ui)
  }

  const refreshCapabilityProbe = async () => {
    const probe = await probeInterimWsHost()
    setUi({
      interimReachable: probe.ok,
      lanPort: probe.port,
      lanHost: probe.lanAddresses[0] ?? ui.lanHost,
    })
  }

  const stopListen = async (reason?: string) => {
    runtime.endListen(reason)
    unsubTransport?.()
    unsubTransport = null
    if (transport) {
      await transport.stop()
      transport = null
    }
    const session = hooks.getSession()
    if (session) clearJoinedCharacterCache(session.id)
    setUi({
      listening: false,
      credentials: null,
      presence: null,
      joinUrl: null,
      lastError: null,
    })
  }

  const startListen = async (): Promise<
    { ok: true } | { ok: false; reason: string }
  > => {
    const session = hooks.getSession()
    if (!session) return { ok: false, reason: 'No campaign open.' }
    const live = activePlaySession(session)
    if (!live) {
      return {
        ok: false,
        reason: 'Open a play sitting before starting the join listener.',
      }
    }

    await refreshCapabilityProbe()
    const cap = resolveJoinListenCapability({
      playSessionOpen: true,
      interimHostReachable: ui.interimReachable,
    })
    if (!cap.canListen) {
      return {
        ok: false,
        reason: cap.listenDisabledReason ?? 'Cannot listen.',
      }
    }

    await stopListen()
    const credentials = rotateJoinCredentials()
    const hostname =
      typeof location !== 'undefined' ? location.hostname : '127.0.0.1'

    const registrationBox: { current: BrowserWsRegistration | null } = {
      current: null,
    }
    transport = createBrowserWsTransport({
      url: defaultInterimWsUrl(hostname),
      role: 'host',
      host: {
        campaignId: session.id,
        playSessionId: live.id,
        credentials,
      },
      onRegistered: (info) => {
        registrationBox.current = info
        const lan =
          info.lanAddresses?.[0] ??
          (hostname === 'localhost' ? '127.0.0.1' : hostname)
        const port = info.port ?? 8765
        const joinUrl = buildJoinUrl({
          wsBase: `ws://${lan}:${port}`,
          campaignId: session.id,
          playSessionId: live.id,
          joinToken: credentials.joinToken,
          shortCode: credentials.shortCode,
        })
        setUi({
          lanHost: lan,
          lanPort: port,
          joinUrl,
          credentials,
          listening: true,
        })
      },
      onRelayError: (reason) => setUi({ lastError: reason }),
    })

    try {
      unsubTransport = runtime.attachTransport(transport)
      await transport.start()
    } catch (err) {
      await stopListen()
      return {
        ok: false,
        reason:
          err instanceof Error
            ? err.message
            : 'Failed to connect to interim WS host.',
      }
    }

    const began = runtime.beginListen(credentials)
    if (!began.ok) {
      await stopListen()
      return began
    }

    const reg = registrationBox.current
    const lan =
      reg?.lanAddresses?.[0] ??
      ui.lanHost ??
      (hostname === 'localhost' ? '127.0.0.1' : hostname)
    const port = reg?.port ?? ui.lanPort
    setUi({
      listening: true,
      credentials,
      lanHost: lan,
      lanPort: port,
      joinUrl: buildJoinUrl({
        wsBase: `ws://${lan}:${port}`,
        campaignId: session.id,
        playSessionId: live.id,
        joinToken: credentials.joinToken,
        shortCode: credentials.shortCode,
      }),
      lastError: null,
    })
    return { ok: true }
  }

  const broadcastFromSession: GmHostListenController['broadcastFromSession'] = (
    session,
    kind,
  ) => {
    if (!runtime.getState().listening) return
    if (kind === 'hello') {
      runtime.broadcastEnvelope(
        createGmEnvelope('session.hello', session.id, {
          hostGenreId: session.hostGenreId,
          conversionPolicy: session.conversionPolicy,
          sessionName:
            activePlaySession(session)?.playerLabel ?? session.name,
          campaignName: session.name,
          playSessionId: session.activePlaySessionId,
        }),
      )
      return
    }
    if (kind === 'hfEmit') {
      const emit = session.combat.activeHfEmit
      if (!emit) return
      runtime.broadcastEnvelope(
        createGmEnvelope('combat.hfEmit', session.id, {
          npcInstanceId: emit.npcInstanceId,
          saveTarget: emit.saveTarget,
          useNightbaneHorrorFactor: emit.useNightbaneHorrorFactor,
        }),
      )
      return
    }
    if (kind === 'hfClear') {
      runtime.broadcastEnvelope(
        createGmEnvelope('combat.hfClear', session.id, {}),
      )
      return
    }
    if (kind === 'initiativeLock') {
      runtime.broadcastEnvelope(
        createGmEnvelope('combat.initiativeLock', session.id, {
          locked: true,
        }),
      )
      return
    }
    if (kind === 'initiativeUnlock') {
      runtime.broadcastEnvelope(
        createGmEnvelope('combat.initiativeLock', session.id, {
          locked: false,
        }),
      )
    }
  }

  return {
    runtime,
    getUi: () => ui,
    refreshCapabilityProbe,
    startListen,
    stopListen,
    kickDevice: (deviceId) => runtime.kickDevice(deviceId),
    broadcastFromSession,
    dispose: () => stopListen('Host disposed.'),
  }
}
