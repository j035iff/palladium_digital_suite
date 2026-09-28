/**
 * Join Session connect helpers — map LAN advertisements / advanced fields
 * into connect targets and run snapshot-on-join. Pure + runtime orchestration
 * stay in lib; Join Table UI only renders + wires.
 */

import type { LanSessionAdvertisement } from './sessionDiscovery'
import type { GmClientRuntime } from './sessionClientRuntime'
import { normalizeShortCode } from './sessionJoinCode'
import { parseJoinUrl } from './sessionClientRuntime'
import { resolveJoinSessionGate } from './sessionJoinGate'

export type JoinSessionConnectTarget = {
  wsHost: string
  campaignId: string
  playSessionId: string
  joinToken: string
  shortCode: string
}

export function connectTargetFromLanSession(
  session: LanSessionAdvertisement,
): JoinSessionConnectTarget {
  return {
    wsHost: session.hostHint,
    campaignId: session.campaignId,
    playSessionId: session.playSessionId,
    joinToken: session.joinToken,
    shortCode: session.shortCode,
  }
}

export type ManualJoinFields = {
  codeOrUrl: string
  shortCode: string
  wsHost: string
  campaignId: string
  playSessionId: string
  joinToken: string
}

/**
 * Resolve Advanced manual join fields into a connect target.
 * Returns `reason` when Radical Visibility should block Connect.
 */
export function connectTargetFromManualFields(
  fields: ManualJoinFields,
): { ok: true; target: JoinSessionConnectTarget } | { ok: false; reason: string } {
  const trimmed = fields.codeOrUrl.trim()
  let nextCampaign = fields.campaignId.trim()
  let nextPlay = fields.playSessionId.trim()
  let nextToken = fields.joinToken.trim()
  let nextCode = normalizeShortCode(fields.shortCode || trimmed)
  let wsHost = fields.wsHost.trim() || '127.0.0.1'

  const parsed = trimmed.includes('://') ? parseJoinUrl(trimmed) : null
  if (parsed) {
    try {
      const u = new URL(parsed.wsUrl)
      wsHost = u.hostname || wsHost
    } catch {
      /* keep wsHost */
    }
    nextCampaign = parsed.campaignId
    nextPlay = parsed.playSessionId
    nextToken = parsed.joinToken
    nextCode = normalizeShortCode(parsed.shortCode)
  }

  if (!nextCampaign || !nextPlay || (!nextToken && !nextCode)) {
    return {
      ok: false,
      reason:
        'Need a join link (QR) or campaign id + play session id + code/token from the GM.',
    }
  }

  return {
    ok: true,
    target: {
      wsHost,
      campaignId: nextCampaign,
      playSessionId: nextPlay,
      joinToken: nextToken,
      shortCode: nextCode,
    },
  }
}

export type JoiningDialogPhase =
  | 'idle'
  | 'connecting'
  | 'joining'
  | 'attaching'
  | 'success'
  | 'error'

export function joiningDialogCopy(phase: JoiningDialogPhase): string {
  switch (phase) {
    case 'idle':
      return ''
    case 'connecting':
      return 'Connecting to the GM host…'
    case 'joining':
      return 'Joining session…'
    case 'attaching':
      return 'Attaching character…'
    case 'success':
      return 'Joined — opening Character Sheet…'
    case 'error':
      return 'Could not join session.'
  }
}

/**
 * Send party.snapshot once the client is welcome'd (happy-path join attach).
 */
export function sendPartySnapshotOnJoin(
  runtime: GmClientRuntime,
  characterId: string,
  characterJson: unknown,
): { ok: true } | { ok: false; reason: string } {
  const gate = resolveJoinSessionGate({
    playerName: runtime.getState().displayName,
    characterId,
  })
  if (!gate.canJoin) {
    return {
      ok: false,
      reason: gate.disabledReason ?? 'Player name and character are required.',
    }
  }
  if (runtime.getState().status !== 'joined') {
    return {
      ok: false,
      reason: 'Not joined yet — wait for session welcome before attaching.',
    }
  }
  if (characterJson == null) {
    return { ok: false, reason: 'Character save not found on this device.' }
  }
  runtime.sendPartySnapshot(characterId, characterJson)
  return { ok: true }
}

/**
 * Wait until client runtime reaches `joined`, or error/reject/closed/timeout.
 */
export function waitForClientJoined(
  runtime: GmClientRuntime,
  timeoutMs = 12_000,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const current = runtime.getState()
  if (current.status === 'joined') return Promise.resolve({ ok: true })
  if (
    current.status === 'rejected' ||
    current.status === 'closed' ||
    current.status === 'error'
  ) {
    return Promise.resolve({
      ok: false,
      reason: current.lastError ?? 'Join failed.',
    })
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub()
      resolve({
        ok: false,
        reason:
          'Timed out waiting for the GM host. Confirm Open Table and same Wi‑Fi.',
      })
    }, timeoutMs)

    const unsub = runtime.subscribe((state) => {
      if (state.status === 'joined') {
        clearTimeout(timer)
        unsub()
        resolve({ ok: true })
        return
      }
      if (
        state.status === 'rejected' ||
        state.status === 'closed' ||
        state.status === 'error'
      ) {
        clearTimeout(timer)
        unsub()
        resolve({
          ok: false,
          reason: state.lastError ?? 'Join failed.',
        })
      }
    })
  })
}
