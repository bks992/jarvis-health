import React, { useState, useEffect, useCallback } from 'react'
import { scoreColor, scoreLabel } from '../../utils/scoring.js'
import { CONFIG } from '../../config/healthConfig.js'

export function HudTopBar({ today, last7 }) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(n.toTimeString().slice(0, 8))
      setDate(n.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase())
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  const score = today?.healthScore || CONFIG.BASELINE.healthScore
  const col = scoreColor(score)
  return (
    <div className="hud-topbar">
      <div className="hud-item">
        <div className="hud-label">HEALTH SCORE</div>
        <div className="hud-score" style={{ color: col }}>{score}</div>
      </div>
      <div className="hud-sep" />
      <div className="hud-item">
        <div className="hud-label">AGENT</div>
        <div className="hud-val" style={{ fontFamily: 'var(--font)', fontSize: 11 }}>{CONFIG.USER_NAME.toUpperCase()}</div>
      </div>
      <div className="hud-sep" />
      <div className="hud-item">
        <div className="hud-label">STATUS</div>
        <div className="hud-val" style={{ fontSize: 11, color: col }}>{scoreLabel(score)}</div>
      </div>
      <div className="hud-sep" />
      <div className="hud-item">
        <div className="hud-label">CA 19-9</div>
        <div className="hud-val" style={{ fontFamily: 'var(--font)', fontSize: 11, color: 'var(--green)' }}>28 U/mL ↓</div>
      </div>
      <div className="hud-status">
        <div className="hud-dot" />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)' }}>JARVIS ONLINE</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginLeft: 12 }}>{time} · {date}</span>
      </div>
    </div>
  )
}

export function Toast({ message, onHide }) {
  useEffect(() => {
    if (!message) return
    const id = setTimeout(onHide, 3000)
    return () => clearTimeout(id)
  }, [message, onHide])
  return <div className={`toast ${message ? 'show' : ''}`}>// {message}</div>
}

export function StatBar({ label, value, color, max = 100 }) {
  return (
    <div className="stat-bar-row">
      <div className="stat-bar-label">{label}</div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${Math.min(100, value / max * 100)}%`, background: color || 'var(--cyan)' }} />
      </div>
      <div className="stat-bar-val">{value}</div>
    </div>
  )
}
