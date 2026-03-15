import React, { useState, useRef, useEffect } from 'react'
import { aiApi, plansApi } from '../../services/api.js'
import { CONFIG } from '../../config/healthConfig.js'

// ── JARVIS System prompt ────────────────────────────────────
function buildSys(today, biomarkerLatest) {
  const ca = biomarkerLatest?.('CA 19-9')
  return `You are J.A.R.V.I.S — Just A Rather Very Intelligent System — a personal health intelligence AI for a cancer survivor recovering from pancreatic surgery and chemotherapy. Speak precisely, calmly, with occasional dry humour in JARVIS style.

LIVE PATIENT DATA:
- Health Score: ${today?.healthScore || 'no log today'} / 100 (target: ${CONFIG.TARGET_HEALTH_SCORE})
- CA 19-9: ${ca?.value || 28} U/mL (was 420 — strong remission)
- Sleep: ${today?.sleepH || 'not logged'}h (target ${CONFIG.TARGET_SLEEP_H}h)
- Energy AM: ${today?.energyAM || '—'}/10 · PM: ${today?.energyPM || '—'}/10
- Protein: ${today?.proteinG || '—'}g (target ${CONFIG.TARGET_PROTEIN_G}g)
- Gas: ${today?.gasLevel || '—'}/10 · Digestion comfort: ${today?.digestComfort || '—'}/10
- Weight: ${today?.weightKg || 65.2} kg · Creon: ${today?.creonDoses || 3} doses/day
- Rib discomfort: ${today?.ribDiscomfort || 'not logged'}
- Baseline health score: ${CONFIG.BASELINE.healthScore}

Keep responses under 100 words. Reference actual numbers. Be specific and actionable. JARVIS personality throughout.`
}

// ════════════════════════════════════════════════════════════
// JARVIS CHAT
// ════════════════════════════════════════════════════════════
export function JarvisPage({ today, biomarkerLatest }) {
  const [messages, setMessages] = useState([
    { role: 'j', text: `Good day. I am J.A.R.V.I.S.\n\nYour CA 19-9 is at 28 U/mL — down from 420. Remission is holding strong.\n\nHealth score: ${today?.healthScore || CONFIG.BASELINE.healthScore}/100. How may I assist with your recovery mission today?`, time: 'ALL SYSTEMS ONLINE' }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const msgRef = useRef(null)
  const QUICK = ['Why is my energy low today?', 'What should I eat today for cancer recovery?', 'Analyse my sleep pattern this week', 'What is my biggest health risk right now?', 'How is my cancer remission looking?', 'Give me a protein plan for today']

  async function send(q) {
    const text = q || input.trim(); if (!text) return; setInput('')
    setMessages(m => [...m, { role: 'u', text, time: new Date().toTimeString().slice(0, 8) }])
    setThinking(true)
    const res = await aiApi.chat({ system: buildSys(today, biomarkerLatest), userMsg: text })
    setMessages(m => [...m, { role: 'j', text: res.reply || 'AI core requires Apps Script configuration.', time: new Date().toTimeString().slice(0, 8) }])
    setThinking(false)
  }

  useEffect(() => { if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight }, [messages, thinking])

  return (
    <div>
      <div className="page-header"><h1>J.A.R.V.I.S ASSISTANT</h1><p>// JUST A RATHER VERY INTELLIGENT SYSTEM · POWERED BY CLAUDE AI</p></div>
      <div className="card jarvis-container">
        <div className="card-title">AI HEALTH INTELLIGENCE INTERFACE</div>
        <div className="jarvis-messages" ref={msgRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'u' ? 'msg-user' : ''}`}>
              <div className={`msg-avatar ${m.role === 'j' ? 'msg-j-avatar' : 'msg-u-avatar'}`}>{m.role === 'j' ? 'J' : 'B'}</div>
              <div>
                <div className={`msg-bubble ${m.role === 'j' ? 'msg-j-bubble' : 'msg-u-bubble'}`} style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                <div className="msg-time" style={m.role === 'u' ? { textAlign: 'right' } : {}}>{m.time}</div>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="msg"><div className="msg-avatar msg-j-avatar">J</div><div><div className="msg-bubble msg-j-bubble"><span className="ai-loading">PROCESSING QUERY...</span></div></div></div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 8px' }}>
          {QUICK.map(q => <button key={q} className="quick-btn" onClick={() => send(q)}>{q}</button>)}
        </div>
        <div className="jarvis-input-row">
          <input className="jarvis-input" placeholder="ASK JARVIS: Why am I tired? What yoga should I do? Analyse my digestion..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="send-btn" onClick={() => send()}>TRANSMIT ↗</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TOMORROW PLAN
// ════════════════════════════════════════════════════════════
export function TomorrowPage({ today, toast }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await aiApi.tomorrow({
      today: today ? { health: today.healthScore, sleep: today.sleepH, protein: today.proteinG, energy: today.energyAM, digestion: today.digestComfort, gas: today.gasLevel, symptoms: today.symptoms, yoga: today.yogaMins, gym: today.gymGroup, rib: today.ribDiscomfort } : null,
      targets: { protein: CONFIG.TARGET_PROTEIN_G, sleep: CONFIG.TARGET_SLEEP_H, water: CONFIG.TARGET_WATER_L },
    })
    const defaults = {
      juice: 'Ash gourd juice — excellent for pancreatic recovery and inflammation',
      yoga: 'Pavanmuktasana + Bhujangasana + Anulom Vilom (30 mins)',
      supplements: 'Creon with every meal · Vitamin D 2000 IU · Omega-3',
      protein: `Target ${CONFIG.TARGET_PROTEIN_G + 8}g — add paneer or eggs at lunch`,
      food: 'High fiber vegetables + anti-inflammatory turmeric dal + seeds',
      water: `${CONFIG.TARGET_WATER_L + 0.3}L — increase from today`,
      exercise: today?.gymGroup !== 'None today' ? 'Rest day or light yoga only' : 'Strength training 30 mins',
      steps: '8000 steps — 20 min post-lunch walk + evening stroll',
      sleep: `${CONFIG.TARGET_SLEEP_H + 0.5}h — screens off by 9pm`,
      watch: 'Monitor rib discomfort · Log digestion in morning brief',
      briefing: 'Mission parameters set. Your recovery protocol is optimised based on today\'s biometric analysis. Execute all protocols consistently for maximum healing efficiency.',
    }
    const p = res.plan || defaults
    setPlan({ ...defaults, ...p })
    await plansApi.save({ date: new Date().toISOString().split('T')[0], ...p })
    toast('TOMORROW PLAN GENERATED')
    setLoading(false)
  }

  const PlanItem = ({ icon, cat, val }) => (
    <div className="plan-item">
      <div className="plan-icon">{icon}</div>
      <div><div className="plan-cat">{cat}</div><div className="plan-val">{val || '...'}</div></div>
    </div>
  )

  return (
    <div>
      <div className="page-header"><h1>TOMORROW PLAN</h1><p>// AI-GENERATED HEALING PROTOCOL · JUICE · YOGA · FOOD · EXERCISE · RECOVERY</p></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">GENERATE TOMORROW PROTOCOL</div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.7 }}>JARVIS ANALYSES TODAY'S DATA AND GENERATES A COMPLETE PERSONALISED HEALING PLAN.</p>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>{loading ? 'GENERATING...' : 'GENERATE TOMORROW PLAN ↗'}</button>
        </div>
        <div className="card">
          <div className="card-title">TODAY'S SUMMARY</div>
          {today ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', lineHeight: 2.0 }}>
              <div>HEALTH SCORE: <span style={{ color: 'var(--cyan)' }}>{today.healthScore}</span></div>
              <div>SLEEP: <span style={{ color: 'var(--cyan)' }}>{today.sleepH}H</span> · PROTEIN: <span style={{ color: 'var(--cyan)' }}>{today.proteinG}G</span></div>
              <div>ENERGY AM: <span style={{ color: 'var(--cyan)' }}>{today.energyAM}/10</span> · PM: <span style={{ color: 'var(--cyan)' }}>{today.energyPM}/10</span></div>
            </div>
          ) : <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>LOG TODAY'S DATA FIRST.</div>}
        </div>
      </div>
      {plan && (
        <>
          <div style={{ fontFamily: 'var(--font)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '.15em', margin: '4px 0 12px' }}>🌅 TOMORROW HEALING PLAN</div>
          <div className="grid-2">
            <div className="card">
              <div className="card-title">MORNING PROTOCOL</div>
              <PlanItem icon="🥤" cat="MORNING JUICE" val={plan.juice} />
              <PlanItem icon="🧘" cat="YOGA SEQUENCE" val={plan.yoga} />
              <PlanItem icon="💊" cat="SUPPLEMENTS & CREON" val={plan.supplements} />
            </div>
            <div className="card">
              <div className="card-title">NUTRITION PROTOCOL</div>
              <PlanItem icon="🥩" cat="PROTEIN TARGET" val={plan.protein} />
              <PlanItem icon="🥦" cat="FOOD FOCUS" val={plan.food} />
              <PlanItem icon="💧" cat="HYDRATION" val={plan.water} />
            </div>
            <div className="card">
              <div className="card-title">EXERCISE PROTOCOL</div>
              <PlanItem icon="💪" cat="WORKOUT" val={plan.exercise} />
              <PlanItem icon="🚶" cat="WALKING TARGET" val={plan.steps} />
            </div>
            <div className="card">
              <div className="card-title">RECOVERY PROTOCOL</div>
              <PlanItem icon="😴" cat="SLEEP TARGET" val={plan.sleep} />
              <PlanItem icon="⚠️" cat="WATCH SIGNAL" val={plan.watch} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">JARVIS MISSION BRIEFING</div>
            <div className="ai-box" style={{ marginTop: 0 }}>{plan.briefing}</div>
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PHOTO ANALYSIS
// ════════════════════════════════════════════════════════════
export function PhotoPage({ toast }) {
  const [b64, setB64] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setPreview(ev.target.result); setB64(ev.target.result.split(',')[1]) }
    reader.readAsDataURL(file)
  }

  async function analyse() {
    if (!b64) return; setLoading(true)
    const res = await aiApi.photo({ imageBase64: b64 })
    setResult(res.analysis || 'Photo analysis requires Apps Script with Anthropic API key configured.')
    toast('MEAL ANALYSIS COMPLETE'); setLoading(false)
  }

  return (
    <div>
      <div className="page-header"><h1>PHOTO ANALYSIS</h1><p>// MEAL PHOTO INTELLIGENCE · NUTRITIONAL ANALYSIS · CLAUDE VISION AI</p></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">UPLOAD MEAL PHOTO</div>
          <div className="photo-drop" onClick={() => document.getElementById('photoInput').click()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 10, color: 'var(--cyan)', letterSpacing: '.1em', marginBottom: 6 }}>TAP TO UPLOAD MEAL PHOTO</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>JPG · PNG · WEBP SUPPORTED</div>
            <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
          {preview && (
            <div style={{ marginTop: 12 }}>
              <img src={preview} style={{ width: '100%', borderRadius: 'var(--r)', border: '1px solid var(--border)' }} alt="meal" />
              <div className="btn-row">
                <button className="btn btn-primary" onClick={analyse} disabled={loading}>{loading ? 'ANALYSING...' : 'ANALYSE WITH JARVIS ↗'}</button>
                <button className="btn btn-outline" onClick={() => { setPreview(null); setB64(null); setResult('') }}>CLEAR</button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">MEAL ANALYSIS RESULT</div>
          {result ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{result}</div>
          ) : (
            <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10, padding: '30px 0', textAlign: 'center' }}>UPLOAD A MEAL PHOTO TO ACTIVATE NUTRITIONAL INTELLIGENCE</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// WHAT-IF SIMULATOR
// ════════════════════════════════════════════════════════════
export function SimulatePage({ today, toast }) {
  const [params, setParams] = useState({ protein: 80, sleep: 7.5, exercise: 45, stress: 30 })
  const [result, setResult] = useState(null)
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setParams(p => ({ ...p, [k]: v }))
  const col = s => s >= 85 ? '#00ffcc' : s >= 75 ? '#00d4ff' : s >= 65 ? '#ffb347' : '#ff3d3d'

  async function run() {
    const base = +today?.healthScore || 75
    const energyGain = Math.round((params.protein - (+today?.proteinG || 70)) / CONFIG.TARGET_PROTEIN_G * 15 + (params.sleep - (+today?.sleepH || 6.5)) * 5)
    const muscleGain = Math.round((params.protein - (+today?.proteinG || 70)) / 10 + params.exercise / 30 * 5)
    const immuneGain = Math.round(params.sleep * 3 + params.stress / 10)
    const newScore = Math.min(100, Math.max(0, Math.round(base + energyGain * 0.5 + muscleGain * 0.3)))
    setResult({ newScore, energyGain, muscleGain, immuneGain, base })
    setLoading(true)
    const res = await aiApi.simulate({ base, ...params, newScore, currentProtein: today?.proteinG, currentSleep: today?.sleepH })
    setAiText(res.analysis || `Simulation indicates a ${newScore - base > 0 ? 'positive' : 'neutral'} trajectory. Protein increase to ${params.protein}g combined with ${params.sleep}h sleep shows the highest recovery potential.`)
    setLoading(false)
    toast('SIMULATION COMPLETE')
  }

  const SliderParam = ({ label, k, min, max, step = 1 }) => (
    <div className="form-row">
      <label className="form-label">{label}</label>
      <div className="slider-wrap">
        <input type="range" min={min} max={max} step={step} value={params[k]} onChange={e => set(k, +e.target.value)} />
        <span className="slider-val">{params[k]}</span>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header"><h1>WHAT-IF SIMULATOR</h1><p>// PREDICTIVE HEALTH MODELLING · SIMULATE LIFESTYLE CHANGES · AI ANALYSIS</p></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">SIMULATION PARAMETERS</div>
          <SliderParam label="IF PROTEIN INCREASES TO (G/DAY)" k="protein" min={40} max={120} step={5} />
          <SliderParam label="IF SLEEP IMPROVES TO (HOURS)" k="sleep" min={5} max={10} step={0.5} />
          <SliderParam label="IF DAILY EXERCISE (MINUTES)" k="exercise" min={0} max={90} step={5} />
          <SliderParam label="IF STRESS REDUCES BY (%)" k="stress" min={0} max={80} step={10} />
          <div className="btn-row"><button className="btn btn-primary" onClick={run}>RUN SIMULATION ↗</button></div>
        </div>
        <div className="card">
          <div className="card-title">PREDICTED IMPACT</div>
          {result ? (
            <>
              {[
                { label: 'PREDICTED HEALTH SCORE', val: result.newScore, max: 100 },
                { label: 'ENERGY IMPROVEMENT', val: Math.min(100, 50 + result.energyGain), max: 100, display: `${result.energyGain > 0 ? '+' : ''}${result.energyGain}%` },
                { label: 'MUSCLE REPAIR RATE', val: Math.min(100, 40 + result.muscleGain), max: 100, display: `+${result.muscleGain}%` },
                { label: 'IMMUNE RESILIENCE', val: Math.min(100, 50 + result.immuneGain), max: 100, display: `+${result.immuneGain}%` },
              ].map((r, i) => (
                <div key={i} className="sim-row">
                  <div className="sim-label"><span>{r.label}</span><span style={{ color: col(r.val), fontFamily: 'var(--font)' }}>{r.display || r.val}</span></div>
                  <div className="sim-bar" style={{ width: `${r.val}%`, background: col(r.val) }} />
                </div>
              ))}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 10 }}>PREDICTIVE ESTIMATE · RUN 7+ DAYS TO VALIDATE</div>
            </>
          ) : <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', padding: '20px 0', textAlign: 'center' }}>ADJUST PARAMETERS AND RUN SIMULATION</div>}
        </div>
      </div>
      {aiText && (
        <div className="card">
          <div className="card-title">JARVIS SIMULATION ANALYSIS</div>
          <div className="ai-box" style={{ marginTop: 0 }}>{loading ? <span className="ai-loading">JARVIS ANALYSING...</span> : aiText}</div>
        </div>
      )}
    </div>
  )
}
