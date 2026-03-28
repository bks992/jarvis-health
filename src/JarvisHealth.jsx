import { useState, useEffect, useRef, useCallback } from 'react'
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

// ── Voice commands ────────────────────────────────────────────────────────────
const VOICE_COMMANDS = {
  'scan food':'food','analyze food':'food','check my meal':'food',
  'blood report':'blood','blood test':'blood','show reports':'blood',
  'yoga':'fitness','exercise':'fitness','workout':'fitness','gym':'fitness',
  'recovery':'recovery','hair':'recovery','fertility':'recovery',
  'home':'home','dashboard':'home',
  'chat':'coach','help me':'coach',
  'what should i eat':'coach','i feel tired':'coach',
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0;}
  ::-webkit-scrollbar{width:2px;}
  ::-webkit-scrollbar-thumb{background:#00D4FF40;border-radius:2px;}
  textarea::placeholder,input::placeholder{color:#3A6B7A;}
  input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#00D4FF;cursor:pointer;box-shadow:0 0 8px #00D4FF;}
  @keyframes rotate    {to{transform:rotate(360deg)}}
  @keyframes rotateBack{to{transform:rotate(-360deg)}}
  @keyframes arcPulse  {0%,100%{box-shadow:0 0 20px #00D4FF,0 0 40px #00D4FF40,inset 0 0 20px #00D4FF20}50%{box-shadow:0 0 40px #00D4FF,0 0 80px #00D4FF60,inset 0 0 40px #00D4FF40}}
  @keyframes scanline  {0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
  @keyframes hexPulse  {0%,100%{opacity:.03}50%{opacity:.08}}
  @keyframes fadeSlide {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ripple    {0%{transform:scale(1);opacity:1}100%{transform:scale(3);opacity:0}}
  @keyframes blink     {0%,100%{opacity:1}50%{opacity:0.2}}
  .fade-slide{animation:fadeSlide 0.4s ease forwards;}
  .blink{animation:blink 1s ease infinite;}
`

// ── Components ────────────────────────────────────────────────────────────────
function HexGrid() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0}}>
      <svg width="100%" height="100%" style={{opacity:0.05,animation:'hexPulse 4s ease infinite'}}>
        <defs>
          <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
            <polygon points="28,2 52,14 52,34 28,46 4,34 4,14" fill="none" stroke="#00D4FF" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)"/>
      </svg>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,
        background:'linear-gradient(90deg,transparent,#00D4FF30,transparent)',
        animation:'scanline 8s linear infinite'}}/>
    </div>
  )
}

function Panel({children, style, color='#00D4FF', title}) {
  return (
    <div style={{position:'relative',background:'linear-gradient(135deg,rgba(0,20,40,0.9),rgba(0,10,25,0.95))',
      border:`1px solid ${color}25`,borderRadius:2,padding:16,marginBottom:12,
      boxShadow:`0 0 20px ${color}08,inset 0 0 30px ${color}04`,
      clipPath:'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
      ...style}}>
      <div style={{position:'absolute',top:0,right:0,width:10,height:10,background:`${color}50`}}/>
      <div style={{position:'absolute',bottom:0,left:0,width:10,height:10,background:`${color}25`}}/>
      {title&&<div style={{fontSize:9,fontFamily:'Orbitron',fontWeight:700,letterSpacing:2,
        color:color,marginBottom:10,textTransform:'uppercase'}}>◈ {title}</div>}
      {children}
    </div>
  )
}

function OrbBtn({label, onClick, disabled, color='#00D4FF'}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%',padding:12,background:disabled?'rgba(255,255,255,0.02)':`${color}12`,
      border:`1px solid ${disabled?'#1A3A4A':color+'50'}`,
      color:disabled?'#1A3A4A':color,fontSize:11,fontFamily:'Orbitron',
      letterSpacing:2,cursor:disabled?'not-allowed':'pointer',transition:'all 0.2s'}}>
      {label}
    </button>
  )
}

function Thinking({color='#00D4FF',text='PROCESSING...'}) {
  return (
    <Panel>
      <div style={{display:'flex',gap:10,alignItems:'center',color}}>
        <div style={{width:14,height:14,border:`2px solid ${color}30`,
          borderTop:`2px solid ${color}`,borderRadius:'50%',animation:'rotate 0.8s linear infinite'}}/>
        <span style={{fontSize:11,fontFamily:'Orbitron',letterSpacing:1}}>{text}</span>
      </div>
    </Panel>
  )
}

function ArcReactor({listening, onClick, supported}) {
  return (
    <div onClick={onClick} style={{position:'relative',width:76,height:76,
      cursor:supported?'pointer':'default',flexShrink:0}}>
      {listening&&[0,0.5].map(d=>(
        <div key={d} style={{position:'absolute',inset:-10,borderRadius:'50%',
          border:'2px solid #00D4FF',animation:`ripple 1.5s ease ${d}s infinite`}}/>
      ))}
      <div style={{position:'absolute',inset:0,borderRadius:'50%',
        border:`1px solid ${listening?'#00D4FF':'#00D4FF30'}`,
        animation:'rotate 8s linear infinite'}}/>
      <div style={{position:'absolute',inset:10,borderRadius:'50%',
        border:'1px solid #00D4FF40',animation:'rotateBack 12s linear infinite'}}>
        {[0,60,120,180,240,300].map(deg=>(
          <div key={deg} style={{position:'absolute',top:'50%',left:'50%',
            width:4,height:4,marginTop:-2,marginLeft:-2,borderRadius:'50%',
            background:'#00D4FF',opacity:listening?1:0.3,
            transform:`rotate(${deg}deg) translateY(-12px)`}}/>
        ))}
      </div>
      <div style={{position:'absolute',inset:20,borderRadius:'50%',
        background:listening?'radial-gradient(circle,#00D4FF,#0066CC)':'radial-gradient(circle,#00D4FF30,#001830)',
        boxShadow:listening?'0 0 30px #00D4FF,inset 0 0 20px #00D4FF40':'0 0 8px #00D4FF30',
        transition:'all 0.3s',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
        {listening?'🎙️':supported?'🎤':'🔇'}
      </div>
    </div>
  )
}

// ── Voice Hook ────────────────────────────────────────────────────────────────
function useVoice(onCommand, onTranscript) {
  const recRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(()=>{
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-IN'
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

  const startListening = useCallback(()=>{
    if (!recRef.current||listening) return
    try { recRef.current.start(); setListening(true) } catch{}
  },[listening])

  const stopListening = useCallback(()=>{
    if (!recRef.current) return
    try { recRef.current.stop(); setListening(false) } catch{}
  },[])

  return {listening, supported, startListening, stopListening}
}

// ── Main App ──────────────────────────────────────────────────────────────────
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
    {role:'assistant',content:"Good day, sir. I am JARVIS — your personal health intelligence system. I know your complete health profile and recovery journey. How may I assist you today?"}
  ])
  const [chatInput,      setChatInput     ] = useState('')

  const foodFileRef  = useRef()
  const bloodFileRef = useRef()
  const chatBottom   = useRef()

  // ── Load all data ──────────────────────────────────────────────────────────
  useEffect(()=>{
    async function load() {
      const today = new Date().toISOString().slice(0,10)
      const [food,blood,guides,plans,chat,intols,daily] = await Promise.all([
        getFoodLogs(uid), getBloodReports(uid), getGuides(uid),
        getPlans(uid), getChat(uid), getIntolerances(uid), getDailyLog(uid,today)
      ])
      setDb({foodLogs:food,bloodReports:blood,recoveryGuides:guides,
        fitnessPlans:plans,intolerances:intols,todayChecks:daily.checks||{}})
      if (chat.length) setChatMsgs(chat)
      setAppReady(true)
    }
    load().catch(console.error)
  },[uid])

  useEffect(()=>{ chatBottom.current?.scrollIntoView({behavior:'smooth'}) },[chatMsgs])

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),3000) }

  // ── Voice ──────────────────────────────────────────────────────────────────
  function handleVoiceCommand(tabTarget, text) {
    if (tabTarget) {
      setTab(tabTarget)
      speak(`Switching to ${tabTarget} module, sir.`)
    } else {
      setTab('coach')
      sendChat(text)
    }
  }

  const {listening, supported, startListening, stopListening} = useVoice(
    handleVoiceCommand,
    t=>{ setVoiceText(t); setTimeout(()=>setVoiceText(''),4000) }
  )

  // ── Food scan ──────────────────────────────────────────────────────────────
  async function scanFood() {
    if (!foodImgData) return
    setAiLoading(true); setFoodResult(null)
    const intols = db.intolerances||[]
    try {
      const resp = await askJarvis([{
        role:'user',
        content:[
          {type:'image',source:{type:'base64',media_type:'image/jpeg',data:foodImgData}},
          {type:'text',text:`Analyze this meal for my cancer recovery diet as JARVIS.${intols.length?` Known intolerances: ${intols.join(', ')}.`:''}

Format response exactly as:
VERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]
SCORE: [1-10]
ANALYSIS: [What you see in this meal]
BENEFITS: [Recovery benefits for my condition]
CONCERNS: [Any issues for pancreatic recovery]
ENZYME NOTE: [PERT needed? Fat level?]
IMPROVE IT: [How to make this better]
INTOLERANCE FLAG: [Problem foods found or NONE]`}
        ]
      }],'Speak as JARVIS throughout.',userEmail)

      const verdict = resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase()||'acceptable'
      const score   = parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1]||'5')
      const flagMatch = resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
      const flagged = flagMatch&&flagMatch[1].trim().toUpperCase()!=='NONE'
        ? flagMatch[1].split(',').map(s=>s.trim()).filter(Boolean) : []

      const entry = {
        id:Date.now(), date:new Date().toLocaleDateString('en-IN'),
        verdict, score, analysis:resp, flagged
      }

      await saveFoodLog(uid, entry)
      for (const food of flagged) await saveIntolerance(uid, food)

      setDb(prev=>({...prev,
        foodLogs:[entry,...(prev.foodLogs||[])].slice(0,50),
        intolerances:[...new Set([...(prev.intolerances||[]),...flagged])]
      }))
      setFoodResult(entry)

      const msg = verdict==='optimal'
        ? `Excellent choice, sir. Score ${score} out of 10.`
        : verdict==='acceptable'
        ? `Acceptable meal, sir. Score is ${score}. Some recommendations follow.`
        : `I would advise against this meal, sir. Score only ${score}.`
      speak(msg); setJarvisMsg(msg)
      if (flagged.length) showToast(`⚠ Intolerance logged: ${flagged.join(', ')}`)
    } catch(e) {
      setFoodResult({analysis:`Error: ${e.message}`,verdict:'acceptable',score:0,flagged:[]})
    }
    setAiLoading(false)
  }

  // ── Blood report ───────────────────────────────────────────────────────────
  async function analyzeBlood(manual=false) {
    setAiLoading(true); setBloodResult(null)
    try {
      const msgs = manual
        ? [{role:'user',content:`Analyze these blood values as JARVIS for my cancer recovery:\n${bloodText}\n\nCover: SUMMARY, KEY MARKERS, CANCER MARKERS (CA 19-9 critical), LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY PROTOCOL, ENCOURAGING NOTE.`}]
        : [{role:'user',content:[
            {type:'image',source:{type:'base64',media_type:'image/jpeg',data:bloodImgData}},
            {type:'text',text:'Analyze this blood report as JARVIS. Cover: SUMMARY, KEY MARKERS, CANCER MARKERS (CA 19-9 priority), LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY PROTOCOL, ENCOURAGING NOTE.'}
          ]}]

      const resp = await askJarvis(msgs,'Be thorough and precise as JARVIS analyzing medical data.',userEmail)
      const entry = {id:Date.now(),date:new Date().toLocaleDateString('en-IN'),summary:resp.slice(0,200),full:resp}
      await saveBloodReport(uid, entry)
      setDb(prev=>({...prev,bloodReports:[...(prev.bloodReports||[]),entry]}))
      setBloodResult(entry)
      speak('Analysis complete, sir. I have processed your blood report. Please review my full assessment.')
      setJarvisMsg('Blood report analysis complete.')
    } catch(e) { setBloodResult({full:`Error: ${e.message}`}) }
    setAiLoading(false)
  }

  // ── Fitness plan ───────────────────────────────────────────────────────────
  async function generateFitness() {
    setAiLoading(true); setFitnessPlan(null)
    try {
      const resp = await askJarvis([{
        role:'user',
        content:`Generate a detailed Phase ${fitnessPhase} ${fitnessType==='yoga'?'Yoga and Breathing':'Strength Training and Gym'} protocol for my cancer recovery as JARVIS. Be specific with exercises, sets, reps, durations, and recovery-specific modifications. Phase 1=Weeks 1-6 gentle, Phase 2=Weeks 7-16 moderate, Phase 3=Month 4+ progressive. Include safety rules for my condition.`
      }],'',userEmail)

      const key = fitnessType+fitnessPhase
      await savePlan(uid, key, resp)
      setDb(prev=>({...prev,fitnessPlans:{...(prev.fitnessPlans||{}),[key]:resp}}))
      setFitnessPlan(resp)
      speak(`Your Phase ${fitnessPhase} ${fitnessType} protocol is ready, sir.`)
    } catch(e) { setFitnessPlan(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  // ── Recovery guide ─────────────────────────────────────────────────────────
  const recoveryPrompts = {
    sperm:     'Provide a complete sperm count recovery and fertility restoration protocol after chemotherapy as JARVIS. Cover supplements with doses, timeline, lifestyle changes, foods, tests to track, and realistic expectations for becoming a father.',
    hair:      'Provide a complete hair regrowth protocol post-chemotherapy as JARVIS. Cover timeline, scalp care routine, oils, supplements with doses, foods, month-by-month expectations.',
    eyebrow:   'Provide complete eyebrow and eyelash regrowth protocol post-chemo as JARVIS. Cover serums, castor oil protocol, massage technique, supplements, timeline.',
    appearance:'As JARVIS, provide complete guide to looking and feeling normal again after cancer treatment. Cover weight gain, skin restoration, hair, energy, confidence rebuilding.',
    complete:  'As JARVIS, provide the complete roadmap to full permanent disease-free vibrant health. Cover all phases, milestones, longevity practices, mental recovery, survivorship mindset.',
    immunity:  'As JARVIS, provide complete post-chemotherapy immunity rebuilding protocol. Cover specific foods, supplements with doses, sleep, lab markers to track.',
    energy:    'As JARVIS, provide complete natural energy restoration protocol after chemo. Cover adrenal recovery, mitochondrial healing, sleep optimization, blood sugar stability.',
    digestion: 'As JARVIS, provide complete gut healing protocol after partial pancreatectomy and chemo. Cover PERT optimization, gut lining repair, microbiome rebuilding, foods.',
  }

  async function getRecoveryGuide(topic) {
    setRecoveryTopic(topic)
    if (db.recoveryGuides?.[topic]) { setRecoveryResult(db.recoveryGuides[topic]); return }
    setAiLoading(true); setRecoveryResult(null)
    try {
      const resp = await askJarvis([{role:'user',content:recoveryPrompts[topic]}],'',userEmail)
      await saveGuide(uid, topic, resp)
      setDb(prev=>({...prev,recoveryGuides:{...(prev.recoveryGuides||{}),[topic]:resp}}))
      setRecoveryResult(resp)
      speak(`Your ${topic} recovery protocol is ready, sir.`)
    } catch(e) { setRecoveryResult(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  async function sendChat(overrideText=null) {
    const text = overrideText||chatInput.trim()
    if (!text) return
    const userMsg = {role:'user',content:text}
    const newMsgs = [...chatMsgs, userMsg]
    setChatMsgs(newMsgs); setChatInput(''); setAiLoading(true)
    await saveChat(uid,'user',text)
    try {
      const context = `User food intolerances: ${(db.intolerances||[]).join(', ')||'none logged'}. Speak as JARVIS throughout.`
      const resp = await askJarvis(
        newMsgs.map(m=>({role:m.role,content:m.content})),
        context, userEmail
      )
      const aiMsg = {role:'assistant',content:resp}
      setChatMsgs([...newMsgs,aiMsg])
      await saveChat(uid,'assistant',resp)
      speak(resp.slice(0,300))
      setJarvisMsg(resp.slice(0,100))
    } catch(e) {
      setChatMsgs([...newMsgs,{role:'assistant',content:`I apologize, sir. System error: ${e.message}`}])
    }
    setAiLoading(false)
  }

  // ── Daily checklist ────────────────────────────────────────────────────────
  async function toggleCheck(i) {
    const newChecks = {...(db.todayChecks||{}),[i]:!(db.todayChecks||{})[i]}
    setDb(prev=>({...prev,todayChecks:newChecks}))
    const today = new Date().toISOString().slice(0,10)
    await saveDailyLog(uid, today, {checks:newChecks})
  }

  // ── Colors & maps ──────────────────────────────────────────────────────────
  const vColor = {optimal:'#00FF88',acceptable:'#FFB800',inadvisable:'#FF3B3B'}
  const vIcon  = {optimal:'✓',acceptable:'!',inadvisable:'✗'}

  const TABS = [
    {id:'home',    icon:'⬡', label:'CORE'},
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

  const PROTOCOL = [
    '🍋 Lemon water on waking',
    '💊 PERT enzymes with every meal',
    '🚶 30-min morning walk',
    '🌬️ 10-min pranayama',
    '🥛 Mid-morning protein snack',
    '💧 2.5–3L water today',
    '💪 Exercise / yoga session',
    '✨ Golden milk before bed',
    '😴 In bed by 10pm',
  ]

  const TICKER = ['SYSTEM NOMINAL','REMISSION: ACTIVE','CA 19-9 MONITORING',
    'RECOVERY PROTOCOL ENGAGED','ENZYME COMPLIANCE REQUIRED','HYDRATION: 3L/DAY']

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!appReady) return (
    <div style={{minHeight:'100vh',background:'#020C1B',display:'flex',
      flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <style>{STYLES}</style>
      <div style={{width:36,height:36,border:'2px solid #00D4FF20',
        borderTop:'2px solid #00D4FF',borderRadius:'50%',animation:'rotate 0.8s linear infinite'}}/>
      <div style={{fontSize:11,color:'#00D4FF50',fontFamily:'Orbitron',letterSpacing:2}}>
        LOADING YOUR HEALTH DATA...
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#020C1B',fontFamily:'Rajdhani,sans-serif',
      color:'#B8E4F0',maxWidth:430,margin:'0 auto',
      paddingBottom:tab==='coach'?0:88,position:'relative',overflow:'hidden'}}>
      <style>{STYLES}</style>
      <HexGrid/>

      {/* Toast */}
      {toast&&(
        <div className="fade-slide" style={{position:'fixed',top:14,left:'50%',
          transform:'translateX(-50%)',background:'rgba(0,212,255,0.15)',
          border:'1px solid #00D4FF50',color:'#00D4FF',padding:'7px 18px',
          fontSize:11,fontFamily:'Orbitron',letterSpacing:1,zIndex:9999,whiteSpace:'nowrap'}}>
          ◆ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:50,
        background:'rgba(2,12,27,0.96)',backdropFilter:'blur(20px)',
        borderBottom:'1px solid #00D4FF15',padding:'8px 14px'}}>

        {/* Ticker */}
        <div style={{overflow:'hidden',height:16,marginBottom:6}}>
          <div style={{display:'flex',gap:36,whiteSpace:'nowrap',opacity:0.5}}>
            {TICKER.map((t,i)=>(
              <span key={i} style={{fontSize:9,fontFamily:'Rajdhani',
                color:'#00D4FF',letterSpacing:1}}>◆ {t}</span>
            ))}
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <ArcReactor listening={listening} supported={supported}
            onClick={listening?stopListening:startListening}/>

          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontSize:15,fontFamily:'Orbitron',fontWeight:900,
              color:'#00D4FF',letterSpacing:3,
              textShadow:'0 0 10px #00D4FF60'}}>
              J.A.R.V.I.S
            </div>
            <div style={{fontSize:10,color:'#3A6B7A',letterSpacing:0.5,marginTop:1}}>
              HEALTH INTELLIGENCE · ACTIVE
            </div>
            <div style={{fontSize:11,color:listening?'#00FF88':'#00D4FF70',
              marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',
              transition:'color 0.3s'}}>
              {listening
                ? <span className="blink">● LISTENING...</span>
                : voiceText ? `"${voiceText}"` : jarvisMsg}
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',
            gap:4,flexShrink:0}}>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <div style={{width:5,height:5,borderRadius:'50%',
                background:'#00FF88',boxShadow:'0 0 6px #00FF88'}}/>
              <span style={{fontSize:8,color:'#00FF88',fontFamily:'Orbitron',letterSpacing:1}}>ONLINE</span>
            </div>
            <button onClick={onLogout} style={{fontSize:8,color:'#FF3B3B30',
              background:'none',border:'none',cursor:'pointer',
              fontFamily:'Orbitron',letterSpacing:1}}>
              LOGOUT
            </button>
          </div>
        </div>

        {supported&&(
          <div style={{marginTop:5,fontSize:9,color:'#1A3A4A',fontFamily:'Rajdhani',letterSpacing:0.3}}>
            🎤 Tap reactor · Say: "scan food" · "blood report" · "show yoga" · "I feel tired"
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{position:'relative',zIndex:1,padding:'10px 12px'}}>

        {/* ── HOME ── */}
        {tab==='home'&&(
          <div className="fade-slide">
            <Panel title="Mission Status" color="#00FF88">
              <div style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',marginBottom:14}}>
                <div>
                  <div style={{fontSize:20,fontFamily:'Orbitron',fontWeight:900,
                    color:'#00FF88',letterSpacing:1}}>REMISSION</div>
                  <div style={{fontSize:10,color:'#3A6B7A',marginTop:2}}>
                    PET-CT CLEAR · PROTOCOL ACTIVE
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:'#3A6B7A'}}>CA 19-9 GOAL</div>
                  <div style={{fontSize:18,fontFamily:'Orbitron',
                    color:'#FFB800',fontWeight:700}}>~6</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                {[
                  {l:'PET-CT',v:'CLEAR ✓',c:'#00FF88'},
                  {l:'CHEMO',v:'DONE ✓',c:'#00D4FF'},
                  {l:'SURGERY',v:'DONE ✓',c:'#00D4FF'},
                ].map(s=>(
                  <div key={s.l} style={{background:`${s.c}10`,border:`1px solid ${s.c}25`,
                    padding:'7px 5px',textAlign:'center'}}>
                    <div style={{fontSize:8,color:'#3A6B7A',letterSpacing:0.5}}>{s.l}</div>
                    <div style={{fontSize:10,fontFamily:'Orbitron',color:s.c,
                      marginTop:3,fontWeight:700}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recovery Systems">
              {[
                {l:'Immunity Rebuild',  pct:45,c:'#00D4FF'},
                {l:'Digestive Function',pct:52,c:'#00FF88'},
                {l:'Muscle Mass',       pct:35,c:'#FFB800'},
                {l:'Hair Regrowth',     pct:28,c:'#9B59B6'},
                {l:'Fertility Recovery',pct:32,c:'#FF6B35'},
                {l:'Energy Level',      pct:58,c:'#00D4FF'},
              ].map(s=>(
                <div key={s.l} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani'}}>{s.l}</span>
                    <span style={{fontSize:10,fontFamily:'Orbitron',color:s.c}}>{s.pct}%</span>
                  </div>
                  <div style={{height:3,background:'rgba(255,255,255,0.04)',borderRadius:1}}>
                    <div style={{height:'100%',width:`${s.pct}%`,background:s.c,
                      borderRadius:1,boxShadow:`0 0 6px ${s.c}60`,transition:'width 1.5s ease'}}/>
                  </div>
                </div>
              ))}
            </Panel>

            {(db.intolerances||[]).length>0&&(
              <Panel title="⚠ Food Intolerances" color="#FF3B3B">
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {db.intolerances.map((f,i)=>(
                    <span key={i} style={{background:'#FF3B3B15',border:'1px solid #FF3B3B30',
                      color:'#FF3B3B',padding:'2px 10px',fontSize:11,fontFamily:'Rajdhani'}}>
                      {f}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="Today's Protocol" color="#FFB800">
              {PROTOCOL.map((item,i)=>{
                const done = (db.todayChecks||{})[i]
                return (
                  <div key={i} onClick={()=>toggleCheck(i)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',
                      borderBottom:'1px solid rgba(255,184,0,0.06)',cursor:'pointer'}}>
                    <div style={{width:16,height:16,border:`1px solid ${done?'#00FF88':'#FFB80030'}`,
                      background:done?'#00FF8820':'transparent',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      flexShrink:0,fontSize:10,color:'#00FF88',transition:'all 0.2s'}}>
                      {done?'✓':''}
                    </div>
                    <span style={{fontSize:13,color:done?'#00FF8870':'#B8E4F0',
                      fontFamily:'Rajdhani',textDecoration:done?'line-through':'none',
                      transition:'all 0.2s'}}>
                      {item}
                    </span>
                  </div>
                )
              })}
              <div style={{marginTop:10,textAlign:'right',fontSize:10,
                fontFamily:'Orbitron',color:'#FFB800'}}>
                {Object.values(db.todayChecks||{}).filter(Boolean).length}/{PROTOCOL.length} COMPLETE
              </div>
            </Panel>
          </div>
        )}

        {/* ── FOOD ── */}
        {tab==='food'&&(
          <div className="fade-slide">
            <Panel title="Food Analysis System">
              <div onClick={()=>foodFileRef.current.click()} style={{
                border:`1px dashed ${foodImg?'#00D4FF50':'#00D4FF15'}`,
                minHeight:foodImg?'auto':140,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',cursor:'pointer',
                background:'#00D4FF04',overflow:'hidden',marginBottom:10}}>
                {foodImg
                  ? <img src={foodImg} alt="meal" style={{width:'100%',maxHeight:200,objectFit:'cover'}}/>
                  : (<><div style={{fontSize:36}}>📸</div>
                     <div style={{fontSize:11,color:'#3A6B7A',marginTop:8,
                       fontFamily:'Orbitron',letterSpacing:1}}>TAP TO UPLOAD MEAL PHOTO</div>
                     <div style={{fontSize:10,color:'#1A3A4A',marginTop:4}}>
                       Or say "scan food" to voice activate
                     </div></>)}
              </div>
              <input ref={foodFileRef} type="file" accept="image/*" capture="environment"
                style={{display:'none'}} onChange={async e=>{
                  const f=e.target.files[0]; if(!f) return
                  setFoodImg(URL.createObjectURL(f)); setFoodResult(null)
                  setFoodImgData(await imgToBase64(f))
                }}/>
              <OrbBtn label={aiLoading?'◈ ANALYZING...':'◈ INITIATE FOOD SCAN'}
                onClick={scanFood} disabled={!foodImgData||aiLoading}/>
            </Panel>

            {aiLoading&&tab==='food'&&<Thinking text="JARVIS ANALYZING NUTRITIONAL DATA..."/>}

            {foodResult&&(
              <Panel title="Scan Complete"
                color={vColor[foodResult.verdict]||'#FFB800'}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <div style={{width:44,height:44,border:`2px solid ${vColor[foodResult.verdict]||'#FFB800'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:18,fontFamily:'Orbitron',fontWeight:900,
                    color:vColor[foodResult.verdict]||'#FFB800',flexShrink:0}}>
                    {vIcon[foodResult.verdict]||'!'}
                  </div>
                  <div>
                    <div style={{fontSize:15,fontFamily:'Orbitron',fontWeight:700,
                      color:vColor[foodResult.verdict]||'#FFB800'}}>
                      {foodResult.verdict?.toUpperCase()}
                    </div>
                    <div style={{fontSize:10,color:'#3A6B7A',marginTop:2}}>
                      SCORE: {foodResult.score}/10
                    </div>
                  </div>
                </div>
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,
                  whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {foodResult.analysis}
                </div>
                {foodResult.flagged?.length>0&&(
                  <div style={{marginTop:10,padding:10,background:'#FF3B3B10',
                    border:'1px solid #FF3B3B25'}}>
                    <div style={{fontSize:10,color:'#FF3B3B',fontFamily:'Orbitron',
                      letterSpacing:1,marginBottom:6}}>⚠ INTOLERANCE LOGGED</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {foodResult.flagged.map((f,i)=>(
                        <span key={i} style={{background:'#FF3B3B15',color:'#FF3B3B',
                          padding:'2px 8px',fontSize:11}}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {(db.foodLogs||[]).length>0&&(
              <Panel title="Scan History" color="#3A6B7A">
                {(db.foodLogs||[]).slice(0,5).map(f=>(
                  <div key={f.id} style={{display:'flex',justifyContent:'space-between',
                    alignItems:'center',padding:'7px 0',
                    borderBottom:'1px solid rgba(0,212,255,0.06)'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{width:22,height:22,border:`1px solid ${vColor[f.verdict]||'#FFB800'}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:11,color:vColor[f.verdict]||'#FFB800'}}>
                        {vIcon[f.verdict]||'!'}
                      </div>
                      <div>
                        <div style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani'}}>
                          {f.verdict?.toUpperCase()}
                        </div>
                        <div style={{fontSize:10,color:'#3A6B7A'}}>{f.date}</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontFamily:'Orbitron',
                      color:vColor[f.verdict]||'#FFB800'}}>
                      {f.score}/10
                    </div>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        )}

        {/* ── BLOOD ── */}
        {tab==='blood'&&(
          <div className="fade-slide">
            <Panel title="Laboratory Analysis System" color="#9B59B6">
              <div style={{display:'flex',gap:6,marginBottom:12}}>
                {[['photo','📷 SCAN REPORT'],['manual','✏ TYPE VALUES']].map(([m,l])=>(
                  <button key={m} onClick={()=>setBloodMode(m)} style={{
                    flex:1,padding:'8px 4px',
                    background:bloodMode===m?'rgba(155,89,182,0.15)':'transparent',
                    border:`1px solid ${bloodMode===m?'#9B59B660':'#9B59B620'}`,
                    color:bloodMode===m?'#9B59B6':'#3A6B7A',
                    fontSize:10,fontFamily:'Orbitron',letterSpacing:0.5,cursor:'pointer'}}>
                    {l}
                  </button>
                ))}
              </div>

              {bloodMode==='photo'?(
                <>
                  <div onClick={()=>bloodFileRef.current.click()} style={{
                    border:`1px dashed ${bloodImg?'#9B59B660':'#9B59B620'}`,
                    minHeight:120,display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',cursor:'pointer',
                    background:'#9B59B605',overflow:'hidden',marginBottom:10}}>
                    {bloodImg
                      ? <img src={bloodImg} alt="report" style={{width:'100%',maxHeight:180,objectFit:'contain'}}/>
                      : (<><div style={{fontSize:32}}>📋</div>
                         <div style={{fontSize:11,color:'#3A6B7A',marginTop:8,
                           fontFamily:'Orbitron',letterSpacing:1}}>UPLOAD REPORT PHOTO</div></>)}
                  </div>
                  <input ref={bloodFileRef} type="file" accept="image/*"
                    style={{display:'none'}} onChange={async e=>{
                      const f=e.target.files[0]; if(!f) return
                      setBloodImg(URL.createObjectURL(f)); setBloodResult(null)
                      setBloodImgData(await imgToBase64(f))
                    }}/>
                  <OrbBtn label={aiLoading?'PROCESSING...':'◉ ANALYZE REPORT'}
                    onClick={()=>analyzeBlood(false)}
                    disabled={!bloodImgData||aiLoading} color="#9B59B6"/>
                </>
              ):(
                <>
                  <textarea rows={7}
                    placeholder={'Enter your lab values:\nCA 19-9: 28 U/mL\nHbA1c: 6.2%\nFasting Glucose: 105 mg/dL\nVitamin D: 22 ng/mL\nHemoglobin: 11.5 g/dL'}
                    value={bloodText} onChange={e=>setBloodText(e.target.value)}
                    style={{width:'100%',background:'rgba(155,89,182,0.04)',
                      border:'1px solid #9B59B620',padding:10,color:'#B8E4F0',
                      fontSize:12,fontFamily:'Rajdhani',resize:'none',
                      outline:'none',marginBottom:10}}/>
                  <OrbBtn label={aiLoading?'PROCESSING...':'◉ ANALYZE VALUES'}
                    onClick={()=>analyzeBlood(true)}
                    disabled={!bloodText.trim()||aiLoading} color="#9B59B6"/>
                </>
              )}
            </Panel>

            {aiLoading&&tab==='blood'&&<Thinking color="#9B59B6" text="PROCESSING LABORATORY DATA..."/>}

            {bloodResult&&(
              <Panel title="Laboratory Analysis" color="#9B59B6">
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,
                  whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {bloodResult.full}
                </div>
                <div style={{marginTop:10,padding:'8px 10px',
                  background:'#FFB80010',border:'1px solid #FFB80025',
                  fontSize:11,color:'#FFB800',fontFamily:'Rajdhani'}}>
                  ⚠ Always share results with your oncologist for medical decisions.
                </div>
              </Panel>
            )}

            {(db.bloodReports||[]).length>0&&(
              <Panel title="Report Archive" color="#3A6B7A">
                {[...(db.bloodReports||[])].reverse().slice(0,3).map(r=>(
                  <div key={r.id} style={{padding:'8px 0',
                    borderBottom:'1px solid rgba(0,212,255,0.06)'}}>
                    <div style={{fontSize:10,color:'#9B59B6',
                      fontFamily:'Orbitron',marginBottom:4}}>{r.date}</div>
                    <div style={{fontSize:12,color:'#3A6B7A',
                      fontFamily:'Rajdhani',lineHeight:1.5}}>
                      {r.summary?.slice(0,120)}...
                    </div>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        )}

        {/* ── FITNESS ── */}
        {tab==='fitness'&&(
          <div className="fade-slide">
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              {[['yoga','🧘 YOGA'],['gym','🏋 GYM']].map(([t,l])=>(
                <button key={t} onClick={()=>setFitnessType(t)} style={{
                  flex:1,padding:'9px 4px',
                  background:fitnessType===t
                    ?(t==='yoga'?'rgba(0,255,136,0.08)':'rgba(0,212,255,0.08)')
                    :'transparent',
                  border:`1px solid ${fitnessType===t
                    ?(t==='yoga'?'#00FF8850':'#00D4FF50')
                    :'#00D4FF15'}`,
                  color:fitnessType===t?(t==='yoga'?'#00FF88':'#00D4FF'):'#3A6B7A',
                  fontSize:11,fontFamily:'Orbitron',letterSpacing:1,cursor:'pointer'}}>
                  {l}
                </button>
              ))}
            </div>

            <Panel title="Recovery Phase" color="#FFB800">
              <div style={{display:'flex',gap:6}}>
                {['1','2','3'].map(p=>(
                  <div key={p} onClick={()=>setFitnessPhase(p)} style={{
                    flex:1,textAlign:'center',padding:'10px 4px',cursor:'pointer',
                    background:fitnessPhase===p?'rgba(255,184,0,0.08)':'transparent',
                    border:`1px solid ${fitnessPhase===p?'#FFB80050':'#FFB80015'}`,
                    transition:'all 0.2s'}}>
                    <div style={{fontSize:16}}>{p==='1'?'🌱':p==='2'?'🌿':'🌳'}</div>
                    <div style={{fontSize:10,fontFamily:'Orbitron',
                      color:fitnessPhase===p?'#FFB800':'#3A6B7A',marginTop:4}}>
                      PHASE {p}
                    </div>
                    <div style={{fontSize:9,color:'#1A3A4A'}}>
                      {p==='1'?'WK 1-6':p==='2'?'WK 7-16':'MO 4+'}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <OrbBtn
              label={aiLoading ? 'GENERATING...' : `◎ GENERATE PHASE ${fitnessPhase} ${fitnessType.toUpperCase()} PROTOCOL`}
              onClick={generateFitness}
              disabled={aiLoading}
              color={fitnessType==='yoga'?'#00FF88':'#00D4FF'}
            />

            {aiLoading&&tab==='fitness'&&(
              <Thinking color={fitnessType==='yoga'?'#00FF88':'#00D4FF'}
                text="CALCULATING OPTIMAL PROTOCOL..."/>
            )}

            {(fitnessPlan||(db.fitnessPlans||{})[fitnessType+fitnessPhase])&&(
              <Panel title={`${fitnessType.toUpperCase()} PROTOCOL · PHASE ${fitnessPhase}`}
                color={fitnessType==='yoga'?'#00FF88':'#00D4FF'}>
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,
                  whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {fitnessPlan||(db.fitnessPlans||{})[fitnessType+fitnessPhase]}
                </div>
              </Panel>
            )}

            <Panel title="Safety Protocols" color="#FF3B3B">
              {[
                'Never exercise on empty stomach — blood sugar risk',
                'Stop immediately if: chest pain, dizziness, sharp abdominal pain',
                'Protein within 30 minutes post-workout — essential',
                'Avoid heavy ab exercises (sit-ups) in Phase 1 and 2',
                'Hydrate 500ml water during and after every session',
              ].map((t,i)=>(
                <div key={i} style={{display:'flex',gap:8,marginBottom:7,alignItems:'flex-start'}}>
                  <span style={{color:'#FF3B3B',fontSize:10,marginTop:2,flexShrink:0}}>▸</span>
                  <span style={{fontSize:12,color:'#B8E4F0',fontFamily:'Rajdhani',lineHeight:1.5}}>
                    {t}
                  </span>
                </div>
              ))}
            </Panel>
          </div>
        )}

        {/* ── RECOVERY ── */}
        {tab==='recovery'&&(
          <div className="fade-slide">
            <Panel title="Recovery Intelligence Modules">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {RECOVERY_TOPICS.map(t=>(
                  <div key={t.id} onClick={()=>getRecoveryGuide(t.id)} style={{
                    background:recoveryTopic===t.id?`${t.color}12`:'rgba(0,212,255,0.02)',
                    border:`1px solid ${recoveryTopic===t.id?t.color+'50':t.color+'15'}`,
                    padding:'12px 10px',cursor:'pointer',transition:'all 0.2s',
                    clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))'}}>
                    <div style={{fontSize:22,marginBottom:4}}>{t.icon}</div>
                    <div style={{fontSize:11,fontFamily:'Rajdhani',fontWeight:700,
                      color:recoveryTopic===t.id?t.color:'#B8E4F0',lineHeight:1.3}}>
                      {t.label}
                    </div>
                    {db.recoveryGuides?.[t.id]&&(
                      <div style={{marginTop:4,fontSize:8,color:'#00FF88',fontFamily:'Orbitron'}}>
                        LOADED ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {aiLoading&&tab==='recovery'&&(
              <Thinking text="COMPILING RECOVERY PROTOCOL..."/>
            )}

            {recoveryResult&&recoveryTopic&&(
              <Panel
                title={`${RECOVERY_TOPICS.find(t=>t.id===recoveryTopic)?.label?.toUpperCase()} PROTOCOL`}
                color={RECOVERY_TOPICS.find(t=>t.id===recoveryTopic)?.color}>
                <div style={{fontSize:13,color:'#B8E4F0',lineHeight:1.8,
                  whiteSpace:'pre-wrap',fontFamily:'Rajdhani'}}>
                  {recoveryResult}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── COACH ── */}
        {tab==='coach'&&(
          <div className="fade-slide">
            <div style={{height:'calc(100vh - 260px)',overflowY:'auto',paddingBottom:8}}>
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{display:'flex',
                  justifyContent:m.role==='user'?'flex-end':'flex-start',
                  marginBottom:10,alignItems:'flex-end',gap:8}}>
                  {m.role==='assistant'&&(
                    <div style={{width:26,height:26,borderRadius:'50%',
                      border:'1px solid #00D4FF30',
                      background:'radial-gradient(circle,#00D4FF15,#001830)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,flexShrink:0,fontFamily:'Orbitron',color:'#00D4FF'}}>
                      J
                    </div>
                  )}
                  <div style={{maxWidth:'82%',padding:'10px 13px',
                    fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',
                    fontFamily:'Rajdhani',
                    background:m.role==='user'?'rgba(0,212,255,0.1)':'rgba(0,0,0,0.4)',
                    border:`1px solid ${m.role==='user'?'#00D4FF35':'#00D4FF15'}`,
                    color:'#B8E4F0',
                    clipPath:m.role==='user'
                      ?'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)'
                      :'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))'}}>
                    {m.role==='assistant'&&(
                      <div style={{fontSize:8,color:'#00D4FF50',fontFamily:'Orbitron',
                        letterSpacing:1,marginBottom:4}}>JARVIS</div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading&&(
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',
                    border:'1px solid #00D4FF30',
                    background:'radial-gradient(circle,#00D4FF15,#001830)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11,fontFamily:'Orbitron',color:'#00D4FF'}}>J</div>
                  <div style={{padding:'10px 14px',border:'1px solid #00D4FF15',
                    display:'flex',gap:6}}>
                    {[0,0.2,0.4].map(d=>(
                      <div key={d} style={{width:5,height:5,borderRadius:'50%',
                        background:'#00D4FF',animation:`blink 1s ease ${d}s infinite`}}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatBottom}/>
            </div>

            {/* Quick questions */}
            <div style={{display:'flex',gap:5,overflowX:'auto',
              padding:'6px 0',marginBottom:8}}>
              {['What to eat?','I feel tired','Hair growth tips',
                "Today's plan",'CA 19-9 high?','Sperm count tips'].map((q,i)=>(
                <div key={i} onClick={()=>setChatInput(q)} style={{
                  flexShrink:0,background:'rgba(0,212,255,0.04)',
                  border:'1px solid #00D4FF15',padding:'4px 10px',
                  fontSize:10,color:'#3A6B7A',cursor:'pointer',
                  fontFamily:'Rajdhani',whiteSpace:'nowrap'}}>
                  {q}
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:8}}>
              <textarea rows={1} placeholder="Speak to JARVIS... or type here"
                value={chatInput}
                onChange={e=>{
                  setChatInput(e.target.value)
                  e.target.style.height='auto'
                  e.target.style.height=Math.min(e.target.scrollHeight,90)+'px'
                }}
                onKeyDown={e=>{
                  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}
                }}
                style={{flex:1,background:'rgba(0,212,255,0.04)',
                  border:`1px solid ${chatInput?'#00D4FF40':'#00D4FF15'}`,
                  padding:'10px 12px',color:'#B8E4F0',fontSize:13,
                  fontFamily:'Rajdhani',resize:'none',outline:'none',
                  maxHeight:90,lineHeight:1.4,transition:'border 0.2s'}}/>
              <button onClick={()=>sendChat()}
                disabled={!chatInput.trim()||aiLoading} style={{
                  padding:'10px 14px',
                  background:!chatInput.trim()||aiLoading?'transparent':'rgba(0,212,255,0.1)',
                  border:'1px solid #00D4FF30',color:'#00D4FF',fontSize:16,
                  cursor:!chatInput.trim()||aiLoading?'not-allowed':'pointer'}}>
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
        width:'100%',maxWidth:430,background:'rgba(2,12,27,0.97)',
        backdropFilter:'blur(20px)',borderTop:'1px solid #00D4FF15',
        display:'flex',zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,border:'none',background:tab===t.id?'rgba(0,212,255,0.06)':'transparent',
            cursor:'pointer',display:'flex',flexDirection:'column',
            alignItems:'center',gap:3,padding:'7px 0 10px',
            fontFamily:'Rajdhani',
            borderTop:tab===t.id?'2px solid #00D4FF':'2px solid transparent',
            transition:'all 0.2s'}}>
            <span style={{fontSize:15,color:tab===t.id?'#00D4FF':'#1A3A4A',
              filter:tab===t.id?'drop-shadow(0 0 6px #00D4FF)':'none',
              transition:'all 0.2s'}}>
              {t.icon}
            </span>
            <span style={{fontSize:8,fontFamily:'Orbitron',
              color:tab===t.id?'#00D4FF':'#1A3A4A',letterSpacing:1}}>
              {t.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
