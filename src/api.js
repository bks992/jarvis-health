const WORKER = import.meta.env.VITE_WORKER_URL

// ─── ASK JARVIS ───────────────────────────────────────────────────────────────
export async function askJarvis(messages, systemExtra = '', userEmail = '') {
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': userEmail,
    },
    body: JSON.stringify({ messages, systemExtra, maxTokens: 1200 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || 'No response'
}

// ─── IMAGE COMPRESSION + BASE64 ───────────────────────────────────────────────
// Compresses image to under 5MB before sending to API
// Works on mobile (iOS Safari + Android Chrome)
export function imgToBase64(file, maxSizeMB = 4.5) {
  return new Promise((resolve, reject) => {
    const maxBytes = maxSizeMB * 1024 * 1024

    // If already small enough, just convert directly
    if (file.size <= maxBytes) {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    // Compress using canvas
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate scale to get under limit
      const ratio = Math.sqrt(maxBytes / file.size)
      const w = Math.round(img.width  * ratio)
      const h = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      // Try progressively lower quality until under limit
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob(
          blob => {
            if (!blob) { reject(new Error('Compression failed')); return }
            if (blob.size <= maxBytes || quality <= 0.3) {
              const reader = new FileReader()
              reader.onload  = () => resolve(reader.result.split(',')[1])
              reader.onerror = reject
              reader.readAsDataURL(blob)
            } else {
              quality -= 0.1
              tryCompress()
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }

    img.src = url
  })
}

// ─── SPEECH ENGINE ────────────────────────────────────────────────────────────
// Unlocked flag — iOS Safari requires a user gesture to enable speech
// Call unlockSpeech() once on first user tap
let speechUnlocked = false

export function unlockSpeech() {
  if (speechUnlocked || !window.speechSynthesis) return
  // Speak a silent utterance to unlock the audio context on iOS
  const utt = new SpeechSynthesisUtterance('')
  utt.volume = 0
  window.speechSynthesis.speak(utt)
  speechUnlocked = true
}

// Get best available voice (called lazily after voices load)
function getBestVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(v => v.name === 'Daniel') ||                    // iOS UK Male
    voices.find(v => v.name.includes('Google UK English Male')) || // Android
    voices.find(v => v.name === 'Alex') ||                       // macOS
    voices.find(v => v.name.includes('Microsoft David')) ||       // Windows
    voices.find(v => v.lang === 'en-GB' && !v.name.includes('Female')) ||
    voices.find(v => v.lang.startsWith('en-') && !v.name.toLowerCase().includes('female')) ||
    voices[0] ||
    null
  )
}

// Clean text for speech — remove markdown, symbols, keep structure
function cleanForSpeech(text, maxChars = 600) {
  return text
    .replace(/[#*`_~◈◉◎◆▸⬡◐✦◫]/g, '')  // remove symbols
    .replace(/\*\*(.*?)\*\*/g, '$1')         // remove bold
    .replace(/\[(.*?)\]/g, '$1')             // remove brackets
    .replace(/https?:\/\/\S+/g, '')          // remove URLs
    .replace(/\n{3,}/g, '\n\n')              // collapse blank lines
    .replace(/\n/g, '. ')                    // newlines to pauses
    .replace(/\.{2,}/g, '.')                 // collapse dots
    .replace(/\s{2,}/g, ' ')                 // collapse spaces
    .trim()
    .slice(0, maxChars)
}

export function speak(text, options = {}) {
  if (!window.speechSynthesis) return

  const {
    rate  = 0.90,   // slightly slower = clearer on mobile
    pitch = 0.88,   // slightly lower = JARVIS-like
    volume = 1.0,
    maxChars = 600,
  } = options

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const clean = cleanForSpeech(text, maxChars)
  if (!clean) return

  const utt = new SpeechSynthesisUtterance(clean)
  utt.rate   = rate
  utt.pitch  = pitch
  utt.volume = volume
  utt.lang   = 'en-GB'  // British English for JARVIS feel

  // Voices may not be loaded yet — wait for them
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    const v = getBestVoice()
    if (v) utt.voice = v
    window.speechSynthesis.speak(utt)
  } else {
    // Voices not ready yet (common on iOS) — wait for the event
    window.speechSynthesis.onvoiceschanged = () => {
      const v = getBestVoice()
      if (v) utt.voice = v
      window.speechSynthesis.speak(utt)
      window.speechSynthesis.onvoiceschanged = null
    }
  }

  // iOS Safari bug workaround: speech pauses after ~15s
  // Keep it alive with periodic resume calls
  const keepAlive = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    } else {
      clearInterval(keepAlive)
    }
  }, 10000)

  utt.onend   = () => clearInterval(keepAlive)
  utt.onerror = () => clearInterval(keepAlive)
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
}
