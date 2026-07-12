import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Craft } from '#shared/types/track'

export default defineEventHandler(async (): Promise<Craft[]> => {
  const config = useRuntimeConfig()
  try {
    const raw = await readFile(join(config.dataDir, 'craft.json'), 'utf-8')
    return JSON.parse(raw) as Craft[]
  } catch {
    return []
  }
})
