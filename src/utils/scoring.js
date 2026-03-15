// J.A.R.V.I.S HealthOS — Scoring Engine
import { CONFIG } from '../config/healthConfig.js'

export function computeScores(d) {
  const energyAM = +d.energyAM || 0
  const energyPM = +d.energyPM || 0
  const energy = Math.round(((energyAM + energyPM) / 2) / 10 * 100)
  const sleep = Math.min(100, Math.round(((+d.sleepH || 0) / 8) * 100))
  const gas = +d.gasLevel || 0
  const bloat = +d.bloating || 0
  const comfort = +d.digestComfort || 5
  const digestion = Math.round(((10 - gas) * 0.3 + (10 - bloat) * 0.3 + comfort * 0.4) * 10)
  const protein = Math.min(100, Math.round(((+d.proteinG || 0) / CONFIG.TARGET_PROTEIN_G) * 100))
  const fiber = Math.min(100, Math.round(((+d.fiberG || 0) / 30) * 100))
  const water = Math.min(100, Math.round(((+d.waterL || 0) / CONFIG.TARGET_WATER_L) * 100))
  const veggies = Math.min(100, Math.round(((+d.veggieServings || 0) / 5) * 100))
  const nutrition = Math.round((protein + fiber + water + veggies) / 4)
  const yogaPoints = Math.min(40, +d.yogaMins || 0)
  const stepPoints = Math.min(30, Math.round(((+d.walkingSteps || 0) / 8000) * 30))
  const gymPoints = d.gymGroup && d.gymGroup !== 'None today' ? 30 : 0
  const movement = Math.min(100, yogaPoints + stepPoints + gymPoints)
  const habits = d.habits || {}
  const habitVals = Object.values(habits)
  const habitScore = habitVals.length ? Math.round(habitVals.filter(Boolean).length / habitVals.length * 100) : 0
  const symptomPenalty = (d.symptoms || '').length > 5 ? -5 : 0
  const health = Math.max(0, Math.min(100, Math.round(
    energy * 0.20 + sleep * 0.20 + digestion * 0.20 + nutrition * 0.15 + movement * 0.15 + habitScore * 0.10 + symptomPenalty
  )))
  return { health, energy, sleep, digestion, nutrition, movement, habit: habitScore }
}

export function digitalTwin(d, scores) {
  return {
    mitochondrialEnergy: Math.round((scores.energy * 0.6 + scores.sleep * 0.4)),
    digestiveIntegrity: Math.round(scores.digestion),
    immuneResilience: Math.round((scores.movement * 0.4 + scores.sleep * 0.3 + scores.nutrition * 0.3)),
    inflammatoryLoad: Math.round(100 - (((+d.gasLevel || 0) + (d.ribDiscomfort === 'Significant' ? 8 : d.ribDiscomfort === 'Moderate' ? 5 : d.ribDiscomfort === 'Mild' ? 2 : 0)) / 2) * 10),
    muscleRepair: Math.round((scores.nutrition * 0.5 + scores.movement * 0.5)),
    sleepRecovery: Math.round(scores.sleep),
    nutritionalBalance: Math.round(scores.nutrition),
  }
}

export function detectDrift(logs, baseline) {
  if (!logs || logs.length < 5) return { state: 'insufficient', signals: [] }
  const recent7 = logs.slice(-7)
  const avg = key => recent7.reduce((s, r) => s + (+r[key] || 0), 0) / recent7.length

  const avgEnergy = avg('energyAM')
  const avgSleep = avg('sleepH')
  const avgDigestion = avg('digestionScore') || avg('digestComfort') * 10
  const avgHealth = avg('healthScore')

  const base = { ...CONFIG.BASELINE, ...baseline }

  const signals = [
    { name: 'Energy', current: avgEnergy * 10, baseline: base.energy * 10, unit: '/100' },
    { name: 'Sleep', current: avgSleep / 8 * 100, baseline: base.sleep / 8 * 100, unit: 'h' },
    { name: 'Digestion', current: avgDigestion || base.digestionScore, baseline: base.digestionScore, unit: '/100' },
    { name: 'Health Score', current: avgHealth || base.healthScore, baseline: base.healthScore, unit: '/100' },
  ].map(s => {
    const delta = s.current - s.baseline
    const pct = Math.round(delta)
    return {
      ...s,
      delta: pct,
      direction: pct > 8 ? 'up' : pct < -8 ? 'down' : 'stable',
    }
  })

  const downCount = signals.filter(s => s.direction === 'down').length
  const state = downCount >= 3 ? 'instability' : downCount >= 2 ? 'drifting' : 'stable'
  return { state, signals }
}

export function riskRadar(logs, today) {
  const risks = []
  const last7 = logs.slice(-7)
  const avgSleep = last7.reduce((s, r) => s + (+r.sleepH || 0), 0) / (last7.length || 1)
  if (avgSleep < CONFIG.TARGET_SLEEP_H - 0.5) {
    risks.push({ level: avgSleep < 6 ? 'high' : 'medium', title: 'Sleep deficit pattern', desc: `Avg ${avgSleep.toFixed(1)}h over last ${last7.length} days (target ${CONFIG.TARGET_SLEEP_H}h)`, action: 'Set a firm 10pm wind-down routine', confidence: 85 })
  }
  const avgProtein = last7.reduce((s, r) => s + (+r.proteinG || 0), 0) / (last7.length || 1)
  if (avgProtein < CONFIG.TARGET_PROTEIN_G - 10) {
    risks.push({ level: 'medium', title: 'Protein below target', desc: `Avg ${Math.round(avgProtein)}g vs ${CONFIG.TARGET_PROTEIN_G}g target`, action: 'Add paneer, eggs, or dal at one extra meal', confidence: 75 })
  }
  const avgGas = last7.reduce((s, r) => s + (+r.gasLevel || 0), 0) / (last7.length || 1)
  if (avgGas > 5) {
    risks.push({ level: 'medium', title: 'Elevated gas pattern', desc: `Gas averaging ${avgGas.toFixed(1)}/10 this week`, action: 'Review meal timing and fat content', confidence: 70 })
  }
  if (logs.length >= 7) {
    const recent3 = logs.slice(-3).map(r => +r.weightKg || 0).filter(Boolean)
    const older4 = logs.slice(-7, -3).map(r => +r.weightKg || 0).filter(Boolean)
    if (recent3.length && older4.length) {
      const rAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length
      const oAvg = older4.reduce((a, b) => a + b, 0) / older4.length
      if (oAvg - rAvg > 1) risks.push({ level: 'high', title: 'Weight declining', desc: `Weight dropped ~${(oAvg - rAvg).toFixed(1)}kg over 7 days`, action: 'Increase caloric intake and inform your oncologist', confidence: 80 })
    }
  }
  if (today && (today.ribDiscomfort === 'Moderate' || today.ribDiscomfort === 'Significant')) {
    risks.push({ level: today.ribDiscomfort === 'Significant' ? 'high' : 'medium', title: 'Right rib discomfort', desc: `Reported as ${today.ribDiscomfort.toLowerCase()} today`, action: 'Log daily — contact oncologist if persists beyond 3 days', confidence: 90 })
  }
  return risks
}

export function scoreColor(score) {
  if (score >= 85) return '#00ffcc'
  if (score >= 75) return '#00d4ff'
  if (score >= 65) return '#ffb347'
  return '#ff3d3d'
}

export function scoreLabel(score) {
  if (score >= 90) return 'Optimal'
  if (score >= 80) return 'Good stability'
  if (score >= 70) return 'Monitor closely'
  if (score >= 60) return 'Risk developing'
  return 'Health instability'
}

export function buildTrajectory(logs) {
  if (!logs || logs.length < 3) return null
  const recent = logs.slice(-7)
  const avgScore = recent.reduce((s, r) => s + (+r.healthScore || 0), 0) / recent.length
  const trend = logs.length >= 14
    ? avgScore - (logs.slice(-14, -7).reduce((s, r) => s + (+r.healthScore || 0), 0) / 7)
    : 0
  const today = Math.round(avgScore)
  const goodPath = [today, Math.round(today + 3), Math.round(today + 6)]
  const badPath = [today, Math.round(today - 7), Math.round(today - 14)]
  return { today, trend, goodPath, badPath }
}
