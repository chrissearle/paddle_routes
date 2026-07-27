import { encodedJson, respondEncoded } from '../../../utils/compress'
import { findOverlay, getOverlayLevel } from '../../../utils/overlays'

// One rung of an overlay's detail ladder. Levels are immutable for the life of
// a deploy, so each is compressed once and held in memory (see compress.ts).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const index = Number(getRouterParam(event, 'level'))

  const def = await findOverlay(id)
  if (!def || !Number.isInteger(index) || !def.levels[index]) {
    throw createError({ statusCode: 404, statusMessage: 'Overlay level not found' })
  }

  const encoded = await encodedJson(`geojson:${id}:${index}`, async () => {
    const lines = await getOverlayLevel(def, index)
    return lines ?? []
  })
  return respondEncoded(event, encoded)
})
