// DB Provider — Google Sheets via Apps Script
const LOCAL_TTL = 60 * 1000

let _scriptUrl = ''
let _apiKey = ''

function localGet(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > LOCAL_TTL) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}
function localSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })) } catch {}
}
function localBust(key) {
  try { localStorage.removeItem(key) } catch {}
}
function cacheKey(action) { return `jarvis:${_apiKey}:${action}` }

async function call(action, data = {}) {
  if (!_scriptUrl || _scriptUrl.includes('YOUR_')) return _mock(action, data)
  try {
    const res = await fetch(_scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'API error')
    return json.data
  } catch (e) {
    console.warn('JARVIS API offline:', e.message, '— using local fallback')
    return _mock(action, data)
  }
}

function _mock(action) {
  const today = new Date().toISOString().split('T')[0]
  const mocks = {
    getDailyLogs: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      sleepH: +(6 + Math.random() * 2).toFixed(1),
      energyAM: Math.round(6 + Math.random() * 3),
      energyPM: Math.round(5 + Math.random() * 3),
      healthScore: Math.round(72 + Math.random() * 18),
      digestionScore: Math.round(70 + Math.random() * 20),
      nutritionScore: Math.round(68 + Math.random() * 22),
      movementScore: Math.round(60 + Math.random() * 30),
      sleepScore: Math.round(65 + Math.random() * 25),
      proteinG: Math.round(55 + Math.random() * 30),
      gasLevel: Math.round(Math.random() * 4),
      bloating: Math.round(Math.random() * 3),
      habitScore: Math.round(60 + Math.random() * 30),
      weightKg: +(65 + Math.random() * 1).toFixed(1),
      digestComfort: Math.round(6 + Math.random() * 3),
    })),
    getBiomarkers: [
      { date: '2024-01-15', marker: 'CA 19-9', value: 420, unit: 'U/mL' },
      { date: '2024-07-20', marker: 'CA 19-9', value: 180, unit: 'U/mL' },
      { date: '2025-01-12', marker: 'CA 19-9', value: 60, unit: 'U/mL' },
      { date: '2025-07-22', marker: 'CA 19-9', value: 35, unit: 'U/mL' },
      { date: '2026-01-15', marker: 'CA 19-9', value: 29, unit: 'U/mL' },
      { date: '2026-03-15', marker: 'CA 19-9', value: 28, unit: 'U/mL' },
      { date: '2026-03-15', marker: 'Hemoglobin', value: 13.2, unit: 'g/dL' },
      { date: '2026-03-15', marker: 'Vitamin D', value: 38, unit: 'ng/mL' },
      { date: '2026-03-15', marker: 'ALT/SGPT', value: 34, unit: 'U/L' },
    ],
    getBaseline: { energy: 7.0, sleep: 7.2, weight: 65.5, digestionScore: 80, exerciseScore: 70, healthScore: 81 },
    saveDailyLog: { saved: true },
    saveBiomarker: { saved: true },
    saveTomorrowPlan: { saved: true },
    aiInsight: { insight: 'JARVIS offline mode. Connect Apps Script to activate AI insights.' },
    aiWeeklyReport: { report: 'Weekly report requires Apps Script connection.' },
    aiPatterns: { patterns: 'Pattern intelligence requires Apps Script connection.' },
    aiCoach: { coaching: 'AI coaching requires Apps Script connection.' },
    aiChat: { reply: 'I am J.A.R.V.I.S. Currently operating in offline mode. Configure your Apps Script URL in healthConfig.js to activate full intelligence.' },
    aiTomorrow: { plan: null },
    aiPhoto: { analysis: 'Photo analysis requires Apps Script connection with Anthropic API key.' },
    aiSimulate: { analysis: 'Simulation analysis requires Apps Script connection.' },
  }
  return Promise.resolve(mocks[action] || {})
}

export const googleSheetsProvider = {
  configure({ scriptUrl }) { _scriptUrl = scriptUrl },
  logs: {
    getAll: (days) => call('getDailyLogs', { days: days || 60 }),
    save: (data) => call('saveDailyLog', data),
  },
  biomarkers: {
    getAll: () => call('getBiomarkers'),
    save: (data) => call('saveBiomarker', data),
  },
  baseline: {
    get: () => call('getBaseline'),
  },
  plans: {
    save: (data) => call('saveTomorrowPlan', data),
  },
  ai: {
    insight: (data) => call('aiInsight', data),
    weeklyReport: (data) => call('aiWeeklyReport', data),
    patterns: (data) => call('aiPatterns', data),
    coach: (data) => call('aiCoach', data),
    chat: (data) => call('aiChat', data),
    tomorrow: (data) => call('aiTomorrow', data),
    photo: (data) => call('aiPhoto', data),
    simulate: (data) => call('aiSimulate', data),
  },
}
