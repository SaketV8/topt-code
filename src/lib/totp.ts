// Core TOTP logic: entry model, persistence, otpauth parsing and code
// generation. All the moving parts live here so the UI stays declarative.
import {TOTP} from 'totp-generator'

export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512'

export type Digits = 6 | 7 | 8
export type Period = 30 | 60

export interface TotpEntry {
  id: string
  title: string
  secret: string
  issuer: string
  digits: Digits
  period: Period
  algorithm: Algorithm
  // Fixed for now; kept on the model so a future HOTP option is additive.
  type: 'TOTP'
  createdAt: number
}

export interface GeneratedCode {
  otp: string
  next: string
  // Epoch ms when the current code rolls over to `next`.
  expires: number
  period: number
  error?: boolean
}

// Our UI uses the short names; totp-generator wants the hyphenated ones.
const ALGORITHM_MAP: Record<Algorithm, 'SHA-1' | 'SHA-256' | 'SHA-512'> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512'
}

export const DIGITS_OPTIONS: Digits[] = [6, 7, 8]
export const PERIOD_OPTIONS: Period[] = [30, 60]
export const ALGORITHM_OPTIONS: Algorithm[] = ['SHA1', 'SHA256', 'SHA512']

// Base32 secrets only use A-Z and 2-7; drop spaces and normalize case so the
// value we store is exactly what the generator expects.
export function normalizeSecret(secret: string): string {
  return secret.replace(/\s+/g, '').toUpperCase()
}

// Generate the current code plus a peek at the next one. Throws if the secret
// is not valid base32, which the caller turns into an "Invalid secret" state.
export async function generateCode(
  entry: TotpEntry,
  timestamp: number = Date.now()
): Promise<GeneratedCode> {
  const options = {
    digits: entry.digits,
    period: entry.period,
    algorithm: ALGORITHM_MAP[entry.algorithm]
  }

  const secret = normalizeSecret(entry.secret)
  const current = await TOTP.generate(secret, {...options, timestamp})
  // One second into the next window gives us the upcoming code.
  const upcoming = await TOTP.generate(secret, {
    ...options,
    timestamp: current.expires + 1000
  })

  return {
    otp: current.otp,
    next: upcoming.otp,
    expires: current.expires,
    period: entry.period
  }
}

const STORAGE_KEY = 'totpEntries'

export async function loadEntries(): Promise<TotpEntry[]> {
  const items = await chrome.storage.local.get(STORAGE_KEY)

  return (items[STORAGE_KEY] as TotpEntry[] | undefined) ?? []
}

export async function saveEntries(entries: TotpEntry[]): Promise<void> {
  await chrome.storage.local.set({[STORAGE_KEY]: entries})
}

export const ENTRIES_STORAGE_KEY = STORAGE_KEY

export interface ParsedOtpauth {
  title?: string
  secret?: string
  issuer?: string
  digits?: Digits
  period?: Period
  algorithm?: Algorithm
}

// Parse an otpauth://totp/Issuer:Account?secret=...&issuer=...&digits=... URI,
// pulling only values that fit our fixed option sets. Returns null for
// anything that is not a TOTP otpauth URI.
export function parseOtpauth(input: string): ParsedOtpauth | null {
  const trimmed = input.trim()

  if (!/^otpauth:\/\//i.test(trimmed)) return null

  let url: URL

  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.hostname.toLowerCase() !== 'totp') return null

  const params = url.searchParams
  const result: ParsedOtpauth = {}

  const secret = params.get('secret')
  if (secret) result.secret = normalizeSecret(secret)

  // Label is "Issuer:Account" or just "Account".
  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  const issuerParam = params.get('issuer') ?? undefined

  if (label.includes(':')) {
    const [labelIssuer, ...accountParts] = label.split(':')
    result.issuer = issuerParam || labelIssuer.trim()
    result.title = accountParts.join(':').trim()
  } else {
    if (issuerParam) result.issuer = issuerParam
    if (label) result.title = label.trim()
  }

  const digits = Number(params.get('digits'))
  if (DIGITS_OPTIONS.includes(digits as Digits)) result.digits = digits as Digits

  const period = Number(params.get('period'))
  if (PERIOD_OPTIONS.includes(period as Period)) result.period = period as Period

  const algorithm = params.get('algorithm')?.toUpperCase()
  if (
    algorithm === 'SHA1' ||
    algorithm === 'SHA256' ||
    algorithm === 'SHA512'
  ) {
    result.algorithm = algorithm
  }

  return result
}
