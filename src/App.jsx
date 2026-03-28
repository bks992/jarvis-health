import { useState, useEffect } from 'react'
import { onAuth, loginWithGoogle, logout } from './firebase'
import JarvisHealth from './JarvisHealth'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#0D0B1E}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
`

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(()=>{const u=onAuth(u=>{setUser(u);setChecking(false)});return u},[])

  if (checking) return (
    <div style={{minHeight:'100vh',background:'#0D0B1E',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
      <style>{S}</style>
      <div style={{position:'absolute',top:'10%',left:'10%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none'}}/>
      <div style={{width:26,height:26,border:'2px solid rgba(167,139,250,0.3)',borderTop:'2px solid #A78BFA',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  )

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#0D0B1E',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}}>
      <style>{S}</style>
      {/* Background orbs */}
      <div style={{position:'absolute',top:'-10%',left:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.35) 0%,transparent 65%)',filter:'blur(60px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'-10%',right:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,0.25) 0%,transparent 65%)',filter:'blur(60px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:'50%',right:'20%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 65%)',filter:'blur(50px)',pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:360,textAlign:'center',animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',position:'relative',zIndex:1}}>
        {/* Logo */}
        <div style={{width:72,height:72,borderRadius:22,background:'linear-gradient(135deg,#10B981,#6366F1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:30,boxShadow:'0 8px 32px rgba(99,102,241,0.45),0 0 0 1px rgba(255,255,255,0.1) inset',animation:'float 4s ease-in-out infinite'}}>🌱</div>

        <div style={{fontSize:28,fontWeight:800,color:'#F1F5F9',marginBottom:6,letterSpacing:'-0.5px'}}>Welcome to</div>
        <div style={{fontSize:30,fontWeight:800,background:'linear-gradient(135deg,#34D399,#60A5FA,#A78BFA)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:8,letterSpacing:'-0.5px'}}>Badal Health Care</div>
        <div style={{fontSize:13,color:'rgba(241,245,249,0.4)',marginBottom:40}}>Your personal cancer recovery intelligence</div>

        {/* Login card */}
        <div style={{background:'rgba(255,255,255,0.06)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:22,padding:28,boxShadow:'0 16px 48px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.08)'}}>
          <button onClick={async()=>{setLoading(true);setErr('');try{await loginWithGoogle()}catch(e){setErr(e.message)}finally{setLoading(false)}}} disabled={loading}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:11,padding:'14px 20px',borderRadius:14,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.08)',color:'#F1F5F9',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',transition:'all 0.15s',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
            {loading
              ?<div style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.2)',borderTop:'2px solid white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
              :<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt=""/>}
            {loading?'Signing in...':'Continue with Google'}
          </button>
          {err&&<div style={{marginTop:14,padding:'10px 14px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,color:'#F87171',fontSize:13}}>{err}</div>}
        </div>

        <p style={{marginTop:22,fontSize:11,color:'rgba(241,245,249,0.2)'}}>Private · Encrypted · Stored in India 🇮🇳</p>
      </div>
    </div>
  )

  return <JarvisHealth user={user} onLogout={logout}/>
}
