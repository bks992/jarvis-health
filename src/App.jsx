import { useState, useEffect } from 'react'
import { onAuth, loginWithGoogle, logout } from './firebase'
import JarvisHealth from './JarvisHealth'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuth(u => { setUser(u); setChecking(false) })
    return unsub
  }, [])

  async function handleLogin() {
    setLoading(true); setError('')
    try { await loginWithGoogle() }
    catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (checking) return (
    <div style={{minHeight:'100vh',background:'#0A0F1E',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid #1E3A5F',borderTop:'3px solid #3B82F6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#0A0F1E',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>
      <div style={{width:'100%',maxWidth:360,textAlign:'center'}}>
        {/* Logo */}
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:28,boxShadow:'0 8px 32px rgba(59,130,246,0.3)'}}>
          🌱
        </div>

        <div style={{fontSize:28,fontWeight:700,color:'#F8FAFC',marginBottom:6,letterSpacing:-0.5}}>
          JARVIS Health
        </div>
        <div style={{fontSize:14,color:'#64748B',marginBottom:40}}>
          Cancer Recovery Intelligence System
        </div>

        <button onClick={handleLogin} disabled={loading} style={{
          width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          padding:'13px 20px',borderRadius:10,border:'1px solid #1E293B',
          background:loading?'#0F172A':'#0F172A',color:'#F8FAFC',
          fontSize:15,fontWeight:500,cursor:loading?'not-allowed':'pointer',
          transition:'all 0.15s',boxShadow:'0 1px 2px rgba(0,0,0,0.3)'}}>
          {loading ? (
            <div style={{width:18,height:18,border:'2px solid #334155',borderTop:'2px solid #3B82F6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt=""/>
          )}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error && (
          <div style={{marginTop:14,padding:'10px 14px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:8,color:'#F87171',fontSize:13}}>
            {error}
          </div>
        )}

        <p style={{marginTop:32,fontSize:12,color:'#334155',lineHeight:1.7}}>
          Private · Encrypted · Stored in India 🇮🇳
        </p>
      </div>
    </div>
  )

  return <JarvisHealth user={user} onLogout={logout}/>
}
