import { useState, useEffect } from 'react'
import { onAuth, loginWithGoogle, logout } from './firebase'
import JarvisHealth from './JarvisHealth'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#F0EAE0}
  @keyframes spin   {to{transform:rotate(360deg)}}
  @keyframes fadeUp {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sway   {0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
  @keyframes float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
`

export default function App() {
  const [user,setUser]=useState(null)
  const [checking,setChecking]=useState(true)
  const [loading,setLoading]=useState(false)
  const [err,setErr]=useState('')

  useEffect(()=>{const u=onAuth(u=>{setUser(u);setChecking(false)});return u},[])

  if (checking) return (
    <div style={{minHeight:'100vh',background:'#F0EAE0',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{S}</style>
      <div style={{width:26,height:26,border:'2px solid rgba(94,128,48,0.25)',borderTop:'2px solid #5E8030',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  )

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#F0EAE0',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}}>
      <style>{S}</style>

      {/* Organic background blobs */}
      <div style={{position:'absolute',top:'-5%',left:'-5%',width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(94,128,48,0.2) 0%,transparent 65%)',filter:'blur(50px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'-8%',right:'-5%',width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(200,140,60,0.14) 0%,transparent 65%)',filter:'blur(50px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:'40%',right:'15%',width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(58,112,96,0.12) 0%,transparent 65%)',filter:'blur(40px)',pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:360,textAlign:'center',animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',position:'relative',zIndex:1}}>

        {/* Logo */}
        <div style={{width:76,height:76,borderRadius:24,background:'linear-gradient(135deg,#5E8030,#82AA4E)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 22px',fontSize:32,boxShadow:'0 8px 28px rgba(94,128,48,0.32)',animation:'sway 5s ease-in-out infinite'}}>🌱</div>

        {/* Welcome text */}
        <div style={{fontSize:16,fontWeight:600,color:'#8A9482',marginBottom:4,letterSpacing:'0.5px'}}>WELCOME TO</div>
        <div style={{fontSize:30,fontWeight:800,color:'#1A2412',marginBottom:6,letterSpacing:'-0.5px',lineHeight:1.2}}>Badal Health Care</div>
        <div style={{fontSize:13,color:'#8A9482',marginBottom:40,lineHeight:1.5}}>Your personal cancer recovery intelligence</div>

        {/* Login card */}
        <div style={{background:'#FFFFFF',border:'1px solid rgba(94,128,48,0.12)',borderRadius:24,padding:28,boxShadow:'0 4px 28px rgba(0,0,0,0.08),0 0 0 1px rgba(0,0,0,0.02)'}}>

          {/* Health score preview */}
          <div style={{display:'flex',gap:10,marginBottom:24,justifyContent:'center'}}>
            {[{emoji:'🍽️',label:'Nutrition'},{emoji:'💧',label:'Hydration'},{emoji:'🧘',label:'Mind'},  {emoji:'💪',label:'Exercise'}].map((p,i)=>(
              <div key={i} style={{flex:1,padding:'10px 6px',background:'#F9F6F1',borderRadius:12,textAlign:'center',border:'1px solid #EDE8E0'}}>
                <div style={{fontSize:18,marginBottom:4}}>{p.emoji}</div>
                <div style={{fontSize:9,fontWeight:700,color:'#8A9482',textTransform:'uppercase',letterSpacing:0.3}}>{p.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={async()=>{setLoading(true);setErr('');try{await loginWithGoogle()}catch(e){setErr(e.message)}finally{setLoading(false)}}}
            disabled={loading}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:11,padding:'13px 20px',borderRadius:14,border:'1.5px solid #E2DDD6',background:'#FDFAF5',color:'#1A2412',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',transition:'all 0.15s',boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
            {loading
              ?<div style={{width:18,height:18,border:'2px solid #E2DDD6',borderTop:'2px solid #5E8030',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
              :<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt=""/>}
            {loading?'Signing in...':'Continue with Google'}
          </button>

          {err&&<div style={{marginTop:12,padding:'10px 14px',background:'#FDF0EC',border:'1px solid rgba(184,56,40,0.2)',borderRadius:10,color:'#B83828',fontSize:13}}>{err}</div>}
        </div>

        <p style={{marginTop:20,fontSize:11,color:'#B0B8A8'}}>Private · Encrypted · Stored in India 🇮🇳</p>
      </div>
    </div>
  )

  return <JarvisHealth user={user} onLogout={logout}/>
}
