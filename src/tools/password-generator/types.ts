/**
 * Length bounds are the documented contract: nothing shorter than 8, nothing
 * longer than 128. The upper bound keeps a single generation run and a single
 * render bounded.
 */
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

export type CharacterGroupId = 'lowercase' | 'uppercase' | 'digits' | 'symbols'

/**
 * The exact character set per group. Coverage is a guarantee: every selected
 * group contributes at least one character to the final password, enforced by
 * rejection on the whole password so no position or spread is artificially
 * biased.
 */
export const CHARACTER_GROUPS: Readonly<Record<CharacterGroupId, string>> = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.?/',
}

export const CHARACTER_GROUP_ORDER: readonly CharacterGroupId[] = [
  'lowercase',
  'uppercase',
  'digits',
  'symbols',
]

export type PasswordErrorKind =
  | 'no-groups'
  | 'length-out-of-range'
  | 'length-too-small'
  | 'unavailable'
  | 'failed'

export interface PasswordOptions {
  readonly length: number
  readonly groups: readonly CharacterGroupId[]
}

export interface PasswordSuccess {
  readonly ok: true
  readonly password: string
}

export interface PasswordFailure {
  readonly ok: false
  readonly kind: PasswordErrorKind
  /** Fixed wording; never echoes options or provider internals. */
  readonly message: string
}

export type PasswordResult = PasswordSuccess | PasswordFailure