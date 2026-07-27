import { listOverlayMeta } from '../../utils/overlays'

// Overlay definitions (id, name, styling rules, detail ladder) but no
// geometry — small enough to ship with the initial page render, so the client
// knows what to offer in the layer toggle before any bulk fetch happens.
export default defineEventHandler(async () => listOverlayMeta())
