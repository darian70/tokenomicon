/**
 * Typed API errors with user-facing messages distinct from internal detail.
 *
 * Throw ApiError anywhere in a server action or route handler. The route's
 * catch block calls toResponse() to emit the right HTTP status and a safe
 * client-visible message without leaking stack traces or DB error strings.
 */

export class ApiError extends Error {
  constructor(
    public readonly clientMessage: string,
    public readonly status: number,
    cause?: unknown,
  ) {
    super(clientMessage, { cause })
    this.name = 'ApiError'
  }
}

// Maps known internal error strings to safe client messages + HTTP status.
// Strings are matched with startsWith so partial prefixes work.
const KNOWN_ERRORS: Array<[string, string, number]> = [
  ['Unauthorized', 'Unauthorized', 401],
  ['Forbidden', 'Forbidden', 403],
  ['Insufficient arena credits', 'Not enough arena credits to enter this game.', 402],
  ['Too many active sessions', 'You have too many active games. Finish or wait for one to expire.', 429],
  ['Game session not found', 'Game session not found.', 404],
  ['Game session already settled', 'This session has already been submitted.', 409],
  ['Game session expired', 'Time is up — your session has expired.', 410],
  ['Unknown game', 'Invalid game type.', 400],
  ['This game is currently unavailable', 'This game is not available in your region.', 451],
  ['tier requires an active', 'A higher subscription tier is required for this difficulty.', 402],
]

export function toApiResponse(error: unknown): { message: string; status: number } {
  if (error instanceof ApiError) {
    return { message: error.clientMessage, status: error.status }
  }

  if (error instanceof Error) {
    for (const [prefix, clientMsg, status] of KNOWN_ERRORS) {
      if (error.message.startsWith(prefix)) {
        return { message: clientMsg, status }
      }
    }
  }

  // Unknown error — do not surface internals
  return { message: 'An unexpected error occurred. Please try again.', status: 500 }
}
