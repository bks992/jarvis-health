import React, { useState, useCallback } from 'react'
import { CONFIG } from '../config/healthConfig.js'
import { useHealthData } from '../utils/useHealthData.js'
import { HudTopBar, Toast } from './shared/HudComponents.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LogPage from './pages/LogPage.jsx'
import { JarvisPage, TomorrowPage, PhotoPage, SimulatePage } from './pages/AiPages.jsx'
import { TwinPage, RadarPage, BiomarkersPage, AIInsightsPage, AIPatternsPage, AICoachPage, ReportPage } from './pages/HealthPages.jsx'

const NAV = [
  { section: '// CORE' },
  { id: 'dashboard', label: 'Command Center', icon: <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx=".5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx=".5" fill="currentColor" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx=".5" fill="currentColor" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx=".5" fill="currentColor" opacity=".5"/></svg> },
  { id: 'log', label: 'Daily Log', icon: <svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'jarvis', label: 'JARVIS Assistant', icon: <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M6 13h4M8 11v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'tomorrow', label: 'Tomorrow Plan', icon: <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8h4M9 6l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { section: '// ANALYSIS' },
  { id: 'twin', label: 'Digital Twin', icon: <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="3" fill="currentColor" opacity=".4"/></svg> },
  { id: 'radar', label: 'Risk Radar', icon: <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: 'biomarkers', label: 'Biomarkers', icon: <svg viewBox="0 0 16 16" fill="none"><path d="M2 12L5 8l3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { section: '// AI INTELLIGENCE' },
  { id: 'ai-insights', label: 'Health Insights', icon: <svg viewBox="0 0 16 16" fill="none"><path d="M8 2a5 5 0 100 10A5 5 0 008 2zM8 14v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'ai-patterns', label: 'Pattern Discovery', icon: <svg viewBox="0 0 16 16" fill="none"><path d="M2 8h2l2-4 3 8 2-4 1 2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'ai-coach', label: 'AI Coach', icon: <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 14c0-3 2.2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'report', label: 'Weekly Report', icon: <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { section: '// ADVANCED' },
  { id: 'photo', label: 'Photo Analysis', icon: <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/></svg> },
  { id: 'simulate', label: 'What-If Simulator', icon: <svg viewBox="0 0 16 16" fill="none"><path d="M2 14l3-5 3 2 3-6 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="3" r="1.5" fill="currentColor"/></svg> },
]

export default function AppShell() {
  const [page, setPage] = useState('dashboard')
  const [toast, setToast] = useState('')
  const [time, setTime] = React.useState(() => new Date().toTimeString().slice(0, 8))
  const [date, setDate] = React.useState(() => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase())
  const { logs, biomarkers, baseline, loading, today, last7, last30, addLog, biomarkerLatest, biomarkersByMarker } = useHealthData()

  React.useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setTime(n.toTimeString().slice(0, 8))
      setDate(n.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const showToast = useCallback((msg) => setToast(msg), [])

  const pages = {
    dashboard: <Dashboard today={today} last7={last7} last30={last30} baseline={baseline} />,
    log: <LogPage today={today} onLogSaved={addLog} toast={showToast} />,
    jarvis: <JarvisPage today={today} biomarkerLatest={biomarkerLatest} />,
    tomorrow: <TomorrowPage today={today} toast={showToast} />,
    twin: <TwinPage today={today} last30={last30} />,
    radar: <RadarPage last7={last7} today={today} />,
    biomarkers: <BiomarkersPage biomarkers={biomarkers} biomarkersByMarker={biomarkersByMarker} toast={showToast} />,
    'ai-insights': <AIInsightsPage today={today} last7={last7} baseline={baseline} />,
    'ai-patterns': <AIPatternsPage last30={last30} baseline={baseline} />,
    'ai-coach': <AICoachPage today={today} last7={last7} baseline={baseline} />,
    report: <ReportPage last7={last7} baseline={baseline} />,
    photo: <PhotoPage toast={showToast} />,
    simulate: <SimulatePage today={today} toast={showToast} />,
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>J.A.R.V.I.S INITIALIZING...</div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="app-name">J.A.R.V.I.S</div>
          <div className="app-sub">HEALTH INTELLIGENCE SYSTEM</div>
          <div className="app-status"><span className="pulse-dot" /><span>AGENT: {CONFIG.USER_NAME.toUpperCase()}</span></div>
        </div>
        {NAV.map((item, i) =>
          item.section ? (
            <div className="nav-section" key={i}>{item.section}</div>
          ) : (
            <a key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} href="#" onClick={e => { e.preventDefault(); setPage(item.id) }}>
              {item.icon}<span>{item.label}</span>
            </a>
          )
        )}
        <div className="sidebar-footer">
          <div className="sys-line"><span>SYSTEM</span><span className="sys-val">ONLINE</span></div>
          <div className="sys-line"><span>BACKEND</span><span className="sys-val">G-SHEETS</span></div>
          <div className="sys-line"><span>AI CORE</span><span className="sys-val">CLAUDE</span></div>
          <div className="sys-line"><span>{time}</span><span className="sys-val">{date}</span></div>
        </div>
      </nav>
      {/* Main */}
      <main className="main">
        <HudTopBar today={today} last7={last7} />
        <div style={{ padding: '20px 22px' }}>
          {pages[page]}
        </div>
      </main>
      <Toast message={toast} onHide={() => setToast('')} />
    </div>
  )
}
