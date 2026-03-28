const WORKER = import.meta.env.VITE_WORKER_URL

// ── ASK JARVIS ───────────────────────────────────────────────────────────────
export async function askJarvis(messages, systemExtra = '', userEmail = '') {
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': userEmail,
    },
    body: JSON.stringify({ messages, systemExtra, maxTokens: 1500 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || 'No response'
}

// ── IMAGE: COMPRESS + BASE64 ─────────────────────────────────────────────────
// Compresses image to under 4.5MB using canvas. Works on iOS + Android.
export function imgToBase64(file, maxSizeMB = 4.5) {
  return new Promise((resolve, reject) => {
    const maxBytes = maxSizeMB * 1024 * 1024

    const compress = (src) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(src)
        // Scale down if needed
        const scale = file.size > maxBytes ? Math.sqrt(maxBytes / file.size) * 0.9 : 1
        const w = Math.round(img.naturalWidth  * Math.min(scale, 1))
        const h = Math.round(img.naturalHeight * Math.min(scale, 1))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)

        const tryQ = (q) => {
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Canvas compression failed')); return }
            if (blob.size <= maxBytes || q <= 0.25) {
              const reader = new FileReader()
              reader.onload  = () => resolve(reader.result.split(',')[1])
              reader.onerror = reject
              reader.readAsDataURL(blob)
            } else {
              tryQ(q - 0.1)
            }
          }, 'image/jpeg', q)
        }
        tryQ(file.size > maxBytes ? 0.75 : 0.9)
      }
      img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Image load failed')) }
      img.src = src
    }

    // Use FileReader as fallback if createObjectURL fails
    try {
      compress(URL.createObjectURL(file))
    } catch {
      const reader = new FileReader()
      reader.onload = e => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
          canvas.getContext('2d').drawImage(img, 0, 0)
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Failed')); return }
            const r2 = new FileReader()
            r2.onload = () => resolve(r2.result.split(',')[1])
            r2.readAsDataURL(blob)
          }, 'image/jpeg', 0.8)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }
  })
}

// ── SPEECH ENGINE ────────────────────────────────────────────────────────────
let _speechReady = false

// Must be called on a direct user tap (iOS requirement)
export function unlockSpeech() {
  if (_speechReady || !window.speechSynthesis) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0; u.rate = 10
  window.speechSynthesis.speak(u)
  _speechReady = true
}

function pickVoice() {
  const vs = window.speechSynthesis.getVoices()
  return (
    vs.find(v => v.name === 'Daniel') ||
    vs.find(v => /Google UK English Male/i.test(v.name)) ||
    vs.find(v => v.name === 'Alex') ||
    vs.find(v => /Microsoft David/i.test(v.name)) ||
    vs.find(v => v.lang === 'en-GB') ||
    vs.find(v => v.lang.startsWith('en') && !/female|zira|hazel/i.test(v.name)) ||
    vs[0]
  )
}

function cleanText(text, max = 500) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*`_~◈◉◎◆▸⬡◐✦|]/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max)
}

export function speak(text, opts = {}) {
  if (!window.speechSynthesis || !text) return
  const { rate = 0.88, pitch = 0.85, volume = 1, max = 500 } = opts
  window.speechSynthesis.cancel()
  const clean = cleanText(text, max)
  if (!clean.trim()) return

  const say = () => {
    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = 'en-GB'; utt.rate = rate; utt.pitch = pitch; utt.volume = volume
    const v = pickVoice()
    if (v) utt.voice = v

    // iOS keepalive — speech cuts after ~15s
    let alive
    utt.onstart = () => {
      alive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        } else clearInterval(alive)
      }, 12000)
    }
    utt.onend   = () => clearInterval(alive)
    utt.onerror = () => clearInterval(alive)
    window.speechSynthesis.speak(utt)
  }

  // Voices may not be loaded yet
  if (window.speechSynthesis.getVoices().length > 0) {
    say()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      say()
    }
  }
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
}
