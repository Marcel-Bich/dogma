/** BridgeEvent matches the Go BridgeEvent struct from internal/claude/bridge.go */
export interface BridgeEvent {
  type: string
  session_id?: string
  text?: string
  thinking?: string
  tool_name?: string
  tool_input?: string
  is_error?: boolean
  result?: string
  model?: string
  subtype?: string
}

export interface TextBlock {
  type: 'text'
  content: string
}

export interface ThinkingBlock {
  type: 'thinking'
  content: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  content: string
  toolName: string
  toolInput: string
}

export interface ResultBlock {
  type: 'result'
  content: string
}

export interface ErrorBlock {
  type: 'error'
  content: string
}

export type MessageBlock = TextBlock | ThinkingBlock | ToolUseBlock | ResultBlock | ErrorBlock

export interface ChatMessage {
  id: string
  role: 'assistant' | 'system'
  blocks: MessageBlock[]
  timestamp: number
}

export interface SessionInfo {
  id: string
  summary: string
  first_message: string
  timestamp: string
  model: string
}
