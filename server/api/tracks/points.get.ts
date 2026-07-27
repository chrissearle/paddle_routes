import { encodedJson, respondEncoded } from '../../utils/compress'
import { listTrackGeometry } from '../../utils/tracks'

// Static segment, so Nitro matches this ahead of `[id].get.ts`. Track ids are
// .gpx filenames, so "points" can never collide with a real id.
export default defineEventHandler(async (event) => {
  const encoded = await encodedJson('tracks:points', listTrackGeometry)
  return respondEncoded(event, encoded)
})
