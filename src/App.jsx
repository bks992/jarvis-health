import { useState, useEffect } from 'react'
import { onAuth, loginWithGoogle, logout } from './firebase'
import JarvisHealth from './JarvisHealth'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#F0F5F9;font-family:'DM Sans',system-ui,sans-serif;min-height:100vh}
  @keyframes spin{to{transform:rotate(360deg)}}
`
export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { const u = onAuth(u => { setUser(u); setChecking(false) }); return u }, [])

  if (checking) return (
    <div style={{minHeight:'100vh',background:'#F0F5F9',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{S}</style>
      <div style={{width:28,height:28,border:'3px solid #E2EBF0',borderTop:'3px solid #0EA5E9',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  )

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#F0F5F9',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <style>{S}</style>
      <div style={{width:'100%',maxWidth:340,textAlign:'center'}}>
        <div style={{width:60,height:60,borderRadius:16,background:'linear-gradient(135deg,#10B981,#0EA5E9)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:26,boxShadow:'0 8px 24px rgba(14,165,233,0.25)'}}>🌱</div>
        <div style={{fontSize:26,fontWeight:800,color:'#0F172A',marginBottom:6,letterSpacing:'-0.5px'}}>JARVIS Health</div>
        <div style={{fontSize:14,color:'#64748B',marginBottom:36,lineHeight:1.5}}>Cancer Recovery Intelligence</div>
        <button onClick={async () => { setLoading(true); setErr(''); try { await loginWithGoogle() } catch(e) { setErr(e.message) } finally { setLoading(false) } }} disabled={loading}
          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 20px',borderRadius:12,border:'1.5px solid #E2EBF0',background:'white',color:'#0F172A',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',boxShadow:'0 1px 4px rgba(15,23,42,0.08)'}}>
          {loading ? <div style={{width:18,height:18,border:'2px solid #E2EBF0',borderTop:'2px solid #0EA5E9',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt=""/>}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        {err && <div style={{marginTop:14,padding:'10px 14px',background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:8,color:'#DC2626',fontSize:13}}>{err}</div>}
        <p style={{marginTop:28,fontSize:11,color:'#94A3B8'}}>Private · Encrypted · Stored in India 🇮🇳</p>
      </div>
    </div>
  )

  return <JarvisHealth user={user} onLogout={logout}/>
}
