import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  getFoodLogs, saveFoodLog, getBloodReports, saveBloodReport,
  getGuides, saveGuide, getPlans, savePlan, getChat, saveChat,
  getIntolerances, saveIntolerance, getDailyLog, saveDailyLog,
} from './firebase'
import { askJarvis, imgToBase64, speak, stopSpeaking, unlockSpeech } from './api'

// ─── VOICE COMMANDS ───────────────────────────────────────────────────────────
const VOICE_COMMANDS = {
  'scan food':'food','check meal':'food','food':'food',
  'blood report':'blood','lab report':'blood','blood test':'blood',
  'yoga':'fitness','gym':'fitness','exercise':'fitness','workout':'fitness',
  'recovery':'recovery','hair':'recovery','fertility':'recovery',
  'home':'home','log today':'log','daily log':'log',
  'track':'track','history':'track','progress':'track',
  'chat':'coach','help':'coach','tired':'coach',
}

// ─── SCORING ──────────────────────────────────────────────────────────────────
function scoreColor(n) {
  if (n >= 80) return '#10B981'
  if (n >= 60) return '#3B82F6'
  if (n >= 40) return '#F59E0B'
  return '#EF4444'
}
function computeDayScore(log) {
  if (!log) return { food:0, water:0, yoga:0, gym:0, sleep:0, overall:0 }
  const food  = Math.min(100, Math.round(((+log.proteinG||0)/80*40)+((+log.veggieServings||0)/5*35)+((+log.fiberG||0)/30*25)))
  const water = Math.min(100, Math.round(((+log.waterL||0)/2.5)*100))
  const yoga  = Math.min(100, Math.round(((+log.yogaMins||0)/45)*100))
  const hasGym = log.gymGroup && log.gymGroup !== 'None today'
  const gym   = Math.min(100, Math.round(((+log.walkingSteps||0)/8000*60)+(hasGym?40:0)))
  const sleep = Math.min(100, Math.round(((+log.sleepH||0)/7.5)*100))
  const overall = Math.round(food*0.28+water*0.18+yoga*0.22+gym*0.20+sleep*0.12)
  return { food, water, yoga, gym, sleep, overall }
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: #0A0F1E; color: #E2E8F0; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; line-height: 1.5; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1E3A5F; border-radius: 2px; }
  textarea, input, select, button { font-family: inherit; }
  textarea::placeholder, input::placeholder { color: #334155; }
  select option { background: #0F172A; }

  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes fadeIn   { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes slideIn  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
  @keyframes ripple   { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.5);opacity:0} }

  .fade-in { animation: fadeIn 0.25s ease forwards; }
  .pulse   { animation: pulse 2s ease infinite; }

  /* ── Layout ── */
  .app-layout {
    display: flex;
    min-height: 100vh;
  }

  /* ── Sidebar (desktop) ── */
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #080D1A;
    border-right: 1px solid #0F1E35;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 100;
    overflow-y: auto;
  }
  .sidebar-brand {
    padding: 20px 16px 16px;
    border-bottom: 1px solid #0F1E35;
  }
  .sidebar-logo {
    display: flex; align-items: center; gap: 10px; margin-bottom: 2px;
  }
  .sidebar-logo-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, #3B82F6, #1D4ED8);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .sidebar-logo-name {
    font-size: 15px; font-weight: 700; color: #F8FAFC; letter-spacing: -0.3px;
  }
  .sidebar-status {
    display: flex; align-items: center; gap: 6px;
    margin-top: 8px; font-size: 11px; color: #475569;
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #10B981; flex-shrink: 0;
  }

  .nav-section-label {
    padding: 14px 16px 5px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.8px;
    color: #334155; text-transform: uppercase;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 16px; cursor: pointer;
    font-size: 13px; font-weight: 500; color: #64748B;
    border-radius: 0; border-left: 2px solid transparent;
    transition: all 0.15s; text-decoration: none;
  }
  .nav-item:hover { color: #94A3B8; background: rgba(255,255,255,0.03); }
  .nav-item.active { color: #E2E8F0; background: rgba(59,130,246,0.08); border-left-color: #3B82F6; }
  .nav-item svg { width: 15px; height: 15px; flex-shrink: 0; }

  .sidebar-footer {
    margin-top: auto; padding: 14px 16px;
    border-top: 1px solid #0F1E35;
  }

  /* ── Main content ── */
  .main-content {
    margin-left: 220px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .top-bar {
    position: sticky; top: 0; z-index: 50;
    background: rgba(8,13,26,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #0F1E35;
    padding: 12px 24px;
    display: flex; align-items: center; gap: 14px;
  }
  .page-content {
    padding: 24px;
    flex: 1;
    max-width: 960px;
  }
  .page-title {
    font-size: 20px; font-weight: 700; color: #F8FAFC;
    margin-bottom: 4px; letter-spacing: -0.3px;
  }
  .page-subtitle {
    font-size: 13px; color: #475569; margin-bottom: 20px;
  }

  /* ── Cards ── */
  .card {
    background: #0F172A;
    border: 1px solid #1E293B;
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 14px;
  }
  .card-title {
    font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
    color: #475569; text-transform: uppercase; margin-bottom: 14px;
  }
  .card-sm { padding: 14px 16px; }

  /* ── Stat cards grid ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .stat-card {
    background: #0F172A;
    border: 1px solid #1E293B;
    border-radius: 10px;
    padding: 14px;
    text-align: center;
  }
  .stat-value {
    font-size: 26px; font-weight: 700;
    margin: 4px 0 2px;
  }
  .stat-label {
    font-size: 11px; font-weight: 600; color: #475569;
    text-transform: uppercase; letter-spacing: 0.5px;
  }

  /* ── Progress bar ── */
  .progress-bar-wrap { height: 4px; background: #1E293B; border-radius: 2px; overflow: hidden; }
  .progress-bar-fill { height: 100%; border-radius: 2px; transition: width 0.8s ease; }

  /* ── Form elements ── */
  .form-label {
    display: block; font-size: 12px; font-weight: 500;
    color: #64748B; margin-bottom: 6px; letter-spacing: 0.3px;
  }
  .form-input {
    width: 100%; padding: 9px 12px;
    background: #0A0F1E; border: 1px solid #1E293B;
    border-radius: 8px; color: #E2E8F0; font-size: 14px;
    outline: none; transition: border-color 0.15s;
  }
  .form-input:focus { border-color: #3B82F6; }
  .form-row { margin-bottom: 14px; }
  .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  /* Slider */
  .slider-wrap { display: flex; align-items: center; gap: 10px; }
  .slider-input {
    flex: 1; -webkit-appearance: none; height: 4px;
    border-radius: 2px; outline: none; cursor: pointer;
  }
  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px;
    border-radius: 50%; background: #3B82F6; cursor: pointer;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
  }
  .slider-val {
    min-width: 28px; text-align: right;
    font-size: 14px; font-weight: 600; color: #E2E8F0;
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 10px 18px; border-radius: 8px; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-primary {
    background: #3B82F6; color: white;
  }
  .btn-primary:hover { background: #2563EB; }
  .btn-primary:disabled { background: #1E293B; color: #475569; cursor: not-allowed; }
  .btn-outline {
    background: transparent; color: #94A3B8;
    border: 1px solid #1E293B;
  }
  .btn-outline:hover { background: #0F172A; color: #E2E8F0; border-color: #334155; }
  .btn-full { width: 100%; }
  .btn-sm { padding: 7px 12px; font-size: 12px; }
  .btn-green { background: #10B981; color: white; }
  .btn-green:hover { background: #059669; }
  .btn-green:disabled { background: #1E293B; color: #475569; cursor: not-allowed; }

  /* ── Badge ── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 20px;
    font-size: 11px; font-weight: 600;
  }

  /* ── Tabs (top) ── */
  .tab-bar {
    display: flex; gap: 4px; margin-bottom: 18px;
    border-bottom: 1px solid #1E293B; padding-bottom: 0;
  }
  .tab-btn {
    padding: 8px 14px; background: none; border: none;
    font-size: 13px; font-weight: 500; color: #475569;
    cursor: pointer; border-bottom: 2px solid transparent;
    margin-bottom: -1px; transition: all 0.15s;
  }
  .tab-btn.active { color: #3B82F6; border-bottom-color: #3B82F6; }
  .tab-btn:hover:not(.active) { color: #94A3B8; }

  /* ── Upload zone ── */
  .upload-zone {
    border: 1.5px dashed #1E293B; border-radius: 10px;
    padding: 32px; text-align: center; cursor: pointer;
    transition: all 0.15s; background: #0A0F1E;
  }
  .upload-zone:hover { border-color: #3B82F6; background: rgba(59,130,246,0.04); }
  .upload-zone.has-img { padding: 0; overflow: hidden; border-style: solid; border-color: #1E3A5F; }

  /* ── Habit chip ── */
  .habit-chip {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; border-radius: 8px; cursor: pointer;
    border: 1px solid #1E293B; transition: all 0.15s;
    background: #0A0F1E;
  }
  .habit-chip.done { background: rgba(16,185,129,0.07); border-color: rgba(16,185,129,0.3); }
  .habit-check {
    width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
    border: 1.5px solid #334155; display: flex; align-items: center;
    justify-content: center; font-size: 10px; color: #10B981;
    transition: all 0.15s;
  }
  .habit-chip.done .habit-check { background: rgba(16,185,129,0.15); border-color: #10B981; }

  /* ── Day row (tracker) ── */
  .day-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; border-radius: 8px; cursor: pointer;
    border: 1px solid transparent; margin-bottom: 4px;
    transition: all 0.15s; background: rgba(15,23,42,0.5);
  }
  .day-row:hover { background: rgba(15,23,42,0.9); border-color: #1E293B; }
  .day-row.selected { background: rgba(59,130,246,0.07); border-color: rgba(59,130,246,0.25); }
  .day-row.no-data { opacity: 0.35; }

  /* ── Chat ── */
  .chat-bubble {
    max-width: 78%; padding: 10px 14px; border-radius: 12px;
    font-size: 14px; line-height: 1.65; white-space: pre-wrap;
  }
  .chat-bubble.user {
    background: #1E3A5F; color: #E2E8F0; border-radius: 12px 12px 3px 12px;
    margin-left: auto;
  }
  .chat-bubble.assistant {
    background: #0F172A; color: #CBD5E1; border: 1px solid #1E293B;
    border-radius: 12px 12px 12px 3px;
  }

  /* ── Toast ── */
  .toast {
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    background: #10B981; color: white; padding: 9px 18px;
    border-radius: 8px; font-size: 13px; font-weight: 500;
    z-index: 9999; box-shadow: 0 4px 16px rgba(16,185,129,0.35);
    white-space: nowrap; pointer-events: none;
  }

  /* ── Arc reactor (voice button) ── */
  .arc-reactor {
    position: relative; width: 40px; height: 40px; cursor: pointer; flex-shrink: 0;
  }
  .arc-outer {
    position: absolute; inset: 0; border-radius: 50%;
    border: 1.5px solid #1E3A5F;
    animation: spin 8s linear infinite;
  }
  .arc-inner {
    position: absolute; inset: 8px; border-radius: 50%;
    background: #0A0F1E; border: 1.5px solid #1E3A5F;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; transition: all 0.2s;
  }
  .arc-reactor.active .arc-outer { border-color: #3B82F6; animation-duration: 2s; }
  .arc-reactor.active .arc-inner { background: rgba(59,130,246,0.15); border-color: #3B82F6; }
  .arc-ripple {
    position: absolute; inset: -4px; border-radius: 50%;
    border: 2px solid #3B82F6; animation: ripple 1.5s ease infinite;
  }

  /* ── MOBILE ── */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main-content { margin-left: 0; }
    .page-content { padding: 14px 14px 90px; }
    .top-bar { padding: 10px 14px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .form-grid-2 { grid-template-columns: 1fr; }
    .form-grid-3 { grid-template-columns: 1fr 1fr; }
    .mobile-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: rgba(8,13,26,0.97); backdrop-filter: blur(16px);
      border-top: 1px solid #0F1E35;
      display: flex; z-index: 100; padding: 6px 0 10px;
    }
    .mobile-nav-item {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; gap: 3px; padding: 4px 2px;
      cursor: pointer; border: none; background: none;
      color: #334155; font-size: 9px; font-weight: 600;
      letter-spacing: 0.3px; text-transform: uppercase;
      transition: color 0.15s;
    }
    .mobile-nav-item.active { color: #3B82F6; }
    .mobile-nav-item svg { width: 20px; height: 20px; }
  }
  @media (min-width: 769px) {
    .mobile-nav { display: none; }
    .desktop-only { display: block; }
  }
`

// ─── NAV ICONS ────────────────────────────────────────────────────────────────
const icons = {
  home: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  log:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  track:<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  food: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  blood:<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>,
  fit:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  heal: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
  ai:   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
}

const NAV = [
  { section: 'Overview' },
  { id:'home',  label:'Dashboard',    icon:icons.home  },
  { id:'log',   label:'Daily Log',    icon:icons.log   },
  { id:'track', label:'Progress',     icon:icons.track },
  { section: 'Health Tools' },
  { id:'food',  label:'Food Scanner', icon:icons.food  },
  { id:'blood', label:'Lab Reports',  icon:icons.blood },
  { id:'fit',   label:'Fitness',      icon:icons.fit   },
  { id:'heal',  label:'Recovery',     icon:icons.heal  },
  { id:'ai',    label:'AI Coach',     icon:icons.ai    },
]

const MOBILE_NAV = [
  { id:'home',  label:'Home',    icon:icons.home  },
  { id:'log',   label:'Log',     icon:icons.log   },
  { id:'track', label:'Track',   icon:icons.track },
  { id:'food',  label:'Food',    icon:icons.food  },
  { id:'ai',    label:'AI',      icon:icons.ai    },
]

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spinner({ size=20, color='#3B82F6' }) {
  return <div style={{width:size,height:size,border:`2px solid ${color}30`,borderTop:`2px solid ${color}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}}/>
}

function EmptyState({ icon, title, body, action, onAction }) {
  return (
    <div style={{textAlign:'center',padding:'40px 24px',background:'#0F172A',border:'1px solid #1E293B',borderRadius:12}}>
      <div style={{fontSize:36,marginBottom:12}}>{icon}</div>
      <div style={{fontSize:15,fontWeight:600,color:'#94A3B8',marginBottom:6}}>{title}</div>
      <div style={{fontSize:13,color:'#475569',lineHeight:1.6,marginBottom:action?16:0}}>{body}</div>
      {action&&<button className="btn btn-primary btn-sm" onClick={onAction}>{action}</button>}
    </div>
  )
}

function ScoreBar({ label, value, color, target }) {
  const pct = Math.min(100, value)
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
        <span style={{fontSize:13,color:'#94A3B8'}}>{label}</span>
        <div style={{display:'flex',alignItems:'baseline',gap:6}}>
          <span style={{fontSize:15,fontWeight:700,color:pct===0?'#334155':color||scoreColor(pct)}}>{pct}%</span>
          {target&&<span style={{fontSize:11,color:'#334155'}}>target</span>}
        </div>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{width:`${pct}%`,background:pct===0?'#1E293B':color||scoreColor(pct)}}/>
      </div>
    </div>
  )
}

// ─── VOICE HOOK ───────────────────────────────────────────────────────────────
function useVoice(onCmd, onText) {
  const ref = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return; setSupported(true)
    const r = new SR(); r.continuous=false; r.interimResults=false; r.lang='en-IN'
    r.onresult = e => {
      const text = e.results[0][0].transcript.toLowerCase().trim()
      onText(text)
      for (const [phrase, tab] of Object.entries(VOICE_COMMANDS))
        if (text.includes(phrase)) { onCmd(tab, text); return }
      onCmd(null, text)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    ref.current = r
  }, [])
  const start = useCallback(() => { if(!ref.current||listening)return; try{ref.current.start();setListening(true)}catch{} }, [listening])
  const stop  = useCallback(() => { if(!ref.current)return; try{ref.current.stop();setListening(false)}catch{} }, [])
  return { listening, supported, start, stop }
}

// ─── LOG TAB ──────────────────────────────────────────────────────────────────
const GYM_GROUPS = ['None today','Chest','Back','Legs','Shoulders','Arms','Full body','Cardio']
const HABITS = ['Morning lemon water','CREON with every meal','Ash gourd juice','Amla powder','Tulsi tea','Golden milk','No refined sugar','Sleep by 10pm']

function LogTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0,10)
  const ex = db.todayLog || {}
  const [form, setForm] = useState({
    sleepH:'', energyAM:5, energyPM:5, waterL:'', proteinG:'', fiberG:'',
    veggieServings:'', creonDoses:3, gasLevel:0, bloating:0, digestComfort:5,
    yogaMins:'', walkingSteps:'', weightKg:'', gymGroup:'None today',
    symptoms:'', notes:'', habits:{}, ...ex
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleHabit = h => setForm(f=>({...f,habits:{...f.habits,[h]:!f.habits[h]}}))
  const sc = computeDayScore(form)

  async function save() {
    setSaving(true)
    const log = {...form, date:today, ...sc}
    await saveDailyLog(uid, today, log)
    setDb(prev=>({...prev,todayLog:log}))
    showToast('Daily log saved')
    setSaving(false)
  }

  const Slider = ({label, k, min=0, max=10, color}) => {
    const v = +form[k]||0; const pct=((v-min)/(max-min))*100
    const c = color||scoreColor(pct)
    const bg = `linear-gradient(to right,${c} ${pct}%,#1E293B ${pct}%)`
    return (
      <div className="form-row">
        <label className="form-label">{label}</label>
        <div className="slider-wrap">
          <input type="range" className="slider-input" min={min} max={max} step={1} value={v}
            onChange={e=>set(k,+e.target.value)} style={{background:bg}}/>
          <span className="slider-val" style={{color:c}}>{v}</span>
        </div>
      </div>
    )
  }

  const NumInput = ({label, k, placeholder, unit}) => (
    <div className="form-row">
      <label className="form-label">{label}{unit&&<span style={{color:'#334155',marginLeft:4}}>{unit}</span>}</label>
      <input type="number" className="form-input" placeholder={placeholder}
        value={form[k]} onChange={e=>set(k,e.target.value)}/>
    </div>
  )

  return (
    <div className="fade-in">
      {/* Live score */}
      <div className="stats-grid" style={{marginBottom:20}}>
        {[
          {l:'Food',v:sc.food,c:'#10B981'},{l:'Water',v:sc.water,c:'#3B82F6'},
          {l:'Yoga',v:sc.yoga,c:'#F59E0B'},{l:'Gym',v:sc.gym,c:'#8B5CF6'},
          {l:'Total',v:sc.overall,c:scoreColor(sc.overall)},
        ].map(s=>(
          <div className="stat-card" key={s.l} style={{border:`1px solid ${s.c}25`}}>
            <div className="stat-label">{s.l}</div>
            <div className="stat-value" style={{color:s.v===0?'#334155':s.c}}>{s.v}</div>
            <div className="progress-bar-wrap" style={{marginTop:6}}>
              <div className="progress-bar-fill" style={{width:`${s.v}%`,background:s.v===0?'#1E293B':s.c}}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
        {/* Sleep & Energy */}
        <div className="card">
          <div className="card-title">Sleep & Energy</div>
          <NumInput label="Sleep Duration" k="sleepH" placeholder="7.5" unit="hours"/>
          <Slider label={`Morning energy: ${form.energyAM}/10`} k="energyAM" color="#F59E0B"/>
          <Slider label={`Evening energy: ${form.energyPM}/10`} k="energyPM" color="#F59E0B"/>
        </div>

        {/* Nutrition */}
        <div className="card">
          <div className="card-title">Nutrition — Ahara</div>
          <div className="form-grid-2">
            <NumInput label="Protein" k="proteinG" placeholder="80" unit="g"/>
            <NumInput label="Fiber" k="fiberG" placeholder="30" unit="g"/>
            <NumInput label="Water" k="waterL" placeholder="2.5" unit="L"/>
            <NumInput label="Veggies" k="veggieServings" placeholder="5" unit="servings"/>
          </div>
          {/* Target progress */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
            {[
              {l:'Protein',v:+form.proteinG||0,t:80,u:'g',c:'#10B981'},
              {l:'Water',v:+form.waterL||0,t:2.5,u:'L',c:'#3B82F6'},
            ].map(it=>{
              const pct=Math.min(100,Math.round((it.v/it.t)*100))
              return (
                <div key={it.l} style={{background:'#0A0F1E',borderRadius:6,padding:'8px 10px',border:'1px solid #1E293B'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:11,color:'#475569'}}>{it.l}</span>
                    <span style={{fontSize:11,fontWeight:600,color:pct>=100?it.c:'#64748B'}}>{it.v}/{it.t}{it.u}</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{width:`${pct}%`,background:it.c}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Digestion */}
        <div className="card">
          <div className="card-title">Digestion</div>
          <div className="form-row">
            <label className="form-label">CREON doses today</label>
            <div style={{display:'flex',gap:6}}>
              {[0,1,2,3,4,5,6].map(n=>(
                <button key={n} onClick={()=>set('creonDoses',n)} style={{
                  width:36,height:36,borderRadius:6,border:`1px solid ${form.creonDoses===n?'#3B82F6':'#1E293B'}`,
                  background:form.creonDoses===n?'rgba(59,130,246,0.15)':'#0A0F1E',
                  color:form.creonDoses===n?'#3B82F6':'#475569',
                  fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Slider label={`Gas level: ${form.gasLevel}/10`} k="gasLevel" color="#EF4444"/>
          <Slider label={`Bloating: ${form.bloating}/10`} k="bloating" color="#F59E0B"/>
          <Slider label={`Digestive comfort: ${form.digestComfort}/10`} k="digestComfort" color="#10B981"/>
        </div>

        {/* Movement */}
        <div className="card">
          <div className="card-title">Movement — Vyayama</div>
          <div className="form-grid-2">
            <NumInput label="Yoga" k="yogaMins" placeholder="30" unit="mins"/>
            <NumInput label="Steps" k="walkingSteps" placeholder="8000"/>
            <NumInput label="Weight" k="weightKg" placeholder="65.5" unit="kg"/>
          </div>
          <div className="form-row">
            <label className="form-label">Gym session</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {GYM_GROUPS.map(g=>(
                <button key={g} onClick={()=>set('gymGroup',g)} style={{
                  padding:'5px 10px',borderRadius:6,fontSize:12,fontWeight:500,
                  border:`1px solid ${form.gymGroup===g?'#8B5CF6':'#1E293B'}`,
                  background:form.gymGroup===g?'rgba(139,92,246,0.12)':'#0A0F1E',
                  color:form.gymGroup===g?'#A78BFA':'#475569',cursor:'pointer',
                  transition:'all 0.15s'}}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Habits */}
        <div className="card">
          <div className="card-title">Daily Habits</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {HABITS.map(h=>{
              const done=form.habits[h]
              return (
                <div key={h} className={`habit-chip${done?' done':''}`} onClick={()=>toggleHabit(h)}>
                  <div className="habit-check">{done?'✓':''}</div>
                  <span style={{fontSize:12,color:done?'#94A3B8':'#475569',lineHeight:1.3}}>{h}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-title">Symptoms & Notes</div>
          <div className="form-row">
            <label className="form-label">Any symptoms today</label>
            <textarea className="form-input" rows={2} placeholder="Nausea, fatigue, pain..." value={form.symptoms} onChange={e=>set('symptoms',e.target.value)} style={{resize:'none'}}/>
          </div>
          <div className="form-row">
            <label className="form-label">Additional notes</label>
            <textarea className="form-input" rows={2} placeholder="How are you feeling overall..." value={form.notes} onChange={e=>set('notes',e.target.value)} style={{resize:'none'}}/>
          </div>
        </div>
      </div>

      <button className="btn btn-green btn-full" onClick={save} disabled={saving} style={{marginTop:4,padding:'12px'}}>
        {saving?<><Spinner size={16} color="white"/>Saving...</>:'Save Today\'s Log'}
      </button>
    </div>
  )
}

// ─── TRACK TAB ────────────────────────────────────────────────────────────────
function buildGrid(logs, period) {
  const today=new Date(); const days=[]
  for(let i=period-1;i>=0;i--) {
    const d=new Date(today); d.setDate(d.getDate()-i)
    const dateStr=d.toISOString().slice(0,10)
    const log=logs.find(l=>l.date===dateStr)||null
    const sc=computeDayScore(log)
    days.push({ dateStr, dayName:d.toLocaleDateString('en-IN',{weekday:'short'}), dateNum:d.getDate(),
      monthShort:d.toLocaleDateString('en-IN',{month:'short'}), isToday:i===0, log, ...sc })
  }
  return days
}

function TrackTab({ logs }) {
  const [period, setPeriod] = useState(7)
  const [sel, setSel] = useState(null)
  const days = useMemo(()=>buildGrid(logs,period),[logs,period])
  const logged = days.filter(d=>d.log)
  const selDay = sel?days.find(d=>d.dateStr===sel):days[days.length-1]

  if (logged.length===0) return (
    <div className="fade-in">
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[7,15,30].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)}
            className={`btn btn-sm btn-outline${period===p?' btn-primary':''}`}
            style={period===p?{background:'rgba(59,130,246,0.15)',borderColor:'#3B82F6',color:'#3B82F6'}:{}}>
            {p} Days
          </button>
        ))}
      </div>
      <EmptyState icon="📊" title="No data yet" body="Start logging your daily health data to see your progress tracked over time."/>
    </div>
  )

  const avg = k => Math.round(logged.reduce((s,d)=>s+d[k],0)/logged.length)
  const goalHits = {
    protein:logged.filter(d=>(+d.log?.proteinG||0)>=80).length,
    water:  logged.filter(d=>(+d.log?.waterL||0)>=2.5).length,
    yoga:   logged.filter(d=>(+d.log?.yogaMins||0)>=30).length,
    steps:  logged.filter(d=>(+d.log?.walkingSteps||0)>=8000).length,
    sleep:  logged.filter(d=>(+d.log?.sleepH||0)>=7).length,
  }
  let streak=0; for(let i=days.length-1;i>=0;i--){if(days[i].log&&days[i].overall>=40)streak++;else break}

  return (
    <div className="fade-in">
      {/* Period selector */}
      <div style={{display:'flex',gap:8,marginBottom:18}}>
        {[7,15,30].map(p=>(
          <button key={p} onClick={()=>{setPeriod(p);setSel(null)}}
            className="btn btn-sm btn-outline"
            style={period===p?{background:'rgba(59,130,246,0.15)',borderColor:'#3B82F6',color:'#60A5FA'}:{}}>
            {p} Days
          </button>
        ))}
        <div style={{marginLeft:'auto',fontSize:12,color:'#475569',display:'flex',alignItems:'center',gap:4}}>
          🔥 {streak} day streak
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{marginBottom:16}}>
        {[
          {l:'Overall',v:avg('overall'),c:scoreColor(avg('overall'))},
          {l:'Food',v:avg('food'),c:'#10B981'},
          {l:'Water',v:avg('water'),c:'#3B82F6'},
          {l:'Yoga',v:avg('yoga'),c:'#F59E0B'},
          {l:'Gym',v:avg('gym'),c:'#8B5CF6'},
        ].map(s=>(
          <div className="stat-card" key={s.l}>
            <div className="stat-label">{s.l} avg</div>
            <div className="stat-value" style={{color:s.c}}>{s.v}</div>
            <div className="progress-bar-wrap" style={{marginTop:6}}>
              <div className="progress-bar-fill" style={{width:`${s.v}%`,background:s.c}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Goal achievement */}
      <div className="card" style={{marginBottom:14}}>
        <div className="card-title">Goal Achievement — {logged.length} days logged</div>
        {[
          {l:'Protein ≥ 80g/day',h:goalHits.protein,e:'🥩'},
          {l:'Water ≥ 2.5L/day', h:goalHits.water,  e:'💧'},
          {l:'Yoga ≥ 30 mins',   h:goalHits.yoga,   e:'🧘'},
          {l:'Steps ≥ 8000',     h:goalHits.steps,  e:'🚶'},
          {l:'Sleep ≥ 7 hours',  h:goalHits.sleep,  e:'😴'},
        ].map((g,i)=>{
          const pct=Math.round((g.h/Math.max(1,logged.length))*100)
          return (
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:13,color:'#94A3B8'}}>{g.e} {g.l}</span>
                <span style={{fontSize:13,fontWeight:600,color:scoreColor(pct)}}>{g.h}/{logged.length} days</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{width:`${pct}%`,background:scoreColor(pct)}}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Day grid */}
      <div className="card">
        <div className="card-title">Day by Day — tap for details</div>
        <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:0}}>
          {days.map(day=>(
            <React.Fragment key={day.dateStr}>
              {/* Date */}
              <div onClick={()=>setSel(day.dateStr===sel?null:day.dateStr)}
                style={{display:'contents',cursor:'pointer'}}>
                <div className={`day-row${!day.log?' no-data':''}${selDay?.dateStr===day.dateStr?' selected':''}`}
                  style={{gridColumn:'1/-1',cursor:'pointer'}}
                  onClick={()=>setSel(day.dateStr===sel?null:day.dateStr)}>
                  {/* date */}
                  <div style={{width:56,flexShrink:0}}>
                    <div style={{fontSize:11,fontWeight:600,color:day.isToday?'#3B82F6':'#475569'}}>{day.dayName}</div>
                    <div style={{fontSize:13,fontWeight:600,color:day.isToday?'#60A5FA':'#64748B'}}>{day.dateNum} {day.monthShort}</div>
                  </div>
                  {/* bars */}
                  <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                    {[{k:'food',c:'#10B981'},{k:'water',c:'#3B82F6'},{k:'yoga',c:'#F59E0B'},{k:'gym',c:'#8B5CF6'}].map(p=>(
                      <div key={p.k}>
                        <div className="progress-bar-wrap" style={{height:5}}>
                          {day.log&&<div className="progress-bar-fill" style={{width:`${day[p.k]}%`,background:p.c}}/>}
                        </div>
                        <div style={{fontSize:9,color:day.log?p.c:'#1E293B',marginTop:2,fontWeight:600}}>{day.log?day[p.k]:'–'}</div>
                      </div>
                    ))}
                  </div>
                  {/* score */}
                  <div style={{width:36,textAlign:'right',flexShrink:0}}>
                    {day.log
                      ? <span style={{fontSize:15,fontWeight:700,color:scoreColor(day.overall)}}>{day.overall}</span>
                      : <span style={{fontSize:12,color:'#1E293B'}}>—</span>
                    }
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selDay&&selDay.log&&(
        <div className="card fade-in">
          <div className="card-title">{selDay.dayName} {selDay.dateNum} {selDay.monthShort} — Detail</div>
          <div className="form-grid-2" style={{gap:8,marginBottom:12}}>
            {[
              {l:'Sleep',v:`${selDay.log.sleepH||0}h`,pct:Math.min(100,Math.round((+selDay.log.sleepH||0)/7.5*100)),c:'#8B5CF6'},
              {l:'Protein',v:`${selDay.log.proteinG||0}g`,pct:Math.min(100,Math.round((+selDay.log.proteinG||0)/80*100)),c:'#10B981'},
              {l:'Water',v:`${selDay.log.waterL||0}L`,pct:Math.min(100,Math.round((+selDay.log.waterL||0)/2.5*100)),c:'#3B82F6'},
              {l:'Yoga',v:`${selDay.log.yogaMins||0}min`,pct:Math.min(100,Math.round((+selDay.log.yogaMins||0)/45*100)),c:'#F59E0B'},
              {l:'Steps',v:`${(+selDay.log.walkingSteps||0).toLocaleString()}`,pct:Math.min(100,Math.round((+selDay.log.walkingSteps||0)/8000*100)),c:'#8B5CF6'},
              {l:'Energy AM',v:`${selDay.log.energyAM||0}/10`,pct:Math.min(100,Math.round((+selDay.log.energyAM||0)/10*100)),c:'#F59E0B'},
            ].map(it=>(
              <div key={it.l} style={{background:'#0A0F1E',borderRadius:6,padding:'8px 10px',border:'1px solid #1E293B'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:11,color:'#475569'}}>{it.l}</span>
                  <span style={{fontSize:12,fontWeight:600,color:it.c}}>{it.v}</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{width:`${it.pct}%`,background:it.c}}/>
                </div>
              </div>
            ))}
          </div>
          {selDay.log.gymGroup&&selDay.log.gymGroup!=='None today'&&(
            <div style={{marginBottom:8,padding:'8px 12px',background:'rgba(139,92,246,0.08)',borderRadius:6,border:'1px solid rgba(139,92,246,0.2)',fontSize:13,color:'#A78BFA'}}>
              💪 {selDay.log.gymGroup}
            </div>
          )}
          {Object.entries(selDay.log.habits||{}).filter(([,v])=>v).length>0&&(
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {Object.entries(selDay.log.habits||{}).filter(([,v])=>v).map(([h])=>(
                <span key={h} style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',color:'#34D399',padding:'3px 9px',borderRadius:6,fontSize:12}}>✓ {h}</span>
              ))}
            </div>
          )}
          {selDay.log.symptoms&&(
            <div style={{marginTop:10,padding:'10px 12px',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,fontSize:13,color:'#F87171'}}>
              ⚠ {selDay.log.symptoms}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FOOD TAB ─────────────────────────────────────────────────────────────────
function FoodTab({ uid, db, setDb, userEmail, showToast, aiLoading, setAiLoading }) {
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [result, setResult] = useState(null); const fileRef = useRef()
  const intols = db.intolerances||[]

  async function scan() {
    if (!imgData||aiLoading) return
    setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{role:'user',content:[
        {type:'image',source:{type:'base64',media_type:'image/jpeg',data:imgData}},
        {type:'text',text:`Analyze this meal for my cancer recovery diet.${intols.length?` Known intolerances: ${intols.join(', ')}.`:''}

Reply in this exact format:
VERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]
SCORE: [1-10]
WHAT I SEE: [foods identified]
BENEFITS: [specific recovery benefits]
CONCERNS: [issues for pancreatic cancer recovery]
ENZYME NOTE: [PERT needed? fat level?]
HOW TO IMPROVE: [make it better]
INTOLERANCE FLAG: [problem foods found, or NONE]`}
      ]}],'Speak as JARVIS, precise and warm.',userEmail)

      const verdict=resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase()||'acceptable'
      const score=parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1]||'5')
      const fMatch=resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
      const flagged=fMatch&&fMatch[1].trim().toUpperCase()!=='NONE'?fMatch[1].split(',').map(s=>s.trim()).filter(Boolean):[]
      const entry={id:Date.now(),date:new Date().toLocaleDateString('en-IN'),verdict,score,analysis:resp,flagged}
      await saveFoodLog(uid,entry)
      for(const f of flagged) await saveIntolerance(uid,f)
      setDb(prev=>({...prev,foodLogs:[entry,...(prev.foodLogs||[])].slice(0,50),intolerances:[...new Set([...(prev.intolerances||[]),...flagged])]}))
      setResult(entry)
      if(flagged.length) showToast(`Intolerance flagged: ${flagged.join(', ')}`)
      // Speak the verdict
      const verdictMsg = verdict==='optimal'
        ? `Excellent choice. This meal scores ${score} out of 10. ${entry.analysis.split('\n').find(l=>l.startsWith('BENEFITS'))||''}`
        : verdict==='acceptable'
        ? `Acceptable meal, scoring ${score} out of 10. ${entry.analysis.split('\n').find(l=>l.startsWith('CONCERNS'))||''}`
        : `I would advise against this meal. Score is only ${score} out of 10. ${entry.analysis.split('\n').find(l=>l.startsWith('CONCERNS'))||''}`
      speak(verdictMsg, { maxChars: 300 })
    } catch(e) { setResult({analysis:`Error: ${e.message}`,verdict:'acceptable',score:0,flagged:[]}) }
    setAiLoading(false)
  }

  const vc = {optimal:'#10B981',acceptable:'#F59E0B',inadvisable:'#EF4444'}
  const vi  = {optimal:'✓',acceptable:'!',inadvisable:'✕'}

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">Scan Your Meal</div>
        <div className={`upload-zone${img?' has-img':''}`} onClick={()=>fileRef.current.click()}>
          {img
            ? <img src={img} alt="meal" style={{width:'100%',maxHeight:240,objectFit:'cover'}}/>
            : <>
                <div style={{fontSize:32,marginBottom:8}}>📷</div>
                <div style={{fontSize:14,fontWeight:500,color:'#64748B',marginBottom:4}}>Tap to upload meal photo</div>
                <div style={{fontSize:12,color:'#334155'}}>Takes camera or gallery photo · Auto-compressed to 5MB</div>
              </>
          }
        </div>
        {/* Two separate inputs: camera + gallery — better mobile compatibility */}
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
          onChange={async e=>{
            const f=e.target.files[0]; if(!f) return
            setImg(URL.createObjectURL(f)); setResult(null)
            try { setImgData(await imgToBase64(f)) }
            catch(err) { console.error('Image error',err) }
          }}/>
        {/* Mobile: show two buttons for camera vs gallery */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}>
          <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:8,border:'1px solid #1E293B',background:'#0A0F1E',color:'#64748B',fontSize:13,fontWeight:500,cursor:'pointer'}}>
            📷 Camera
            <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
              onChange={async e=>{
                const f=e.target.files[0]; if(!f) return
                setImg(URL.createObjectURL(f)); setResult(null)
                try { setImgData(await imgToBase64(f)) }
                catch(err) { console.error('Image error',err) }
              }}/>
          </label>
          <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:8,border:'1px solid #1E293B',background:'#0A0F1E',color:'#64748B',fontSize:13,fontWeight:500,cursor:'pointer'}}>
            🖼️ Gallery
            <input type="file" accept="image/*" style={{display:'none'}}
              onChange={async e=>{
                const f=e.target.files[0]; if(!f) return
                setImg(URL.createObjectURL(f)); setResult(null)
                try { setImgData(await imgToBase64(f)) }
                catch(err) { console.error('Image error',err) }
              }}/>
          </label>
        </div>
        <button className="btn btn-primary btn-full" style={{marginTop:10}} onClick={()=>{ unlockSpeech(); scan() }} disabled={!imgData||aiLoading}>
          {aiLoading?<><Spinner size={16} color="white"/>Analyzing...</>:'Analyze This Meal'}
        </button>
      </div>

      {result&&(
        <div className="card fade-in" style={{border:`1px solid ${(vc[result.verdict]||'#F59E0B')}30`}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <div style={{width:44,height:44,borderRadius:10,background:`${vc[result.verdict]||'#F59E0B'}18`,
              border:`1px solid ${vc[result.verdict]||'#F59E0B'}40`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:20,color:vc[result.verdict]||'#F59E0B',fontWeight:700,flexShrink:0}}>
              {vi[result.verdict]||'!'}
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:vc[result.verdict]||'#F59E0B'}}>
                {result.verdict?.charAt(0).toUpperCase()+result.verdict?.slice(1)}
              </div>
              <div style={{fontSize:12,color:'#475569'}}>Score: {result.score}/10</div>
            </div>
          </div>
          <div style={{fontSize:13,color:'#CBD5E1',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{result.analysis}</div>
          {result.flagged?.length>0&&(
            <div style={{marginTop:12,padding:'10px 12px',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8}}>
              <div style={{fontSize:12,fontWeight:600,color:'#F87171',marginBottom:6}}>⚠ Added to intolerances</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {result.flagged.map((f,i)=><span key={i} style={{background:'rgba(239,68,68,0.1)',color:'#F87171',padding:'2px 8px',borderRadius:4,fontSize:12}}>{f}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {(db.foodLogs||[]).length>0&&(
        <div className="card">
          <div className="card-title">Recent Scans</div>
          {(db.foodLogs||[]).slice(0,5).map(f=>(
            <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #0F172A'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:6,background:`${vc[f.verdict]||'#F59E0B'}15`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:vc[f.verdict]||'#F59E0B',fontSize:14,fontWeight:700}}>
                  {vi[f.verdict]||'!'}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'#94A3B8',textTransform:'capitalize'}}>{f.verdict}</div>
                  <div style={{fontSize:11,color:'#334155'}}>{f.date}</div>
                </div>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:vc[f.verdict]||'#F59E0B'}}>{f.score}/10</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BLOOD TAB ────────────────────────────────────────────────────────────────
function BloodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [mode, setMode] = useState('manual'); const [text, setText] = useState('')
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [result, setResult] = useState(null); const fileRef = useRef()

  async function analyze() {
    setAiLoading(true); setResult(null)
    try {
      const msgs = mode==='manual'
        ? [{role:'user',content:`Analyze these blood test values for my pancreatic cancer recovery:\n${text}\n\nGive me a detailed analysis covering: SUMMARY, KEY MARKERS with status (low/normal/high), CA 19-9 (critical), LIVER HEALTH (I had liver radiation + ablation), BLOOD SUGAR (I have partial pancreatectomy), IMMUNITY, URGENT ACTIONS, DIETARY CHANGES, NEXT TEST DATE, ENCOURAGING NOTE.`}]
        : [{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:imgData}},{type:'text',text:'Analyze this blood report for my pancreatic cancer recovery. Cover: SUMMARY, KEY MARKERS, CA 19-9, LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY CHANGES, ENCOURAGING NOTE.'}]}]
      const resp = await askJarvis(msgs,'Be thorough and accurate. Remind to share with oncologist.',userEmail)
      const entry={id:Date.now(),date:new Date().toLocaleDateString('en-IN'),summary:resp.slice(0,250),full:resp}
      await saveBloodReport(uid,entry)
      setDb(prev=>({...prev,bloodReports:[...(prev.bloodReports||[]),entry]}))
      setResult(entry)
      speak('Blood report analysis complete. ' + entry.summary, { maxChars: 350 })
    } catch(e){ setResult({full:`Error: ${e.message}`,summary:'Error'}) }
    setAiLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">Analyze Lab Report</div>
        <div className="tab-bar" style={{marginBottom:14}}>
          {[['manual','Type values'],['photo','Upload photo']].map(([m,l])=>(
            <button key={m} className={`tab-btn${mode===m?' active':''}`} onClick={()=>setMode(m)}>{l}</button>
          ))}
        </div>
        {mode==='manual'?(
          <>
            <div className="form-row">
              <label className="form-label">Enter your lab values (one per line)</label>
              <textarea className="form-input" rows={8} value={text} onChange={e=>setText(e.target.value)} style={{resize:'vertical'}}
                placeholder={'CA 19-9: 28 U/mL\nHbA1c: 6.2%\nFasting Glucose: 105 mg/dL\nVitamin D: 22 ng/mL\nHemoglobin: 11.5 g/dL\nALT: 38 U/L\n...'}/>
            </div>
            <button className="btn btn-primary btn-full" onClick={()=>{ unlockSpeech(); analyze() }} disabled={!text.trim()||aiLoading}>
              {aiLoading?<><Spinner size={16} color="white"/>Analyzing...</>:'Analyze Values'}
            </button>
          </>
        ):(
          <>
            <div className={`upload-zone${img?' has-img':''}`} onClick={()=>fileRef.current.click()}>
              {img?<img src={img} alt="report" style={{width:'100%',maxHeight:220,objectFit:'contain'}}/>
              :(<><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:14,fontWeight:500,color:'#64748B'}}>Upload blood test report photo</div><div style={{fontSize:12,color:'#334155',marginTop:4}}>Auto-compressed · Camera or gallery</div></>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}>
              <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:8,border:'1px solid #1E293B',background:'#0A0F1E',color:'#64748B',fontSize:13,fontWeight:500,cursor:'pointer'}}>
                📷 Camera
                <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                  onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/>
              </label>
              <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:8,border:'1px solid #1E293B',background:'#0A0F1E',color:'#64748B',fontSize:13,fontWeight:500,cursor:'pointer'}}>
                🖼️ Gallery
                <input type="file" accept="image/*" style={{display:'none'}}
                  onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/>
              </label>
            </div>
            <button className="btn btn-primary btn-full" style={{marginTop:10}} onClick={()=>{ unlockSpeech(); analyze() }} disabled={!imgData||aiLoading}>
              {aiLoading?<><Spinner size={16} color="white"/>Analyzing...</>:'Analyze Report'}
            </button>
          </>
        )}
      </div>

      {result&&(
        <div className="card fade-in" style={{border:'1px solid rgba(139,92,246,0.25)'}}>
          <div style={{fontSize:13,color:'#CBD5E1',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result.full}</div>
          <div style={{marginTop:12,padding:'10px 12px',background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,fontSize:12,color:'#FCD34D'}}>
            ⚠ Share these results with your oncologist for medical decisions.
          </div>
        </div>
      )}

      {(db.bloodReports||[]).length>0&&(
        <div className="card">
          <div className="card-title">Report History</div>
          {[...(db.bloodReports||[])].reverse().slice(0,3).map(r=>(
            <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #0F172A'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#8B5CF6',marginBottom:4}}>{r.date}</div>
              <div style={{fontSize:13,color:'#64748B',lineHeight:1.5}}>{r.summary?.slice(0,140)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FITNESS TAB ──────────────────────────────────────────────────────────────
function FitTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [type, setType] = useState('yoga')
  const [phase, setPhase] = useState('1')
  const [plan, setPlan] = useState(null)
  const saved = (db.fitnessPlans||{})[type+phase]

  async function generate() {
    setAiLoading(true); setPlan(null)
    try {
      const resp = await askJarvis([{role:'user',content:`Generate a detailed Phase ${phase} ${type==='yoga'?'Yoga and Pranayama':'Strength Training'} protocol for my pancreatic cancer recovery. I have had partial pancreatectomy, liver radiation + ablation, multiple chemo regimens, and am now in remission. Phase 1=Weeks 1-6 gentle, Phase 2=Weeks 7-16 moderate, Phase 3=Month 4+ progressive. Include specific exercises/poses, sets/reps/durations, safety rules, and the Ayurvedic or scientific rationale.`}],'',userEmail)
      await savePlan(uid, type+phase, resp)
      setDb(prev=>({...prev,fitnessPlans:{...(prev.fitnessPlans||{}),[type+phase]:resp}}))
      setPlan(resp)
      speak(`Your Phase ${phase} ${type} protocol is ready. ${resp.slice(0,200)}`, { maxChars: 250 })
    } catch(e){ setPlan(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">Fitness Protocol Generator</div>
        <div className="tab-bar" style={{marginBottom:14}}>
          {[['yoga','🧘 Yoga & Pranayama'],['gym','🏋 Strength Training']].map(([t,l])=>(
            <button key={t} className={`tab-btn${type===t?' active':''}`} onClick={()=>{setType(t);setPlan(null)}}>{l}</button>
          ))}
        </div>
        <div className="card-title" style={{marginBottom:8}}>Recovery Phase</div>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {[['1','Week 1–6\nGentle rebuild'],['2','Week 7–16\nBuilding strength'],['3','Month 4+\nProgressive']].map(([p,l])=>(
            <button key={p} onClick={()=>{setPhase(p);setPlan(null)}} style={{
              flex:1,padding:'10px 8px',borderRadius:8,border:`1px solid ${phase===p?'#3B82F6':'#1E293B'}`,
              background:phase===p?'rgba(59,130,246,0.1)':'#0A0F1E',
              color:phase===p?'#60A5FA':'#475569',cursor:'pointer',fontSize:12,fontWeight:500,
              whiteSpace:'pre-line',lineHeight:1.4,transition:'all 0.15s'}}>
              Phase {p}{'\n'}<span style={{fontSize:10}}>{l.split('\n')[1]}</span>
            </button>
          ))}
        </div>
        <button className={`btn btn-full${type==='yoga'?' btn-green':' btn-primary'}`} onClick={()=>{ unlockSpeech(); generate() }} disabled={aiLoading}>
          {aiLoading?<><Spinner size={16} color="white"/>Generating...</>:`Generate Phase ${phase} ${type==='yoga'?'Yoga':'Gym'} Plan`}
        </button>
      </div>

      {(plan||saved)&&(
        <div className="card fade-in">
          <div className="card-title">{type==='yoga'?'Yoga':'Gym'} Protocol — Phase {phase}</div>
          <div style={{fontSize:13,color:'#CBD5E1',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{plan||saved}</div>
        </div>
      )}

      <div className="card" style={{border:'1px solid rgba(239,68,68,0.2)'}}>
        <div className="card-title" style={{color:'#F87171'}}>Safety Rules</div>
        {['Never exercise on empty stomach — blood sugar risk','Stop if: chest pain, sharp abdominal pain, dizziness','Protein within 30 minutes post-workout','Avoid heavy ab exercises (Phases 1 and 2)','Hydrate 500ml water during and after session'].map((t,i)=>(
          <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
            <span style={{color:'#EF4444',fontSize:14,lineHeight:1.4,flexShrink:0}}>•</span>
            <span style={{fontSize:13,color:'#94A3B8',lineHeight:1.5}}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── RECOVERY TAB ─────────────────────────────────────────────────────────────
const RECOVERY_TOPICS = [
  {id:'sperm',icon:'🌱',label:'Sperm & Fertility',desc:'Post-chemo recovery protocol',color:'#3B82F6'},
  {id:'hair',icon:'✨',label:'Hair Regrowth',desc:'Month-by-month guide',color:'#F59E0B'},
  {id:'eyebrow',icon:'👁️',label:'Eyebrow & Lash',desc:'Restoration protocol',color:'#8B5CF6'},
  {id:'appearance',icon:'🌟',label:'Look Normal Again',desc:'Complete appearance guide',color:'#10B981'},
  {id:'complete',icon:'🏆',label:'Full Recovery Map',desc:'Complete roadmap out',color:'#EF4444'},
  {id:'immunity',icon:'🛡️',label:'Rebuild Immunity',desc:'Post-chemo immune protocol',color:'#3B82F6'},
  {id:'energy',icon:'⚡',label:'Natural Energy',desc:'No steroid dependency',color:'#F59E0B'},
  {id:'digestion',icon:'🌿',label:'Fix Digestion',desc:'PERT + gut healing',color:'#10B981'},
]

const RECOVERY_PROMPTS = {
  sperm:'As JARVIS, provide a complete sperm count recovery and fertility restoration protocol after chemotherapy. Cover: supplements with exact doses, timeline, foods that increase sperm quality, foods to avoid, lifestyle changes, tests to track, realistic expectations for becoming a father.',
  hair:'As JARVIS, provide a complete hair regrowth protocol post-chemotherapy. Cover: timeline month by month, scalp care routine, oils and massage, supplements with doses, foods, how to care for new growth.',
  eyebrow:'As JARVIS, provide complete eyebrow and eyelash regrowth protocol post-chemo. Cover: castor oil protocol, serums, massage technique, supplements, realistic timeline.',
  appearance:'As JARVIS, provide a complete guide to looking and feeling normal again after cancer treatment. Cover: weight gain strategy, skin restoration, hair and eyebrow care, energy rebuilding, confidence.',
  complete:'As JARVIS, provide the complete roadmap to being fully disease-free and vibrant. Cover: all recovery phases, key milestones, longevity habits, mental recovery, how to prevent recurrence.',
  immunity:'As JARVIS, provide complete post-chemotherapy immunity rebuilding protocol. Cover: specific foods, supplements with doses, sleep optimization, lab markers to track.',
  energy:'As JARVIS, provide complete natural energy restoration after chemo. Cover: adrenal recovery, mitochondrial healing, blood sugar stability, sleep, step-by-step energy rebuild.',
  digestion:'As JARVIS, provide complete gut healing protocol after partial pancreatectomy and chemo. Cover: PERT optimization, gut lining repair, microbiome rebuilding, specific foods.',
}

function HealTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [topic, setTopic] = useState(null)
  const [result, setResult] = useState(null)

  async function getGuide(t) {
    setTopic(t)
    if (db.recoveryGuides?.[t]) { setResult(db.recoveryGuides[t]); return }
    setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{role:'user',content:RECOVERY_PROMPTS[t]}],'',userEmail)
      await saveGuide(uid,t,resp)
      setDb(prev=>({...prev,recoveryGuides:{...(prev.recoveryGuides||{}),[t]:resp}}))
      setResult(resp)
      speak(`Here is your ${RECOVERY_TOPICS.find(x=>x.id===t)?.label} protocol. ` + resp.slice(0, 200), { maxChars: 280 })
    } catch(e){ setResult(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:14}}>
        {RECOVERY_TOPICS.map(t=>(
          <button key={t.id} onClick={()=>{ unlockSpeech(); getGuide(t.id) }} style={{
            padding:'14px 12px',borderRadius:10,cursor:'pointer',textAlign:'left',
            background:topic===t.id?`${t.color}12`:'#0F172A',
            border:`1px solid ${topic===t.id?t.color+'45':'#1E293B'}`,
            transition:'all 0.15s'}}>
            <div style={{fontSize:24,marginBottom:8}}>{t.icon}</div>
            <div style={{fontSize:13,fontWeight:600,color:topic===t.id?t.color:'#94A3B8',marginBottom:3}}>{t.label}</div>
            <div style={{fontSize:11,color:'#475569'}}>{t.desc}</div>
            {db.recoveryGuides?.[t.id]&&<div style={{marginTop:6,fontSize:10,color:'#10B981',fontWeight:600}}>✓ Saved</div>}
          </button>
        ))}
      </div>

      {aiLoading&&<div className="card" style={{display:'flex',alignItems:'center',gap:10,color:'#64748B'}}><Spinner/>Generating your personalized guide...</div>}

      {result&&topic&&(
        <div className="card fade-in" style={{border:`1px solid ${RECOVERY_TOPICS.find(t=>t.id===topic)?.color||'#1E293B'}25`}}>
          <div className="card-title" style={{color:RECOVERY_TOPICS.find(t=>t.id===topic)?.color}}>
            {RECOVERY_TOPICS.find(t=>t.id===topic)?.label}
          </div>
          <div style={{fontSize:13,color:'#CBD5E1',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result}</div>
        </div>
      )}
    </div>
  )
}

// ─── AI COACH TAB ─────────────────────────────────────────────────────────────
function AICoachTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [msgs, setMsgs] = useState([
    {role:'assistant',content:'Hello! I\'m your JARVIS health assistant.\n\nI know your complete health profile — pancreatic cancer surgery, liver treatment, chemo completion, and current remission. Ask me anything about your recovery.\n\nTry: "What should I eat today?", "How do I grow my hair back?", "Give me today\'s complete plan", "Why is my CA 19-9 still high?"'}
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef()
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])

  async function send(override=null) {
    const text=override||input.trim(); if(!text||aiLoading)return
    const userMsg={role:'user',content:text}
    const newMsgs=[...msgs,userMsg]
    setMsgs(newMsgs); setInput(''); setAiLoading(true)
    await saveChat(uid,'user',text)
    try {
      const todayScores=computeDayScore(db.todayLog)
      const ctx=`User intolerances: ${(db.intolerances||[]).join(', ')||'none'}. Today's score: ${todayScores.overall}/100. Be warm, specific, and actionable.`
      const resp=await askJarvis(newMsgs.map(m=>({role:m.role,content:m.content})),ctx,userEmail)
      const aiMsg={role:'assistant',content:resp}
      const final=[...newMsgs,aiMsg]
      setMsgs(final)
      await saveChat(uid,'assistant',resp)
      // JARVIS speaks back — speak first 400 chars so it doesn't cut off too early
      speak(resp, { maxChars: 400 })
    } catch(e){ setMsgs([...newMsgs,{role:'assistant',content:`Sorry, I had trouble connecting. ${e.message}`}]) }
    setAiLoading(false)
  }

  const quick=['What to eat today?','I feel tired','How to grow hair?','CA 19-9 is high?','Today\'s full plan','Sperm count tips']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 120px)',minHeight:400}}>
      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:8}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:12,gap:8,alignItems:'flex-end'}}>
            {m.role==='assistant'&&(
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>🤖</div>
            )}
            <div className={`chat-bubble ${m.role}`} style={{animation:i===msgs.length-1?'fadeIn 0.25s ease':'none'}}>{m.content}</div>
          </div>
        ))}
        {aiLoading&&(
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🤖</div>
            <div className="chat-bubble assistant" style={{display:'flex',gap:4,alignItems:'center'}}>
              {[0,0.15,0.3].map(d=><div key={d} style={{width:6,height:6,borderRadius:'50%',background:'#475569',animation:`pulse 1s ease ${d}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick chips */}
      <div style={{display:'flex',gap:5,overflowX:'auto',padding:'8px 0',scrollbarWidth:'none'}}>
        {quick.map((q,i)=>(
          <button key={i} onClick={()=>{ unlockSpeech(); send(q) }} style={{flexShrink:0,padding:'5px 11px',borderRadius:20,border:'1px solid #1E293B',background:'#0F172A',color:'#64748B',fontSize:12,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s'}}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{display:'flex',gap:8,paddingTop:6}}>
        <textarea rows={1} placeholder="Ask anything about your recovery..." value={input}
          onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); unlockSpeech(); send()}}}
          style={{flex:1,background:'#0F172A',border:'1px solid #1E293B',borderRadius:10,padding:'10px 14px',color:'#E2E8F0',fontSize:14,resize:'none',outline:'none',lineHeight:1.4,transition:'border-color 0.15s'}}
          onFocus={e=>e.target.style.borderColor='#3B82F6'}
          onBlur={e=>e.target.style.borderColor='#1E293B'}/>
        <button onClick={()=>{ unlockSpeech(); send() }} disabled={!input.trim()||aiLoading} className="btn btn-primary" style={{alignSelf:'flex-end',padding:'10px 14px'}}>
          ➤
        </button>
      </div>
    </div>
  )
}

// ─── MAIN JARVIS HEALTH ───────────────────────────────────────────────────────
export default function JarvisHealth({ user, onLogout }) {
  const uid       = user.uid
  const userEmail = user.email

  const [tab,      setTab     ] = useState('home')
  const [db,       setDb      ] = useState({})
  const [ready,    setReady   ] = useState(false)
  const [toast,    setToast   ] = useState('')
  const [voiceText,setVoiceText] = useState('')
  const [aiLoading,setAiLoading] = useState(false)
  const [allLogs,  setAllLogs ] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    async function load() {
      const today=new Date().toISOString().slice(0,10)
      const [food,blood,guides,plans,chat,intols,daily] = await Promise.all([
        getFoodLogs(uid),getBloodReports(uid),getGuides(uid),
        getPlans(uid),getChat(uid),getIntolerances(uid),getDailyLog(uid,today)
      ])
      // Load 30 past logs
      const logPromises=[]
      for(let i=1;i<=30;i++){const d=new Date();d.setDate(d.getDate()-i);logPromises.push(getDailyLog(uid,d.toISOString().slice(0,10)).then(l=>({log:l,date:d.toISOString().slice(0,10)})))}
      const pastRaw=await Promise.all(logPromises)
      const pastLogs=pastRaw.filter(({log})=>log&&Object.keys(log).length>2).map(({log,date})=>({...log,date}))
      const todayLog=daily&&Object.keys(daily).length>2?{...daily,date:today}:null
      setAllLogs(todayLog?[todayLog,...pastLogs]:pastLogs)
      setDb({foodLogs:food,bloodReports:blood,recoveryGuides:guides,fitnessPlans:plans,intolerances:intols,todayChecks:daily?.checks||{},todayLog})
      setReady(true)
    }
    load().catch(e=>{console.error(e);setReady(true)})
  },[uid])

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(''),3000)}

  // ── Voice ─────────────────────────────────────────────────────────────────────
  function onVoiceCmd(tabTarget, text) {
    if(tabTarget){setTab(tabTarget);speak(`Switching to ${tabTarget}.`)}
    else{setTab('ai');speak('Opening AI coach.')}
  }
  const {listening,supported,start,stop}=useVoice(onVoiceCmd,t=>{setVoiceText(t);setTimeout(()=>setVoiceText(''),4000)})

  // ── Protocol toggle ───────────────────────────────────────────────────────────
  async function toggleCheck(i){
    const newChecks={...(db.todayChecks||{}),[i]:!(db.todayChecks||{})[i]}
    setDb(prev=>({...prev,todayChecks:newChecks}))
    await saveDailyLog(uid,new Date().toISOString().slice(0,10),{checks:newChecks})
  }

  const todayScores=computeDayScore(db.todayLog)

  const PROTOCOL=['🍋 Lemon water on waking','💊 CREON with every meal','🌿 Ash gourd juice (200ml)','🌾 Amla powder (1 tsp)','🚶 Morning walk (30 min)','🌬️ Pranayama (10 min)','🥛 Protein snack mid-morning','💧 2.5L water target','💪 Yoga or gym session','✨ Golden milk before bed','😴 In bed by 10pm']

  if (!ready) return (
    <div style={{minHeight:'100vh',background:'#0A0F1E',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
      <style>{GLOBAL_CSS}</style>
      <Spinner size={24}/><span style={{fontSize:13,color:'#475569'}}>Loading...</span>
    </div>
  )

  const dbProps={uid,db,setDb:d=>{
    setDb(d)
    const today=new Date().toISOString().slice(0,10)
    if(d.todayLog){setAllLogs(prev=>[{...d.todayLog,date:today},...prev.filter(l=>l.date!==today)])}
  },userEmail,aiLoading,setAiLoading,showToast}

  return (
    <div className="app-layout">
      <style>{GLOBAL_CSS}</style>

      {toast&&<div className="toast">{toast}</div>}

      {/* ── SIDEBAR (desktop) ── */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🌱</div>
            <div className="sidebar-logo-name">JARVIS Health</div>
          </div>
          <div className="sidebar-status">
            <div className="status-dot pulse"/>
            <span>Remission · Protocol Active</span>
          </div>
        </div>

        {NAV.map((item,i)=>
          item.section?(
            <div className="nav-section-label" key={i}>{item.section}</div>
          ):(
            <a key={item.id} className={`nav-item${tab===item.id?' active':''}`} href="#" onClick={e=>{e.preventDefault();setTab(item.id)}}>
              {item.icon}<span>{item.label}</span>
              {item.id==='log'&&!db.todayLog&&<span style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:'#F59E0B',flexShrink:0}}/>}
            </a>
          )
        )}

        <div className="sidebar-footer">
          <div style={{fontSize:11,color:'#1E293B',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'2px 0'}}><span>Status</span><span style={{color:'#10B981'}}>Online</span></div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'2px 0'}}><span>Data</span><span style={{color:'#3B82F6'}}>Mumbai 🇮🇳</span></div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'2px 0'}}><span>CA 19-9 goal</span><span style={{color:'#F59E0B'}}>~6 U/mL</span></div>
          </div>
          <button className="btn btn-outline btn-sm btn-full" onClick={onLogout}>Sign Out</button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <div className="arc-reactor" onClick={()=>{ unlockSpeech(); listening?stop():start() }} title="Voice command">
            {listening&&<div className="arc-ripple"/>}
            <div className="arc-outer"/>
            <div className="arc-inner">{listening?'🎙️':supported?'🎤':'🔇'}</div>
          </div>

          <div style={{flex:1,overflow:'hidden'}}>
            {listening?(
              <div style={{fontSize:13,color:'#3B82F6',fontWeight:500}}>● Listening...</div>
            ):voiceText?(
              <div style={{fontSize:13,color:'#64748B'}}>"{voiceText}"</div>
            ):(
              <div style={{fontSize:13,color:'#334155'}}>
                {supported?'Tap mic · Say "log today", "scan food", "show progress"...':'Voice not supported in this browser'}
              </div>
            )}
          </div>

          {/* Stop speaking button — shows when speech is active */}
          <button onClick={()=>stopSpeaking()} title="Stop speaking"
            style={{padding:'6px 10px',borderRadius:6,border:'1px solid #1E293B',background:'transparent',color:'#475569',fontSize:12,cursor:'pointer',flexShrink:0}}>
            ⏹
          </button>

          {/* Today's score badge */}
          {db.todayLog&&(
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <div style={{fontSize:11,color:'#475569'}}>Today</div>
              <div style={{fontSize:16,fontWeight:700,color:scoreColor(todayScores.overall)}}>{todayScores.overall}</div>
            </div>
          )}

          {!db.todayLog&&(
            <button className="btn btn-primary btn-sm" onClick={()=>setTab('log')}>
              Log Today
            </button>
          )}
        </div>

        {/* Page content */}
        <div className="page-content">
          {/* ════ HOME ════ */}
          {tab==='home'&&(
            <div className="fade-in">
              <div className="page-title">Dashboard</div>
              <div className="page-subtitle">Your cancer recovery overview</div>

              {/* Status cards */}
              <div className="stats-grid">
                {[
                  {l:'Status',v:'Remission',c:'#10B981',sub:'PET-CT clear'},
                  {l:'CA 19-9 Goal',v:'~6',c:'#F59E0B',sub:'U/mL target'},
                  {l:'Protocol',v:'Active',c:'#3B82F6',sub:'Daily tracking'},
                  {l:'Today\'s Score',v:db.todayLog?`${todayScores.overall}`:'-',c:db.todayLog?scoreColor(todayScores.overall):'#334155',sub:db.todayLog?'Log complete':'Not logged yet'},
                ].map(s=>(
                  <div className="stat-card" key={s.l}>
                    <div className="stat-label">{s.l}</div>
                    <div className="stat-value" style={{color:s.c,fontSize:s.v.length>7?18:26}}>{s.v}</div>
                    <div style={{fontSize:11,color:'#475569',marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Not logged today prompt */}
              {!db.todayLog&&(
                <div style={{padding:'18px 20px',background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:24}}>📋</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#FCD34D',marginBottom:2}}>Log today's data</div>
                    <div style={{fontSize:13,color:'#92400E'}}>Track your food, water, yoga, and gym to see your recovery score</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>setTab('log')}>Log Now →</button>
                </div>
              )}

              {/* Today's score breakdown if logged */}
              {db.todayLog&&(
                <div className="card" style={{marginBottom:14}}>
                  <div className="card-title">Today's Recovery Score</div>
                  <ScoreBar label="Food / Nutrition" value={todayScores.food} color="#10B981"/>
                  <ScoreBar label="Water / Hydration" value={todayScores.water} color="#3B82F6"/>
                  <ScoreBar label="Yoga / Movement" value={todayScores.yoga} color="#F59E0B"/>
                  <ScoreBar label="Gym / Exercise" value={todayScores.gym} color="#8B5CF6"/>
                  <ScoreBar label="Sleep" value={todayScores.sleep} color="#EC4899"/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTop:'1px solid #1E293B'}}>
                    <span style={{fontSize:14,fontWeight:600,color:'#94A3B8'}}>Overall Score</span>
                    <span style={{fontSize:22,fontWeight:700,color:scoreColor(todayScores.overall)}}>{todayScores.overall}/100</span>
                  </div>
                </div>
              )}

              {/* Recovery systems — only show when data exists, otherwise show zero */}
              <div className="card" style={{marginBottom:14}}>
                <div className="card-title">Recovery Systems</div>
                {allLogs.length===0?(
                  <div style={{textAlign:'center',padding:'20px 0',color:'#334155',fontSize:13}}>
                    Start logging daily to track your recovery progress
                  </div>
                ):(
                  <>
                    {[
                      {l:'Immunity Rebuild',   pct:allLogs.length>0?Math.min(100,Math.round(allLogs.slice(-7).reduce((s,l)=>s+(+l.yogaMins||0),0)/allLogs.slice(-7).length/45*100)):0,  c:'#3B82F6'},
                      {l:'Digestive Function', pct:allLogs.length>0?Math.min(100,Math.round(allLogs.slice(-7).reduce((s,l)=>s+(+l.digestComfort||0),0)/allLogs.slice(-7).length/10*100)):0,c:'#10B981'},
                      {l:'Muscle & Strength',  pct:allLogs.length>0?Math.min(100,Math.round(allLogs.slice(-7).reduce((s,l)=>s+computeDayScore(l).gym,0)/allLogs.slice(-7).length)):0,     c:'#F59E0B'},
                      {l:'Hair Regrowth',      pct:0, c:'#8B5CF6'},
                      {l:'Fertility Recovery', pct:0, c:'#EC4899'},
                      {l:'Energy Level',       pct:allLogs.length>0?Math.min(100,Math.round(allLogs.slice(-7).reduce((s,l)=>s+(+l.energyAM||0)+(+l.energyPM||0),0)/allLogs.slice(-7).length/20*100)):0,c:'#3B82F6'},
                    ].map(s=><ScoreBar key={s.l} label={s.l} value={s.pct} color={s.c}/>)}
                    <div style={{fontSize:11,color:'#334155',marginTop:8}}>Based on last 7 days of logged data. Hair and fertility tracked via Recovery guides.</div>
                  </>
                )}
              </div>

              {/* Food intolerances */}
              {(db.intolerances||[]).length>0&&(
                <div className="card" style={{border:'1px solid rgba(239,68,68,0.25)',marginBottom:14}}>
                  <div className="card-title" style={{color:'#F87171'}}>⚠ Tracked Food Intolerances</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {db.intolerances.map((f,i)=>(
                      <span key={i} style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#F87171',padding:'3px 10px',borderRadius:20,fontSize:12}}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol */}
              <div className="card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div className="card-title" style={{marginBottom:0}}>Today's Protocol</div>
                  <span style={{fontSize:12,color:'#475569'}}>{Object.values(db.todayChecks||{}).filter(Boolean).length}/{PROTOCOL.length} done</span>
                </div>
                {PROTOCOL.map((item,i)=>{
                  const done=(db.todayChecks||{})[i]
                  return (
                    <div key={i} onClick={()=>toggleCheck(i)}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:6,cursor:'pointer',marginBottom:3,background:done?'rgba(16,185,129,0.05)':'transparent',transition:'all 0.15s'}}>
                      <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${done?'#10B981':'#1E293B'}`,background:done?'rgba(16,185,129,0.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:11,color:'#10B981',transition:'all 0.2s'}}>
                        {done?'✓':''}
                      </div>
                      <span style={{fontSize:13,color:done?'#4ADE80':'#94A3B8',textDecoration:done?'line-through':'none',opacity:done?0.6:1,transition:'all 0.2s'}}>
                        {item}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab==='log'    &&<LogTab {...dbProps}/>}
          {tab==='track'  &&<TrackTab logs={allLogs}/>}
          {tab==='food'   &&<FoodTab {...dbProps}/>}
          {tab==='blood'  &&<BloodTab {...dbProps}/>}
          {tab==='fit'    &&<FitTab {...dbProps}/>}
          {tab==='heal'   &&<HealTab {...dbProps}/>}
          {tab==='ai'     &&<AICoachTab uid={uid} db={db} setDb={setDb} userEmail={userEmail} aiLoading={aiLoading} setAiLoading={setAiLoading}/>}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-nav">
        {MOBILE_NAV.map(t=>(
          <button key={t.id} className={`mobile-nav-item${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
            {t.id==='log'&&!db.todayLog&&<div style={{position:'absolute',top:4,right:'calc(50% - 14px)',width:6,height:6,borderRadius:'50%',background:'#F59E0B'}}/>}
          </button>
        ))}
      </nav>
    </div>
  )
}
