// Extra named exports for the Cloudflare Worker entrypoint (Nitro cloudflare-module).
// Durable Object classes must be exported from the Worker; Nitro merges these in.
// NOTE: this file must not have a default export.
export { BoardRelay } from './server/durable/boardRelay'
