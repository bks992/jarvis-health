import React, { useEffect, useRef, useState } from 'react'
import { Chart } from 'chart.js/auto'
import { computeScores, digitalTwin, riskRadar, scoreColor } from '../../utils/scoring.js'
import { CONFIG } from '../../config/healthConfig.js'
import { aiApi, biomarkersApi } from '../../services/api.js'

// ════════════════════════════════════════════════════════════
// DIGITAL TWIN
// ════════════════════════════════════════════════════════════
export function TwinPage({ today, last30 }) {
  const canvasRef = useRef(null); const chartRef = useRef(null)
  const scores = today ? computeScores(today) : { health: 81, energy: 72, sleep: 75, digestion: 80, nutrition: 70, movement: 65, habit: 70 }
  const twin = digitalTwin(today || {}, scores)
  const systems = [
    { key: 'mitochondrialEnergy', name: 'Mitochondrial energy', color: '#00ffcc' },
    { key: 'digestiveIntegrity', name: 'Digestive integrity', color: '#00d4ff' },
    { key: 'immuneResilience', name: 'Immune resilience', color: '#7f77dd' },
    { key: 'inflammatoryLoad', name: 'Inflammatory control', color: '#ffb347' },
    { key: 'muscleRepair', name: 'Muscle repair', color: '#00ffcc' },
    { key: 'sleepRecovery', name: 'Sleep recovery', color: '#ffb347' },
    { key: 'nutritionalBalance', name: 'Nutritional balance', color: '#00d4ff' },
  ]
  const cascades = [
    { from: 'Sleep', to: 'Energy', state: twin.sleepRecovery >= 75 ? 'good' : 'warn' },
    { from: 'Nutrition', to: 'Muscle repair', state: twin.nutritionalBalance >= 75 ? 'good' : 'warn' },
    { from: 'Digestion', to: 'Inflammation', state: twin.digestiveIntegrity >= 75 ? 'good' : 'warn' },
    { from: 'Exercise', to: 'Immune resilience', state: twin.immuneResilience >= 75 ? 'good' : 'warn' },
  ]

  useEffect(() => {
    if (!canvasRef.current || !last30.length) return
    if (chartRef.current) chartRef.current.destroy()
    const labels = last30.slice(-14).map(l => { const d = new Date(l.date); return `${d.getDate()}/${d.getMonth() + 1}` })
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Health', data: last30.slice(-14).map(l => +l.healthScore || 0), borderColor: '#00d4ff', tension: 0.4, fill: false, pointRadius: 0, borderWidth: 2 },
          { label: 'Digestion', data: last30.slice(-14).map(l => +l.digestionScore || 0), borderColor: '#00ffcc', tension: 0.4, fill: false, pointRadius: 0 },
          { label: 'Sleep', data: last30.slice(-14).map(l => +l.sleepScore || 0), borderColor: '#ffb347', tension: 0.4, fill: false, pointRadius: 0 },
          { label: 'Nutrition', data: last30.slice(-14).map(l => +l.nutritionScore || 0), borderColor: '#7f77dd', tension: 0.4, fill: false, pointRadius: 0 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { boxWidth: 8, font: { size: 9, family: "'Share Tech Mono'" }, color: '#5ba8c4' } } }, scales: { y: { min: 40, max: 100, grid: { color: 'rgba(0,212,255,0.06)' }, ticks: { font: { size: 9, family: "'Share Tech Mono'" }, color: '#2d6a82' } }, x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#2d6a82', maxTicksLimit: 8 } } } },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [last30])

  return (
    <div>
      <div className="page-header"><h1>DIGITAL TWIN</h1><p>// VIRTUAL MODEL OF YOUR 7 BIOLOGICAL SYSTEMS — UPDATED FROM TODAY'S LOG</p></div>
      <div className="twin-grid">
        {systems.map((s, i) => (
          <div className="twin-sys" key={i}>
            <div className="twin-name">{s.name.toUpperCase()}</div>
            <div className="twin-score" style={{ color: s.color }}>{twin[s.key] || 0}</div>
            <div className="twin-bar" style={{ background: s.color, width: `${twin[s.key] || 0}%` }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', marginTop: 4 }}>/100</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">HEALTH CASCADE ENGINE</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 12 }}>HOW YOUR SYSTEMS INFLUENCE EACH OTHER TODAY</div>
          {cascades.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ padding: '5px 12px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 9, background: c.state === 'good' ? 'rgba(0,255,204,0.08)' : 'rgba(255,179,71,0.08)', color: c.state === 'good' ? 'var(--green)' : 'var(--gold)', border: `1px solid ${c.state === 'good' ? 'rgba(0,255,204,0.25)' : 'rgba(255,179,71,0.25)'}` }}>{c.from}</div>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>→</span>
              <div style={{ padding: '5px 12px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 9, border: '1px solid var(--border2)', color: 'var(--text2)' }}>{c.to}</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: c.state === 'good' ? 'var(--green)' : 'var(--gold)' }}>{c.state === 'good' ? '✓ supporting' : '⚠ at risk'}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">14-DAY SYSTEM TRENDS</div>
          <div style={{ height: 200 }}><canvas ref={canvasRef} /></div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// RISK RADAR
// ════════════════════════════════════════════════════════════
export function RadarPage({ last7, today }) {
  const risks = riskRadar(last7, today)
  const high = risks.filter(r => r.level === 'high')
  const medium = risks.filter(r => r.level === 'medium')
  const levelColor = l => l === 'high' ? '#ff3d3d' : l === 'medium' ? '#ffb347' : '#00ffcc'
  const MONITORED = ['Sleep deficit', 'Protein drop', 'Elevated gas', 'Weight loss', 'Rib discomfort', 'Energy decline', 'Habit compliance', 'Exercise recovery', 'Biomarker deviation']

  return (
    <div>
      <div className="page-header"><h1>RISK RADAR</h1><p>// CONTINUOUS EARLY DETECTION — UPDATED FROM LAST 7 DAYS</p></div>
      <div className="grid-3" style={{ marginBottom: 14 }}>
        {[['HIGH RISKS', high.length, high.length ? 'var(--red)' : 'var(--green)', high.length ? 'Requires attention' : 'None detected'], ['MEDIUM RISKS', medium.length, medium.length ? 'var(--gold)' : 'var(--green)', 'Monitor closely'], ['STABLE SIGNALS', Math.max(0, 5 - risks.length), 'var(--green)', 'Within range']].map(([label, val, color, sub], i) => (
          <div className="metric-card" key={i} style={{ textAlign: 'center' }}>
            <div className="metric-label">{label}</div>
            <div className="metric-value" style={{ color }}>{val}</div>
            <div className="metric-trend">{sub}</div>
          </div>
        ))}
      </div>
      {high.length > 0 && <div className="alert alert-red"><div className="alert-title">⚠ HIGH PRIORITY SIGNAL DETECTED</div><div className="alert-body">{high.map(r => r.title).join(' · ')} — please review and take action today.</div></div>}
      <div className="card">
        <div className="card-title">ACTIVE RISK SIGNALS</div>
        {risks.length ? risks.map((r, i) => (
          <div className="risk-item" key={i}>
            <div className="risk-dot" style={{ background: levelColor(r.level) }} />
            <div style={{ flex: 1 }}>
              <div className="risk-text">{r.title}</div>
              <div className="risk-desc">{r.desc}</div>
              <div className="risk-action">Suggested: {r.action}</div>
            </div>
            <div>
              <span className="risk-badge" style={{ background: r.level === 'high' ? 'rgba(255,61,61,0.1)' : r.level === 'medium' ? 'rgba(255,179,71,0.1)' : 'rgba(0,255,204,0.1)', color: levelColor(r.level) }}>{r.level.toUpperCase()}</span>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', textAlign: 'right', marginTop: 3 }}>{r.confidence}% confidence</div>
            </div>
          </div>
        )) : (
          <div className="risk-item">
            <div className="risk-dot" style={{ background: 'var(--green)' }} />
            <div><div className="risk-text" style={{ color: 'var(--green)' }}>No active risks detected</div><div className="risk-desc">All signals within baseline range. Keep up the excellent work!</div></div>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-title">MONITORED SIGNALS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {MONITORED.map(m => <div key={m} style={{ padding: '7px 10px', background: 'var(--panel)', border: '1px solid var(--border3)', borderRadius: 'var(--r)', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)' }}><span style={{ color: 'var(--green)', marginRight: 6 }}>✓</span>{m}</div>)}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// BIOMARKERS
// ════════════════════════════════════════════════════════════
export function BiomarkersPage({ biomarkers, biomarkersByMarker, toast }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], marker: 'CA 19-9', value: '', unit: 'U/mL', notes: '' })
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef(null); const chartRef = useRef(null)
  const MARKERS = ['CA 19-9', 'Hemoglobin', 'Vitamin D', 'ALT/SGPT', 'AST/SGOT', 'Creatinine', 'CEA', 'HbA1c', 'Other']
  const caSeries = biomarkersByMarker('CA 19-9')
  const latest = { 'CA 19-9': caSeries.slice(-1)[0], Hemoglobin: biomarkersByMarker('Hemoglobin').slice(-1)[0], 'Vitamin D': biomarkersByMarker('Vitamin D').slice(-1)[0], 'ALT/SGPT': biomarkersByMarker('ALT/SGPT').slice(-1)[0] }

  useEffect(() => {
    if (!canvasRef.current || caSeries.length < 2) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: caSeries.map(b => b.date),
        datasets: [{ label: 'CA 19-9 (U/mL)', data: caSeries.map(b => +b.value), borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.06)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#00d4ff', borderWidth: 2 },
          { label: 'Normal range (37)', data: caSeries.map(() => 37), borderColor: 'rgba(0,255,204,0.4)', borderDash: [5, 3], pointRadius: 0, borderWidth: 1 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9, family: "'Share Tech Mono'" }, color: '#5ba8c4', boxWidth: 10 } } }, scales: { y: { grid: { color: 'rgba(0,212,255,0.06)' }, ticks: { font: { size: 9, family: "'Share Tech Mono'" }, color: '#2d6a82' } }, x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#2d6a82' } } } },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [biomarkers])

  async function save() {
    if (!form.value) return; setSaving(true)
    await biomarkersApi.save(form); toast('BIOMARKER SAVED'); setSaving(false)
    setForm(f => ({ ...f, value: '', notes: '' }))
  }

  return (
    <div>
      <div className="page-header"><h1>BIOMARKERS</h1><p>// TRACK BLOOD TESTS · CA 19-9 TREND · REMISSION MONITORING</p></div>
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[['CA 19-9', latest['CA 19-9']?.value || 28, 'U/mL', '< 37 normal', '#00d4ff'], ['Hemoglobin', latest['Hemoglobin']?.value || 13.2, 'g/dL', '13–17 normal', '#00ffcc'], ['Vitamin D', latest['Vitamin D']?.value || 38, 'ng/mL', '30–100 normal', '#ffb347'], ['ALT/SGPT', latest['ALT/SGPT']?.value || 34, 'U/L', '7–56 normal', '#7f77dd']].map(([name, val, unit, range, col], i) => (
          <div className="metric-card" key={i}>
            <div className="metric-label">{name}</div>
            <div className="metric-value" style={{ color: col }}>{val}<span className="metric-unit" style={{ fontSize: 9 }}> {unit}</span></div>
            <div className="metric-trend" style={{ fontFamily: 'var(--mono)', fontSize: 8 }}>{range}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">CA 19-9 REMISSION TREND · 420 → 28 U/mL</div>
        <div style={{ height: 200 }}><canvas ref={canvasRef} /></div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)', marginTop: 8 }}>✓ STRONG REMISSION — CA 19-9 reduced by 93.3% from peak</div>
      </div>
      <div className="card">
        <div className="card-title">ADD BIOMARKER READING</div>
        <div className="form-grid-3">
          <div className="form-row"><label className="form-label">DATE</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">MARKER</label><select className="form-select" value={form.marker} onChange={e => setForm(f => ({ ...f, marker: e.target.value }))}>{MARKERS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div className="form-row"><label className="form-label">VALUE</label><input className="form-input" type="number" step="0.1" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="28" /></div>
          <div className="form-row"><label className="form-label">UNIT</label><input className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">NOTES</label><input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'SAVING...' : 'SAVE BIOMARKER ↗'}</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// AI INSIGHTS
// ════════════════════════════════════════════════════════════
export function AIInsightsPage({ today, last7, baseline }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  async function generate() {
    setLoading(true)
    const res = await aiApi.insight({ today, last7, baseline, targets: { protein: CONFIG.TARGET_PROTEIN_G, sleep: CONFIG.TARGET_SLEEP_H } })
    setInsight(res.insight || 'Connect your Apps Script URL in healthConfig.js to activate AI insights.')
    setLoading(false)
  }
  return (
    <div>
      <div className="page-header"><h1>HEALTH INSIGHTS</h1><p>// AI PATTERN ANALYSIS · POWERED BY CLAUDE</p></div>
      <div className="card">
        <div className="card-title">JARVIS HEALTH ANALYSIS</div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>{loading ? 'ANALYSING...' : 'GENERATE AI INSIGHTS ↗'}</button>
        {insight && <div className="ai-box">{insight}</div>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// AI PATTERNS
// ════════════════════════════════════════════════════════════
export function AIPatternsPage({ last30, baseline }) {
  const [patterns, setPatterns] = useState('')
  const [loading, setLoading] = useState(false)
  async function generate() {
    setLoading(true)
    const res = await aiApi.patterns({ logs: last30.slice(-14), baseline })
    setPatterns(res.patterns || 'Connect your Apps Script URL in healthConfig.js to activate pattern detection.')
    setLoading(false)
  }
  return (
    <div>
      <div className="page-header"><h1>PATTERN DISCOVERY</h1><p>// 14-DAY PATTERN INTELLIGENCE · CORRELATIONS · EARLY SIGNALS</p></div>
      <div className="card">
        <div className="card-title">AI PATTERN ANALYSIS</div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>{loading ? 'SCANNING PATTERNS...' : 'DETECT PATTERNS ↗'}</button>
        {patterns && <div className="ai-box">{patterns}</div>}
      </div>
    </div>
  )
}

export function AICoachPage({ today, last7, baseline }) {
  const [coaching, setCoaching] = useState('')
  const [loading, setLoading] = useState(false)
  async function generate() {
    setLoading(true)
    const res = await aiApi.coach({ today, last7, baseline, targets: { protein: CONFIG.TARGET_PROTEIN_G, sleep: CONFIG.TARGET_SLEEP_H } })
    setCoaching(res.coaching || 'Connect your Apps Script URL in healthConfig.js to activate AI coaching.')
    setLoading(false)
  }
  return (
    <div>
      <div className="page-header"><h1>AI COACH</h1><p>// PERSONALISED RECOVERY COACHING · WEEKLY OPTIMISATION</p></div>
      <div className="card">
        <div className="card-title">JARVIS COACHING PROTOCOL</div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>{loading ? 'GENERATING...' : 'GET COACHING PLAN ↗'}</button>
        {coaching && <div className="ai-box">{coaching}</div>}
      </div>
    </div>
  )
}

export function ReportPage({ last7, baseline }) {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const avg = key => last7.length ? Math.round(last7.reduce((s, r) => s + (+r[key] || 0), 0) / last7.length * 10) / 10 : 0

  async function generate() {
    setLoading(true)
    const res = await aiApi.weeklyReport({ last7, baseline, avgHealth: avg('healthScore'), avgSleep: avg('sleepH'), avgProtein: avg('proteinG'), avgEnergy: avg('energyAM') })
    setReport(res.report || 'Connect your Apps Script URL in healthConfig.js to activate weekly reports.')
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header"><h1>WEEKLY REPORT</h1><p>// 7-DAY HEALTH SUMMARY · AI ANALYSIS · RECOVERY PROGRESS</p></div>
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[['AVG HEALTH', avg('healthScore'), '/100', scoreColor(avg('healthScore'))], ['AVG SLEEP', avg('sleepH'), 'h', '#00d4ff'], ['AVG PROTEIN', avg('proteinG'), 'g', '#7f77dd'], ['AVG ENERGY', avg('energyAM'), '/10', '#00ffcc']].map(([label, val, unit, col], i) => (
          <div className="metric-card" key={i} style={{ textAlign: 'center' }}>
            <div className="metric-label">{label}</div>
            <div className="metric-value" style={{ color: col }}>{val}<span className="metric-unit">{unit}</span></div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">JARVIS WEEKLY ANALYSIS</div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>{loading ? 'GENERATING...' : 'GENERATE WEEKLY REPORT ↗'}</button>
        {report && <div className="ai-box">{report}</div>}
      </div>
    </div>
  )
}
