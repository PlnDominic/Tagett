import { describe, expect, it } from 'vitest'
import { SKIP_THOUGHT_SIGNATURE, messagesForProvider, portableToolCallId, type ChatMessage } from '@/lib/llm-messages'

const history: ChatMessage[] = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'find leads' },
  { role: 'assistant', content: null, tool_calls: [
    { id: 'abc123XYZ', type: 'function', function: { name: 'search_google', arguments: '{}' } },
    { id: 'def456XYZ', type: 'function', function: { name: 'search_google', arguments: '{}' }, extra_content: { google: { thought_signature: 'real-sig' } } },
  ] },
  { role: 'tool', tool_call_id: 'abc123XYZ', content: 'results' },
]

describe('messagesForProvider', () => {
  it('gives Gemini a signature on every tool call, keeping real ones', () => {
    const out = messagesForProvider(history, true)[2] as Extract<ChatMessage, { tool_calls: unknown }>
    expect(out.tool_calls[0].extra_content?.google?.thought_signature).toBe(SKIP_THOUGHT_SIGNATURE)
    expect(out.tool_calls[1].extra_content?.google?.thought_signature).toBe('real-sig')
  })

  it('strips Gemini fields for other providers', () => {
    const out = messagesForProvider(history, false)[2] as Extract<ChatMessage, { tool_calls: unknown }>
    expect(out.tool_calls.every(tc => !('extra_content' in tc))).toBe(true)
    expect(messagesForProvider(history, false)[3]).toEqual(history[3])
  })
})

describe('portableToolCallId', () => {
  it('is 9 letters or digits, as Mistral requires', () => {
    for (let i = 0; i < 20; i++) expect(portableToolCallId()).toMatch(/^[A-Za-z0-9]{9}$/)
  })
})
