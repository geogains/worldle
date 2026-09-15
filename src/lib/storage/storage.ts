import { branding } from '../../config/branding'

/**
 * Centralized, defensive localStorage access.
 *  - Every key is namespaced and versioned: `${namespace}:v1:${name}`.
 *  - If localStorage is unavailable (private mode, disabled, SSR), an
 *    in-memory fallback keeps the app functional for the session.
 *  - Readers pass a `parse` guard so malformed data never crashes the app.
 */
export const STORAGE_VERSION = 1

export function storageKey(name: string): string {
  return `${branding.storageNamespace}:v${STORAGE_VERSION}:${name}`
}

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const memoryStore: KeyValueStore = (() => {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
})()

let resolvedStore: KeyValueStore | null = null

function getStore(): KeyValueStore {
  if (resolvedStore) return resolvedStore
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = storageKey('__probe__')
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      resolvedStore = window.localStorage
      return resolvedStore
    }
  } catch {
    // unavailable
  }
  resolvedStore = memoryStore
  return resolvedStore
}

/** For tests: forget the resolved backend so the next call re-probes. */
export function resetStorageBackendForTests(): void {
  resolvedStore = null
}

export function readJSON<T>(name: string, parse: (raw: unknown) => T | null): T | null {
  try {
    const raw = getStore().getItem(storageKey(name))
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    return parse(value)
  } catch {
    return null
  }
}

export function writeJSON(name: string, value: unknown): boolean {
  try {
    getStore().setItem(storageKey(name), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(name: string): void {
  try {
    getStore().removeItem(storageKey(name))
  } catch {
    // ignore
  }
}

/* ---------- tiny validation helpers used by the schema parsers ---------- */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

export function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x))
}

export function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}
