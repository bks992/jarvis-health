import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth'
import {
  getFirestore,
  doc, setDoc, getDoc,
  collection, addDoc, getDocs,
  query, orderBy, limit, serverTimestamp
} from 'firebase/firestore'

const app = initializeApp({
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db   = getFirestore(app)

const provider = new GoogleAuthProvider()
const ALLOWED  = import.meta.env.VITE_ALLOWED_EMAIL

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  if (result.user.email !== ALLOWED) {
    await signOut(auth)
    throw new Error('Access denied. This is a private system.')
  }
  return result
}

export const logout = ()   => signOut(auth)
export const onAuth = (cb) => onAuthStateChanged(auth, cb)

const col = (uid, name)     => collection(db, 'users', uid, name)
const ref = (uid, name, id) => doc(db, 'users', uid, name, id)
const ts  = ()              => serverTimestamp()

// ── FOOD LOGS ────────────────────────────────────────────────────────────────
export const saveFoodLog = (uid, data) => addDoc(col(uid, 'foodLogs'), { ...data, ts: ts() })
export const getFoodLogs = async (uid) => {
  const q = query(col(uid, 'foodLogs'), orderBy('ts','desc'), limit(100))
  const s = await getDocs(q)
  return s.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── BLOOD REPORTS ────────────────────────────────────────────────────────────
export const saveBloodReport = (uid, data) => addDoc(col(uid, 'bloodReports'), { ...data, ts: ts() })
export const getBloodReports = async (uid) => {
  const q = query(col(uid, 'bloodReports'), orderBy('ts','desc'))
  const s = await getDocs(q)
  return s.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── MEDICINES ────────────────────────────────────────────────────────────────
export const saveMedicine     = (uid, id, data) => setDoc(ref(uid, 'medicines', id), { ...data, ts: ts() })
export const deleteMedicine   = (uid, id) => import('firebase/firestore').then(({deleteDoc}) => deleteDoc(ref(uid, 'medicines', id)))
export const getMedicines     = async (uid) => {
  const s = await getDocs(col(uid, 'medicines'))
  return s.docs.map(d => ({ id: d.id, ...d.data() }))
}
export const saveMedLog       = (uid, date, data) => setDoc(ref(uid, 'medLogs', date), { ...data, ts: ts() })
export const getMedLog        = async (uid, date) => {
  const s = await getDoc(ref(uid, 'medLogs', date))
  return s.exists() ? s.data() : {}
}

// ── HEALTH PROFILE ───────────────────────────────────────────────────────────
export const saveHealthProfile = (uid, data) => setDoc(doc(db, 'users', uid, 'meta', 'profile'), { ...data, ts: ts() })
export const getHealthProfile  = async (uid) => {
  const s = await getDoc(doc(db, 'users', uid, 'meta', 'profile'))
  return s.exists() ? s.data() : {}
}

// ── CHAT ─────────────────────────────────────────────────────────────────────
export const saveChat  = (uid, role, content) => addDoc(col(uid, 'chat'), { role, content, ts: ts() })
export const getChat   = async (uid) => {
  const q = query(col(uid, 'chat'), orderBy('ts','desc'), limit(50))
  const s = await getDocs(q)
  return s.docs.map(d => d.data()).reverse()
}

// ── GUIDES & PLANS ───────────────────────────────────────────────────────────
export const saveGuide = (uid, topic, content) => setDoc(ref(uid, 'guides', topic), { content, ts: ts() })
export const getGuides = async (uid) => {
  const s = await getDocs(col(uid, 'guides'))
  const m = {}; s.docs.forEach(d => { m[d.id] = d.data().content }); return m
}
export const savePlan  = (uid, key, content) => setDoc(ref(uid, 'plans', key), { content, ts: ts() })
export const getPlans  = async (uid) => {
  const s = await getDocs(col(uid, 'plans'))
  const m = {}; s.docs.forEach(d => { m[d.id] = d.data().content }); return m
}

// ── INTOLERANCES ─────────────────────────────────────────────────────────────
export const saveIntolerance = (uid, food) => setDoc(ref(uid, 'intolerances', food.replace(/\s+/g,'_').toLowerCase()), { food, ts: ts() })
export const getIntolerances = async (uid) => {
  const s = await getDocs(col(uid, 'intolerances'))
  return s.docs.map(d => d.data().food)
}

// ── DAILY LOG ────────────────────────────────────────────────────────────────
export const saveDailyLog = (uid, date, data) => setDoc(ref(uid, 'dailyLogs', date), { ...data, ts: ts() })
export const getDailyLog  = async (uid, date) => {
  const s = await getDoc(ref(uid, 'dailyLogs', date))
  return s.exists() ? s.data() : {}
}

// ── CONVERSATIONS (full AI sessions stored) ───────────────────────────────────
export const saveConversation = (uid, data) => addDoc(col(uid, 'conversations'), { ...data, ts: ts() })
