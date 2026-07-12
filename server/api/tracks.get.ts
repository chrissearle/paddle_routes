import { listTrackSummaries } from '../utils/tracks'

export default defineEventHandler(async () => {
  return listTrackSummaries()
})
