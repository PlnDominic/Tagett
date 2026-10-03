import { describe, expect, it } from 'vitest'
import { serpApiKey } from '@/lib/serpapi'

describe('serpApiKey', () => {
  it('cleans up the usual paste mistakes', () => {
    expect(serpApiKey('abc123\n')).toBe('abc123')
    expect(serpApiKey('  "abc123" ')).toBe('abc123')
    expect(serpApiKey('api_key=abc123')).toBe('abc123')
    expect(serpApiKey('')).toBeUndefined()
    expect(serpApiKey(undefined)).toBeUndefined()
  })
})
