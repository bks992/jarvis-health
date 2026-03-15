import React, { useEffect, useRef, useState } from 'react'
import { Chart } from 'chart.js/auto'
import { computeScores, digitalTwin, detectDrift, buildTrajectory, scoreColor } from '../../utils/scoring.js'
import { CONFIG } from '../../config/healthConfig.js'
import { aiApi } from '../../services/api.js'
import { StatBar } from '../shared/HudComponents.jsx'

// ── Body System Map ─────────────────────────────────────────
function BodySystemMap({ twin, scores }) {
  const systems = [
    { icon: '🧠', name: 'BRAIN / SLEEP RECOVERY', score: twin.sleepRecovery, desc: 'Sleep + mental clarity' },
    { icon: '❤️', name: 'HEART / ENERGY', score: twin.mitochondrialEnergy, desc: 'Mitochondrial energy' },
    { icon: '🫁', name: 'LIVER / ENZYME BALANCE', score: twin.inflammatoryLoad, desc: 'Inflammation control' },
    { icon: '🦠', name: 'GUT / DIGESTIVE INTEGRITY', score: twin.digestiveIntegrity, desc: 'Gas + digestion comfort' },
    { icon: '💪', name: 'MUSCLES / REPAIR RATE', score: twin.muscleRepair, desc: 'Protein + exercise recovery' },
    { icon: '🛡️', name: 'IMMUNE RESILIENCE', score: twin.immuneResilience, desc: 'Defense systems' },
    { icon: '⚖️', name: 'NUTRITION BALANCE', score: twin.nutritionalBalance, desc: 'Macro adequacy' },
  ]
  return (
    <div className="card">
      <div className="card-title">◈ BODY SYSTEM MAP — DIGITAL TWIN</div>
      <div className="body-map-wrap">
        {/* SVG human silhouette */}
        <div className="body-svg-container">
          <svg viewBox="0 0 120 280" width="120" style={{ display: 'block' }}>
            {/* Body outline */}
            <ellipse cx="60" cy="26" rx="18" ry="22" fill="none" stroke="rgba(0,212,255,0.35)" strokeWidth="1.5" />
            <path d="M42 46 Q28 56 26 80 L30 130 Q30 140 42 140 L42 200 Q42 215 36 240 L44 242 L52 190 L52 140 L68 140 L68 190 L76 242 L84 240 Q78 215 78 200 L78 140 L90 140 L90 130 L94 80 Q92 56 78 46 Q70 38 60 38 Q50 38 42 46Z" fill="rgba(0,180,255,0.07)" stroke="rgba(0,212,255,0.3)" strokeWidth="1.2" />
            {/* Organ highlights */}
            <circle cx="60" cy="26" r="4" fill="rgba(0,212,255,0.15)" stroke={scoreColor(twin.sleepRecovery)} strokeWidth="1" />
            <circle cx="60" cy="70" r="7" fill="rgba(255,61,61,0.08)" stroke={scoreColor(twin.mitochondrialEnergy)} strokeWidth="1" />
            <circle cx="53" cy="88" r="5" fill="rgba(255,179,71,0.08)" stroke={scoreColor(twin.inflammatoryLoad)} strokeWidth="1" />
            <ellipse cx="60" cy="105" rx="12" ry="8" fill="rgba(0,212,255,0.06)" stroke={scoreColor(twin.digestiveIntegrity)} strokeWidth="1" />
            <ellipse cx="60" cy="150" rx="15" ry="6" fill="rgba(0,255,204,0.05)" stroke={scoreColor(twin.muscleRepair)} strokeWidth="1" />
            {/* Signal lines */}
            {[0,1,2,3].map(i => (
              <circle key={i} cx={30 + i * 20} cy={260} r="2" fill={scoreColor([twin.sleepRecovery, twin.mitochondrialEnergy, twin.digestiveIntegrity, twin.immuneResilience][i])} opacity="0.6">
                <animate attributeName="opacity" values="0.2;1;0.2" dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        </div>
        {/* System signals panel */}
        <div className="body-signals-panel">
          {systems.map((s, i) => {
            const col = scoreColor(s.score)
            const pct = Math.min(100, Math.max(0, s.score))
            return (
              <div className="body-sys-row" key={i}>
                <span className="body-sys-icon">{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div className="body-sys-name">{s.name}</div>
                  <div className="body-sys-bar">
                    <div className="body-sys-fill" style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
                <div className="body-sys-score" style={{ color: col }}>{s.score}<span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: 400 }}>%</span></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Health Drift Radar ──────────────────────────────────────
function DriftRadar({ drift }) {
  const { state, signals } = drift
  const stateClass = state === 'stable' ? 'drift-stable' : state === 'drifting' ? 'drift-drifting' : 'drift-instability'
  const stateLabel = state === 'stable' ? '🟢 STABLE' : state === 'drifting' ? '🟡 DRIFT DETECTED' : '🔴 INSTABILITY'
  const dirIcon = d => d === 'up' ? '↑' : d === 'down' ? '↓' : '→'
  const dirClass = d => d === 'up' ? 'drift-dir-up' : d === 'down' ? 'drift-dir-down' : 'drift-dir-stable'
  return (
    <div className="card">
      <div className="card-title">◈ HEALTH STABILITY DRIFT DETECTION</div>
      <div style={{ marginBottom: 12 }}>
        <span className={`drift-state ${stateClass}`}>{stateLabel}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginLeft: 10 }}>7-DAY TREND vs BASELINE</span>
      </div>
      {signals.map((s, i) => (
        <div className="drift-signal-row" key={i}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)' }}>{s.name}</span>
          <span className={dirClass(s.direction)} style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600 }}>
            {dirIcon(s.direction)} {s.delta > 0 ? '+' : ''}{s.delta}%
          </span>
        </div>
      ))}
      {state !== 'stable' && (
        <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--gold)', lineHeight: 1.7 }}>
          ⚠ DRIFT SIGNALS DETECTED — Review sleep and nutrition. Increase protein and prioritize recovery.
        </div>
      )}
      {state === 'insufficient' && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 8 }}>
          Log 5+ days to activate drift detection.
        </div>
      )}
    </div>
  )
}

// ── Trajectory Chart ────────────────────────────────────────
function TrajectoryChart({ traj, logs }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    const past = logs.slice(-7).map(l => +l.healthScore || 0)
    const labels = [
      ...logs.slice(-7).map((l, i) => {
        const d = new Date(l.date); return `${d.getDate()}/${d.getMonth() + 1}`
      }),
      'Today', 'W+1', 'W+2',
    ]
    const pastData = [...past, null, null, null]
    const goodData = [...Array(past.length).fill(null), ...(traj?.goodPath || [75, 78, 82])]
    const badData  = [...Array(past.length).fill(null), ...(traj?.badPath || [75, 70, 65])]

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Past data', data: pastData, borderColor: '#00d4ff', tension: 0.4, fill: false, pointRadius: 2, borderWidth: 2, pointBackgroundColor: '#00d4ff' },
          { label: 'If stable habits', data: goodData, borderColor: '#00ffcc', tension: 0.3, fill: false, borderDash: [5, 3], pointRadius: 3, borderWidth: 1.5, pointBackgroundColor: '#00ffcc' },
          { label: 'If habits decline', data: badData, borderColor: '#ff3d3d', tension: 0.3, fill: false, borderDash: [5, 3], pointRadius: 3, borderWidth: 1.5, pointBackgroundColor: '#ff3d3d' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { boxWidth: 10, font: { size: 9, family: "'Share Tech Mono'" }, color: '#5ba8c4' } },
          tooltip: { backgroundColor: 'rgba(4,24,40,0.95)', borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1, titleFont: { family: "'Share Tech Mono'" }, bodyFont: { family: "'Share Tech Mono'" } },
        },
        scales: {
          y: { min: 40, max: 100, grid: { color: 'rgba(0,212,255,0.06)' }, ticks: { font: { size: 9, family: "'Share Tech Mono'" }, color: '#2d6a82' } },
          x: { grid: { color: 'rgba(0,212,255,0.04)' }, ticks: { font: { size: 9, family: "'Share Tech Mono'" }, color: '#2d6a82', maxTicksLimit: 10 } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [logs, traj])

  return (
    <div className="card">
      <div className="card-title">◈ HEALTH TRAJECTORY — PAST DATA + PREDICTED FUTURE</div>
      <div style={{ height: 200 }}><canvas ref={canvasRef} /></div>
      <div style={{ display: 'flex', gap: 20, marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9 }}>
        <span style={{ color: 'var(--cyan2)' }}>——— Past 7 days</span>
        <span style={{ color: 'var(--green)' }}>- - - If habits stay good</span>
        <span style={{ color: 'var(--red)' }}>- - - If habits decline</span>
      </div>
    </div>
  )
}

// ── JARVIS AI Insight Panel ─────────────────────────────────
function JarvisInsightPanel({ today, last7, baseline }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchInsight() {
    setLoading(true)
    const res = await aiApi.insight({ today, last7, baseline, targets: { protein: CONFIG.TARGET_PROTEIN_G, sleep: CONFIG.TARGET_SLEEP_H } })
    setInsight(res.insight || 'Connect your Apps Script URL in healthConfig.js to activate live AI insights.')
    setLoading(false)
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-title">◈ JARVIS AI ANALYSIS — LIVE INTELLIGENCE FEED</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cyan)', letterSpacing: '.1em', marginBottom: 10 }}>🧠 JARVIS ANALYSIS</div>
      {insight ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{insight}</div>
      ) : (
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', lineHeight: 2.0 }}>
            {today ? (
              <>
                <div>Energy: <span style={{ color: 'var(--cyan)' }}>{today.energyAM}/10 AM</span> · <span style={{ color: 'var(--cyan)' }}>{today.energyPM}/10 PM</span></div>
                <div>Sleep: <span style={{ color: scoreColor(today.sleepH / 8 * 100) }}>{today.sleepH}h</span> of target {CONFIG.TARGET_SLEEP_H}h</div>
                <div>Protein: <span style={{ color: scoreColor(today.proteinG / CONFIG.TARGET_PROTEIN_G * 100) }}>{today.proteinG}g</span> of target {CONFIG.TARGET_PROTEIN_G}g</div>
                <div>Digestion comfort: <span style={{ color: 'var(--cyan)' }}>{today.digestComfort}/10</span></div>
              </>
            ) : (
              <div style={{ color: 'var(--text3)' }}>Log today's data first to see live analysis.</div>
            )}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={fetchInsight}>
            {loading ? 'ANALYSING...' : 'GET JARVIS ANALYSIS ↗'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Quick stats row ─────────────────────────────────────────
function QuickStats({ scores, today }) {
  const items = [
    { label: 'ENERGY', val: scores.energy, unit: '/100', color: scoreColor(scores.energy) },
    { label: 'SLEEP', val: scores.sleep, unit: '/100', color: scoreColor(scores.sleep) },
    { label: 'DIGESTION', val: scores.digestion, unit: '/100', color: scoreColor(scores.digestion) },
    { label: 'NUTRITION', val: scores.nutrition, unit: '/100', color: scoreColor(scores.nutrition) },
    { label: 'MOVEMENT', val: scores.movement, unit: '/100', color: scoreColor(scores.movement) },
    { label: 'HABITS', val: scores.habit, unit: '/100', color: scoreColor(scores.habit) },
  ]
  return (
    <div className="grid-4" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 14 }}>
      {items.map((it, i) => (
        <div className="metric-card" key={i} style={{ textAlign: 'center', padding: '10px 8px' }}>
          <div className="metric-label">{it.label}</div>
          <div className="metric-value" style={{ fontSize: 20, color: it.color }}>{it.val}<span className="metric-unit">{it.unit}</span></div>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────
export default function Dashboard({ today, last7, last30, baseline }) {
  const scores = today ? computeScores(today) : { health: CONFIG.BASELINE.healthScore, energy: 72, sleep: 75, digestion: 80, nutrition: 70, movement: 65, habit: 70 }
  const twin = digitalTwin(today || {}, scores)
  const drift = detectDrift(last30, baseline)
  const traj = buildTrajectory(last30)

  return (
    <div>
      <div className="page-header">
        <h1>HEALTH COMMAND CENTER</h1>
        <p>// BODY SYSTEM MAP · DRIFT DETECTION · TRAJECTORY · JARVIS AI INTELLIGENCE</p>
      </div>
      <QuickStats scores={scores} today={today} />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <BodySystemMap twin={twin} scores={scores} />
        <JarvisInsightPanel today={today} last7={last7} baseline={baseline} />
      </div>
      <TrajectoryChart traj={traj} logs={last30} />
      <DriftRadar drift={drift} />
    </div>
  )
}
