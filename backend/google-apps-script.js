// ============================================================
// J.A.R.V.I.S HealthOS — Google Apps Script Backend
// Deploy this at script.google.com as a Web App
// Your Anthropic API key is stored ONLY here — never in frontend
// ============================================================
//
// SETUP:
// 1. Paste entire file into script.google.com
// 2. Set SHEET_ID below
// 3. Add ANTHROPIC_API_KEY in Project Settings → Script Properties
// 4. Deploy → Web App → Execute as Me → Anyone
// 5. Copy Web App URL into frontend/config.js
// ============================================================

const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";

// ── API key stored securely in Script Properties ─────────
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
}

// ── CORS headers ──────────────────────────────────────────
function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Entry points ──────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    const data = body.data || {};
    let result;
    switch (action) {
      case "saveDailyLog":     result = saveDailyLog(data);     break;
      case "getDailyLogs":     result = getDailyLogs(data.days);break;
      case "saveBiomarker":    result = saveBiomarker(data);    break;
      case "getBiomarkers":    result = getBiomarkers();        break;
      case "getBaseline":      result = getBaseline();          break;
      case "saveTomorrowPlan": result = saveTomorrowPlan(data); break;
      case "savePhoto":        result = savePhoto(data);        break;
      // ── 4 AI Features ──
      case "aiInsight":        result = aiInsight(data);        break;
      case "aiWeeklyReport":   result = aiWeeklyReport(data);   break;
      case "aiPatterns":       result = aiPatterns(data);       break;
      case "aiCoach":          result = aiCoach(data);          break;
      // ── Additional AI ──
      case "aiChat":           result = aiChat(data);           break;
      case "aiTomorrow":       result = aiTomorrow(data);       break;
      case "aiPhoto":          result = aiPhoto(data);          break;
      case "aiSimulate":       result = aiSimulate(data);       break;
      default: result = { error: "Unknown action: " + action };
    }
    return output({ ok: true, data: result });
  } catch (err) {
    return output({ ok: false, error: err.message });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || "";
    let result;
    if (action === "getDailyLogs") result = getDailyLogs(e.parameter.days);
    else if (action === "getBiomarkers") result = getBiomarkers();
    else if (action === "getBaseline") result = getBaseline();
    else result = { status: "JARVIS Backend Online" };
    return output({ ok: true, data: result });
  } catch (err) {
    return output({ ok: false, error: err.message });
  }
}

// ── Sheet helpers ─────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = {
      DailyLog: ["date","healthScore","energyScore","sleepScore","digestionScore","nutritionScore","movementScore","habitScore","energyAM","energyPM","sleepH","weightKg","proteinG","fiberG","waterL","gasLevel","bloating","digestComfort","yogaMins","walkingSteps","gymGroup","symptoms","ribDiscomfort","mood","creonDoses","habitsJson"],
      Biomarkers: ["date","marker","value","unit","notes"],
      TomorrowPlan: ["date","juice","yoga","supplements","protein","food","water","exercise","steps","sleep","watch","briefing"],
      PhotoLog: ["date","driveUrl","analysis","mealType"],
      Baseline: ["key","value","updatedAt"],
    };
    if (headers[name]) sheet.appendRow(headers[name]);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

// ── Data operations ───────────────────────────────────────
function saveDailyLog(d) {
  const sheet = getSheet("DailyLog");
  // Remove existing row for same date
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === d.date) { sheet.deleteRow(i + 1); break; }
  }
  sheet.appendRow([
    d.date, d.healthScore, d.energyScore, d.sleepScore, d.digestionScore,
    d.nutritionScore, d.movementScore, d.habitScore,
    d.energyAM, d.energyPM, d.sleepH, d.weightKg, d.proteinG, d.fiberG,
    d.waterL, d.gasLevel, d.bloating, d.digestComfort, d.yogaMins,
    d.walkingSteps, d.gymGroup, d.symptoms, d.ribDiscomfort, d.mood,
    d.creonDoses, JSON.stringify(d.habits || {}),
  ]);
  updateBaseline();
  return { saved: true };
}

function getDailyLogs(days) {
  const sheet = getSheet("DailyLog");
  const rows = sheetToObjects(sheet);
  const limit = parseInt(days) || 60;
  return rows.slice(-limit);
}

function saveBiomarker(d) {
  getSheet("Biomarkers").appendRow([d.date, d.marker, d.value, d.unit, d.notes || ""]);
  return { saved: true };
}

function getBiomarkers() {
  return sheetToObjects(getSheet("Biomarkers"));
}

function saveTomorrowPlan(d) {
  getSheet("TomorrowPlan").appendRow([d.date, d.juice, d.yoga, d.supplements, d.protein, d.food, d.water, d.exercise, d.steps, d.sleep, d.watch, d.briefing]);
  return { saved: true };
}

function savePhoto(d) {
  // Save to Google Drive and log URL
  const url = d.driveUrl || "";
  getSheet("PhotoLog").appendRow([d.date || new Date().toISOString().split("T")[0], url, d.analysis || "", d.mealType || ""]);
  return { saved: true, url };
}

function getBaseline() {
  const sheet = getSheet("Baseline");
  const rows = sheet.getDataRange().getValues();
  const obj = {};
  rows.slice(1).forEach(r => obj[r[0]] = r[1]);
  return Object.keys(obj).length ? obj : null;
}

function updateBaseline() {
  const logs = getDailyLogs(30);
  if (logs.length < 5) return;
  const avg = key => Math.round(logs.reduce((s, r) => s + (+r[key] || 0), 0) / logs.length * 10) / 10;
  const baseline = {
    healthScore: avg("healthScore"), energy: avg("energyAM"), sleep: avg("sleepH"),
    weight: avg("weightKg"), digestionScore: avg("digestionScore"), exerciseScore: avg("movementScore"),
  };
  const sheet = getSheet("Baseline");
  sheet.clearContents();
  sheet.appendRow(["key", "value", "updatedAt"]);
  const now = new Date().toISOString();
  Object.entries(baseline).forEach(([k, v]) => sheet.appendRow([k, v, now]));
  return baseline;
}

// ── Claude API helper ─────────────────────────────────────
function callClaude(system, userMessage, maxTokens) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in Script Properties");
  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    payload: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens || 1000,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
    muteHttpExceptions: true,
  });
  const json = JSON.parse(response.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.content?.[0]?.text || "";
}

function callClaudeVision(system, imageBase64, textPrompt) {
  const apiKey = getApiKey();
  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    payload: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: textPrompt },
        ],
      }],
    }),
    muteHttpExceptions: true,
  });
  const json = JSON.parse(response.getContentText());
  return json.content?.[0]?.text || "";
}

// ── AI Feature 1: Health Insights ────────────────────────
function aiInsight(data) {
  const sys = `You are J.A.R.V.I.S — personal health intelligence AI for a pancreatic cancer survivor in remission. Analyse health signals and explain patterns in clear, warm language. Reference specific numbers. Under 100 words. Actionable. No disclaimers.`;
  const msg = `Health signals:\n${JSON.stringify(data, null, 2)}\n\nExplain key patterns and give one priority recommendation.`;
  return { insight: callClaude(sys, msg, 300) };
}

// ── AI Feature 2: Weekly Report ───────────────────────────
function aiWeeklyReport(data) {
  const sys = `You are J.A.R.V.I.S generating a weekly health mission debrief for a pancreatic cancer survivor in remission. Format: ## MISSION STATUS / ## KEY SIGNALS / ## ANOMALIES DETECTED / ## RECOMMENDED PROTOCOLS. Doctor-grade, JARVIS style. Under 220 words.`;
  const msg = `Weekly aggregated data:\n${JSON.stringify(data, null, 2)}\n\nGenerate the weekly debrief.`;
  return { report: callClaude(sys, msg, 600) };
}

// ── AI Feature 3: Pattern Discovery ──────────────────────
function aiPatterns(data) {
  const sys = `You are JARVIS pattern intelligence engine. Analyse 30-day health data and find top 4 hidden correlations. JARVIS style. Bullet points with → prefix. Under 160 words.`;
  const msg = `30-day health summary:\n${JSON.stringify(data, null, 2)}\n\nDiscover top 4 health patterns.`;
  return { patterns: callClaude(sys, msg, 400) };
}

// ── AI Feature 4: Daily Coach ─────────────────────────────
function aiCoach(data) {
  const sys = `You are JARVIS Daily Coach for cancer recovery. Based on yesterday's data, give today's personalised focus plan. Format: 3-4 bullet points of specific, achievable actions. JARVIS style. Under 90 words.`;
  const msg = `Yesterday's data:\n${JSON.stringify(data, null, 2)}\n\nGenerate today's coaching focus.`;
  return { coaching: callClaude(sys, msg, 300) };
}

// ── Additional AI: Chat ───────────────────────────────────
function aiChat(data) {
  const reply = callClaude(data.system || "You are JARVIS health AI.", data.userMsg || "", 500);
  return { reply };
}

// ── Additional AI: Tomorrow Plan ─────────────────────────
function aiTomorrow(data) {
  const sys = `You are J.A.R.V.I.S generating tomorrow's healing protocol for a pancreatic cancer survivor in remission. Return ONLY valid JSON with these exact keys: juice, yoga, supplements, protein, food, water, exercise, steps, sleep, watch, briefing. 1-2 sentences per value. Pure JSON, no markdown.`;
  const msg = `Today's data: ${JSON.stringify(data.today)}\nTargets: ${JSON.stringify(data.targets)}\nGenerate tomorrow's personalised healing plan.`;
  const raw = callClaude(sys, msg, 700);
  try {
    const plan = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return { plan };
  } catch (e) {
    return { plan: null };
  }
}

// ── Additional AI: Photo Analysis ─────────────────────────
function aiPhoto(data) {
  const sys = `You are J.A.R.V.I.S analysing a meal photo for a pancreatic cancer survivor. Estimate nutrition and give specific feedback. Format:\nPROTEIN: Xg (estimated)\nFIBER: Xg (estimated)\nVEGETABLES: X servings\nANTI-INFLAMMATORY: [foods present]\nRATING: X/10\nSUGGESTION: [what to add or change for cancer recovery]\nJARVIS style. Under 90 words.`;
  const analysis = callClaudeVision(sys, data.imageBase64, "Analyse this meal for my cancer recovery diet.");
  return { analysis };
}

// ── Additional AI: What-If Simulation ────────────────────
function aiSimulate(data) {
  const sys = `You are JARVIS. Analyse a what-if health simulation for a pancreatic cancer survivor. 2-3 sentences. JARVIS style. Specific. Under 70 words.`;
  const msg = `Current: protein ${data.currentProtein}g, sleep ${data.currentSleep}h, health score ${data.base}.\nSimulated: protein ${data.protein}g, sleep ${data.sleep}h, exercise ${data.exercise} mins, stress reduced ${data.stress}%.\nPredicted new score: ${data.newScore}.\nAnalyse the predicted impact on recovery.`;
  return { analysis: callClaude(sys, msg, 250) };
}
