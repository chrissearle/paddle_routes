import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { listTrackGeometry } from '../../utils/tracks'

// Static segment, so Nitro matches this ahead of `[id].get.ts`. Track ids are
// .gpx filenames, so "points" can never collide with a real id.

// Geometry is fixed for the life of the process (it comes from the build-time
// cache), so the serialized and compressed forms are built once on first
// request and reused — subsequent requests are a buffer write.
//
// Brotli quality 5 rather than 11: q5 compresses this payload ~6.8x in ~6ms,
// while q11 buys only ~26KB more for ~415ms. Not worth making the first
// request after a deploy pay that.
interface Encoded {
  raw: Buffer
  br: Buffer
  gzip: Buffer
}

let encoded: Promise<Encoded> | undefined

function buildEncoded(): Promise<Encoded> {
  encoded ??= listTrackGeometry().then((geometry) => {
    const raw = Buffer.from(JSON.stringify(geometry), 'utf-8')
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
  return encoded
}

export default defineEventHandler(async (event) => {
  const { raw, br, gzip } = await buildEncoded()

  // cache-control is set via routeRules in nuxt.config.ts — Nitro overrides
  // handler-set values for API routes.
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  // Responses differ by encoding, so shared caches must key on it.
  setResponseHeader(event, 'vary', 'accept-encoding')

  // Nitro's node-server preset does not compress handler responses, and an
  // ingress in front of the container may not either — so do it here rather
  // than depend on deployment topology.
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
})
