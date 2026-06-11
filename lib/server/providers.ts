/**
 * @deprecated Use `@/lib/server/providers/router` and `@/lib/server/pricing` instead.
 * This file is kept as a re-export shim for backward compatibility.
 */
export { routeChat as callProvider, ProviderError } from './providers/router'
export { creditsForUsage } from './pricing'
export type { ChatResponse as ProviderResponse } from './providers/types'
