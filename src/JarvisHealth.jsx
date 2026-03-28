import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  getFoodLogs, saveFoodLog,
  getBloodReports, saveBloodReport,
  getGuides, saveGuide,
  getPlans, savePlan,
  getChat, saveChat,
  getIntolerances, saveIntolerance,
  getDailyLog, saveDailyLog,
} from './firebase'
import { askJarvis, imgToBase64, speak } from './api'

// ── Voice commands ─────────────────────────────────────────────────────────────
const VOICE_COMMANDS = {
  'scan food':'food','analyze food':'food','check my meal':'food',
  'blood report':'blood','blood test':'blood','show reports':'blood',
  'yoga':'fitness','exercise':'fitness','workout':'fitness','gym':'fitness',
  'recovery':'recovery','hair':'recovery','fertility':'recovery',
  'home':'home','dashboard':'home','log today':'log','daily log':'log',
  'track':'track','history':'track','progress':'track',
  'chat':'coach','help me':'coach',
  'what should i eat':'coach','i feel tired':'coach',
}

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 85) return '#00FF88'
  if (pct >= 65) return '#00D4FF'
  if (pct >= 40) return '#FFB800'
  return '#FF3B3B'
}
function computeDayScore(log) {
  if (!log) return { food:0, water:0, yoga:0, gym:0, overall:0 }
  const food  = Math.min(100, Math.round(
    ((+log.proteinG||0)/80*40) + ((+log.veggieServings||0)/5*35) + ((+log.fiberG||0)/30*25)
  ))
  const water = Math.min(100, Math.round(((+log.waterL||0)/2.5)*100))
  const yoga  = Math.min(100, Math.round(((+log.yogaMins||0)/45)*100))
  const hasGym = log.gymGroup && log.gymGroup !== 'None today'
  const gym   = Math.min(100, Math.round(((+log.walkingSteps||0)/8000*60) + (hasGym?40:0)))
  const sleep = Math.min(100, Math.round(((+log.sleepH||0)/7.5)*100))
  const overall = Math.round(food*0.28 + water*0.18 + yoga*0.22 + gym*0.20 + sleep*0.12)
  return { food, water, yoga, gym, sleep, overall }
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0;}
  ::-webkit-scrollbar{width:2px;}
  ::-webkit-scrollbar-thumb{background:#00D4FF30;border-radius:2px;}
  textarea::placeholder,input::placeholder{color:#2A5A6A;}
  input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#00D4FF;cursor:pointer;box-shadow:0 0 6px #00D4FF80;}
  input[type=number]{-webkit-appearance:none;}
  select{-webkit-appearance:none;}
  @keyframes rotate    {to{transform:rotate(360deg)}}
  @keyframes rotateBack{to{transform:rotate(-360deg)}}
  @keyframes arcPulse  {0%,100%{box-shadow:0 0 20px #00D4FF,0 0 40px #00D4FF40,inset 0 0 20px #00D4FF20}50%{box-shadow:0 0 40px #00D4FF,0 0 80px #00D4FF60,inset 0 0 40px #00D4FF40}}
  @keyframes scanline  {0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
  @keyframes hexPulse  {0%,100%{opacity:.03}50%{opacity:.08}}
  @keyframes fadeSlide {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ripple    {0%{transform:scale(1);opacity:1}100%{transform:scale(3);opacity:0}}
  @keyframes blink     {0%,100%{opacity:1}50%{opacity:0.2}}
  @keyframes glow2     {0%,100%{opacity:0.6}50%{opacity:1}}
  .fade-slide{animation:fadeSlide 0.35s ease forwards;}
  .blink{animation:blink 1s ease infinite;}
`

// ── Shared components ──────────────────────────────────────────────────────────
function HexGrid() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0}}>
      <svg width="100%" height="100%" style={{opacity:0.04,animation:'hexPulse 5s ease infinite'}}>
        <defs>
          <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
            <polygon points="28,2 52,14 52,34 28,46 4,34 4,14" fill="none" stroke="#00D4FF" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)"/>
      </svg>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,
        background:'linear-gradient(90deg,transparent,#00D4FF25,transparent)',
        animation:'scanline 10s linear infinite'}}/>
    </div>
  )
}

function Panel({children, style, color='#00D4FF', title, noclip}) {
  return (
    <div style={{position:'relative',
      background:'linear-gradient(135deg,rgba(0,18,36,0.92),rgba(0,8,22,0.96))',
      border:`1px solid ${color}22`,borderRadius:3,padding:'14px 14px',marginBottom:11,
      boxShadow:`0 0 24px ${color}07,inset 0 0 30px ${color}03`,
      ...(noclip?{}:{clipPath:'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))'}),
      ...style}}>
      <div style={{position:'absolute',top:0,right:0,width:10,height:10,background:`${color}45`}}/>
      <div style={{position:'absolute',bottom:0,left:0,width:10,height:10,background:`${color}22`}}/>
      {title&&<div style={{fontSize:9,fontFamily:'Orbitron',fontWeight:700,letterSpacing:2,
        color:color,marginBottom:10,textTransform:'uppercase',opacity:0.85}}>◈ {title}</div>}
      {children}
    </div>
  )
}

function OrbBtn({label, onClick, disabled, color='#00D4FF', style={}}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%',padding:'11px',background:disabled?'rgba(255,255,255,0.02)':`${color}10`,
      border:`1px solid ${disabled?'#0D2A3A':color+'45'}`,
      color:disabled?'#1A3A4A':color,fontSize:11,fontFamily:'Orbitron',
      letterSpacing:2,cursor:disabled?'not-allowed':'pointer',
      transition:'all 0.2s',borderRadius:2,...style}}>
      {label}
    </button>
  )
}

function Spinner({color='#00D4FF',text=''}) {
  return (
    <Panel noclip>
      <div style={{display:'flex',gap:10,alignItems:'center',color}}>
        <div style={{width:14,height:14,border:`2px solid ${color}25`,
          borderTop:`2px solid ${color}`,borderRadius:'50%',
          animation:'rotate 0.8s linear infinite',flexShrink:0}}/>
        {text&&<span style={{fontSize:11,fontFamily:'Orbitron',letterSpacing:1}}>{text}</span>}
      </div>
    </Panel>
  )
}

function ArcReactor({listening, onClick, supported}) {
  return (
    <div onClick={onClick} style={{position:'relative',width:72,height:72,
      cursor:supported?'pointer':'default',flexShrink:0}}>
      {listening&&[0,0.6].map(d=>(
        <div key={d} style={{position:'absolute',inset:-10,borderRadius:'50%',
          border:'2px solid #00D4FF',animation:`ripple 1.6s ease ${d}s infinite`}}/>
      ))}
      <div style={{position:'absolute',inset:0,borderRadius:'50%',
        border:`1px solid ${listening?'#00D4FF':'#00D4FF25'}`,
        animation:'rotate 9s linear infinite'}}/>
      <div style={{position:'absolute',inset:10,borderRadius:'50%',
        border:'1px solid #00D4FF35',animation:'rotateBack 13s linear infinite'}}>
        {[0,60,120,180,240,300].map(deg=>(
          <div key={deg} style={{position:'absolute',top:'50%',left:'50%',
            width:3,height:3,marginTop:-1.5,marginLeft:-1.5,borderRadius:'50%',
            background:'#00D4FF',opacity:listening?0.9:0.25,
            transform:`rotate(${deg}deg) translateY(-11px)`}}/>
        ))}
      </div>
      <div style={{position:'absolute',inset:20,borderRadius:'50%',
        background:listening?'radial-gradient(circle,#00D4FF,#0055BB)':'radial-gradient(circle,#00D4FF25,#001020)',
        boxShadow:listening?'0 0 28px #00D4FF,inset 0 0 18px #00D4FF35':'0 0 6px #00D4FF20',
        transition:'all 0.3s',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>
        {listening?'🎙️':supported?'🎤':'🔇'}
      </div>
    </div>
  )
}

// ── Voice hook ─────────────────────────────────────────────────────────────────
function useVoice(onCommand, onTranscript) {
  const recRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  useEffect(()=>{
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition
    if (!SR) return; setSupported(true)
    const rec = new SR(); rec.continuous=false; rec.interimResults=false; rec.lang='en-IN'
    rec.onresult = e => {
      const text = e.results[0][0].transcript.toLowerCase().trim()
      onTranscript(text)
      for (const [phrase, tab] of Object.entries(VOICE_COMMANDS)) {
        if (text.includes(phrase)) { onCommand(tab, text); return }
      }
      onCommand(null, text)
    }
    rec.onend = ()=>setListening(false)
    rec.onerror = ()=>setListening(false)
    recRef.current = rec
  },[])
  const startListening = useCallback(()=>{ if(!recRef.current||listening)return; try{recRef.current.start();setListening(true)}catch{} },[listening])
  const stopListening  = useCallback(()=>{ if(!recRef.current)return; try{recRef.current.stop();setListening(false)}catch{} },[])
  return {listening, supported, startListening, stopListening}
}

// ── DAILY LOG TAB ──────────────────────────────────────────────────────────────
const GYM_GROUPS = ['None today','Chest','Back','Legs','Shoulders','Arms','Full body','Cardio only']
const HABITS = ['Morning lemon water','CREON with every meal','Ash gourd juice','Amla powder','Golden milk','Tulsi tea','No refined sugar','Screen off by 10pm']

function LogTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0,10)
  const existing = db.todayLog || {}
  const [form, setForm] = useState({
    sleepH: existing.sleepH||'', energyAM: existing.energyAM||5, energyPM: existing.energyPM||5,
    waterL: existing.waterL||'', proteinG: existing.proteinG||'', fiberG: existing.fiberG||'',
    veggieServings: existing.veggieServings||'', creonDoses: existing.creonDoses||3,
    gasLevel: existing.gasLevel||0, bloating: existing.bloating||0, digestComfort: existing.digestComfort||5,
    yogaMins: existing.yogaMins||'', walkingSteps: existing.walkingSteps||'',
    weightKg: existing.weightKg||'', gymGroup: existing.gymGroup||'None today',
    symptoms: existing.symptoms||'', notes: existing.notes||'',
    habits: existing.habits||{},
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleHabit = h => setForm(f=>({...f,habits:{...f.habits,[h]:!f.habits[h]}}))
  const scores = computeDayScore(form)

  async function save() {
    setSaving(true)
    const log = { ...form, date: today, ...scores }
    await saveDailyLog(uid, today, log)
    setDb(prev=>({...prev, todayLog:log,
      todayChecks: prev.todayChecks||{}
    }))
    showToast('✓ Daily log saved')
    setSaving(false)
  }

  const Slider = ({label, k, min=0, max=10, emoji=''}) => {
    const v = form[k]
    const pct = ((v-min)/(max-min))*100
    const bg = `linear-gradient(to right, ${scoreColor(pct)} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`
    return (
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:11,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{emoji} {label}</span>
          <span style={{fontSize:13,fontFamily:'Orbitron',color:scoreColor(pct),fontWeight:700}}>{v}</span>
        </div>
        <input type="range" min={min} max={max} step={1} value={v}
          onChange={e=>set(k,+e.target.value)}
          style={{background:bg}}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
          <span style={{fontSize:8,color:'#1A3A4A',fontFamily:'Orbitron'}}>0</span>
          <span style={{fontSize:8,color:'#1A3A4A',fontFamily:'Orbitron'}}>{max}</span>
        </div>
      </div>
    )
  }

  const NumInput = ({label, k, placeholder, unit=''}) => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,color:'#3A6B7A',fontFamily:'Orbitron',letterSpacing:1,marginBottom:4}}>{label}</div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <input type="number" placeholder={placeholder} value={form[k]}
          onChange={e=>set(k,e.target.value)}
          style={{flex:1,background:'rgba(0,212,255,0.05)',border:'1px solid #00D4FF20',
            borderRadius:2,padding:'8px 10px',color:'#B8E4F0',fontSize:13,
            fontFamily:'Rajdhani',outline:'none'}}/>
        {unit&&<span style={{fontSize:11,color:'#1A3A4A',fontFamily:'Orbitron',flexShrink:0}}>{unit}</span>}
      </div>
    </div>
  )

  return (
    <div className="fade-slide">
      {/* Live score bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:12}}>
        {[
          {l:'FOOD',v:scores.food,c:'#00FF88'},
          {l:'WATER',v:scores.water,c:'#00D4FF'},
          {l:'YOGA',v:scores.yoga,c:'#FFB800'},
          {l:'GYM',v:scores.gym,c:'#FF7EB3'},
          {l:'SCORE',v:scores.overall,c:scoreColor(scores.overall)},
        ].map(s=>(
          <div key={s.l} style={{background:`${s.c}10`,border:`1px solid ${s.c}25`,
            borderRadius:2,padding:'8px 4px',textAlign:'center'}}>
            <div style={{fontSize:7,color:'#3A6B7A',fontFamily:'Orbitron',letterSpacing:0.5,marginBottom:3}}>{s.l}</div>
            <div style={{fontSize:16,fontFamily:'Orbitron',color:s.c,fontWeight:700}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Sleep & Energy */}
      <Panel title="Sleep & Energy" color="#9B59B6">
        <NumInput label="SLEEP DURATION" k="sleepH" placeholder="7.5" unit="hrs"/>
        <Slider label="Morning energy" k="energyAM" emoji="🌅"/>
        <Slider label="Evening energy" k="energyPM" emoji="🌇"/>
      </Panel>

      {/* Nutrition */}
      <Panel title="Ahara — Nutrition" color="#00FF88">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <NumInput label="PROTEIN" k="proteinG" placeholder="80" unit="g"/>
          <NumInput label="FIBER" k="fiberG" placeholder="30" unit="g"/>
          <NumInput label="WATER" k="waterL" placeholder="2.5" unit="L"/>
          <NumInput label="VEGGIES" k="veggieServings" placeholder="5" unit="svgs"/>
        </div>
        <div style={{marginTop:4}}>
          <div style={{fontSize:10,color:'#3A6B7A',fontFamily:'Orbitron',letterSpacing:1,marginBottom:4}}>CREON DOSES TODAY</div>
          <Slider label="" k="creonDoses" min={0} max={8} emoji="💊"/>
        </div>
        {/* Target indicators */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginTop:4}}>
          {[
            {l:'Protein',v:+form.proteinG||0,t:80,u:'g'},
            {l:'Water',v:+form.waterL||0,t:2.5,u:'L'},
            {l:'Fiber',v:+form.fiberG||0,t:30,u:'g'},
            {l:'Veggies',v:+form.veggieServings||0,t:5,u:''},
          ].map(it=>{
            const pct = Math.min(100,Math.round((it.v/it.t)*100))
            return (
              <div key={it.l} style={{background:'rgba(0,0,0,0.3)',borderRadius:2,padding:'6px 6px'}}>
                <div style={{fontSize:8,color:'#2A5A6A',fontFamily:'Orbitron',marginBottom:3}}>{it.l}</div>
                <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,marginBottom:3}}>
                  <div style={{height:'100%',width:`${pct}%`,background:scoreColor(pct),borderRadius:2}}/>
                </div>
                <div style={{fontSize:9,color:scoreColor(pct),fontFamily:'Orbitron'}}>{it.v}/{it.t}{it.u}</div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Digestion */}
      <Panel title="Digestion Signals" color="#00D4FF">
        <Slider label="Gas level" k="gasLevel" emoji="💨"/>
        <Slider label="Bloating" k="bloating" emoji="🫧"/>
        <Slider label="Digestive comfort" k="digestComfort" emoji="🌿"/>
      </Panel>

      {/* Movement */}
      <Panel title="Vyayama — Movement" color="#FFB800">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <NumInput label="YOGA" k="yogaMins" placeholder="30" unit="mins"/>
          <NumInput label="STEPS" k="walkingSteps" placeholder="8000"/>
          <NumInput label="WEIGHT" k="weightKg" placeholder="65.5" unit="kg"/>
        </div>
        <div>
          <div style={{fontSize:10,color:'#3A6B7A',fontFamily:'Orbitron',letterSpacing:1,marginBottom:5}}>GYM SESSION</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
            {GYM_GROUPS.map(g=>(
              <div key={g} onClick={()=>set('gymGroup',g)} style={{
                padding:'6px 4px',textAlign:'center',cursor:'pointer',
                background:form.gymGroup===g?'rgba(255,184,0,0.12)':'rgba(0,0,0,0.2)',
                border:`1px solid ${form.gymGroup===g?'#FFB80060':'#00D4FF12'}`,
                borderRadius:2,fontSize:9,color:form.gymGroup===g?'#FFB800':'#2A5A6A',
                fontFamily:'Rajdhani',transition:'all .15s'}}>
                {g}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Habits */}
      <Panel title="Daily Habits" color="#00FF88">
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
          {HABITS.map(h=>{
            const done = form.habits[h]
            return (
              <div key={h} onClick={()=>toggleHabit(h)} style={{
                display:'flex',alignItems:'center',gap:8,padding:'8px 10px',cursor:'pointer',
                background:done?'rgba(0,255,136,0.07)':'rgba(0,0,0,0.2)',
                border:`1px solid ${done?'rgba(0,255,136,0.3)':'#00D4FF12'}`,
                borderRadius:2,transition:'all .15s'}}>
                <div style={{width:14,height:14,borderRadius:2,flexShrink:0,
                  border:`1px solid ${done?'#00FF88':'#1A3A4A'}`,
                  background:done?'rgba(0,255,136,0.2)':'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:9,color:'#00FF88'}}>{done?'✓':''}</div>
                <span style={{fontSize:11,color:done?'#B8E4F0':'#2A5A6A',fontFamily:'Rajdhani'}}>{h}</span>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Notes */}
      <Panel title="Symptoms & Notes" noclip>
        <textarea rows={2} placeholder="Any symptoms or observations today..."
          value={form.symptoms} onChange={e=>set('symptoms',e.target.value)}
          style={{width:'100%',background:'rgba(0,212,255,0.03)',border:'1px solid #00D4FF15',
            borderRadius:2,padding:'9px 10px',color:'#B8E4F0',fontSize:12,
            fontFamily:'Rajdhani',resize:'none',outline:'none',marginBottom:8}}/>
        <textarea rows={2} placeholder="Additional notes, how you felt..."
          value={form.notes} onChange={e=>set('notes',e.target.value)}
          style={{width:'100%',background:'rgba(0,212,255,0.03)',border:'1px solid #00D4FF15',
            borderRadius:2,padding:'9px 10px',color:'#B8E4F0',fontSize:12,
            fontFamily:'Rajdhani',resize:'none',outline:'none'}}/>
      </Panel>

      <OrbBtn label={saving?'SAVING...':'◈ SAVE TODAY\'S LOG'} onClick={save} disabled={saving} color="#00D4FF"/>
      <div style={{height:16}}/>
    </div>
  )
}

// ── DAY TRACKER TAB ────────────────────────────────────────────────────────────
function buildGrid(logs, period) {
  const today = new Date(); const days = []
  for (let i=period-1;i>=0;i--) {
    const d = new Date(today); d.setDate(d.getDate()-i)
    const dateStr = d.toISOString().slice(0,10)
    const log = logs.find(l=>l.date===dateStr)||null
    const sc = computeDayScore(log)
    days.push({
      dateStr,
      dayName: d.toLocaleDateString('en-IN',{weekday:'short'}).toUpperCase(),
      dateLabel: d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}).toUpperCase(),
      isToday: i===0, log, ...sc
    })
  }
  return days
}

function calcStreak(days) {
  let s=0; for(let i=days.length-1;i>=0;i--){ if(days[i].log&&days[i].overall>=40)s++; else break }; return s
}

function TrackTab({ logs }) {
  const [period, setPeriod] = useState(7)
  const [sel, setSel] = useState(null)
  const days = useMemo(()=>buildGrid(logs,period),[logs,period])
  const logged = days.filter(d=>d.log)
  const streak = calcStreak(days)
  const avgScore = logged.length?Math.round(logged.reduce((s,d)=>s+d.overall,0)/logged.length):0
  const selDay = sel?days.find(d=>d.dateStr===sel):days[days.length-1]

  const PILLARS = [
    {k:'food', e:'🍽️', l:'FOOD',  c:'#00FF88', target:'Protein 80g · Veggies 5svgs · Fiber 30g'},
    {k:'water',e:'💧', l:'WATER', c:'#00D4FF', target:'2.5L daily — liver flush + lymph'},
    {k:'yoga', e:'🧘', l:'YOGA',  c:'#FFB800', target:'45 mins — NK cell activation + pranayama'},
    {k:'gym',  e:'💪', l:'GYM',   c:'#FF7EB3', target:'8000 steps + strength session'},
  ]

  // Period stats
  const goalHits = {
    protein: logged.filter(d=>(+d.log?.proteinG||0)>=80).length,
    water:   logged.filter(d=>(+d.log?.waterL||0)>=2.5).length,
    yoga:    logged.filter(d=>(+d.log?.yogaMins||0)>=30).length,
    steps:   logged.filter(d=>(+d.log?.walkingSteps||0)>=8000).length,
    sleep:   logged.filter(d=>(+d.log?.sleepH||0)>=7).length,
  }
  const half=Math.floor(logged.length/2)
  const avg1=half?Math.round(logged.slice(0,half).reduce((s,d)=>s+d.overall,0)/half):0
  const avg2=logged.slice(half).length?Math.round(logged.slice(half).reduce((s,d)=>s+d.overall,0)/logged.slice(half).length):0
  const trend=avg2>avg1+3?'↑':avg2<avg1-3?'↓':'→'
  const trendC=avg2>avg1+3?'#00FF88':avg2<avg1-3?'#FF3B3B':'#FFB800'

  return (
    <div className="fade-slide">
      {/* Period selector */}
      <div style={{display:'flex',gap:6,marginBottom:12,alignItems:'center'}}>
        <span style={{fontSize:9,color:'#1A3A4A',fontFamily:'Orbitron',letterSpacing:1}}>VIEW:</span>
        {[7,15,30].map(p=>(
          <button key={p} onClick={()=>{setPeriod(p);setSel(null)}} style={{
            padding:'7px 16px',background:period===p?'rgba(0,212,255,0.1)':'transparent',
            border:`1px solid ${period===p?'rgba(0,212,255,0.45)':'#00D4FF15'}`,
            color:period===p?'#00D4FF':'#1A3A4A',fontFamily:'Orbitron',fontSize:10,
            letterSpacing:1,cursor:'pointer',borderRadius:2,transition:'all .15s'}}>
            {p}D
          </button>
        ))}
        <div style={{marginLeft:'auto',fontSize:9,color:'#1A3A4A',fontFamily:'Orbitron'}}>
          TAP DAY FOR DETAIL
        </div>
      </div>

      {/* Summary stats */}
      {logged.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:11}}>
          {[
            {l:'AVG SCORE',v:avgScore,u:'/100',c:scoreColor(avgScore)},
            {l:'STREAK',v:`${streak}🔥`,u:'',c:streak>=5?'#00FF88':'#FFB800'},
            {l:'LOGGED',v:`${logged.length}/${period}`,u:'',c:logged.length>=period*0.7?'#00FF88':'#FFB800'},
            {l:'TREND',v:trend,u:'',c:trendC},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(0,180,255,0.04)',border:'1px solid #00D4FF15',
              borderRadius:2,padding:'9px 6px',textAlign:'center'}}>
              <div style={{fontSize:7,color:'#1A3A4A',fontFamily:'Orbitron',letterSpacing:0.5,marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:16,fontFamily:'Orbitron',color:s.c,fontWeight:700}}>{s.v}{s.u}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pillar averages */}
      {logged.length>0&&(
        <Panel title={`Pillar Averages — ${period} Days`} noclip>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {PILLARS.map(p=>{
              const avg = Math.round(logged.reduce((s,d)=>s+d[p.k],0)/logged.length)
              return (
                <div key={p.k} style={{textAlign:'center'}}>
                  <div style={{fontSize:11,marginBottom:4}}>{p.e}</div>
                  <div style={{fontSize:9,color:'#1A3A4A',fontFamily:'Orbitron',marginBottom:5}}>{p.l}</div>
                  <div style={{fontSize:18,fontFamily:'Orbitron',color:p.c,fontWeight:700,marginBottom:5}}>{avg}</div>
                  <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${avg}%`,background:p.c,borderRadius:2,
                      boxShadow:`0 0 5px ${p.c}70`}}/>
                  </div>
                  <div style={{fontSize:7,color:'#0D2A3A',fontFamily:'Orbitron',marginTop:4,lineHeight:1.4}}>{p.target}</div>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {/* Goal achievement */}
      {logged.length>0&&(
        <Panel title="Recovery Goal Achievement" color="#00FF88" noclip>
          {[
            {l:'Protein ≥ 80g/day',h:goalHits.protein,i:'🥩',w:'Mamsa Dhatu rebuild — muscle = cancer armor'},
            {l:'Water ≥ 2.5L/day', h:goalHits.water,  i:'💧',w:'Post-radiation liver flush + lymph clearance'},
            {l:'Yoga ≥ 30 mins',   h:goalHits.yoga,   i:'🧘',w:'NK cell +30% — primary cancer surveillance'},
            {l:'Steps ≥ 8000',     h:goalHits.steps,  i:'🚶',w:'Every 1000 steps = 8% recurrence reduction'},
            {l:'Sleep ≥ 7h',       h:goalHits.sleep,  i:'😴',w:'Growth hormone + p53 tumour suppressor peak'},
          ].map((g,i)=>{
            const pct=Math.round((g.h/Math.max(1,logged.length))*100)
            return (
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:11,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{g.i} {g.l}</span>
                  <span style={{fontSize:11,fontFamily:'Orbitron',color:scoreColor(pct)}}>{g.h}/{logged.length}</span>
                </div>
                <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,marginBottom:3}}>
                  <div style={{height:'100%',width:`${pct}%`,background:scoreColor(pct),borderRadius:2,
                    boxShadow:`0 0 5px ${scoreColor(pct)}70`,transition:'width 1s ease'}}/>
                </div>
                <div style={{fontSize:8,color:'#1A3A4A',fontFamily:'Rajdhani'}}>🪷 {g.w}</div>
              </div>
            )
          })}
        </Panel>
      )}

      {/* Day grid */}
      <div style={{marginBottom:12}}>
        {/* Column headers */}
        <div style={{display:'flex',gap:8,padding:'0 10px 6px',
          fontSize:8,color:'#1A3A4A',fontFamily:'Orbitron',letterSpacing:0.5}}>
          <div style={{width:52}}>DATE</div>
          <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
            <span>🍽️</span><span>💧</span><span>🧘</span><span>💪</span>
          </div>
          <div style={{width:42,textAlign:'center'}}>SCORE</div>
        </div>

        {days.map(day=>(
          <div key={day.dateStr} onClick={()=>setSel(day.dateStr===sel?null:day.dateStr)}
            style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',
              background:selDay?.dateStr===day.dateStr?'rgba(0,212,255,0.07)':day.log?'rgba(0,180,255,0.02)':'rgba(0,0,0,0.15)',
              border:`1px solid ${selDay?.dateStr===day.dateStr?'rgba(0,212,255,0.35)':day.isToday?'rgba(0,212,255,0.18)':'#00D4FF08'}`,
              borderRadius:2,marginBottom:4,cursor:'pointer',transition:'all .15s',
              opacity:day.log?1:0.38}}>
            <div style={{width:52,flexShrink:0}}>
              <div style={{fontSize:9,fontFamily:'Orbitron',color:day.isToday?'#00D4FF':'#1A3A4A',letterSpacing:0.5}}>{day.dayName}</div>
              <div style={{fontSize:9,fontFamily:'Rajdhani',color:day.isToday?'#00D4FF':'#0D2A3A',marginTop:1}}>{day.dateLabel}</div>
              {day.isToday&&<div style={{fontSize:7,color:'#00FF88',fontFamily:'Orbitron',marginTop:1}}>TODAY</div>}
            </div>
            <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {['food','water','yoga','gym'].map((k,ki)=>{
                const c=['#00FF88','#00D4FF','#FFB800','#FF7EB3'][ki]
                return (
                  <div key={k}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:8,color:'#1A3A4A'}}>—</span>
                      <span style={{fontSize:9,fontFamily:'Orbitron',color:day.log?c:'#0D2A3A'}}>{day.log?day[k]:'–'}</span>
                    </div>
                    <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2}}>
                      {day.log&&<div style={{height:'100%',width:`${day[k]}%`,background:c,borderRadius:2,boxShadow:`0 0 3px ${c}60`}}/>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{width:42,textAlign:'center',flexShrink:0}}>
              {day.log?(
                <div style={{fontSize:15,fontFamily:'Orbitron',color:scoreColor(day.overall),fontWeight:700}}>{day.overall}</div>
              ):<div style={{fontSize:11,color:'#0D2A3A',fontFamily:'Orbitron'}}>–</div>}
            </div>
          </div>
        ))}
      </div>

      {/* No data */}
      {logged.length===0&&(
        <div style={{textAlign:'center',padding:'30px 16px',background:'rgba(0,180,255,0.03)',
          border:'1px solid #00D4FF12',borderRadius:2,marginBottom:12}}>
          <div style={{fontSize:36,marginBottom:10}}>📋</div>
          <div style={{fontSize:12,fontFamily:'Orbitron',color:'#00D4FF',marginBottom:8}}>NO DATA YET</div>
          <div style={{fontSize:11,color:'#1A3A4A',fontFamily:'Rajdhani',lineHeight:1.8}}>
            Go to the LOG tab and fill in today's data.<br/>
            Your recovery journey becomes visible with data.
          </div>
        </div>
      )}

      {/* Selected day detail */}
      {selDay&&selDay.log&&(
        <div>
          <div style={{fontSize:9,color:'#2A5A6A',fontFamily:'Orbitron',letterSpacing:1,marginBottom:8}}>
            ◈ {selDay.dayName} {selDay.dateLabel} — DETAIL
          </div>
          {/* Scores */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:10}}>
            {[
              {l:'FOOD',v:selDay.food,c:'#00FF88'},
              {l:'WATER',v:selDay.water,c:'#00D4FF'},
              {l:'YOGA',v:selDay.yoga,c:'#FFB800'},
              {l:'GYM',v:selDay.gym,c:'#FF7EB3'},
              {l:'OVERALL',v:selDay.overall,c:scoreColor(selDay.overall)},
            ].map(s=>(
              <div key={s.l} style={{background:`${s.c}10`,border:`1px solid ${s.c}25`,
                borderRadius:2,padding:'8px 4px',textAlign:'center'}}>
                <div style={{fontSize:7,color:'#1A3A4A',fontFamily:'Orbitron',marginBottom:2}}>{s.l}</div>
                <div style={{fontSize:17,fontFamily:'Orbitron',color:s.c,fontWeight:700}}>{s.v}</div>
              </div>
            ))}
          </div>
          {/* Metrics */}
          <Panel noclip>
            {[
              {l:'Sleep',v:`${selDay.log.sleepH||0}h`,t:'7.5h',pct:Math.min(100,Math.round((+selDay.log.sleepH||0)/7.5*100))},
              {l:'Protein',v:`${selDay.log.proteinG||0}g`,t:'80g',pct:Math.min(100,Math.round((+selDay.log.proteinG||0)/80*100))},
              {l:'Water',v:`${selDay.log.waterL||0}L`,t:'2.5L',pct:Math.min(100,Math.round((+selDay.log.waterL||0)/2.5*100))},
              {l:'Yoga',v:`${selDay.log.yogaMins||0}min`,t:'45min',pct:Math.min(100,Math.round((+selDay.log.yogaMins||0)/45*100))},
              {l:'Steps',v:`${(+selDay.log.walkingSteps||0).toLocaleString()}`,t:'8000',pct:Math.min(100,Math.round((+selDay.log.walkingSteps||0)/8000*100))},
              {l:'Energy AM',v:`${selDay.log.energyAM||0}/10`,t:'7/10',pct:Math.min(100,Math.round((+selDay.log.energyAM||0)/10*100))},
              {l:'Digest',v:`${selDay.log.digestComfort||0}/10`,t:'8/10',pct:Math.min(100,Math.round((+selDay.log.digestComfort||0)/10*100))},
              {l:'CREON',v:`${selDay.log.creonDoses||0}`,t:'3+',pct:Math.min(100,Math.round((+selDay.log.creonDoses||0)/3*100))},
            ].map((it,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',
                borderBottom:i<7?'1px solid rgba(0,212,255,0.06)':'none'}}>
                <div style={{width:70,fontSize:10,color:'#2A5A6A',fontFamily:'Rajdhani',flexShrink:0}}>{it.l}</div>
                <div style={{flex:1,height:4,background:'rgba(255,255,255,0.05)',borderRadius:2}}>
                  <div style={{height:'100%',width:`${it.pct}%`,background:scoreColor(it.pct),borderRadius:2}}/>
                </div>
                <div style={{fontSize:10,fontFamily:'Orbitron',color:scoreColor(it.pct),width:60,textAlign:'right'}}>{it.v}</div>
                <div style={{fontSize:8,color:'#1A3A4A',fontFamily:'Orbitron',width:36,textAlign:'right'}}>/{it.t}</div>
              </div>
            ))}
          </Panel>
          {/* Gym & habits */}
          {selDay.log.gymGroup&&selDay.log.gymGroup!=='None today'&&(
            <div style={{fontSize:11,color:'#FFB800',fontFamily:'Orbitron',marginBottom:8}}>
              💪 GYM: {selDay.log.gymGroup}
            </div>
          )}
          {Object.entries(selDay.log.habits||{}).filter(([,v])=>v).length>0&&(
            <Panel noclip>
              <div style={{fontSize:9,color:'#2A5A6A',fontFamily:'Orbitron',letterSpacing:1,marginBottom:7}}>◈ HABITS COMPLETED</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {Object.entries(selDay.log.habits||{}).filter(([,v])=>v).map(([h])=>(
                  <span key={h} style={{background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.25)',
                    color:'#00FF88',padding:'3px 8px',fontSize:10,fontFamily:'Rajdhani',borderRadius:2}}>✓ {h}</span>
                ))}
              </div>
            </Panel>
          )}
          {selDay.log.symptoms&&(
            <Panel color="#FF3B3B" noclip>
              <div style={{fontSize:9,color:'#FF3B3B',fontFamily:'Orbitron',marginBottom:4}}>⚠ SYMPTOMS</div>
              <div style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{selDay.log.symptoms}</div>
            </Panel>
          )}
          {selDay.log.notes&&(
            <Panel noclip>
              <div style={{fontSize:9,color:'#2A5A6A',fontFamily:'Orbitron',marginBottom:4}}>◈ NOTES</div>
              <div style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{selDay.log.notes}</div>
            </Panel>
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
export default function JarvisHealth({ user, onLogout }) {
  const uid       = user.uid
  const userEmail = user.email

  const [tab,            setTab           ] = useState('home')
  const [db,             setDb            ] = useState({})
  const [appReady,       setAppReady      ] = useState(false)
  const [toast,          setToast         ] = useState('')
  const [voiceText,      setVoiceText     ] = useState('')
  const [jarvisMsg,      setJarvisMsg     ] = useState('All systems nominal. How may I assist you today?')
  const [aiLoading,      setAiLoading     ] = useState(false)
  const [allLogs,        setAllLogs       ] = useState([])

  // Food
  const [foodImg,        setFoodImg       ] = useState(null)
  const [foodImgData,    setFoodImgData   ] = useState(null)
  const [foodResult,     setFoodResult    ] = useState(null)
  // Blood
  const [bloodImg,       setBloodImg      ] = useState(null)
  const [bloodImgData,   setBloodImgData  ] = useState(null)
  const [bloodMode,      setBloodMode     ] = useState('photo')
  const [bloodText,      setBloodText     ] = useState('')
  const [bloodResult,    setBloodResult   ] = useState(null)
  // Fitness
  const [fitnessType,    setFitnessType   ] = useState('yoga')
  const [fitnessPhase,   setFitnessPhase  ] = useState('1')
  const [fitnessPlan,    setFitnessPlan   ] = useState(null)
  // Recovery
  const [recoveryTopic,  setRecoveryTopic ] = useState(null)
  const [recoveryResult, setRecoveryResult] = useState(null)
  // Chat
  const [chatMsgs,       setChatMsgs      ] = useState([
    {role:'assistant',content:"Good day, sir. I am JARVIS — your personal health intelligence system.\n\nI know your complete health profile and recovery journey. Ask me anything:\n\n• \"What should I eat today?\"\n• \"I feel tired, what to do?\"\n• \"How to grow my hair faster?\"\n• \"Give me today's full schedule\"\n\nI am here 24/7. How may I assist you?"}
  ])
  const [chatInput,      setChatInput     ] = useState('')

  const foodFileRef  = useRef()
  const bloodFileRef = useRef()
  const chatBottom   = useRef()

  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    async function load() {
      const today = new Date().toISOString().slice(0,10)
      const [food,blood,guides,plans,chat,intols,daily] = await Promise.all([
        getFoodLogs(uid), getBloodReports(uid), getGuides(uid),
        getPlans(uid), getChat(uid), getIntolerances(uid), getDailyLog(uid,today)
      ])
      // Load last 30 daily logs for tracker
      const logPromises = []
      for (let i=1;i<=30;i++) {
        const d=new Date(); d.setDate(d.getDate()-i)
        logPromises.push(getDailyLog(uid, d.toISOString().slice(0,10)))
      }
      const pastLogs = await Promise.all(logPromises)
      const logsWithDates = pastLogs.map((l,i)=>{
        if (!l||!Object.keys(l).length) return null
        const d=new Date(); d.setDate(d.getDate()-(i+1))
        return {...l, date: d.toISOString().slice(0,10)}
      }).filter(Boolean)

      const todayLog = daily&&Object.keys(daily).length?{...daily,date:today}:null
      const allLogsArr = todayLog?[todayLog,...logsWithDates]:logsWithDates
      setAllLogs(allLogsArr)

      setDb({foodLogs:food,bloodReports:blood,recoveryGuides:guides,
        fitnessPlans:plans,intolerances:intols,
        todayChecks:daily?.checks||{},
        todayLog: todayLog
      })
      if (chat.length) setChatMsgs(chat)
      setAppReady(true)
    }
    load().catch(e=>{ console.error(e); setAppReady(true) })
  },[uid])

  useEffect(()=>{ chatBottom.current?.scrollIntoView({behavior:'smooth'}) },[chatMsgs])

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),3000) }

  // ── Voice ─────────────────────────────────────────────────────────────────────
  function handleVoiceCommand(tabTarget, text) {
    if (tabTarget) { setTab(tabTarget); speak(`Switching to ${tabTarget} module, sir.`) }
    else { setTab('coach'); sendChat(text) }
  }
  const {listening, supported, startListening, stopListening} = useVoice(
    handleVoiceCommand, t=>{ setVoiceText(t); setTimeout(()=>setVoiceText(''),4000) }
  )

  // ── Food scan ─────────────────────────────────────────────────────────────────
  async function scanFood() {
    if (!foodImgData) return
    setAiLoading(true); setFoodResult(null)
    const intols = db.intolerances||[]
    try {
      const resp = await askJarvis([{
        role:'user', content:[
          {type:'image',source:{type:'base64',media_type:'image/jpeg',data:foodImgData}},
          {type:'text',text:`Analyze this meal for my cancer recovery diet as JARVIS.${intols.length?` Known intolerances: ${intols.join(', ')}.`:''}
Format exactly:
VERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]
SCORE: [1-10]
ANALYSIS: [Foods identified]
BENEFITS: [Recovery benefits]
CONCERNS: [Issues for pancreatic recovery]
ENZYME NOTE: [PERT needed? Fat level?]
IMPROVE IT: [Make it better]
INTOLERANCE FLAG: [Problem foods or NONE]`}
        ]
      }],'Speak as JARVIS.',userEmail)
      const verdict = resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase()||'acceptable'
      const score   = parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1]||'5')
      const flagMatch = resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
      const flagged = flagMatch&&flagMatch[1].trim().toUpperCase()!=='NONE'?flagMatch[1].split(',').map(s=>s.trim()).filter(Boolean):[]
      const entry = {id:Date.now(),date:new Date().toLocaleDateString('en-IN'),verdict,score,analysis:resp,flagged}
      await saveFoodLog(uid,entry)
      for (const food of flagged) await saveIntolerance(uid,food)
      setDb(prev=>({...prev,foodLogs:[entry,...(prev.foodLogs||[])].slice(0,50),intolerances:[...new Set([...(prev.intolerances||[]),...flagged])]}))
      setFoodResult(entry)
      const msg=verdict==='optimal'?`Excellent choice, sir. Score ${score} of 10.`:verdict==='acceptable'?`Acceptable meal. Score is ${score}.`:`Inadvisable, sir. Score only ${score}.`
      speak(msg); setJarvisMsg(msg)
      if (flagged.length) showToast(`⚠ Intolerance logged: ${flagged.join(', ')}`)
    } catch(e) { setFoodResult({analysis:`Error: ${e.message}`,verdict:'acceptable',score:0,flagged:[]}) }
    setAiLoading(false)
  }

  // ── Blood ─────────────────────────────────────────────────────────────────────
  async function analyzeBlood(manual=false) {
    setAiLoading(true); setBloodResult(null)
    try {
      const msgs = manual
        ?[{role:'user',content:`Analyze these blood values as JARVIS:\n${bloodText}\n\nCover: SUMMARY, KEY MARKERS, CANCER MARKERS (CA 19-9 critical), LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY PROTOCOL, ENCOURAGING NOTE.`}]
        :[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:bloodImgData}},{type:'text',text:'Analyze this blood report as JARVIS. Cover: SUMMARY, KEY MARKERS, CA 19-9 priority, LIVER, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY PROTOCOL, ENCOURAGING NOTE.'}]}]
      const resp = await askJarvis(msgs,'Be thorough and precise.',userEmail)
      const entry={id:Date.now(),date:new Date().toLocaleDateString('en-IN'),summary:resp.slice(0,200),full:resp}
      await saveBloodReport(uid,entry)
      setDb(prev=>({...prev,bloodReports:[...(prev.bloodReports||[]),entry]}))
      setBloodResult(entry)
      speak('Analysis complete, sir. Review my full assessment.')
      setJarvisMsg('Blood report analyzed.')
    } catch(e){ setBloodResult({full:`Error: ${e.message}`}) }
    setAiLoading(false)
  }

  // ── Fitness ───────────────────────────────────────────────────────────────────
  async function generateFitness() {
    setAiLoading(true); setFitnessPlan(null)
    try {
      const resp = await askJarvis([{role:'user',content:`Generate Phase ${fitnessPhase} ${fitnessType==='yoga'?'Yoga and Breathing':'Strength Training'} protocol for my cancer recovery as JARVIS. Be specific with exercises, sets, reps, durations, and recovery-specific modifications. Phase 1=Weeks 1-6 gentle, Phase 2=Weeks 7-16 moderate, Phase 3=Month 4+ progressive. Include safety rules.`}],'',userEmail)
      const key=fitnessType+fitnessPhase
      await savePlan(uid,key,resp)
      setDb(prev=>({...prev,fitnessPlans:{...(prev.fitnessPlans||{}),[key]:resp}}))
      setFitnessPlan(resp)
      speak(`Phase ${fitnessPhase} ${fitnessType} protocol ready, sir.`)
    } catch(e){ setFitnessPlan(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  // ── Recovery ──────────────────────────────────────────────────────────────────
  const recoveryPrompts = {
    sperm:'Provide a complete sperm count recovery and fertility restoration protocol after chemotherapy as JARVIS. Cover supplements with doses, timeline, foods, tests to track, realistic expectations for becoming a father.',
    hair:'Provide a complete hair regrowth protocol post-chemotherapy as JARVIS. Cover timeline, scalp care, oils, supplements, foods, month-by-month expectations.',
    eyebrow:'Provide complete eyebrow and eyelash regrowth protocol post-chemo as JARVIS. Cover serums, castor oil, massage, supplements, timeline.',
    appearance:'As JARVIS, provide complete guide to looking and feeling normal again after cancer. Cover weight gain, skin restoration, hair, energy, confidence.',
    complete:'As JARVIS, provide the complete roadmap to full permanent disease-free vibrant health. Cover all phases, milestones, longevity, mental recovery.',
    immunity:'As JARVIS, provide complete post-chemotherapy immunity rebuilding protocol. Specific foods, supplements, sleep, lab markers.',
    energy:'As JARVIS, provide complete natural energy restoration post-chemo. Adrenal recovery, mitochondrial healing, sleep, blood sugar stability.',
    digestion:'As JARVIS, provide complete gut healing protocol after partial pancreatectomy and chemo. PERT optimization, gut lining repair, microbiome.',
  }
  async function getRecoveryGuide(topic) {
    setRecoveryTopic(topic)
    if (db.recoveryGuides?.[topic]) { setRecoveryResult(db.recoveryGuides[topic]); return }
    setAiLoading(true); setRecoveryResult(null)
    try {
      const resp=await askJarvis([{role:'user',content:recoveryPrompts[topic]}],'',userEmail)
      await saveGuide(uid,topic,resp)
      setDb(prev=>({...prev,recoveryGuides:{...(prev.recoveryGuides||{}),[topic]:resp}}))
      setRecoveryResult(resp)
      speak(`Your ${topic} recovery protocol is ready, sir.`)
    } catch(e){ setRecoveryResult(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────
  async function sendChat(overrideText=null) {
    const text=overrideText||chatInput.trim(); if(!text)return
    const userMsg={role:'user',content:text}
    const newMsgs=[...chatMsgs,userMsg]
    setChatMsgs(newMsgs); setChatInput(''); setAiLoading(true)
    await saveChat(uid,'user',text)
    try {
      const todayScores = computeDayScore(db.todayLog)
      const context=`Food intolerances: ${(db.intolerances||[]).join(', ')||'none'}. Today's score: ${todayScores.overall}/100. Speak as JARVIS throughout.`
      const resp=await askJarvis(newMsgs.map(m=>({role:m.role,content:m.content})),context,userEmail)
      const aiMsg={role:'assistant',content:resp}
      setChatMsgs([...newMsgs,aiMsg])
      await saveChat(uid,'assistant',resp)
      speak(resp.slice(0,300)); setJarvisMsg(resp.slice(0,100))
    } catch(e){ setChatMsgs([...newMsgs,{role:'assistant',content:`System error: ${e.message}`}]) }
    setAiLoading(false)
  }

  // ── Daily checklist ───────────────────────────────────────────────────────────
  async function toggleCheck(i) {
    const newChecks={...(db.todayChecks||{}),[i]:!(db.todayChecks||{})[i]}
    setDb(prev=>({...prev,todayChecks:newChecks}))
    const today=new Date().toISOString().slice(0,10)
    await saveDailyLog(uid,today,{checks:newChecks})
  }

  const vColor={optimal:'#00FF88',acceptable:'#FFB800',inadvisable:'#FF3B3B'}
  const vIcon ={optimal:'✓',acceptable:'!',inadvisable:'✗'}

  const TABS = [
    {id:'home',    icon:'⬡', label:'CORE'},
    {id:'log',     icon:'✦', label:'LOG'},
    {id:'track',   icon:'◫', label:'TRACK'},
    {id:'food',    icon:'◈', label:'FOOD'},
    {id:'blood',   icon:'◉', label:'LAB'},
    {id:'fitness', icon:'◎', label:'FIT'},
    {id:'recovery',icon:'◆', label:'HEAL'},
    {id:'coach',   icon:'◐', label:'AI'},
  ]

  const RECOVERY_TOPICS = [
    {id:'sperm',     icon:'🌱',label:'Sperm & Fertility', color:'#00D4FF'},
    {id:'hair',      icon:'✨',label:'Hair Regrowth',      color:'#FFB800'},
    {id:'eyebrow',   icon:'👁️',label:'Eyebrow & Lash',    color:'#9B59B6'},
    {id:'appearance',icon:'🌟',label:'Look Normal Again',  color:'#00FF88'},
    {id:'complete',  icon:'🏆',label:'Full Recovery Map',  color:'#FF6B35'},
    {id:'immunity',  icon:'🛡️',label:'Rebuild Immunity',   color:'#00D4FF'},
    {id:'energy',    icon:'⚡',label:'Natural Energy',     color:'#FFB800'},
    {id:'digestion', icon:'🌿',label:'Fix Digestion',      color:'#00FF88'},
  ]

  const PROTOCOL=[
    '🍋 Lemon water on waking','💊 PERT enzymes with every meal',
    '🌿 Ash gourd juice (200ml)','🌾 Amla powder (1 tsp)',
    '🚶 Morning walk (30 min)','🌬️ Pranayama (10 min)',
    '🥛 Mid-morning protein snack','💧 2.5–3L water today',
    '💪 Yoga / gym session','✨ Golden milk before bed','😴 In bed by 10pm',
  ]

  const TICKER=['SYSTEM NOMINAL','REMISSION: ACTIVE','CA 19-9 MONITORING',
    'RECOVERY PROTOCOL ENGAGED','ENZYME COMPLIANCE REQUIRED','HYDRATION: 3L/DAY',
    'AYURVEDA + ONCOLOGY INTELLIGENCE']

  const todayScores = computeDayScore(db.todayLog)

  if (!appReady) return (
    <div style={{minHeight:'100vh',background:'#020C1B',display:'flex',
      flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
      <style>{STYLES}</style>
      <div style={{width:34,height:34,border:'2px solid #00D4FF18',borderTop:'2px solid #00D4FF',
        borderRadius:'50%',animation:'rotate 0.8s linear infinite'}}/>
      <div style={{fontSize:10,color:'#0D2A3A',fontFamily:'Orbitron',letterSpacing:2}}>LOADING...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#020C1B',fontFamily:'Rajdhani,sans-serif',
      color:'#B8E4F0',maxWidth:430,margin:'0 auto',
      paddingBottom:tab==='coach'?0:90,position:'relative',overflow:'hidden'}}>
      <style>{STYLES}</style>
      <HexGrid/>

      {toast&&(
        <div className="fade-slide" style={{position:'fixed',top:12,left:'50%',
          transform:'translateX(-50%)',background:'rgba(0,212,255,0.12)',
          border:'1px solid #00D4FF40',color:'#00D4FF',padding:'7px 16px',
          fontSize:10,fontFamily:'Orbitron',letterSpacing:1,zIndex:9999,whiteSpace:'nowrap'}}>
          ◆ {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{position:'sticky',top:0,zIndex:50,
        background:'rgba(2,12,27,0.97)',backdropFilter:'blur(20px)',
        borderBottom:'1px solid #00D4FF12',padding:'7px 12px'}}>
        {/* Ticker */}
        <div style={{overflow:'hidden',height:14,marginBottom:5}}>
          <div style={{display:'flex',gap:32,whiteSpace:'nowrap',opacity:0.4}}>
            {TICKER.map((t,i)=>(
              <span key={i} style={{fontSize:8,fontFamily:'Rajdhani',color:'#00D4FF',letterSpacing:1}}>◆ {t}</span>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <ArcReactor listening={listening} supported={supported}
            onClick={listening?stopListening:startListening}/>
          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontSize:14,fontFamily:'Orbitron',fontWeight:900,color:'#00D4FF',
              letterSpacing:3,textShadow:'0 0 10px #00D4FF50'}}>J.A.R.V.I.S</div>
            <div style={{fontSize:9,color:'#1A3A4A',letterSpacing:0.5,marginTop:1}}>HEALTH INTELLIGENCE · ACTIVE</div>
            <div style={{fontSize:10,color:listening?'#00FF88':'#00D4FF60',
              marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',transition:'color 0.3s'}}>
              {listening?<span className="blink">● LISTENING...</span>:voiceText?`"${voiceText}"`:jarvisMsg}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,flexShrink:0}}>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#00FF88',boxShadow:'0 0 5px #00FF88'}}/>
              <span style={{fontSize:7,color:'#00FF88',fontFamily:'Orbitron',letterSpacing:1}}>ONLINE</span>
            </div>
            {/* Today's live score */}
            {db.todayLog&&(
              <div style={{fontSize:9,fontFamily:'Orbitron',color:scoreColor(todayScores.overall)}}>
                {todayScores.overall}/100
              </div>
            )}
            <button onClick={onLogout} style={{fontSize:7,color:'#FF3B3B20',background:'none',
              border:'none',cursor:'pointer',fontFamily:'Orbitron',letterSpacing:1}}>
              LOGOUT
            </button>
          </div>
        </div>
        {supported&&(
          <div style={{marginTop:4,fontSize:8,color:'#0D2A3A',fontFamily:'Rajdhani',letterSpacing:0.3}}>
            🎤 Say: "log today" · "show track" · "scan food" · "blood report" · "yoga" · "I feel tired"
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div style={{position:'relative',zIndex:1,padding:'10px 12px'}}>

        {/* ════ HOME ════ */}
        {tab==='home'&&(
          <div className="fade-slide">
            {/* Mission status */}
            <Panel title="Mission Status" color="#00FF88">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div>
                  <div style={{fontSize:20,fontFamily:'Orbitron',fontWeight:900,color:'#00FF88',letterSpacing:1}}>REMISSION</div>
                  <div style={{fontSize:10,color:'#1A3A4A',marginTop:2}}>PET-CT CLEAR · PROTOCOL ACTIVE</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:8,color:'#1A3A4A'}}>CA 19-9 GOAL</div>
                  <div style={{fontSize:20,fontFamily:'Orbitron',color:'#FFB800',fontWeight:700}}>~6</div>
                  <div style={{fontSize:8,color:'#1A3A4A'}}>U/mL</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                {[{l:'PET-CT',v:'CLEAR ✓',c:'#00FF88'},{l:'CHEMO',v:'DONE ✓',c:'#00D4FF'},{l:'SURGERY',v:'DONE ✓',c:'#00D4FF'}].map(s=>(
                  <div key={s.l} style={{background:`${s.c}08`,border:`1px solid ${s.c}20`,padding:'6px 4px',textAlign:'center'}}>
                    <div style={{fontSize:7,color:'#1A3A4A',letterSpacing:0.5,fontFamily:'Orbitron'}}>{s.l}</div>
                    <div style={{fontSize:9,fontFamily:'Orbitron',color:s.c,marginTop:3,fontWeight:700}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Today's score if logged */}
            {db.todayLog&&(
              <Panel title="Today's Recovery Score" color="#00D4FF">
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:10}}>
                  {[
                    {l:'FOOD', v:todayScores.food,  c:'#00FF88'},
                    {l:'WATER',v:todayScores.water, c:'#00D4FF'},
                    {l:'YOGA', v:todayScores.yoga,  c:'#FFB800'},
                    {l:'GYM',  v:todayScores.gym,   c:'#FF7EB3'},
                    {l:'TOTAL',v:todayScores.overall,c:scoreColor(todayScores.overall)},
                  ].map(s=>(
                    <div key={s.l} style={{textAlign:'center'}}>
                      <div style={{fontSize:7,color:'#1A3A4A',fontFamily:'Orbitron',marginBottom:4}}>{s.l}</div>
                      <div style={{fontSize:18,fontFamily:'Orbitron',color:s.c,fontWeight:700}}>{s.v}</div>
                      <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,marginTop:4}}>
                        <div style={{height:'100%',width:`${s.v}%`,background:s.c,borderRadius:2}}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:10,color:'#1A3A4A',fontFamily:'Rajdhani',textAlign:'center'}}>
                  Tap <span style={{color:'#00D4FF',fontFamily:'Orbitron',fontSize:8}}>LOG</span> tab to update · <span style={{color:'#00D4FF',fontFamily:'Orbitron',fontSize:8}}>TRACK</span> tab for history
                </div>
              </Panel>
            )}

            {!db.todayLog&&(
              <div onClick={()=>setTab('log')} style={{
                background:'rgba(0,212,255,0.05)',border:'1px solid rgba(0,212,255,0.2)',
                borderRadius:2,padding:'14px',marginBottom:11,textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:22,marginBottom:6}}>📋</div>
                <div style={{fontSize:12,fontFamily:'Orbitron',color:'#00D4FF',marginBottom:4}}>LOG TODAY'S DATA</div>
                <div style={{fontSize:11,color:'#1A3A4A',fontFamily:'Rajdhani'}}>
                  Tap here to record today's food, water, yoga, gym<br/>and track your recovery journey
                </div>
              </div>
            )}

            {/* Recovery systems */}
            <Panel title="Recovery Systems">
              {[
                {l:'Immunity Rebuild',  pct:45,c:'#00D4FF'},
                {l:'Digestive Function',pct:52,c:'#00FF88'},
                {l:'Muscle Mass',       pct:35,c:'#FFB800'},
                {l:'Hair Regrowth',     pct:28,c:'#9B59B6'},
                {l:'Fertility Recovery',pct:32,c:'#FF6B35'},
                {l:'Energy Level',      pct:todayScores.overall||58,c:'#00D4FF'},
              ].map(s=>(
                <div key={s.l} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{s.l}</span>
                    <span style={{fontSize:10,fontFamily:'Orbitron',color:s.c}}>{s.pct}%</span>
                  </div>
                  <div style={{height:3,background:'rgba(255,255,255,0.04)',borderRadius:1}}>
                    <div style={{height:'100%',width:`${s.pct}%`,background:s.c,
                      borderRadius:1,boxShadow:`0 0 5px ${s.c}50`,transition:'width 1.5s ease'}}/>
                  </div>
                </div>
              ))}
            </Panel>

            {/* Food intolerances */}
            {(db.intolerances||[]).length>0&&(
              <Panel title="⚠ Food Intolerances" color="#FF3B3B">
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {db.intolerances.map((f,i)=>(
                    <span key={i} style={{background:'#FF3B3B12',border:'1px solid #FF3B3B28',
                      color:'#FF3B3B',padding:'2px 9px',fontSize:11,fontFamily:'Rajdhani',borderRadius:2}}>
                      {f}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {/* Protocol checklist */}
            <Panel title="Today's Protocol" color="#FFB800">
              {PROTOCOL.map((item,i)=>{
                const done=(db.todayChecks||{})[i]
                return (
                  <div key={i} onClick={()=>toggleCheck(i)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',
                      borderBottom:'1px solid rgba(255,184,0,0.05)',cursor:'pointer'}}>
                    <div style={{width:15,height:15,border:`1px solid ${done?'#00FF88':'#FFB80025'}`,
                      background:done?'#00FF8818':'transparent',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      flexShrink:0,fontSize:9,color:'#00FF88',transition:'all 0.2s',borderRadius:2}}>
                      {done?'✓':''}
                    </div>
                    <span style={{fontSize:12,color:done?'#00FF8860':'#B8E4F0',
                      fontFamily:'Rajdhani',textDecoration:done?'line-through':'none',transition:'all 0.2s'}}>
                      {item}
                    </span>
                  </div>
                )
              })}
              <div style={{marginTop:10,textAlign:'right',fontSize:9,fontFamily:'Orbitron',color:'#FFB800'}}>
                {Object.values(db.todayChecks||{}).filter(Boolean).length}/{PROTOCOL.length} COMPLETE
              </div>
            </Panel>
          </div>
        )}

        {/* ════ LOG ════ */}
        {tab==='log'&&(
          <LogTab uid={uid} db={db} setDb={d=>{
            setDb(d)
            // Update allLogs
            const today=new Date().toISOString().slice(0,10)
            if (d.todayLog) {
              setAllLogs(prev=>{
                const without=prev.filter(l=>l.date!==today)
                return [{...d.todayLog,date:today},...without]
              })
            }
          }} showToast={showToast}/>
        )}

        {/* ════ TRACK ════ */}
        {tab==='track'&&<TrackTab logs={allLogs}/>}

        {/* ════ FOOD ════ */}
        {tab==='food'&&(
          <div className="fade-slide">
            <Panel title="Food Analysis System">
              <div onClick={()=>foodFileRef.current.click()} style={{
                border:`1px dashed ${foodImg?'#00D4FF45':'#00D4FF12'}`,
                minHeight:foodImg?'auto':130,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',cursor:'pointer',
                background:'#00D4FF03',overflow:'hidden',marginBottom:10,borderRadius:2}}>
                {foodImg?<img src={foodImg} alt="meal" style={{width:'100%',maxHeight:190,objectFit:'cover'}}/>
                :(<><div style={{fontSize:34}}>📸</div>
                   <div style={{fontSize:10,color:'#1A3A4A',marginTop:8,fontFamily:'Orbitron',letterSpacing:1}}>TAP TO UPLOAD MEAL PHOTO</div>
                   <div style={{fontSize:9,color:'#0D2A3A',marginTop:4}}>or say "scan food"</div></>)}
              </div>
              <input ref={foodFileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}}
                onChange={async e=>{ const f=e.target.files[0]; if(!f)return; setFoodImg(URL.createObjectURL(f)); setFoodResult(null); setFoodImgData(await imgToBase64(f)) }}/>
              <OrbBtn label={aiLoading?'◈ ANALYZING...':'◈ INITIATE FOOD SCAN'} onClick={scanFood} disabled={!foodImgData||aiLoading}/>
            </Panel>
            {aiLoading&&tab==='food'&&<Spinner text="JARVIS ANALYZING NUTRITIONAL DATA..."/>}
            {foodResult&&(
              <Panel title="Scan Complete" color={vColor[foodResult.verdict]||'#FFB800'}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:42,height:42,border:`2px solid ${vColor[foodResult.verdict]||'#FFB800'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:16,fontFamily:'Orbitron',fontWeight:900,
                    color:vColor[foodResult.verdict]||'#FFB800',flexShrink:0}}>
                    {vIcon[foodResult.verdict]||'!'}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontFamily:'Orbitron',fontWeight:700,color:vColor[foodResult.verdict]||'#FFB800'}}>
                      {foodResult.verdict?.toUpperCase()}
                    </div>
                    <div style={{fontSize:9,color:'#1A3A4A',marginTop:2}}>SCORE: {foodResult.score}/10</div>
                  </div>
                </div>
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {foodResult.analysis}
                </div>
                {foodResult.flagged?.length>0&&(
                  <div style={{marginTop:10,padding:9,background:'#FF3B3B0A',border:'1px solid #FF3B3B22',borderRadius:2}}>
                    <div style={{fontSize:9,color:'#FF3B3B',fontFamily:'Orbitron',letterSpacing:1,marginBottom:5}}>⚠ INTOLERANCE LOGGED</div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      {foodResult.flagged.map((f,i)=>(
                        <span key={i} style={{background:'#FF3B3B12',color:'#FF3B3B',padding:'2px 7px',fontSize:10,borderRadius:2}}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}
            {(db.foodLogs||[]).length>0&&(
              <Panel title="Scan History" color="#2A5A6A">
                {(db.foodLogs||[]).slice(0,5).map(f=>(
                  <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'7px 0',borderBottom:'1px solid rgba(0,212,255,0.05)'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{width:20,height:20,border:`1px solid ${vColor[f.verdict]||'#FFB800'}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:10,color:vColor[f.verdict]||'#FFB800',borderRadius:2}}>
                        {vIcon[f.verdict]||'!'}
                      </div>
                      <div>
                        <div style={{fontSize:11,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{f.verdict?.toUpperCase()}</div>
                        <div style={{fontSize:9,color:'#1A3A4A'}}>{f.date}</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontFamily:'Orbitron',color:vColor[f.verdict]||'#FFB800'}}>{f.score}/10</div>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        )}

        {/* ════ BLOOD ════ */}
        {tab==='blood'&&(
          <div className="fade-slide">
            <Panel title="Laboratory Analysis System" color="#9B59B6">
              <div style={{display:'flex',gap:6,marginBottom:10}}>
                {[['photo','📷 SCAN REPORT'],['manual','✏ TYPE VALUES']].map(([m,l])=>(
                  <button key={m} onClick={()=>setBloodMode(m)} style={{
                    flex:1,padding:'8px 4px',background:bloodMode===m?'rgba(155,89,182,0.12)':'transparent',
                    border:`1px solid ${bloodMode===m?'#9B59B650':'#9B59B618'}`,
                    color:bloodMode===m?'#9B59B6':'#1A3A4A',
                    fontSize:10,fontFamily:'Orbitron',letterSpacing:0.5,cursor:'pointer',borderRadius:2}}>
                    {l}
                  </button>
                ))}
              </div>
              {bloodMode==='photo'?(
                <>
                  <div onClick={()=>bloodFileRef.current.click()} style={{
                    border:`1px dashed ${bloodImg?'#9B59B650':'#9B59B618'}`,
                    minHeight:110,display:'flex',flexDirection:'column',alignItems:'center',
                    justifyContent:'center',cursor:'pointer',background:'#9B59B604',
                    overflow:'hidden',marginBottom:10,borderRadius:2}}>
                    {bloodImg?<img src={bloodImg} alt="report" style={{width:'100%',maxHeight:170,objectFit:'contain'}}/>
                    :(<><div style={{fontSize:30}}>📋</div>
                       <div style={{fontSize:10,color:'#1A3A4A',marginTop:8,fontFamily:'Orbitron',letterSpacing:1}}>UPLOAD REPORT PHOTO</div></>)}
                  </div>
                  <input ref={bloodFileRef} type="file" accept="image/*" style={{display:'none'}}
                    onChange={async e=>{ const f=e.target.files[0]; if(!f)return; setBloodImg(URL.createObjectURL(f)); setBloodResult(null); setBloodImgData(await imgToBase64(f)) }}/>
                  <OrbBtn label={aiLoading?'PROCESSING...':'◉ ANALYZE REPORT'} onClick={()=>analyzeBlood(false)} disabled={!bloodImgData||aiLoading} color="#9B59B6"/>
                </>
              ):(
                <>
                  <textarea rows={7} placeholder={'CA 19-9: 28 U/mL\nHbA1c: 6.2%\nFasting Glucose: 105 mg/dL\nVitamin D: 22 ng/mL\nHemoglobin: 11.5 g/dL'} value={bloodText} onChange={e=>setBloodText(e.target.value)}
                    style={{width:'100%',background:'rgba(155,89,182,0.04)',border:'1px solid #9B59B618',
                      padding:10,color:'#B8E4F0',fontSize:12,fontFamily:'Rajdhani',resize:'none',outline:'none',marginBottom:10,borderRadius:2}}/>
                  <OrbBtn label={aiLoading?'PROCESSING...':'◉ ANALYZE VALUES'} onClick={()=>analyzeBlood(true)} disabled={!bloodText.trim()||aiLoading} color="#9B59B6"/>
                </>
              )}
            </Panel>
            {aiLoading&&tab==='blood'&&<Spinner color="#9B59B6" text="PROCESSING LABORATORY DATA..."/>}
            {bloodResult&&(
              <Panel title="Laboratory Analysis" color="#9B59B6">
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>{bloodResult.full}</div>
                <div style={{marginTop:10,padding:'8px 10px',background:'#FFB80008',border:'1px solid #FFB80022',fontSize:10,color:'#FFB800',fontFamily:'Rajdhani',borderRadius:2}}>
                  ⚠ Always share results with your oncologist for medical decisions.
                </div>
              </Panel>
            )}
            {(db.bloodReports||[]).length>0&&(
              <Panel title="Report Archive" color="#2A5A6A">
                {[...(db.bloodReports||[])].reverse().slice(0,3).map(r=>(
                  <div key={r.id} style={{padding:'8px 0',borderBottom:'1px solid rgba(0,212,255,0.05)'}}>
                    <div style={{fontSize:9,color:'#9B59B6',fontFamily:'Orbitron',marginBottom:3}}>{r.date}</div>
                    <div style={{fontSize:11,color:'#1A3A4A',fontFamily:'Rajdhani',lineHeight:1.5}}>{r.summary?.slice(0,110)}...</div>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        )}

        {/* ════ FITNESS ════ */}
        {tab==='fitness'&&(
          <div className="fade-slide">
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              {[['yoga','🧘 YOGA'],['gym','🏋 GYM']].map(([t,l])=>(
                <button key={t} onClick={()=>setFitnessType(t)} style={{
                  flex:1,padding:'9px 4px',
                  background:fitnessType===t?(t==='yoga'?'rgba(0,255,136,0.07)':'rgba(0,212,255,0.07)'):'transparent',
                  border:`1px solid ${fitnessType===t?(t==='yoga'?'#00FF8845':'#00D4FF45'):'#00D4FF12'}`,
                  color:fitnessType===t?(t==='yoga'?'#00FF88':'#00D4FF'):'#1A3A4A',
                  fontSize:11,fontFamily:'Orbitron',letterSpacing:1,cursor:'pointer',borderRadius:2}}>{l}</button>
              ))}
            </div>
            <Panel title="Recovery Phase" color="#FFB800">
              <div style={{display:'flex',gap:6}}>
                {['1','2','3'].map(p=>(
                  <div key={p} onClick={()=>setFitnessPhase(p)} style={{
                    flex:1,textAlign:'center',padding:'10px 4px',cursor:'pointer',
                    background:fitnessPhase===p?'rgba(255,184,0,0.07)':'transparent',
                    border:`1px solid ${fitnessPhase===p?'#FFB80045':'#FFB80012'}`,
                    borderRadius:2,transition:'all 0.2s'}}>
                    <div style={{fontSize:16}}>{p==='1'?'🌱':p==='2'?'🌿':'🌳'}</div>
                    <div style={{fontSize:9,fontFamily:'Orbitron',color:fitnessPhase===p?'#FFB800':'#1A3A4A',marginTop:4}}>PHASE {p}</div>
                    <div style={{fontSize:8,color:'#0D2A3A',fontFamily:'Orbitron'}}>{p==='1'?'WK 1-6':p==='2'?'WK 7-16':'MO 4+'}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <OrbBtn label={aiLoading?'GENERATING...':`◎ GENERATE PHASE ${fitnessPhase} ${fitnessType.toUpperCase()} PROTOCOL`}
              onClick={generateFitness} disabled={aiLoading} color={fitnessType==='yoga'?'#00FF88':'#00D4FF'}/>
            {aiLoading&&tab==='fitness'&&<Spinner color={fitnessType==='yoga'?'#00FF88':'#00D4FF'} text="CALCULATING OPTIMAL PROTOCOL..."/>}
            {(fitnessPlan||(db.fitnessPlans||{})[fitnessType+fitnessPhase])&&(
              <Panel title={`${fitnessType.toUpperCase()} PROTOCOL · PHASE ${fitnessPhase}`}
                color={fitnessType==='yoga'?'#00FF88':'#00D4FF'}>
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {fitnessPlan||(db.fitnessPlans||{})[fitnessType+fitnessPhase]}
                </div>
              </Panel>
            )}
            <Panel title="Safety Rules" color="#FF3B3B">
              {['Never exercise on empty stomach — blood sugar risk',
                'Stop if: chest pain, dizziness, sharp abdominal pain',
                'Protein within 30 minutes post-workout',
                'Avoid heavy ab exercises in Phase 1 and 2',
                'Hydrate 500ml during and after every session',
              ].map((t,i)=>(
                <div key={i} style={{display:'flex',gap:8,marginBottom:7,alignItems:'flex-start'}}>
                  <span style={{color:'#FF3B3B',fontSize:9,marginTop:2,flexShrink:0}}>▸</span>
                  <span style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani',lineHeight:1.5}}>{t}</span>
                </div>
              ))}
            </Panel>
          </div>
        )}

        {/* ════ RECOVERY ════ */}
        {tab==='recovery'&&(
          <div className="fade-slide">
            <Panel title="Recovery Intelligence Modules">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {RECOVERY_TOPICS.map(t=>(
                  <div key={t.id} onClick={()=>getRecoveryGuide(t.id)} style={{
                    background:recoveryTopic===t.id?`${t.color}10`:'rgba(0,212,255,0.02)',
                    border:`1px solid ${recoveryTopic===t.id?t.color+'40':t.color+'12'}`,
                    padding:'11px 10px',cursor:'pointer',transition:'all 0.2s',borderRadius:2}}>
                    <div style={{fontSize:20,marginBottom:4}}>{t.icon}</div>
                    <div style={{fontSize:11,fontFamily:'Rajdhani',fontWeight:700,
                      color:recoveryTopic===t.id?t.color:'#B8E4F0',lineHeight:1.3}}>{t.label}</div>
                    {db.recoveryGuides?.[t.id]&&(
                      <div style={{marginTop:3,fontSize:7,color:'#00FF88',fontFamily:'Orbitron'}}>LOADED ✓</div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            {aiLoading&&tab==='recovery'&&<Spinner text="COMPILING RECOVERY PROTOCOL..."/>}
            {recoveryResult&&recoveryTopic&&(
              <Panel title={`${RECOVERY_TOPICS.find(t=>t.id===recoveryTopic)?.label?.toUpperCase()} PROTOCOL`}
                color={RECOVERY_TOPICS.find(t=>t.id===recoveryTopic)?.color}>
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {recoveryResult}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ════ COACH ════ */}
        {tab==='coach'&&(
          <div className="fade-slide">
            <div style={{height:'calc(100vh - 265px)',overflowY:'auto',paddingBottom:8}}>
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',
                  marginBottom:10,alignItems:'flex-end',gap:7}}>
                  {m.role==='assistant'&&(
                    <div style={{width:24,height:24,borderRadius:'50%',border:'1px solid #00D4FF25',
                      background:'radial-gradient(circle,#00D4FF12,#001020)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:10,flexShrink:0,fontFamily:'Orbitron',color:'#00D4FF'}}>J</div>
                  )}
                  <div style={{maxWidth:'83%',padding:'10px 12px',fontSize:13,lineHeight:1.7,
                    whiteSpace:'pre-wrap',fontFamily:'Rajdhani',
                    background:m.role==='user'?'rgba(0,212,255,0.09)':'rgba(0,0,0,0.4)',
                    border:`1px solid ${m.role==='user'?'#00D4FF30':'#00D4FF12'}`,
                    color:'#B8E4F0',borderRadius:m.role==='user'?'10px 10px 2px 10px':'10px 10px 10px 2px'}}>
                    {m.role==='assistant'&&(
                      <div style={{fontSize:7,color:'#00D4FF40',fontFamily:'Orbitron',letterSpacing:1,marginBottom:3}}>JARVIS</div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading&&(
                <div style={{display:'flex',gap:7,alignItems:'center'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',border:'1px solid #00D4FF25',
                    background:'radial-gradient(circle,#00D4FF12,#001020)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontFamily:'Orbitron',color:'#00D4FF'}}>J</div>
                  <div style={{padding:'9px 12px',border:'1px solid #00D4FF12',borderRadius:'10px 10px 10px 2px',display:'flex',gap:5}}>
                    {[0,0.2,0.4].map(d=>(
                      <div key={d} style={{width:5,height:5,borderRadius:'50%',background:'#00D4FF',animation:`blink 1s ease ${d}s infinite`}}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatBottom}/>
            </div>
            <div style={{display:'flex',gap:5,overflowX:'auto',padding:'5px 0',marginBottom:7}}>
              {['What to eat?','I feel tired','Hair tips','Today\'s plan','CA 19-9?','Sperm count'].map((q,i)=>(
                <div key={i} onClick={()=>setChatInput(q)} style={{
                  flexShrink:0,background:'rgba(0,212,255,0.04)',border:'1px solid #00D4FF12',
                  padding:'4px 9px',fontSize:10,color:'#1A3A4A',cursor:'pointer',
                  fontFamily:'Rajdhani',whiteSpace:'nowrap',borderRadius:2}}>
                  {q}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:7}}>
              <textarea rows={1} placeholder="Speak to JARVIS... or type here" value={chatInput}
                onChange={e=>{ setChatInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,88)+'px' }}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()} }}
                style={{flex:1,background:'rgba(0,212,255,0.04)',
                  border:`1px solid ${chatInput?'#00D4FF35':'#00D4FF12'}`,
                  padding:'10px 11px',color:'#B8E4F0',fontSize:13,fontFamily:'Rajdhani',
                  resize:'none',outline:'none',maxHeight:88,lineHeight:1.4,
                  transition:'border 0.2s',borderRadius:'10px 10px 2px 10px'}}/>
              <button onClick={()=>sendChat()} disabled={!chatInput.trim()||aiLoading} style={{
                padding:'10px 13px',background:!chatInput.trim()||aiLoading?'transparent':'rgba(0,212,255,0.09)',
                border:'1px solid #00D4FF25',color:'#00D4FF',fontSize:16,
                cursor:!chatInput.trim()||aiLoading?'not-allowed':'pointer',borderRadius:'2px 10px 10px 2px'}}>▶</button>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV (scrollable) ── */}
      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
        width:'100%',maxWidth:430,background:'rgba(2,12,27,0.98)',
        backdropFilter:'blur(20px)',borderTop:'1px solid #00D4FF10',
        display:'flex',overflowX:'auto',zIndex:100,scrollbarWidth:'none'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flexShrink:0,border:'none',
            background:tab===t.id?'rgba(0,212,255,0.06)':'transparent',
            cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',
            gap:2,padding:'7px 0 10px',minWidth:`${100/TABS.length}%`,
            fontFamily:'Rajdhani',
            borderTop:tab===t.id?'2px solid #00D4FF':'2px solid transparent',
            transition:'all 0.2s'}}>
            <span style={{fontSize:13,color:tab===t.id?'#00D4FF':'#0D2A3A',
              filter:tab===t.id?'drop-shadow(0 0 5px #00D4FF)':'none',transition:'all 0.2s'}}>
              {t.icon}
            </span>
            <span style={{fontSize:7,fontFamily:'Orbitron',
              color:tab===t.id?'#00D4FF':'#0D2A3A',letterSpacing:0.5}}>
              {t.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
