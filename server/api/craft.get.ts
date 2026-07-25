import { join } from 'node:path'
import { readJson } from '../utils/track-parse'
import type { Craft } from '#shared/types/track'

export default defineEventHandler((): Promise<Craft[]> => {
  const { dataDir } = useRuntimeConfig()
  return readJson<Craft[]>(join(dataDir, 'craft.json'), [])
})
