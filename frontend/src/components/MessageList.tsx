import { useRef, useEffect, useState, useCallback } from 'preact/hooks'
import { MessageBlockView, parseMarkdown } from './MessageBlock'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import type { ChatMessage, MessageBlock } from '../types'

interface Props {
  messages: ChatMessage[]
  loading: boolean
  stoppable?: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetType: 'message' | 'block'
  message?: ChatMessage
  block?: MessageBlock
  element?: HTMLElement
}

export function MessageList({ messages, loading, stoppable = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetType: 'message',
  })

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  const handleMessageContextMenu = useCallback((e: MouseEvent, msg: ChatMessage, element: HTMLElement) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetType: 'message',
      message: msg,
      element,
    })
  }, [])

  const handleBlockContextMenu = useCallback((e: MouseEvent, msg: ChatMessage, block: MessageBlock, element: HTMLElement) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetType: 'block',
      message: msg,
      block,
      element,
    })
  }, [])

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
  }, [])

  // Extract text from element with proper line breaks
  const extractTextWithLineBreaks = useCallback((element: HTMLElement): string => {
    const lines: string[] = []

    function processNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        if (text.trim()) {
          lines.push(text)
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()

        // Block elements that should add line breaks
        const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'pre', 'blockquote']
        const isBlock = blockTags.includes(tagName)

        // Process children
        for (const child of Array.from(node.childNodes)) {
          processNode(child)
        }

        // Add line break after block elements
        if (isBlock && lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('')
        }

        // Handle <br> tags
        if (tagName === 'br') {
          lines.push('')
        }
      }
    }

    processNode(element)

    // Clean up: remove excessive empty lines, trim
    return lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }, [])

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []
    const { targetType, message, block, element } = contextMenu

    if (targetType === 'block' && block) {
      // Block-level options
      items.push({
        label: 'Copy text',
        action: () => {
          if (element) {
            copyToClipboard(extractTextWithLineBreaks(element))
          }
        },
      })

      if (block.type === 'text') {
        items.push({
          label: 'Copy markdown',
          action: () => copyToClipboard(block.content),
        })
        items.push({
          label: 'Copy as HTML',
          action: () => copyToClipboard(parseMarkdown(block.content)),
        })
      }

      if (block.type === 'tool_use' && block.toolInput) {
        items.push({
          label: 'Copy code block',
          action: () => copyToClipboard(block.toolInput || ''),
        })
      }
    } else if (targetType === 'message' && message) {
      // Message-level options (all blocks combined)
      items.push({
        label: 'Copy text',
        action: () => {
          if (element) {
            copyToClipboard(extractTextWithLineBreaks(element))
          }
        },
      })

      const textBlocks = message.blocks.filter((b) => b.type === 'text')
      if (textBlocks.length > 0) {
        const allMarkdown = textBlocks.map((b) => b.content).join('\n\n')
        items.push({
          label: 'Copy markdown',
          action: () => copyToClipboard(allMarkdown),
        })
        items.push({
          label: 'Copy as HTML',
          action: () => {
            const allHtml = textBlocks.map((b) => parseMarkdown(b.content)).join('\n')
            copyToClipboard(allHtml)
          },
        })
      }

      const codeBlocks = message.blocks.filter((b): b is MessageBlock & { type: 'tool_use'; toolInput: string } =>
        b.type === 'tool_use' && 'toolInput' in b && typeof b.toolInput === 'string'
      )
      if (codeBlocks.length > 0) {
        items.push({ separator: true, label: '', action: () => {} })
        items.push({
          label: 'Copy all code blocks',
          action: () => {
            const allCode = codeBlocks.map((b) => b.toolInput).join('\n\n')
            copyToClipboard(allCode)
          },
        })
      }
    }

    return items
  }, [contextMenu, copyToClipboard])

  const hasMessages = messages.length > 0
  const isThinking = loading || stoppable

  return (
    <div class="relative flex flex-col gap-4 overflow-y-auto h-full p-4">
      {/* Sticky loading indicator - only when there are messages */}
      {hasMessages && isThinking && (
        <div
          data-testid="loading-indicator"
          class="loading-indicator-sticky"
        >
          <div class="relative flex items-center justify-center" style={{ width: '140px', height: '140px' }}>
            <div
              class="absolute rounded-full"
              style={{
                width: '80px',
                height: '80px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.5)',
                animation: 'pulse-ring-fast 1.5s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '120px',
                height: '120px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.25)',
                animation: 'pulse-ring-fast 1.8s ease-in-out infinite 0.75s',
              }}
            />
            <span
              class="absolute text-xs uppercase select-none text-center"
              style={{
                color: 'var(--arctic-dim)',
                letterSpacing: '0.25em',
                fontWeight: 300,
                marginLeft: '0.2em',
              }}
            >
              DOGMA
            </span>
          </div>
        </div>
      )}

      {/* Empty state with centered pulse */}
      {!hasMessages && !isThinking && (
        <div class="flex flex-col items-center justify-center h-full gap-4">
          <div class="relative flex items-center justify-center" style={{ width: '140px', height: '140px' }}>
            <div
              class="absolute rounded-full"
              style={{
                width: '80px',
                height: '80px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.5)',
                animation: 'pulse-ring 3s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '120px',
                height: '120px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.25)',
                animation: 'pulse-ring 3.5s ease-in-out infinite 1.5s',
              }}
            />
            <span
              data-testid="app-title"
              class="absolute text-xs uppercase select-none text-center"
              style={{
                color: 'var(--arctic-dim)',
                letterSpacing: '0.25em',
                fontWeight: 300,
                marginLeft: '0.2em',
              }}
            >
              DOGMA
            </span>
          </div>
          <span class="text-xs" style={{ color: 'var(--arctic-dim)' }}>
            Awaiting commands
          </span>
        </div>
      )}

      {/* Empty state with centered loading - when no messages but thinking */}
      {!hasMessages && isThinking && (
        <div
          data-testid="loading-indicator"
          class="flex flex-col items-center justify-center h-full gap-4"
        >
          <div class="relative flex items-center justify-center" style={{ width: '140px', height: '140px' }}>
            <div
              class="absolute rounded-full"
              style={{
                width: '80px',
                height: '80px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.5)',
                animation: 'pulse-ring-fast 1.5s ease-in-out infinite',
              }}
            />
            <div
              class="absolute rounded-full"
              style={{
                width: '120px',
                height: '120px',
                border: '1px solid rgba(var(--arctic-accent-rgb), 0.25)',
                animation: 'pulse-ring-fast 1.8s ease-in-out infinite 0.75s',
              }}
            />
            <span
              class="absolute text-xs uppercase select-none text-center"
              style={{
                color: 'var(--arctic-dim)',
                letterSpacing: '0.25em',
                fontWeight: 300,
                marginLeft: '0.2em',
              }}
            >
              DOGMA
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <div
          key={msg.id}
          data-role={msg.role}
          class={`flex flex-col gap-1 message-${msg.role}`}
          onContextMenu={(e) => handleMessageContextMenu(e as unknown as MouseEvent, msg, e.currentTarget as HTMLElement)}
        >
          {msg.blocks.map((block, i) => (
            <div
              key={i}
              onContextMenu={(e) => handleBlockContextMenu(e as unknown as MouseEvent, msg, block, e.currentTarget as HTMLElement)}
            >
              <MessageBlockView block={block} />
            </div>
          ))}
        </div>
      ))}

      <div ref={bottomRef} />

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
