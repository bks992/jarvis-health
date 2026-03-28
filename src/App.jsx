import { useState, useEffect } from 'react'
import { onAuth, loginWithGoogle, logout } from './firebase'
import JarvisHealth from './JarvisHealth'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@400;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  @keyframes spin  { to{ transform:rotate(360deg); } }
  @keyframes spinR { to{ transform:rotate(-360deg); } }
  @keyframes glow  { 0%,100%{ box-shadow:0 0 20px #00D4FF,0 0 40px #00D4FF40; } 50%{ box-shadow:0 0 50px #00D4FF,0 0 100px #00D4FF60; } }
  @keyframes hexpulse { 0%,100%{opacity:.04} 50%{opacity:.09} }
`

function HexBg() {
  return (
    <svg style={{position:'fixed',inset:0,width:'100%',height:'100%',
      pointerEvents:'none',animation:'hexpulse 4s ease infinite',zIndex:0}}>
      <defs>
        <pattern id="hx" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
          <polygon points="28,2 52,14 52,34 28,46 4,34 4,14" fill="none" stroke="#00D4FF" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hx)"/>
    </svg>
  )
}

function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState('')

  async function handleLogin() {
    setLoading(true); setError('')
    try { await loginWithGoogle() }
    catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#020C1B',display:'flex',
      flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:24,fontFamily:'Rajdhani,sans-serif',position:'relative',overflow:'hidden'}}>
      <style>{CSS}</style>
      <HexBg/>
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:360,textAlign:'center'}}>

        <div style={{display:'flex',justifyContent:'center',marginBottom:36}}>
          <div style={{position:'relative',width:130,height:130}}>
            <div style={{position:'absolute',inset:0,borderRadius:'50%',
              border:'1px solid #00D4FF25',animation:'spin 10s linear infinite'}}/>
            <div style={{position:'absolute',inset:16,borderRadius:'50%',
              border:'2px solid #00D4FF40',animation:'spinR 14s linear infinite'}}>
              {[0,60,120,180,240,300].map(d=>(
                <div key={d} style={{position:'absolute',top:'50%',left:'50%',
                  width:5,height:5,marginTop:-2.5,marginLeft:-2.5,
                  borderRadius:'50%',background:'#00D4FF80',
                  transform:`rotate(${d}deg) translateY(-22px)`}}/>
              ))}
            </div>
            <div style={{position:'absolute',inset:32,borderRadius:'50%',
              background:'radial-gradient(circle,#00D4FF,#0044AA)',
              animation:'glow 2.5s ease-in-out infinite',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>
              🌱
            </div>
          </div>
        </div>

        <div style={{fontSize:36,fontFamily:'Orbitron',fontWeight:900,
          color:'#00D4FF',letterSpacing:6,marginBottom:6,
          textShadow:'0 0 30px #00D4FF,0 0 60px #00D4FF40'}}>
          J.A.R.V.I.S
        </div>
        <div style={{fontSize:10,fontFamily:'Orbitron',color:'#00D4FF50',
          letterSpacing:4,marginBottom:16}}>
          HEALTH INTELLIGENCE SYSTEM
        </div>
        <div style={{fontSize:14,color:'#3A6B7A',lineHeight:1.9,marginBottom:32}}>
          Your personal AI recovery companion<br/>
          🇮🇳 Mumbai · 🔒 Private · 🛡️ Encrypted
        </div>

        <button onClick={handleLogin} disabled={loading} style={{
          width:'100%',display:'flex',alignItems:'center',justifyContent:'center',
          gap:12,padding:'15px 24px',
          background:loading?'rgba(0,212,255,0.03)':'rgba(0,212,255,0.08)',
          border:'1px solid #00D4FF50',
          cursor:loading?'not-allowed':'pointer',
          color:'#00D4FF',fontSize:13,fontFamily:'Orbitron',
          letterSpacing:2,transition:'all 0.2s',marginBottom:error?12:0}}>
          {loading?(
            <><div style={{width:16,height:16,border:'2px solid #00D4FF30',
              borderTop:'2px solid #00D4FF',borderRadius:'50%',
              animation:'spin 0.8s linear infinite'}}/>
              AUTHENTICATING...</>
          ):(
            <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              width={18} alt="G"/>
              INITIALIZE WITH GOOGLE</>
          )}
        </button>

        {error&&(
          <div style={{padding:'10px 14px',background:'rgba(255,59,59,0.08)',
            border:'1px solid rgba(255,59,59,0.3)',color:'#FF3B3B',
            fontSize:13,fontFamily:'Rajdhani'}}>
            ⚠ {error}
          </div>
        )}

        <div style={{marginTop:28,fontSize:11,color:'#0F2535',lineHeight:2.2,fontFamily:'Rajdhani'}}>
          ◆ Only your authorized account can access<br/>
          ◆ Health data encrypted in Mumbai servers<br/>
          ◆ Zero API keys stored in browser
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{minHeight:'100vh',background:'#020C1B',display:'flex',
      flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <style>{CSS}</style>
      <div style={{width:44,height:44,border:'2px solid #00D4FF15',
        borderTop:'2px solid #00D4FF',borderRadius:'50%',
        animation:'spin 0.9s linear infinite'}}/>
      <div style={{fontSize:11,color:'#00D4FF50',fontFamily:'Orbitron',letterSpacing:3}}>
        INITIALIZING...
      </div>
    </div>
  )
}

export default function App() {
  const [user,     setUser    ] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(()=>{
    const unsub = onAuth(u=>{ setUser(u); setChecking(false) })
    return unsub
  },[])

  if (checking) return <LoadingScreen/>
  if (!user)    return <LoginScreen/>
  return <JarvisHealth user={user} onLogout={logout}/>
}