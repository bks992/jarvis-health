import { useState, useEffect, useCallback } from 'react'
import { logsApi, biomarkersApi, baselineApi } from '../services/api.js'
import { CONFIG } from '../config/healthConfig.js'

export function useHealthData() {
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jarvis_logs') || '[]') } catch { return [] }
  })
  const [biomarkers, setBiomarkers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jarvis_biomarkers') || '[]') } catch { return [] }
  })
  const [baseline, setBaseline] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jarvis_baseline') || 'null') || CONFIG.BASELINE } catch { return CONFIG.BASELINE }
  })
  const [loading, setLoading] = useState(true)

  const today = logs.find(l => l.date === new Date().toISOString().split('T')[0]) || null
  const last7 = logs.slice(-7)
  const last30 = logs.slice(-30)

  const refresh = useCallback(async () => {
    try {
      const [rawLogs, rawBm, rawBase] = await Promise.all([
        logsApi.getAll(60), biomarkersApi.getAll(), baselineApi.get()
      ])
      if (rawLogs?.length) { setLogs(rawLogs); localStorage.setItem('jarvis_logs', JSON.stringify(rawLogs.slice(-60))) }
      if (rawBm?.length)   { setBiomarkers(rawBm); localStorage.setItem('jarvis_biomarkers', JSON.stringify(rawBm)) }
      if (rawBase)         { setBaseline(rawBase); localStorage.setItem('jarvis_baseline', JSON.stringify(rawBase)) }
    } catch (e) { console.warn('Using cached data:', e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function addLog(log) {
    setLogs(prev => {
      const next = [...prev.filter(l => l.date !== log.date), log]
      localStorage.setItem('jarvis_logs', JSON.stringify(next.slice(-60)))
      return next
    })
  }

  function biomarkerLatest(name) {
    const series = biomarkers.filter(b => b.marker === name).sort((a, b) => a.date > b.date ? 1 : -1)
    return series.length ? series[series.length - 1] : null
  }

  function biomarkersByMarker(name) {
    return biomarkers.filter(b => b.marker === name).sort((a, b) => a.date > b.date ? 1 : -1)
  }

  return { logs, biomarkers, baseline, loading, today, last7, last30, refresh, addLog, biomarkerLatest, biomarkersByMarker }
}
