import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
// h3 is pinned to 1.x in pnpm-workspace.yaml — see the note there. Without the
// pin this import resolves to a hoisted 2.x RC and every header set here 500s.
import type { H3Event } from 'h3'

// Nitro's node-server preset does not compress handler responses, and an
// ingress in front of the container may not either — so bulk JSON payloads
// compress here rather than depending on deployment topology.
//
// Payloads are fixed for the life of the process (they come from build-time
// caches), so each is serialized and compressed once on first request and
// reused — subsequent requests are a buffer write.
//
// Brotli quality 5 rather than 11: q5 compresses these payloads ~7x in a few
// ms, while q11 buys single-digit extra percent for hundreds of ms. Not worth
// making the first request after a deploy pay that.
interface Encoded {
  raw: Buffer
  br: Buffer
  gzip: Buffer
}

const cache = new Map<string, Promise<Encoded>>()

export function encodedJson(key: string, build: () => Promise<unknown>): Promise<Encoded> {
  let entry = cache.get(key)
  if (!entry) {
    entry = build().then((value) => {
      const raw = Buffer.from(JSON.stringify(value), 'utf-8')
      return {
        raw,
        br: brotliCompressSync(raw, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 5,
            [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
          },
        }),
        gzip: gzipSync(raw, { level: 6 }),
      }
    })
    cache.set(key, entry)
  }
  return entry
}

// Writes the best encoding the client accepts. Returns the buffer for the
// handler to return, so `cache-control` stays with routeRules in
// nuxt.config.ts — Nitro overrides handler-set cache headers on API routes.
export function respondEncoded(event: H3Event, { raw, br, gzip }: Encoded): Buffer {
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  // Responses differ by encoding, so shared caches must key on it.
  setResponseHeader(event, 'vary', 'accept-encoding')

  const accepted = getRequestHeader(event, 'accept-encoding') ?? ''
  if (accepted.includes('br')) {
    setResponseHeader(event, 'content-encoding', 'br')
    return br
  }
  if (accepted.includes('gzip')) {
    setResponseHeader(event, 'content-encoding', 'gzip')
    return gzip
  }
  return raw
}
