# J.A.R.V.I.S HealthOS v3 — React Edition
## Bio-Diagnostic HUD · Body System Map · Drift Detection · AI Trajectory

---

## ⚡ STEP 1 — Run locally (5 minutes)

```bash
# 1. Unzip this folder
# 2. Open terminal inside the folder

npm install
npm run dev

# Open http://localhost:5173/jarvis/
```

The app runs fully in **offline/demo mode** with mock data. No backend needed to test.

---

## 🔧 STEP 2 — Fill in your config

Open `src/config/healthConfig.js` and update:

```js
const CONFIG = {
  GOOGLE_SCRIPT_URL: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL",  // ← paste here
  USER_NAME: "Badal",          // ← your name
  TARGET_PROTEIN_G: 80,        // ← your protein target
  TARGET_SLEEP_H: 7,           // ← your sleep target
  TARGET_WATER_L: 2.5,
  TARGET_STEPS: 8000,
}
```

---

## 🚀 STEP 3 — Deploy your Google Apps Script backend

> Skip if you already have this running from Jarvis v2.

1. Go to **script.google.com** → New project
2. Paste the entire contents of `backend/google-apps-script.js`
3. Set your `SHEET_ID`:
   ```js
   const SHEET_ID = "your_google_sheet_id_here";
   ```
4. Add your Anthropic API key:
   - Click ⚙️ **Project Settings** → **Script Properties**
   - Add property: `ANTHROPIC_API_KEY` = `sk-ant-...`
5. Click **Deploy** → **New deployment** → **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the **Web App URL**
7. Paste it in `src/config/healthConfig.js` → `GOOGLE_SCRIPT_URL`

---

## 📦 STEP 4 — Build for production

```bash
npm run build
```

This creates a `dist/` folder — **these are your production files**.

---

## 🌐 STEP 5 — Deploy to GitHub Pages (free hosting)

```bash
# 1. Create a GitHub repo named: jarvis-health

# 2. Push your code
git init
git add .
git commit -m "JARVIS HealthOS v3"
git remote add origin https://github.com/YOUR_USERNAME/jarvis-health.git
git push -u origin main

# 3. Install gh-pages
npm install --save-dev gh-pages

# 4. Add to package.json scripts:
#    "deploy": "gh-pages -d dist"

# 5. Deploy
npm run build
npm run deploy
```

Your app will be live at: `https://YOUR_USERNAME.github.io/jarvis/`

---

## 🌐 Alternative: Deploy to Netlify (even easier)

1. Run `npm run build`
2. Go to **netlify.com** → **Add new site** → **Deploy manually**
3. Drag and drop the `dist/` folder
4. Done — live in 30 seconds!

---

## 📁 Project structure

```
jarvis-health/
├── index.html                      ← Entry point
├── package.json
├── vite.config.js
├── backend/
│   └── google-apps-script.js       ← Your backend (unchanged from v2)
└── src/
    ├── main.jsx                    ← React entry
    ├── config/
    │   └── healthConfig.js         ← ⭐ YOUR SETTINGS HERE
    ├── db/
    │   ├── index.js                ← DB abstraction layer
    │   └── providers/
    │       └── googleSheets.js     ← Google Sheets provider
    ├── services/
    │   └── api.js                  ← API service layer
    ├── utils/
    │   ├── scoring.js              ← All health math + drift detection
    │   └── useHealthData.js        ← React data hook
    ├── styles/
    │   └── global.css              ← Bio-Diagnostic HUD theme
    └── components/
        ├── AppShell.jsx            ← Sidebar + navigation
        ├── shared/
        │   └── HudComponents.jsx   ← TopBar, Toast, StatBar
        └── pages/
            ├── Dashboard.jsx       ← Command Center (Body Map + Drift + Trajectory)
            ├── LogPage.jsx         ← Daily Log
            ├── AiPages.jsx         ← JARVIS Chat, Tomorrow Plan, Photo, Simulator
            └── HealthPages.jsx     ← Twin, Radar, Biomarkers, Insights, Coach, Report
```

---

## ✅ Features included

| Feature | Status |
|---|---|
| Bio-Diagnostic HUD theme | ✅ |
| Body System Map (7 organs) | ✅ |
| JARVIS AI Intelligence Feed | ✅ |
| Health Trajectory (past + predicted) | ✅ |
| Tomorrow Healing Plan | ✅ |
| Health Stability Drift Detection | ✅ |
| Digital Twin (7 biological systems) | ✅ |
| Risk Radar | ✅ |
| Biomarker tracking (CA 19-9 trend) | ✅ |
| Daily Log with habit tracker | ✅ |
| JARVIS AI Chat | ✅ |
| Photo meal analysis | ✅ |
| What-If Simulator | ✅ |
| Weekly Report | ✅ |
| AI Coach + Patterns | ✅ |
| Offline/demo mode | ✅ |
| Google Sheets backend | ✅ |
| Firebase-ready (future swap) | ✅ |
