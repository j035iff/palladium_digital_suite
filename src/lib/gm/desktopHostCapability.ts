/**
 * Radical Visibility for join listen capability.
 * Production desktop WebSocket sidecar is not shipped yet; interim local `ws`
 * proves same-WiFi multi-device until Tauri/Electron lands.
 */

/** Flip when the packaged desktop sidecar ships. */
export const DESKTOP_WS_HOST_SHIPPED = false

export type GmJoinHostMode = 'unavailable' | 'interim' | 'desktop'

export type GmJoinListenCapability = {
  mode: GmJoinHostMode
  /** Host may start a listener and show code/QR. */
  canListen: boolean
  /**
   * Why production (desktop) join is unavailable, when relevant.
   * Always set when DESKTOP_WS_HOST_SHIPPED is false.
   */
  productionDisabledReason: string
  /** Why listen itself is blocked (no sitting, no interim host, etc.). */
  listenDisabledReason: string | null
}

const PRODUCTION_DISABLED =
  'Production join needs the desktop WebSocket host on this machine. It is not in this build yet.'

export function resolveJoinListenCapability(input: {
  playSessionOpen: boolean
  interimHostReachable: boolean
  desktopHostAvailable?: boolean
}): GmJoinListenCapability {
  const desktop =
    input.desktopHostAvailable ?? DESKTOP_WS_HOST_SHIPPED
  const productionDisabledReason = desktop
    ? ''
    : PRODUCTION_DISABLED

  if (!input.playSessionOpen) {
    return {
      mode: 'unavailable',
      canListen: false,
      productionDisabledReason,
      listenDisabledReason:
        'Open a play sitting first (Open Session). Join listens only while a sitting is live.',
    }
  }

  if (desktop) {
    return {
      mode: 'desktop',
      canListen: true,
      productionDisabledReason: '',
      listenDisabledReason: null,
    }
  }

  if (input.interimHostReachable) {
    return {
      mode: 'interim',
      canListen: true,
      productionDisabledReason,
      listenDisabledReason: null,
    }
  }

  return {
    mode: 'unavailable',
    canListen: false,
    productionDisabledReason,
    listenDisabledReason:
      'Interim same-WiFi listener is not reachable. Start `npm run gm:ws-host` (or use Vite dev, which starts it) on the GM machine.',
  }
}
