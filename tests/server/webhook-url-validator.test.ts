import { describe, it, expect, vi, beforeEach } from 'vitest'

// dns.lookup is mocked below so no real network calls happen in tests
vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(),
  },
}))

import dns from 'node:dns/promises'
import { validateWebhookUrl, SsrfBlockedError } from '@/lib/server/webhook-url-validator'

const mockLookup = vi.mocked(dns.lookup)

beforeEach(() => {
  // Default: hostname resolves to a routable public IP
  mockLookup.mockResolvedValue({ address: '93.184.216.34', family: 4 })
})

describe('validateWebhookUrl', () => {
  it('accepts a valid public HTTPS URL', async () => {
    await expect(validateWebhookUrl('https://example.com/hook')).resolves.toBeUndefined()
  })

  it('rejects non-HTTPS URLs', async () => {
    await expect(validateWebhookUrl('http://example.com/hook')).rejects.toThrow(SsrfBlockedError)
    await expect(validateWebhookUrl('http://example.com/hook')).rejects.toThrow('only HTTPS')
  })

  it('rejects non-URLs', async () => {
    await expect(validateWebhookUrl('not-a-url')).rejects.toThrow(SsrfBlockedError)
  })

  it('rejects localhost', async () => {
    await expect(validateWebhookUrl('https://localhost/hook')).rejects.toThrow(SsrfBlockedError)
  })

  it('rejects 127.x loopback IPs in hostname', async () => {
    await expect(validateWebhookUrl('https://127.0.0.1/hook')).rejects.toThrow(SsrfBlockedError)
  })

  it('rejects RFC-1918 10.x range in hostname', async () => {
    await expect(validateWebhookUrl('https://10.0.0.1/hook')).rejects.toThrow(SsrfBlockedError)
  })

  it('rejects RFC-1918 172.16-31.x range in hostname', async () => {
    await expect(validateWebhookUrl('https://172.16.0.1/hook')).rejects.toThrow(SsrfBlockedError)
    await expect(validateWebhookUrl('https://172.31.255.255/hook')).rejects.toThrow(SsrfBlockedError)
  })

  it('rejects RFC-1918 192.168.x range in hostname', async () => {
    await expect(validateWebhookUrl('https://192.168.1.1/hook')).rejects.toThrow(SsrfBlockedError)
  })

  it('rejects AWS metadata endpoint 169.254.x', async () => {
    await expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data/')).rejects.toThrow(SsrfBlockedError)
  })

  it('blocks DNS rebinding — hostname looks public but resolves to private IP', async () => {
    mockLookup.mockResolvedValue({ address: '192.168.1.1', family: 4 })
    await expect(validateWebhookUrl('https://evil.example.com/hook')).rejects.toThrow(SsrfBlockedError)
    await expect(validateWebhookUrl('https://evil.example.com/hook')).rejects.toThrow('private IP')
  })

  it('blocks unresolvable hostnames', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'))
    await expect(validateWebhookUrl('https://does-not-exist.invalid/hook')).rejects.toThrow(SsrfBlockedError)
    await expect(validateWebhookUrl('https://does-not-exist.invalid/hook')).rejects.toThrow('could not be resolved')
  })
})
