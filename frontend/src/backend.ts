import type { BridgeEvent, SessionInfo } from './types'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { MockBackend } from './backend.mock'

export interface Backend {
  sendPrompt(text: string): Promise<void>
  continuePrompt(text: string): Promise<void>
  cancelPrompt(): Promise<void>
  listSessions(): Promise<SessionInfo[]>
}

export interface BackendEvents {
  onEvent(callback: (event: BridgeEvent) => void): () => void
}

export type BackendAdapter = Backend & BackendEvents

export function isWailsEnvironment(): boolean {
  return typeof window !== 'undefined' && 'go' in window
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWailsApp(): any {
  return (window as unknown as Record<string, any>)['go']['main']['App']
}

export class WailsBackend implements BackendAdapter {
  async sendPrompt(text: string): Promise<void> {
    return getWailsApp().SendPrompt(text)
  }

  async continuePrompt(text: string): Promise<void> {
    return getWailsApp().ContinuePrompt(text)
  }

  async cancelPrompt(): Promise<void> {
    return getWailsApp().CancelPrompt()
  }

  async listSessions(): Promise<SessionInfo[]> {
    return getWailsApp().ListSessions()
  }

  onEvent(callback: (event: BridgeEvent) => void): () => void {
    const unsubEvent = EventsOn('claude:event', (event: BridgeEvent) => {
      callback(event)
    })
    const unsubDone = EventsOn('claude:done', () => {
      callback({ type: 'result', result: 'done' })
    })
    const unsubError = EventsOn('claude:error', (msg: string) => {
      callback({ type: 'result', result: msg, is_error: true })
    })

    return () => {
      unsubEvent()
      unsubDone()
      unsubError()
    }
  }
}

export function createBackend(): BackendAdapter {
  if (isWailsEnvironment()) {
    return new WailsBackend()
  }
  return new MockBackend()
}
