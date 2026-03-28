const WORKER = import.meta.env.VITE_WORKER_URL

export async function askJarvis(messages, systemExtra = '', userEmail = '') {
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Email': userEmail },
    body: JSON.stringify({ messages, systemExtra, maxTokens: 1500 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || 'No response'
}

// ── IMAGE COMPRESSION ─────────────────────────────────────────────────────────
export function imgToBase64(file, maxMB = 4.5) {
  return new Promise((resolve, reject) => {
    const max = maxMB * 1024 * 1024
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = file.size > max ? Math.sqrt(max / file.size) * 0.88 : 1
        const w = Math.round(img.naturalWidth * Math.min(scale, 1))
        const h = Math.round(img.naturalHeight * Math.min(scale, 1))
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        const compress = (q) => c.toBlob(blob => {
          if (!blob) { reject(new Error('Compression failed')); return }
          if (blob.size <= max || q <= 0.25) {
            const r2 = new FileReader()
            r2.onload = () => resolve(r2.result.split(',')[1])
            r2.onerror = reject
            r2.readAsDataURL(blob)
          } else compress(q - 0.1)
        }, 'image/jpeg', q)
        compress(file.size > max ? 0.75 : 0.88)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── SPEECH ENGINE ─────────────────────────────────────────────────────────────
let unlocked = false

export function unlockSpeech() {
  if (unlocked || !window.speechSynthesis) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0; u.rate = 10
  window.speechSynthesis.speak(u)
  unlocked = true
}

function bestVoice() {
  const vs = window.speechSynthesis.getVoices()
  return (
    vs.find(v => v.name === 'Daniel') ||
    vs.find(v => /Google UK English Male/i.test(v.name)) ||
    vs.find(v => v.name === 'Alex') ||
    vs.find(v => /Microsoft David/i.test(v.name)) ||
    vs.find(v => v.lang === 'en-IN' && !v.name.toLowerCase().includes('female')) ||
    vs.find(v => v.lang.startsWith('en') && !/(female|zira|hazel|victoria|karen)/i.test(v.name)) ||
    vs[0]
  )
}

function cleanText(txt, max = 450) {
  return txt
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[#*`_~|◈◉◎◆▸⬡◐✦]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max)
}

export function speak(text, { max = 450, rate = 0.88, pitch = 0.9 } = {}) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const clean = cleanText(text, max)
  if (!clean) return
  const say = () => {
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'en-IN'; u.rate = rate; u.pitch = pitch; u.volume = 1
    const v = bestVoice(); if (v) u.voice = v
    let alive
    u.onstart = () => { alive = setInterval(() => { if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); window.speechSynthesis.resume() } else clearInterval(alive) }, 12000) }
    u.onend = u.onerror = () => clearInterval(alive)
    window.speechSynthesis.speak(u)
  }
  if (window.speechSynthesis.getVoices().length > 0) say()
  else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; say() } }
}

export const stopSpeaking = () => window.speechSynthesis?.cancel()
