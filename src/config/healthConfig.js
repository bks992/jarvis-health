// J.A.R.V.I.S HealthOS — Health Configuration
// Fill in your credentials before deploying.

export const CONFIG = {
  GOOGLE_SCRIPT_URL: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL",
  APP_NAME: "J.A.R.V.I.S",
  APP_SUBTITLE: "Health Intelligence System",
  USER_NAME: "Badal",
  TARGET_HEALTH_SCORE: 80,
  TARGET_PROTEIN_G: 80,
  TARGET_SLEEP_H: 7,
  TARGET_WATER_L: 2.5,
  TARGET_STEPS: 8000,
  BASELINE: {
    energy: 7.0,
    sleep: 7.2,
    weight: 65.5,
    digestionScore: 80,
    exerciseScore: 70,
    healthScore: 81,
  },
  FEATURES: {
    jarvisChat: true,
    photoAnalysis: true,
    tomorrowPlan: true,
    whatIfSim: true,
    weeklyReport: true,
    patternAI: true,
    driftDetection: true,
  },
}
