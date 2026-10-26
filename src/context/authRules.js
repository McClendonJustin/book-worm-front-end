// Shared validation rules for the auth forms.
export const MIN_PASSWORD = 8
export const MAX_DISPLAY_NAME = 30
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const norm = (value) => value.trim().toLowerCase()

// LIKE/ILIKE wildcards must match literally for an exact case-insensitive lookup.
export const escapeLike = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

// Shared demo accounts: their password can't be changed.
export const DEMO_NAMES = ['demo user 1', 'demo user 2']
export const isDemoName = (name) => DEMO_NAMES.includes(norm(name ?? ''))
