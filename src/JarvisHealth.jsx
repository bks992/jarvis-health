import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  getFoodLogs, saveFoodLog,
  getBloodReports, saveBloodReport,
  getMedicines, saveMedicine, deleteMedicine, getMedLog, saveMedLog,
  getHealthProfile, saveHealthProfile,
  getGuides, saveGuide, getPlans, savePlan,
  getChat, saveChat,
  getIntolerances, saveIntolerance,
  getDailyLog, saveDailyLog,
} from './firebase'
import { askJarvis, imgToBase64, speak, stopSpeaking, unlockSpeech } from './api'

// ─── THE 4 PILLARS (core of the whole app) ────────────────────────────────────
const PILLARS = {
  ahara: {
    id: 'ahara', label: 'Ahara', sub: 'Sacred Nourishment',
    emoji: '🍽️', color: '#10B981',
    goal: 'Sattvic food builds Ojas — the vital essence that fights cancer',
    targets: {
      proteinG: { label: 'Protein', unit: 'g', target: 80, why: 'Rebuilds Mamsa Dhatu (muscle). Prevents sarcopenia. Muscle = cancer armor.' },
      waterL:   { label: 'Water',   unit: 'L', target: 2.5,why: 'Liver flush post-radiation. Lymph clearance. Toxin removal.' },
      fiberG:   { label: 'Fiber',   unit: 'g', target: 30, why: 'Feeds gut bacteria that produce anti-cancer short-chain fatty acids.' },
      veggieServings: { label: 'Veggies', unit: 'svgs', target: 5, why: 'Phytonutrients directly suppress NF-kB (cancer survival pathway).' },
    },
    keyFoods: ['Moong dal','Amla powder','Ash gourd juice','Golden milk','Tulsi tea','Ghee','Curd/Yogurt','Ginger','Turmeric'],
    avoid: ['Refined sugar','Fried food','Processed food','Alcohol','Red meat','Raw salads (large)'],
    ayurveda: 'Agni (digestive fire) must be strong — all healing depends on proper digestion and absorption.',
  },
  jala: {
    id: 'jala', label: 'Jala', sub: 'Life-Giving Water',
    emoji: '💧', color: '#3B82F6',
    goal: 'Water is Prana — life force. Quality and timing matters as much as quantity',
    targets: {
      waterL: { label: 'Total water', unit: 'L', target: 2.5, why: 'Liver regeneration requires 3L daily to flush metabolic waste.' },
    },
    schedule: [
      { time: 'On waking', drink: 'Lemon water (warm)', why: 'Stimulates Agni, alkalizes pH, boosts liver bile' },
      { time: 'Pre-meal', drink: 'Warm ginger water', why: 'Activates digestive enzymes, reduces nausea' },
      { time: 'Morning', drink: 'Ash gourd juice 200ml', why: 'Heals gut lining, cooling for inflammation' },
      { time: 'Afternoon', drink: 'Tulsi/barley water', why: 'Immunity boost, blood sugar control' },
      { time: 'Evening', drink: 'Triphala water', why: 'Liver detox, colon cleanse, CA 19-9 reduction' },
      { time: 'Bedtime', drink: 'Golden milk (haldi doodh)', why: 'Curcumin + piperine — anti-tumor, anti-inflammatory' },
    ],
    ayurveda: 'Copper vessel water (Tamra Jal) — leave water overnight in copper, drink morning. Antimicrobial + liver support.',
  },
  yoga: {
    id: 'yoga', label: 'Yoga', sub: 'Prana & Healing',
    emoji: '🧘', color: '#F59E0B',
    goal: 'Yoga moves Prana through Nadis — activates NK cells, reduces cortisol, heals vagus nerve',
    targets: {
      yogaMins: { label: 'Yoga/Pranayama', unit: 'mins', target: 45, why: '10 mins Anulom Vilom = 30% NK cell boost (cancer surveillance).' },
    },
    practices: [
      { name: 'Anulom Vilom', mins: 10, why: '30% NK cell increase. Balances nervous system. Reduces cortisol.' },
      { name: 'Bhramari', mins: 5, why: 'Nitric oxide x15 — anti-tumor. Vagus nerve activation. Deep sleep.' },
      { name: 'Pawanmuktasana', mins: 15, why: 'Gas/bloating relief post-PERT. Massages liver and pancreas.' },
      { name: 'Surya Namaskar', mins: 10, why: 'Full lymphatic pump. Growth hormone. Muscle memory rebuild.' },
      { name: 'Shavasana', mins: 20, why: 'IL-6 (inflammation) reduction. Cellular repair activation.' },
    ],
    ayurveda: 'Brahma Muhurta (5-6am): highest Prana in nature. Best time for pranayama and meditation.',
  },
  vyayama: {
    id: 'vyayama', label: 'Vyayama', sub: 'Strength & Movement',
    emoji: '💪', color: '#8B5CF6',
    goal: 'Every 1% muscle gain = 4% reduction in cancer mortality. Muscle = your metabolic shield',
    targets: {
      walkingSteps: { label: 'Daily steps', unit: '', target: 8000, why: 'Every 1000 steps = 8% cancer recurrence reduction (JAMA).' },
    },
    phases: [
      { phase: 1, weeks: '1-6',    label: 'Gentle rebuild',     exercises: 'Wall push-ups, chair squats, resistance bands, 20-min walk' },
      { phase: 2, weeks: '7-16',   label: 'Building strength',  exercises: 'Bodyweight squats, light dumbbells (2-5kg), 30-min walk' },
      { phase: 3, weeks: 'Month 4+',label: 'Progressive load',  exercises: 'Full compound movements, 5-10kg, Swimming, 45-min walk' },
    ],
    ayurveda: 'Ardha Shakti principle: exercise to HALF capacity. Gradual loading honours the body\'s recovery wisdom.',
  },
}

// ─── PILLAR SCORING ───────────────────────────────────────────────────────────
function scorePillars(log, medLog = {}) {
  if (!log) return { ahara: 0, jala: 0, yoga: 0, vyayama: 0, medicine: 0, overall: 0 }
  const p  = +log.proteinG || 0
  const w  = +log.waterL   || 0
  const f  = +log.fiberG   || 0
  const v  = +log.veggieServings || 0
  const ym = +log.yogaMins || 0
  const st = +log.walkingSteps || 0
  const hasGym = log.gymGroup && log.gymGroup !== 'None today'
  const creon = +log.creonDoses || 0

  const ahara   = Math.min(100, Math.round((p/80*35) + (w/2.5*25) + (f/30*20) + (v/5*20)))
  const jala    = Math.min(100, Math.round(w / 2.5 * 100))
  const yoga    = Math.min(100, Math.round(ym / 45 * 100))
  const vyayama = Math.min(100, Math.round((st/8000*60) + (hasGym ? 40 : 0)))

  // Medicine score: based on creon compliance (most critical)
  const creonScore = Math.min(100, Math.round(creon / 3 * 100))
  const medDone = Object.values(medLog.taken || {}).filter(Boolean).length
  const medTotal = Object.keys(medLog.taken || {}).length || 1
  const medicine = Math.round((creonScore * 0.6) + (medDone / medTotal * 100 * 0.4))

  const overall = Math.round(ahara*0.25 + jala*0.15 + yoga*0.25 + vyayama*0.20 + medicine*0.15)
  return { ahara, jala, yoga, vyayama, medicine, overall }
}

function scoreColor(n) {
  if (n >= 80) return '#10B981'
  if (n >= 60) return '#3B82F6'
  if (n >= 40) return '#F59E0B'
  if (n >  0)  return '#EF4444'
  return '#1E293B'
}
function scoreBg(n) {
  if (n >= 80) return 'rgba(16,185,129,0.08)'
  if (n >= 60) return 'rgba(59,130,246,0.08)'
  if (n >= 40) return 'rgba(245,158,11,0.08)'
  return 'transparent'
}
function scoreLabel(n) {
  if (n >= 80) return 'Excellent'
  if (n >= 60) return 'Good'
  if (n >= 40) return 'Fair'
  if (n >  0)  return 'Needs work'
  return 'Not logged'
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;-webkit-text-size-adjust:100%}
body{background:#060D1A;color:#E2E8F0;font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:#1E3A5F;border-radius:2px}
input,textarea,select,button{font-family:inherit}
textarea::placeholder,input::placeholder{color:#334155}
select option{background:#0F172A}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
input[type=range]{-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.4)}

@keyframes spin    {to{transform:rotate(360deg)}}
@keyframes fadeIn  {from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse   {0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes ripple  {0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.8);opacity:0}}
@keyframes shimmer {0%{background-position:-200% 0}100%{background-position:200% 0}}

.fade-in{animation:fadeIn 0.2s ease forwards}
.pulse{animation:pulse 2s ease infinite}

/* ── Layout ── */
.shell{display:flex;min-height:100vh}
.sidebar{width:220px;flex-shrink:0;background:#04090F;border-right:1px solid #0D1F2D;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto}
.main{margin-left:220px;flex:1;display:flex;flex-direction:column;min-height:100vh}
.topbar{position:sticky;top:0;z-index:50;background:rgba(6,13,26,0.96);backdrop-filter:blur(14px);border-bottom:1px solid #0D1F2D;padding:10px 20px;display:flex;align-items:center;gap:12px;min-height:56px}
.page{padding:20px;max-width:1000px;flex:1}

/* Sidebar */
.sb-brand{padding:18px 16px 14px;border-bottom:1px solid #0D1F2D}
.sb-logo{display:flex;align-items:center;gap:10px}
.sb-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.sb-name{font-size:15px;font-weight:700;color:#F1F5F9;letter-spacing:-0.3px}
.sb-tag{font-size:11px;color:#334155;margin-top:2px}
.sb-status{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:#475569}
.sb-dot{width:6px;height:6px;border-radius:50%;background:#10B981;flex-shrink:0}
.sec-label{padding:14px 16px 4px;font-size:10px;font-weight:600;letter-spacing:0.8px;color:#1E3A5F;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:9px;padding:9px 16px;font-size:13px;font-weight:500;color:#475569;cursor:pointer;border-left:2px solid transparent;transition:all 0.12s;text-decoration:none}
.nav-item:hover{color:#94A3B8;background:rgba(255,255,255,0.03)}
.nav-item.active{color:#E2E8F0;background:rgba(59,130,246,0.07);border-left-color:#3B82F6}
.nav-item svg{width:15px;height:15px;flex-shrink:0}
.nav-badge{margin-left:auto;width:6px;height:6px;border-radius:50%;background:#F59E0B}
.sb-footer{margin-top:auto;padding:12px 16px;border-top:1px solid #0D1F2D}
.sb-metric{display:flex;justify-content:space-between;font-size:11px;padding:2px 0}
.sb-metric-label{color:#1E3A5F}
.sb-metric-val{color:#475569;font-weight:500}

/* ── Cards ── */
.card{background:#0A1628;border:1px solid #0D1F2D;border-radius:12px;padding:18px;margin-bottom:14px}
.card-sm{padding:13px 16px}
.card-title{font-size:11px;font-weight:600;letter-spacing:0.5px;color:#334155;text-transform:uppercase;margin-bottom:14px}
.card-title-lg{font-size:14px;font-weight:700;color:#94A3B8;margin-bottom:4px}

/* ── Stats ── */
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px}
.stat{background:#0A1628;border:1px solid #0D1F2D;border-radius:10px;padding:14px;text-align:center}
.stat-val{font-size:26px;font-weight:800;margin:4px 0 2px;letter-spacing:-1px}
.stat-lbl{font-size:10px;font-weight:600;color:#334155;text-transform:uppercase;letter-spacing:0.5px}
.stat-sub{font-size:11px;color:#1E3A5F;margin-top:2px}

/* ── Pillar cards ── */
.pillar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px}
.pillar-card{background:#0A1628;border:1px solid #0D1F2D;border-radius:12px;padding:16px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
.pillar-card:hover{border-color:#1E3A5F}
.pillar-card.active{border-color:var(--pc)}
.pillar-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.pillar-emoji{font-size:22px}
.pillar-info{flex:1}
.pillar-name{font-size:13px;font-weight:700;color:#E2E8F0}
.pillar-sub{font-size:11px;color:#475569;margin-top:1px}
.pillar-score{font-size:24px;font-weight:800;margin-left:auto}
.pillar-bar-wrap{height:5px;background:#0D1F2D;border-radius:3px;overflow:hidden;margin-bottom:8px}
.pillar-bar{height:100%;border-radius:3px;transition:width 1s ease}
.pillar-status{font-size:11px;font-weight:500}

/* ── Progress ── */
.prog-wrap{height:5px;background:#0D1F2D;border-radius:3px;overflow:hidden}
.prog-fill{height:100%;border-radius:3px;transition:width 0.8s ease}

/* ── Form ── */
.form-label{display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px}
.form-input{width:100%;padding:9px 12px;background:#060D1A;border:1px solid #0D1F2D;border-radius:8px;color:#E2E8F0;font-size:14px;outline:none;transition:border-color 0.15s;-webkit-appearance:none}
.form-input:focus{border-color:#3B82F6}
.form-row{margin-bottom:13px}
.form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.slider-row{display:flex;align-items:center;gap:10px}
.slider-val{min-width:30px;text-align:right;font-size:14px;font-weight:700}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;-webkit-tap-highlight-color:transparent}
.btn-primary{background:#3B82F6;color:white}.btn-primary:hover{background:#2563EB}
.btn-primary:disabled{background:#0D1F2D;color:#1E3A5F;cursor:not-allowed}
.btn-green{background:#10B981;color:white}.btn-green:hover{background:#059669}
.btn-green:disabled{background:#0D1F2D;color:#1E3A5F;cursor:not-allowed}
.btn-outline{background:transparent;color:#64748B;border:1px solid #0D1F2D}
.btn-outline:hover{background:#0A1628;color:#94A3B8;border-color:#1E293B}
.btn-red{background:#EF4444;color:white}.btn-red:hover{background:#DC2626}
.btn-full{width:100%}
.btn-sm{padding:7px 12px;font-size:12px;border-radius:6px}

/* ── Tabs ── */
.tabs{display:flex;gap:2px;border-bottom:1px solid #0D1F2D;margin-bottom:18px}
.tab-btn{padding:8px 14px;background:none;border:none;font-size:13px;font-weight:500;color:#334155;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.12s}
.tab-btn.active{color:#3B82F6;border-bottom-color:#3B82F6}
.tab-btn:hover:not(.active){color:#64748B}

/* ── Upload zone ── */
.upload-zone{border:1.5px dashed #0D1F2D;border-radius:10px;padding:28px 16px;text-align:center;cursor:pointer;transition:all 0.15s;background:#060D1A}
.upload-zone:hover,.upload-zone:active{border-color:#3B82F6;background:rgba(59,130,246,0.04)}
.upload-zone.filled{padding:0;overflow:hidden;border-style:solid;border-color:#1E3A5F}
.upload-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.upload-btn-label{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;border:1px solid #0D1F2D;background:#060D1A;color:#64748B;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s}
.upload-btn-label:hover{border-color:#1E293B;color:#94A3B8}
.upload-btn-label:active{background:#0A1628}

/* ── Food log item ── */
.food-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #0D1F2D}
.food-verdict{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0}

/* ── Medicine chip ── */
.med-chip{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;border:1px solid #0D1F2D;background:#060D1A;margin-bottom:6px;transition:all 0.12s}
.med-chip.taken{background:rgba(16,185,129,0.07);border-color:rgba(16,185,129,0.25)}
.med-check{width:22px;height:22px;border-radius:5px;border:1.5px solid #1E293B;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.12s;font-size:12px;color:#10B981}
.med-chip.taken .med-check{background:rgba(16,185,129,0.15);border-color:#10B981}

/* ── Chat ── */
.chat-area{flex:1;overflow-y:auto;padding:4px 0 12px;display:flex;flex-direction:column;gap:10px}
.chat-msg{display:flex;gap:8px;align-items:flex-end;max-width:100%}
.chat-msg.user{flex-direction:row-reverse}
.chat-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.chat-bubble{max-width:78%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.65;white-space:pre-wrap}
.chat-bubble.ai{background:#0A1628;color:#CBD5E1;border:1px solid #0D1F2D;border-radius:12px 12px 12px 3px}
.chat-bubble.user{background:#1E3A5F;color:#E2E8F0;border-radius:12px 12px 3px 12px}
.chat-input-row{display:flex;gap:8px;padding-top:8px;border-top:1px solid #0D1F2D;margin-top:8px}
.chat-input{flex:1;background:#060D1A;border:1px solid #0D1F2D;border-radius:10px;padding:10px 14px;color:#E2E8F0;font-size:14px;resize:none;outline:none;line-height:1.4;transition:border-color 0.15s;min-height:42px;max-height:100px}
.chat-input:focus{border-color:#3B82F6}
.quick-chips{display:flex;gap:5px;overflow-x:auto;padding:6px 0;scrollbar-width:none}
.quick-chip{flex-shrink:0;padding:5px 11px;border-radius:20px;border:1px solid #0D1F2D;background:#060D1A;color:#475569;font-size:11px;cursor:pointer;white-space:nowrap;transition:all 0.12s}
.quick-chip:hover,.quick-chip:active{border-color:#1E293B;color:#94A3B8}

/* ── Toast ── */
.toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#10B981;color:white;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;white-space:nowrap;box-shadow:0 4px 14px rgba(16,185,129,0.35);pointer-events:none;animation:fadeIn 0.2s ease}

/* ── Voice reactor ── */
.reactor{position:relative;width:38px;height:38px;cursor:pointer;flex-shrink:0}
.reactor-ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid #0D1F2D;animation:spin 9s linear infinite}
.reactor-ring.active{border-color:#3B82F6;animation-duration:2s}
.reactor-core{position:absolute;inset:8px;border-radius:50%;background:#060D1A;border:1px solid #0D1F2D;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s}
.reactor-core.active{background:rgba(59,130,246,0.12);border-color:#3B82F6}
.reactor-ripple{position:absolute;inset:-5px;border-radius:50%;border:1.5px solid #3B82F6;animation:ripple 1.5s ease infinite}

/* ── Habit chip ── */
.habit{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;border:1px solid #0D1F2D;background:#060D1A;cursor:pointer;transition:all 0.12s}
.habit.done{background:rgba(16,185,129,0.06);border-color:rgba(16,185,129,0.22)}
.habit-box{width:16px;height:16px;border-radius:4px;border:1.5px solid #1E293B;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;color:#10B981;transition:all 0.12s}
.habit.done .habit-box{background:rgba(16,185,129,0.15);border-color:#10B981}

/* ── Mobile nav ── */
@media(max-width:768px){
  .sidebar{display:none}
  .main{margin-left:0}
  .page{padding:12px 12px 88px}
  .topbar{padding:8px 12px}
  .stats-row{grid-template-columns:repeat(2,1fr);gap:8px}
  .form-grid2{grid-template-columns:1fr}
  .form-grid3{grid-template-columns:1fr 1fr}
  .pillar-grid{grid-template-columns:1fr 1fr;gap:8px}
  .mob-nav{position:fixed;bottom:0;left:0;right:0;background:rgba(4,9,15,0.97);backdrop-filter:blur(16px);border-top:1px solid #0D1F2D;display:flex;z-index:100;padding:5px 0 10px}
  .mob-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;cursor:pointer;border:none;background:none;color:#1E3A5F;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;transition:color 0.12s;-webkit-tap-highlight-color:transparent}
  .mob-nav-item.active{color:#3B82F6}
  .mob-nav-item svg{width:20px;height:20px}
  .mob-badge{position:absolute;top:2px;right:calc(50% - 16px);width:6px;height:6px;border-radius:50%;background:#F59E0B}
}
@media(min-width:769px){.mob-nav{display:none}}
`

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = {
  home:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  log:   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  track: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  food:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  meds:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  blood: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>,
  yoga:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  heal:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
  ai:    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  profile: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spin({ size = 18, color = '#3B82F6' }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}25`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
}

function PillarBar({ label, value, color, target, unit = '' }) {
  const pct = Math.min(100, value)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: pct > 0 ? scoreColor(pct) : '#1E3A5F' }}>
          {pct > 0 ? `${pct}%` : '—'}
        </span>
      </div>
      <div className="prog-wrap">
        <div className="prog-fill" style={{ width: `${pct}%`, background: pct > 0 ? color : '#0D1F2D' }} />
      </div>
      {target && <div style={{ fontSize: 10, color: '#1E3A5F', marginTop: 3 }}>Target: {target}{unit}</div>}
    </div>
  )
}

// ─── PILLAR DETAIL MODAL/PANEL ─────────────────────────────────────────────────
function PillarDetail({ pillar, score, log }) {
  const p = PILLARS[pillar]
  if (!p) return null
  return (
    <div className="card fade-in" style={{ border: `1px solid ${p.color}25` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{p.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#E2E8F0' }}>{p.label} — {p.sub}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{p.goal}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: score > 0 ? scoreColor(score) : '#1E3A5F' }}>{score > 0 ? score : '—'}</div>
          <div style={{ fontSize: 10, color: '#334155' }}>{scoreLabel(score)}</div>
        </div>
      </div>

      {/* Targets */}
      {Object.entries(p.targets).map(([k, t]) => {
        const val = +log?.[k] || 0
        const pct = Math.min(100, Math.round((val / t.target) * 100))
        return (
          <div key={k} style={{ marginBottom: 12, padding: '10px 12px', background: '#060D1A', borderRadius: 8, border: '1px solid #0D1F2D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>{t.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? p.color : scoreColor(pct) }}>
                {val}{t.unit} <span style={{ color: '#334155', fontWeight: 400 }}>/ {t.target}{t.unit}</span>
              </span>
            </div>
            <div className="prog-wrap" style={{ height: 6, marginBottom: 6 }}>
              <div className="prog-fill" style={{ width: `${pct}%`, background: pct >= 100 ? p.color : scoreColor(pct) }} />
            </div>
            <div style={{ fontSize: 11, color: '#334155' }}>🪷 {t.why}</div>
          </div>
        )
      })}

      {/* Ayurveda wisdom */}
      <div style={{ padding: '10px 12px', background: `${p.color}08`, borderRadius: 8, border: `1px solid ${p.color}18`, marginTop: 4 }}>
        <div style={{ fontSize: 11, color: p.color, fontWeight: 600, marginBottom: 3 }}>Ayurvedic Principle</div>
        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{p.ayurveda}</div>
      </div>

      {/* Specific guidance */}
      {p.keyFoods && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginBottom: 5 }}>KEY FOODS FOR RECOVERY</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {p.keyFoods.map(f => (
              <span key={f} style={{ background: `${p.color}10`, border: `1px solid ${p.color}20`, color: p.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{f}</span>
            ))}
          </div>
        </div>
      )}
      {p.schedule && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginBottom: 8 }}>DAILY WATER SCHEDULE</div>
          {p.schedule.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < p.schedule.length - 1 ? '1px solid #0D1F2D' : 'none' }}>
              <div style={{ width: 80, fontSize: 11, color: p.color, flexShrink: 0, fontWeight: 600 }}>{s.time}</div>
              <div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{s.drink}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>{s.why}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {p.practices && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginBottom: 8 }}>DAILY PRACTICES</div>
          {p.practices.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < p.practices.length - 1 ? '1px solid #0D1F2D' : 'none' }}>
              <div style={{ width: 110, fontSize: 12, color: '#94A3B8', flexShrink: 0, fontWeight: 600 }}>{s.name}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#475569' }}>{s.mins} mins · {s.why}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {p.phases && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginBottom: 8 }}>PHASE-WISE PROTOCOL</div>
          {p.phases.map((ph) => (
            <div key={ph.phase} style={{ padding: '8px 12px', background: '#060D1A', borderRadius: 8, border: '1px solid #0D1F2D', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.color, marginBottom: 3 }}>Phase {ph.phase} — Weeks {ph.weeks} — {ph.label}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{ph.exercises}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FOOD TAB ─────────────────────────────────────────────────────────────────
const FOOD_CATEGORIES = ['Breakfast','Lunch','Dinner','Snack','Drink','Supplement']
const COOKING_METHODS = ['Boiled','Steamed','Sautéed','Raw','Grilled','Mixed']

function FoodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading, showToast, profile }) {
  const [mode, setMode] = useState('photo') // photo | manual
  const [img, setImg] = useState(null)
  const [imgData, setImgData] = useState(null)
  const [imgError, setImgError] = useState('')
  const [result, setResult] = useState(null)
  const [manual, setManual] = useState({ name: '', category: 'Meal', qty: '', unit: 'g', notes: '' })
  const [mealTime, setMealTime] = useState('Meal')
  const fileRef = useRef()

  // Build full context for AI from profile + log + medicines
  function buildFoodContext() {
    const intols = (db.intolerances || []).join(', ') || 'none recorded'
    const meds = (db.medicines || []).map(m => m.name).join(', ') || 'none'
    const recentFoods = (db.foodLogs || []).slice(0, 5).map(f => `${f.mealTime || 'meal'}: ${f.name || f.verdict}`).join('; ')
    const ca199 = profile.ca199Current || 'unknown'
    return `PATIENT CONTEXT:
- Pancreatic cancer survivor (tail+body removed), liver mets treated, chemo complete, now in REMISSION
- CA 19-9 current: ${ca199} U/mL (target: ~6)
- Current medicines: ${meds}
- Known food intolerances: ${intols}
- Recent meals today: ${recentFoods || 'none yet'}
- Must take CREON (pancreatic enzymes) with every meal containing fat/protein
- Low glycemic diet critical — no refined sugar, cancer cells use glucose
- Sattvic diet: avoid fried, spicy, processed, red meat, alcohol`
  }

  async function handleFile(file) {
    if (!file) return
    setImgError('')
    setImg(URL.createObjectURL(file))
    setResult(null)
    setImgData(null)
    try {
      const data = await imgToBase64(file)
      setImgData(data)
    } catch (e) {
      setImgError('Could not process this image. Please try another photo.')
      setImg(null)
    }
  }

  async function analyzePhoto() {
    if (!imgData || aiLoading) return
    unlockSpeech()
    setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgData } },
          { type: 'text', text: `${buildFoodContext()}

TASK: Analyze this meal photo for my cancer recovery.

Respond in this exact format:
MEAL NAME: [what you see, be specific]
VERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]
SCORE: [1-10]
ESTIMATED NUTRITION:
- Protein: [Xg estimate]
- Carbs: [Xg estimate]  
- Fat: [Xg estimate]
- Fiber: [Xg estimate]
BENEFITS: [specific cancer recovery benefits of what you see]
CONCERNS: [any issues for my pancreatic recovery]
CREON NEEDED: [YES - high fat/protein / MODERATE / NO - minimal fat]
IMPROVE IT: [one specific suggestion to make this better]
INTOLERANCE FLAG: [list any foods from my known intolerances, or NONE]
AYURVEDA: [Sattvic/Rajasic/Tamasic and why]` }
        ]
      }], '', userEmail)

      const verdict = resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase() || 'acceptable'
      const score   = parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1] || '5')
      const mealName = resp.match(/MEAL NAME:\s*([^\n]+)/i)?.[1]?.trim() || 'Meal'
      const flagMatch = resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
      const flagged = flagMatch && flagMatch[1].trim().toUpperCase() !== 'NONE'
        ? flagMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []

      const entry = {
        id: Date.now(), date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        mealTime, name: mealName, verdict, score, analysis: resp, flagged, source: 'photo'
      }

      await saveFoodLog(uid, entry)
      for (const f of flagged) await saveIntolerance(uid, f)
      setDb(prev => ({ ...prev, foodLogs: [entry, ...(prev.foodLogs || [])].slice(0, 100), intolerances: [...new Set([...(prev.intolerances || []), ...flagged])] }))
      setResult(entry)

      const msg = verdict === 'optimal'
        ? `Excellent meal. ${mealName}. Score ${score} out of 10. Great choice for your recovery.`
        : verdict === 'acceptable'
        ? `Acceptable meal. ${mealName}. Score ${score} out of 10. ${resp.match(/CONCERNS:\s*([^\n]+)/i)?.[1] || ''}`
        : `I would advise against this. ${mealName}. Score only ${score}. ${resp.match(/CONCERNS:\s*([^\n]+)/i)?.[1] || ''}`
      speak(msg, { max: 250 })

      if (flagged.length) showToast(`⚠ Intolerance: ${flagged.join(', ')}`)
    } catch (e) {
      setResult({ analysis: `Error analyzing: ${e.message}. Please check your connection and try again.`, verdict: 'acceptable', score: 0, flagged: [], name: 'Error' })
    }
    setAiLoading(false)
  }

  async function logManual() {
    if (!manual.name.trim() || aiLoading) return
    unlockSpeech()
    setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{
        role: 'user',
        content: `${buildFoodContext()}

I just ate: ${manual.name}${manual.qty ? ` (${manual.qty} ${manual.unit})` : ''} — ${mealTime}${manual.notes ? `. Notes: ${manual.notes}` : ''}

Analyze this food for my cancer recovery:
MEAL NAME: ${manual.name}
VERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]
SCORE: [1-10]
ESTIMATED NUTRITION:
- Protein: [Xg]
- Carbs: [Xg]
- Fat: [Xg]
- Fiber: [Xg]
BENEFITS: [specific recovery benefits]
CONCERNS: [any issues]
CREON NEEDED: [YES/MODERATE/NO]
IMPROVE IT: [one suggestion]
INTOLERANCE FLAG: [problem foods or NONE]
AYURVEDA: [brief Ayurvedic assessment]`
      }], '', userEmail)

      const verdict = resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase() || 'acceptable'
      const score   = parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1] || '5')
      const flagMatch = resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
      const flagged = flagMatch && flagMatch[1].trim().toUpperCase() !== 'NONE'
        ? flagMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []

      const entry = {
        id: Date.now(), date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        mealTime, name: manual.name, verdict, score, analysis: resp, flagged, source: 'manual',
        qty: manual.qty, unit: manual.unit
      }

      await saveFoodLog(uid, entry)
      for (const f of flagged) await saveIntolerance(uid, f)
      setDb(prev => ({ ...prev, foodLogs: [entry, ...(prev.foodLogs || [])].slice(0, 100), intolerances: [...new Set([...(prev.intolerances || []), ...flagged])] }))
      setResult(entry)
      setManual({ name: '', category: 'Meal', qty: '', unit: 'g', notes: '' })
      speak(`${manual.name} logged. Score ${score} out of 10.`, { max: 150 })
      if (flagged.length) showToast(`⚠ Intolerance: ${flagged.join(', ')}`)
    } catch (e) {
      showToast('Error: ' + e.message)
    }
    setAiLoading(false)
  }

  const vC = { optimal: '#10B981', acceptable: '#F59E0B', inadvisable: '#EF4444' }
  const vI  = { optimal: '✓', acceptable: '!', inadvisable: '✕' }

  return (
    <div className="fade-in">
      {/* Today's food log */}
      {(db.foodLogs || []).filter(f => f.date === new Date().toLocaleDateString('en-IN')).length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Today's Food Log</div>
          {(db.foodLogs || []).filter(f => f.date === new Date().toLocaleDateString('en-IN')).map(f => (
            <div key={f.id} className="food-item">
              <div className="food-verdict" style={{ background: `${vC[f.verdict] || '#F59E0B'}15`, color: vC[f.verdict] || '#F59E0B' }}>
                {vI[f.verdict] || '!'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>{f.name || f.verdict}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>{f.mealTime || 'Meal'} · {f.time || f.date}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: vC[f.verdict] || '#F59E0B' }}>{f.score}/10</div>
            </div>
          ))}
        </div>
      )}

      {/* Add food */}
      <div className="card">
        <div className="card-title">Add Food / Track Meal</div>

        {/* Meal time selector */}
        <div className="form-row">
          <label className="form-label">Meal type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FOOD_CATEGORIES.map(c => (
              <button key={c} onClick={() => setMealTime(c)} style={{
                padding: '5px 11px', borderRadius: 6, border: `1px solid ${mealTime === c ? '#3B82F6' : '#0D1F2D'}`,
                background: mealTime === c ? 'rgba(59,130,246,0.12)' : '#060D1A',
                color: mealTime === c ? '#60A5FA' : '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer'
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Mode tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab-btn${mode === 'photo' ? ' active' : ''}`} onClick={() => setMode('photo')}>📷 Photo</button>
          <button className={`tab-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>✏️ Type food name</button>
        </div>

        {mode === 'photo' ? (
          <>
            <div className={`upload-zone${img ? ' filled' : ''}`} onClick={() => !img && fileRef.current.click()}>
              {img
                ? <img src={img} alt="meal" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                : <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 3 }}>Photograph your meal</div>
                    <div style={{ fontSize: 12, color: '#1E3A5F' }}>Any size — auto-compressed · JARVIS reads and analyzes it</div>
                  </>
              }
            </div>
            {imgError && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>⚠ {imgError}</div>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <div className="upload-btns">
              <label className="upload-btn-label">
                📷 Take Photo
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              </label>
              <label className="upload-btn-label">
                🖼 From Gallery
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              </label>
            </div>
            {img && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setImg(null); setImgData(null); setResult(null) }}>Clear</button>
                <button className="btn btn-primary btn-full" onClick={analyzePhoto} disabled={!imgData || aiLoading}>
                  {aiLoading ? <><Spin size={16} color="white" />Analyzing...</> : 'Analyze This Meal'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="form-row">
              <label className="form-label">What did you eat?</label>
              <input className="form-input" placeholder="e.g. Moong dal khichdi, chicken curry, apple..." value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div className="form-grid2">
              <div className="form-row">
                <label className="form-label">Quantity (optional)</label>
                <input className="form-input" type="number" placeholder="200" value={manual.qty} onChange={e => setManual(m => ({ ...m, qty: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">Unit</label>
                <select className="form-input" value={manual.unit} onChange={e => setManual(m => ({ ...m, unit: e.target.value }))}>
                  {['g', 'ml', 'cup', 'bowl', 'plate', 'piece', 'tsp', 'tbsp'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes (how cooked, ingredients, etc)</label>
              <input className="form-input" placeholder="boiled, with ghee, no salt..." value={manual.notes} onChange={e => setManual(m => ({ ...m, notes: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-full" onClick={logManual} disabled={!manual.name.trim() || aiLoading}>
              {aiLoading ? <><Spin size={16} color="white" />Analyzing...</> : 'Log & Analyze Food'}
            </button>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card fade-in" style={{ border: `1px solid ${(vC[result.verdict] || '#F59E0B')}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: `${vC[result.verdict] || '#F59E0B'}15`, border: `1px solid ${vC[result.verdict] || '#F59E0B'}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: vC[result.verdict] || '#F59E0B', flexShrink: 0 }}>
              {vI[result.verdict] || '!'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#E2E8F0' }}>{result.name}</div>
              <div style={{ fontSize: 12, color: vC[result.verdict] || '#F59E0B', fontWeight: 600, marginTop: 1 }}>
                {result.verdict?.toUpperCase()} · Score: {result.score}/10
              </div>
            </div>
            <button onClick={() => speak(result.analysis, { max: 500 })} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #0D1F2D', background: 'transparent', color: '#475569', fontSize: 13, cursor: 'pointer' }} title="Listen">🔊</button>
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.analysis}</div>
          {result.flagged?.length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#F87171', marginBottom: 5 }}>⚠ Intolerance detected — added to your list</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {result.flagged.map(f => <span key={f} style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{f}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Food history */}
      {(db.foodLogs || []).length > 0 && (
        <div className="card">
          <div className="card-title">Recent Food History</div>
          {(db.foodLogs || []).slice(0, 10).map(f => (
            <div key={f.id} className="food-item">
              <div className="food-verdict" style={{ background: `${vC[f.verdict] || '#F59E0B'}12`, color: vC[f.verdict] || '#F59E0B', fontSize: 14 }}>
                {vI[f.verdict] || '!'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>{f.name || 'Meal'}</div>
                <div style={{ fontSize: 11, color: '#1E3A5F' }}>{f.mealTime || ''} · {f.date} {f.time || ''}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: vC[f.verdict] || '#F59E0B' }}>{f.score}/10</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MEDICINE TAB ─────────────────────────────────────────────────────────────
function MedTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0, 10)
  const [adding, setAdding] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', dose: '', timing: 'With food', notes: '', type: 'Tablet' })
  const medicines = db.medicines || []
  const medLog = db.medLog || {}
  const taken = medLog.taken || {}

  async function addMed() {
    if (!newMed.name.trim()) return
    const id = Date.now().toString()
    const med = { ...newMed, id }
    await saveMedicine(uid, id, med)
    setDb(prev => ({ ...prev, medicines: [...(prev.medicines || []), med] }))
    setNewMed({ name: '', dose: '', timing: 'With food', notes: '', type: 'Tablet' })
    setAdding(false)
    showToast('Medicine added')
  }

  async function removeMed(id) {
    await deleteMedicine(uid, id).catch(() => {})
    setDb(prev => ({ ...prev, medicines: (prev.medicines || []).filter(m => m.id !== id) }))
    showToast('Removed')
  }

  async function toggleTaken(medId) {
    const newTaken = { ...taken, [medId]: !taken[medId] }
    const newLog = { ...medLog, taken: newTaken, date: today }
    await saveMedLog(uid, today, newLog)
    setDb(prev => ({ ...prev, medLog: newLog }))
  }

  const takenCount = Object.values(taken).filter(Boolean).length
  const totalCount = medicines.length

  return (
    <div className="fade-in">
      {/* Today's status */}
      {totalCount > 0 && (
        <div className="card" style={{ border: takenCount === totalCount ? '1px solid rgba(16,185,129,0.3)' : '1px solid #0D1F2D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>Today's Medicines</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>{takenCount} of {totalCount} taken</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: takenCount === totalCount ? '#10B981' : '#F59E0B' }}>
              {Math.round((takenCount / Math.max(1, totalCount)) * 100)}%
            </div>
          </div>
          <div className="prog-wrap" style={{ height: 6, marginBottom: 16 }}>
            <div className="prog-fill" style={{ width: `${(takenCount / Math.max(1, totalCount)) * 100}%`, background: takenCount === totalCount ? '#10B981' : '#F59E0B' }} />
          </div>
          {medicines.map(med => (
            <div key={med.id} className={`med-chip${taken[med.id] ? ' taken' : ''}`}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>{med.name}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{med.dose && `${med.dose} · `}{med.timing} · {med.type}</div>
                {med.notes && <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>{med.notes}</div>}
              </div>
              <div className="med-check" onClick={() => toggleTaken(med.id)}>
                {taken[med.id] ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREON reminder */}
      <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#60A5FA', marginBottom: 3 }}>💊 CREON Compliance — Critical</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          Take CREON with the FIRST BITE of every meal containing fat or protein. Without it, nutrients are not absorbed — muscle cannot rebuild, and recovery stalls. This is the single most important medicine habit.
        </div>
      </div>

      {/* Add medicine */}
      {!adding ? (
        <button className="btn btn-outline btn-full" onClick={() => setAdding(true)}>+ Add Medicine / Supplement</button>
      ) : (
        <div className="card">
          <div className="card-title">Add Medicine</div>
          <div className="form-row">
            <label className="form-label">Medicine / Supplement name *</label>
            <input className="form-input" placeholder="e.g. CREON 25000, Ashwagandha, Vitamin D3..." value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))} />
          </div>
          <div className="form-grid2">
            <div className="form-row">
              <label className="form-label">Dose</label>
              <input className="form-input" placeholder="e.g. 1 tablet, 500mg..." value={newMed.dose} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))} />
            </div>
            <div className="form-row">
              <label className="form-label">Type</label>
              <select className="form-input" value={newMed.type} onChange={e => setNewMed(m => ({ ...m, type: e.target.value }))}>
                {['Tablet','Capsule','Syrup','Injection','Powder','Drops','Supplement'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">When to take</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['With food', 'Before food', 'After food', 'Morning empty stomach', 'Bedtime', 'As needed'].map(t => (
                <button key={t} onClick={() => setNewMed(m => ({ ...m, timing: t }))} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${newMed.timing === t ? '#3B82F6' : '#0D1F2D'}`, background: newMed.timing === t ? 'rgba(59,130,246,0.12)' : '#060D1A', color: newMed.timing === t ? '#60A5FA' : '#475569', fontSize: 11, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Notes (doctor's instructions, frequency, etc)</label>
            <input className="form-input" placeholder="3 times daily, reduce after 3 months..." value={newMed.notes} onChange={e => setNewMed(m => ({ ...m, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-full" onClick={addMed} disabled={!newMed.name.trim()}>Save Medicine</button>
          </div>
        </div>
      )}

      {/* Medicine list with delete */}
      {medicines.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-title">All Medicines & Supplements</div>
          {medicines.map(med => (
            <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #0D1F2D' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>{med.name}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{med.dose} · {med.timing} · {med.type}</div>
                {med.notes && <div style={{ fontSize: 11, color: '#334155' }}>{med.notes}</div>}
              </div>
              <button className="btn btn-sm" onClick={() => removeMed(med.id)} style={{ background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DAILY LOG TAB ────────────────────────────────────────────────────────────
const GYM_GROUPS = ['None today', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Full body', 'Cardio']
const HABITS = [
  'Morning lemon water', 'CREON with every meal', 'Ash gourd juice 200ml',
  'Amla powder 1 tsp', 'Tulsi tea', 'Golden milk (bedtime)',
  'No refined sugar today', 'No fried food', 'In bed by 10pm',
  'Warm ginger water before meals', 'Pranayama 10 mins', 'Morning walk done',
]

function LogTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0, 10)
  const ex = db.todayLog || {}
  const [form, setForm] = useState({
    sleepH: '', energyAM: 5, energyPM: 5,
    waterL: '', proteinG: '', fiberG: '', veggieServings: '',
    creonDoses: 3, gasLevel: 0, bloating: 0, digestComfort: 5,
    yogaMins: '', walkingSteps: '', weightKg: '', gymGroup: 'None today',
    symptoms: '', notes: '', habits: {}, ...ex
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const sc = scorePillars(form, db.medLog)

  async function save() {
    setSaving(true)
    const log = { ...form, date: today, ...sc }
    await saveDailyLog(uid, today, log)
    setDb(prev => ({ ...prev, todayLog: log }))
    showToast('Log saved ✓')
    setSaving(false)
  }

  function SliderField({ label, k, min = 0, max = 10, color = '#3B82F6', emoji = '' }) {
    const v = +form[k] || 0
    const pct = ((v - min) / (max - min)) * 100
    const c = scoreColor(pct)
    const bg = `linear-gradient(to right,${c} ${pct}%,#0D1F2D ${pct}%)`
    return (
      <div className="form-row">
        <label className="form-label">{emoji} {label}</label>
        <div className="slider-row">
          <input type="range" className="form-input" min={min} max={max} step={1} value={v}
            onChange={e => set(k, +e.target.value)}
            style={{ background: bg, flex: 1, padding: 0 }}
            onInput={e => { e.target.style.background = bg }} />
          <span className="slider-val" style={{ color: c }}>{v}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Live pillar scores */}
      <div className="stats-row" style={{ marginBottom: 18 }}>
        {[
          { l: '🍽️ Ahara', v: sc.ahara, c: '#10B981' },
          { l: '💧 Jala', v: sc.jala, c: '#3B82F6' },
          { l: '🧘 Yoga', v: sc.yoga, c: '#F59E0B' },
          { l: '💪 Vyayama', v: sc.vyayama, c: '#8B5CF6' },
          { l: '💊 Medicine', v: sc.medicine, c: '#EC4899' },
          { l: '⭐ Overall', v: sc.overall, c: scoreColor(sc.overall) },
        ].map(s => (
          <div className="stat" key={s.l} style={{ border: `1px solid ${s.c}18` }}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{ color: s.v > 0 ? s.c : '#1E3A5F', fontSize: 22 }}>{s.v > 0 ? s.v : '—'}</div>
            <div className="prog-wrap" style={{ marginTop: 5 }}>
              <div className="prog-fill" style={{ width: `${s.v}%`, background: s.v > 0 ? s.c : '#0D1F2D' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Sleep */}
        <div className="card">
          <div className="card-title">😴 Sleep & Energy</div>
          <div className="form-row">
            <label className="form-label">Sleep hours</label>
            <input type="number" className="form-input" step="0.5" min="0" max="12" placeholder="7.5" value={form.sleepH} onChange={e => set('sleepH', e.target.value)} />
          </div>
          <SliderField label={`Morning energy: ${form.energyAM}/10`} k="energyAM" emoji="🌅" />
          <SliderField label={`Evening energy: ${form.energyPM}/10`} k="energyPM" emoji="🌇" />
        </div>

        {/* Nutrition — Ahara pillar */}
        <div className="card" style={{ borderColor: '#10B98120' }}>
          <div className="card-title" style={{ color: '#10B981' }}>🍽️ Ahara — Nutrition</div>
          <div className="form-grid2">
            <div className="form-row">
              <label className="form-label">Protein (g) · Target 80g</label>
              <input type="number" className="form-input" placeholder="80" value={form.proteinG} onChange={e => set('proteinG', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label">Fiber (g) · Target 30g</label>
              <input type="number" className="form-input" placeholder="30" value={form.fiberG} onChange={e => set('fiberG', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label">Water (L) · Target 2.5L</label>
              <input type="number" className="form-input" step="0.1" placeholder="2.5" value={form.waterL} onChange={e => set('waterL', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label">Veggies (servings) · Target 5</label>
              <input type="number" className="form-input" placeholder="5" value={form.veggieServings} onChange={e => set('veggieServings', e.target.value)} />
            </div>
          </div>
          {/* Mini target bars */}
          {[
            { l: 'Protein', v: +form.proteinG || 0, t: 80, c: '#10B981', u: 'g' },
            { l: 'Water', v: +form.waterL || 0, t: 2.5, c: '#3B82F6', u: 'L' },
          ].map(it => {
            const pct = Math.min(100, Math.round((it.v / it.t) * 100))
            return (
              <div key={it.l} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>{it.l}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 100 ? it.c : scoreColor(pct) }}>{it.v}{it.u} / {it.t}{it.u}</span>
                </div>
                <div className="prog-wrap"><div className="prog-fill" style={{ width: `${pct}%`, background: pct >= 100 ? it.c : scoreColor(pct) }} /></div>
              </div>
            )
          })}
          <div className="form-row" style={{ marginTop: 8 }}>
            <label className="form-label">CREON doses today</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
                <button key={n} onClick={() => set('creonDoses', n)} style={{ width: 34, height: 34, borderRadius: 6, border: `1px solid ${form.creonDoses === n ? '#3B82F6' : '#0D1F2D'}`, background: form.creonDoses === n ? 'rgba(59,130,246,0.15)' : '#060D1A', color: form.creonDoses === n ? '#3B82F6' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Digestion */}
        <div className="card">
          <div className="card-title">🌿 Digestion Signals</div>
          <SliderField label={`Gas level: ${form.gasLevel}/10 (lower is better)`} k="gasLevel" emoji="💨" />
          <SliderField label={`Bloating: ${form.bloating}/10 (lower is better)`} k="bloating" emoji="🫧" />
          <SliderField label={`Digestive comfort: ${form.digestComfort}/10`} k="digestComfort" emoji="✨" />
        </div>

        {/* Yoga — pillar */}
        <div className="card" style={{ borderColor: '#F59E0B20' }}>
          <div className="card-title" style={{ color: '#F59E0B' }}>🧘 Yoga & Pranayama</div>
          <div className="form-row">
            <label className="form-label">Total yoga/pranayama minutes · Target 45 mins</label>
            <input type="number" className="form-input" placeholder="45" value={form.yogaMins} onChange={e => set('yogaMins', e.target.value)} />
          </div>
          {+form.yogaMins > 0 && (
            <div className="prog-wrap" style={{ marginBottom: 10 }}>
              <div className="prog-fill" style={{ width: `${Math.min(100, (+form.yogaMins / 45) * 100)}%`, background: '#F59E0B' }} />
            </div>
          )}
          <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
              🪷 Anulom Vilom 10 min = 30% NK cell boost · Bhramari 5 min = nitric oxide x15 (anti-tumor) · Surya Namaskar = lymphatic pump
            </div>
          </div>
        </div>

        {/* Vyayama — pillar */}
        <div className="card" style={{ borderColor: '#8B5CF620' }}>
          <div className="card-title" style={{ color: '#8B5CF6' }}>💪 Vyayama — Movement</div>
          <div className="form-grid2">
            <div className="form-row">
              <label className="form-label">Steps · Target 8000</label>
              <input type="number" className="form-input" placeholder="8000" value={form.walkingSteps} onChange={e => set('walkingSteps', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label">Weight (kg)</label>
              <input type="number" className="form-input" step="0.1" placeholder="65.0" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Gym / Exercise session</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {GYM_GROUPS.map(g => (
                <button key={g} onClick={() => set('gymGroup', g)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${form.gymGroup === g ? '#8B5CF6' : '#0D1F2D'}`, background: form.gymGroup === g ? 'rgba(139,92,246,0.12)' : '#060D1A', color: form.gymGroup === g ? '#A78BFA' : '#475569', fontSize: 12, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: 'rgba(139,92,246,0.06)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.15)' }}>
            <div style={{ fontSize: 11, color: '#6D28D9', lineHeight: 1.6 }}>
              🪷 Every 1% muscle gain = 4% reduction in cancer mortality · Every 1000 steps = 8% lower recurrence risk (JAMA)
            </div>
          </div>
        </div>

        {/* Habits */}
        <div className="card">
          <div className="card-title">✅ Daily Protocol Habits</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {HABITS.map(h => {
              const done = form.habits[h]
              return (
                <div key={h} className={`habit${done ? ' done' : ''}`} onClick={() => setForm(f => ({ ...f, habits: { ...f.habits, [h]: !f.habits[h] } }))}>
                  <div className="habit-box">{done ? '✓' : ''}</div>
                  <span style={{ fontSize: 11, color: done ? '#6EE7B7' : '#334155', lineHeight: 1.3 }}>{h}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-title">📝 Symptoms & Notes</div>
          <div className="form-row">
            <label className="form-label">Any symptoms today (nausea, pain, fatigue...)</label>
            <textarea className="form-input" rows={2} placeholder="Describe any symptoms..." value={form.symptoms} onChange={e => set('symptoms', e.target.value)} style={{ resize: 'none' }} />
          </div>
          <div className="form-row">
            <label className="form-label">Notes / observations</label>
            <textarea className="form-input" rows={2} placeholder="How are you feeling overall..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'none' }} />
          </div>
        </div>
      </div>

      <button className="btn btn-green btn-full" onClick={save} disabled={saving} style={{ marginTop: 4, padding: '13px' }}>
        {saving ? <><Spin size={16} color="white" />Saving...</> : '💾 Save Today\'s Log'}
      </button>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ db, uid, setTab, allLogs, profile }) {
  const [expandedPillar, setExpandedPillar] = useState(null)
  const todayLog = db.todayLog
  const sc = scorePillars(todayLog, db.medLog)
  const logged7 = allLogs.slice(0, 7).filter(l => l && Object.keys(l).length > 2)

  const PROTOCOL = [
    '🍋 Lemon water on waking',
    '💊 CREON with first bite of every meal',
    '🌿 Ash gourd juice 200ml (morning)',
    '🌾 Amla powder 1 tsp (morning)',
    '🚶 Morning walk 30 mins — Brahma Muhurta',
    '🌬️ Pranayama 10 mins (Anulom Vilom)',
    '🥛 Protein snack mid-morning (80g protein/day)',
    '💧 2.5L water throughout the day',
    '🧘 Yoga / gym session (Phase based)',
    '🫖 Tulsi or ginger tea afternoon',
    '✨ Golden milk (haldi doodh) before bed',
    '😴 In bed by 10pm — growth hormone peaks at 11pm',
  ]

  const checks = db.todayChecks || {}
  const doneCount = Object.values(checks).filter(Boolean).length
  const [checks2, setChecks2] = useState(checks)

  async function toggle(i) {
    const n = { ...checks2, [i]: !checks2[i] }
    setChecks2(n)
    await saveDailyLog(uid, new Date().toISOString().slice(0, 10), { checks: n })
  }

  const avg7 = logged7.length ? Math.round(logged7.reduce((s, l) => s + (scorePillars(l).overall || 0), 0) / logged7.length) : 0

  return (
    <div className="fade-in">
      {/* Mission header */}
      <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', letterSpacing: -0.3 }}>REMISSION ACTIVE 🌿</div>
            <div style={{ fontSize: 12, color: '#065F46', marginTop: 2 }}>PET-CT Clear · Protocol Running · Target: CA 19-9 ~ 6 U/mL</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {profile.ca199Current && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#334155' }}>CA 19-9 Now</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: +profile.ca199Current <= 6 ? '#10B981' : +profile.ca199Current <= 37 ? '#F59E0B' : '#EF4444' }}>{profile.ca199Current}</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#334155' }}>7-Day Avg</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: avg7 > 0 ? scoreColor(avg7) : '#1E3A5F' }}>{avg7 > 0 ? avg7 : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt to log */}
      {!todayLog && (
        <div onClick={() => setTab('log')} style={{ cursor: 'pointer', padding: '14px 18px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#FCD34D' }}>Log today's data</div>
            <div style={{ fontSize: 12, color: '#78350F' }}>Food, water, yoga, gym, medicines — track your 4 pillars</div>
          </div>
          <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Log Now →</div>
        </div>
      )}

      {/* 4 Pillars */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#1E3A5F', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>The 4 Pillars of Your Recovery</div>
      <div className="pillar-grid">
        {Object.values(PILLARS).map(p => {
          const s = sc[p.id] || 0
          const isExp = expandedPillar === p.id
          return (
            <div key={p.id} className={`pillar-card${isExp ? ' active' : ''}`} style={{ '--pc': p.color }} onClick={() => setExpandedPillar(isExp ? null : p.id)}>
              <div className="pillar-top">
                <span className="pillar-emoji">{p.emoji}</span>
                <div className="pillar-info">
                  <div className="pillar-name">{p.label}</div>
                  <div className="pillar-sub">{p.sub}</div>
                </div>
                <div className="pillar-score" style={{ color: s > 0 ? scoreColor(s) : '#1E3A5F' }}>{s > 0 ? s : '—'}</div>
              </div>
              <div className="pillar-bar-wrap">
                <div className="pillar-bar" style={{ width: `${s}%`, background: s > 0 ? p.color : '#0D1F2D' }} />
              </div>
              <div className="pillar-status" style={{ color: s > 0 ? scoreColor(s) : '#1E3A5F' }}>{scoreLabel(s)}</div>
              <div style={{ fontSize: 10, color: '#1E3A5F', marginTop: 2 }}>{isExp ? 'Tap to collapse ▲' : 'Tap for details ▼'}</div>
            </div>
          )
        })}
        {/* Medicine pillar */}
        <div className="pillar-card" style={{ '--pc': '#EC4899' }}>
          <div className="pillar-top">
            <span className="pillar-emoji">💊</span>
            <div className="pillar-info">
              <div className="pillar-name">Medicine</div>
              <div className="pillar-sub">Compliance</div>
            </div>
            <div className="pillar-score" style={{ color: sc.medicine > 0 ? scoreColor(sc.medicine) : '#1E3A5F' }}>{sc.medicine > 0 ? sc.medicine : '—'}</div>
          </div>
          <div className="pillar-bar-wrap">
            <div className="pillar-bar" style={{ width: `${sc.medicine}%`, background: sc.medicine > 0 ? '#EC4899' : '#0D1F2D' }} />
          </div>
          <div className="pillar-status" style={{ color: sc.medicine > 0 ? scoreColor(sc.medicine) : '#1E3A5F' }}>{scoreLabel(sc.medicine)}</div>
          <div style={{ fontSize: 10, color: '#1E3A5F', marginTop: 2 }}>CREON + supplements</div>
        </div>
      </div>

      {/* Pillar detail */}
      {expandedPillar && <PillarDetail pillar={expandedPillar} score={sc[expandedPillar] || 0} log={todayLog} />}

      {/* Today's scores if logged */}
      {todayLog && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Today's Recovery Detail</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(sc.overall) }}>{sc.overall}/100</span>
          </div>
          <PillarBar label="🍽️ Ahara (Nutrition)" value={sc.ahara} color="#10B981" />
          <PillarBar label="💧 Jala (Hydration)" value={sc.jala} color="#3B82F6" />
          <PillarBar label="🧘 Yoga & Pranayama" value={sc.yoga} color="#F59E0B" />
          <PillarBar label="💪 Vyayama (Exercise)" value={sc.vyayama} color="#8B5CF6" />
          <PillarBar label="💊 Medicine Compliance" value={sc.medicine} color="#EC4899" />
        </div>
      )}

      {/* Protocol checklist */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Today's Protocol</div>
          <span style={{ fontSize: 12, color: '#475569' }}>{Object.values(checks2).filter(Boolean).length}/{PROTOCOL.length}</span>
        </div>
        {PROTOCOL.map((item, i) => {
          const done = checks2[i]
          return (
            <div key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 3, background: done ? 'rgba(16,185,129,0.05)' : 'transparent', transition: 'background 0.12s' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${done ? '#10B981' : '#1E293B'}`, background: done ? 'rgba(16,185,129,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 11, color: '#10B981', transition: 'all 0.12s' }}>{done ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: done ? '#4ADE8070' : '#94A3B8', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>{item}</span>
            </div>
          )
        })}
      </div>

      {/* Intolerances */}
      {(db.intolerances || []).length > 0 && (
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="card-title" style={{ color: '#F87171' }}>⚠ Your Food Intolerances (auto-tracked)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {db.intolerances.map((f, i) => (
              <span key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#F87171', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI COACH ─────────────────────────────────────────────────────────────────
function AICoach({ uid, db, userEmail, aiLoading, setAiLoading, profile }) {
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: 'Namaste. I am JARVIS — your dedicated cancer recovery intelligence.\n\nI know everything about your health:\n• Your surgery, liver treatment, and chemo history\n• Your current medicines and intolerances\n• Your 4 pillar scores and daily logs\n• Your CA 19-9 target and remission status\n\nAsk me anything. I am here 24 hours a day.'
  }])
  const [input, setInput] = useState('')
  const bottomRef = useRef()
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function buildFullContext() {
    const sc = scorePillars(db.todayLog, db.medLog)
    const meds = (db.medicines || []).map(m => `${m.name} ${m.dose} ${m.timing}`).join('; ') || 'none'
    const intols = (db.intolerances || []).join(', ') || 'none'
    const todayFoods = (db.foodLogs || []).filter(f => f.date === new Date().toLocaleDateString('en-IN')).map(f => `${f.name} (${f.verdict}, ${f.score}/10)`).join('; ') || 'none logged today'
    const symptoms = db.todayLog?.symptoms || 'none'
    const weight = db.todayLog?.weightKg ? `${db.todayLog.weightKg}kg` : 'not recorded'
    const ca199 = profile.ca199Current || 'unknown'
    const phase = profile.recoveryPhase || '1'

    return `COMPLETE PATIENT CONTEXT — Use this for every response:

DIAGNOSIS & HISTORY:
- Pancreatic cancer (tail + body) — partial pancreatectomy done
- Liver metastasis treated with radiation + ablation
- Multiple chemotherapy regimens completed
- Current status: REMISSION — PET-CT clear

CURRENT METRICS:
- CA 19-9: ${ca199} U/mL (target: ~6, normal: <37)
- Weight: ${weight}
- Recovery phase: ${phase}
- Today's overall score: ${sc.overall}/100

TODAY'S PILLAR SCORES:
- Ahara (Nutrition): ${sc.ahara}/100
- Jala (Water): ${sc.jala}/100
- Yoga/Pranayama: ${sc.yoga}/100
- Vyayama (Exercise): ${sc.vyayama}/100
- Medicine compliance: ${sc.medicine}/100

TODAY'S FOOD: ${todayFoods}
SYMPTOMS TODAY: ${symptoms}
MEDICINES TAKING: ${meds}
FOOD INTOLERANCES: ${intols}
TREATMENT GOALS: Permanent remission, CA 19-9 ~6, weight gain, fertility restoration, hair regrowth, rebuild immunity and digestion

THE 4 PILLARS (core of the app):
1. AHARA — Sattvic food, protein 80g+, no refined sugar, CREON with every meal, turmeric/amla/ash gourd juice
2. JALA — 2.5L water, lemon water morning, golden milk bedtime, ginger tea before meals
3. YOGA — Anulom Vilom 10min (NK cells +30%), Bhramari, Pawanmuktasana, Surya Namaskar
4. VYAYAMA — 8000 steps, strength training (muscle = cancer armor), phase-based exercise

Speak warmly, specifically, and always connect advice back to these 4 pillars and the cancer remission goal.`
  }

  async function send(override = null) {
    const text = override || input.trim()
    if (!text || aiLoading) return
    unlockSpeech()
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs); setInput(''); setAiLoading(true)
    await saveChat(uid, 'user', text)
    try {
      const resp = await askJarvis(newMsgs.map(m => ({ role: m.role, content: m.content })), buildFullContext(), userEmail)
      const aiMsg = { role: 'assistant', content: resp }
      setMsgs([...newMsgs, aiMsg])
      await saveChat(uid, 'assistant', resp)
      speak(resp, { max: 450 })
    } catch (e) {
      setMsgs([...newMsgs, { role: 'assistant', content: `Sorry, connection error: ${e.message}` }])
    }
    setAiLoading(false)
  }

  const quick = [
    "What should I eat right now?",
    "My CA 19-9 is still high, why?",
    "How to grow my hair back?",
    "Give me today's full plan",
    "How to increase sperm count?",
    "I feel very tired today",
    "What yoga to do for immunity?",
    "Which foods reduce CA 19-9?",
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', minHeight: 400 }}>
      <div className="chat-area" style={{ flex: 1, overflowY: 'auto' }}>
        {msgs.map((m, i) => (
          <div key={i} className={`chat-msg${m.role === 'user' ? ' user' : ''}`}>
            {m.role === 'assistant' && <div className="chat-avatar">🤖</div>}
            <div className={`chat-bubble ${m.role === 'user' ? 'user' : 'ai'}`} style={{ animation: i === msgs.length - 1 ? 'fadeIn 0.2s ease' : 'none' }}>
              {m.role === 'assistant' && <div style={{ fontSize: 10, color: '#1E3A5F', marginBottom: 4, fontWeight: 600 }}>JARVIS</div>}
              {m.content}
              {m.role === 'assistant' && (
                <button onClick={() => speak(m.content, { max: 500 })} style={{ display: 'block', marginTop: 6, padding: '3px 8px', borderRadius: 4, border: '1px solid #0D1F2D', background: 'transparent', color: '#334155', fontSize: 11, cursor: 'pointer' }}>🔊 Listen</button>
              )}
            </div>
          </div>
        ))}
        {aiLoading && (
          <div className="chat-msg">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble ai" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px' }}>
              {[0, 0.15, 0.3].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1E3A5F', animation: `pulse 1s ease ${d}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="quick-chips">
        {quick.map((q, i) => <button key={i} className="quick-chip" onClick={() => { unlockSpeech(); send(q) }}>{q}</button>)}
      </div>
      <div className="chat-input-row">
        <textarea className="chat-input" placeholder="Ask JARVIS anything about your health, food, medicines, recovery..." value={input}
          onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          onFocus={e => e.target.style.borderColor = '#3B82F6'}
          onBlur={e => e.target.style.borderColor = '#0D1F2D'} />
        <button onClick={() => send()} disabled={!input.trim() || aiLoading} className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '10px 14px', flexShrink: 0 }}>➤</button>
      </div>
    </div>
  )
}

// ─── HEALTH PROFILE TAB ───────────────────────────────────────────────────────
function ProfileTab({ uid, profile, setProfile, showToast }) {
  const [form, setForm] = useState(profile)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    await saveHealthProfile(uid, form)
    setProfile(form)
    showToast('Profile saved ✓')
    setSaving(false)
  }

  return (
    <div className="fade-in">
      <div style={{ padding: '14px 16px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#60A5FA', marginBottom: 4 }}>Why this matters</div>
        <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
          Everything you enter here is used by JARVIS in every single conversation and analysis. The more accurate your profile, the more personalized your recovery guidance. Update this whenever your status changes.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div className="card">
          <div className="card-title">Current Status</div>
          <div className="form-row">
            <label className="form-label">Current CA 19-9 (U/mL)</label>
            <input className="form-input" type="number" step="0.1" placeholder="e.g. 28" value={form.ca199Current || ''} onChange={e => set('ca199Current', e.target.value)} />
            <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>Target: ~6 · Normal: &lt;37 · Your last recorded value</div>
          </div>
          <div className="form-row">
            <label className="form-label">Current weight (kg)</label>
            <input className="form-input" type="number" step="0.1" placeholder="65.5" value={form.weightCurrent || ''} onChange={e => set('weightCurrent', e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Target weight (kg)</label>
            <input className="form-input" type="number" step="0.1" placeholder="70" value={form.weightTarget || ''} onChange={e => set('weightTarget', e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Recovery Phase</label>
            <select className="form-input" value={form.recoveryPhase || '1'} onChange={e => set('recoveryPhase', e.target.value)}>
              <option value="1">Phase 1 — Weeks 1-6 (Gentle rebuild)</option>
              <option value="2">Phase 2 — Weeks 7-16 (Building strength)</option>
              <option value="3">Phase 3 — Month 4+ (Progressive)</option>
            </select>
          </div>
          <div className="form-row">
            <label className="form-label">Last PET-CT / scan date</label>
            <input className="form-input" type="date" value={form.lastScanDate || ''} onChange={e => set('lastScanDate', e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Next oncologist appointment</label>
            <input className="form-input" type="date" value={form.nextAppointment || ''} onChange={e => set('nextAppointment', e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Medical History</div>
          <div className="form-row">
            <label className="form-label">Surgery details</label>
            <textarea className="form-input" rows={2} placeholder="Distal pancreatectomy Jan 2024..." value={form.surgeryDetails || ''} onChange={e => set('surgeryDetails', e.target.value)} style={{ resize: 'none' }} />
          </div>
          <div className="form-row">
            <label className="form-label">Chemotherapy regimens completed</label>
            <textarea className="form-input" rows={2} placeholder="FOLFIRINOX 6 cycles, Gemcitabine..." value={form.chemoHistory || ''} onChange={e => set('chemoHistory', e.target.value)} style={{ resize: 'none' }} />
          </div>
          <div className="form-row">
            <label className="form-label">Other treatments (radiation, ablation...)</label>
            <textarea className="form-input" rows={2} placeholder="Liver microwave ablation x2, SBRT..." value={form.otherTreatments || ''} onChange={e => set('otherTreatments', e.target.value)} style={{ resize: 'none' }} />
          </div>
          <div className="form-row">
            <label className="form-label">Known allergies</label>
            <input className="form-input" placeholder="Penicillin, sulfa drugs..." value={form.allergies || ''} onChange={e => set('allergies', e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Recovery Goals</div>
          <div className="form-row">
            <label className="form-label">CA 19-9 target (U/mL)</label>
            <input className="form-input" type="number" placeholder="6" value={form.ca199Target || ''} onChange={e => set('ca199Target', e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Fertility goals</label>
            <select className="form-input" value={form.fertilityGoal || ''} onChange={e => set('fertilityGoal', e.target.value)}>
              <option value="">Not a current goal</option>
              <option value="trying">Actively trying to conceive</option>
              <option value="future">Planning for future</option>
              <option value="monitoring">Monitoring sperm health</option>
            </select>
          </div>
          <div className="form-row">
            <label className="form-label">Additional personal goals</label>
            <textarea className="form-input" rows={3} placeholder="Hair regrowth, weight gain to 72kg, run 5km, return to work..." value={form.personalGoals || ''} onChange={e => set('personalGoals', e.target.value)} style={{ resize: 'none' }} />
          </div>
          <div className="form-row">
            <label className="form-label">Oncologist / Doctor name & contact</label>
            <input className="form-input" placeholder="Dr. Sharma — Apollo Hospital Bengaluru" value={form.doctorName || ''} onChange={e => set('doctorName', e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Any other notes for JARVIS to know</label>
            <textarea className="form-input" rows={3} placeholder="Anything else important about your case, preferences, concerns..." value={form.extraNotes || ''} onChange={e => set('extraNotes', e.target.value)} style={{ resize: 'none' }} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-full" onClick={save} disabled={saving} style={{ marginTop: 4, padding: '12px' }}>
        {saving ? <><Spin size={16} color="white" />Saving...</> : '💾 Save Health Profile'}
      </button>
    </div>
  )
}

// ─── TRACK TAB (simplified progress view) ─────────────────────────────────────
function TrackTab({ allLogs }) {
  const [period, setPeriod] = useState(7)
  const days = useMemo(() => {
    const today = new Date(); const result = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const log = allLogs.find(l => l.date === dateStr) || null
      const sc = scorePillars(log)
      result.push({
        dateStr, isToday: i === 0,
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateNum: d.getDate(),
        month: d.toLocaleDateString('en-IN', { month: 'short' }),
        log, ...sc
      })
    }
    return result
  }, [allLogs, period])

  const logged = days.filter(d => d.log)
  if (logged.length === 0) return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[7, 15, 30].map(p => <button key={p} className={`btn btn-sm btn-outline${period === p ? ' btn-primary' : ''}`} onClick={() => setPeriod(p)} style={period === p ? { background: 'rgba(59,130,246,0.15)', borderColor: '#3B82F6', color: '#60A5FA' } : {}}>{p} Days</button>)}
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No data yet</div>
        <div style={{ fontSize: 13, color: '#1E3A5F' }}>Start logging daily to see your 4 pillar progress over time</div>
      </div>
    </div>
  )

  const avg = k => Math.round(logged.reduce((s, d) => s + (d[k] || 0), 0) / logged.length)
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].log && days[i].overall >= 40) streak++; else break }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        {[7, 15, 30].map(p => <button key={p} className="btn btn-sm btn-outline" onClick={() => setPeriod(p)} style={period === p ? { background: 'rgba(59,130,246,0.15)', borderColor: '#3B82F6', color: '#60A5FA' } : {}}>{p} Days</button>)}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>🔥 {streak} day streak</span>
      </div>

      {/* Summary */}
      <div className="stats-row" style={{ marginBottom: 14 }}>
        {[
          { l: 'Overall', v: avg('overall'), c: scoreColor(avg('overall')) },
          { l: '🍽️ Ahara', v: avg('ahara'), c: '#10B981' },
          { l: '💧 Jala', v: avg('jala'), c: '#3B82F6' },
          { l: '🧘 Yoga', v: avg('yoga'), c: '#F59E0B' },
          { l: '💪 Vyayama', v: avg('vyayama'), c: '#8B5CF6' },
        ].map(s => (
          <div className="stat" key={s.l}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{ color: s.v > 0 ? s.c : '#1E3A5F', fontSize: 20 }}>{s.v > 0 ? s.v : '—'}</div>
            <div className="prog-wrap" style={{ marginTop: 5 }}><div className="prog-fill" style={{ width: `${s.v}%`, background: s.v > 0 ? s.c : '#0D1F2D' }} /></div>
          </div>
        ))}
      </div>

      {/* Day rows */}
      <div className="card">
        <div className="card-title">Day by Day</div>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 40px', alignItems: 'center', gap: '6px 10px', marginBottom: 6, fontSize: 10, fontWeight: 600, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <span>Date</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            <span>🍽️</span><span>💧</span><span>🧘</span><span>💪</span>
          </div>
          <span style={{ textAlign: 'right' }}>Score</span>
        </div>
        {days.map(day => (
          <div key={day.dateStr} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 40px', alignItems: 'center', gap: '4px 10px', padding: '7px 0', borderBottom: '1px solid #060D1A', opacity: day.log ? 1 : 0.3 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: day.isToday ? '#3B82F6' : '#334155' }}>{day.day}</div>
              <div style={{ fontSize: 12, color: day.isToday ? '#60A5FA' : '#475569' }}>{day.dateNum} {day.month}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[{ k: 'ahara', c: '#10B981' }, { k: 'jala', c: '#3B82F6' }, { k: 'yoga', c: '#F59E0B' }, { k: 'vyayama', c: '#8B5CF6' }].map(p => (
                <div key={p.k}>
                  <div className="prog-wrap" style={{ height: 5, marginBottom: 2 }}>
                    {day.log && <div className="prog-fill" style={{ width: `${day[p.k] || 0}%`, background: p.c }} />}
                  </div>
                  <div style={{ fontSize: 9, color: day.log ? p.c : '#0D1F2D' }}>{day.log ? day[p.k] : '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              {day.log
                ? <span style={{ fontSize: 15, fontWeight: 700, color: scoreColor(day.overall) }}>{day.overall}</span>
                : <span style={{ fontSize: 12, color: '#0D1F2D' }}>—</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Goal hits */}
      <div className="card">
        <div className="card-title">Target Achievement ({logged.length} days logged)</div>
        {[
          { l: 'Protein ≥ 80g/day (Mamsa Dhatu rebuild)', n: logged.filter(d => (+d.log?.proteinG || 0) >= 80).length },
          { l: 'Water ≥ 2.5L/day (liver flush)', n: logged.filter(d => (+d.log?.waterL || 0) >= 2.5).length },
          { l: 'Yoga ≥ 30 mins (NK cells +30%)', n: logged.filter(d => (+d.log?.yogaMins || 0) >= 30).length },
          { l: 'Steps ≥ 8000 (recurrence -8% per 1000)', n: logged.filter(d => (+d.log?.walkingSteps || 0) >= 8000).length },
          { l: 'Sleep ≥ 7h (growth hormone + tumor suppressor)', n: logged.filter(d => (+d.log?.sleepH || 0) >= 7).length },
          { l: 'CREON ≥ 3 doses (enzyme compliance)', n: logged.filter(d => (+d.log?.creonDoses || 0) >= 3).length },
        ].map((g, i) => {
          const pct = Math.round((g.n / Math.max(1, logged.length)) * 100)
          return (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{g.l}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(pct) }}>{g.n}/{logged.length}</span>
              </div>
              <div className="prog-wrap"><div className="prog-fill" style={{ width: `${pct}%`, background: scoreColor(pct) }} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── BLOOD + HEALING + FITNESS tabs (compact versions) ────────────────────────
function BloodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [mode, setMode] = useState('manual')
  const [text, setText] = useState('')
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [result, setResult] = useState(null); const fileRef = useRef()

  function context() {
    const meds = (db.medicines || []).map(m => m.name).join(', ') || 'none'
    return `Patient: Pancreatic cancer (tail+body removed), liver metastasis treated, chemo complete, in REMISSION. Current medicines: ${meds}. CA 19-9 target: ~6 U/mL. Had partial pancreatectomy so blood sugar regulation affected. Liver had radiation + ablation so LFT is important. Chemo history so CBC and immunity markers matter.`
  }

  async function analyze() {
    unlockSpeech(); setAiLoading(true); setResult(null)
    try {
      const msgs = mode === 'manual'
        ? [{ role: 'user', content: `${context()}\n\nAnalyze my blood report:\n${text}\n\nGive complete analysis: SUMMARY, KEY MARKERS (with status: low/normal/high and what it means for me), CA 19-9 (critical — my target is ~6), LIVER HEALTH (had radiation+ablation), BLOOD SUGAR (partial pancreatectomy — critical), IMMUNITY (post-chemo), URGENT ACTIONS (anything needs doctor attention), DIETARY CHANGES (specific foods to add/remove), WHAT'S IMPROVING, ENCOURAGING NOTE.` }]
        : [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgData } }, { type: 'text', text: `${context()}\n\nAnalyze this blood report. Cover: SUMMARY, KEY MARKERS, CA 19-9, LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY CHANGES, ENCOURAGING NOTE.` }] }]
      const resp = await askJarvis(msgs, '', userEmail)
      const entry = { id: Date.now(), date: new Date().toLocaleDateString('en-IN'), summary: resp.slice(0, 200), full: resp }
      await saveBloodReport(uid, entry)
      setDb(prev => ({ ...prev, bloodReports: [entry, ...(prev.bloodReports || [])] }))
      setResult(entry)
      speak('Blood report analyzed. ' + entry.summary, { max: 300 })
    } catch (e) { setResult({ full: 'Error: ' + e.message, summary: 'Error' }) }
    setAiLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">Analyze Blood Report</div>
        <div className="tabs">
          <button className={`tab-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>✏️ Type values</button>
          <button className={`tab-btn${mode === 'photo' ? ' active' : ''}`} onClick={() => setMode('photo')}>📷 Upload photo</button>
        </div>
        {mode === 'manual' ? (
          <>
            <div className="form-row">
              <label className="form-label">Enter all lab values (one per line)</label>
              <textarea className="form-input" rows={10} value={text} onChange={e => setText(e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace' }}
                placeholder={'CA 19-9: 28 U/mL\nHbA1c: 6.2%\nFasting Glucose: 105 mg/dL\nVitamin D: 22 ng/mL\nHemoglobin: 11.5 g/dL\nWBC: 6.2 x10³/µL\nALT: 38 U/L\nAST: 32 U/L\nTotal Bilirubin: 0.8 mg/dL\n...'} />
            </div>
            <button className="btn btn-primary btn-full" onClick={analyze} disabled={!text.trim() || aiLoading}>
              {aiLoading ? <><Spin size={16} color="white" />Analyzing...</> : 'Analyze Report'}
            </button>
          </>
        ) : (
          <>
            <div className={`upload-zone${img ? ' filled' : ''}`} onClick={() => !img && fileRef.current.click()}>
              {img ? <img src={img} alt="report" style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
                : (<><div style={{ fontSize: 32, marginBottom: 8 }}>📋</div><div style={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>Upload blood test report</div><div style={{ fontSize: 12, color: '#1E3A5F', marginTop: 3 }}>Photo or scan — auto-compressed</div></>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files[0]; if (!f) return; setImg(URL.createObjectURL(f)); setImgData(await imgToBase64(f)) }} />
            <div className="upload-btns">
              <label className="upload-btn-label">📷 Camera<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { const f = e.target.files[0]; if (!f) return; setImg(URL.createObjectURL(f)); setImgData(await imgToBase64(f)) }} /></label>
              <label className="upload-btn-label">🖼 Gallery<input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files[0]; if (!f) return; setImg(URL.createObjectURL(f)); setImgData(await imgToBase64(f)) }} /></label>
            </div>
            {img && <button className="btn btn-primary btn-full" style={{ marginTop: 10 }} onClick={analyze} disabled={!imgData || aiLoading}>{aiLoading ? <><Spin size={16} color="white" />Analyzing...</> : 'Analyze Report'}</button>}
          </>
        )}
      </div>
      {result && (
        <div className="card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Analysis — {result.date}</div>
            <button onClick={() => speak(result.full, { max: 500 })} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #0D1F2D', background: 'transparent', color: '#475569', fontSize: 12, cursor: 'pointer' }}>🔊</button>
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.full}</div>
          <div style={{ marginTop: 12, padding: '9px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: '#FCD34D' }}>⚠ Share with your oncologist for medical decisions.</div>
        </div>
      )}
      {(db.bloodReports || []).length > 0 && (
        <div className="card">
          <div className="card-title">History</div>
          {(db.bloodReports || []).slice(0, 4).map(r => (
            <div key={r.id} style={{ padding: '9px 0', borderBottom: '1px solid #0D1F2D' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8B5CF6', marginBottom: 3 }}>{r.date}</div>
              <div style={{ fontSize: 12, color: '#334155' }}>{r.summary?.slice(0, 130)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FitTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading, profile }) {
  const [type, setType] = useState('yoga'); const [phase, setPhase] = useState(profile.recoveryPhase || '1')
  const [plan, setPlan] = useState(null); const saved = (db.fitnessPlans || {})[type + phase]

  async function gen() {
    unlockSpeech(); setAiLoading(true); setPlan(null)
    try {
      const resp = await askJarvis([{ role: 'user', content: `Generate a Phase ${phase} ${type === 'yoga' ? 'Yoga and Pranayama' : 'Strength Training'} protocol for cancer recovery. Patient: partial pancreatectomy, liver ablation, chemo done, in remission. Phase 1=Weeks 1-6 gentle, Phase 2=Weeks 7-16 moderate, Phase 3=Month 4+ progressive. Be specific: exercises, sets, reps, durations, Ayurvedic rationale, safety rules, connection to cancer recovery goals.` }], '', userEmail)
      await savePlan(uid, type + phase, resp)
      setDb(prev => ({ ...prev, fitnessPlans: { ...(prev.fitnessPlans || {}), [type + phase]: resp } }))
      setPlan(resp)
      speak(`Phase ${phase} ${type} protocol ready. ` + resp.slice(0, 150), { max: 200 })
    } catch (e) { setPlan('Error: ' + e.message) }
    setAiLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="tabs"><button className={`tab-btn${type === 'yoga' ? ' active' : ''}`} onClick={() => { setType('yoga'); setPlan(null) }}>🧘 Yoga & Pranayama</button><button className={`tab-btn${type === 'gym' ? ' active' : ''}`} onClick={() => { setType('gym'); setPlan(null) }}>💪 Strength Training</button></div>
        <div className="form-row">
          <label className="form-label">Recovery phase</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['1', 'Week 1-6\nGentle'], ['2', 'Week 7-16\nBuilding'], ['3', 'Month 4+\nProgressive']].map(([p, l]) => (
              <button key={p} onClick={() => { setPhase(p); setPlan(null) }} style={{ flex: 1, padding: '10px 6px', borderRadius: 8, border: `1px solid ${phase === p ? '#3B82F6' : '#0D1F2D'}`, background: phase === p ? 'rgba(59,130,246,0.1)' : '#060D1A', color: phase === p ? '#60A5FA' : '#475569', fontSize: 11, fontWeight: 500, whiteSpace: 'pre-line', lineHeight: 1.4, cursor: 'pointer' }}>Phase {p}{'\n'}{l.split('\n')[1]}</button>
            ))}
          </div>
        </div>
        <button className={`btn btn-full${type === 'yoga' ? ' btn-green' : ' btn-primary'}`} onClick={gen} disabled={aiLoading}>
          {aiLoading ? <><Spin size={16} color="white" />Generating...</> : `Generate Phase ${phase} ${type === 'yoga' ? 'Yoga' : 'Gym'} Plan`}
        </button>
      </div>
      {(plan || saved) && (
        <div className="card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>{type === 'yoga' ? 'Yoga' : 'Gym'} — Phase {phase}</div>
            <button onClick={() => speak((plan || saved), { max: 400 })} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #0D1F2D', background: 'transparent', color: '#475569', fontSize: 12, cursor: 'pointer' }}>🔊</button>
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{plan || saved}</div>
        </div>
      )}
      <div className="card" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="card-title" style={{ color: '#F87171' }}>⚠ Safety Rules</div>
        {['Never exercise on empty stomach — blood sugar drops with partial pancreas', 'Stop immediately if chest pain, sharp abdominal pain, or dizziness', 'Take protein within 30 minutes post-workout — muscle synthesis window', 'Avoid heavy ab exercises (Phases 1 and 2) — post-surgical', 'Hydrate 500ml water before, during, and after every session'].map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
            <span style={{ color: '#EF4444', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const HEAL_TOPICS = [
  { id: 'sperm', icon: '🌱', label: 'Sperm & Fertility', color: '#3B82F6', desc: 'Complete post-chemo fertility restoration' },
  { id: 'hair', icon: '✨', label: 'Hair Regrowth', color: '#F59E0B', desc: 'Month-by-month hair recovery' },
  { id: 'eyebrow', icon: '👁️', label: 'Eyebrow & Lashes', color: '#8B5CF6', desc: 'Facial hair restoration protocol' },
  { id: 'appearance', icon: '🌟', label: 'Look Normal Again', color: '#10B981', desc: 'Full appearance recovery guide' },
  { id: 'complete', icon: '🏆', label: 'Full Recovery Map', color: '#EF4444', desc: 'Complete roadmap to disease-free life' },
  { id: 'immunity', icon: '🛡️', label: 'Rebuild Immunity', color: '#3B82F6', desc: 'Post-chemo immune reconstruction' },
  { id: 'energy', icon: '⚡', label: 'Natural Energy', color: '#F59E0B', desc: 'End fatigue, rebuild vitality' },
  { id: 'digestion', icon: '🌿', label: 'Fix Digestion', color: '#10B981', desc: 'PERT + gut healing protocol' },
  { id: 'ca199', icon: '🎯', label: 'Reduce CA 19-9', color: '#EC4899', desc: 'Specific protocol to bring CA 19-9 to ~6' },
  { id: 'weight', icon: '⚖️', label: 'Gain Weight', color: '#F59E0B', desc: 'Safe muscle and weight gain plan' },
]
const HEAL_PROMPTS = {
  sperm: 'Complete sperm count recovery and fertility restoration after chemotherapy. Exact supplement doses, timeline, foods that increase sperm quality, lifestyle changes, tests to track, realistic timeline to conceive.',
  hair: 'Complete hair regrowth protocol post-chemotherapy. Month-by-month timeline, scalp care, oils and massage technique, supplements with exact doses, foods, what to expect.',
  eyebrow: 'Complete eyebrow and eyelash regrowth after chemo. Castor oil protocol, serums (Latisse, Vegamour), massage, supplements, realistic timeline.',
  appearance: 'Complete guide to looking and feeling completely normal after cancer — weight gain plan, skin restoration, hair, posture, energy, confidence rebuilding step by step.',
  complete: 'The complete roadmap to being fully disease-free and living vibrantly for 100 years. Every phase, key milestones, longevity habits, mental recovery, preventing recurrence, thriving as a survivor.',
  immunity: 'Complete post-chemotherapy immunity reconstruction. Specific foods (amount and timing), supplements (with exact doses), sleep protocol, exercise for immunity, lab markers to track monthly.',
  energy: 'Complete natural energy restoration after chemo — no steroid dependency. Adrenal recovery, mitochondrial healing (CoQ10, etc), blood sugar stability, sleep architecture, step by step energy rebuild.',
  digestion: 'Complete gut healing after partial pancreatectomy and chemotherapy. PERT enzyme optimization (timing, doses, adjusting), gut lining repair, microbiome rebuilding, specific foods for pancreatic recovery.',
  ca199: 'Specific actionable protocol to reduce CA 19-9 from current level to ~6 U/mL. The 4 levers: blood sugar control, liver support, inflammation reduction, gut microbiome — exact actions for each with timeline.',
  weight: 'Safe weight gain plan after cancer — specifically gaining lean muscle, not fat. Calorie targets, protein timing, specific foods, supplement protocol, exercise approach by phase.',
}

function HealTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [topic, setTopic] = useState(null); const [result, setResult] = useState(null)
  async function get(t) {
    setTopic(t); if (db.recoveryGuides?.[t]) { setResult(db.recoveryGuides[t]); return }
    unlockSpeech(); setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{ role: 'user', content: `For a pancreatic cancer patient in remission (surgery + liver ablation + chemo complete): ${HEAL_PROMPTS[t]} Be specific, actionable, evidence-based. Connect everything to the 4 pillars: Ahara, Jala, Yoga, Vyayama.` }], '', userEmail)
      await saveGuide(uid, t, resp)
      setDb(prev => ({ ...prev, recoveryGuides: { ...(prev.recoveryGuides || {}), [t]: resp } }))
      setResult(resp)
      speak(resp.slice(0, 200), { max: 250 })
    } catch (e) { setResult('Error: ' + e.message) }
    setAiLoading(false)
  }
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8, marginBottom: 14 }}>
        {HEAL_TOPICS.map(t => (
          <button key={t.id} onClick={() => get(t.id)} style={{ padding: '13px 11px', borderRadius: 10, border: `1px solid ${topic === t.id ? t.color + '40' : '#0D1F2D'}`, background: topic === t.id ? `${t.color}0D` : '#0A1628', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: topic === t.id ? t.color : '#64748B', marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 10, color: '#1E3A5F' }}>{t.desc}</div>
            {db.recoveryGuides?.[t.id] && <div style={{ marginTop: 4, fontSize: 9, color: '#10B981', fontWeight: 600 }}>✓ Saved</div>}
          </button>
        ))}
      </div>
      {aiLoading && <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#475569' }}><Spin />Generating your personalized guide...</div>}
      {result && topic && (
        <div className="card fade-in" style={{ border: `1px solid ${HEAL_TOPICS.find(t => t.id === topic)?.color || '#1E293B'}22` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0, color: HEAL_TOPICS.find(t => t.id === topic)?.color }}>{HEAL_TOPICS.find(t => t.id === topic)?.label}</div>
            <button onClick={() => speak(result, { max: 500 })} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #0D1F2D', background: 'transparent', color: '#475569', fontSize: 12, cursor: 'pointer' }}>🔊</button>
          </div>
          <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function JarvisHealth({ user, onLogout }) {
  const uid = user.uid; const userEmail = user.email
  const [tab, setTab] = useState('home')
  const [db, setDb] = useState({})
  const [allLogs, setAllLogs] = useState([])
  const [profile, setProfile] = useState({})
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [listening, setListeningState] = useState(false)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const [food, blood, guides, plans, chat, intols, daily, meds, medlog, prof] = await Promise.all([
        getFoodLogs(uid), getBloodReports(uid), getGuides(uid), getPlans(uid),
        getChat(uid), getIntolerances(uid), getDailyLog(uid, today),
        getMedicines(uid), getMedLog(uid, today), getHealthProfile(uid)
      ])
      // Load 30 days of logs
      const logPromises = []
      for (let i = 1; i <= 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        logPromises.push(getDailyLog(uid, dateStr).then(l => ({ ...l, date: dateStr })))
      }
      const pastLogs = (await Promise.all(logPromises)).filter(l => l && Object.keys(l).length > 3)
      const todayLog = daily && Object.keys(daily).length > 3 ? { ...daily, date: today } : null
      setAllLogs(todayLog ? [todayLog, ...pastLogs] : pastLogs)
      setDb({ foodLogs: food, bloodReports: blood, recoveryGuides: guides, fitnessPlans: plans, intolerances: intols, todayChecks: daily?.checks || {}, todayLog, medicines: meds, medLog: { ...medlog, date: today } })
      setProfile(prof || {})
      setReady(true)
    }
    load().catch(e => { console.error(e); setReady(true) })
  }, [uid])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Voice
  const recRef = useRef(null)
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR(); rec.continuous = false; rec.interimResults = false; rec.lang = 'en-IN'
    rec.onresult = e => {
      const text = e.results[0][0].transcript.toLowerCase().trim()
      setVoiceText(text); setTimeout(() => setVoiceText(''), 5000)
      for (const [phrase, t] of Object.entries(VOICE_COMMANDS)) {
        if (text.includes(phrase)) { setTab(t); speak(`Opening ${t}.`, { max: 50 }); return }
      }
      // Send to AI coach
      setTab('ai')
    }
    rec.onend = () => setListeningState(false)
    rec.onerror = () => setListeningState(false)
    recRef.current = rec
  }, [])

  function toggleVoice() {
    unlockSpeech()
    if (!recRef.current) return
    if (listening) { try { recRef.current.stop() } catch {} setListeningState(false) }
    else { try { recRef.current.start(); setListeningState(true) } catch {} }
  }

  function dbUpdater(d) {
    setDb(d)
    const today = new Date().toISOString().slice(0, 10)
    if (d.todayLog) setAllLogs(prev => [{ ...d.todayLog, date: today }, ...prev.filter(l => l.date !== today)])
  }

  const shared = { uid, db, setDb: dbUpdater, userEmail, aiLoading, setAiLoading, showToast, profile }

  const NAV_ITEMS = [
    { section: 'Overview' },
    { id: 'home', label: 'Dashboard', icon: I.home, badge: !db.todayLog },
    { id: 'log', label: 'Daily Log', icon: I.log, badge: !db.todayLog },
    { id: 'track', label: 'Progress', icon: I.track },
    { section: 'Health' },
    { id: 'food', label: 'Food Tracker', icon: I.food },
    { id: 'meds', label: 'Medicines', icon: I.meds },
    { id: 'blood', label: 'Lab Reports', icon: I.blood },
    { section: 'Recovery' },
    { id: 'yoga', label: 'Fitness Plans', icon: I.yoga },
    { id: 'heal', label: 'Recovery Guides', icon: I.heal },
    { id: 'ai', label: 'AI Coach', icon: I.ai },
    { id: 'profile', label: 'My Profile', icon: I.profile },
  ]
  const MOB_NAV = [
    { id: 'home', label: 'Home', icon: I.home, badge: !db.todayLog },
    { id: 'log', label: 'Log', icon: I.log, badge: !db.todayLog },
    { id: 'food', label: 'Food', icon: I.food },
    { id: 'meds', label: 'Meds', icon: I.meds },
    { id: 'ai', label: 'JARVIS', icon: I.ai },
  ]

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#060D1A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <style>{CSS}</style>
      <Spin size={24} /><span style={{ fontSize: 13, color: '#1E3A5F' }}>Loading JARVIS...</span>
    </div>
  )

  const PAGE_TITLES = { home: 'Dashboard', log: 'Daily Log', track: 'Progress', food: 'Food Tracker', meds: 'Medicines', blood: 'Lab Reports', yoga: 'Fitness Plans', heal: 'Recovery Guides', ai: 'AI Coach', profile: 'My Profile' }

  return (
    <div className="shell">
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo">
            <div className="sb-icon">🌱</div>
            <div><div className="sb-name">JARVIS Health</div><div className="sb-tag">Cancer Recovery AI</div></div>
          </div>
          <div className="sb-status"><div className="sb-dot pulse" /><span>Remission Active</span></div>
        </div>
        {NAV_ITEMS.map((item, i) => item.section
          ? <div key={i} className="sec-label">{item.section}</div>
          : (
            <a key={item.id} className={`nav-item${tab === item.id ? ' active' : ''}`} href="#" onClick={e => { e.preventDefault(); setTab(item.id) }}>
              {item.icon}<span>{item.label}</span>
              {item.badge && <span className="nav-badge" />}
            </a>
          )
        )}
        <div className="sb-footer">
          <div className="sb-metric"><span className="sb-metric-label">CA 19-9 goal</span><span className="sb-metric-val" style={{ color: '#F59E0B' }}>~6 U/mL</span></div>
          {profile.ca199Current && <div className="sb-metric"><span className="sb-metric-label">Current</span><span className="sb-metric-val" style={{ color: +profile.ca199Current <= 6 ? '#10B981' : '#F59E0B' }}>{profile.ca199Current}</span></div>}
          <div className="sb-metric"><span className="sb-metric-label">Data</span><span className="sb-metric-val">Mumbai 🇮🇳</span></div>
          <button className="btn btn-outline btn-sm btn-full" style={{ marginTop: 8 }} onClick={onLogout}>Sign Out</button>
        </div>
      </nav>

      {/* MAIN */}
      <div className="main">
        {/* Top bar */}
        <div className="topbar">
          <div className={`reactor${listening ? ' active' : ''}`} onClick={toggleVoice} title={listening ? 'Stop listening' : 'Tap to speak to JARVIS'}>
            {listening && <div className="reactor-ripple" />}
            <div className="reactor-ring" />
            <div className={`reactor-core${listening ? ' active' : ''}`}>{listening ? '🎙️' : '🎤'}</div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', fontSize: 13 }}>
            {listening ? <span style={{ color: '#3B82F6', fontWeight: 500 }}>● Listening... say "log today", "scan food", "show progress"</span>
              : voiceText ? <span style={{ color: '#475569' }}>"{voiceText}"</span>
              : <span style={{ color: '#1E3A5F' }}>Tap mic to talk · Say "what to eat", "log today", "scan food"...</span>}
          </div>
          <button onClick={stopSpeaking} title="Stop speaking" style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #0D1F2D', background: 'transparent', color: '#334155', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>⏹</button>
          {!db.todayLog && <button className="btn btn-primary btn-sm" onClick={() => setTab('log')} style={{ flexShrink: 0 }}>Log Today</button>}
        </div>

        {/* Page */}
        <div className="page">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: -0.3 }}>{PAGE_TITLES[tab]}</div>
          </div>
          {tab === 'home'    && <Dashboard {...shared} setTab={setTab} allLogs={allLogs} />}
          {tab === 'log'     && <LogTab {...shared} />}
          {tab === 'track'   && <TrackTab allLogs={allLogs} />}
          {tab === 'food'    && <FoodTab {...shared} />}
          {tab === 'meds'    && <MedTab {...shared} />}
          {tab === 'blood'   && <BloodTab {...shared} />}
          {tab === 'yoga'    && <FitTab {...shared} />}
          {tab === 'heal'    && <HealTab {...shared} />}
          {tab === 'ai'      && <AICoach uid={uid} db={db} userEmail={userEmail} aiLoading={aiLoading} setAiLoading={setAiLoading} profile={profile} />}
          {tab === 'profile' && <ProfileTab uid={uid} profile={profile} setProfile={setProfile} showToast={showToast} />}
        </div>
      </div>

      {/* MOBILE NAV */}
      <nav className="mob-nav">
        {MOB_NAV.map(t => (
          <button key={t.id} className={`mob-nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)} style={{ position: 'relative' }}>
            {t.icon}
            <span>{t.label}</span>
            {t.badge && <span className="mob-badge" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
