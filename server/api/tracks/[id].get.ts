import { getTrackDetail } from '../../utils/tracks'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing track id' })
  }

  const track = await getTrackDetail(id)
  if (!track) {
    throw createError({ statusCode: 404, statusMessage: 'Track not found' })
  }

  return track
})
