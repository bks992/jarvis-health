import React, { useState } from 'react'
import { computeScores } from '../../utils/scoring.js'
import { CONFIG } from '../../config/healthConfig.js'
import { logsApi } from '../../services/api.js'

const HABITS = ['Morning juice', 'Yoga', 'Creon with meals', 'Ash gourd juice', 'Evening walk', 'No junk food', 'Protein target hit', 'Screen off by 10pm']
const GYM_GROUPS = ['None today', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Full body']
const RIB_OPTIONS = ['None', 'Mild', 'Moderate', 'Significant']

export default function LogPage({ today, onLogSaved, toast }) {
  const [form, setForm] = useState({
    sleepH: today?.sleepH || '', energyAM: today?.energyAM || '', energyPM: today?.energyPM || '',
    proteinG: today?.proteinG || '', fiberG: today?.fiberG || '', waterL: today?.waterL || '',
    veggieServings: today?.veggieServings || '', gasLevel: today?.gasLevel || 0,
    bloating: today?.bloating || 0, digestComfort: today?.digestComfort || 5,
    weightKg: today?.weightKg || '', yogaMins: today?.yogaMins || '',
    walkingSteps: today?.walkingSteps || '', gymGroup: today?.gymGroup || 'None today',
    ribDiscomfort: today?.ribDiscomfort || 'None', symptoms: today?.symptoms || '',
    notes: today?.notes || '', creonDoses: today?.creonDoses || 3,
    habits: today?.habits || {},
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleHabit = h => setForm(f => ({ ...f, habits: { ...f.habits, [h]: !f.habits[h] } }))

  async function save() {
    setSaving(true)
    const scores = computeScores(form)
    const log = { ...form, ...scores, date: new Date().toISOString().split('T')[0], healthScore: scores.health, energyScore: scores.energy, sleepScore: scores.sleep, digestionScore: scores.digestion, nutritionScore: scores.nutrition, movementScore: scores.movement, habitScore: scores.habit }
    await logsApi.save(log)
    onLogSaved(log)
    toast('DAILY LOG SAVED')
    setSaving(false)
  }

  const SliderRow = ({ label, k, min = 0, max = 10 }) => (
    <div className="form-row">
      <label className="form-label">{label}</label>
      <div className="slider-wrap">
        <input type="range" min={min} max={max} step="1" value={form[k]} onChange={e => set(k, +e.target.value)} />
        <span className="slider-val">{form[k]}</span>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header"><h1>DAILY LOG</h1><p>// LOG TODAY'S BIOMETRIC SIGNALS — JARVIS WILL ANALYSE</p></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">SLEEP & ENERGY</div>
          <div className="form-row"><label className="form-label">SLEEP DURATION (HOURS)</label><input className="form-input" type="number" min="3" max="12" step="0.5" value={form.sleepH} onChange={e => set('sleepH', e.target.value)} placeholder="7.5" /></div>
          <SliderRow label="MORNING ENERGY (0–10)" k="energyAM" />
          <SliderRow label="AFTERNOON ENERGY (0–10)" k="energyPM" />
        </div>
        <div className="card">
          <div className="card-title">NUTRITION</div>
          <div className="form-grid-2">
            <div className="form-row"><label className="form-label">PROTEIN (G)</label><input className="form-input" type="number" value={form.proteinG} onChange={e => set('proteinG', e.target.value)} placeholder="80" /></div>
            <div className="form-row"><label className="form-label">FIBER (G)</label><input className="form-input" type="number" value={form.fiberG} onChange={e => set('fiberG', e.target.value)} placeholder="25" /></div>
            <div className="form-row"><label className="form-label">WATER (L)</label><input className="form-input" type="number" step="0.1" value={form.waterL} onChange={e => set('waterL', e.target.value)} placeholder="2.5" /></div>
            <div className="form-row"><label className="form-label">VEGGIE SERVINGS</label><input className="form-input" type="number" value={form.veggieServings} onChange={e => set('veggieServings', e.target.value)} placeholder="4" /></div>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">DIGESTION SIGNALS</div>
          <SliderRow label="GAS LEVEL (0=none, 10=severe)" k="gasLevel" />
          <SliderRow label="BLOATING (0=none, 10=severe)" k="bloating" />
          <SliderRow label="DIGESTIVE COMFORT (0–10)" k="digestComfort" />
          <div className="form-row">
            <label className="form-label">RIB DISCOMFORT</label>
            <select className="form-select" value={form.ribDiscomfort} onChange={e => set('ribDiscomfort', e.target.value)}>
              {RIB_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-row"><label className="form-label">CREON DOSES TODAY</label><input className="form-input" type="number" min="0" max="10" value={form.creonDoses} onChange={e => set('creonDoses', +e.target.value)} /></div>
        </div>
        <div className="card">
          <div className="card-title">MOVEMENT</div>
          <div className="form-grid-2">
            <div className="form-row"><label className="form-label">YOGA (MINS)</label><input className="form-input" type="number" value={form.yogaMins} onChange={e => set('yogaMins', e.target.value)} placeholder="30" /></div>
            <div className="form-row"><label className="form-label">STEPS</label><input className="form-input" type="number" value={form.walkingSteps} onChange={e => set('walkingSteps', e.target.value)} placeholder="8000" /></div>
            <div className="form-row"><label className="form-label">WEIGHT (KG)</label><input className="form-input" type="number" step="0.1" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="65.5" /></div>
          </div>
          <div className="form-row">
            <label className="form-label">GYM / EXERCISE GROUP</label>
            <select className="form-select" value={form.gymGroup} onChange={e => set('gymGroup', e.target.value)}>
              {GYM_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">HABIT TRACKER</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {HABITS.map(h => (
            <div key={h} onClick={() => toggleHabit(h)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: form.habits[h] ? 'rgba(0,255,204,0.06)' : 'rgba(0,180,255,0.03)', border: `1px solid ${form.habits[h] ? 'rgba(0,255,204,0.3)' : 'var(--border3)'}`, borderRadius: 'var(--r)', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${form.habits[h] ? 'var(--green)' : 'var(--border)'}`, background: form.habits[h] ? 'rgba(0,255,204,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'var(--green)' }}>{form.habits[h] ? '✓' : ''}</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: form.habits[h] ? 'var(--green)' : 'var(--text2)' }}>{h}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">SYMPTOMS & NOTES</div>
        <div className="form-grid-2">
          <div className="form-row"><label className="form-label">SYMPTOMS TODAY</label><input className="form-input" value={form.symptoms} onChange={e => set('symptoms', e.target.value)} placeholder="Describe any symptoms..." /></div>
          <div className="form-row"><label className="form-label">ADDITIONAL NOTES</label><input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any observations..." /></div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ fontSize: 10, padding: '11px 28px' }} onClick={save} disabled={saving}>
        {saving ? 'SAVING...' : 'SAVE DAILY LOG ↗'}
      </button>
    </div>
  )
}
