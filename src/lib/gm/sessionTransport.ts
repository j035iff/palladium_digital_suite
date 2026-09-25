/**
 * Narrow host/client transport adapter.
 * UI stays dumb — start / stop / broadcast / send / onMessage only.
 */

export type GmTransportPeerRole = 'host' | 'client' | 'relay'

export type GmTransportPeer = {
  peerId: string
  role: GmTransportPeerRole
  deviceId?: string
}

export type GmTransportMessageHandler = (
  from: GmTransportPeer,
  message: unknown,
) => void

export type GmTransport = {
  start: () => Promise<void>
  stop: () => Promise<void>
  /** Fan-out to all client peers (host → table). */
  broadcast: (message: unknown) => void
  /** Unicast to one peer id. */
  send: (peerId: string, message: unknown) => void
  onMessage: (handler: GmTransportMessageHandler) => () => void
  onPeerChange?: (
    handler: (peers: GmTransportPeer[]) => void,
  ) => () => void
}

type MockEndpoint = {
  peer: GmTransportPeer
  handlers: Set<GmTransportMessageHandler>
  peerChange: Set<(peers: GmTransportPeer[]) => void>
}

/**
 * In-process mock transport for unit tests (no sockets).
 * Host and clients share one MockTransportHub.
 */
export class MockTransportHub {
  private endpoints = new Map<string, MockEndpoint>()

  createHostTransport(peerId = 'host'): GmTransport {
    return this.createEndpoint({ peerId, role: 'host' })
  }

  createClientTransport(peerId: string, deviceId: string): GmTransport {
    return this.createEndpoint({ peerId, role: 'client', deviceId })
  }

  private listPeers(): GmTransportPeer[] {
    return [...this.endpoints.values()].map((e) => e.peer)
  }

  private notifyPeerChange(): void {
    const peers = this.listPeers()
    for (const e of this.endpoints.values()) {
      for (const h of e.peerChange) h(peers)
    }
  }

  private createEndpoint(peer: GmTransportPeer): GmTransport {
    const endpoint: MockEndpoint = {
      peer,
      handlers: new Set(),
      peerChange: new Set(),
    }

    return {
      start: async () => {
        this.endpoints.set(peer.peerId, endpoint)
        this.notifyPeerChange()
      },
      stop: async () => {
        this.endpoints.delete(peer.peerId)
        endpoint.handlers.clear()
        this.notifyPeerChange()
      },
      broadcast: (message) => {
        if (peer.role !== 'host') return
        for (const e of this.endpoints.values()) {
          if (e.peer.role !== 'client') continue
          for (const h of e.handlers) h(peer, message)
        }
      },
      send: (targetPeerId, message) => {
        const target = this.endpoints.get(targetPeerId)
        if (!target) return
        for (const h of target.handlers) h(peer, message)
      },
      onMessage: (handler) => {
        endpoint.handlers.add(handler)
        return () => endpoint.handlers.delete(handler)
      },
      onPeerChange: (handler) => {
        endpoint.peerChange.add(handler)
        return () => endpoint.peerChange.delete(handler)
      },
    }
  }
}
