import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  getFoodLogs, saveFoodLog, getBloodReports, saveBloodReport,
  getMedicines, saveMedicine, deleteMedicine, getMedLog, saveMedLog,
  getHealthProfile, saveHealthProfile,
  getGuides, saveGuide, getPlans, savePlan,
  getChat, saveChat, getIntolerances, saveIntolerance,
  getDailyLog, saveDailyLog,
} from './firebase'
import { askJarvis, imgToBase64, speak, stopSpeaking, unlockSpeech } from './api'

// ─── COMPLETE MEDICAL PROTOCOL (the core knowledge base) ─────────────────────
const PROTOCOL_KNOWLEDGE = `
RECOVERY & REMISSION PROTOCOL — COMPLETE MEDICAL BLUEPRINT

PATIENT PROFILE:
- Pancreatic cancer (tail + body) — distal pancreatectomy completed
- Liver metastasis treated with radiation + ablation
- Multiple chemotherapy regimens completed (platinum-based + others)
- Status: REMISSION — PET-CT CLEAR
- CA 19-9 target: ~6 U/mL (clinical normal <37)
- Must take PERT (pancreatic enzyme replacement) with EVERY meal/snack — non-negotiable

PILLAR 1 — NUTRITION (Ahara):
- 5-6 small meals daily (NOT 3 large meals)
- PERT enzymes with first bite of every meal/snack containing fat or protein — NEVER skip
- Protein: 1.2-1.5g per kg body weight per day
- Start low-medium fat; increase gradually as tolerance builds
- Eat within 1 hour of waking; never empty stomach
- Chew 20-30 times per bite
- Room temperature or warm food only (cold food stresses recovering gut)

DAILY SCHEDULE:
6:30am: Warm lemon water + pinch turmeric + pinch black pepper + 1 tsp amla juice
7:30am: Breakfast + PERT enzymes (2 eggs + whole grain toast + soaked almonds OR moong dal cheela + curd)
10:30am: Mid-morning protein snack + PERT (whey protein smoothie OR Greek yogurt + walnuts)
1pm: Lunch + PERT (largest meal — protein + 1-2 rotis OR ½ cup rice + soft cooked veg + ½ tsp ghee + curd)
4pm: Evening snack + PERT (roasted chana OR makhana OR fruit)
7pm: Dinner + PERT (lighter — khichdi with ghee OR soft dal + roti + cooked veg)
9:30pm: Golden milk (haldi doodh — 1 cup warm milk + ½ tsp turmeric + black pepper + cinnamon + honey)

BEST FOODS:
- Liver healers: Beetroot, amla, lemon, garlic, turmeric
- Gut healers: Curd, moong dal, soft cooked veg, banana, buttermilk
- Immunity: Amla, tulsi, ginger, haldi, mushrooms
- Muscle: Eggs, fish (rohu, pomfret), paneer, dal, Greek yogurt, chicken (stewed)
- Anti-cancer: Broccoli (soft cooked), berries, walnuts, flaxseed, green tea
- Weight gain: Ghee, soaked dates, banana, sweet potato, peanut butter, full-fat curd

STRICTLY AVOID:
- Raw salads (large quantities — hard to digest)
- Fried/oily/spicy food
- Refined sugar, maida, processed food
- Cold drinks, fruit juices (spike blood sugar)
- Alcohol (liver had radiation — zero tolerance)
- Red meat (beef, pork)
- Very sour foods in excess (tamarind, raw mango)

PILLAR 2 — SUPPLEMENTATION:
Morning with breakfast: Vitamin D3 + K2, Omega-3 (2-3g EPA+DHA), B-complex (methylated), Zinc (15-25mg)
Mid-morning: CoQ10 (200mg) — mitochondrial energy + post-chemo fatigue
Lunch: Berberine (500mg) — blood sugar control, anti-cancer mTOR inhibition; Milk Thistle (200-400mg) — liver regeneration
Evening: Quercetin (500mg) — anti-inflammatory, anti-proliferative
Dinner: Ashwagandha KSM-66 (600mg) — cortisol, energy, fertility; NAC (600mg) — glutathione + liver
Bedtime: Probiotic (Lactobacillus rhamnosus GG + Bifidobacterium longum); Melatonin (10-20mg) — anti-tumor + sleep; Magnesium glycinate — sleep + bowel
Also: Modified Citrus Pectin 5g 3x/day (galectin-3 binding, anti-metastatic)

PILLAR 3 — EXERCISE (Vyayama):
PHASE 1 (Weeks 1-6): 20-30 min daily walk + gentle yoga + wall push-ups/chair squats/resistance bands (3x/week) + Pranayama 10 min daily
PHASE 2 (Weeks 7-16): 30-45 min walk + bodyweight strength 3x/week (push-ups, squats, glute bridges, plank) → progress to 2-5kg dumbbells
PHASE 3 (Month 4+): 45 min cardio + 4x/week gym (Push/Pull/Legs/Rest split), 5-10kg weights, swimming
CRITICAL: Never exercise on empty stomach (blood sugar drops). Protein within 30 min post-workout. Stop if chest pain/sharp abdominal pain/dizziness. Avoid heavy ab exercises Phase 1-2. 8000 steps/day target.
SCIENCE: Every 1000 steps = 8% cancer recurrence reduction (JAMA). Muscle mass = cancer armor. Exercise increases NK cell activity (cancer surveillance).

PILLAR 4 — SLEEP & STRESS (Yoga):
- 7.5-8.5 hours sleep — CELLULAR REPAIR AND IMMUNE RECONSTITUTION happen during sleep
- Sleep before 10pm — growth hormone peaks 11pm, p53 tumor suppressor gene activates during deep sleep
- Pranayama: Anulom Vilom 10 min (NK cells +30%), Bhramari 5 min (nitric oxide x15 — anti-tumor), Belly breathing 2 min
- Cortisol management: Ashwagandha + consistent sleep schedule
- Avoid blue light after 9pm — melatonin is anti-tumor
- Meditation or 10 min quiet sitting daily
- Yoga 1-2 sessions/week: twists (digestion), hip openers, chest expansion

PILLAR 5 — MONITORING:
- CA 19-9: Every 6-8 weeks → target ~6, monitor trend not single values
- CEA: Same frequency
- PET-CT/CT: Every 3-6 months
- LFT (liver): Every 6-8 weeks (had radiation)
- Vitamin D, B12, Zinc: Every 3 months → optimize not just "normal"
- Fasting glucose: Monthly → target 80-90 mg/dL (cancer cells are glucose-hungry)
- HbA1c: Every 3 months → target <5.5% (pancreatectomy affects glucose regulation)
- Hormonal panel (FSH, LH, testosterone if male): Every 3 months for fertility tracking

PILLAR 6 — ANTI-RECURRENCE:
- Low sugar/low glycemic diet — insulin spikes feed cancer metabolism
- Intermittent fasting 14:10 window — only after weight is stabilized
- 20 min sun daily — natural Vitamin D
- Maintain BMI 22-24 (underweight = as risky as overweight now)
- Zero alcohol, no smoking
- Strong social/spiritual support — stress biology impacts immunity directly
- Weekly weight gain target: 0.3-0.5 kg/week (slow and sustainable)

CA 19-9 REDUCTION STRATEGY (5 Layers):
Layer 1 — Blood Sugar (MOST CRITICAL — 40% impact):
  Eliminate refined sugar completely. Low glycemic diet. Eat protein+fat BEFORE carbs at each meal.
  Cinnamon ½ tsp/day + Berberine 500mg before meals. Fasting glucose target 80-90. HbA1c target <5.5%.
Layer 2 — Liver Support (25% impact):
  Milk thistle 200-400mg/day. NAC 600mg/day. TUDCA (ask hepatologist). Amla 2 tsp/day.
  2.5-3L water/day. No alcohol/excess paracetamol. LFT every 6-8 weeks.
Layer 3 — Gut Inflammation (reduction):
  Probiotic: Lactobacillus rhamnosus GG + Bifidobacterium longum at night.
  L-Glutamine 5g/day on empty stomach (heals leaky gut from chemo).
  Slippery elm or aloe vera (inner leaf). NO NSAIDs.
Layer 4 — Anti-inflammatory Stack:
  Turmeric + black pepper in golden milk nightly. Omega-3 2-3g/day. Fresh ginger daily.
  Resveratrol 150-250mg/day. Green tea 2 cups/day. Avoid seed oils, processed food, sugar.
Layer 5 — Evidence-Based Anti-Cancer Agents (discuss with oncologist):
  Vitamin D3 4000-5000 IU/day. Melatonin 10-20mg at night. Modified Citrus Pectin 5g 3x/day.
  Quercetin 500mg/day. Berberine 500mg 2x/day.

FERTILITY RECOVERY (Male):
Tests now: Semen analysis, FSH+LH+Testosterone, Prolactin, Thyroid
Supplements: CoQ10 400-600mg/day (most evidence-backed for post-chemo fertility), Ashwagandha KSM-66 600mg/day (increases sperm count+motility), L-Carnitine 2g/day (sperm energy), Zinc 15-25mg, Omega-3 2g, Selenium 100-200mcg, Vitamin E 200-400 IU
Lifestyle: Sleep 8h (growth hormone repairs gonads), avoid heat/hot tubs, every 2-3 days ejaculation frequency, cold showers
Timeline: Sperm regeneration = 74 days. Month 6-12 = significant recovery window.

WEEKLY MASTER SCHEDULE:
Mon/Wed/Fri: Morning walk + Strength training A (Push) + Pranayama
Tue/Thu: Morning walk + Strength training B (Pull/Legs) + Pranayama  
Sat: Yoga session 45 min + Pranayama
Sun: Rest / gentle walk only

MONITORING DASHBOARD (monthly):
Weight, Energy 1-10, Bowel regularity, Sleep quality, Hair regrowth
Labs: CA 19-9, Fasting glucose, Vitamin D, LFT, Hormonal panel
Fitness: Walk distance, Strength vs last month
Nutrition: Avg protein/day, Enzyme compliance /10, Sugar-free days

WEEK 1-4 PRIORITIES (start here):
1. Enzyme compliance at EVERY meal
2. Morning walk daily (non-negotiable)
3. Protein at every meal
4. Sleep by 10pm
5. Golden milk at night
6. Lemon water on waking
`

// ─── SCORING ──────────────────────────────────────────────────────────────────
function scoreColor(n) {
  if (n >= 80) return '#10B981'
  if (n >= 60) return '#0EA5E9'
  if (n >= 40) return '#F59E0B'
  return '#EF4444'
}
function scoreLabel(n) {
  if (n >= 80) return 'Excellent'
  if (n >= 60) return 'Good'
  if (n >= 40) return 'Fair'
  if (n > 0) return 'Needs work'
  return 'Not logged'
}
function scorePillars(log, medLog = {}) {
  if (!log) return { ahara: 0, jala: 0, yoga: 0, vyayama: 0, medicine: 0, overall: 0 }
  const p = +log.proteinG || 0, w = +log.waterL || 0, f = +log.fiberG || 0, v = +log.veggieServings || 0
  const ym = +log.yogaMins || 0, st = +log.walkingSteps || 0
  const hasGym = log.gymGroup && log.gymGroup !== 'None today'
  const creon = +log.creonDoses || 0
  const ahara   = Math.min(100, Math.round((p/80*35)+(w/2.5*25)+(f/30*20)+(v/5*20)))
  const jala    = Math.min(100, Math.round(w/2.5*100))
  const yoga    = Math.min(100, Math.round(ym/45*100))
  const vyayama = Math.min(100, Math.round((st/8000*60)+(hasGym?40:0)))
  const creonSc = Math.min(100, Math.round(creon/3*100))
  const medDone = Object.values(medLog.taken||{}).filter(Boolean).length
  const medTotal = Math.max(1, Object.keys(medLog.taken||{}).length)
  const medicine = Math.round(creonSc*0.6 + (medDone/medTotal*100*0.4))
  const overall = Math.round(ahara*0.25+jala*0.15+yoga*0.25+vyayama*0.20+medicine*0.15)
  return { ahara, jala, yoga, vyayama, medicine, overall }
}

// ─── CSS (clean light medical UI) ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;-webkit-text-size-adjust:100%}
body{background:#EEF2F7;color:#0F172A;font-family:'DM Sans',system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:2px}
input,textarea,select,button{font-family:inherit}
input::placeholder,textarea::placeholder{color:#94A3B8}

/* FIX: number inputs — use text+inputMode for iOS first-tap fix */
input[type=text]{-webkit-appearance:none;appearance:none}
select option{background:white}
textarea{resize:none}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes ripple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.6);opacity:0}}
.fade-up{animation:fadeUp 0.22s ease forwards}
.pulse{animation:pulse 2s ease infinite}

/* ── App shell ── */
.shell{display:flex;min-height:100vh}
.sidebar{width:224px;flex-shrink:0;background:white;border-right:1px solid #E8EEF4;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto}
.main{margin-left:224px;flex:1;display:flex;flex-direction:column;min-height:100vh}
.topbar{height:56px;background:white;border-bottom:1px solid #E8EEF4;padding:0 22px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:50;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.page{padding:22px;max-width:1080px;flex:1}

/* ── Sidebar ── */
.sb-brand{padding:18px 18px 14px;border-bottom:1px solid #F1F5F9}
.sb-logo-row{display:flex;align-items:center;gap:10px}
.sb-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10B981,#0EA5E9);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 3px 10px rgba(16,185,129,0.25)}
.sb-name{font-size:15px;font-weight:800;color:#0F172A;letter-spacing:-0.3px}
.sb-sub{font-size:10px;color:#94A3B8;margin-top:1px;font-weight:500}
.sb-status{display:flex;align-items:center;gap:6px;margin-top:10px;padding:7px 10px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:7px;font-size:11px;font-weight:600;color:#059669}
.sb-dot{width:6px;height:6px;border-radius:50%;background:#10B981;flex-shrink:0}
.sec-lbl{padding:14px 18px 4px;font-size:10px;font-weight:700;letter-spacing:0.8px;color:#94A3B8;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;font-size:13px;font-weight:500;color:#64748B;border-radius:9px;margin:1px 7px;transition:all 0.12s;text-decoration:none}
.nav-item:hover{background:#F8FAFC;color:#0F172A}
.nav-item.active{background:#EFF6FF;color:#0EA5E9;font-weight:600}
.nav-item svg{width:16px;height:16px;flex-shrink:0}
.nav-badge{width:7px;height:7px;border-radius:50%;background:#F59E0B;margin-left:auto;flex-shrink:0}
.sb-footer{margin-top:auto;padding:14px 18px;border-top:1px solid #F1F5F9}
.sb-ca199{background:#EFF6FF;border-radius:10px;padding:10px 12px;margin-bottom:10px}
.sb-ca199-lbl{font-size:10px;font-weight:700;color:#0EA5E9;letter-spacing:0.5px;margin-bottom:2px}
.sb-ca199-val{font-size:22px;font-weight:800;color:#0EA5E9;letter-spacing:-0.5px}

/* ── Cards ── */
.card{background:white;border:1px solid #E8EEF4;border-radius:14px;padding:20px;margin-bottom:14px;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.card-sm{padding:14px 16px}
.card-title{font-size:11px;font-weight:700;letter-spacing:0.6px;color:#64748B;text-transform:uppercase;margin-bottom:15px}
.card-h{font-size:16px;font-weight:700;color:#0F172A;margin-bottom:3px}

/* ── Stats ── */
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px}
.stat{background:white;border:1px solid #E8EEF4;border-radius:12px;padding:14px;text-align:center;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.stat-val{font-size:26px;font-weight:800;margin:3px 0 2px;letter-spacing:-1px}
.stat-lbl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px}
.stat-sub{font-size:11px;color:#94A3B8;margin-top:2px}

/* ── Pillar cards ── */
.pillar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:10px;margin-bottom:18px}
.pillar-card{background:white;border:1.5px solid #E8EEF4;border-radius:13px;padding:15px;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.pillar-card:hover{box-shadow:0 4px 14px rgba(15,23,42,0.09);transform:translateY(-1px)}
.pillar-card.open{border-color:var(--pc,#0EA5E9);box-shadow:0 0 0 3px color-mix(in srgb, var(--pc,#0EA5E9) 12%, transparent)}
.pillar-top{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.pillar-emoji{font-size:22px;line-height:1}
.pillar-name{font-size:13px;font-weight:700;color:#0F172A}
.pillar-sub{font-size:11px;color:#94A3B8;margin-top:1px}
.pillar-score{font-size:24px;font-weight:800;margin-left:auto}
.pillar-bar-bg{height:5px;background:#F1F5F9;border-radius:3px;overflow:hidden;margin-bottom:7px}
.pillar-bar-fill{height:100%;border-radius:3px;transition:width 0.9s ease}
.pillar-status{font-size:11px;font-weight:600}

/* ── Progress ── */
.prog{height:5px;background:#F1F5F9;border-radius:3px;overflow:hidden}
.prog-fill{height:100%;border-radius:3px;transition:width 0.8s ease}
.prog-lg{height:8px}
.prog-sm{height:3px}

/* ── Forms ── */
.fg{margin-bottom:14px}
.fl{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;letter-spacing:0.1px}
.fh{font-size:11px;color:#94A3B8;margin-top:4px}
.fi{width:100%;padding:10px 13px;background:white;border:1.5px solid #E2E8F0;border-radius:9px;color:#0F172A;font-size:14px;outline:none;transition:border-color 0.15s,box-shadow 0.15s;-webkit-appearance:none;appearance:none}
.fi:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
.fi::placeholder{color:#94A3B8}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.sl-row{display:flex;align-items:center;gap:12px}
.sl{flex:1;-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;outline:none;cursor:pointer}
.sl::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.18)}
.sl-v{min-width:32px;text-align:right;font-size:14px;font-weight:700;color:#0F172A}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:9px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.13s;-webkit-tap-highlight-color:transparent}
.btn-pr{background:#0EA5E9;color:white}.btn-pr:hover{background:#0284C7}.btn-pr:disabled{background:#E2E8F0;color:#94A3B8;cursor:not-allowed}
.btn-gr{background:#10B981;color:white}.btn-gr:hover{background:#059669}.btn-gr:disabled{background:#E2E8F0;color:#94A3B8;cursor:not-allowed}
.btn-ou{background:transparent;color:#64748B;border:1.5px solid #E2E8F0}.btn-ou:hover{background:#F8FAFC;color:#0F172A;border-color:#CBD5E1}
.btn-gh{background:transparent;color:#64748B;border:none}.btn-gh:hover{background:#F1F5F9}
.btn-full{width:100%}
.btn-sm{padding:7px 12px;font-size:12px;border-radius:7px}
.btn-xs{padding:4px 10px;font-size:11px;border-radius:6px}

/* ── Tabs ── */
.tabs{display:flex;gap:0;border-bottom:1.5px solid #E8EEF4;margin-bottom:17px}
.tab{padding:9px 15px;background:none;border:none;font-size:13px;font-weight:500;color:#94A3B8;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1.5px;transition:all 0.12s}
.tab.on{color:#0EA5E9;border-bottom-color:#0EA5E9;font-weight:600}
.tab:hover:not(.on){color:#64748B}

/* ── Upload ── */
.upload-z{border:2px dashed #E2E8F0;border-radius:12px;padding:28px 16px;text-align:center;cursor:pointer;transition:all 0.15s;background:#F8FAFC}
.upload-z:hover,.upload-z:active{border-color:#0EA5E9;background:#EFF6FF}
.upload-z.has-img{padding:0;overflow:hidden;border-style:solid;border-color:#E2E8F0}
.upload-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.upload-lbl{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:9px;border:1.5px solid #E2E8F0;background:white;color:#64748B;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.12s}
.upload-lbl:hover{border-color:#0EA5E9;color:#0EA5E9;background:#EFF6FF}

/* ── Food list ── */
.food-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid #F1F5F9}
.food-badge{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}

/* ── Medicine ── */
.med-row{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:10px;border:1.5px solid #E8EEF4;background:white;margin-bottom:7px;transition:all 0.12s}
.med-row.taken{background:#F0FDF4;border-color:#BBF7D0}
.med-chk{width:22px;height:22px;border-radius:6px;border:2px solid #E2E8F0;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:11px;color:#10B981;transition:all 0.12s}
.med-row.taken .med-chk{background:#10B981;border-color:#10B981;color:white}

/* ── Habit ── */
.habit-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:8px;border:1.5px solid #E8EEF4;background:white;cursor:pointer;transition:all 0.12s}
.habit-row.done{background:#F0FDF4;border-color:#BBF7D0}
.habit-chk{width:16px;height:16px;border-radius:4px;border:1.5px solid #E2E8F0;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;color:#10B981;transition:all 0.12s}
.habit-row.done .habit-chk{background:#10B981;border-color:#10B981;color:white}

/* ── Chat ── */
.chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 100px);min-height:400px}
.chat-msgs{flex:1;overflow-y:auto;padding:4px 0 10px;display:flex;flex-direction:column;gap:10px}
.chat-row{display:flex;gap:8px;align-items:flex-end}
.chat-row.user{flex-direction:row-reverse}
.chat-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#0EA5E9,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.bubble{max-width:78%;padding:11px 15px;font-size:13px;line-height:1.68;white-space:pre-wrap}
.bubble.ai{background:white;border:1px solid #E8EEF4;border-radius:14px 14px 14px 3px;color:#0F172A;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.bubble.user{background:#0EA5E9;color:white;border-radius:14px 14px 3px 14px}
.chat-chips{display:flex;gap:6px;overflow-x:auto;padding:7px 0 4px;scrollbar-width:none}
.chip{flex-shrink:0;padding:6px 12px;border-radius:20px;border:1.5px solid #E2E8F0;background:white;color:#64748B;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all 0.12s}
.chip:hover,.chip:active{border-color:#0EA5E9;color:#0EA5E9;background:#EFF6FF}
.chat-in-row{display:flex;gap:8px;padding-top:8px;border-top:1px solid #F1F5F9;margin-top:4px}
.chat-in{flex:1;background:white;border:1.5px solid #E2E8F0;border-radius:11px;padding:10px 14px;color:#0F172A;font-size:14px;outline:none;line-height:1.4;transition:border-color 0.15s;min-height:42px;max-height:100px;-webkit-appearance:none}
.chat-in:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}

/* ── Toast ── */
.toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#0F172A;color:white;padding:8px 18px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(15,23,42,0.2);pointer-events:none;animation:fadeUp 0.2s ease}

/* ── Voice ── */
.voice-btn{position:relative;width:38px;height:38px;border-radius:50%;border:1.5px solid #E2E8F0;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all 0.15s;flex-shrink:0;box-shadow:0 1px 4px rgba(15,23,42,0.06)}
.voice-btn.active{background:#0EA5E9;border-color:#0EA5E9;box-shadow:0 0 0 4px rgba(14,165,233,0.18)}
.voice-rip{position:absolute;inset:-5px;border-radius:50%;border:2px solid #0EA5E9;animation:ripple 1.5s ease infinite}

/* ── Day row (tracker) ── */
.day-row{display:grid;grid-template-columns:58px 1fr 42px;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid #F8FAFC}
.day-row.no-data{opacity:0.3}

/* ── Heal topic btn ── */
.heal-btn{padding:14px 12px;border-radius:12px;border:1.5px solid #E8EEF4;background:white;cursor:pointer;text-align:left;transition:all 0.15s;box-shadow:0 1px 3px rgba(15,23,42,0.04)}
.heal-btn:hover{box-shadow:0 3px 10px rgba(15,23,42,0.08);transform:translateY(-1px)}
.heal-btn.sel{border-color:var(--hc,#0EA5E9);background:color-mix(in srgb, var(--hc,#0EA5E9) 8%, white)}

/* ── Mobile ── */
@media(max-width:768px){
  .sidebar{display:none}
  .main{margin-left:0}
  .page{padding:12px 12px 86px}
  .topbar{padding:0 12px}
  .stats-row{grid-template-columns:repeat(2,1fr);gap:8px}
  .g2{grid-template-columns:1fr}
  .g3{grid-template-columns:1fr 1fr}
  .pillar-grid{grid-template-columns:1fr 1fr;gap:8px}
  .card{padding:15px;border-radius:12px}
  .mob-nav{position:fixed;bottom:0;left:0;right:0;background:white;border-top:1px solid #E8EEF4;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,6px);box-shadow:0 -2px 12px rgba(15,23,42,0.07)}
  .mob-ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px 5px;cursor:pointer;border:none;background:none;color:#94A3B8;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;transition:color 0.12s;-webkit-tap-highlight-color:transparent;position:relative}
  .mob-ni.on{color:#0EA5E9}
  .mob-ni svg{width:21px;height:21px}
  .mob-badge{position:absolute;top:5px;right:calc(50% - 16px);width:7px;height:7px;border-radius:50%;background:#F59E0B}
}
@media(min-width:769px){.mob-nav{display:none}}
`

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spin({ size = 18, color = '#0EA5E9' }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}22`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
}

function PBar({ value, color, height = 5 }) {
  return (
    <div className="prog" style={{ height }}>
      <div className="prog-fill" style={{ width: `${Math.min(100, value)}%`, background: value > 0 ? color : '#E2E8F0' }} />
    </div>
  )
}

function MetricRow({ label, value, target, unit, color }) {
  const pct = Math.min(100, Math.round((+value || 0) / target * 100))
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: pct > 0 ? (pct >= 100 ? color : scoreColor(pct)) : '#CBD5E1' }}>
          {(+value || 0)}{unit} <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: 11 }}>/ {target}{unit}</span>
        </span>
      </div>
      <PBar value={pct} color={color} />
    </div>
  )
}

// Number input: FIXED — uses text+inputMode to avoid iOS double-tap bug
function NumInput({ label, hint, value, onChange, placeholder, unit }) {
  return (
    <div className="fg">
      {label && <label className="fl">{label}{unit && <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 4 }}>{unit}</span>}</label>}
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9.]*"
        className="fi"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => {
          const v = e.target.value
          if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v)
        }}
        onFocus={e => e.target.select()}
      />
      {hint && <div className="fh">{hint}</div>}
    </div>
  )
}
// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = {
  home:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  log:   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  track: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  food:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3" strokeWidth={2}/></svg>,
  meds:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>,
  blood: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>,
  fit:   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  heal:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
  ai:    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  user:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
}

const NAV = [
  { s: 'Overview' },
  { id:'home',  label:'Dashboard',    icon:I.home,  badge:false },
  { id:'log',   label:'Daily Log',    icon:I.log,   badge:true  },
  { id:'track', label:'Progress',     icon:I.track             },
  { s: 'Health Tracking' },
  { id:'food',  label:'Food Tracker', icon:I.food              },
  { id:'meds',  label:'Medicines',    icon:I.meds              },
  { id:'blood', label:'Lab Reports',  icon:I.blood             },
  { s: 'Recovery' },
  { id:'fit',   label:'Fitness Plans',icon:I.fit               },
  { id:'heal',  label:'Recovery Guides',icon:I.heal            },
  { id:'ai',    label:'JARVIS AI',    icon:I.ai                },
  { id:'prof',  label:'My Profile',   icon:I.user              },
]

const MOB = [
  { id:'home', label:'Home',  icon:I.home, badge:true },
  { id:'log',  label:'Log',   icon:I.log,  badge:true },
  { id:'food', label:'Food',  icon:I.food },
  { id:'meds', label:'Meds',  icon:I.meds },
  { id:'ai',   label:'JARVIS',icon:I.ai   },
]

// ─── DAILY LOG TAB ─────────────────────────────────────────────────────────────
const GYM_GROUPS = ['None today','Chest','Back','Legs','Shoulders','Arms','Full body','Cardio']
const HABITS = [
  'Lemon water on waking','CREON with every meal','Ash gourd juice 200ml',
  'Amla powder 1 tsp','Tulsi / ginger tea','Golden milk before bed',
  'No refined sugar','No fried food','In bed by 10pm',
  'Pranayama 10 min','Morning walk done','Protein at every meal',
]

function LogTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0, 10)
  const ex = db.todayLog || {}
  const [f, sf] = useState({
    sleepH:'', energyAM:5, energyPM:5, waterL:'', proteinG:'', fiberG:'',
    veggieServings:'', creonDoses:3, gasLevel:0, bloating:0, digestComfort:5,
    yogaMins:'', walkingSteps:'', weightKg:'', gymGroup:'None today',
    symptoms:'', notes:'', habits:{}, ...ex
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => sf(p => ({ ...p, [k]: v }))
  const sc = scorePillars(f, db.medLog)

  async function save() {
    setSaving(true)
    const log = { ...f, date: today, ...sc }
    await saveDailyLog(uid, today, log)
    setDb(p => ({ ...p, todayLog: log }))
    showToast('Log saved ✓')
    setSaving(false)
  }

  function Slider({ label, k, min = 0, max = 10, color }) {
    const v = +f[k] || 0
    const pct = ((v - min) / (max - min)) * 100
    const c = color || scoreColor(pct)
    return (
      <div className="fg">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label className="fl" style={{ marginBottom: 0 }}>{label}</label>
          <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
        </div>
        <input type="range" className="sl" min={min} max={max} step={1} value={v}
          onChange={e => set(k, +e.target.value)}
          style={{ background: `linear-gradient(to right,${c} ${pct}%,#E2E8F0 ${pct}%)` }}
          onInput={e => { e.target.style.background = `linear-gradient(to right,${c} ${(+e.target.value - min) / (max - min) * 100}%,#E2E8F0 ${(+e.target.value - min) / (max - min) * 100}%)` }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>0</span>
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>{max}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-up">
      {/* Live scores */}
      <div className="stats-row" style={{ marginBottom: 18 }}>
        {[
          {l:'🍽️ Ahara', v:sc.ahara,   c:'#10B981'},
          {l:'💧 Jala',  v:sc.jala,    c:'#0EA5E9'},
          {l:'🧘 Yoga',  v:sc.yoga,    c:'#F59E0B'},
          {l:'💪 Move',  v:sc.vyayama, c:'#8B5CF6'},
          {l:'💊 Meds',  v:sc.medicine,c:'#EC4899'},
          {l:'⭐ Total', v:sc.overall, c:scoreColor(sc.overall)},
        ].map(s => (
          <div key={s.l} className="stat" style={{ borderTop: `3px solid ${s.v > 0 ? s.c : '#E2E8F0'}` }}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{ color: s.v > 0 ? s.c : '#CBD5E1', fontSize: 22 }}>{s.v > 0 ? s.v : '—'}</div>
            <PBar value={s.v} color={s.c} height={3} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Sleep & Energy */}
        <div className="card">
          <div className="card-title">😴 Sleep & Energy</div>
          <NumInput label="Sleep hours" value={f.sleepH} onChange={v => set('sleepH', v)} placeholder="7.5" unit="hrs" hint="Target: 7.5–8.5 hours — cellular repair happens during sleep" />
          <Slider label={`Morning energy — ${f.energyAM}/10`} k="energyAM" />
          <Slider label={`Evening energy — ${f.energyPM}/10`} k="energyPM" />
        </div>

        {/* Nutrition */}
        <div className="card" style={{ borderTop: '3px solid #10B981' }}>
          <div className="card-title" style={{ color: '#059669' }}>🍽️ Ahara — Nutrition</div>
          <div className="g2">
            <NumInput label="Protein" value={f.proteinG} onChange={v => set('proteinG', v)} placeholder="80" unit="g" />
            <NumInput label="Fiber" value={f.fiberG} onChange={v => set('fiberG', v)} placeholder="30" unit="g" />
            <NumInput label="Water" value={f.waterL} onChange={v => set('waterL', v)} placeholder="2.5" unit="L" />
            <NumInput label="Veggies" value={f.veggieServings} onChange={v => set('veggieServings', v)} placeholder="5" unit="servings" />
          </div>
          <MetricRow label="Protein vs target" value={f.proteinG} target={80} unit="g" color="#10B981" />
          <MetricRow label="Water vs target" value={f.waterL} target={2.5} unit="L" color="#0EA5E9" />
          <div className="fg" style={{ marginTop: 8 }}>
            <label className="fl">CREON doses today <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Critical — with every meal)</span></label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[0,1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => set('creonDoses', n)} style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${f.creonDoses === n ? '#0EA5E9' : '#E2E8F0'}`, background: f.creonDoses === n ? '#EFF6FF' : 'white', color: f.creonDoses === n ? '#0EA5E9' : '#64748B', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Digestion */}
        <div className="card">
          <div className="card-title">🌿 Digestion</div>
          <Slider label={`Gas level — ${f.gasLevel}/10 (lower = better)`} k="gasLevel" color="#EF4444" />
          <Slider label={`Bloating — ${f.bloating}/10 (lower = better)`} k="bloating" color="#F59E0B" />
          <Slider label={`Digestive comfort — ${f.digestComfort}/10`} k="digestComfort" color="#10B981" />
        </div>

        {/* Yoga */}
        <div className="card" style={{ borderTop: '3px solid #F59E0B' }}>
          <div className="card-title" style={{ color: '#B45309' }}>🧘 Yoga & Pranayama</div>
          <NumInput label="Total yoga + pranayama" value={f.yogaMins} onChange={v => set('yogaMins', v)} placeholder="45" unit="mins" hint="Target: 45 mins — Anulom Vilom 10 min = NK cells +30%" />
          {(+f.yogaMins || 0) > 0 && <PBar value={Math.min(100, (+f.yogaMins || 0) / 45 * 100)} color="#F59E0B" height={6} />}
          <div style={{ marginTop: 10, padding: '9px 11px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
            💡 Anulom Vilom 10 min → NK cells +30% · Bhramari 5 min → nitric oxide ×15 (anti-tumor)
          </div>
        </div>

        {/* Vyayama */}
        <div className="card" style={{ borderTop: '3px solid #8B5CF6' }}>
          <div className="card-title" style={{ color: '#7C3AED' }}>💪 Vyayama — Movement</div>
          <div className="g2">
            <NumInput label="Steps" value={f.walkingSteps} onChange={v => set('walkingSteps', v)} placeholder="8000" hint="Target: 8000/day" />
            <NumInput label="Weight" value={f.weightKg} onChange={v => set('weightKg', v)} placeholder="65.0" unit="kg" />
          </div>
          <div className="fg">
            <label className="fl">Gym / exercise session</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {GYM_GROUPS.map(g => (
                <button key={g} onClick={() => set('gymGroup', g)} style={{ padding: '6px 12px', borderRadius: 7, border: `1.5px solid ${f.gymGroup === g ? '#8B5CF6' : '#E2E8F0'}`, background: f.gymGroup === g ? '#EDE9FE' : 'white', color: f.gymGroup === g ? '#7C3AED' : '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '9px 11px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE', fontSize: 12, color: '#6D28D9', lineHeight: 1.6 }}>
            💡 Every 1000 steps = 8% recurrence reduction · 1% muscle = 4% lower cancer mortality
          </div>
        </div>

        {/* Habits */}
        <div className="card">
          <div className="card-title">✅ Daily Protocol</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {HABITS.map(h => {
              const done = f.habits[h]
              return (
                <div key={h} className={`habit-row${done ? ' done' : ''}`} onClick={() => sf(p => ({ ...p, habits: { ...p.habits, [h]: !p.habits[h] } }))}>
                  <div className="habit-chk">{done ? '✓' : ''}</div>
                  <span style={{ fontSize: 11, color: done ? '#059669' : '#64748B', lineHeight: 1.3 }}>{h}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-title">📝 Symptoms & Notes</div>
          <div className="fg">
            <label className="fl">Symptoms today</label>
            <textarea className="fi" rows={2} placeholder="Nausea, fatigue, pain, bloating..." value={f.symptoms} onChange={e => set('symptoms', e.target.value)} style={{ height: 68 }} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">Notes / observations</label>
            <textarea className="fi" rows={2} placeholder="How are you feeling overall..." value={f.notes} onChange={e => set('notes', e.target.value)} style={{ height: 68 }} />
          </div>
        </div>
      </div>

      <button className="btn btn-gr btn-full" style={{ marginTop: 6, padding: '13px', fontSize: 14 }} onClick={save} disabled={saving}>
        {saving ? <><Spin size={16} color="white" />Saving...</> : '💾 Save Today\'s Log'}
      </button>
    </div>
  )
}
// ─── FOOD TAB ─────────────────────────────────────────────────────────────────
const MEAL_TYPES = ['Breakfast','Mid-morning snack','Lunch','Evening snack','Dinner','Bedtime']

function FoodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading, showToast, profile }) {
  const [mode, setMode] = useState('photo')
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [imgErr, setImgErr] = useState('')
  const [result, setResult] = useState(null)
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [manualUnit, setManualUnit] = useState('g')
  const [manualNotes, setManualNotes] = useState('')
  const [mealType, setMealType] = useState('Lunch')
  const fileRef = useRef()
  const todayStr = new Date().toLocaleDateString('en-IN')
  const todayFoods = (db.foodLogs || []).filter(f => f.date === todayStr)

  function ctx() {
    const meds = (db.medicines || []).map(m => m.name).join(', ') || 'none'
    const intols = (db.intolerances || []).join(', ') || 'none'
    const ca199 = profile.ca199Current || 'not recorded'
    return `PATIENT: Pancreatic cancer (distal pancreatectomy), liver ablation+radiation, chemo complete, REMISSION. CA 19-9: ${ca199} U/mL target ~6. Current medicines: ${meds}. Food intolerances: ${intols}. Must take CREON (PERT enzymes) with every meal containing fat/protein. Low glycemic diet critical — no refined sugar. Sattvic diet. Today's meals so far: ${todayFoods.map(f=>f.name||'meal').join(', ') || 'none yet'}.`
  }

  async function handleFile(file) {
    if (!file) return
    setImgErr(''); setResult(null); setImgData(null)
    setImg(URL.createObjectURL(file))
    try { setImgData(await imgToBase64(file)) }
    catch (e) { setImgErr('Could not process image. Try another photo.'); setImg(null) }
  }

  async function analyzePhoto() {
    if (!imgData || aiLoading) return
    unlockSpeech(); setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgData } },
        { type: 'text', text: `${ctx()}\n\nAnalyze this meal photo for my cancer recovery (${mealType}).\n\nReply exactly:\nMEAL NAME: [what you see]\nVERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]\nSCORE: [1-10]\nPROTEIN EST: [Xg]\nCARBS EST: [Xg]\nFAT EST: [Xg]\nBENEFITS: [recovery benefits]\nCONCERNS: [any issues for my recovery]\nCREON NEEDED: [YES / MODERATE / NO]\nIMPROVE: [one specific suggestion]\nINTOLERANCE FLAG: [problem foods or NONE]\nAYURVEDA: [Sattvic/Rajasic/Tamasic and brief reason]` }
      ]}], '', userEmail)
      await processResult(resp)
    } catch (e) { setResult({ error: e.message }) }
    setAiLoading(false)
  }

  async function analyzeManual() {
    if (!manualName.trim() || aiLoading) return
    unlockSpeech(); setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{ role: 'user', content: `${ctx()}\n\nI just ate: ${manualName}${manualQty ? ` (${manualQty} ${manualUnit})` : ''} — ${mealType}${manualNotes ? `. ${manualNotes}` : ''}\n\nAnalyze for my cancer recovery:\nMEAL NAME: ${manualName}\nVERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]\nSCORE: [1-10]\nPROTEIN EST: [Xg]\nCARBS EST: [Xg]\nFAT EST: [Xg]\nBENEFITS: [recovery benefits]\nCONCERNS: [any issues]\nCREON NEEDED: [YES / MODERATE / NO]\nIMPROVE: [one suggestion]\nINTOLERANCE FLAG: [problem foods or NONE]\nAYURVEDA: [brief assessment]` }], '', userEmail)
      await processResult(resp)
      setManualName(''); setManualQty(''); setManualNotes('')
    } catch (e) { setResult({ error: e.message }) }
    setAiLoading(false)
  }

  async function processResult(resp) {
    const verdict = resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase() || 'acceptable'
    const score = parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1] || '5')
    const name = resp.match(/MEAL NAME:\s*([^\n]+)/i)?.[1]?.trim() || manualName || 'Meal'
    const fMatch = resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
    const flagged = fMatch && fMatch[1].trim().toUpperCase() !== 'NONE' ? fMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
    const entry = { id: Date.now(), date: new Date().toLocaleDateString('en-IN'), time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), mealType, name, verdict, score, analysis: resp, flagged }
    await saveFoodLog(uid, entry)
    for (const fl of flagged) await saveIntolerance(uid, fl)
    setDb(p => ({ ...p, foodLogs: [entry, ...(p.foodLogs || [])].slice(0, 100), intolerances: [...new Set([...(p.intolerances || []), ...flagged])] }))
    setResult(entry)
    const msg = verdict === 'optimal' ? `Excellent. ${name}. Score ${score} out of 10. Great recovery food.` : verdict === 'acceptable' ? `Acceptable meal. ${name}. Score ${score}. ${resp.match(/CONCERNS:\s*([^\n]+)/i)?.[1] || ''}` : `Advise against. ${name}. Score only ${score}. ${resp.match(/CONCERNS:\s*([^\n]+)/i)?.[1] || ''}`
    speak(msg, { max: 220 })
    if (flagged.length) showToast('⚠ Intolerance: ' + flagged.join(', '))
  }

  const vC = { optimal: '#10B981', acceptable: '#F59E0B', inadvisable: '#EF4444' }
  const vI = { optimal: '✓', acceptable: '!', inadvisable: '✕' }
  const vBg = { optimal: '#F0FDF4', acceptable: '#FFFBEB', inadvisable: '#FEF2F2' }

  return (
    <div className="fade-up">
      {/* Today's meals */}
      {todayFoods.length > 0 && (
        <div className="card">
          <div className="card-title">Today's Food Log</div>
          {todayFoods.map(f => (
            <div key={f.id} className="food-row">
              <div className="food-badge" style={{ background: vBg[f.verdict] || '#FFFBEB', color: vC[f.verdict] || '#F59E0B' }}>{vI[f.verdict] || '!'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{f.mealType} · {f.time || f.date}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: vC[f.verdict] || '#F59E0B' }}>{f.score}/10</div>
            </div>
          ))}
        </div>
      )}

      {/* Add food */}
      <div className="card">
        <div className="card-title">Log a Meal</div>
        {/* Meal type */}
        <div className="fg">
          <label className="fl">Meal type</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {MEAL_TYPES.map(m => (
              <button key={m} onClick={() => setMealType(m)} style={{ padding: '5px 11px', borderRadius: 7, border: `1.5px solid ${mealType === m ? '#0EA5E9' : '#E2E8F0'}`, background: mealType === m ? '#EFF6FF' : 'white', color: mealType === m ? '#0EA5E9' : '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{m}</button>
            ))}
          </div>
        </div>
        {/* Mode tabs */}
        <div className="tabs">
          <button className={`tab${mode === 'photo' ? ' on' : ''}`} onClick={() => setMode('photo')}>📷 Photo</button>
          <button className={`tab${mode === 'manual' ? ' on' : ''}`} onClick={() => setMode('manual')}>✏️ Type food name</button>
        </div>

        {mode === 'photo' ? (
          <>
            <div className={`upload-z${img ? ' has-img' : ''}`} onClick={() => !img && fileRef.current.click()}>
              {img ? <img src={img} alt="meal" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                : (<><div style={{ fontSize: 36, marginBottom: 8 }}>📷</div><div style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>Photograph your meal</div><div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Any size — auto-compressed to 5MB</div></>)}
            </div>
            {imgErr && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>⚠ {imgErr}</p>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <div className="upload-btns">
              <label className="upload-lbl">📷 Take Photo<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} /></label>
              <label className="upload-lbl">🖼 Gallery<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} /></label>
            </div>
            {img && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ou btn-sm" onClick={() => { setImg(null); setImgData(null); setResult(null) }}>Clear</button>
                <button className="btn btn-pr btn-full" onClick={analyzePhoto} disabled={!imgData || aiLoading}>{aiLoading ? <><Spin size={15} color="white" />Analyzing...</> : 'Analyze This Meal'}</button>
              </div>
            )}
          </>
        ) : (
          <>
            <NumInput label="What did you eat?" value={manualName} onChange={setManualName} placeholder="Moong dal khichdi, boiled eggs, banana..." />
            <div className="g2">
              <NumInput label="Quantity (optional)" value={manualQty} onChange={setManualQty} placeholder="200" />
              <div className="fg">
                <label className="fl">Unit</label>
                <select className="fi" value={manualUnit} onChange={e => setManualUnit(e.target.value)}>
                  {['g','ml','cup','bowl','plate','piece','tsp','tbsp'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <NumInput label="Notes (how cooked, extra ingredients)" value={manualNotes} onChange={setManualNotes} placeholder="Cooked with ghee, no salt, soft boiled..." />
            <button className="btn btn-pr btn-full" onClick={analyzeManual} disabled={!manualName.trim() || aiLoading}>{aiLoading ? <><Spin size={15} color="white" />Analyzing...</> : 'Log & Analyze'}</button>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card fade-up" style={{ borderTop: `3px solid ${vC[result.verdict] || '#F59E0B'}`, background: vBg[result.verdict] || 'white' }}>
          {result.error ? <p style={{ color: '#EF4444' }}>Error: {result.error}</p> : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${vC[result.verdict]}18`, border: `1.5px solid ${vC[result.verdict]}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: vC[result.verdict], flexShrink: 0 }}>{vI[result.verdict]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{result.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: vC[result.verdict], marginTop: 1 }}>{result.verdict?.toUpperCase()} · {result.score}/10</div>
                </div>
                <button onClick={() => speak(result.analysis, { max: 450 })} className="btn btn-ou btn-sm">🔊</button>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.analysis}</div>
              {result.flagged?.length > 0 && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', marginBottom: 5 }}>⚠ Intolerance detected</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{result.flagged.map(fl => <span key={fl} style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{fl}</span>)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History */}
      {(db.foodLogs || []).length > 0 && (
        <div className="card">
          <div className="card-title">Recent Food History</div>
          {(db.foodLogs || []).slice(0, 12).map(f => (
            <div key={f.id} className="food-row">
              <div className="food-badge" style={{ background: vBg[f.verdict] || '#FFFBEB', color: vC[f.verdict] || '#F59E0B', fontSize: 13 }}>{vI[f.verdict] || '!'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{f.name || 'Meal'}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{f.mealType} · {f.date} {f.time || ''}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: vC[f.verdict] || '#F59E0B' }}>{f.score}/10</div>
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
  const [nm, sNm] = useState({ name: '', dose: '', timing: 'With food', notes: '', type: 'Tablet' })
  const meds = db.medicines || []
  const medLog = db.medLog || {}
  const taken = medLog.taken || {}
  const takenN = Object.values(taken).filter(Boolean).length

  async function addMed() {
    if (!nm.name.trim()) return
    const id = Date.now().toString()
    const med = { ...nm, id }
    await saveMedicine(uid, id, med)
    setDb(p => ({ ...p, medicines: [...(p.medicines || []), med] }))
    sNm({ name: '', dose: '', timing: 'With food', notes: '', type: 'Tablet' })
    setAdding(false); showToast('Medicine added')
  }

  async function removeMed(id) {
    await deleteMedicine(uid, id).catch(() => {})
    setDb(p => ({ ...p, medicines: (p.medicines || []).filter(m => m.id !== id) }))
    showToast('Removed')
  }

  async function toggleTaken(medId) {
    const t = { ...taken, [medId]: !taken[medId] }
    const newLog = { ...medLog, taken: t, date: today }
    await saveMedLog(uid, today, newLog)
    setDb(p => ({ ...p, medLog: newLog }))
  }

  return (
    <div className="fade-up">
      {/* CREON reminder */}
      <div style={{ padding: '14px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>💊 CREON — Most Critical Medicine</div>
        <div style={{ fontSize: 13, color: '#3730A3', lineHeight: 1.6 }}>Take CREON with the <strong>first bite</strong> of every meal/snack containing fat or protein. Without enzymes, nutrients are not absorbed — recovery stalls. This is non-negotiable.</div>
      </div>

      {/* Today's compliance */}
      {meds.length > 0 && (
        <div className="card" style={{ borderTop: `3px solid ${takenN === meds.length ? '#10B981' : '#F59E0B'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Today's Medicines</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{takenN} of {meds.length} taken</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: takenN === meds.length ? '#10B981' : '#F59E0B' }}>{Math.round(takenN / Math.max(1, meds.length) * 100)}%</div>
          </div>
          <PBar value={(takenN / Math.max(1, meds.length)) * 100} color={takenN === meds.length ? '#10B981' : '#F59E0B'} height={6} />
          <div style={{ marginTop: 14 }}>
            {meds.map(med => (
              <div key={med.id} className={`med-row${taken[med.id] ? ' taken' : ''}`}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{med.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{[med.dose, med.timing, med.type].filter(Boolean).join(' · ')}</div>
                  {med.notes && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{med.notes}</div>}
                </div>
                <div className="med-chk" onClick={() => toggleTaken(med.id)}>{taken[med.id] ? '✓' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!adding ? (
        <button className="btn btn-ou btn-full" style={{ marginBottom: 14 }} onClick={() => setAdding(true)}>+ Add Medicine or Supplement</button>
      ) : (
        <div className="card">
          <div className="card-title">Add Medicine</div>
          <NumInput label="Name *" value={nm.name} onChange={v => sNm(p => ({ ...p, name: v }))} placeholder="CREON 25000, Ashwagandha, Vitamin D3..." />
          <div className="g2">
            <NumInput label="Dose" value={nm.dose} onChange={v => sNm(p => ({ ...p, dose: v }))} placeholder="1 tablet, 500mg..." />
            <div className="fg">
              <label className="fl">Type</label>
              <select className="fi" value={nm.type} onChange={e => sNm(p => ({ ...p, type: e.target.value }))}>
                {['Tablet','Capsule','Syrup','Powder','Injection','Drops','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="fl">When to take</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['With food','Before food','After food','Empty stomach','Bedtime','As needed'].map(t => (
                <button key={t} onClick={() => sNm(p => ({ ...p, timing: t }))} style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${nm.timing === t ? '#0EA5E9' : '#E2E8F0'}`, background: nm.timing === t ? '#EFF6FF' : 'white', color: nm.timing === t ? '#0EA5E9' : '#64748B', fontSize: 12, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <NumInput label="Doctor's notes / frequency" value={nm.notes} onChange={v => sNm(p => ({ ...p, notes: v }))} placeholder="3x daily, taper after 3 months..." />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ou" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-pr btn-full" onClick={addMed} disabled={!nm.name.trim()}>Save Medicine</button>
          </div>
        </div>
      )}

      {meds.length > 0 && (
        <div className="card">
          <div className="card-title">All Medicines & Supplements</div>
          {meds.map(med => (
            <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{med.name}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{[med.dose, med.timing].filter(Boolean).join(' · ')}</div>
                {med.notes && <div style={{ fontSize: 11, color: '#94A3B8' }}>{med.notes}</div>}
              </div>
              <button className="btn btn-xs" onClick={() => removeMed(med.id)} style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 6 }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ─── TRACK TAB ─────────────────────────────────────────────────────────────────
function TrackTab({ allLogs }) {
  const [period, setPeriod] = useState(7)
  const days = useMemo(() => {
    const today = new Date(); const result = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const log = allLogs.find(l => l.date === ds) || null
      const sc = scorePillars(log)
      result.push({ ds, day: d.toLocaleDateString('en-IN', { weekday: 'short' }), dateN: d.getDate(), mon: d.toLocaleDateString('en-IN', { month: 'short' }), isToday: i === 0, log, ...sc })
    }
    return result
  }, [allLogs, period])
  const logged = days.filter(d => d.log)
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].log && days[i].overall >= 40) streak++; else break }
  const avg = k => logged.length ? Math.round(logged.reduce((s, d) => s + (d[k] || 0), 0) / logged.length) : 0

  if (logged.length === 0) return (
    <div className="fade-up">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[7,15,30].map(p => <button key={p} className={`btn btn-sm ${period===p?'btn-pr':'btn-ou'}`} onClick={() => setPeriod(p)}>{p} Days</button>)}
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>No data yet</div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>Start logging daily to see your 4 pillar progress</div>
      </div>
    </div>
  )

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        {[7,15,30].map(p => <button key={p} className={`btn btn-sm ${period===p?'btn-pr':'btn-ou'}`} onClick={() => setPeriod(p)}>{p} Days</button>)}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748B', fontWeight: 600 }}>🔥 {streak} day streak</span>
      </div>

      {/* Averages */}
      <div className="stats-row">
        {[{l:'Overall',v:avg('overall'),c:scoreColor(avg('overall'))},{l:'🍽️ Ahara',v:avg('ahara'),c:'#10B981'},{l:'💧 Jala',v:avg('jala'),c:'#0EA5E9'},{l:'🧘 Yoga',v:avg('yoga'),c:'#F59E0B'},{l:'💪 Move',v:avg('vyayama'),c:'#8B5CF6'}].map(s => (
          <div key={s.l} className="stat"><div className="stat-lbl">{s.l}</div><div className="stat-val" style={{ color: s.v > 0 ? s.c : '#CBD5E1', fontSize: 22 }}>{s.v > 0 ? s.v : '—'}</div><PBar value={s.v} color={s.c} height={3} /></div>
        ))}
      </div>

      {/* Goal hits */}
      <div className="card">
        <div className="card-title">Recovery Target Achievement — {logged.length} days</div>
        {[
          { l: 'Protein ≥ 80g/day', n: logged.filter(d => (+d.log?.proteinG||0)>=80).length, c:'#10B981', why:'Rebuilds muscle = cancer armor' },
          { l: 'Water ≥ 2.5L/day',  n: logged.filter(d => (+d.log?.waterL||0)>=2.5).length,  c:'#0EA5E9', why:'Liver flush post-radiation' },
          { l: 'Yoga ≥ 30 mins',    n: logged.filter(d => (+d.log?.yogaMins||0)>=30).length,  c:'#F59E0B', why:'NK cell boost +30%' },
          { l: 'Steps ≥ 8000',      n: logged.filter(d => (+d.log?.walkingSteps||0)>=8000).length, c:'#8B5CF6', why:'8% recurrence reduction per 1000 steps' },
          { l: 'Sleep ≥ 7.5 hours', n: logged.filter(d => (+d.log?.sleepH||0)>=7.5).length,  c:'#EC4899', why:'Growth hormone + tumor suppressor activation' },
          { l: 'CREON ≥ 3 doses',   n: logged.filter(d => (+d.log?.creonDoses||0)>=3).length, c:'#0EA5E9', why:'Enzyme compliance = nutrition absorption' },
        ].map((g, i) => {
          const pct = Math.round((g.n / Math.max(1, logged.length)) * 100)
          return (
            <div key={i} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <div><span style={{ fontSize: 13, color: '#374151' }}>{g.l}</span><div style={{ fontSize: 10, color: '#94A3B8' }}>{g.why}</div></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(pct) }}>{g.n}/{logged.length}</span>
              </div>
              <PBar value={pct} color={g.c} />
            </div>
          )
        })}
      </div>

      {/* Day grid */}
      <div className="card">
        <div className="card-title">Day by Day</div>
        <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr 40px', gap: '4px 10px', marginBottom: 6, fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <span>Date</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}><span>🍽️</span><span>💧</span><span>🧘</span><span>💪</span></div>
          <span style={{ textAlign: 'right' }}>Score</span>
        </div>
        {days.map(day => (
          <div key={day.ds} className={`day-row${!day.log ? ' no-data' : ''}`}>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: day.isToday ? '#0EA5E9' : '#64748B' }}>{day.day}</div><div style={{ fontSize: 12, color: day.isToday ? '#0EA5E9' : '#94A3B8' }}>{day.dateN} {day.mon}</div>{day.isToday && <div style={{ fontSize: 9, color: '#10B981', fontWeight: 700 }}>TODAY</div>}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[{k:'ahara',c:'#10B981'},{k:'jala',c:'#0EA5E9'},{k:'yoga',c:'#F59E0B'},{k:'vyayama',c:'#8B5CF6'}].map(p => (
                <div key={p.k}><PBar value={day[p.k]||0} color={p.c} /><div style={{ fontSize: 9, color: day.log?p.c:'#E2E8F0', marginTop:2, fontWeight:600 }}>{day.log?day[p.k]:'—'}</div></div>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>{day.log ? <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor(day.overall) }}>{day.overall}</span> : <span style={{ color: '#E2E8F0' }}>—</span>}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const PILLARS_DEF = [
  { id:'ahara',    emoji:'🍽️', label:'Ahara',    sub:'Nutrition',  color:'#10B981',
    targets:[{l:'Protein',k:'proteinG',t:80,u:'g'},{l:'Water',k:'waterL',t:2.5,u:'L'},{l:'Fiber',k:'fiberG',t:30,u:'g'},{l:'Veggies',k:'veggieServings',t:5,u:'svgs'}],
    tip:'5-6 small meals · PERT enzymes with every meal · 1.2-1.5g protein per kg · Sattvic diet'
  },
  { id:'jala',     emoji:'💧', label:'Jala',     sub:'Hydration',  color:'#0EA5E9',
    targets:[{l:'Water',k:'waterL',t:2.5,u:'L'}],
    tip:'Lemon water morning → Ginger water pre-meal → Ash gourd juice → Tulsi tea → Triphala → Golden milk'
  },
  { id:'yoga',     emoji:'🧘', label:'Yoga',     sub:'Prana',      color:'#F59E0B',
    targets:[{l:'Yoga/Pranayama',k:'yogaMins',t:45,u:'mins'}],
    tip:'Anulom Vilom 10 min (NK+30%) · Bhramari 5 min (nitric oxide×15) · Surya Namaskar · Shavasana 20 min'
  },
  { id:'vyayama',  emoji:'💪', label:'Vyayama',  sub:'Strength',   color:'#8B5CF6',
    targets:[{l:'Steps',k:'walkingSteps',t:8000,u:''}],
    tip:'Phase 1: walks + bodyweight → Phase 2: light weights → Phase 3: compound movements · Protein within 30 min post-workout'
  },
]

function Dashboard({ db, uid, setTab, allLogs, profile }) {
  const [openPillar, setOpenPillar] = useState(null)
  const todayLog = db.todayLog
  const sc = scorePillars(todayLog, db.medLog)
  const logged7 = allLogs.slice(0, 7)
  const avg7 = logged7.length ? Math.round(logged7.reduce((s, l) => s + (scorePillars(l).overall || 0), 0) / logged7.length) : 0

  const PROTOCOL = [
    '🍋 Lemon water on waking','💊 CREON with first bite of every meal',
    '🌿 Ash gourd juice 200ml','🌾 Amla powder 1 tsp',
    '🚶 Morning walk 30 min (Brahma Muhurta)','🌬️ Pranayama 10 min (Anulom Vilom)',
    '🥛 Protein snack mid-morning','💧 2.5L water target',
    '🧘 Yoga or gym session','☕ Ginger/tulsi tea afternoon',
    '✨ Golden milk (haldi doodh) before bed','😴 In bed by 10pm',
  ]
  const checks = db.todayChecks || {}
  const doneN = Object.values(checks).filter(Boolean).length

  async function toggle(i) {
    const n = { ...checks, [i]: !checks[i] }
    setDb && setDb(p => ({ ...p, todayChecks: n }))
    await saveDailyLog(uid, new Date().toISOString().slice(0, 10), { checks: n })
  }

  return (
    <div className="fade-up">
      {/* Mission banner */}
      <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#ECFDF5,#EFF6FF)', border: '1px solid #A7F3D0', borderRadius: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46', letterSpacing: '-0.3px' }}>🌿 Remission Active</div>
            <div style={{ fontSize: 13, color: '#047857', marginTop: 2 }}>PET-CT Clear · CA 19-9 Target ~6 U/mL · Protocol Running</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {profile.ca199Current && (
              <div style={{ textAlign: 'center', padding: '8px 14px', background: 'white', borderRadius: 10, border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>CA 19-9</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: +profile.ca199Current <= 6 ? '#10B981' : +profile.ca199Current <= 37 ? '#F59E0B' : '#EF4444' }}>{profile.ca199Current}</div>
              </div>
            )}
            <div style={{ textAlign: 'center', padding: '8px 14px', background: 'white', borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>7-Day Avg</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: avg7 > 0 ? scoreColor(avg7) : '#CBD5E1' }}>{avg7 > 0 ? avg7 : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Log prompt */}
      {!todayLog && (
        <div onClick={() => setTab('log')} style={{ cursor: 'pointer', padding: '14px 18px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 26 }}>📋</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>Log today's data</div><div style={{ fontSize: 12, color: '#B45309' }}>Tap to record food, water, yoga, gym, medicines</div></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}>Log Now →</div>
        </div>
      )}

      {/* 4 Pillars */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>The 4 Pillars of Remission</div>
      <div className="pillar-grid">
        {PILLARS_DEF.map(p => {
          const s = sc[p.id] || 0; const isOpen = openPillar === p.id
          return (
            <div key={p.id} className={`pillar-card${isOpen ? ' open' : ''}`} style={{ '--pc': p.color }} onClick={() => setOpenPillar(isOpen ? null : p.id)}>
              <div className="pillar-top">
                <span className="pillar-emoji">{p.emoji}</span>
                <div><div className="pillar-name">{p.label}</div><div className="pillar-sub">{p.sub}</div></div>
                <div className="pillar-score" style={{ color: s > 0 ? scoreColor(s) : '#CBD5E1' }}>{s > 0 ? s : '—'}</div>
              </div>
              <div className="pillar-bar-bg"><div className="pillar-bar-fill" style={{ width: `${s}%`, background: s > 0 ? p.color : '#E2E8F0' }} /></div>
              <div className="pillar-status" style={{ color: s > 0 ? scoreColor(s) : '#94A3B8' }}>{scoreLabel(s)}</div>
              {isOpen && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${p.color}25` }} onClick={e => e.stopPropagation()}>
                  {p.targets.map(t => {
                    const val = +todayLog?.[t.k] || 0
                    const pct = Math.min(100, Math.round(val / t.t * 100))
                    return (
                      <div key={t.k} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: '#64748B' }}>{t.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? p.color : scoreColor(pct) }}>{val}{t.u} / {t.t}{t.u}</span>
                        </div>
                        <PBar value={pct} color={p.color} />
                      </div>
                    )
                  })}
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.65, marginTop: 8, padding: '8px 10px', background: `${p.color}0A`, borderRadius: 7 }}>{p.tip}</div>
                </div>
              )}
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>{isOpen ? '▲ Collapse' : '▼ Tap for details'}</div>
            </div>
          )
        })}
        {/* Medicine */}
        <div className="pillar-card" style={{ '--pc': '#EC4899' }}>
          <div className="pillar-top">
            <span className="pillar-emoji">💊</span>
            <div><div className="pillar-name">Medicine</div><div className="pillar-sub">Compliance</div></div>
            <div className="pillar-score" style={{ color: sc.medicine > 0 ? scoreColor(sc.medicine) : '#CBD5E1' }}>{sc.medicine > 0 ? sc.medicine : '—'}</div>
          </div>
          <div className="pillar-bar-bg"><div className="pillar-bar-fill" style={{ width: `${sc.medicine}%`, background: sc.medicine > 0 ? '#EC4899' : '#E2E8F0' }} /></div>
          <div className="pillar-status" style={{ color: sc.medicine > 0 ? scoreColor(sc.medicine) : '#94A3B8' }}>{scoreLabel(sc.medicine)}</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>CREON + supplements</div>
        </div>
      </div>

      {/* Today scores */}
      {todayLog && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Today's Recovery Score</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(sc.overall) }}>{sc.overall}/100</div>
          </div>
          {[{l:'🍽️ Ahara (Nutrition)',v:sc.ahara,c:'#10B981'},{l:'💧 Jala (Hydration)',v:sc.jala,c:'#0EA5E9'},{l:'🧘 Yoga & Pranayama',v:sc.yoga,c:'#F59E0B'},{l:'💪 Vyayama (Exercise)',v:sc.vyayama,c:'#8B5CF6'},{l:'💊 Medicine Compliance',v:sc.medicine,c:'#EC4899'}].map(s => (
            <div key={s.l} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{s.l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.v > 0 ? scoreColor(s.v) : '#CBD5E1' }}>{s.v > 0 ? `${s.v}%` : '—'}</span>
              </div>
              <PBar value={s.v} color={s.c} />
            </div>
          ))}
        </div>
      )}

      {/* Protocol checklist */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Today's Protocol</div>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{doneN}/{PROTOCOL.length} done</span>
        </div>
        {PROTOCOL.map((item, i) => {
          const done = checks[i]
          return (
            <div key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: done ? '#F0FDF4' : 'transparent', transition: 'background 0.12s' }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${done ? '#10B981' : '#E2E8F0'}`, background: done ? '#10B981' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 11, color: 'white', transition: 'all 0.12s' }}>{done ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: done ? '#059669' : '#64748B', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>{item}</span>
            </div>
          )
        })}
      </div>

      {(db.intolerances || []).length > 0 && (
        <div className="card" style={{ borderTop: '3px solid #EF4444', background: '#FEF2F2' }}>
          <div className="card-title" style={{ color: '#DC2626' }}>⚠ Food Intolerances (auto-tracked)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {db.intolerances.map((f, i) => <span key={i} style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{f}</span>)}
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
    content: 'Namaste. I am JARVIS — your cancer recovery intelligence.\n\nI have your complete medical history and recovery protocol loaded. Ask me anything:\n\n• Food, water, yoga, gym — what to do and why\n• CA 19-9 reduction strategy\n• Fertility recovery timeline\n• Hair and appearance restoration\n• Today\'s complete plan\n• Any symptom or concern\n\nI respond with the precision of a specialist who knows your case personally.',
  }])
  const [input, setInput] = useState('')
  const bottomRef = useRef()
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function buildCtx() {
    const sc = scorePillars(db.todayLog, db.medLog)
    const meds = (db.medicines || []).map(m => `${m.name} ${m.dose} (${m.timing})`).join('; ') || 'none'
    const intols = (db.intolerances || []).join(', ') || 'none'
    const foods = (db.foodLogs || []).filter(f => f.date === new Date().toLocaleDateString('en-IN')).map(f => `${f.name} (${f.verdict}, ${f.score}/10)`).join('; ') || 'none today'
    const symptoms = db.todayLog?.symptoms || 'none'
    const wt = db.todayLog?.weightKg ? `${db.todayLog.weightKg}kg` : 'not recorded'
    return `${PROTOCOL_KNOWLEDGE}\n\nCURRENT SESSION DATA:\nCA 19-9 current: ${profile.ca199Current || 'unknown'} U/mL\nRecovery phase: ${profile.recoveryPhase || '1'}\nCurrent weight: ${wt}\nMedicines taking: ${meds}\nFood intolerances: ${intols}\nToday's meals: ${foods}\nSymptoms: ${symptoms}\nToday's pillar scores: Ahara ${sc.ahara}/100 · Jala ${sc.jala}/100 · Yoga ${sc.yoga}/100 · Vyayama ${sc.vyayama}/100 · Medicine ${sc.medicine}/100 · Overall ${sc.overall}/100\nDoctor notes: ${profile.extraNotes || 'none'}\nSurgery details: ${profile.surgeryDetails || 'distal pancreatectomy'}\n\nYou are JARVIS — warm, precise, evidence-based, encouraging. Always connect advice to the 4 pillars and cancer remission goal. Speak with the authority of a specialist who knows this patient personally. Be specific, not generic.`
  }

  async function send(override) {
    const text = override || input.trim()
    if (!text || aiLoading) return
    unlockSpeech()
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs); setInput(''); setAiLoading(true)
    await saveChat(uid, 'user', text)
    try {
      const resp = await askJarvis(newMsgs.map(m => ({ role: m.role, content: m.content })), buildCtx(), userEmail)
      const aiMsg = { role: 'assistant', content: resp }
      setMsgs([...newMsgs, aiMsg])
      await saveChat(uid, 'assistant', resp)
      speak(resp, { max: 480 })
    } catch (e) { setMsgs([...newMsgs, { role: 'assistant', content: `Connection error: ${e.message}` }]) }
    setAiLoading(false)
  }

  const CHIPS = ['What to eat right now?','CA 19-9 still high — why?','How to grow hair back?','Give me today\'s plan','How to increase sperm count?','I feel very tired','Best yoga for immunity','Which foods reduce CA 19-9?','Hair growth tips','Explain my recovery pillars']

  return (
    <div className="chat-wrap">
      <div className="chat-msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`chat-row${m.role === 'user' ? ' user' : ''}`}>
            {m.role === 'assistant' && <div className="chat-av">🤖</div>}
            <div className={`bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
              {m.role === 'assistant' && <div style={{ fontSize: 10, fontWeight: 700, color: '#0EA5E9', marginBottom: 4, letterSpacing: 0.5 }}>JARVIS</div>}
              {m.content}
              {m.role === 'assistant' && (
                <button onClick={() => speak(m.content, { max: 480 })} style={{ display: 'block', marginTop: 8, padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', color: '#64748B', fontSize: 11, cursor: 'pointer' }}>🔊 Listen</button>
              )}
            </div>
          </div>
        ))}
        {aiLoading && (
          <div className="chat-row">
            <div className="chat-av">🤖</div>
            <div className="bubble ai" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,0.15,0.3].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#CBD5E1', animation: `pulse 1s ease ${d}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-chips">
        {CHIPS.map((q, i) => <button key={i} className="chip" onClick={() => { unlockSpeech(); send(q) }}>{q}</button>)}
      </div>
      <div className="chat-in-row">
        <textarea className="chat-in" placeholder="Ask JARVIS about food, medicines, CA 19-9, recovery..." value={input}
          onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          onFocus={e => e.target.style.borderColor = '#0EA5E9'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
        <button className="btn btn-pr" style={{ alignSelf: 'flex-end', padding: '10px 14px' }} onClick={() => send()} disabled={!input.trim() || aiLoading}>➤</button>
      </div>
    </div>
  )
}

// ─── BLOOD TAB ────────────────────────────────────────────────────────────────
function BloodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [mode, setMode] = useState('manual'); const [text, setText] = useState('')
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [result, setResult] = useState(null); const fileRef = useRef()

  const ctx = () => `Patient: Pancreatic cancer (distal pancreatectomy), liver metastasis treated with radiation + ablation, chemo complete, REMISSION. CA 19-9 target ~6. Partial pancreatectomy = blood sugar regulation affected. Liver had radiation = LFT important. Post-chemo = CBC and immunity markers matter. Current medicines: ${(db.medicines||[]).map(m=>m.name).join(', ')||'none'}.`

  async function analyze() {
    unlockSpeech(); setAiLoading(true); setResult(null)
    try {
      const msgs = mode === 'manual'
        ? [{ role: 'user', content: `${ctx()}\n\nMy blood report:\n${text}\n\nProvide complete analysis:\n1. SUMMARY (2-3 sentences)\n2. KEY MARKERS (each: value, status normal/low/high, what it means for my recovery)\n3. CA 19-9 ANALYSIS (critical — target ~6)\n4. LIVER HEALTH (had radiation + ablation)\n5. BLOOD SUGAR (partial pancreatectomy)\n6. IMMUNITY STATUS (post-chemo)\n7. URGENT ACTIONS (anything needing immediate attention)\n8. DIETARY CHANGES (specific foods to add/remove)\n9. ENCOURAGING NOTE (one honest positive observation)` }]
        : [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgData } }, { type: 'text', text: `${ctx()}\n\nAnalyze this blood report: SUMMARY, KEY MARKERS, CA 19-9, LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY CHANGES, ENCOURAGING NOTE.` }] }]
      const resp = await askJarvis(msgs, '', userEmail)
      const entry = { id: Date.now(), date: new Date().toLocaleDateString('en-IN'), summary: resp.slice(0, 220), full: resp }
      await saveBloodReport(uid, entry)
      setDb(p => ({ ...p, bloodReports: [entry, ...(p.bloodReports||[])] }))
      setResult(entry)
      speak('Analysis complete. ' + entry.summary, { max: 280 })
    } catch (e) { setResult({ full: 'Error: ' + e.message }) }
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div className="card">
        <div className="card-title">Analyze Blood Report</div>
        <div className="tabs">
          <button className={`tab${mode==='manual'?' on':''}`} onClick={()=>setMode('manual')}>✏️ Type values</button>
          <button className={`tab${mode==='photo'?' on':''}`} onClick={()=>setMode('photo')}>📷 Upload photo</button>
        </div>
        {mode === 'manual' ? (
          <>
            <div className="fg"><label className="fl">Enter lab values (one per line)</label><textarea className="fi" rows={10} value={text} onChange={e=>setText(e.target.value)} style={{ fontFamily:'monospace', fontSize:13, height:220 }} placeholder={'CA 19-9: 28 U/mL\nHbA1c: 6.2%\nFasting Glucose: 105 mg/dL\nVitamin D: 22 ng/mL\nHemoglobin: 11.5 g/dL\nALT: 38 U/L\nAST: 32 U/L\n...'} /></div>
            <button className="btn btn-pr btn-full" onClick={analyze} disabled={!text.trim()||aiLoading}>{aiLoading?<><Spin size={15} color="white"/>Analyzing...</>:'Analyze Values'}</button>
          </>
        ) : (
          <>
            <div className={`upload-z${img?' has-img':''}`} onClick={()=>!img&&fileRef.current.click()}>
              {img?<img src={img} alt="report" style={{width:'100%',maxHeight:220,objectFit:'contain'}}/>:(<><div style={{fontSize:36,marginBottom:8}}>📋</div><div style={{fontSize:14,fontWeight:600,color:'#64748B'}}>Upload blood test report</div><div style={{fontSize:12,color:'#94A3B8',marginTop:4}}>Photo or scan · Auto-compressed</div></>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/>
            <div className="upload-btns">
              <label className="upload-lbl">📷 Camera<input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/></label>
              <label className="upload-lbl">🖼 Gallery<input type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/></label>
            </div>
            {img&&<button className="btn btn-pr btn-full" style={{marginTop:10}} onClick={analyze} disabled={!imgData||aiLoading}>{aiLoading?<><Spin size={15} color="white"/>Analyzing...</>:'Analyze Report'}</button>}
          </>
        )}
      </div>
      {result&&(
        <div className="card fade-up">
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0}}>Analysis — {result.date}</div>
            <button onClick={()=>speak(result.full,{max:450})} className="btn btn-ou btn-sm">🔊</button>
          </div>
          <div style={{fontSize:13,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result.full}</div>
          <div style={{marginTop:12,padding:'10px 12px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,fontSize:12,color:'#92400E'}}>⚠ Share with your oncologist for all medical decisions.</div>
        </div>
      )}
      {(db.bloodReports||[]).length>0&&(
        <div className="card"><div className="card-title">History</div>
          {(db.bloodReports||[]).slice(0,4).map(r=>(
            <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',marginBottom:3}}>{r.date}</div>
              <div style={{fontSize:12,color:'#64748B'}}>{r.summary?.slice(0,140)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FITNESS TAB ──────────────────────────────────────────────────────────────
function FitTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading, profile }) {
  const [type, setType] = useState('yoga'); const [phase, setPhase] = useState(profile.recoveryPhase||'1')
  const [plan, setPlan] = useState(null); const saved = (db.fitnessPlans||{})[type+phase]

  async function gen() {
    unlockSpeech(); setAiLoading(true); setPlan(null)
    try {
      const resp = await askJarvis([{role:'user',content:`Generate Phase ${phase} ${type==='yoga'?'Yoga and Pranayama':'Strength Training'} protocol for this patient: distal pancreatectomy, liver ablation, chemo complete, REMISSION. Phase 1=Weeks 1-6 gentle, Phase 2=Weeks 7-16 moderate, Phase 3=Month 4+ progressive. Include: specific exercises/poses, exact sets/reps/durations, safety rules, post-workout nutrition, connection to cancer recovery and the 4 pillars. Be very specific and practical.`}],'',userEmail)
      await savePlan(uid,type+phase,resp)
      setDb(p=>({...p,fitnessPlans:{...(p.fitnessPlans||{}),[type+phase]:resp}}))
      setPlan(resp)
      speak(`Phase ${phase} ${type} protocol ready. ${resp.slice(0,100)}`,{max:180})
    } catch(e){setPlan('Error: '+e.message)} setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div className="card">
        <div className="tabs">
          <button className={`tab${type==='yoga'?' on':''}`} onClick={()=>{setType('yoga');setPlan(null)}}>🧘 Yoga & Pranayama</button>
          <button className={`tab${type==='gym'?' on':''}`} onClick={()=>{setType('gym');setPlan(null)}}>💪 Strength Training</button>
        </div>
        <div className="fg"><label className="fl">Recovery Phase</label>
          <div style={{display:'flex',gap:8}}>
            {[['1','Weeks 1-6 · Gentle'],['2','Weeks 7-16 · Building'],['3','Month 4+ · Progressive']].map(([p,l])=>(
              <button key={p} onClick={()=>{setPhase(p);setPlan(null)}} style={{flex:1,padding:'10px 8px',borderRadius:9,border:`1.5px solid ${phase===p?'#0EA5E9':'#E2E8F0'}`,background:phase===p?'#EFF6FF':'white',color:phase===p?'#0EA5E9':'#64748B',fontSize:11,fontWeight:600,cursor:'pointer',lineHeight:1.4}}>Phase {p}<br/><span style={{fontWeight:400,fontSize:10}}>{l.split(' · ')[1]}</span></button>
            ))}
          </div>
        </div>
        <button className={`btn btn-full ${type==='yoga'?'btn-gr':'btn-pr'}`} onClick={gen} disabled={aiLoading}>{aiLoading?<><Spin size={15} color="white"/>Generating...</>:`Generate Phase ${phase} ${type==='yoga'?'Yoga':'Gym'} Plan`}</button>
      </div>
      {(plan||saved)&&(
        <div className="card fade-up">
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0}}>{type==='yoga'?'Yoga':'Gym'} — Phase {phase}</div>
            <button onClick={()=>speak((plan||saved),{max:400})} className="btn btn-ou btn-sm">🔊</button>
          </div>
          <div style={{fontSize:13,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{plan||saved}</div>
        </div>
      )}
      <div className="card" style={{borderTop:'3px solid #EF4444',background:'#FEF2F2'}}>
        <div className="card-title" style={{color:'#DC2626'}}>⚠ Safety Rules</div>
        {['Never exercise on empty stomach — blood sugar drops with partial pancreas','Stop immediately: chest pain, sharp abdominal pain, dizziness','Protein within 30 min post-workout — muscle synthesis window','Avoid heavy ab exercises in Phases 1 and 2 (post-surgical)','Hydrate 500ml water during and after every session'].map((t,i)=>(
          <div key={i} style={{display:'flex',gap:8,marginBottom:7}}><span style={{color:'#EF4444',flexShrink:0,fontWeight:700}}>•</span><span style={{fontSize:13,color:'#374151',lineHeight:1.5}}>{t}</span></div>
        ))}
      </div>
    </div>
  )
}

// ─── HEALING GUIDES ──────────────────────────────────────────────────────────
const HEAL_TOPICS = [
  {id:'ca199',    icon:'🎯',label:'Reduce CA 19-9',          color:'#EF4444'},
  {id:'sperm',    icon:'🌱',label:'Sperm & Fertility',        color:'#0EA5E9'},
  {id:'hair',     icon:'✨',label:'Hair Regrowth',            color:'#F59E0B'},
  {id:'weight',   icon:'⚖️',label:'Gain Weight Safely',      color:'#10B981'},
  {id:'immunity', icon:'🛡️',label:'Rebuild Immunity',        color:'#0EA5E9'},
  {id:'energy',   icon:'⚡',label:'Restore Natural Energy',   color:'#F59E0B'},
  {id:'digestion',icon:'🌿',label:'Fix Digestion (PERT)',     color:'#10B981'},
  {id:'eyebrow',  icon:'👁️',label:'Eyebrow & Lashes',        color:'#8B5CF6'},
  {id:'appear',   icon:'🌟',label:'Look Normal Again',        color:'#10B981'},
  {id:'complete', icon:'🏆',label:'Full Recovery Roadmap',   color:'#EF4444'},
]
const HEAL_PROMPTS = {
  ca199: 'Specific actionable CA 19-9 reduction protocol. Cover the 5 layers: blood sugar control (40% impact — eliminate sugar, protein before carbs, cinnamon + berberine, target fasting glucose 80-90), liver support (25% — milk thistle 200-400mg, NAC 600mg, amla 2 tsp, 3L water), gut inflammation reduction (L-Glutamine 5g empty stomach, probiotic, no NSAIDs), anti-inflammatory stack (turmeric+pepper, omega-3 2-3g, resveratrol, green tea), evidence-based anti-cancer agents (Vitamin D3 4000 IU, melatonin 10-20mg, quercetin 500mg, modified citrus pectin 5g 3x). Include realistic timeline and tracking protocol.',
  sperm: 'Complete post-chemotherapy sperm count and fertility restoration. Tests to do now (semen analysis, FSH+LH+Testosterone, prolactin, thyroid). Supplements with exact doses (CoQ10 400-600mg — most evidence-backed, Ashwagandha KSM-66 600mg, L-Carnitine 2g, Zinc 15-25mg, Selenium 100-200mcg, Vitamin E 400 IU). Lifestyle (sleep, avoid heat, ejaculation frequency, cold showers). Realistic timeline (74 days sperm cycle). Month-by-month expectations.',
  hair: 'Complete hair regrowth protocol post-chemotherapy. Month-by-month timeline. Scalp care (rosemary oil or warm coconut oil massage 3 min daily). Supplements (Biotin 5000mcg, Zinc, Iron if low, Vitamin D3, Collagen). Scalp care routine. What to expect phase by phase. Hair care once it starts growing. Eyebrow-specific care.',
  weight: 'Safe weight gain plan after cancer — gaining lean muscle not fat. Target 0.3-0.5 kg/week. Daily calorie surplus calculation. Protein timing strategy. Specific high-calorie recovery foods (ghee, soaked dates, banana, makhana, peanut butter, full-fat curd). Supplement support (creatine once stable). Phase-based exercise to maximize muscle gain. How to track progress.',
  immunity: 'Complete post-chemotherapy immunity reconstruction. Specific foods (amount + timing). Full supplement protocol with doses. Sleep optimization for immune function. Exercise specific to NK cell activation. Lab markers to track monthly. Timeline of immune recovery. Signs that immunity is improving.',
  energy: 'Natural energy restoration after chemotherapy — ending fatigue without steroid dependency. Adrenal recovery protocol. Mitochondrial healing (CoQ10, B vitamins, iron). Blood sugar stability (key for energy). Sleep architecture improvement. Adaptogen protocol (Ashwagandha, Rhodiola). Step-by-step energy rebuild timeline.',
  digestion: 'Complete gut healing after partial pancreatectomy and chemotherapy. PERT enzyme optimization — timing, doses, adjusting for fat content. Gut lining repair (L-Glutamine 5g, Slippery Elm, aloe vera inner leaf). Microbiome rebuilding (probiotics, prebiotics, fermented foods). Specific meal structure for best absorption. Managing gas and bloating. Signs of healing.',
  eyebrow: 'Eyebrow and eyelash regrowth after chemo. Castor oil + rosemary oil nightly protocol. Serums (Latisse prescription or Vegamour). Gentle massage technique. Supplements (biotin, vitamin E, zinc). Realistic timeline. How to care for sparse regrowth.',
  appear: 'Complete guide to looking and feeling completely normal — weight, skin, hair, energy, confidence. Skin restoration (hydration, collagen foods, gentle skincare). Posture recovery. Weight and muscle restoration timeline. Hair and eyebrow combined approach. Mental/emotional recovery. Realistic month-by-month transformation.',
  complete: 'Complete roadmap to being fully disease-free and living vibrantly. All recovery phases and milestones. Longevity habits for cancer prevention. How to prevent recurrence specifically for pancreatic cancer. Mental recovery and survivorship mindset. Year 1, Year 2, Year 5 goals. The 100-year vibrant life plan.',
}

function HealTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [topic, setTopic] = useState(null); const [result, setResult] = useState(null)

  async function get(t) {
    setTopic(t)
    // INSTANT: show cache if available
    if (db.recoveryGuides?.[t]) { setResult(db.recoveryGuides[t]); speak('Loading your saved guide.', {max:50}); return }
    unlockSpeech(); setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{role:'user',content:`For a pancreatic cancer patient in remission (distal pancreatectomy, liver ablation, chemo complete): ${HEAL_PROMPTS[t]} Be specific, practical, evidence-based. Connect to the 4 pillars: Ahara, Jala, Yoga, Vyayama.`}],'',userEmail)
      await saveGuide(uid,t,resp)
      setDb(p=>({...p,recoveryGuides:{...(p.recoveryGuides||{}),[t]:resp}}))
      setResult(resp)
      speak(resp.slice(0,200),{max:250})
    } catch(e){setResult('Error: '+e.message)}
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:9,marginBottom:16}}>
        {HEAL_TOPICS.map(t=>(
          <button key={t.id} className={`heal-btn${topic===t.id?' sel':''}`} style={{'--hc':t.color}} onClick={()=>get(t.id)}>
            <div style={{fontSize:22,marginBottom:7}}>{t.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:topic===t.id?t.color:'#374151',marginBottom:2}}>{t.label}</div>
            {db.recoveryGuides?.[t.id]&&<div style={{fontSize:9,fontWeight:700,color:'#10B981',marginTop:3}}>✓ Saved</div>}
          </button>
        ))}
      </div>
      {aiLoading&&<div className="card" style={{display:'flex',alignItems:'center',gap:10,color:'#64748B'}}><Spin/>Generating your personalized guide — this may take 20-30 seconds...</div>}
      {result&&topic&&(
        <div className="card fade-up" style={{borderTop:`3px solid ${HEAL_TOPICS.find(t=>t.id===topic)?.color||'#0EA5E9'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0,color:HEAL_TOPICS.find(t=>t.id===topic)?.color}}>{HEAL_TOPICS.find(t=>t.id===topic)?.label}</div>
            <button onClick={()=>speak(result,{max:480})} className="btn btn-ou btn-sm">🔊</button>
          </div>
          <div style={{fontSize:13,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result}</div>
        </div>
      )}
    </div>
  )
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({ uid, profile, setProfile, showToast }) {
  const [f, sf] = useState(profile); const [saving, setSaving] = useState(false)
  const set = (k,v) => sf(p=>({...p,[k]:v}))
  async function save() {
    setSaving(true); await saveHealthProfile(uid,f); setProfile(f); showToast('Profile saved ✓'); setSaving(false)
  }
  return (
    <div className="fade-up">
      <div style={{padding:'13px 16px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:'#1D4ED8',marginBottom:3}}>This is your JARVIS memory</div>
        <div style={{fontSize:12,color:'#3730A3',lineHeight:1.6}}>Everything here is injected into every AI conversation. The more complete, the more personalized your guidance. Update after each oncologist visit.</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
        <div className="card">
          <div className="card-title">Current Status</div>
          <NumInput label="CA 19-9 current (U/mL)" value={f.ca199Current||''} onChange={v=>set('ca199Current',v)} placeholder="28" hint="Target ~6 · Normal <37 · Update after every blood test" />
          <NumInput label="Current weight (kg)" value={f.weightCurrent||''} onChange={v=>set('weightCurrent',v)} placeholder="65.5" />
          <NumInput label="Target weight (kg)" value={f.weightTarget||''} onChange={v=>set('weightTarget',v)} placeholder="70" />
          <div className="fg"><label className="fl">Recovery phase</label>
            <select className="fi" value={f.recoveryPhase||'1'} onChange={e=>set('recoveryPhase',e.target.value)}>
              <option value="1">Phase 1 — Weeks 1-6 (Gentle rebuild)</option>
              <option value="2">Phase 2 — Weeks 7-16 (Building strength)</option>
              <option value="3">Phase 3 — Month 4+ (Progressive)</option>
            </select>
          </div>
          <div className="fg"><label className="fl">Last PET-CT / scan date</label><input type="date" className="fi" value={f.lastScanDate||''} onChange={e=>set('lastScanDate',e.target.value)}/></div>
          <div className="fg"><label className="fl">Next oncologist appointment</label><input type="date" className="fi" value={f.nextAppt||''} onChange={e=>set('nextAppt',e.target.value)}/></div>
        </div>
        <div className="card">
          <div className="card-title">Medical History</div>
          <div className="fg"><label className="fl">Surgery details</label><textarea className="fi" rows={2} style={{height:68}} placeholder="Distal pancreatectomy Jan 2024..." value={f.surgeryDetails||''} onChange={e=>set('surgeryDetails',e.target.value)}/></div>
          <div className="fg"><label className="fl">Chemotherapy regimens completed</label><textarea className="fi" rows={2} style={{height:68}} placeholder="FOLFIRINOX 6 cycles, Gemcitabine..." value={f.chemoHistory||''} onChange={e=>set('chemoHistory',e.target.value)}/></div>
          <div className="fg"><label className="fl">Other treatments</label><textarea className="fi" rows={2} style={{height:68}} placeholder="Liver microwave ablation x2, SBRT 5 fractions..." value={f.otherTx||''} onChange={e=>set('otherTx',e.target.value)}/></div>
          <NumInput label="Known drug allergies" value={f.allergies||''} onChange={v=>set('allergies',v)} placeholder="Penicillin, sulfa..." />
        </div>
        <div className="card">
          <div className="card-title">Goals & Notes</div>
          <div className="fg"><label className="fl">Fertility goal</label>
            <select className="fi" value={f.fertilityGoal||''} onChange={e=>set('fertilityGoal',e.target.value)}>
              <option value="">Not a current focus</option>
              <option value="trying">Actively trying to conceive</option>
              <option value="future">Planning for future</option>
              <option value="monitoring">Monitoring sperm health</option>
            </select>
          </div>
          <div className="fg"><label className="fl">Personal goals</label><textarea className="fi" rows={3} style={{height:90}} placeholder="Weight gain to 72kg, hair full by April, return to work, run 5km..." value={f.goals||''} onChange={e=>set('goals',e.target.value)}/></div>
          <NumInput label="Oncologist name & hospital" value={f.doctorName||''} onChange={v=>set('doctorName',v)} placeholder="Dr. Sharma — Apollo Bengaluru" />
          <div className="fg"><label className="fl">Extra notes for JARVIS</label><textarea className="fi" rows={3} style={{height:90}} placeholder="Anything else JARVIS should know about your case, concerns, dietary preferences..." value={f.extraNotes||''} onChange={e=>set('extraNotes',e.target.value)}/></div>
        </div>
      </div>
      <button className="btn btn-pr btn-full" onClick={save} disabled={saving} style={{marginTop:4,padding:'13px',fontSize:14}}>{saving?<><Spin size={16} color="white"/>Saving...</>:'💾 Save Profile'}</button>
    </div>
  )
}
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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
  const [listening, setListening] = useState(false)
  // Track which tabs have been visited (lazy render)
  const [visited, setVisited] = useState(new Set(['home']))
  const recRef = useRef(null)

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const [food, blood, guides, plans, chat, intols, daily, meds, medlog, prof] = await Promise.all([
        getFoodLogs(uid), getBloodReports(uid), getGuides(uid), getPlans(uid),
        getChat(uid), getIntolerances(uid), getDailyLog(uid, today),
        getMedicines(uid), getMedLog(uid, today), getHealthProfile(uid)
      ])
      const logPs = []
      for (let i = 1; i <= 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toISOString().slice(0, 10)
        logPs.push(getDailyLog(uid, ds).then(l => l && Object.keys(l).length > 3 ? { ...l, date: ds } : null))
      }
      const pastLogs = (await Promise.all(logPs)).filter(Boolean)
      const todayLog = daily && Object.keys(daily).length > 3 ? { ...daily, date: today } : null
      setAllLogs(todayLog ? [todayLog, ...pastLogs] : pastLogs)
      setDb({ foodLogs: food, bloodReports: blood, recoveryGuides: guides, fitnessPlans: plans, intolerances: intols, todayChecks: daily?.checks || {}, todayLog, medicines: meds, medLog: { ...medlog, date: today } })
      setProfile(prof || {})
      setReady(true)
    }
    load().catch(e => { console.error(e); setReady(true) })
  }, [uid])

  // ── Voice setup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-IN'
    rec.onresult = e => {
      const text = e.results[0][0].transcript.toLowerCase().trim()
      setVoiceText(text); setTimeout(() => setVoiceText(''), 5000)
      // Command routing
      const MAP = { 'log today':'log', 'daily log':'log', 'scan food':'food', 'food':'food', 'blood report':'blood', 'lab':'blood', 'medicines':'meds', 'track':'track', 'progress':'track', 'fitness':'fit', 'yoga':'fit', 'recovery':'heal', 'hair':'heal', 'profile':'prof', 'chat':'ai', 'jarvis':'ai', 'home':'home', 'dashboard':'home' }
      for (const [p, t] of Object.entries(MAP)) { if (text.includes(p)) { goTo(t); return } }
      goTo('ai') // Send to AI coach
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
  }, [])

  function goTo(t) { setTab(t); setVisited(v => new Set([...v, t])); speak(`Opening ${t}.`, { max: 40 }) }

  function handleTab(t) {
    setTab(t)
    setVisited(v => new Set([...v, t]))
  }

  function toggleVoice() {
    unlockSpeech()
    if (!recRef.current) return
    if (listening) { try { recRef.current.stop() } catch {} setListening(false) }
    else { try { recRef.current.start(); setListening(true) } catch {} }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function dbUpdate(d) {
    setDb(d)
    const today = new Date().toISOString().slice(0, 10)
    if (d.todayLog) setAllLogs(prev => [{ ...d.todayLog, date: today }, ...prev.filter(l => l.date !== today)])
  }

  const shared = { uid, db, setDb: dbUpdate, userEmail, aiLoading, setAiLoading, showToast, profile }
  const todaySc = scorePillars(db.todayLog, db.medLog)
  const hasNoLog = !db.todayLog

  const PAGE_TITLES = { home:'Dashboard', log:'Daily Log', track:'Progress', food:'Food Tracker', meds:'Medicines', blood:'Lab Reports', fit:'Fitness Plans', heal:'Recovery Guides', ai:'JARVIS AI Coach', prof:'My Profile' }

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#EEF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <style>{CSS}</style>
      <div style={{ width: 26, height: 26, border: '3px solid #BFDBFE', borderTop: '3px solid #0EA5E9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>Loading JARVIS...</span>
    </div>
  )

  return (
    <div className="shell">
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      {/* ── SIDEBAR ── */}
      <nav className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-icon">🌱</div>
            <div><div className="sb-name">JARVIS Health</div><div className="sb-sub">Cancer Recovery AI</div></div>
          </div>
          <div className="sb-status"><div className="sb-dot pulse" /><span>Remission Active</span></div>
        </div>
        {NAV.map((item, i) => item.s
          ? <div key={i} className="sec-lbl">{item.s}</div>
          : (
            <a key={item.id} className={`nav-item${tab === item.id ? ' active' : ''}`} href="#" onClick={e => { e.preventDefault(); handleTab(item.id) }}>
              {item.icon}<span>{item.label}</span>
              {item.badge && hasNoLog && <span className="nav-badge" />}
            </a>
          )
        )}
        <div className="sb-footer">
          <div className="sb-ca199">
            <div className="sb-ca199-lbl">CA 19-9 GOAL</div>
            <div className="sb-ca199-val">~6 <span style={{ fontSize: 12, fontWeight: 500 }}>U/mL</span></div>
            {profile.ca199Current && <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>Current: {profile.ca199Current}</div>}
          </div>
          <button className="btn btn-ou btn-sm btn-full" onClick={onLogout}>Sign Out</button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="main">
        {/* Top bar */}
        <div className="topbar">
          <button className={`voice-btn${listening ? ' active' : ''}`} onClick={toggleVoice} title={listening ? 'Stop listening' : 'Tap to speak'}>
            {listening && <div className="voice-rip" />}
            {listening ? '🎙️' : '🎤'}
          </button>
          <div style={{ flex: 1, fontSize: 12, color: '#94A3B8', overflow: 'hidden' }}>
            {listening ? <span style={{ color: '#0EA5E9', fontWeight: 600 }}>● Listening... say "log today", "scan food", "show progress"</span>
              : voiceText ? <span style={{ color: '#374151' }}>"{voiceText}"</span>
              : 'Tap mic · Say "log today" · "scan food" · "CA 19-9 tips"'}
          </div>
          <button onClick={stopSpeaking} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', color: '#64748B', fontSize: 13, cursor: 'pointer', flexShrink: 0 }} title="Stop speaking">⏹</button>
          {db.todayLog
            ? <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(todaySc.overall), flexShrink: 0 }}>{todaySc.overall}<span style={{ fontSize: 10, fontWeight: 500, color: '#94A3B8' }}>/100</span></div>
            : <button className="btn btn-pr btn-sm" onClick={() => handleTab('log')} style={{ flexShrink: 0 }}>Log Today</button>
          }
        </div>

        {/* Page area — ALL tabs rendered, shown/hidden with CSS to prevent remounting crashes */}
        <div className="page">
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>{PAGE_TITLES[tab]}</h1>
          </div>

          {/* Dashboard always mounted */}
          <div style={{ display: tab === 'home' ? 'block' : 'none' }}>
            <Dashboard {...shared} setTab={handleTab} allLogs={allLogs} />
          </div>

          {/* Other tabs: lazy-mount once visited, then keep mounted */}
          {visited.has('log') && <div style={{ display: tab === 'log' ? 'block' : 'none' }}><LogTab {...shared} /></div>}
          {visited.has('track') && <div style={{ display: tab === 'track' ? 'block' : 'none' }}><TrackTab allLogs={allLogs} /></div>}
          {visited.has('food') && <div style={{ display: tab === 'food' ? 'block' : 'none' }}><FoodTab {...shared} /></div>}
          {visited.has('meds') && <div style={{ display: tab === 'meds' ? 'block' : 'none' }}><MedTab {...shared} /></div>}
          {visited.has('blood') && <div style={{ display: tab === 'blood' ? 'block' : 'none' }}><BloodTab {...shared} /></div>}
          {visited.has('fit') && <div style={{ display: tab === 'fit' ? 'block' : 'none' }}><FitTab {...shared} /></div>}
          {visited.has('heal') && <div style={{ display: tab === 'heal' ? 'block' : 'none' }}><HealTab {...shared} /></div>}
          {visited.has('ai') && <div style={{ display: tab === 'ai' ? 'block' : 'none' }}><AICoach uid={uid} db={db} userEmail={userEmail} aiLoading={aiLoading} setAiLoading={setAiLoading} profile={profile} /></div>}
          {visited.has('prof') && <div style={{ display: tab === 'prof' ? 'block' : 'none' }}><ProfileTab uid={uid} profile={profile} setProfile={setProfile} showToast={showToast} /></div>}
        </div>
      </div>

      {/* ── MOBILE NAV ── */}
      <nav className="mob-nav">
        {MOB.map(t => (
          <button key={t.id} className={`mob-ni${tab === t.id ? ' on' : ''}`} onClick={() => handleTab(t.id)} style={{ position: 'relative' }}>
            {t.icon}
            <span>{t.label}</span>
            {t.badge && hasNoLog && <span className="mob-badge" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
