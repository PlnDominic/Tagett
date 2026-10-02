// Moving one tool-calling conversation between providers. A request can start
// on Mistral and, after a rate limit, continue on Gemini or Groq; each of them
// rejects a history shaped for another:
// - Gemini 3 models require a thought signature on every earlier tool call
//   and 400 without one ("Function call is missing a thought_signature").
//   Calls made by another model have none, so Google's documented
//   placeholder is sent for those.
// - Mistral requires tool call ids of exactly 9 letters or digits, which
//   Gemini's and Groq's ids aren't, and may reject Gemini's extra fields.

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
  extra_content?: { google?: { thought_signature?: string } }
}

export type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: null; tool_calls: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Google's placeholder for tool calls a Gemini model didn't make itself. */
export const SKIP_THOUGHT_SIGNATURE = 'skip_thought_signature_validator'

/** A tool call id every provider accepts: 9 letters or digits. */
export function portableToolCallId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 9; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

/** The history as one provider expects it: signatures for Gemini, none for the rest. */
export function messagesForProvider(messages: ChatMessage[], isGemini: boolean): ChatMessage[] {
  return messages.map(m => {
    if (m.role !== 'assistant' || !('tool_calls' in m)) return m
    return {
      ...m,
      tool_calls: m.tool_calls.map(({ extra_content, ...tc }) => isGemini
        ? { ...tc, extra_content: { google: { thought_signature: extra_content?.google?.thought_signature || SKIP_THOUGHT_SIGNATURE } } }
        : tc),
    }
  })
}
