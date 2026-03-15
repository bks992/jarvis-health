// DB Abstraction Layer — swap providers here
import { googleSheetsProvider } from './providers/googleSheets.js'
import { CONFIG } from '../config/healthConfig.js'

const PROVIDER = 'googleSheets'
const providers = { googleSheets: googleSheetsProvider }
const db = providers[PROVIDER]
if (!db) throw new Error(`Unknown DB provider: "${PROVIDER}"`)

// Auto-configure on import
db.configure?.({ scriptUrl: CONFIG.GOOGLE_SCRIPT_URL })

export default db
