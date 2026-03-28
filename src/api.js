const WORKER = import.meta.env.VITE_WORKER_URL

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

export function imgToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const clean = text.replace(/[#*`◈◉◎◆▸⬡]/g,'').replace(/\n/g,'. ').slice(0,500)
  const utt   = new SpeechSynthesisUtterance(clean)
  utt.rate    = 0.92
  utt.pitch   = 0.88
  utt.volume  = 1
  const voices = window.speechSynthesis.getVoices()
  const best   = voices.find(v =>
    v.name.includes('Daniel') ||
    v.name.includes('Google UK English Male') ||
    v.name.includes('Microsoft David') ||
    v.name.includes('Alex')
  )
  if (best) utt.voice = best
  window.speechSynthesis.speak(utt)
}