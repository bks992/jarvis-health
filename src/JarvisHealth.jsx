import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  getFoodLogs, saveFoodLog, getBloodReports, saveBloodReport,
  getMedicines, saveMedicine, deleteMedicine, getMedLog, saveMedLog,
  getHealthProfile, saveHealthProfile,
  getGuides, saveGuide, getPlans, savePlan,
  getChat, saveChat, getIntolerances, saveIntolerance,
  getDailyLog, saveDailyLog,
} from './firebase'
import { askJarvis, imgToBase64, speak, stopSpeaking, unlockSpeech } from './api'

// ─── MEDICAL PROTOCOL KNOWLEDGE BASE ─────────────────────────────────────────
const PROTOCOL_KNOWLEDGE = `
RECOVERY & REMISSION PROTOCOL — COMPLETE MEDICAL BLUEPRINT

PATIENT PROFILE:
- Pancreatic cancer (tail + body) — distal pancreatectomy completed
- Liver metastasis treated with radiation + ablation
- Multiple chemotherapy regimens completed (platinum-based + others)
- Status: REMISSION — PET-CT CLEAR
- CA 19-9 target: ~6 U/mL (clinical normal <37)
- Must take PERT (pancreatic enzyme replacement) with EVERY meal/snack — non-negotiable

PILLAR 1 — NUTRITION:
- 5-6 small meals daily (NOT 3 large meals)
- PERT enzymes with first bite of every meal/snack containing fat or protein — NEVER skip
- Protein: 1.2-1.5g per kg body weight per day (80g+ daily target)
- Start low-medium fat; increase gradually as tolerance builds
- Eat within 1 hour of waking; never empty stomach
- Chew 20-30 times per bite; room temperature food only

DAILY SCHEDULE:
6:30am: Warm lemon water + pinch turmeric + pinch black pepper + 1 tsp amla juice
7:30am: Breakfast + PERT enzymes
10:30am: Mid-morning protein snack + PERT
1pm: Lunch + PERT (largest meal)
4pm: Evening snack + PERT
7pm: Dinner + PERT (lighter)
9:30pm: Golden milk (haldi doodh)

BEST FOODS: Eggs, fish (rohu/pomfret), paneer, dal, Greek yogurt, moong dal, curd,
Beetroot, amla, lemon, turmeric, ginger, tulsi, mushrooms, berries, walnuts, flaxseed,
Ghee, soaked dates, banana, sweet potato, peanut butter, full-fat curd

AVOID: Raw salads (large quantities), fried/spicy food, refined sugar, maida, processed food,
Cold drinks, fruit juices, alcohol (liver had radiation — zero tolerance), red meat

PILLAR 2 — SUPPLEMENTS:
Morning: Vitamin D3 + K2, Omega-3 (2-3g), B-complex (methylated), Zinc (15-25mg)
Mid-morning: CoQ10 (200mg)
Lunch: Berberine (500mg), Milk Thistle (200-400mg)
Evening: Quercetin (500mg)
Dinner: Ashwagandha KSM-66 (600mg), NAC (600mg)
Bedtime: Probiotic, Melatonin (10-20mg), Magnesium glycinate

PILLAR 3 — EXERCISE:
Phase 1 (Weeks 1-6): 20-30 min daily walk + gentle yoga + wall push-ups/chair squats (3x/week) + Pranayama 10 min daily
Phase 2 (Weeks 7-16): 30-45 min walk + bodyweight strength 3x/week → 2-5kg dumbbells
Phase 3 (Month 4+): 45 min cardio + 4x/week gym (Push/Pull/Legs/Rest), swimming
Target: 8000 steps/day. Every 1000 steps = 8% cancer recurrence reduction (JAMA).
Never exercise on empty stomach. Protein within 30 min post-workout.

PILLAR 4 — MIND & BODY (SLEEP + PRANAYAMA + YOGA):
- 7.5-8.5 hours sleep — cellular repair happens during sleep, growth hormone peaks 11pm
- Pranayama daily: Anulom Vilom 10 min (NK cells +30%), Bhramari 5 min (nitric oxide x15), Belly breathing 2 min
- Yoga 1-2 sessions/week: twists (digestion), hip openers, chest expansion
- Avoid blue light after 9pm; meditation 10 min daily; cortisol management via Ashwagandha

HYDRATION PROTOCOL:
- Plain water: 2+ litres daily (liver needs water to process toxins)
- Medicinal drinks: Lemon water (morning), Ash gourd juice 200ml, Ginger water pre-meal,
  Tulsi/barley water, Triphala water evening, Golden milk bedtime
- Total fluid target: 2.5-3L daily

CA 19-9 REDUCTION (5 Layers):
Layer 1 — Blood Sugar (40% impact): Eliminate refined sugar, low glycemic diet, cinnamon + berberine, fasting glucose target 80-90
Layer 2 — Liver Support (25%): Milk thistle, NAC 600mg, amla 2 tsp, 3L water, no alcohol
Layer 3 — Gut Inflammation: L-Glutamine 5g empty stomach, probiotics, no NSAIDs
Layer 4 — Anti-inflammatory: Turmeric+pepper in golden milk, Omega-3 2-3g, ginger daily, green tea
Layer 5 — Anti-Cancer Agents: Vitamin D3 4000-5000 IU, Melatonin 10-20mg, Quercetin 500mg, Modified Citrus Pectin 5g 3x

FERTILITY RECOVERY (Male):
CoQ10 400-600mg/day, Ashwagandha KSM-66 600mg/day, L-Carnitine 2g/day, Zinc, Selenium, Vitamin E
Sperm regeneration = 74 days. Month 6-12 = significant recovery window.
`

// ─── SUPERFOODS DATABASE (static, instant, no API) ───────────────────────────
const SUPERFOODS = [
  { name:'Amla (Indian Gooseberry)', emoji:'🫐', tag:'MUST HAVE', color:'#10B981',
    dose:'1–2 tsp powder or 15ml fresh juice', timing:'Morning, empty stomach before breakfast',
    why:'Highest natural Vitamin C source on earth. Liver regeneration after radiation. Directly reduces CA 19-9 via anti-inflammatory pathways. Immune system rebuilder.',
    science:'Emblicanin-A/B neutralise free radicals 50× more effectively than Vitamin C alone. Liver protective in multiple Indian clinical trials (AIIMS).',
    how:'Mix 1 tsp amla powder in warm water with lemon. Add to morning lemon water. Or fresh amla juice 15ml diluted 1:3 with water. Can also chew 1 fresh amla.',
    avoid:'Do not take with iron supplements within 1 hour (reduces iron absorption).' },
  { name:'Turmeric + Black Pepper', emoji:'🟡', tag:'MUST HAVE', color:'#F59E0B',
    dose:'1 tsp turmeric + pinch black pepper', timing:'Every meal + golden milk at bedtime',
    why:'Curcumin suppresses NF-kB — the master cancer cell survival switch. Reduces liver inflammation post-radiation. Direct anti-tumor compound.',
    science:'Piperine from black pepper increases curcumin absorption by 2000%. Without pepper, turmeric has <5% bioavailability. Golden milk delivers curcumin in fat — further boosting absorption.',
    how:'Add to dal, sabzi, scrambled eggs every single day. Bedtime golden milk: 1 cup warm full-fat milk + 1 tsp turmeric + pinch pepper + pinch cinnamon + 1 tsp honey.',
    avoid:'Very high doses may interact with blood thinners. Food quantities are always safe.' },
  { name:'Ginger (Fresh)', emoji:'🫚', tag:'MUST HAVE', color:'#F59E0B',
    dose:'2–3 cm fresh piece daily or 1 tsp powder', timing:'Ginger water 15 min before every meal',
    why:'6-Gingerol is directly cytotoxic to pancreatic cancer cells in multiple peer-reviewed studies. Stimulates digestive enzymes. Anti-nausea (critical post-chemo). Reduces bloating.',
    science:'Oncogene (2012): 6-Gingerol induced apoptosis in pancreatic cancer cells at dietary-achievable doses. Also inhibits COX-2 (cancer inflammation enzyme).',
    how:'Grate fresh ginger into warm water, steep 5 min, drink before meals. Add to dal, curry, tea. Daily immunity shot: ginger + honey + lemon + warm water.',
    avoid:'High medicinal doses may interact with blood thinners. Regular food amounts are always safe.' },
  { name:'Ash Gourd (Winter Melon)', emoji:'🥒', tag:'MUST HAVE', color:'#10B981',
    dose:'200ml fresh juice', timing:'Morning, 30 min before breakfast on empty stomach',
    why:'Heals gut lining destroyed by chemotherapy. Alkalises body pH (cancer thrives in acid). Blood sugar stabilisation. Traditional Ayurvedic liver and kidney tonic.',
    science:'Cucurbitacins and flavonoids directly repair intestinal epithelial tight junctions — the gut barrier damaged by chemo drugs.',
    how:'Blend fresh ash gourd with minimal water, strain through muslin, drink immediately. No sugar or salt. Start with 100ml if new to it.',
    avoid:'No known interactions. Best results on empty stomach.' },
  { name:'Tulsi (Holy Basil)', emoji:'🌿', tag:'MUST HAVE', color:'#10B981',
    dose:'7 fresh leaves or 1 cup tulsi tea', timing:'Morning (chew leaves) + afternoon (tea)',
    why:'Adaptogen — reduces cortisol (cortisol directly feeds cancer growth). Activates NK cells. Radioprotective — shields DNA from radiation damage. Liver support.',
    science:'Ursolic acid in tulsi directly inhibits mTOR (the cancer cell growth kinase). Proven radioprotective in double-blind studies at SGPGI Lucknow.',
    how:'Chew 7 fresh leaves on empty stomach morning. Or steep 10 leaves in hot water 5 min as tea. Do not boil vigorously (destroys volatile compounds).',
    avoid:'Avoid very large amounts during active blood-thinning medication.' },
  { name:'Flaxseed (Ground)', emoji:'🌾', tag:'MUST HAVE', color:'#8B5CF6',
    dose:'1–2 tbsp ground daily', timing:'Add to morning breakfast (oats, smoothie, roti dough)',
    why:'SDG lignans are converted by gut bacteria to enterolactone — one of the most potent natural anti-cancer compounds known. Reduces IGF-1 (insulin-like growth factor that fuels tumours). Omega-3 ALA. Gut fiber.',
    science:'Flaxseed lignans suppress tumour angiogenesis (blood supply to cancer cells) in studies specifically involving gastrointestinal cancers.',
    how:'MUST be ground — whole seeds pass undigested. Grind 1 week supply, store in fridge. Add to oatmeal, smoothie, or knead into roti dough. Never heat.',
    avoid:'Must drink adequate water. Start with 1 tsp and increase to 2 tbsp over 1 week to avoid bloating.' },
  { name:'Walnuts (Soaked)', emoji:'🌰', tag:'HIGH', color:'#92400E',
    dose:'5–7 walnuts (soaked overnight)', timing:'Mid-morning snack',
    why:'Ellagitannins → Urolithin A via gut bacteria = strongly anti-tumour. Omega-3 ALA. BDNF (brain repair, reverses chemo-brain). Reduces circulating insulin significantly.',
    science:'Walnut-derived Urolithin A induced autophagy (cancer cell self-destruction) in GI cancer cell studies. Also reduces fasting insulin by 8-12% in RCTs.',
    how:'Soak overnight in water. Peel the brown skin in morning (reduces phytates/tannins). Eat with 1 tsp soaked + peeled flaxseed for synergistic effect.',
    avoid:'No restrictions. 5-7 is the optimal dose — more is not better.' },
  { name:'Beetroot (Steamed)', emoji:'🫀', tag:'HIGH', color:'#EF4444',
    dose:'100–150g steamed or 100ml juice', timing:'With lunch, 3–4 times per week',
    why:'Betalains are the most powerful liver detox compounds in any vegetable. Stimulates bile flow (critical after pancreatectomy). Increases nitric oxide. Rebuilds blood post-chemo.',
    science:'Betaine in beetroot activates PEMT enzyme — essential for liver cell membrane repair after radiation and ablation.',
    how:'Steam 20 min max (do not overcook — betalains are heat-sensitive). Add to sabzi with ghee + cumin. Small fresh juice is also excellent.',
    avoid:'Can turn urine/stools red (beeturia) — completely harmless. Avoid large raw amounts if kidney stone history.' },
  { name:'Mushrooms (Reishi / Shiitake / Button)', emoji:'🍄', tag:'HIGH', color:'#6B7280',
    dose:'80–100g cooked, or 1 tsp reishi powder', timing:'With any meal, 3–4 times/week',
    why:'Beta-1,3/1,6-glucans are the most clinically proven natural NK cell activators. Reishi specifically studied in pancreatic cancer for tumour suppression and immune reconstitution post-chemo.',
    science:'Lentinan (from shiitake) is an approved adjunct cancer therapy in Japan since 1985. Beta-glucans activate macrophages and NK cells within 24 hours of consumption.',
    how:'MUST be cooked (raw mushrooms contain agaritine — harmful). Sauté in ghee with garlic. Add to dal or soup. Reishi powder (1 tsp) in golden milk is excellent.',
    avoid:'No interactions at food doses. Reishi may mildly lower blood pressure — monitor if on antihypertensives.' },
  { name:'Green Tea (2 cups)', emoji:'🍵', tag:'HIGH', color:'#10B981',
    dose:'2 cups, weak to medium brew', timing:'Mid-morning + early afternoon ONLY (not evening)',
    why:'EGCG (epigallocatechin gallate) induces apoptosis in cancer cells. Inhibits tumour angiogenesis. Anti-inflammatory. Blood sugar regulation. Over 1000 published studies.',
    science:'EGCG inhibits cancer cell invasion and metastasis at doses achievable with 2 cups/day. Specifically effective against pancreatic cancer cells in cell line studies.',
    how:'Brew at 80°C (not boiling — destroys catechins). Steep 2-3 min. No milk (casein binds catechins). Squeeze of lemon doubles EGCG absorption.',
    avoid:'No green tea after 3pm (caffeine). Avoid taking with iron supplements within 1 hour.' },
  { name:'Pomegranate', emoji:'💥', tag:'HIGH', color:'#EF4444',
    dose:'½ pomegranate arils (not juice)', timing:'Morning or with breakfast',
    why:'Punicalagins suppress pancreatic cancer cell proliferation directly. Ellagic acid. Anti-inflammatory. Liver protection. Unlike most sweet fruits, has clear anti-cancer evidence.',
    science:'Pomegranate extract reduced pancreatic cancer cell migration by 64% in International Journal of Oncology study.',
    how:'Eat whole fruit arils (not packaged juice — 3x more fiber, lower sugar spike). Mix into Greek yogurt with ground flaxseed for a perfect anti-cancer breakfast.',
    avoid:'No significant interactions at food doses.' },
  { name:'Broccoli (Soft Cooked)', emoji:'🥦', tag:'HIGH', color:'#10B981',
    dose:'80–100g, soft steamed', timing:'3–4 times/week with any meal',
    why:'Sulforaphane directly kills pancreatic cancer STEM cells (which are chemo-resistant). DIM for hormone balance. Liver detox enzyme activation. Most studied anti-cancer vegetable compound.',
    science:'Sulforaphane selectively targets cancer stem cells while leaving healthy cells intact — a unique mechanism confirmed in pancreatic cancer studies (Cancer Prevention Research).',
    how:'Steam exactly 5-7 min (soft, not crunchy). A pinch of mustard seeds with the meal multiplies sulforaphane 2-4x. Never eat raw post-pancreatectomy (hard to digest).',
    avoid:'Only well-cooked. Raw cruciferous vegetables cause significant gas and bloating post-surgery.' },
  { name:'Ghee (Clarified Butter)', emoji:'🧈', tag:'MUST HAVE', color:'#F59E0B',
    dose:'½ tsp per meal (1–2 tsp total per day)', timing:'With every meal — on roti, rice, or in cooking',
    why:'Butyrate directly heals gut epithelial cells — the lining destroyed by chemo. Essential fat-soluble vitamin carrier (D3, K2, A, E cannot absorb without fat). Anti-inflammatory butyric acid.',
    science:'Butyric acid is the preferred fuel for colonocytes and the primary signal for tight junction restoration in the gut epithelium post-chemotherapy.',
    how:'Add ½ tsp on hot rice or roti. Sauté vegetables in ghee (very high smoke point — safe). Start with small amounts, increase as tolerance builds with PERT enzymes.',
    avoid:'No restrictions at recommended doses. Do not fear it — fat absorption is what PERT enzymes enable.' },
  { name:'Moong Dal', emoji:'🫛', tag:'MUST HAVE', color:'#10B981',
    dose:'1 bowl (200g cooked)', timing:'Lunch or dinner — daily',
    why:'Most digestible legume — essential with partial pancreas. Complete amino acid profile for protein synthesis. Prebiotic fiber for gut microbiome rebuilding. Very low GI.',
    science:'Digestibility score 97% — highest of any legume. Resistant starch directly feeds Bifidobacterium longum — the gut bacteria most depleted by chemotherapy.',
    how:'Cook well-done (20-25 min, soft). Add ½ tsp ghee + cumin seeds + turmeric + ginger. Moong dal khichdi with rice + ghee = the ultimate post-surgery recovery meal.',
    avoid:'No restrictions. Should be a cornerstone of every single day.' },
  { name:'Curd / Greek Yogurt', emoji:'🥛', tag:'MUST HAVE', color:'#0EA5E9',
    dose:'½ cup after lunch + ½ cup after dinner', timing:'With or after meals, room temperature',
    why:'Live cultures rebuild gut microbiome destroyed by chemo. 70% of immune function lives in gut. Protein source. Digestive aid post-PERT. Reduces gut inflammation.',
    science:'Lactobacillus strains produce short-chain fatty acids (SCFA) that reduce gut inflammation and strengthen the intestinal barrier damaged by cisplatin and oxaliplatin.',
    how:'Room temperature only (cold slows digestion). Full-fat always. Homemade or plain (no sugar). Greek yogurt has 2x the protein of regular curd. Add pomegranate arils and flaxseed.',
    avoid:'If lactose intolerant, use coconut yogurt with live cultures. Avoid flavoured commercial yogurts.' },
]

// ─── SUPPLEMENT STACK ─────────────────────────────────────────────────────────
const SUPPLEMENT_STACK = [
  { time:'🌅 Morning with Breakfast', color:'#F59E0B', items:[
    { name:'Vitamin D3 + K2', dose:'D3: 4000–5000 IU · K2: 100 mcg', why:'Low D3 is strongly linked to pancreatic cancer incidence and poor prognosis. D3 activates immune cells that kill cancer cells. K2 directs calcium to bones not arteries.', note:'Test serum D3 first — target 60–80 ng/mL. Take with fatty meal for best absorption.' },
    { name:'Omega-3 (Fish Oil / Algae)', dose:'2–3g EPA+DHA', why:'Most powerful natural anti-inflammatory. Directly reduces CA 19-9 via multiple anti-inflammatory pathways. Liver protection. Reverses chemo-brain. Sperm membrane quality.', note:'Enteric-coated prevents fishy burp. Algae-based if vegetarian. Take with food.' },
    { name:'B-Complex (Methylated only)', dose:'1 capsule — methylfolate + methylcobalamin form', why:'Post-chemo nerve repair (peripheral neuropathy). Energy production in every cell. DNA methylation and repair. Methylated form bypasses MTHFR gene mutation (common).', note:'Must say methylfolate + methylcobalamin on label — NOT folic acid + cyanocobalamin.' },
    { name:'Zinc', dose:'15–25 mg', why:'Hair regrowth. Sperm count and morphology. Immune cell production. Wound healing. Taste recovery after chemo. Deficiency is near-universal post-chemotherapy.', note:'Take with food to prevent nausea. Do not exceed 40mg/day. Do not take with copper within 2h.' },
  ]},
  { time:'☀️ Mid-Morning (10:30am)', color:'#10B981', items:[
    { name:'CoQ10', dose:'200mg (increase to 400–600mg for fertility)', why:'Mitochondrial fuel — rebuilds the cellular energy system destroyed by adriamycin/chemo drugs. Most evidence-backed supplement for sperm quality restoration post-chemo. Reduces cancer fatigue.', note:'Take with fat-containing food. Ubiquinol form is better absorbed over age 40.' },
    { name:'Modified Citrus Pectin (MCP)', dose:'5g powder in warm water', why:'Binds galectin-3 — the protein that allows cancer cells to stick together and metastasize. Studied specifically in pancreatic cancer as an anti-metastatic agent.', note:'Dissolve in warm water. Drink 30 min before or after meals. PectaSol-C is the researched brand.' },
  ]},
  { time:'🍲 With Lunch', color:'#0EA5E9', items:[
    { name:'Berberine', dose:'500mg, 30 min before meal', why:'Inhibits mTOR — the primary kinase that drives cancer cell growth. Blood sugar control equal to Metformin in RCTs. Reduces CA 19-9 via gut microbiome + blood sugar pathways.', note:'Take 30 min BEFORE meals for blood sugar effect. May cause mild GI discomfort for 1-2 weeks.' },
    { name:'Milk Thistle (Silymarin)', dose:'200–400mg', why:'Most evidence-backed liver regeneration herb. Your liver underwent radiation + ablation — active pharmacological support for hepatocyte repair is essential.', note:'Look for 70–80% silymarin standardized extract. Take with food for absorption.' },
  ]},
  { time:'🌤️ Evening (4–5pm)', color:'#8B5CF6', items:[
    { name:'Quercetin', dose:'500mg', why:'Flavonoid — anti-proliferative specifically in pancreatic cancer cell studies. Inhibits cancer cell adhesion and invasion. Anti-inflammatory. Blood sugar stability.', note:'Take with Vitamin C for 2-3x better absorption. Check with doctor if on quinolone antibiotics.' },
    { name:'Resveratrol', dose:'150–250mg', why:'Activates SIRT1 and SIRT3 longevity pathways. Anti-tumour via NF-kB inhibition. Cardiovascular protection. Anti-aging. Prevents insulin resistance and diabetes.', note:'Trans-resveratrol form only (most bioavailable). Take on empty stomach or with small meal.' },
  ]},
  { time:'🌙 With Dinner', color:'#EF4444', items:[
    { name:'Ashwagandha KSM-66', dose:'600mg', why:'Reduces cortisol by 27% in RCTs (cortisol directly upregulates cancer cell survival pathways). Testosterone + sperm recovery. Thyroid support. Energy. Stress reduction.', note:'KSM-66 is the most clinically researched form. Evening timing supports sleep and growth hormone.' },
    { name:'NAC (N-Acetyl Cysteine)', dose:'600mg', why:'Precursor to glutathione — the master antioxidant the liver uses to process every toxin. Active liver cell regeneration. Heavy metal chelation post-chemo. Gut lining repair.', note:'Take away from copper supplements. Slight sulphur smell is normal. Can split into 2x300mg.' },
    { name:'L-Carnitine', dose:'2g (if fertility is a focus)', why:'Primary energy source for sperm motility (mitochondria in the sperm tail). Muscle recovery and lean mass gain. Mitochondrial fat burning. Brain repair post-chemo.', note:'Can be taken any time. Slight fishy odour possible at 2g — reduce to 1g if this occurs.' },
  ]},
  { time:'🌛 Bedtime (30 min before sleep)', color:'#7C3AED', items:[
    { name:'Probiotic', dose:'Lactobacillus rhamnosus GG + Bifidobacterium longum', why:'Chemotherapy wiped out your gut microbiome. 70% of immune function lives in the gut. Gut repair = immune repair = lower CA 19-9. This is one of the highest-yield interventions.', note:'Take on empty stomach or with small water only. Refrigerate. Introduce one strain at a time over 2 weeks.' },
    { name:'Melatonin', dose:'Start 3mg → increase to 10–20mg over 4 weeks', why:'Anti-tumour properties — direct inhibition of pancreatic cancer cells in multiple published studies. Master antioxidant. Deep sleep and growth hormone restoration. IL-6 (CA 19-9 driver) reduction.', note:'Start low. May cause vivid dreams initially — this normalises. Not habit-forming. Critical cancer recovery compound.' },
    { name:'Magnesium Glycinate', dose:'300–400mg', why:'Sleep quality via GABA activation. Muscle and liver recovery. Bowel regularity (critical post-surgery). Reduces anxiety and cortisol. Involved in 300+ enzymatic processes.', note:'Glycinate form only — gentlest on gut. Not citrate or oxide. Take with nothing else.' },
  ]},
]

// ─── DAILY YOGA SEQUENCE (complete, specific, evidence-based) ─────────────────
const YOGA_SEQUENCE = [
  { id:'anulom', name:'Anulom Vilom', type:'Pranayama', mins:10, emoji:'🌬️', color:'#0EA5E9', step:1,
    when:'Always first. Morning preferred.',
    how:'Sit comfortably. Close right nostril with right thumb. Inhale slowly and deeply through left nostril (4 counts). Close both nostrils with thumb and ring finger (2 counts). Open right nostril, exhale fully (8 counts). Now inhale right (4), close both (2), exhale left (8). This is 1 round. Continue for 10 minutes. Eyes closed throughout.',
    benefit:'NK (Natural Killer) cell activity increases 30% after 10 min (AIIMS study). Cortisol normalisation. Nervous system balance. Maximum oxygen delivery to every organ. Brain hemisphere synchronisation.',
    science:'10 min of Anulom Vilom daily for 3 months reduced CRP (inflammation marker) by 35% and increased NK cells by 30% in an AIIMS double-blind study. These are the very cells that patrol for and destroy cancer cells.',
    caution:'Never force or strain the breath. If dizzy, breathe normally for 2 min then resume. Do not hold breath if uncomfortable.' },
  { id:'bhramari', name:'Bhramari (Humming Bee)', type:'Pranayama', mins:5, emoji:'🐝', color:'#F59E0B', step:2,
    when:'After Anulom Vilom.',
    how:'Sit upright. Close ears with thumbs, cover eyes gently with fingers (Shanmukhi Mudra). Inhale deeply through nose. On exhale, make a continuous, gentle, low-pitched humming sound "mmmm" until breath is fully out. Feel the vibration in your skull, throat, and chest. This is 1 round. Do 5-7 rounds (about 5 minutes).',
    benefit:'Nitric oxide production increases 1500% — nitric oxide has confirmed direct anti-tumour properties. Activates the vagus nerve (controls inflammation). Lowers blood pressure. Reduces anxiety more effectively than any pharmaceutical in some studies.',
    science:'Humming increases nasal nitric oxide by 1500% (Karolinska Institute, 2002). Nitric oxide directly inhibits cancer cell proliferation and promotes apoptosis (cancer cell death).',
    caution:'Very gentle sound only. No forceful humming. Avoid if tinnitus is severe.' },
  { id:'kapalbhati', name:'Kapalbhati (GENTLE version only)', type:'Pranayama', mins:3, emoji:'💨', color:'#8B5CF6', step:3,
    when:'After Bhramari. ONLY the gentle, slow version.',
    how:'Sit comfortably. Normal passive inhale. Gentle, rhythmic short exhale contracting the lower abdomen (just the lower belly — not the full torso). Rate: 1 exhale per second maximum (60 per minute — NOT the fast version some teachers use). Only 3 minutes. If any discomfort, stop.',
    benefit:'Each gentle contraction directly massages the liver and stimulates hepatocyte activity. Digestive fire activation. Metabolic boost. Lung capacity improvement over time.',
    science:'Gentle intra-abdominal pressure changes from Kapalbhati activate the right lobe of the liver via mechanical stimulation — particularly relevant for a liver that underwent ablation.',
    caution:'⚠ IMPORTANT: NEVER do fast/forceful Kapalbhati post-surgery. Keep slow and gentle ALWAYS. Skip entirely for the first 3 months post-surgery. Stop at ANY abdominal discomfort.' },
  { id:'deepbreath', name:'Deep Belly Breathing (Diaphragmatic)', type:'Pranayama', mins:3, emoji:'🫁', color:'#10B981', step:4,
    when:'End of pranayama. Transition to asanas.',
    how:'Lie on back or sit. One hand on belly, one on chest. Inhale slowly — belly rises first, then chest. Exhale slowly — chest falls first, then belly falls last. Inhale 4 counts, exhale 6 counts. Complete, full breaths. 3 minutes.',
    benefit:'Vagus nerve activation — the vagus nerve controls 80% of the parasympathetic nervous system and directly regulates inflammatory cytokine production. Reduces IL-6 and TNF-alpha (which drive CA 19-9 elevation).',
    science:'Even 5 slow diaphragmatic breaths reduce heart rate variability and measurably lower plasma cortisol. 3 minutes produces clinically significant vagal tone increase.',
    caution:'None whatsoever. The safest and most fundamental breath practice.' },
  { id:'pawanmukt', name:'Pawanmuktasana (Wind Relief Pose)', type:'Asana', mins:5, emoji:'🤸', color:'#10B981', step:5,
    when:'First asana. Lying down. The most important asana for you.',
    how:'Lie flat on back. Inhale. Exhale and bring both knees firmly to chest, interlace fingers around shins just below knees. Gently rock left and right 5 times. Hold still for 30-60 seconds, breathing slowly. Release. Repeat 5-8 times. Option: do one leg at a time alternating.',
    benefit:'Directly massages the liver, gallbladder, and the remaining pancreatic tissue through gentle intra-abdominal pressure. Relieves gas and bloating — your single most important daily digestive exercise. Stimulates peristalsis.',
    science:'Post-pancreatectomy patients doing Pawanmuktasana 2x daily reported 60% reduction in post-meal bloating in Indian oncological physiotherapy studies. Also directly stimulates the ileocecal valve.',
    caution:'Gentle pressure only. Skip first 6-8 weeks post-surgery unless cleared by your surgeon. No sharp pain ever.' },
  { id:'supta-twist', name:'Supta Matsyendrasana (Supine Spinal Twist)', type:'Asana', mins:4, emoji:'🔄', color:'#0EA5E9', step:6,
    when:'After Pawanmuktasana. Lying down.',
    how:'Lie on back. Bring right knee to chest. Gently guide the right knee across your body to the left side. Extend right arm straight out to your right. Turn head gently to look right. Hold 30-45 seconds with slow steady breathing. Return to centre. Repeat on left side.',
    benefit:'Wrings out the liver and gut with a "squeeze and soak" mechanism — compresses on exhale, fresh blood floods on inhale. Spinal mobility. Kidney stimulation. Direct liver blood flow enhancement.',
    science:'Spinal twists increase portal blood flow to the liver by creating gentle intra-hepatic pressure differentials — particularly beneficial for liver regeneration after radiation and ablation.',
    caution:'No force. Work at 40-50% of your full range — the benefit comes from the squeeze, not the depth. If any lower back pain, reduce range.' },
  { id:'setu-bandha', name:'Setu Bandha Sarvangasana (Bridge Pose)', type:'Asana', mins:4, emoji:'🌉', color:'#F59E0B', step:7,
    when:'After twists.',
    how:'Lie on back, knees bent, feet flat on floor hip-width apart, 12 inches from hips. Arms alongside body, palms flat. Inhale and press feet firmly into floor, lift hips. Hold 30-45 seconds, slow breathing. Exhale and lower slowly vertebra by vertebra. 5-8 repetitions. Progress to longer holds.',
    benefit:'Glute and hamstring strengthening (directly prevents sarcopenia — the muscle loss that worsens cancer outcomes). Thyroid stimulation (thyroid controls metabolism). Lymph drainage from lower body. Spinal decompression.',
    science:'Bridge pose activates the posterior chain with zero spinal loading — equivalent muscle activation to barbell hip thrusts at a fraction of the physiological stress. Ideal for post-surgical patients.',
    caution:'Keep knees hip-width throughout — do not let them fall outward. No neck pressure. If hips cannot lift, start with pelvic tilts and build over weeks.' },
  { id:'viparita', name:'Viparita Karani (Legs Up The Wall)', type:'Asana', mins:8, emoji:'🦵', color:'#8B5CF6', step:8,
    when:'Late in practice, before child\'s pose.',
    how:'Sit sideways with right hip touching the wall. Slowly lower your back down while swinging legs up the wall in one smooth motion. Back completely flat on floor. Legs vertical against wall. Arms relaxed by sides, palms facing up. Eyes closed. Hold 7-15 minutes.',
    benefit:'The single most powerful lymphatic drainage posture. Reverses the gravitational pooling of lymph fluid in legs. Reduces swelling and lymphoedema. Decompresses the vena cava. Adrenal rest. Complete nervous system reset.',
    science:'Gravity reversal of the legs improves lymphatic return to the cisterna chyli (the main lymph vessel near the pancreas area) by up to 300%, helping flush the lymph nodes involved in your cancer treatment.',
    caution:'Avoid if glaucoma or very high blood pressure. Place a folded blanket under the sacrum for extra comfort and deeper benefit.' },
  { id:'balasana', name:'Balasana (Child\'s Pose)', type:'Asana', mins:3, emoji:'🙇', color:'#EC4899', step:9,
    when:'Just before Shavasana.',
    how:'Kneel on the floor. Bring big toes together, knees apart (about hip width or wider). Exhale and fold forward, lowering your torso between your thighs. Forehead rests on floor or on a pillow. Arms extended forward or by your sides. Breathe slowly and deeply. 3-5 minutes.',
    benefit:'Adrenal rest position — the adrenal glands sit directly above the kidneys and are gently stretched, signalling the HPA axis to reduce cortisol production. Deep parasympathetic activation. Spinal decompression.',
    science:'Child\'s pose activates the parasympathetic nervous system more powerfully than almost any other position, measurably reducing salivary cortisol within 90 seconds of entering the pose.',
    caution:'Use a pillow under thighs if knees are uncomfortable. Can do a seated forward fold as an alternative.' },
  { id:'shavasana', name:'Shavasana (Corpse Pose) — NON-NEGOTIABLE', type:'Meditation', mins:20, emoji:'🧘', color:'#64748B', step:10,
    when:'Always the last 20 minutes. Never skip this.',
    how:'Lie completely flat on your back. Arms slightly away from the body, palms facing up. Legs slightly apart, feet falling open naturally. Eyes closed. Nothing to do, nowhere to go. Scan your body from toes to head, consciously releasing tension in each part. When thoughts come, observe them without following. Simply be.',
    benefit:'IL-6 (the inflammatory cytokine most responsible for CA 19-9 elevation) drops measurably after 20 minutes. Activates the same cellular repair genes as 7 hours of deep sleep. Growth hormone pulse. NK cell reconstitution.',
    science:'20 minutes of Shavasana activates SIRT1 and FOXO3 (longevity genes) via the relaxation response, equivalent to 7 hours of deep sleep in gene expression studies (Harvard Benson-Henry Institute).',
    caution:'None. This is the most powerful healing practice in the entire protocol. If you can only do one thing today — do this. 20 minutes of Shavasana.' },
]

// ─── GYM PROTOCOL (Phase-based) ───────────────────────────────────────────────
const GYM_PHASES = [
  { phase:1, label:'Phase 1 — Foundation', weeks:'Weeks 1–6', goal:'Restore energy, reawaken muscles, rebuild movement patterns safely', color:'#10B981',
    cardio:'Morning walk 20–30 min daily. Week 1-2: 15 min if fatigued. Week 3-4: 25 min. Week 5-6: 30 min slightly brisk.',
    strength:'3 days/week (Mon/Wed/Fri) — 15-20 min only',
    exercises:[
      { name:'Wall Push-ups', sets:'2', reps:'10', rest:'45s', note:'Hands at shoulder height on wall, feet 2 feet away. Lean and push. Builds chest, shoulder, and tricep strength safely without floor pressure on abdomen.' },
      { name:'Chair Squats (Sit-to-Stand)', sets:'2', reps:'10', rest:'45s', note:'Stand in front of chair, feet hip-width. Lower slowly to sit, then stand. Controls pace. The most functional exercise you can do — duplicates getting up from any surface.' },
      { name:'Seated Leg Raises', sets:'2', reps:'10 each leg', rest:'30s', note:'Sit upright in chair. Extend one leg fully, hold 2 seconds, lower slowly. Activates quadriceps and hip flexors without any abdominal pressure.' },
      { name:'Resistance Band Rows', sets:'2', reps:'12', rest:'45s', note:'Anchor band around door handle. Pull handles to your stomach, elbows close to sides. Back muscles — critical for posture restoration after lying in hospital.' },
      { name:'Standing Calf Raises', sets:'2', reps:'15', rest:'30s', note:'Hold chair for balance. Rise on tiptoes slowly, lower slowly. Activates the calf muscle pump — essential for lymph and venous return from the legs.' },
      { name:'Shoulder Circles + Neck Rolls', sets:'1', reps:'10 each direction', rest:'30s', note:'Large smooth circles. Releases the neck and shoulder tension accumulated from post-chemo fatigue posture. Do daily, not just on training days.' },
    ],
    postWorkout:'⚡ Within 30 min: 1 glass warm milk + 1 boiled egg. OR 1 scoop whey in warm water + 1 banana. The 30-minute window is when muscle protein synthesis is highest.',
    caution:'No crunches, sit-ups, or planks yet (first 3 months post-surgery). Stop at any sharp abdominal pain. Always eat a small snack (banana or curd) before exercising.' },
  { phase:2, label:'Phase 2 — Building', weeks:'Weeks 7–16', goal:'Build lean muscle, increase strength, improve insulin sensitivity and stamina', color:'#0EA5E9',
    cardio:'30–45 min walk, 5-6 days/week. Introduce brisk intervals: walk fast 2 min, normal 3 min, repeat 5 cycles. Or: stationary cycling 20 min — excellent for legs without abdominal stress.',
    strength:'3 days/week on alternate days — 25-30 min',
    exercises:[
      { name:'Regular Push-ups (or Knee Push-ups)', sets:'3', reps:'10-12', rest:'60s', note:'Full push-up position. If difficult, knee push-ups are equally valid. Progress by 1-2 reps per week. When you reach 15 reps with ease, move to Phase 3.' },
      { name:'Goblet Squat (2–5 kg dumbbell)', sets:'3', reps:'12', rest:'60s', note:'Hold dumbbell at chest with both hands. Feet slightly wider than hips, toes slightly out. Squat deep. The most complete lower body exercise. King of cancer recovery exercises.' },
      { name:'Glute Bridge', sets:'3', reps:'15', rest:'45s', note:'Lie on back, knees bent. Lift hips, squeeze glutes firmly at the top for 2 full seconds. Lower slowly. When easy: add a 2-5 kg plate on hips.' },
      { name:'Dumbbell Row (2–5 kg)', sets:'3', reps:'12 each side', rest:'60s', note:'Support one hand and knee on a bench or bed edge. Pull dumbbell to your hip, elbow close to body. The most important upper body exercise for a cancer patient — builds the back and counteracts the hunched fatigue posture.' },
      { name:'Plank (on elbows)', sets:'3', reps:'20-30 sec', rest:'45s', note:'Forearms and toes, body straight. This is safe from Month 4 post-surgery. Work up to 60 seconds. Best core stability exercise with minimal intra-abdominal pressure.' },
      { name:'Step-ups (bottom stair or low step)', sets:'3', reps:'10 each leg', rest:'60s', note:'Functional real-world strength. Step up, step down slowly. The eccentric (lowering) phase builds the most muscle.' },
    ],
    postWorkout:'⚡ Within 30 min: 2 boiled eggs + 1 banana. OR Greek yogurt + walnuts + flaxseed + pomegranate. Total protein: 25-30g.',
    caution:'No crunches or sit-ups until Month 6 (post-surgical abdomen needs time). Only increase weight when completing ALL reps with perfect form. Never compromise form for weight.' },
  { phase:3, label:'Phase 3 — Progressive', weeks:'Month 4 onwards', goal:'Lean muscle gain, peak metabolic health, cancer-proof body composition for life', color:'#8B5CF6',
    cardio:'45 min walks OR swimming (best cancer exercise — zero joint stress, full body, lymphatic pump). 5 days/week. Add swimming as the primary Phase 3 cardio if accessible.',
    strength:'4 days/week — Push / Pull / Legs / Rest split',
    exercises:[
      { name:'Dumbbell Chest Press (5–10 kg)', sets:'3', reps:'12', rest:'75s', note:'Push Day. Lie on bench or floor. Press dumbbells from chest to full extension. Controlled lowering is where the muscle grows.' },
      { name:'Overhead Press (5–8 kg)', sets:'3', reps:'10', rest:'75s', note:'Push Day. Seated for stability. Press dumbbells from shoulders to above head. Critical for shoulder health and upper body strength.' },
      { name:'Bent-over Dumbbell Row (8–12 kg)', sets:'3', reps:'12', rest:'75s', note:'Pull Day. Hinge at hips (back flat), pull both dumbbells to hips simultaneously. The most important single exercise for building the back muscles that protect your spine.' },
      { name:'Romanian Deadlift (8–12 kg)', sets:'3', reps:'12', rest:'90s', note:'Legs Day. The single best exercise for hamstrings and glutes. Hinge forward with soft knees, feel the hamstrings stretch, drive hips forward to stand. Back stays flat always.' },
      { name:'Dumbbell Lunges (5–8 kg)', sets:'3', reps:'10 each leg', rest:'75s', note:'Legs Day. Walk forward or stationary. Lower back knee toward floor. Best for balance, coordination, and lower body symmetry.' },
      { name:'Dead Bug (Core)', sets:'3', reps:'8 each side', rest:'45s', note:'Legs/Core Day. Lie on back, arms up, knees bent at 90°. Lower opposite arm+leg to floor slowly, return. Zero spinal compression — the safest and most effective core exercise post-surgery.' },
      { name:'Lat Pulldown or Resistance Band Pulldown', sets:'3', reps:'12', rest:'75s', note:'Pull Day. If no gym: anchor band overhead, pull to upper chest. Builds the V-shape back and protects shoulders from rotator cuff issues.' },
      { name:'Dumbbell Lateral Raises (3–5 kg)', sets:'2', reps:'15', rest:'45s', note:'Push Day. Raises arms to shoulder height. Builds shoulder width. Critical for the "strong healthy" appearance that signals recovery.' },
    ],
    postWorkout:'⚡ Within 30 min: 30-40g protein. Best options: 2 eggs + 50g paneer + banana. OR whey protein shake + banana + 1 tbsp peanut butter. This is when the muscle actually grows.',
    caution:'Progress weight only when all reps are completed with perfect form. Swimming is the best Phase 3 cardio — add it if accessible. Listen to your body: 1 extra rest day is never wrong.' },
]

// ─── DAILY SCHEDULE ───────────────────────────────────────────────────────────
const DAILY_SCHEDULE = [
  { time:'6:00am', label:'Wake + Intentions', emoji:'🌄', color:'#F59E0B',
    details:'Lie in bed 5 min. 3 deep slow breaths. One thought: "I am grateful to be in remission." Set 1 intention for the day.',
    why:'Morning cortisol is highest at 6-8am (the cortisol awakening response). How you respond to waking determines your inflammatory profile for the next 16 hours.' },
  { time:'6:15am', label:'Morning Drinks (Empty Stomach)', emoji:'🍋', color:'#10B981',
    details:'① Copper vessel water 200ml. ② Warm lemon water + pinch turmeric + pinch black pepper. ③ Amla powder 1 tsp in warm water. ④ Ash gourd juice 200ml (if available). Total: 500-700ml.',
    why:'Liver begins its peak detox activity at 6am. These drinks provide substrate for glutathione synthesis, alkalise pH, activate bile flow, and deliver concentrated antioxidants before any food burden.' },
  { time:'6:30am', label:'Pranayama + Yoga (45 min)', emoji:'🧘', color:'#0EA5E9',
    details:'Full sequence: Anulom Vilom 10 min → Bhramari 5 min → Gentle Kapalbhati 3 min → Deep Breathing 3 min → Pawanmuktasana 5 min → Supine Twist 4 min → Bridge 4 min → Legs Up Wall 8 min → Child\'s Pose 3 min → Shavasana 20 min.',
    why:'This specific sequence targets NK cell activation, liver stimulation, gas relief, lymph drainage, cortisol reduction, and deep cellular repair — in the correct physiological order.' },
  { time:'7:30am', label:'Breakfast + Morning Supplements', emoji:'🍳', color:'#10B981',
    details:'CREON with first bite (non-negotiable). Best options: 2 soft scrambled eggs in ghee + 1 roti + 4 soaked almonds + 5 soaked walnuts. OR Oats + banana + 1 tbsp ground flaxseed + honey. OR Moong dal cheela + curd. After eating: D3+K2, Omega-3, B-Complex, Zinc.',
    why:'Protein at breakfast sets up muscle protein synthesis for the full day (leucine threshold activation). Enzymes MUST be taken at the first bite — not after.' },
  { time:'8:00am', label:'Morning Walk (30–45 min)', emoji:'🚶', color:'#8B5CF6',
    details:'Target 30-45 min at comfortable pace. Use this time for gratitude, birdsong, or gentle music. Track steps — goal is 8000+ total for the day. Sun on skin for 20 min = free Vitamin D.',
    why:'Post-breakfast walking blunts the glucose spike by 40-50% (NEJM study). Morning sun resets circadian rhythm, improving sleep quality and melatonin production at night. Lymph activation begins only with movement.' },
  { time:'10:30am', label:'Mid-Morning Snack + Supplements', emoji:'🥛', color:'#F59E0B',
    details:'CREON if snack has fat or protein. Options: Protein smoothie (whey + banana + warm milk + pinch cinnamon). OR Greek yogurt + walnuts + pomegranate + flaxseed. OR 1 boiled egg + a few whole grain crackers. Supplements: CoQ10, Modified Citrus Pectin 5g.',
    why:'Second protein hit of the day. Maintains amino acid pool for continuous muscle protein synthesis. Blood sugar stability between breakfast and lunch prevents insulin spikes.' },
  { time:'1:00pm', label:'Lunch + Midday Supplements', emoji:'🍲', color:'#10B981',
    details:'LARGEST meal. CREON with first bite. Structure: protein (fish curry / dal / paneer / egg) + 1-2 rotis or ½ cup rice + soft cooked vegetables (lauki, spinach dal, carrot) + ½ tsp ghee + ½ cup curd after. Supplements: Berberine 500mg, Milk Thistle.',
    why:'Digestive fire is strongest 12-2pm. Largest meal here = maximum nutrient absorption. Curd after = probiotic support. Berberine taken now reduces post-lunch glucose spike — the most critical time for blood sugar.' },
  { time:'2:00pm', label:'Short Rest (15-20 min max)', emoji:'😌', color:'#64748B',
    details:'Lie down on left side (improves portal blood flow to liver). 15-20 min only — set a timer. Not deep sleep. Eyes closed, body still.',
    why:'Left-side lying increases blood flow through the portal vein to the liver by 15-20% — the optimal position for post-meal liver support after ablation and radiation treatment.' },
  { time:'4:00pm', label:'Evening Snack + Supplements', emoji:'☕', color:'#0EA5E9',
    details:'CREON if snack has fat/protein. Ginger + tulsi tea. One of: roasted makhana + peanut butter, OR banana + walnuts, OR small bowl curd + pomegranate. Supplement: Quercetin 500mg, Resveratrol.',
    why:'Keeping blood sugar stable between meals is the single most important daily action against CA 19-9 elevation. Every insulin spike is a direct signal for residual pancreatic tissue inflammation.' },
  { time:'5:00pm', label:'Strength Training (Mon/Wed/Fri) or Steps', emoji:'💪', color:'#8B5CF6',
    details:'Phase 1: wall push-ups, chair squats, resistance bands — 15-20 min. Phase 2: dumbbell circuit — 25-30 min. Phase 3: Push/Pull/Legs — 35-40 min. Other days: 20 min walk to reach 8000 steps.',
    why:'5-6pm training window shows the greatest anabolic (muscle-building) hormonal response in recovery patients. Testosterone and IGF-1 (the beneficial muscle-building dose) peak here.' },
  { time:'7:00pm', label:'Dinner + Evening Supplements', emoji:'🌙', color:'#F59E0B',
    details:'CREON with first bite. Keep lighter than lunch. Best options: Moong dal khichdi + ½ tsp ghee. OR Soft dal + 1 roti + soft cooked lauki or ridge gourd. OR Vegetable soup + 1 scrambled egg. Finish eating by 8pm. Supplements: Ashwagandha KSM-66, NAC, L-Carnitine.',
    why:'Light dinner allows the liver to focus on repair and regeneration during sleep. The liver\'s peak repair window is 11pm-3am (confirmed by chronobiology). Eating heavy at dinner competes with this.' },
  { time:'9:00pm', label:'Blue Light OFF + Wind Down', emoji:'🌆', color:'#64748B',
    details:'No screens after 9pm. Dim all lights. Read a book. Gentle stretching or breathing. Copper vessel water 200ml. This is the golden hour of melatonin production.',
    why:'Blue light from screens blocks melatonin production. 1 hour of phone screen = 1.5 hours of melatonin suppression. Melatonin is both your sleep hormone AND a proven anti-cancer compound. Protect it every night.' },
  { time:'9:30pm', label:'Golden Milk + Bedtime Supplements', emoji:'✨', color:'#F59E0B',
    details:'Golden milk: 1 cup warm full-fat milk + ½ tsp turmeric + pinch black pepper + pinch cinnamon + 1 tsp honey. Supplements: Probiotic, Melatonin 10-20mg, Magnesium Glycinate 300mg.',
    why:'Curcumin is fat-soluble — warm milk delivers it in the ideal fat matrix for maximum absorption. Melatonin needs 30-45 min to reach peak blood levels. Probiotics colonise most effectively during sleep when gut motility slows.' },
  { time:'10:00pm', label:'SLEEP — Non-negotiable', emoji:'😴', color:'#7C3AED',
    details:'Lights out by 10pm. Room dark and cool (18-22°C). If mind is busy: 4-7-8 breathing (inhale 4, hold 7, exhale 8). Growth hormone peaks at 11pm. p53 tumour suppressor gene is most active 1-3am.',
    why:'Sleep before 11pm ensures you catch the growth hormone pulse (11pm-1am) and the p53 tumour suppressor activation window (1-3am). Missing these windows is the equivalent of skipping surgical recovery. Every night matters.' },
]
// ─── SCORING ──────────────────────────────────────────────────────────────────
function scoreColor(n) {
  if (n >= 80) return '#10B981'
  if (n >= 60) return '#0EA5E9'
  if (n >= 40) return '#F59E0B'
  return '#EF4444'
}
function scoreLabel(n) {
  if (n >= 80) return 'Excellent'
  if (n >= 60) return 'Good'
  if (n >= 40) return 'Fair'
  if (n > 0) return 'Needs work'
  return 'Not logged'
}
function scorePillars(log, medLog = {}) {
  if (!log) return { nutrition: 0, hydration: 0, mindBody: 0, exercise: 0, medicine: 0, overall: 0 }
  const p = +log.proteinG || 0
  const w = +log.waterL || 0
  const hd = (+log.healthDrinksMl || 0) / 1000  // convert ml to L
  const totalFluid = w + hd
  const f = +log.fiberG || 0
  const v = +log.veggieServings || 0
  const ym = +log.yogaMins || 0
  const pm = +log.pranayamaMins || 0
  const st = +log.walkingSteps || 0
  const hasGym = log.gymGroup && log.gymGroup !== 'None today'
  const creon = +log.creonDoses || 0

  const nutrition  = Math.min(100, Math.round((p/80*40) + (f/30*20) + (v/5*20) + (totalFluid/2.5*20)))
  const hydration  = Math.min(100, Math.round(totalFluid / 2.5 * 100))
  const mindBody   = Math.min(100, Math.round(((ym + pm) / 45) * 100))
  const exercise   = Math.min(100, Math.round((st/8000*60) + (hasGym ? 40 : 0)))
  const creonSc    = Math.min(100, Math.round(creon / 3 * 100))
  const medDone    = Object.values(medLog.taken || {}).filter(Boolean).length
  const medTotal   = Math.max(1, Object.keys(medLog.taken || {}).length)
  const medicine   = Math.round(creonSc * 0.6 + (medDone / medTotal * 100 * 0.4))
  const overall    = Math.round(nutrition*0.25 + hydration*0.15 + mindBody*0.25 + exercise*0.20 + medicine*0.15)
  return { nutrition, hydration, mindBody, exercise, medicine, overall }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;-webkit-text-size-adjust:100%}
body{background:#EEF2F7;color:#0F172A;font-family:'DM Sans',system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:2px}
input,textarea,select,button{font-family:inherit}
input::placeholder,textarea::placeholder{color:#94A3B8}
input[type=text],input[type=number]{-webkit-appearance:none;appearance:none}
select option{background:white}
textarea{resize:none}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes ripple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.6);opacity:0}}
.fade-up{animation:fadeUp 0.22s ease forwards}
.pulse{animation:pulse 2s ease infinite}

.shell{display:flex;min-height:100vh}
.sidebar{width:224px;flex-shrink:0;background:white;border-right:1px solid #E8EEF4;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto}
.main{margin-left:224px;flex:1;display:flex;flex-direction:column;min-height:100vh}
.topbar{height:56px;background:white;border-bottom:1px solid #E8EEF4;padding:0 22px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:50;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.page{padding:22px;max-width:1080px;flex:1}
.sb-brand{padding:18px 18px 14px;border-bottom:1px solid #F1F5F9}
.sb-logo-row{display:flex;align-items:center;gap:10px}
.sb-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10B981,#0EA5E9);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 3px 10px rgba(16,185,129,0.25)}
.sb-name{font-size:15px;font-weight:800;color:#0F172A;letter-spacing:-0.3px}
.sb-sub{font-size:10px;color:#94A3B8;margin-top:1px;font-weight:500}
.sb-status{display:flex;align-items:center;gap:6px;margin-top:10px;padding:7px 10px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:7px;font-size:11px;font-weight:600;color:#059669}
.sb-dot{width:6px;height:6px;border-radius:50%;background:#10B981;flex-shrink:0}
.sec-lbl{padding:14px 18px 4px;font-size:10px;font-weight:700;letter-spacing:0.8px;color:#94A3B8;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;font-size:13px;font-weight:500;color:#64748B;border-radius:9px;margin:1px 7px;transition:all 0.12s;text-decoration:none}
.nav-item:hover{background:#F8FAFC;color:#0F172A}
.nav-item.active{background:#EFF6FF;color:#0EA5E9;font-weight:600}
.nav-item svg{width:16px;height:16px;flex-shrink:0}
.nav-badge{width:7px;height:7px;border-radius:50%;background:#F59E0B;margin-left:auto;flex-shrink:0}
.sb-footer{margin-top:auto;padding:14px 18px;border-top:1px solid #F1F5F9}
.sb-ca199{background:#EFF6FF;border-radius:10px;padding:10px 12px;margin-bottom:10px}
.sb-ca199-lbl{font-size:10px;font-weight:700;color:#0EA5E9;letter-spacing:0.5px;margin-bottom:2px}
.sb-ca199-val{font-size:22px;font-weight:800;color:#0EA5E9;letter-spacing:-0.5px}
.card{background:white;border:1px solid #E8EEF4;border-radius:14px;padding:20px;margin-bottom:14px;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.card-title{font-size:11px;font-weight:700;letter-spacing:0.6px;color:#64748B;text-transform:uppercase;margin-bottom:15px}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px}
.stat{background:white;border:1px solid #E8EEF4;border-radius:12px;padding:14px;text-align:center;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.stat-val{font-size:26px;font-weight:800;margin:3px 0 2px;letter-spacing:-1px}
.stat-lbl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px}
.pillar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:10px;margin-bottom:18px}
.pillar-card{background:white;border:1.5px solid #E8EEF4;border-radius:13px;padding:15px;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.pillar-card:hover{box-shadow:0 4px 14px rgba(15,23,42,0.09);transform:translateY(-1px)}
.pillar-card.open{border-color:var(--pc,#0EA5E9)}
.pillar-top{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.pillar-emoji{font-size:22px;line-height:1}
.pillar-name{font-size:13px;font-weight:700;color:#0F172A}
.pillar-sub{font-size:11px;color:#94A3B8;margin-top:1px}
.pillar-score{font-size:24px;font-weight:800;margin-left:auto}
.pillar-bar-bg{height:5px;background:#F1F5F9;border-radius:3px;overflow:hidden;margin-bottom:7px}
.pillar-bar-fill{height:100%;border-radius:3px;transition:width 0.9s ease}
.pillar-status{font-size:11px;font-weight:600}
.prog{height:5px;background:#F1F5F9;border-radius:3px;overflow:hidden}
.prog-fill{height:100%;border-radius:3px;transition:width 0.8s ease}
.fg{margin-bottom:14px}
.fl{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;letter-spacing:0.1px}
.fh{font-size:11px;color:#94A3B8;margin-top:4px}
.fi{width:100%;padding:10px 13px;background:white;border:1.5px solid #E2E8F0;border-radius:9px;color:#0F172A;font-size:14px;outline:none;transition:border-color 0.15s,box-shadow 0.15s;-webkit-appearance:none;appearance:none}
.fi:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
.fi::placeholder{color:#94A3B8}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.sl{flex:1;-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;outline:none;cursor:pointer}
.sl::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.18)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:9px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.13s;-webkit-tap-highlight-color:transparent}
.btn-pr{background:#0EA5E9;color:white}.btn-pr:hover{background:#0284C7}.btn-pr:disabled{background:#E2E8F0;color:#94A3B8;cursor:not-allowed}
.btn-gr{background:#10B981;color:white}.btn-gr:hover{background:#059669}.btn-gr:disabled{background:#E2E8F0;color:#94A3B8;cursor:not-allowed}
.btn-ou{background:transparent;color:#64748B;border:1.5px solid #E2E8F0}.btn-ou:hover{background:#F8FAFC;color:#0F172A;border-color:#CBD5E1}
.btn-full{width:100%}
.btn-sm{padding:7px 12px;font-size:12px;border-radius:7px}
.btn-xs{padding:4px 10px;font-size:11px;border-radius:6px}
.tabs{display:flex;gap:0;border-bottom:1.5px solid #E8EEF4;margin-bottom:17px}
.tab{padding:9px 15px;background:none;border:none;font-size:13px;font-weight:500;color:#94A3B8;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1.5px;transition:all 0.12s}
.tab.on{color:#0EA5E9;border-bottom-color:#0EA5E9;font-weight:600}
.tab:hover:not(.on){color:#64748B}
.upload-z{border:2px dashed #E2E8F0;border-radius:12px;padding:28px 16px;text-align:center;cursor:pointer;transition:all 0.15s;background:#F8FAFC}
.upload-z:hover{border-color:#0EA5E9;background:#EFF6FF}
.upload-z.has-img{padding:0;overflow:hidden;border-style:solid;border-color:#E2E8F0}
.upload-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.upload-lbl{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:9px;border:1.5px solid #E2E8F0;background:white;color:#64748B;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.12s}
.upload-lbl:hover{border-color:#0EA5E9;color:#0EA5E9;background:#EFF6FF}
.food-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid #F1F5F9}
.food-badge{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}
.med-row{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:10px;border:1.5px solid #E8EEF4;background:white;margin-bottom:7px;transition:all 0.12s}
.med-row.taken{background:#F0FDF4;border-color:#BBF7D0}
.med-chk{width:22px;height:22px;border-radius:6px;border:2px solid #E2E8F0;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:11px;color:#10B981;transition:all 0.12s}
.med-row.taken .med-chk{background:#10B981;border-color:#10B981;color:white}
.habit-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:8px;border:1.5px solid #E8EEF4;background:white;cursor:pointer;transition:all 0.12s}
.habit-row.done{background:#F0FDF4;border-color:#BBF7D0}
.habit-chk{width:16px;height:16px;border-radius:4px;border:1.5px solid #E2E8F0;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;color:#10B981;transition:all 0.12s}
.habit-row.done .habit-chk{background:#10B981;border-color:#10B981;color:white}
.chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 100px);min-height:400px}
.chat-msgs{flex:1;overflow-y:auto;padding:4px 0 10px;display:flex;flex-direction:column;gap:10px}
.chat-row{display:flex;gap:8px;align-items:flex-end}
.chat-row.user{flex-direction:row-reverse}
.chat-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#0EA5E9,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.bubble{max-width:78%;padding:11px 15px;font-size:13px;line-height:1.68;white-space:pre-wrap}
.bubble.ai{background:white;border:1px solid #E8EEF4;border-radius:14px 14px 14px 3px;color:#0F172A;box-shadow:0 1px 4px rgba(15,23,42,0.05)}
.bubble.user{background:#0EA5E9;color:white;border-radius:14px 14px 3px 14px}
.chat-chips{display:flex;gap:6px;overflow-x:auto;padding:7px 0 4px;scrollbar-width:none}
.chip{flex-shrink:0;padding:6px 12px;border-radius:20px;border:1.5px solid #E2E8F0;background:white;color:#64748B;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all 0.12s}
.chip:hover{border-color:#0EA5E9;color:#0EA5E9;background:#EFF6FF}
.chat-in-row{display:flex;gap:8px;padding-top:8px;border-top:1px solid #F1F5F9;margin-top:4px}
.chat-in{flex:1;background:white;border:1.5px solid #E2E8F0;border-radius:11px;padding:10px 14px;color:#0F172A;font-size:14px;outline:none;line-height:1.4;transition:border-color 0.15s;min-height:42px;max-height:100px}
.chat-in:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
.toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#0F172A;color:white;padding:8px 18px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(15,23,42,0.2);pointer-events:none;animation:fadeUp 0.2s ease}
.voice-btn{position:relative;width:38px;height:38px;border-radius:50%;border:1.5px solid #E2E8F0;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all 0.15s;flex-shrink:0;box-shadow:0 1px 4px rgba(15,23,42,0.06)}
.voice-btn.active{background:#0EA5E9;border-color:#0EA5E9;box-shadow:0 0 0 4px rgba(14,165,233,0.18)}
.voice-rip{position:absolute;inset:-5px;border-radius:50%;border:2px solid #0EA5E9;animation:ripple 1.5s ease infinite}
.day-row{display:grid;grid-template-columns:58px 1fr 42px;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid #F8FAFC}
.day-row.no-data{opacity:0.3}
.heal-btn{padding:14px 12px;border-radius:12px;border:1.5px solid #E8EEF4;background:white;cursor:pointer;text-align:left;transition:all 0.15s;box-shadow:0 1px 3px rgba(15,23,42,0.04)}
.heal-btn:hover{box-shadow:0 3px 10px rgba(15,23,42,0.08);transform:translateY(-1px)}
.heal-btn.sel{border-color:var(--hc,#0EA5E9)}
@media(max-width:768px){
  .sidebar{display:none}.main{margin-left:0}.page{padding:12px 12px 86px}
  .topbar{padding:0 12px}.stats-row{grid-template-columns:repeat(2,1fr);gap:8px}
  .g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr 1fr}
  .pillar-grid{grid-template-columns:1fr 1fr;gap:8px}.card{padding:15px;border-radius:12px}
  .mob-nav{position:fixed;bottom:0;left:0;right:0;background:white;border-top:1px solid #E8EEF4;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,6px);box-shadow:0 -2px 12px rgba(15,23,42,0.07)}
  .mob-ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px 5px;cursor:pointer;border:none;background:none;color:#94A3B8;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;transition:color 0.12s;-webkit-tap-highlight-color:transparent;position:relative}
  .mob-ni.on{color:#0EA5E9}.mob-ni svg{width:21px;height:21px}
  .mob-badge{position:absolute;top:5px;right:calc(50% - 16px);width:7px;height:7px;border-radius:50%;background:#F59E0B}
}
@media(min-width:769px){.mob-nav{display:none}}
`

const I = {
  home:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  log:   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  track: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  food:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3" strokeWidth={2}/></svg>,
  meds:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>,
  blood: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>,
  fit:   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  heal:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
  ai:    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  user:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  super: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  plan:  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
}
const NAV = [
  { s: 'Overview' },
  { id:'home',   label:'Dashboard',            icon:I.home,  badge:true },
  { id:'log',    label:'Daily Log',            icon:I.log,   badge:true },
  { id:'track',  label:'Progress',             icon:I.track },
  { s: 'Health Tracking' },
  { id:'food',   label:'Food Tracker',         icon:I.food },
  { id:'meds',   label:'Medicines',            icon:I.meds },
  { id:'blood',  label:'Lab Reports',          icon:I.blood },
  { s: 'My Health Bible' },
  { id:'super',  label:'Superfoods & Supps',   icon:I.super },
  { id:'plan',   label:'Daily Routine & Plans',icon:I.plan },
  { s: 'Recovery' },
  { id:'fit',    label:'Yoga & Gym',           icon:I.fit },
  { id:'heal',   label:'Recovery Guides',      icon:I.heal },
  { id:'ai',     label:'JARVIS AI',            icon:I.ai },
  { id:'prof',   label:'My Profile',           icon:I.user },
]
const MOB = [
  { id:'home',   label:'Home',   icon:I.home, badge:true },
  { id:'log',    label:'Log',    icon:I.log,  badge:true },
  { id:'food',   label:'Food',   icon:I.food },
  { id:'ai',     label:'JARVIS', icon:I.ai },
  { id:'__more', label:'More',   icon:null },
]
const MOB_MORE = [
  { id:'track', label:'Progress',      icon:I.track },
  { id:'meds',  label:'Medicines',     icon:I.meds },
  { id:'blood', label:'Lab Reports',   icon:I.blood },
  { id:'super', label:'Superfoods',    icon:I.super },
  { id:'plan',  label:'Routine',       icon:I.plan },
  { id:'fit',   label:'Yoga & Gym',    icon:I.fit },
  { id:'heal',  label:'Guides',        icon:I.heal },
  { id:'prof',  label:'My Profile',    icon:I.user },
]
function Spin({ size = 18, color = '#0EA5E9' }) {
  return <div style={{ width:size, height:size, border:`2px solid ${color}22`, borderTop:`2px solid ${color}`, borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
}
function PBar({ value, color, height = 5 }) {
  return <div className="prog" style={{height}}><div className="prog-fill" style={{width:`${Math.min(100,value||0)}%`, background:value>0?color:'#E2E8F0'}}/></div>
}
function MetricRow({ label, value, target, unit, color }) {
  const pct = Math.min(100, Math.round((+value||0)/target*100))
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
        <span style={{fontSize:13,color:'#64748B'}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color:pct>0?(pct>=100?color:scoreColor(pct)):'#CBD5E1'}}>{(+value||0)}{unit} <span style={{fontWeight:400,color:'#94A3B8',fontSize:11}}>/ {target}{unit}</span></span>
      </div>
      <PBar value={pct} color={color} />
    </div>
  )
}

// FIX #1 & #4 & #5: TxtInput — plain text input, no numeric restriction
function TxtInput({ label, hint, value, onChange, placeholder, rows }) {
  return (
    <div className="fg">
      {label && <label className="fl">{label}</label>}
      {rows
        ? <textarea className="fi" rows={rows} style={{height:rows*36}} placeholder={placeholder} value={value||''} onChange={e=>onChange(e.target.value)} />
        : <input type="text" className="fi" placeholder={placeholder} value={value||''} onChange={e=>onChange(e.target.value)} onFocus={e=>e.target.select()} />
      }
      {hint && <div className="fh">{hint}</div>}
    </div>
  )
}

// NumInput — for numbers only (iOS decimal fix)
function NumInput({ label, hint, value, onChange, placeholder, unit }) {
  return (
    <div className="fg">
      {label && <label className="fl">{label}{unit && <span style={{color:'#94A3B8',fontWeight:400,marginLeft:4}}>{unit}</span>}</label>}
      <input type="text" inputMode="decimal" pattern="[0-9.]*" className="fi" placeholder={placeholder} value={value||''}
        onChange={e => { const v=e.target.value; if(v===''||/^\d*\.?\d*$/.test(v)) onChange(v) }}
        onFocus={e=>e.target.select()} />
      {hint && <div className="fh">{hint}</div>}
    </div>
  )
}
// ─── DAILY LOG TAB ─────────────────────────────────────────────────────────────
// FIX #8: Yoga and Pranayama split | FIX #9: Water and Health Drinks split
const GYM_GROUPS = ['None today','Chest','Back','Legs','Shoulders','Arms','Full body','Cardio']
const HABITS = [
  'Lemon water on waking','CREON with every meal','Ash gourd juice 200ml',
  'Amla powder 1 tsp','Tulsi / ginger tea','Golden milk before bed',
  'No refined sugar','No fried food','In bed by 10pm',
  'Anulom Vilom 10 mins','Morning walk done','Protein at every meal',
]

function LogTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0, 10)
  const ex = db.todayLog || {}
  const [f, sf] = useState({
    sleepH:'', energyAM:5, energyPM:5,
    waterL:'',                 // FIX #9: plain water only
    healthDrinksMl:'',         // FIX #9: lemon water, ash gourd, tulsi tea, golden milk etc
    proteinG:'', fiberG:'', veggieServings:'',
    creonDoses:3, gasLevel:0, bloating:0, digestComfort:5,
    yogaMins:'',               // FIX #8: physical yoga asanas only
    pranayamaMins:'',          // FIX #8: breathing exercises only (Anulom Vilom, Bhramari)
    walkingSteps:'', weightKg:'', gymGroup:'None today',
    symptoms:'', notes:'', habits:{},
    ...ex
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => sf(p => ({ ...p, [k]: v }))
  const sc = scorePillars(f, db.medLog)

  async function save() {
    setSaving(true)
    const log = { ...f, date: today, ...sc }
    await saveDailyLog(uid, today, log)
    // FIX #3: pass direct object so dbUpdate can update allLogs properly
    setDb({ ...db, todayLog: log })
    showToast('Log saved ✓')
    setSaving(false)
  }

  function Slider({ label, k, min = 0, max = 10, color }) {
    const v = +f[k] || 0
    const pct = ((v - min) / (max - min)) * 100
    const c = color || scoreColor(pct)
    return (
      <div className="fg">
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <label className="fl" style={{marginBottom:0}}>{label}</label>
          <span style={{fontSize:14,fontWeight:700,color:c}}>{v}</span>
        </div>
        <input type="range" className="sl" min={min} max={max} step={1} value={v}
          onChange={e=>set(k,+e.target.value)}
          style={{background:`linear-gradient(to right,${c} ${pct}%,#E2E8F0 ${pct}%)`}}
          onInput={e=>{const pp=(+e.target.value-min)/(max-min)*100;e.target.style.background=`linear-gradient(to right,${c} ${pp}%,#E2E8F0 ${pp}%)`}}
        />
        <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
          <span style={{fontSize:10,color:'#CBD5E1'}}>0</span>
          <span style={{fontSize:10,color:'#CBD5E1'}}>{max}</span>
        </div>
      </div>
    )
  }

  const totalFluid = (+f.waterL||0) + (+f.healthDrinksMl||0)/1000

  return (
    <div className="fade-up">
      {/* FIX #2: English names — Live pillar scores */}
      <div className="stats-row" style={{marginBottom:18}}>
        {[
          {l:'🍽️ Nutrition',  v:sc.nutrition,  c:'#10B981'},
          {l:'💧 Hydration',  v:sc.hydration,  c:'#0EA5E9'},
          {l:'🧘 Mind & Body',v:sc.mindBody,   c:'#F59E0B'},
          {l:'💪 Exercise',   v:sc.exercise,   c:'#8B5CF6'},
          {l:'💊 Medicines',  v:sc.medicine,   c:'#EC4899'},
          {l:'⭐ Total',      v:sc.overall,    c:scoreColor(sc.overall)},
        ].map(s=>(
          <div key={s.l} className="stat" style={{borderTop:`3px solid ${s.v>0?s.c:'#E2E8F0'}`}}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{color:s.v>0?s.c:'#CBD5E1',fontSize:20}}>{s.v>0?s.v:'—'}</div>
            <PBar value={s.v} color={s.c} height={3}/>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:14}}>
        {/* Sleep */}
        <div className="card">
          <div className="card-title">😴 Sleep & Energy</div>
          <NumInput label="Sleep hours" value={f.sleepH} onChange={v=>set('sleepH',v)} placeholder="7.5" unit="hrs" hint="Target: 7.5–8.5 hours" />
          <Slider label={`Morning energy — ${f.energyAM}/10`} k="energyAM"/>
          <Slider label={`Evening energy — ${f.energyPM}/10`} k="energyPM"/>
        </div>

        {/* Nutrition */}
        <div className="card" style={{borderTop:'3px solid #10B981'}}>
          <div className="card-title" style={{color:'#059669'}}>🍽️ Nutrition Tracking</div>
          <div className="g2">
            <NumInput label="Protein (g)" value={f.proteinG} onChange={v=>set('proteinG',v)} placeholder="80" hint="Target: 80g+" />
            <NumInput label="Fiber (g)" value={f.fiberG} onChange={v=>set('fiberG',v)} placeholder="30" hint="Target: 30g" />
            <NumInput label="Veggies (servings)" value={f.veggieServings} onChange={v=>set('veggieServings',v)} placeholder="5" hint="Target: 5 servings" />
          </div>
          <MetricRow label="Protein progress" value={f.proteinG} target={80} unit="g" color="#10B981"/>
          <div className="fg" style={{marginTop:4}}>
            <label className="fl">CREON enzyme doses today <span style={{color:'#94A3B8',fontWeight:400}}>(take with every meal)</span></label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[0,1,2,3,4,5,6,7].map(n=>(
                <button key={n} onClick={()=>set('creonDoses',n)} style={{width:36,height:36,borderRadius:8,border:`1.5px solid ${f.creonDoses===n?'#0EA5E9':'#E2E8F0'}`,background:f.creonDoses===n?'#EFF6FF':'white',color:f.creonDoses===n?'#0EA5E9':'#64748B',fontSize:14,fontWeight:700,cursor:'pointer'}}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* FIX #9: Water & Health Drinks — split */}
        <div className="card" style={{borderTop:'3px solid #0EA5E9'}}>
          <div className="card-title" style={{color:'#0284C7'}}>💧 Hydration Tracking</div>
          <NumInput label="Plain Water (L)" value={f.waterL} onChange={v=>set('waterL',v)} placeholder="2.0" unit="L" hint="Target: 2+ litres of plain water" />
          {(+f.waterL||0) > 0 && <PBar value={Math.min(100,(+f.waterL||0)/2*100)} color="#0EA5E9" height={6}/>}
          <div style={{margin:'10px 0 14px',padding:'8px 12px',background:'#F0F9FF',borderRadius:8,border:'1px solid #BAE6FD',fontSize:12,color:'#0369A1'}}>
            Medicinal drinks count separately (ash gourd juice, lemon water, tulsi tea, golden milk, ginger water, triphala)
          </div>
          <NumInput label="Medicinal / Health Drinks (ml)" value={f.healthDrinksMl} onChange={v=>set('healthDrinksMl',v)} placeholder="500" unit="ml" hint="Ash gourd 200ml + Lemon water 200ml + Golden milk 200ml = 600ml" />
          {(+f.healthDrinksMl||0) > 0 && <PBar value={Math.min(100,(+f.healthDrinksMl||0)/600*100)} color="#7DD3FC" height={6}/>}
          <div style={{marginTop:8,padding:'8px 12px',background:'#EFF6FF',borderRadius:8,fontSize:12,color:'#0369A1'}}>
            Total fluid today: <strong>{totalFluid.toFixed(1)}L</strong> / 2.5L target
          </div>
        </div>

        {/* Digestion */}
        <div className="card">
          <div className="card-title">🌿 Digestion & Gut</div>
          <Slider label={`Gas level — ${f.gasLevel}/10 (lower is better)`} k="gasLevel" color="#EF4444"/>
          <Slider label={`Bloating — ${f.bloating}/10 (lower is better)`} k="bloating" color="#F59E0B"/>
          <Slider label={`Digestive comfort — ${f.digestComfort}/10`} k="digestComfort" color="#10B981"/>
        </div>

        {/* FIX #8: Yoga and Pranayama — split */}
        <div className="card" style={{borderTop:'3px solid #F59E0B'}}>
          <div className="card-title" style={{color:'#B45309'}}>🧘 Mind & Body Practice</div>
          <NumInput label="Yoga / Asanas (mins)" value={f.yogaMins} onChange={v=>set('yogaMins',v)} placeholder="25" unit="mins" hint="Physical yoga postures — Pawanmuktasana, Surya Namaskar, stretches" />
          {(+f.yogaMins||0) > 0 && <PBar value={Math.min(100,(+f.yogaMins||0)/25*100)} color="#F59E0B" height={5}/>}
          <div style={{margin:'12px 0 0'}}>
            <NumInput label="Pranayama / Breathing (mins)" value={f.pranayamaMins} onChange={v=>set('pranayamaMins',v)} placeholder="20" unit="mins" hint="Anulom Vilom 10 min + Bhramari 5 min + Deep breathing 5 min = 20 min target" />
            {(+f.pranayamaMins||0) > 0 && <PBar value={Math.min(100,(+f.pranayamaMins||0)/20*100)} color="#FCD34D" height={5}/>}
          </div>
          <div style={{marginTop:10,padding:'9px 11px',background:'#FFFBEB',borderRadius:8,border:'1px solid #FDE68A',fontSize:12,color:'#92400E',lineHeight:1.6}}>
            💡 Anulom Vilom 10 min → NK cell activity +30% · Bhramari 5 min → nitric oxide ×15 (anti-tumor)
          </div>
        </div>

        {/* Exercise */}
        <div className="card" style={{borderTop:'3px solid #8B5CF6'}}>
          <div className="card-title" style={{color:'#7C3AED'}}>💪 Exercise & Steps</div>
          <div className="g2">
            <NumInput label="Steps taken" value={f.walkingSteps} onChange={v=>set('walkingSteps',v)} placeholder="8000" hint="Target: 8000/day" />
            <NumInput label="Body weight (kg)" value={f.weightKg} onChange={v=>set('weightKg',v)} placeholder="65.0" unit="kg" />
          </div>
          <div className="fg">
            <label className="fl">Gym / strength session today</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {GYM_GROUPS.map(g=>(
                <button key={g} onClick={()=>set('gymGroup',g)} style={{padding:'6px 12px',borderRadius:7,border:`1.5px solid ${f.gymGroup===g?'#8B5CF6':'#E2E8F0'}`,background:f.gymGroup===g?'#EDE9FE':'white',color:f.gymGroup===g?'#7C3AED':'#64748B',fontSize:12,fontWeight:500,cursor:'pointer'}}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{padding:'9px 11px',background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',fontSize:12,color:'#6D28D9',lineHeight:1.6}}>
            💡 Every 1000 steps = 8% recurrence reduction · Every 1% muscle gain = 4% lower cancer mortality
          </div>
        </div>

        {/* Habits */}
        <div className="card">
          <div className="card-title">✅ Daily Protocol Checklist</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
            {HABITS.map(h=>{
              const done=f.habits[h]
              return (
                <div key={h} className={`habit-row${done?' done':''}`} onClick={()=>sf(p=>({...p,habits:{...p.habits,[h]:!p.habits[h]}}))}>
                  <div className="habit-chk">{done?'✓':''}</div>
                  <span style={{fontSize:11,color:done?'#059669':'#64748B',lineHeight:1.3}}>{h}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-title">📝 Symptoms & Notes</div>
          <TxtInput label="Symptoms today" value={f.symptoms} onChange={v=>set('symptoms',v)} placeholder="Nausea, fatigue, pain, bloating, gas..." rows={2}/>
          <TxtInput label="Notes / observations" value={f.notes} onChange={v=>set('notes',v)} placeholder="How are you feeling overall..." rows={2}/>
        </div>
      </div>

      <button className="btn btn-gr btn-full" style={{marginTop:6,padding:'13px',fontSize:14}} onClick={save} disabled={saving}>
        {saving?<><Spin size={16} color="white"/>Saving...</>:'💾 Save Today\'s Log'}
      </button>
    </div>
  )
}
// ─── FOOD TAB — FIX #5 (typing works) FIX #7 (auto protein) FIX #10 (no auto-speak) ────────────
const MEAL_TYPES = ['Breakfast','Mid-morning snack','Lunch','Evening snack','Dinner','Bedtime']

function FoodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading, showToast, profile }) {
  const [mode, setMode] = useState('photo')
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [imgErr, setImgErr] = useState('')
  const [result, setResult] = useState(null)
  const [manualName, setManualName] = useState('')  // FIX #5: will use TxtInput
  const [manualQty, setManualQty] = useState('')
  const [manualUnit, setManualUnit] = useState('g')
  const [manualNotes, setManualNotes] = useState('')
  const [mealType, setMealType] = useState('Lunch')
  const [addingToLog, setAddingToLog] = useState(false)
  const fileRef = useRef()
  const todayStr = new Date().toLocaleDateString('en-IN')
  const todayFoods = (db.foodLogs || []).filter(f => f.date === todayStr)

  function ctx() {
    const meds = (db.medicines||[]).map(m=>m.name).join(', ')||'none'
    const intols = (db.intolerances||[]).join(', ')||'none'
    const ca199 = profile.ca199Current||'not recorded'
    const todayMeals = todayFoods.map(f=>f.name||'meal').join(', ')||'none yet'
    return `PATIENT: Pancreatic cancer (distal pancreatectomy), liver ablation, chemo complete, REMISSION. CA 19-9: ${ca199} U/mL target ~6. Medicines: ${meds}. Food intolerances: ${intols}. Must take CREON with every meal. Low glycemic. Sattvic diet. Today's meals so far: ${todayMeals}.`
  }

  async function handleFile(file) {
    if (!file) return
    setImgErr(''); setResult(null); setImgData(null)
    setImg(URL.createObjectURL(file))
    try { setImgData(await imgToBase64(file)) }
    catch(e) { setImgErr('Could not process image. Try another photo.'); setImg(null) }
  }

  async function analyzePhoto() {
    if (!imgData || aiLoading) return
    setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{role:'user',content:[
        {type:'image',source:{type:'base64',media_type:'image/jpeg',data:imgData}},
        {type:'text',text:`${ctx()}\n\nAnalyze this meal photo for my cancer recovery (${mealType}).\n\nReply EXACTLY in this format:\nMEAL NAME: [what you see, be specific]\nVERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]\nSCORE: [1-10]\nPROTEIN EST: [Xg]\nCARBS EST: [Xg]\nFAT EST: [Xg]\nFIBER EST: [Xg]\nBENEFITS: [specific recovery benefits]\nCONCERNS: [any issues for my recovery]\nCREON NEEDED: [YES - high fat/protein / MODERATE / NO]\nIMPROVE: [one specific suggestion]\nINTOLERANCE FLAG: [problem foods or NONE]\nCANCER VERDICT: [how this food impacts cancer recovery specifically]`}
      ]}],'',userEmail)
      await processResult(resp)
    } catch(e) { setResult({error:e.message}) }
    setAiLoading(false)
  }

  async function analyzeManual() {
    if (!manualName.trim() || aiLoading) return
    setAiLoading(true); setResult(null)
    try {
      const resp = await askJarvis([{role:'user',content:`${ctx()}\n\nI just ate: ${manualName}${manualQty?` (${manualQty} ${manualUnit})`:''} — ${mealType}${manualNotes?`. ${manualNotes}`:''}\n\nAnalyze for my cancer recovery. Reply EXACTLY:\nMEAL NAME: ${manualName}\nVERDICT: [OPTIMAL / ACCEPTABLE / INADVISABLE]\nSCORE: [1-10]\nPROTEIN EST: [Xg]\nCARBS EST: [Xg]\nFAT EST: [Xg]\nFIBER EST: [Xg]\nBENEFITS: [specific recovery benefits]\nCONCERNS: [any issues]\nCREON NEEDED: [YES / MODERATE / NO]\nIMPROVE: [one suggestion]\nINTOLERANCE FLAG: [problem foods or NONE]\nCANCER VERDICT: [how this food impacts cancer recovery specifically]`}],'',userEmail)
      await processResult(resp)
      setManualName(''); setManualQty(''); setManualNotes('')
    } catch(e) { setResult({error:e.message}) }
    setAiLoading(false)
  }

  async function processResult(resp) {
    const verdict = resp.match(/VERDICT:\s*(OPTIMAL|ACCEPTABLE|INADVISABLE)/i)?.[1]?.toLowerCase()||'acceptable'
    const score   = parseInt(resp.match(/SCORE:\s*(\d+)/i)?.[1]||'5')
    const name    = resp.match(/MEAL NAME:\s*([^\n]+)/i)?.[1]?.trim()||manualName||'Meal'
    // FIX #7: extract nutrition values from AI response
    const proteinEst = parseFloat(resp.match(/PROTEIN EST:\s*(\d+(?:\.\d+)?)/i)?.[1]||'0')
    const carbsEst   = parseFloat(resp.match(/CARBS EST:\s*(\d+(?:\.\d+)?)/i)?.[1]||'0')
    const fatEst     = parseFloat(resp.match(/FAT EST:\s*(\d+(?:\.\d+)?)/i)?.[1]||'0')
    const fiberEst   = parseFloat(resp.match(/FIBER EST:\s*(\d+(?:\.\d+)?)/i)?.[1]||'0')
    const fMatch  = resp.match(/INTOLERANCE FLAG:\s*([^\n]+)/i)
    const flagged = fMatch&&fMatch[1].trim().toUpperCase()!=='NONE'?fMatch[1].split(',').map(s=>s.trim()).filter(Boolean):[]
    const entry = {
      id:Date.now(), date:new Date().toLocaleDateString('en-IN'),
      time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      mealType, name, verdict, score, analysis:resp, flagged,
      proteinEst, carbsEst, fatEst, fiberEst
    }
    await saveFoodLog(uid, entry)
    for (const fl of flagged) await saveIntolerance(uid, fl)
    setDb({...db, foodLogs:[entry,...(db.foodLogs||[])].slice(0,100), intolerances:[...new Set([...(db.intolerances||[]),...flagged])]})
    setResult(entry)
    // FIX #10: NO auto-speak — only speak when user presses 🔊
    if (flagged.length) showToast('⚠ Intolerance detected: '+flagged.join(', '))
  }

  // FIX #7: add nutrition from food analysis to today's daily log
  async function addNutritionToLog() {
    if (!result || addingToLog) return
    setAddingToLog(true)
    const existing = db.todayLog || {}
    const newProtein = (+existing.proteinG||0) + result.proteinEst
    const newFiber   = (+existing.fiberG||0)   + result.fiberEst
    const today = new Date().toISOString().slice(0,10)
    const updatedLog = {...existing, date:today, proteinG:newProtein.toFixed(1), fiberG:newFiber.toFixed(1)}
    await saveDailyLog(uid, today, updatedLog)
    setDb({...db, todayLog: updatedLog})
    showToast(`Added: ${result.proteinEst}g protein + ${result.fiberEst}g fiber to today's log ✓`)
    setAddingToLog(false)
  }

  const vC={optimal:'#10B981',acceptable:'#F59E0B',inadvisable:'#EF4444'}
  const vI={optimal:'✓',acceptable:'!',inadvisable:'✕'}
  const vBg={optimal:'#F0FDF4',acceptable:'#FFFBEB',inadvisable:'#FEF2F2'}

  return (
    <div className="fade-up">
      {todayFoods.length>0&&(
        <div className="card">
          <div className="card-title">Today's Food Log</div>
          {todayFoods.map(f=>(
            <div key={f.id} className="food-row">
              <div className="food-badge" style={{background:vBg[f.verdict]||'#FFFBEB',color:vC[f.verdict]||'#F59E0B'}}>{vI[f.verdict]||'!'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{f.name}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>{f.mealType} · {f.time||f.date}{f.proteinEst>0&&<span style={{marginLeft:6,color:'#10B981'}}>+{f.proteinEst}g protein</span>}</div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:vC[f.verdict]||'#F59E0B'}}>{f.score}/10</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">Log a Meal</div>
        <div className="fg">
          <label className="fl">Meal type</label>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {MEAL_TYPES.map(m=>(
              <button key={m} onClick={()=>setMealType(m)} style={{padding:'5px 11px',borderRadius:7,border:`1.5px solid ${mealType===m?'#0EA5E9':'#E2E8F0'}`,background:mealType===m?'#EFF6FF':'white',color:mealType===m?'#0EA5E9':'#64748B',fontSize:12,fontWeight:500,cursor:'pointer'}}>{m}</button>
            ))}
          </div>
        </div>
        <div className="tabs">
          <button className={`tab${mode==='photo'?' on':''}`} onClick={()=>setMode('photo')}>📷 Photo</button>
          <button className={`tab${mode==='manual'?' on':''}`} onClick={()=>setMode('manual')}>✏️ Type food name</button>
        </div>

        {mode==='photo'?(
          <>
            <div className={`upload-z${img?' has-img':''}`} onClick={()=>!img&&fileRef.current.click()}>
              {img?<img src={img} alt="meal" style={{width:'100%',maxHeight:220,objectFit:'cover'}}/>
                :(<><div style={{fontSize:36,marginBottom:8}}>📷</div><div style={{fontSize:14,fontWeight:600,color:'#64748B'}}>Photograph your meal</div><div style={{fontSize:12,color:'#94A3B8',marginTop:4}}>Any size · JARVIS analyzes it for recovery</div></>)}
            </div>
            {imgErr&&<p style={{color:'#EF4444',fontSize:12,marginTop:6}}>⚠ {imgErr}</p>}
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
            <div className="upload-btns">
              <label className="upload-lbl">📷 Take Photo<input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/></label>
              <label className="upload-lbl">🖼 Gallery<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/></label>
            </div>
            {img&&(
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn btn-ou btn-sm" onClick={()=>{setImg(null);setImgData(null);setResult(null)}}>Clear</button>
                <button className="btn btn-pr btn-full" onClick={analyzePhoto} disabled={!imgData||aiLoading}>{aiLoading?<><Spin size={15} color="white"/>Analyzing...</>:'Analyze This Meal'}</button>
              </div>
            )}
          </>
        ):(
          <>
            {/* FIX #5: Using TxtInput so you can type food names */}
            <TxtInput label="What did you eat?" value={manualName} onChange={setManualName} placeholder="Moong dal khichdi, boiled eggs, 2 chapati with dal, banana..." />
            <div className="g2">
              <NumInput label="Quantity (optional)" value={manualQty} onChange={setManualQty} placeholder="200"/>
              <div className="fg">
                <label className="fl">Unit</label>
                <select className="fi" value={manualUnit} onChange={e=>setManualUnit(e.target.value)}>
                  {['g','ml','cup','bowl','plate','piece','tsp','tbsp'].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <TxtInput label="Notes (how cooked, extra ingredients)" value={manualNotes} onChange={setManualNotes} placeholder="Cooked with ghee, no salt, soft boiled..."/>
            <button className="btn btn-pr btn-full" onClick={analyzeManual} disabled={!manualName.trim()||aiLoading}>
              {aiLoading?<><Spin size={15} color="white"/>Analyzing...</>:'Log & Analyze Food'}
            </button>
          </>
        )}
      </div>

      {result&&(
        <div className="card fade-up" style={{borderTop:`3px solid ${vC[result.verdict]||'#F59E0B'}`,background:vBg[result.verdict]||'white'}}>
          {result.error?<p style={{color:'#EF4444'}}>Error: {result.error}</p>:(
            <>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <div style={{width:48,height:48,borderRadius:12,background:`${vC[result.verdict]}18`,border:`1.5px solid ${vC[result.verdict]}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:vC[result.verdict],flexShrink:0}}>{vI[result.verdict]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#0F172A'}}>{result.name}</div>
                  <div style={{fontSize:12,fontWeight:600,color:vC[result.verdict],marginTop:1}}>{result.verdict?.toUpperCase()} · {result.score}/10</div>
                </div>
                {/* FIX #10: Voice only on button press */}
                <button onClick={()=>speak(result.analysis,{max:450})} className="btn btn-ou btn-sm">🔊 Listen</button>
              </div>
              {/* FIX #7: Show auto-extracted nutrition + add to log button */}
              {result.proteinEst>0&&(
                <div style={{display:'flex',gap:12,flexWrap:'wrap',padding:'10px 12px',background:'#F0FDF4',borderRadius:8,border:'1px solid #BBF7D0',marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#059669',flex:1}}>
                    Estimated: <strong>{result.proteinEst}g protein</strong> · {result.carbsEst}g carbs · {result.fatEst}g fat · {result.fiberEst}g fiber
                  </div>
                  <button className="btn btn-sm" onClick={addNutritionToLog} disabled={addingToLog} style={{background:'#10B981',color:'white',border:'none',borderRadius:7,padding:'5px 12px',fontSize:12,cursor:'pointer',flexShrink:0}}>
                    {addingToLog?'Adding...':'+ Add to Today\'s Log'}
                  </button>
                </div>
              )}
              <div style={{fontSize:13,color:'#374151',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{result.analysis}</div>
              {result.flagged?.length>0&&(
                <div style={{marginTop:12,padding:'10px 12px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#DC2626',marginBottom:5}}>⚠ Intolerance detected — saved to your list</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{result.flagged.map(fl=><span key={fl} style={{background:'#FEE2E2',color:'#DC2626',padding:'2px 8px',borderRadius:4,fontSize:12}}>{fl}</span>)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(db.foodLogs||[]).length>0&&(
        <div className="card">
          <div className="card-title">Food History</div>
          {(db.foodLogs||[]).slice(0,12).map(f=>(
            <div key={f.id} className="food-row">
              <div className="food-badge" style={{background:vBg[f.verdict]||'#FFFBEB',color:vC[f.verdict]||'#F59E0B',fontSize:13}}>{vI[f.verdict]||'!'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>{f.name||'Meal'}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>{f.mealType} · {f.date} {f.time||''}</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:vC[f.verdict]||'#F59E0B'}}>{f.score}/10</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MEDICINE TAB — FIX #1 (can now type medicine names using TxtInput) ────────
function MedTab({ uid, db, setDb, showToast }) {
  const today = new Date().toISOString().slice(0,10)
  const [adding, setAdding] = useState(false)
  // FIX #1: use proper state with all string fields
  const [nm, sNm] = useState({name:'', dose:'', timing:'With food', notes:'', type:'Tablet'})
  const meds = db.medicines||[]
  const medLog = db.medLog||{}
  const taken = medLog.taken||{}
  const takenN = Object.values(taken).filter(Boolean).length

  async function addMed() {
    if (!nm.name.trim()) { showToast('Please enter a medicine name'); return }
    const id = Date.now().toString()
    const med = {...nm, id}
    await saveMedicine(uid, id, med)
    setDb({...db, medicines:[...(db.medicines||[]), med]})
    sNm({name:'', dose:'', timing:'With food', notes:'', type:'Tablet'})
    setAdding(false)
    showToast(`${nm.name} added ✓`)
  }

  async function removeMed(id) {
    await deleteMedicine(uid, id).catch(()=>{})
    setDb({...db, medicines:(db.medicines||[]).filter(m=>m.id!==id)})
    showToast('Removed')
  }

  async function toggleTaken(medId) {
    const t = {...taken, [medId]:!taken[medId]}
    const newLog = {...medLog, taken:t, date:today}
    await saveMedLog(uid, today, newLog)
    setDb({...db, medLog:newLog})
  }

  return (
    <div className="fade-up">
      <div style={{padding:'14px 16px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:700,color:'#1D4ED8',marginBottom:4}}>💊 CREON — Most Critical Medicine</div>
        <div style={{fontSize:13,color:'#3730A3',lineHeight:1.6}}>Take CREON with the <strong>first bite</strong> of every meal/snack containing fat or protein. Without enzymes, nutrients cannot be absorbed — recovery stalls. This is non-negotiable.</div>
      </div>

      {meds.length>0&&(
        <div className="card" style={{borderTop:`3px solid ${takenN===meds.length?'#10B981':'#F59E0B'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:'#0F172A'}}>Today's Medicines</div>
              <div style={{fontSize:12,color:'#64748B',marginTop:1}}>{takenN} of {meds.length} taken</div>
            </div>
            <div style={{fontSize:24,fontWeight:800,color:takenN===meds.length?'#10B981':'#F59E0B'}}>{Math.round(takenN/Math.max(1,meds.length)*100)}%</div>
          </div>
          <PBar value={(takenN/Math.max(1,meds.length))*100} color={takenN===meds.length?'#10B981':'#F59E0B'} height={6}/>
          <div style={{marginTop:14}}>
            {meds.map(med=>(
              <div key={med.id} className={`med-row${taken[med.id]?' taken':''}`}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{med.name}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>{[med.dose,med.timing,med.type].filter(Boolean).join(' · ')}</div>
                  {med.notes&&<div style={{fontSize:11,color:'#94A3B8',marginTop:1}}>{med.notes}</div>}
                </div>
                <div className="med-chk" onClick={()=>toggleTaken(med.id)}>{taken[med.id]?'✓':''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!adding?(
        <button className="btn btn-ou btn-full" style={{marginBottom:14}} onClick={()=>setAdding(true)}>+ Add Medicine or Supplement</button>
      ):(
        <div className="card">
          <div className="card-title">Add Medicine</div>
          {/* FIX #1: TxtInput for name and dose (allows letters) */}
          <TxtInput label="Medicine / Supplement name *" value={nm.name} onChange={v=>sNm(p=>({...p,name:v}))} placeholder="CREON 25000, Ashwagandha KSM-66, Vitamin D3, Metformin..."/>
          <div className="g2">
            <TxtInput label="Dose" value={nm.dose} onChange={v=>sNm(p=>({...p,dose:v}))} placeholder="1 tablet, 500mg, 2 capsules..."/>
            <div className="fg">
              <label className="fl">Type</label>
              <select className="fi" value={nm.type} onChange={e=>sNm(p=>({...p,type:e.target.value}))}>
                {['Tablet','Capsule','Syrup','Powder','Injection','Drops','Supplement','Other'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="fl">When to take</label>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {['With food','Before food','After food','Empty stomach','Bedtime','As needed'].map(t=>(
                <button key={t} onClick={()=>sNm(p=>({...p,timing:t}))} style={{padding:'5px 10px',borderRadius:7,border:`1.5px solid ${nm.timing===t?'#0EA5E9':'#E2E8F0'}`,background:nm.timing===t?'#EFF6FF':'white',color:nm.timing===t?'#0EA5E9':'#64748B',fontSize:12,cursor:'pointer'}}>{t}</button>
              ))}
            </div>
          </div>
          {/* FIX #1: TxtInput for notes */}
          <TxtInput label="Doctor's instructions / frequency" value={nm.notes} onChange={v=>sNm(p=>({...p,notes:v}))} placeholder="3 times daily, reduce after 3 months, take with fatty meal..."/>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-ou" onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn-pr btn-full" onClick={addMed} disabled={!nm.name.trim()}>Save Medicine</button>
          </div>
        </div>
      )}

      {meds.length>0&&(
        <div className="card">
          <div className="card-title">All Medicines & Supplements</div>
          {meds.map(med=>(
            <div key={med.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{med.name}</div>
                <div style={{fontSize:11,color:'#64748B'}}>{[med.dose,med.timing].filter(Boolean).join(' · ')}</div>
                {med.notes&&<div style={{fontSize:11,color:'#94A3B8'}}>{med.notes}</div>}
              </div>
              <button className="btn btn-xs" onClick={()=>removeMed(med.id)} style={{background:'#FEF2F2',color:'#EF4444',border:'1px solid #FECACA',borderRadius:6}}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ─── TRACK TAB — FIX #2 (English names) FIX #6 (correct data) ───────────────
function TrackTab({ allLogs }) {
  const [period, setPeriod] = useState(7)
  const days = useMemo(() => {
    const today = new Date(); const result = []
    for (let i = period-1; i>=0; i--) {
      const d = new Date(today); d.setDate(d.getDate()-i)
      const ds = d.toISOString().slice(0,10)
      const log = allLogs.find(l => l.date === ds) || null
      const sc = scorePillars(log)
      result.push({ds, day:d.toLocaleDateString('en-IN',{weekday:'short'}), dateN:d.getDate(), mon:d.toLocaleDateString('en-IN',{month:'short'}), isToday:i===0, log, ...sc})
    }
    return result
  }, [allLogs, period])
  const logged = days.filter(d => d.log)
  let streak=0; for(let i=days.length-1;i>=0;i--){if(days[i].log&&days[i].overall>=40)streak++;else break}
  const avg = k => logged.length ? Math.round(logged.reduce((s,d)=>s+(d[k]||0),0)/logged.length) : 0

  if (logged.length===0) return (
    <div className="fade-up">
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[7,15,30].map(p=><button key={p} className={`btn btn-sm ${period===p?'btn-pr':'btn-ou'}`} onClick={()=>setPeriod(p)}>{p} Days</button>)}
      </div>
      <div className="card" style={{textAlign:'center',padding:'40px 20px'}}>
        <div style={{fontSize:40,marginBottom:12}}>📊</div>
        <div style={{fontSize:16,fontWeight:700,color:'#64748B',marginBottom:6}}>No data yet</div>
        <div style={{fontSize:13,color:'#94A3B8'}}>Start logging daily to see your progress</div>
      </div>
    </div>
  )

  return (
    <div className="fade-up">
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        {[7,15,30].map(p=><button key={p} className={`btn btn-sm ${period===p?'btn-pr':'btn-ou'}`} onClick={()=>setPeriod(p)}>{p} Days</button>)}
        <span style={{marginLeft:'auto',fontSize:13,color:'#64748B',fontWeight:600}}>🔥 {streak} day streak</span>
      </div>

      {/* FIX #2: English names | FIX #6: use correct score keys */}
      <div className="stats-row">
        {[
          {l:'Overall',    v:avg('overall'),   c:scoreColor(avg('overall'))},
          {l:'🍽️ Nutrition', v:avg('nutrition'), c:'#10B981'},
          {l:'💧 Hydration', v:avg('hydration'), c:'#0EA5E9'},
          {l:'🧘 Mind & Body',v:avg('mindBody'),  c:'#F59E0B'},
          {l:'💪 Exercise',  v:avg('exercise'),  c:'#8B5CF6'},
        ].map(s=>(
          <div key={s.l} className="stat"><div className="stat-lbl">{s.l}</div><div className="stat-val" style={{color:s.v>0?s.c:'#CBD5E1',fontSize:20}}>{s.v>0?s.v:'—'}</div><PBar value={s.v} color={s.c} height={3}/></div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Recovery Target Achievement — {logged.length} days logged</div>
        {[
          {l:'Protein ≥ 80g/day',        n:logged.filter(d=>(+d.log?.proteinG||0)>=80).length,          c:'#10B981', why:'Rebuilds muscle — your cancer armor'},
          {l:'Plain Water ≥ 2L/day',      n:logged.filter(d=>(+d.log?.waterL||0)>=2).length,             c:'#0EA5E9', why:'Liver flush post-radiation'},
          {l:'Health Drinks ≥ 400ml/day', n:logged.filter(d=>(+d.log?.healthDrinksMl||0)>=400).length,   c:'#7DD3FC', why:'Medicinal hydration (lemon water, ash gourd, tulsi)'},
          {l:'Yoga ≥ 20 mins/day',        n:logged.filter(d=>(+d.log?.yogaMins||0)>=20).length,          c:'#F59E0B', why:'Physical postures for lymphatic flow'},
          {l:'Pranayama ≥ 15 mins/day',   n:logged.filter(d=>(+d.log?.pranayamaMins||0)>=15).length,     c:'#FCD34D', why:'NK cell boost +30% (Anulom Vilom)'},
          {l:'Steps ≥ 8000/day',          n:logged.filter(d=>(+d.log?.walkingSteps||0)>=8000).length,    c:'#8B5CF6', why:'8% cancer recurrence reduction per 1000 steps'},
          {l:'Sleep ≥ 7.5 hours/night',   n:logged.filter(d=>(+d.log?.sleepH||0)>=7.5).length,          c:'#EC4899', why:'Growth hormone + tumor suppressor activation'},
          {l:'CREON ≥ 3 doses/day',       n:logged.filter(d=>(+d.log?.creonDoses||0)>=3).length,         c:'#0EA5E9', why:'Enzyme compliance = nutrition absorption'},
        ].map((g,i)=>{
          const pct = Math.round((g.n/Math.max(1,logged.length))*100)
          return (
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div><div style={{fontSize:13,color:'#374151'}}>{g.l}</div><div style={{fontSize:10,color:'#94A3B8'}}>{g.why}</div></div>
                <span style={{fontSize:13,fontWeight:700,color:scoreColor(pct),flexShrink:0,marginLeft:8}}>{g.n}/{logged.length}</span>
              </div>
              <PBar value={pct} color={g.c}/>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="card-title">Day by Day</div>
        <div style={{display:'grid',gridTemplateColumns:'58px 1fr 40px',gap:'4px 10px',marginBottom:6,fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:0.5}}>
          <span>Date</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}><span>🍽️</span><span>💧</span><span>🧘</span><span>💪</span></div>
          <span style={{textAlign:'right'}}>Score</span>
        </div>
        {days.map(day=>(
          <div key={day.ds} className={`day-row${!day.log?' no-data':''}`}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:day.isToday?'#0EA5E9':'#64748B'}}>{day.day}</div>
              <div style={{fontSize:12,color:day.isToday?'#0EA5E9':'#94A3B8'}}>{day.dateN} {day.mon}</div>
              {day.isToday&&<div style={{fontSize:9,color:'#10B981',fontWeight:700}}>TODAY</div>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {[{k:'nutrition',c:'#10B981'},{k:'hydration',c:'#0EA5E9'},{k:'mindBody',c:'#F59E0B'},{k:'exercise',c:'#8B5CF6'}].map(p=>(
                <div key={p.k}><PBar value={day[p.k]||0} color={p.c}/><div style={{fontSize:9,color:day.log?p.c:'#E2E8F0',marginTop:2,fontWeight:600}}>{day.log?day[p.k]:'—'}</div></div>
              ))}
            </div>
            <div style={{textAlign:'right'}}>
              {day.log?<span style={{fontSize:15,fontWeight:800,color:scoreColor(day.overall)}}>{day.overall}</span>:<span style={{color:'#E2E8F0'}}>—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DASHBOARD — FIX #2 (English names) FIX #3 (data reflects) ──────────────
const PILLARS_DEF = [
  {id:'nutrition', emoji:'🍽️', label:'Nutrition',   sub:'Healing Foods',    color:'#10B981',
   targets:[{l:'Protein',k:'proteinG',t:80,u:'g'},{l:'Fiber',k:'fiberG',t:30,u:'g'},{l:'Veggies',k:'veggieServings',t:5,u:'servings'}],
   tip:'5-6 small meals · CREON with every meal · 80g+ protein daily · No refined sugar · Sattvic diet'},
  {id:'hydration', emoji:'💧', label:'Hydration',   sub:'Water & Drinks',   color:'#0EA5E9',
   targets:[{l:'Plain Water',k:'waterL',t:2,u:'L'},{l:'Health Drinks',k:'healthDrinksMl',t:500,u:'ml'}],
   tip:'Lemon water morning → Ash gourd juice 200ml → Ginger tea → Tulsi tea → Golden milk bedtime'},
  {id:'mindBody',  emoji:'🧘', label:'Mind & Body', sub:'Yoga & Pranayama', color:'#F59E0B',
   targets:[{l:'Yoga Asanas',k:'yogaMins',t:25,u:'min'},{l:'Pranayama',k:'pranayamaMins',t:20,u:'min'}],
   tip:'Anulom Vilom 10 min (NK+30%) · Bhramari 5 min (nitric oxide×15) · Surya Namaskar · Shavasana 20 min'},
  {id:'exercise',  emoji:'💪', label:'Exercise',    sub:'Steps & Strength', color:'#8B5CF6',
   targets:[{l:'Steps',k:'walkingSteps',t:8000,u:''}],
   tip:'Phase 1: walks + bodyweight → Phase 2: light weights → Phase 3: compound movements · Protein within 30 min post-workout'},
]

function Dashboard({ db, uid, setDb, setTab, allLogs, profile }) {
  const [openPillar, setOpenPillar] = useState(null)
  const todayLog = db.todayLog
  const sc = scorePillars(todayLog, db.medLog)
  const logged7 = allLogs.slice(0,7).filter(l=>l&&l.overall>0)
  const avg7 = logged7.length ? Math.round(logged7.reduce((s,l)=>s+(l.overall||0),0)/logged7.length) : 0

  const PROTOCOL = [
    '🍋 Lemon water on waking','💊 CREON with first bite of every meal',
    '🌿 Ash gourd juice 200ml (morning)','🌾 Amla powder 1 tsp',
    '🚶 Morning walk 30 min','🌬️ Anulom Vilom pranayama 10 min',
    '🥛 Protein at every meal (target 80g+)','💧 2L+ plain water today',
    '🧘 Yoga / gym session','☕ Ginger or tulsi tea afternoon',
    '✨ Golden milk before bed','😴 In bed by 10pm',
  ]
  const checks = db.todayChecks || {}
  const doneN = Object.values(checks).filter(Boolean).length

  async function toggle(i) {
    const n = {...checks, [i]:!checks[i]}
    setDb({...db, todayChecks:n})
    await saveDailyLog(uid, new Date().toISOString().slice(0,10), {checks:n})
  }

  return (
    <div className="fade-up">
      {/* Mission banner */}
      <div style={{padding:'16px 20px',background:'linear-gradient(135deg,#ECFDF5,#EFF6FF)',border:'1px solid #A7F3D0',borderRadius:14,marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:'#065F46',letterSpacing:'-0.3px'}}>🌿 Remission Active</div>
            <div style={{fontSize:13,color:'#047857',marginTop:2}}>PET-CT Clear · CA 19-9 Target ~6 U/mL · Recovery Protocol Running</div>
          </div>
          <div style={{display:'flex',gap:12}}>
            {profile.ca199Current&&(
              <div style={{textAlign:'center',padding:'8px 14px',background:'white',borderRadius:10,border:'1px solid #A7F3D0'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#6B7280'}}>CA 19-9</div>
                <div style={{fontSize:22,fontWeight:800,color:+profile.ca199Current<=6?'#10B981':+profile.ca199Current<=37?'#F59E0B':'#EF4444'}}>{profile.ca199Current}</div>
              </div>
            )}
            <div style={{textAlign:'center',padding:'8px 14px',background:'white',borderRadius:10,border:'1px solid #BFDBFE'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#6B7280'}}>7-Day Avg</div>
              <div style={{fontSize:22,fontWeight:800,color:avg7>0?scoreColor(avg7):'#CBD5E1'}}>{avg7>0?avg7:'—'}</div>
            </div>
          </div>
        </div>
      </div>

      {!todayLog&&(
        <div onClick={()=>setTab('log')} style={{cursor:'pointer',padding:'14px 18px',background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:12,marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:26}}>📋</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:'#92400E'}}>Log today's data</div><div style={{fontSize:12,color:'#B45309'}}>Record food, water, pranayama, gym, medicines</div></div>
          <div style={{fontSize:13,fontWeight:700,color:'#D97706'}}>Log Now →</div>
        </div>
      )}

      {/* 4 Pillars */}
      <div style={{fontSize:12,fontWeight:700,color:'#94A3B8',letterSpacing:0.8,textTransform:'uppercase',marginBottom:10}}>Your 4 Recovery Pillars</div>
      <div className="pillar-grid">
        {PILLARS_DEF.map(p=>{
          const s=sc[p.id]||0; const isOpen=openPillar===p.id
          return (
            <div key={p.id} className={`pillar-card${isOpen?' open':''}`} style={{'--pc':p.color}} onClick={()=>setOpenPillar(isOpen?null:p.id)}>
              <div className="pillar-top">
                <span className="pillar-emoji">{p.emoji}</span>
                <div><div className="pillar-name">{p.label}</div><div className="pillar-sub">{p.sub}</div></div>
                <div className="pillar-score" style={{color:s>0?scoreColor(s):'#CBD5E1'}}>{s>0?s:'—'}</div>
              </div>
              <div className="pillar-bar-bg"><div className="pillar-bar-fill" style={{width:`${s}%`,background:s>0?p.color:'#E2E8F0'}}/></div>
              <div className="pillar-status" style={{color:s>0?scoreColor(s):'#94A3B8'}}>{scoreLabel(s)}</div>
              {isOpen&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${p.color}25`}} onClick={e=>e.stopPropagation()}>
                  {p.targets.map(t=>{
                    const val=+todayLog?.[t.k]||0
                    const pct=Math.min(100,Math.round(val/t.t*100))
                    return (
                      <div key={t.k} style={{marginBottom:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                          <span style={{fontSize:12,color:'#64748B'}}>{t.l}</span>
                          <span style={{fontSize:12,fontWeight:700,color:pct>=100?p.color:scoreColor(pct)}}>{val}{t.u} / {t.t}{t.u}</span>
                        </div>
                        <PBar value={pct} color={p.color}/>
                      </div>
                    )
                  })}
                  <div style={{fontSize:11,color:'#64748B',lineHeight:1.65,marginTop:8,padding:'8px 10px',background:`${p.color}0A`,borderRadius:7}}>{p.tip}</div>
                </div>
              )}
              <div style={{fontSize:10,color:'#94A3B8',marginTop:6}}>{isOpen?'▲ Tap to collapse':'▼ Tap for details'}</div>
            </div>
          )
        })}
        {/* Medicine pillar */}
        <div className="pillar-card" style={{'--pc':'#EC4899'}}>
          <div className="pillar-top">
            <span className="pillar-emoji">💊</span>
            <div><div className="pillar-name">Medicines</div><div className="pillar-sub">Daily Compliance</div></div>
            <div className="pillar-score" style={{color:sc.medicine>0?scoreColor(sc.medicine):'#CBD5E1'}}>{sc.medicine>0?sc.medicine:'—'}</div>
          </div>
          <div className="pillar-bar-bg"><div className="pillar-bar-fill" style={{width:`${sc.medicine}%`,background:sc.medicine>0?'#EC4899':'#E2E8F0'}}/></div>
          <div className="pillar-status" style={{color:sc.medicine>0?scoreColor(sc.medicine):'#94A3B8'}}>{scoreLabel(sc.medicine)}</div>
          <div style={{fontSize:10,color:'#94A3B8',marginTop:6}}>CREON + all supplements</div>
        </div>
      </div>

      {todayLog&&(
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div className="card-title" style={{marginBottom:0}}>Today's Recovery Score</div>
            <div style={{fontSize:22,fontWeight:800,color:scoreColor(sc.overall)}}>{sc.overall}/100</div>
          </div>
          {[
            {l:'🍽️ Nutrition (Food & Protein)', v:sc.nutrition, c:'#10B981'},
            {l:'💧 Hydration (Water & Drinks)',  v:sc.hydration, c:'#0EA5E9'},
            {l:'🧘 Mind & Body (Yoga & Pranayama)',v:sc.mindBody,c:'#F59E0B'},
            {l:'💪 Exercise (Steps & Gym)',        v:sc.exercise, c:'#8B5CF6'},
            {l:'💊 Medicines (CREON compliance)',  v:sc.medicine, c:'#EC4899'},
          ].map(s=>(
            <div key={s.l} style={{marginBottom:11}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:13,color:'#374151'}}>{s.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:s.v>0?scoreColor(s.v):'#CBD5E1'}}>{s.v>0?`${s.v}%`:'—'}</span>
              </div>
              <PBar value={s.v} color={s.c}/>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div className="card-title" style={{marginBottom:0}}>Today's Protocol</div>
          <span style={{fontSize:12,color:'#64748B',fontWeight:600}}>{doneN}/{PROTOCOL.length}</span>
        </div>
        {PROTOCOL.map((item,i)=>{
          const done=checks[i]
          return (
            <div key={i} onClick={()=>toggle(i)} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:2,background:done?'#F0FDF4':'transparent',transition:'background 0.12s'}}>
              <div style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${done?'#10B981':'#E2E8F0'}`,background:done?'#10B981':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,fontSize:11,color:'white'}}>{done?'✓':''}</div>
              <span style={{fontSize:13,color:done?'#059669':'#64748B',textDecoration:done?'line-through':'none',opacity:done?0.7:1}}>{item}</span>
            </div>
          )
        })}
      </div>

      {(db.intolerances||[]).length>0&&(
        <div className="card" style={{borderTop:'3px solid #EF4444',background:'#FEF2F2'}}>
          <div className="card-title" style={{color:'#DC2626'}}>⚠ Food Intolerances (auto-tracked)</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {db.intolerances.map((f,i)=><span key={i} style={{background:'#FEE2E2',border:'1px solid #FECACA',color:'#DC2626',padding:'3px 10px',borderRadius:20,fontSize:12}}>{f}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
// ─── AI COACH — FIX #10 (no auto-speak, only on button press) ────────────────
function AICoach({ uid, db, userEmail, aiLoading, setAiLoading, profile }) {
  const [msgs, setMsgs] = useState([{
    role:'assistant',
    content:'Namaste. I am JARVIS — your personal cancer recovery assistant.\n\nI have your complete medical history loaded. Ask me anything:\n\n• What should I eat right now?\n• How do I reduce CA 19-9?\n• Give me today\'s full recovery plan\n• Explain my pranayama routine\n• How do I rebuild sperm health after chemo?\n• I feel tired today — what should I do?\n\nPress 🔊 on any response to hear it aloud.'
  }])
  const [input, setInput] = useState('')
  const bottomRef = useRef()
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  function buildCtx() {
    const sc = scorePillars(db.todayLog, db.medLog)
    const meds = (db.medicines||[]).map(m=>`${m.name} ${m.dose} (${m.timing})`).join('; ')||'none'
    const intols = (db.intolerances||[]).join(', ')||'none'
    const foods = (db.foodLogs||[]).filter(f=>f.date===new Date().toLocaleDateString('en-IN')).map(f=>`${f.name} (${f.verdict}, ${f.score}/10)`).join('; ')||'none today'
    const symptoms = db.todayLog?.symptoms||'none'
    const wt = db.todayLog?.weightKg?`${db.todayLog.weightKg}kg`:'not recorded'
    return `${PROTOCOL_KNOWLEDGE}\n\nCURRENT PATIENT DATA:\nCA 19-9 current: ${profile.ca199Current||'unknown'} U/mL (target ~6)\nRecovery phase: ${profile.recoveryPhase||'1'}\nCurrent weight: ${wt}\nMedicines taking: ${meds}\nFood intolerances: ${intols}\nToday's food: ${foods}\nSymptoms today: ${symptoms}\nToday's scores: Nutrition ${sc.nutrition}% · Hydration ${sc.hydration}% · Mind&Body ${sc.mindBody}% · Exercise ${sc.exercise}% · Medicine ${sc.medicine}% · Overall ${sc.overall}%\nSurgery: ${profile.surgeryDetails||'distal pancreatectomy'}\nOther notes: ${profile.extraNotes||'none'}\n\nYou are JARVIS — warm, precise, evidence-based. Always connect advice to recovery goals. Be specific, not generic.`
  }

  async function send(override) {
    const text = override||input.trim()
    if (!text||aiLoading) return
    unlockSpeech()
    const userMsg = {role:'user',content:text}
    const newMsgs = [...msgs,userMsg]
    setMsgs(newMsgs); setInput(''); setAiLoading(true)
    await saveChat(uid,'user',text)
    try {
      const resp = await askJarvis(newMsgs.map(m=>({role:m.role,content:m.content})), buildCtx(), userEmail)
      const aiMsg = {role:'assistant',content:resp}
      setMsgs([...newMsgs,aiMsg])
      await saveChat(uid,'assistant',resp)
      // FIX #10: NO auto-speak — only speak when user presses 🔊 button
    } catch(e) { setMsgs([...newMsgs,{role:'assistant',content:`Connection error: ${e.message}`}]) }
    setAiLoading(false)
  }

  const CHIPS = [
    'What to eat right now?','How to reduce CA 19-9?','Give me today\'s plan',
    'I feel tired — what should I do?','Best pranayama for immunity?',
    'How to increase sperm count?','Foods that reduce inflammation?',
    'Explain my nutrition targets','Hair growth tips','How to gain weight safely?'
  ]

  return (
    <div className="chat-wrap">
      <div className="chat-msgs">
        {msgs.map((m,i)=>(
          <div key={i} className={`chat-row${m.role==='user'?' user':''}`}>
            {m.role==='assistant'&&<div className="chat-av">🤖</div>}
            <div className={`bubble ${m.role==='user'?'user':'ai'}`}>
              {m.role==='assistant'&&<div style={{fontSize:10,fontWeight:700,color:'#0EA5E9',marginBottom:4,letterSpacing:0.5}}>JARVIS</div>}
              {m.content}
              {m.role==='assistant'&&(
                <button onClick={()=>speak(m.content,{max:480})} style={{display:'block',marginTop:8,padding:'4px 10px',borderRadius:6,border:'1px solid #E2E8F0',background:'white',color:'#64748B',fontSize:11,cursor:'pointer'}}>🔊 Listen</button>
              )}
            </div>
          </div>
        ))}
        {aiLoading&&(
          <div className="chat-row">
            <div className="chat-av">🤖</div>
            <div className="bubble ai" style={{display:'flex',gap:5,alignItems:'center'}}>
              {[0,0.15,0.3].map(d=><div key={d} style={{width:7,height:7,borderRadius:'50%',background:'#CBD5E1',animation:`pulse 1s ease ${d}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div className="chat-chips">
        {CHIPS.map((q,i)=><button key={i} className="chip" onClick={()=>{unlockSpeech();send(q)}}>{q}</button>)}
      </div>
      <div className="chat-in-row">
        <textarea className="chat-in" placeholder="Ask JARVIS about food, medicines, CA 19-9, pranayama, recovery..." value={input}
          onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
          onFocus={e=>e.target.style.borderColor='#0EA5E9'}
          onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
        <button className="btn btn-pr" style={{alignSelf:'flex-end',padding:'10px 14px'}} onClick={()=>send()} disabled={!input.trim()||aiLoading}>➤</button>
      </div>
    </div>
  )
}

// ─── BLOOD TAB ────────────────────────────────────────────────────────────────
function BloodTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [mode, setMode] = useState('manual'); const [text, setText] = useState('')
  const [img, setImg] = useState(null); const [imgData, setImgData] = useState(null)
  const [result, setResult] = useState(null); const fileRef = useRef()

  const ctx=()=>`Patient: Pancreatic cancer (distal pancreatectomy), liver metastasis treated with radiation + ablation, chemo complete, REMISSION. CA 19-9 target ~6. Partial pancreatectomy = blood sugar regulation affected. Liver had radiation = LFT important. Post-chemo = CBC and immunity markers matter. Medicines: ${(db.medicines||[]).map(m=>m.name).join(', ')||'none'}.`

  async function analyze() {
    setAiLoading(true); setResult(null)
    try {
      const msgs = mode==='manual'
        ?[{role:'user',content:`${ctx()}\n\nMy blood report:\n${text}\n\nProvide:\n1. SUMMARY (2-3 sentences)\n2. KEY MARKERS (each: value, normal/low/high, what it means)\n3. CA 19-9 (critical — my target is ~6)\n4. LIVER HEALTH (had radiation + ablation)\n5. BLOOD SUGAR (partial pancreatectomy)\n6. IMMUNITY STATUS (post-chemo)\n7. URGENT ACTIONS (anything needing immediate attention)\n8. DIETARY CHANGES (specific foods to add or remove)\n9. ENCOURAGING NOTE`}]
        :[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:imgData}},{type:'text',text:`${ctx()}\n\nAnalyze this blood report: SUMMARY, KEY MARKERS, CA 19-9, LIVER HEALTH, BLOOD SUGAR, IMMUNITY, URGENT ACTIONS, DIETARY CHANGES, ENCOURAGING NOTE.`}]}]
      const resp = await askJarvis(msgs,'',userEmail)
      const entry = {id:Date.now(),date:new Date().toLocaleDateString('en-IN'),summary:resp.slice(0,220),full:resp}
      await saveBloodReport(uid,entry)
      setDb({...db,bloodReports:[entry,...(db.bloodReports||[])]})
      setResult(entry)
      // FIX #10: no auto-speak
    } catch(e){setResult({full:'Error: '+e.message})}
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div className="card">
        <div className="card-title">Analyze Blood Report</div>
        <div className="tabs">
          <button className={`tab${mode==='manual'?' on':''}`} onClick={()=>setMode('manual')}>✏️ Type values</button>
          <button className={`tab${mode==='photo'?' on':''}`} onClick={()=>setMode('photo')}>📷 Upload photo</button>
        </div>
        {mode==='manual'?(
          <>
            <div className="fg"><label className="fl">Enter lab values (one per line)</label>
              <textarea className="fi" rows={10} value={text} onChange={e=>setText(e.target.value)} style={{fontFamily:'monospace',fontSize:13,height:220}} placeholder={'CA 19-9: 28 U/mL\nHbA1c: 6.2%\nFasting Glucose: 105 mg/dL\nVitamin D: 22 ng/mL\nHemoglobin: 11.5 g/dL\nALT: 38 U/L\nAST: 32 U/L\nTotal Bilirubin: 0.8\n...'}/>
            </div>
            <button className="btn btn-pr btn-full" onClick={analyze} disabled={!text.trim()||aiLoading}>{aiLoading?<><Spin size={15} color="white"/>Analyzing...</>:'Analyze Report'}</button>
          </>
        ):(
          <>
            <div className={`upload-z${img?' has-img':''}`} onClick={()=>!img&&fileRef.current.click()}>
              {img?<img src={img} alt="report" style={{width:'100%',maxHeight:220,objectFit:'contain'}}/>:(<><div style={{fontSize:36,marginBottom:8}}>📋</div><div style={{fontSize:14,fontWeight:600,color:'#64748B'}}>Upload blood test report</div><div style={{fontSize:12,color:'#94A3B8',marginTop:4}}>Photo or scan</div></>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/>
            <div className="upload-btns">
              <label className="upload-lbl">📷 Camera<input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/></label>
              <label className="upload-lbl">🖼 Gallery<input type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];if(!f)return;setImg(URL.createObjectURL(f));setImgData(await imgToBase64(f))}}/></label>
            </div>
            {img&&<button className="btn btn-pr btn-full" style={{marginTop:10}} onClick={analyze} disabled={!imgData||aiLoading}>{aiLoading?<><Spin size={15} color="white"/>Analyzing...</>:'Analyze Report'}</button>}
          </>
        )}
      </div>
      {result&&(
        <div className="card fade-up">
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0}}>Analysis — {result.date}</div>
            {/* FIX #10: voice only on button press */}
            <button onClick={()=>speak(result.full,{max:450})} className="btn btn-ou btn-sm">🔊 Listen</button>
          </div>
          <div style={{fontSize:13,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result.full}</div>
          <div style={{marginTop:12,padding:'10px 12px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,fontSize:12,color:'#92400E'}}>⚠ Share with your oncologist for all medical decisions.</div>
        </div>
      )}
      {(db.bloodReports||[]).length>0&&(
        <div className="card"><div className="card-title">History</div>
          {(db.bloodReports||[]).slice(0,4).map(r=>(
            <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',marginBottom:3}}>{r.date}</div>
              <div style={{fontSize:12,color:'#64748B'}}>{r.summary?.slice(0,140)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FITNESS TAB (Static pre-built + AI) ─────────────────────────────────────
function FitTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading, profile }) {
  const [view, setView] = useState('yoga') // yoga | gym | ai
  const [yogaExp, setYogaExp] = useState(null)
  const [gymPhase, setGymPhase] = useState(+(profile.recoveryPhase||1)-1)
  const [gymExp, setGymExp] = useState(null)
  const [aiPlan, setAiPlan] = useState(null)
  const [aiType, setAiType] = useState('yoga'); const [aiPh, setAiPh] = useState(profile.recoveryPhase||'1')
  const saved = (db.fitnessPlans||{})[aiType+aiPh]

  async function genPlan() {
    setAiLoading(true); setAiPlan(null)
    try {
      const resp = await askJarvis([{role:'user',content:`Generate a highly personalized Phase ${aiPh} ${aiType==='yoga'?'Yoga and Pranayama':'Strength Training'} protocol for this specific patient: distal pancreatectomy + liver ablation + multiple chemo regimens + REMISSION. Phase 1=Weeks 1-6 gentle, Phase 2=Weeks 7-16 building, Phase 3=Month 4+ progressive. Include specific exercises, sets, reps, breathing cues, modifications, and connections to cancer recovery science. Make it feel like a personal trainer who knows this patient deeply.`}],'',userEmail)
      await savePlan(uid,aiType+aiPh,resp)
      setDb({...db,fitnessPlans:{...(db.fitnessPlans||{}),[aiType+aiPh]:resp}})
      setAiPlan(resp)
    } catch(e){setAiPlan('Error: '+e.message)}
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div className="tabs">
        <button className={`tab${view==='yoga'?' on':''}`} onClick={()=>setView('yoga')}>🧘 Yoga Sequence</button>
        <button className={`tab${view==='gym'?' on':''}`} onClick={()=>setView('gym')}>💪 Gym Plans</button>
        <button className={`tab${view==='ai'?' on':''}`} onClick={()=>setView('ai')}>🤖 AI Custom Plan</button>
      </div>

      {view==='yoga' && (
        <>
          <div style={{padding:'10px 16px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#92400E',marginBottom:2}}>Complete Daily Yoga — 45 Minutes Total</div>
            <div style={{fontSize:12,color:'#78350F'}}>Follow this exact sequence every day. Static reference — no internet needed. Tap each practice for full instructions.</div>
          </div>
          {YOGA_SEQUENCE.map((y,i)=>{
            const isOpen=yogaExp===i
            const tC=y.type==='Pranayama'?'#0EA5E9':y.type==='Asana'?'#F59E0B':'#8B5CF6'
            return (
              <div key={i} style={{background:'white',border:`1.5px solid ${isOpen?y.color+'40':'#E8EEF4'}`,borderRadius:12,marginBottom:8,overflow:'hidden',boxShadow:'0 1px 4px rgba(15,23,42,0.05)'}}>
                <div style={{display:'flex',alignItems:'center',gap:11,padding:'12px 16px',cursor:'pointer'}} onClick={()=>setYogaExp(isOpen?null:i)}>
                  <div style={{width:36,height:36,borderRadius:9,background:`${y.color}12`,border:`1px solid ${y.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{y.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>Step {y.step}: {y.name}</div>
                    <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,fontWeight:600,color:tC,background:`${tC}10`,padding:'1px 7px',borderRadius:4}}>{y.type}</span>
                      <span style={{fontSize:11,color:'#94A3B8'}}>⏱ {y.mins} min</span>
                    </div>
                  </div>
                  <span style={{color:'#94A3B8',fontSize:11}}>{isOpen?'▲':'▼'}</span>
                </div>
                {isOpen && (
                  <div style={{padding:'0 16px 14px',borderTop:`1px solid ${y.color}20`}}>
                    <div style={{fontSize:11,color:'#64748B',fontWeight:500,marginBottom:6}}>📍 {y.when}</div>
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#94A3B8',marginBottom:5,textTransform:'uppercase'}}>How to do it</div>
                      <div style={{fontSize:13,color:'#374151',lineHeight:1.8}}>{y.how}</div>
                    </div>
                    <div style={{padding:'10px 12px',background:`${y.color}07`,borderRadius:8,border:`1px solid ${y.color}20`,marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:y.color,marginBottom:3,textTransform:'uppercase'}}>Benefits for You Specifically</div>
                      <div style={{fontSize:12,color:'#374151',lineHeight:1.65}}>{y.benefit}</div>
                    </div>
                    <div style={{padding:'10px 12px',background:'#F0F9FF',borderRadius:8,border:'1px solid #BAE6FD',marginBottom:y.caution?8:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#0369A1',marginBottom:3,textTransform:'uppercase'}}>🔬 Science</div>
                      <div style={{fontSize:11,color:'#0C4A6E',lineHeight:1.65}}>{y.science}</div>
                    </div>
                    {y.caution && <div style={{padding:'9px 12px',background:'#FEF2F2',borderRadius:8,border:'1px solid #FECACA',fontSize:11,color:'#DC2626'}}>⚠ {y.caution}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {view==='gym' && (
        <>
          <div style={{padding:'10px 16px',background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,marginBottom:14,fontSize:12,color:'#6D28D9'}}>
            💡 Every 1% muscle gain = 4% reduction in cancer mortality. Select your current phase. Tap any exercise for coaching notes.
          </div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {GYM_PHASES.map((p,i)=>(
              <button key={i} onClick={()=>setGymPhase(i)} style={{flex:1,padding:'10px 6px',borderRadius:10,border:`1.5px solid ${gymPhase===i?p.color:'#E2E8F0'}`,background:gymPhase===i?`${p.color}0E`:'white',color:gymPhase===i?p.color:'#64748B',fontSize:11,fontWeight:600,cursor:'pointer',lineHeight:1.5}}>
                Phase {p.phase}<br/><span style={{fontWeight:400,fontSize:10}}>{p.weeks}</span>
              </button>
            ))}
          </div>
          {(() => {
            const ph=GYM_PHASES[gymPhase]
            return (
              <>
                <div className="card" style={{borderTop:`3px solid ${ph.color}`}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#0F172A',marginBottom:2}}>{ph.label}</div>
                  <div style={{fontSize:12,color:'#64748B',marginBottom:12}}>{ph.goal}</div>
                  <div style={{padding:'10px 12px',background:`${ph.color}08`,borderRadius:9,border:`1px solid ${ph.color}20`,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:ph.color,marginBottom:3}}>🚶 CARDIO</div>
                    <div style={{fontSize:12,color:'#374151',lineHeight:1.65}}>{ph.cardio}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>STRENGTH — {ph.strength}</div>
                  {ph.exercises.map((ex,ei)=>{
                    const key=`${gymPhase}-${ei}`; const isOpen=gymExp===key
                    return (
                      <div key={ei} style={{border:`1px solid ${isOpen?ph.color+'40':'#F1F5F9'}`,borderRadius:9,marginBottom:6,overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 13px',cursor:'pointer',background:isOpen?`${ph.color}05`:'white'}} onClick={()=>setGymExp(isOpen?null:key)}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{ex.name}</div>
                            <div style={{display:'flex',gap:10,marginTop:2}}>
                              <span style={{fontSize:11,color:ph.color,fontWeight:600}}>{ex.sets} sets × {ex.reps}</span>
                              <span style={{fontSize:11,color:'#94A3B8'}}>Rest: {ex.rest}</span>
                            </div>
                          </div>
                          <span style={{color:'#94A3B8',fontSize:11}}>{isOpen?'▲':'ℹ'}</span>
                        </div>
                        {isOpen && <div style={{padding:'8px 13px 12px',borderTop:`1px solid ${ph.color}20`,background:`${ph.color}04`,fontSize:12,color:'#374151',lineHeight:1.65}}>{ex.note}</div>}
                      </div>
                    )
                  })}
                </div>
                <div className="card" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#059669',marginBottom:5}}>⚡ POST-WORKOUT NUTRITION — Within 30 min (mandatory)</div>
                  <div style={{fontSize:13,color:'#374151',lineHeight:1.65}}>{ph.postWorkout}</div>
                </div>
                <div className="card" style={{background:'#FEF2F2',borderTop:'2px solid #EF4444'}}>
                  <div className="card-title" style={{color:'#DC2626',marginBottom:8}}>⚠ Safety Rules — Always Follow</div>
                  <div style={{fontSize:12,color:'#374151',lineHeight:1.7,marginBottom:8}}>{ph.caution}</div>
                  {['Never exercise on empty stomach — blood sugar drop with partial pancreas','Stop at any sharp abdominal pain, chest tightness, or dizziness','Drink water: 300ml before + 300ml during + 300ml after','If exhausted on a day: walk + pranayama only. Rest is also training.'].map((r,ri)=>(
                    <div key={ri} style={{display:'flex',gap:8,marginBottom:5}}>
                      <span style={{color:'#EF4444',flexShrink:0,fontWeight:700}}>•</span>
                      <span style={{fontSize:12,color:'#374151'}}>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-title">📅 Weekly Training Schedule</div>
                  {[['Monday','Yoga + Strength (Push — Chest/Shoulders)'],['Tuesday','Walk + Pranayama only (recovery)'],['Wednesday','Yoga + Strength (Pull — Back/Arms)'],['Thursday','Walk + Pranayama + Flexibility'],['Friday','Yoga + Strength (Legs — Squats/Glutes)'],['Saturday','Full 45-min Yoga session'],['Sunday','Rest + gentle walk only']].map(([d,a],di)=>(
                    <div key={di} style={{display:'flex',gap:12,padding:'9px 0',borderBottom:'1px solid #F1F5F9'}}>
                      <div style={{width:90,fontSize:12,fontWeight:700,color:ph.color,flexShrink:0}}>{d}</div>
                      <div style={{fontSize:12,color:'#374151'}}>{a}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </>
      )}

      {view==='ai' && (
        <div>
          <div style={{padding:'12px 16px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#1D4ED8',marginBottom:3}}>🤖 AI-Personalised Plan</div>
            <div style={{fontSize:12,color:'#3730A3'}}>JARVIS generates a custom plan using your complete health profile — phase, surgery history, current fitness level, and recovery goals. More specific than any generic program.</div>
          </div>
          <div className="card">
            <div className="fg">
              <label className="fl">Plan type</label>
              <div style={{display:'flex',gap:8}}>
                {[['yoga','🧘 Yoga & Pranayama'],['gym','💪 Strength Training']].map(([t,l])=>(
                  <button key={t} onClick={()=>setAiType(t)} style={{flex:1,padding:'10px',borderRadius:9,border:`1.5px solid ${aiType===t?'#0EA5E9':'#E2E8F0'}`,background:aiType===t?'#EFF6FF':'white',color:aiType===t?'#0EA5E9':'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>{l}</button>
                ))}
              </div>
            </div>
            <div className="fg">
              <label className="fl">Recovery phase</label>
              <div style={{display:'flex',gap:8}}>
                {[['1','Weeks 1-6'],['2','Weeks 7-16'],['3','Month 4+']].map(([p,l])=>(
                  <button key={p} onClick={()=>setAiPh(p)} style={{flex:1,padding:'10px 6px',borderRadius:9,border:`1.5px solid ${aiPh===p?'#8B5CF6':'#E2E8F0'}`,background:aiPh===p?'#F5F3FF':'white',color:aiPh===p?'#7C3AED':'#64748B',fontSize:11,fontWeight:600,cursor:'pointer',lineHeight:1.5}}>Phase {p}<br/><span style={{fontWeight:400,fontSize:10,color:aiPh===p?'#8B5CF6':'#94A3B8'}}>{l}</span></button>
                ))}
              </div>
            </div>
            <button className={`btn btn-full ${aiType==='yoga'?'btn-gr':'btn-pr'}`} onClick={genPlan} disabled={aiLoading}>
              {aiLoading?<><Spin size={15} color="white"/>Generating personalised plan...</>:'Generate My Custom Plan'}
            </button>
          </div>
          {(aiPlan||saved) && (
            <div className="card fade-up">
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div className="card-title" style={{marginBottom:0}}>Your Custom {aiType==='yoga'?'Yoga':'Gym'} Plan — Phase {aiPh}</div>
                <button onClick={()=>speak((aiPlan||saved),{max:400})} className="btn btn-ou btn-sm">🔊</button>
              </div>
              <div style={{fontSize:13,color:'#374151',lineHeight:1.85,whiteSpace:'pre-wrap'}}>{aiPlan||saved}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── HEALING GUIDES ───────────────────────────────────────────────────────────
const HEAL_TOPICS = [
  {id:'ca199',    icon:'🎯',label:'Reduce CA 19-9',        color:'#EF4444'},
  {id:'sperm',    icon:'🌱',label:'Sperm & Fertility',      color:'#0EA5E9'},
  {id:'hair',     icon:'✨',label:'Hair Regrowth',          color:'#F59E0B'},
  {id:'weight',   icon:'⚖️',label:'Gain Weight Safely',    color:'#10B981'},
  {id:'immunity', icon:'🛡️',label:'Rebuild Immunity',      color:'#0EA5E9'},
  {id:'energy',   icon:'⚡',label:'Restore Energy',         color:'#F59E0B'},
  {id:'digestion',icon:'🌿',label:'Fix Digestion (PERT)',   color:'#10B981'},
  {id:'eyebrow',  icon:'👁️',label:'Eyebrow & Lashes',      color:'#8B5CF6'},
  {id:'appear',   icon:'🌟',label:'Look Normal Again',      color:'#10B981'},
  {id:'complete', icon:'🏆',label:'Full Recovery Roadmap', color:'#EF4444'},
]
const HEAL_PROMPTS = {
  ca199:'Specific actionable CA 19-9 reduction protocol (5 layers): 1) Blood sugar control — eliminate refined sugar, low glycemic, protein before carbs, cinnamon half tsp, berberine 500mg, fasting glucose target 80-90. 2) Liver support — milk thistle, NAC 600mg, amla 2 tsp daily, 3L water, no alcohol. 3) Gut inflammation — L-Glutamine 5g empty stomach, probiotic (Lactobacillus + Bifidobacterium), no NSAIDs. 4) Anti-inflammatory stack — turmeric+pepper nightly, omega-3 2-3g, ginger daily, green tea 2 cups. 5) Evidence-based agents — Vitamin D3 4000-5000 IU, melatonin 10-20mg, quercetin 500mg, modified citrus pectin 5g 3x. Include realistic timeline and tracking.',
  sperm:'Complete post-chemotherapy sperm recovery. Tests needed now (semen analysis, FSH+LH+Testosterone, prolactin, thyroid). Supplements with exact doses: CoQ10 400-600mg (most evidence-backed), Ashwagandha KSM-66 600mg (increases count+motility proven), L-Carnitine 2g, Zinc 15-25mg, Selenium 100-200mcg, Vitamin E 400 IU. Lifestyle factors: sleep 8h, avoid heat (no hot tubs), cold showers, ejaculation frequency every 2-3 days. Timeline: 74-day sperm cycle. Month by month expectations.',
  hair:'Complete hair regrowth after chemo. Month by month timeline. Daily scalp massage 3 min with rosemary oil or warm coconut oil. Supplements: Biotin 5000mcg, Zinc, Iron (check ferritin), Vitamin D3, Collagen 10g. Hair care routine once it starts growing. Foods that speed up hair growth. What to realistically expect at 1, 3, 6, 12 months.',
  weight:'Safe lean weight gain after cancer. Target 0.3-0.5 kg/week. Calorie surplus calculation. Protein timing strategy. Best high-calorie recovery foods: ghee, soaked dates, banana, makhana, peanut butter, full-fat curd, sweet potato. Exercise to maximize muscle gain not just fat. Supplement support. How to track and adjust.',
  immunity:'Post-chemotherapy immunity reconstruction. Specific immune-boosting foods with amounts and timing. Full supplement protocol. Sleep optimization for immune function. Exercise that specifically activates NK cells. Lab markers to track monthly. Signs immunity is improving. Timeline of immune recovery after chemo.',
  energy:'Natural energy restoration after chemo — no steroid dependency. Adrenal recovery protocol. Mitochondrial healing: CoQ10 doses, B vitamins, iron. Blood sugar stability strategies. Sleep architecture improvement. Adaptogen protocol: Ashwagandha timing and dose, Rhodiola. Month by month energy rebuild timeline.',
  digestion:'Complete gut healing after partial pancreatectomy + chemo. PERT optimization: timing (first bite!), adjusting dose for fat content, signs you need more. Gut lining repair: L-Glutamine 5g, Slippery Elm, aloe vera inner leaf. Microbiome rebuilding: probiotics, prebiotic foods. Managing gas and bloating. Meal structure for best absorption. Signs of healing.',
  eyebrow:'Eyebrow and eyelash regrowth after chemo. Castor oil + rosemary oil nightly protocol with massage technique. Medical options: Latisse (bimatoprost) prescription, Vegamour serum. Supplement support: biotin, vitamin E, zinc. Realistic timeline. How to care for sparse regrowth. What to avoid.',
  appear:'Complete guide to looking and feeling completely normal: weight and muscle restoration timeline, skin restoration (hydration, collagen foods, skincare routine), hair and eyebrow combined approach, posture recovery, mental recovery and confidence rebuilding. Realistic month by month transformation.',
  complete:'Complete roadmap to being fully disease-free and living vibrantly for 100+ years. All recovery phases and milestones. Longevity habits specific to pancreatic cancer prevention. How to prevent recurrence. Mental recovery and survivorship. Year 1, Year 2, Year 5 goals. Building your ideal healthy life.',
}

function HealTab({ uid, db, setDb, userEmail, aiLoading, setAiLoading }) {
  const [topic, setTopic] = useState(null); const [result, setResult] = useState(null)

  async function get(t) {
    setTopic(t)
    // INSTANT LOAD if cached
    if (db.recoveryGuides?.[t]) { setResult(db.recoveryGuides[t]); return }
    setAiLoading(true); setResult(null)
    try {
      const resp=await askJarvis([{role:'user',content:`For a pancreatic cancer patient in remission (distal pancreatectomy, liver ablation, chemo complete): ${HEAL_PROMPTS[t]} Be specific, practical, evidence-based. Connect to recovery goals.`}],'',userEmail)
      await saveGuide(uid,t,resp)
      setDb({...db,recoveryGuides:{...(db.recoveryGuides||{}),[t]:resp}})
      setResult(resp)
      // FIX #10: no auto-speak
    } catch(e){setResult('Error: '+e.message)}
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:9,marginBottom:16}}>
        {HEAL_TOPICS.map(t=>(
          <button key={t.id} className={`heal-btn${topic===t.id?' sel':''}`} style={{'--hc':t.color}} onClick={()=>get(t.id)}>
            <div style={{fontSize:22,marginBottom:7}}>{t.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:topic===t.id?t.color:'#374151',marginBottom:2}}>{t.label}</div>
            {db.recoveryGuides?.[t.id]&&<div style={{fontSize:9,fontWeight:700,color:'#10B981',marginTop:3}}>✓ Saved</div>}
          </button>
        ))}
      </div>
      {aiLoading&&<div className="card" style={{display:'flex',alignItems:'center',gap:10,color:'#64748B'}}><Spin/>Generating your personalized guide — please wait...</div>}
      {result&&topic&&(
        <div className="card fade-up" style={{borderTop:`3px solid ${HEAL_TOPICS.find(t=>t.id===topic)?.color||'#0EA5E9'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0,color:HEAL_TOPICS.find(t=>t.id===topic)?.color}}>{HEAL_TOPICS.find(t=>t.id===topic)?.label}</div>
            <button onClick={()=>speak(result,{max:480})} className="btn btn-ou btn-sm">🔊 Listen</button>
          </div>
          <div style={{fontSize:13,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result}</div>
        </div>
      )}
    </div>
  )
}

// ─── PROFILE TAB — FIX #4 (doctor name field works with TxtInput) ────────────
function ProfileTab({ uid, profile, setProfile, showToast }) {
  const [f, sf] = useState(profile); const [saving, setSaving] = useState(false)
  const set=(k,v)=>sf(p=>({...p,[k]:v}))
  async function save() {
    setSaving(true); await saveHealthProfile(uid,f); setProfile(f); showToast('Profile saved ✓'); setSaving(false)
  }
  return (
    <div className="fade-up">
      <div style={{padding:'13px 16px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:'#1D4ED8',marginBottom:3}}>Your JARVIS Memory</div>
        <div style={{fontSize:12,color:'#3730A3',lineHeight:1.6}}>Everything here is used by JARVIS in every conversation and analysis. Update after each oncologist visit.</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
        <div className="card">
          <div className="card-title">Current Health Status</div>
          <NumInput label="CA 19-9 current (U/mL)" value={f.ca199Current||''} onChange={v=>set('ca199Current',v)} placeholder="28" hint="Target ~6 · Normal <37 · Update after every blood test"/>
          <NumInput label="Current weight (kg)" value={f.weightCurrent||''} onChange={v=>set('weightCurrent',v)} placeholder="65.5"/>
          <NumInput label="Target weight (kg)" value={f.weightTarget||''} onChange={v=>set('weightTarget',v)} placeholder="70"/>
          <div className="fg"><label className="fl">Recovery Phase</label>
            <select className="fi" value={f.recoveryPhase||'1'} onChange={e=>set('recoveryPhase',e.target.value)}>
              <option value="1">Phase 1 — Weeks 1-6 (Gentle rebuild)</option>
              <option value="2">Phase 2 — Weeks 7-16 (Building strength)</option>
              <option value="3">Phase 3 — Month 4+ (Progressive)</option>
            </select>
          </div>
          <div className="fg"><label className="fl">Last PET-CT / scan date</label><input type="date" className="fi" value={f.lastScanDate||''} onChange={e=>set('lastScanDate',e.target.value)}/></div>
          <div className="fg"><label className="fl">Next oncologist appointment</label><input type="date" className="fi" value={f.nextAppt||''} onChange={e=>set('nextAppt',e.target.value)}/></div>
        </div>
        <div className="card">
          <div className="card-title">Medical History</div>
          <TxtInput label="Surgery details" value={f.surgeryDetails||''} onChange={v=>set('surgeryDetails',v)} placeholder="Distal pancreatectomy Jan 2024, splenectomy..." rows={2}/>
          <TxtInput label="Chemotherapy completed" value={f.chemoHistory||''} onChange={v=>set('chemoHistory',v)} placeholder="FOLFIRINOX 6 cycles, Gemcitabine 8 cycles..." rows={2}/>
          <TxtInput label="Other treatments (radiation, ablation)" value={f.otherTx||''} onChange={v=>set('otherTx',v)} placeholder="Liver microwave ablation x2, SBRT 5 fractions..." rows={2}/>
          <TxtInput label="Known drug allergies" value={f.allergies||''} onChange={v=>set('allergies',v)} placeholder="Penicillin, sulfa drugs..."/>
        </div>
        <div className="card">
          <div className="card-title">Goals & Doctor Info</div>
          <div className="fg"><label className="fl">Fertility goal</label>
            <select className="fi" value={f.fertilityGoal||''} onChange={e=>set('fertilityGoal',e.target.value)}>
              <option value="">Not a current focus</option>
              <option value="trying">Actively trying to conceive</option>
              <option value="future">Planning for future</option>
              <option value="monitoring">Monitoring sperm health</option>
            </select>
          </div>
          <TxtInput label="Personal recovery goals" value={f.goals||''} onChange={v=>set('goals',v)} placeholder="Weight gain to 72kg, hair full regrowth, return to work, run 5km..." rows={2}/>
          {/* FIX #4: TxtInput so doctor name can be typed */}
          <TxtInput label="Oncologist / Doctor name & hospital" value={f.doctorName||''} onChange={v=>set('doctorName',v)} placeholder="Dr. Sharma — Apollo Hospital Bengaluru"/>
          <TxtInput label="Doctor contact / next appointment notes" value={f.doctorContact||''} onChange={v=>set('doctorContact',v)} placeholder="+91 98765 43210 · Next appointment: April 15"/>
          <TxtInput label="Extra notes for JARVIS" value={f.extraNotes||''} onChange={v=>set('extraNotes',v)} placeholder="Anything JARVIS should know about your case, dietary preferences, concerns..." rows={3}/>
        </div>
      </div>
      <button className="btn btn-pr btn-full" onClick={save} disabled={saving} style={{marginTop:4,padding:'13px',fontSize:14}}>
        {saving?<><Spin size={16} color="white"/>Saving...</>:'💾 Save Profile'}
      </button>
    </div>
  )
}
// ─── MAIN APP — FIX #3 (data reflects) ──────────────────────────────────────

// ─── SUPERFOODS & SUPPLEMENTS TAB ─────────────────────────────────────────────
function SuperTab({ userEmail, aiLoading, setAiLoading }) {
  const [section, setSection] = useState('foods')
  const [expanded, setExpanded] = useState(null)
  const [suppExp, setSuppExp] = useState(null)
  const [aiQ, setAiQ] = useState('')
  const [aiA, setAiA] = useState('')

  async function askAbout(item, context) {
    if(aiLoading) return
    setAiLoading(true)
    setAiA('Asking JARVIS...')
    try {
      const resp = await askJarvis([{role:'user',content:`I am a pancreatic cancer patient in remission (distal pancreatectomy, liver ablation, chemo complete). Tell me specifically about ${item}: ${context}. Give me personalised, specific, evidence-based advice about dose, timing, interactions, and why it matters for MY situation. Be the expert oncology nutritionist I need.`}],'',userEmail)
      setAiA(resp)
    } catch(e){setAiA('Error: '+e.message)}
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div style={{padding:'14px 18px',background:'linear-gradient(135deg,#ECFDF5,#EFF6FF)',border:'1px solid #A7F3D0',borderRadius:14,marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:800,color:'#065F46',marginBottom:3}}>🌱 Your Complete Healing Arsenal</div>
        <div style={{fontSize:12,color:'#047857',lineHeight:1.6}}>Every food and supplement here is chosen specifically for pancreatic cancer recovery. Built into the app — instant, always available, no internet needed for the reference. Tap "Ask JARVIS" for AI-personalized deep-dive on anything.</div>
      </div>
      <div className="tabs">
        <button className={`tab${section==='foods'?' on':''}`} onClick={()=>setSection('foods')}>🥦 Superfoods ({SUPERFOODS.length})</button>
        <button className={`tab${section==='supps'?' on':''}`} onClick={()=>setSection('supps')}>💊 Supplement Schedule</button>
        <button className={`tab${section==='avoid'?' on':''}`} onClick={()=>setSection('avoid')}>❌ Foods to Avoid</button>
      </div>

      {section==='foods' && (
        <>
          <div style={{padding:'9px 13px',background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:9,marginBottom:12,fontSize:12,color:'#059669',fontWeight:600}}>
            🏆 MUST HAVE = Daily non-negotiable · HIGH = 3-4x/week · Tap any food for full details + Ask JARVIS for AI personalisation
          </div>
          {SUPERFOODS.map((f,i)=>{
            const isOpen=expanded===i
            return (
              <div key={i} style={{background:'white',border:`1.5px solid ${isOpen?f.color+'40':'#E8EEF4'}`,borderRadius:12,marginBottom:8,overflow:'hidden',boxShadow:'0 1px 4px rgba(15,23,42,0.05)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer'}} onClick={()=>setExpanded(isOpen?null:i)}>
                  <span style={{fontSize:24,flexShrink:0}}>{f.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>{f.name}</div>
                    <div style={{fontSize:11,color:'#94A3B8',marginTop:1}}>{f.dose}</div>
                  </div>
                  <span style={{padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:f.tag==='MUST HAVE'?'#F0FDF4':'#EFF6FF',color:f.tag==='MUST HAVE'?'#059669':'#0EA5E9',border:`1px solid ${f.tag==='MUST HAVE'?'#BBF7D0':'#BFDBFE'}`,flexShrink:0}}>{f.tag}</span>
                  <span style={{color:'#94A3B8',fontSize:11,flexShrink:0,marginLeft:4}}>{isOpen?'▲':'▼'}</span>
                </div>
                {isOpen && (
                  <div style={{padding:'0 16px 14px',borderTop:`1px solid ${f.color}20`}}>
                    <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:160,padding:'9px 11px',background:'#F8FAFC',borderRadius:8}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#94A3B8',marginBottom:3}}>DOSE & TIMING</div>
                        <div style={{fontSize:12,color:'#374151',fontWeight:600}}>{f.dose}</div>
                        <div style={{fontSize:11,color:'#64748B',marginTop:2}}>{f.timing}</div>
                      </div>
                    </div>
                    <div style={{marginBottom:9}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#94A3B8',marginBottom:4,textTransform:'uppercase'}}>Why it matters for you</div>
                      <div style={{fontSize:12,color:'#374151',lineHeight:1.65}}>{f.why}</div>
                    </div>
                    <div style={{padding:'9px 12px',background:'#F0F9FF',borderRadius:8,border:'1px solid #BAE6FD',marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#0369A1',marginBottom:3}}>🔬 SCIENCE</div>
                      <div style={{fontSize:11,color:'#0C4A6E',lineHeight:1.6}}>{f.science}</div>
                    </div>
                    <div style={{padding:'9px 12px',background:'#FFFBEB',borderRadius:8,border:'1px solid #FDE68A',marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#92400E',marginBottom:3}}>HOW TO USE</div>
                      <div style={{fontSize:11,color:'#78350F',lineHeight:1.65}}>{f.how}</div>
                    </div>
                    {f.avoid && (
                      <div style={{padding:'9px 12px',background:'#FEF2F2',borderRadius:8,border:'1px solid #FECACA',marginBottom:10,fontSize:11,color:'#DC2626'}}>⚠ {f.avoid}</div>
                    )}
                    <button onClick={()=>askAbout(f.name,`Dose: ${f.dose}. Timing: ${f.timing}. I want to know more about optimal usage, interactions with my medicines, and how to maximise benefit.`)} disabled={aiLoading} className="btn btn-ou btn-sm" style={{width:'100%'}}>
                      {aiLoading?<><Spin size={13}/>Asking JARVIS...</>:`🤖 Ask JARVIS — Is ${f.name.split(' ')[0]} right for me?`}
                    </button>
                    {aiA && <div style={{marginTop:10,padding:'12px',background:'#F8FAFC',borderRadius:9,border:'1px solid #E2E8F0',fontSize:12,color:'#374151',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{aiA}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {section==='supps' && (
        <>
          <div style={{padding:'9px 13px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:9,marginBottom:12,fontSize:12,color:'#92400E'}}>
            ⚠ Always confirm new supplements with your oncologist. Introduce ONE at a time every 5-7 days. Tap any supplement for full details.
          </div>
          {SUPPLEMENT_STACK.map((slot,si)=>(
            <div key={si} className="card" style={{borderTop:`3px solid ${slot.color}`}}>
              <div style={{fontSize:14,fontWeight:700,color:'#0F172A',marginBottom:12}}>{slot.time}</div>
              {slot.items.map((item,ii)=>{
                const key=`${si}-${ii}`; const isOpen=suppExp===key
                return (
                  <div key={ii} style={{marginBottom:7,border:`1px solid ${isOpen?slot.color+'40':'#F1F5F9'}`,borderRadius:9,overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 13px',cursor:'pointer',background:isOpen?`${slot.color}05`:'white'}} onClick={()=>setSuppExp(isOpen?null:key)}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{item.name}</div>
                        <div style={{fontSize:11,color:slot.color,fontWeight:600,marginTop:1}}>{item.dose}</div>
                      </div>
                      <span style={{color:'#94A3B8',fontSize:11}}>{isOpen?'▲':'▼'}</span>
                    </div>
                    {isOpen && (
                      <div style={{padding:'8px 13px 12px',borderTop:`1px solid ${slot.color}20`}}>
                        <div style={{fontSize:12,color:'#374151',lineHeight:1.65,marginBottom:7}}>{item.why}</div>
                        <div style={{padding:'8px 10px',background:'#F8FAFC',borderRadius:7,fontSize:11,color:'#64748B',marginBottom:9}}>📌 {item.note}</div>
                        <button onClick={()=>askAbout(item.name,`Dose: ${item.dose}. I want to know about interactions with other supplements I take, optimal timing, and what results I should expect.`)} disabled={aiLoading} className="btn btn-ou btn-sm" style={{width:'100%'}}>
                          {aiLoading?<><Spin size={13}/>...</>:`🤖 Ask JARVIS about ${item.name.split(' ')[0]}`}
                        </button>
                        {aiA && <div style={{marginTop:8,padding:'10px',background:'#F8FAFC',borderRadius:8,fontSize:11,color:'#374151',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{aiA}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {section==='avoid' && (
        <div className="card" style={{borderTop:'3px solid #EF4444'}}>
          <div className="card-title" style={{color:'#DC2626'}}>❌ Foods That Work Against Your Recovery</div>
          <div style={{fontSize:12,color:'#64748B',marginBottom:14}}>These are not opinions. These are evidence-based factors that drive CA 19-9 elevation, cancer recurrence, and chronic disease. Avoid them permanently.</div>
          {[
            {food:'Refined Sugar (all forms)',reason:'Cancer cells consume glucose 10x faster than healthy cells. Every sugar spike creates an insulin surge → IGF-1 surge → direct cancer cell proliferation signal. This includes jaggery in excess, honey in excess, and fruit juice.'},
            {food:'Alcohol — Zero Tolerance',reason:'Your liver underwent radiation AND ablation. Alcohol is directly hepatotoxic even at one drink. It undoes weeks of liver repair, interferes with melatonin, and is a Group 1 carcinogen. This is permanent, not temporary.'},
            {food:'Fried and Deep-fried Food',reason:'Trans fats and oxidised seed oils directly increase systemic inflammation — the same inflammatory cascade that elevates CA 19-9. Also extremely difficult to digest after pancreatectomy even with PERT.'},
            {food:'Packaged Juices and Cold Drinks',reason:'8-10 teaspoons of sugar per serving. Immediate blood glucose spike. Cold temperature slows digestive enzyme activity. No fiber. No nutrients. Pure cancer fuel.'},
            {food:'Red Meat (beef, pork)',reason:'Heme iron in red meat promotes oxidative stress and inflammation. Studies consistently link red meat to increased pancreatic cancer recurrence risk. Poultry and fish are completely safe alternatives.'},
            {food:'Raw Salads in Large Portions',reason:'After distal pancreatectomy, raw fiber is very hard to process and causes bloating, gas, and poor nutrient absorption. All vegetables must be soft-cooked. Exceptions: small amounts of cucumber or tomato are fine.'},
            {food:'Maida / White Flour Products',reason:'Glycemic index of 100+ (higher than sugar). Gut-lining damaging. Zero nutritional value. Creates insulin spikes that directly stimulate residual pancreatic tissue inflammation and CA 19-9 production.'},
            {food:'NSAIDs (Ibuprofen, Aspirin)',reason:'Damage the gut lining directly — the same gut lining damaged by chemotherapy and currently healing. If you need pain relief, use paracetamol at minimum effective dose and consult your doctor.'},
          ].map((a,i)=>(
            <div key={i} style={{display:'flex',gap:11,padding:'11px 0',borderBottom:'1px solid #FEE2E2'}}>
              <span style={{color:'#EF4444',fontWeight:700,flexShrink:0,fontSize:16,marginTop:2}}>✕</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#DC2626',marginBottom:2}}>{a.food}</div>
                <div style={{fontSize:12,color:'#7F1D1D',lineHeight:1.6}}>{a.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DAILY ROUTINE + PLANS TAB ─────────────────────────────────────────────────
function RoutineTab({ userEmail, aiLoading, setAiLoading }) {
  const [view, setView] = useState('schedule')
  const [openSlot, setOpenSlot] = useState(null)
  const [yogaExp, setYogaExp] = useState(null)
  const [gymPhase, setGymPhase] = useState(0)
  const [gymExp, setGymExp] = useState(null)
  const [aiAsk, setAiAsk] = useState('')
  const [aiResp, setAiResp] = useState('')

  async function askRoutineAI(q) {
    if(aiLoading||!q.trim()) return
    setAiLoading(true); setAiResp('Thinking...')
    try {
      const resp = await askJarvis([{role:'user',content:`I am a pancreatic cancer patient in remission (distal pancreatectomy + liver ablation + chemo complete). Question about my daily routine or health plan: ${q}. Give me a specific, personalised, evidence-based answer that connects to my cancer recovery goals.`}],'',userEmail)
      setAiResp(resp)
    } catch(e){setAiResp('Error: '+e.message)}
    setAiLoading(false)
  }

  return (
    <div className="fade-up">
      <div className="tabs">
        <button className={`tab${view==='schedule'?' on':''}`} onClick={()=>setView('schedule')}>📅 Daily Schedule</button>
        <button className={`tab${view==='yoga'?' on':''}`} onClick={()=>setView('yoga')}>🧘 Yoga Sequence</button>
        <button className={`tab${view==='gym'?' on':''}`} onClick={()=>setView('gym')}>💪 Gym Plans</button>
        <button className={`tab${view==='disease'?' on':''}`} onClick={()=>setView('disease')}>🛡️ Disease Prevention</button>
      </div>

      {/* ── AI Ask Bar ── */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input className="fi" placeholder="Ask JARVIS: Can I do yoga after dinner? What to eat after gym?..." value={aiAsk} onChange={e=>setAiAsk(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')askRoutineAI(aiAsk)}} style={{flex:1}}/>
        <button className="btn btn-pr" onClick={()=>askRoutineAI(aiAsk)} disabled={!aiAsk.trim()||aiLoading} style={{flexShrink:0,padding:'10px 14px'}}>Ask</button>
      </div>
      {aiResp && <div style={{padding:'12px 14px',background:'white',border:'1px solid #BFDBFE',borderRadius:10,marginBottom:14,fontSize:13,color:'#374151',lineHeight:1.75,whiteSpace:'pre-wrap'}}><span style={{fontSize:10,fontWeight:700,color:'#0EA5E9',display:'block',marginBottom:4}}>JARVIS</span>{aiResp}<button onClick={()=>speak(aiResp,{max:400})} style={{display:'block',marginTop:8,padding:'4px 10px',borderRadius:6,border:'1px solid #E2E8F0',background:'white',color:'#64748B',fontSize:11,cursor:'pointer'}}>🔊 Listen</button></div>}

      {/* ── SCHEDULE ── */}
      {view==='schedule' && (
        <>
          <div style={{padding:'10px 14px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,marginBottom:14,fontSize:12,color:'#1D4ED8'}}>
            Your complete daily recovery protocol from waking to sleep. Follow this 80% consistently and your body heals. Tap any block for the science behind it.
          </div>
          {DAILY_SCHEDULE.map((slot,i)=>{
            const isOpen=openSlot===i
            return (
              <div key={i} style={{display:'flex',gap:12,marginBottom:8}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:50,flexShrink:0}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#64748B',textAlign:'center',lineHeight:1.3}}>{slot.time}</div>
                  <div style={{width:2,flex:1,background:`${slot.color}25`,margin:'4px 0',minHeight:24}}/>
                </div>
                <div style={{flex:1,background:'white',border:`1px solid ${isOpen?slot.color+'40':'#E8EEF4'}`,borderRadius:12,cursor:'pointer',overflow:'hidden',boxShadow:'0 1px 3px rgba(15,23,42,0.04)',marginBottom:2}} onClick={()=>setOpenSlot(isOpen?null:i)}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px'}}>
                    <span style={{fontSize:19}}>{slot.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>{slot.label}</div>
                    </div>
                    <span style={{color:'#94A3B8',fontSize:11,flexShrink:0}}>{isOpen?'▲':'▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{padding:'0 14px 12px',borderTop:`1px solid ${slot.color}15`}}>
                      <div style={{fontSize:13,color:'#374151',lineHeight:1.75,marginBottom:8}}>{slot.details}</div>
                      <div style={{padding:'9px 12px',background:`${slot.color}07`,borderRadius:8,border:`1px solid ${slot.color}18`,fontSize:11,color:'#374151',lineHeight:1.65}}>
                        🔬 <strong>Why:</strong> {slot.why}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── YOGA ── */}
      {view==='yoga' && (
        <>
          <div style={{padding:'10px 14px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#92400E',marginBottom:2}}>Complete Daily Practice — {YOGA_SEQUENCE.reduce((s,y)=>s+y.mins,0)} Minutes</div>
            <div style={{fontSize:12,color:'#78350F'}}>Follow in this exact order every day. Static reference — no internet needed. Tap each practice for full instructions and science.</div>
          </div>
          {YOGA_SEQUENCE.map((y,i)=>{
            const isOpen=yogaExp===i
            const tC=y.type==='Pranayama'?'#0EA5E9':y.type==='Asana'?'#F59E0B':'#8B5CF6'
            return (
              <div key={i} style={{background:'white',border:`1.5px solid ${isOpen?y.color+'40':'#E8EEF4'}`,borderRadius:12,marginBottom:8,overflow:'hidden',boxShadow:'0 1px 4px rgba(15,23,42,0.05)'}}>
                <div style={{display:'flex',alignItems:'center',gap:11,padding:'12px 16px',cursor:'pointer'}} onClick={()=>setYogaExp(isOpen?null:i)}>
                  <div style={{width:36,height:36,borderRadius:9,background:`${y.color}12`,border:`1px solid ${y.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{y.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>Step {y.step}: {y.name}</div>
                    <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,fontWeight:600,color:tC,background:`${tC}10`,padding:'1px 7px',borderRadius:4}}>{y.type}</span>
                      <span style={{fontSize:11,color:'#94A3B8'}}>⏱ {y.mins} min</span>
                    </div>
                  </div>
                  <span style={{color:'#94A3B8',fontSize:11}}>{isOpen?'▲':'▼'}</span>
                </div>
                {isOpen && (
                  <div style={{padding:'0 16px 14px',borderTop:`1px solid ${y.color}20`}}>
                    <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>📍 {y.when}</div>
                    <div style={{marginBottom:9}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',marginBottom:4}}>How to do it</div>
                      <div style={{fontSize:13,color:'#374151',lineHeight:1.8}}>{y.how}</div>
                    </div>
                    <div style={{padding:'9px 12px',background:`${y.color}07`,borderRadius:8,border:`1px solid ${y.color}18`,marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:y.color,marginBottom:3,textTransform:'uppercase'}}>Benefits for You</div>
                      <div style={{fontSize:12,color:'#374151',lineHeight:1.65}}>{y.benefit}</div>
                    </div>
                    <div style={{padding:'9px 12px',background:'#F0F9FF',borderRadius:8,border:'1px solid #BAE6FD',marginBottom:y.caution?8:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#0369A1',marginBottom:3,textTransform:'uppercase'}}>🔬 Science</div>
                      <div style={{fontSize:11,color:'#0C4A6E',lineHeight:1.65}}>{y.science}</div>
                    </div>
                    {y.caution && <div style={{padding:'9px 12px',background:'#FEF2F2',borderRadius:8,border:'1px solid #FECACA',fontSize:11,color:'#DC2626'}}>⚠ {y.caution}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ── GYM ── */}
      {view==='gym' && (
        <>
          <div style={{padding:'10px 14px',background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,marginBottom:14,fontSize:12,color:'#6D28D9'}}>
            💡 Every 1% muscle gain = 4% lower cancer mortality. Phase-based progression — from gentle to powerful. Select your current phase.
          </div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {GYM_PHASES.map((p,i)=>(
              <button key={i} onClick={()=>setGymPhase(i)} style={{flex:1,padding:'10px 6px',borderRadius:10,border:`1.5px solid ${gymPhase===i?p.color:'#E2E8F0'}`,background:gymPhase===i?`${p.color}0E`:'white',color:gymPhase===i?p.color:'#64748B',fontSize:11,fontWeight:600,cursor:'pointer',lineHeight:1.5}}>
                Phase {p.phase}<br/><span style={{fontWeight:400,fontSize:10}}>{p.weeks}</span>
              </button>
            ))}
          </div>
          {(() => {
            const ph=GYM_PHASES[gymPhase]
            return (
              <>
                <div className="card" style={{borderTop:`3px solid ${ph.color}`}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#0F172A',marginBottom:2}}>{ph.label}</div>
                  <div style={{fontSize:12,color:'#64748B',marginBottom:10}}>{ph.goal}</div>
                  <div style={{padding:'9px 12px',background:`${ph.color}08`,borderRadius:9,border:`1px solid ${ph.color}20`,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:ph.color,marginBottom:3}}>🚶 CARDIO</div>
                    <div style={{fontSize:12,color:'#374151',lineHeight:1.65}}>{ph.cardio}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:0.4,marginBottom:8}}>STRENGTH — {ph.strength}</div>
                  {ph.exercises.map((ex,ei)=>{
                    const key=`g${gymPhase}-${ei}`; const isOpen=gymExp===key
                    return (
                      <div key={ei} style={{border:`1px solid ${isOpen?ph.color+'40':'#F1F5F9'}`,borderRadius:9,marginBottom:6,overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer',background:isOpen?`${ph.color}05`:'white'}} onClick={()=>setGymExp(isOpen?null:key)}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{ex.name}</div>
                            <div style={{display:'flex',gap:10,marginTop:2}}>
                              <span style={{fontSize:11,color:ph.color,fontWeight:600}}>{ex.sets} sets × {ex.reps}</span>
                              <span style={{fontSize:11,color:'#94A3B8'}}>Rest {ex.rest}</span>
                            </div>
                          </div>
                          <span style={{color:'#94A3B8',fontSize:11}}>{isOpen?'▲':'ℹ'}</span>
                        </div>
                        {isOpen && <div style={{padding:'8px 12px 12px',borderTop:`1px solid ${ph.color}20`,background:`${ph.color}04`,fontSize:12,color:'#374151',lineHeight:1.65}}>{ex.note}</div>}
                      </div>
                    )
                  })}
                </div>
                <div className="card" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#059669',marginBottom:5}}>⚡ Post-Workout — Within 30 Minutes (mandatory)</div>
                  <div style={{fontSize:13,color:'#374151',lineHeight:1.65}}>{ph.postWorkout}</div>
                </div>
                <div className="card" style={{background:'#FEF2F2',borderTop:'2px solid #EF4444'}}>
                  <div className="card-title" style={{color:'#DC2626'}}>⚠ Safety Rules</div>
                  <div style={{fontSize:12,color:'#374151',lineHeight:1.7,marginBottom:8}}>{ph.caution}</div>
                  {['Never exercise on empty stomach','Stop: sharp abdominal pain / chest tightness / dizziness','Drink water before, during, after every session','Tired day = walk + pranayama only. This IS training.'].map((r,ri)=>(
                    <div key={ri} style={{display:'flex',gap:8,marginBottom:5}}>
                      <span style={{color:'#EF4444',flexShrink:0,fontWeight:700}}>•</span>
                      <span style={{fontSize:12,color:'#374151'}}>{r}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </>
      )}

      {/* ── DISEASE PREVENTION ── */}
      {view==='disease' && (
        <>
          <div style={{padding:'12px 16px',background:'linear-gradient(135deg,#ECFDF5,#EFF6FF)',border:'1px solid #A7F3D0',borderRadius:12,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:'#065F46',marginBottom:4}}>🛡️ Your Cancer-Proof Life Protocol</div>
            <div style={{fontSize:12,color:'#047857',lineHeight:1.65}}>Following this recovery protocol doesn't just beat pancreatic cancer — it makes you biologically resistant to every major chronic disease. Here's exactly how each condition is prevented by what you're already doing.</div>
          </div>
          {[
            { disease:'Type 2 Diabetes', risk:'High (pancreatectomy affects insulin production)', color:'#0EA5E9',
              prevention:[
                'Berberine 500mg with every meal = blood sugar control equal to Metformin in clinical trials',
                'Walking after every meal blunts glucose spike by 40-50%',
                'Low glycemic diet (no refined sugar, no white flour, small portions of carbs)',
                'Cinnamon ½ tsp daily sensitises insulin receptors',
                'Target: fasting glucose 80-90 mg/dL, HbA1c <5.5%',
              ]},
            { disease:'Cancer Recurrence', risk:'Actively being prevented', color:'#EF4444',
              prevention:[
                'Sulforaphane (broccoli) kills pancreatic cancer STEM cells — the chemo-resistant ones',
                'Anulom Vilom 10 min daily = NK cell activity +30% (your cancer surveillance system)',
                'No refined sugar = no insulin spike = no IGF-1 = no tumour growth signal',
                'Melatonin 10-20mg nightly = direct anti-tumour compound + DNA repair',
                'Quercetin + Berberine = mTOR inhibition (cancer growth pathway suppressed)',
                'Modified Citrus Pectin = blocks galectin-3 (metastasis protein) daily',
              ]},
            { disease:'Heart Disease', risk:'Low (with this protocol)', color:'#EF4444',
              prevention:[
                'Omega-3 2-3g daily = most evidence-backed cardiovascular supplement (50+ RCTs)',
                'Walnuts 5-7 daily = reduces LDL cholesterol by 5-10%',
                'Walking 8000 steps/day = 40% reduction in cardiovascular events',
                'No fried food, no trans fats, no seed oils',
                'Turmeric + black pepper daily = arterial anti-inflammatory',
                'Magnesium glycinate 400mg = blood pressure normalisation',
              ]},
            { disease:'High Blood Pressure', risk:'Low (with this protocol)', color:'#F59E0B',
              prevention:[
                'Beetroot 3-4x/week = nitric oxide → arterial relaxation (proven)',
                'Ashwagandha KSM-66 reduces cortisol by 27% → lower BP',
                'Yoga + pranayama = sympathetic nervous system down-regulation',
                'Potassium-rich foods: banana, sweet potato, curd',
                'Magnesium glycinate directly relaxes vascular smooth muscle',
                'Deep breathing (4-7-8) activates vagus → immediate BP reduction',
              ]},
            { disease:'Osteoporosis', risk:'Medium (steroids + chemo affect bones)', color:'#8B5CF6',
              prevention:[
                'Vitamin D3 5000 IU + K2 200mcg = the exact combination for bone mineralisation',
                'Weight-bearing exercise (squats, lunges) = osteoblast activation',
                'Curd and Greek yogurt = calcium + phosphorus + Vitamin K2',
                'Sun exposure 20 min daily = free Vitamin D3 synthesis',
                'Magnesium: calcium cannot enter bones without adequate magnesium',
              ]},
            { disease:'Alzheimer\'s / Dementia', risk:'Low (with this protocol)', color:'#10B981',
              prevention:[
                'Omega-3 DHA = most important structural component of brain cell membranes',
                'Walnuts contain BDNF precursors — the brain growth hormone',
                'Exercise (8000 steps + gym) = hippocampal neurogenesis every time',
                'Curcumin in turmeric clears amyloid plaques (the Alzheimer\'s protein)',
                'Quality sleep 7.5h = brain glymphatic system flushes tau protein nightly',
                'Chemo-brain reverses completely within 6-12 months with this protocol',
              ]},
          ].map((d,di)=>(
            <div key={di} className="card" style={{borderLeft:`4px solid ${d.color}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div style={{fontSize:15,fontWeight:800,color:'#0F172A'}}>{d.disease}</div>
                <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:`${d.color}10`,color:d.color,border:`1px solid ${d.color}25`,flexShrink:0,marginLeft:8}}>{d.risk}</span>
              </div>
              {d.prevention.map((p,pi)=>(
                <div key={pi} style={{display:'flex',gap:9,marginBottom:7}}>
                  <span style={{color:d.color,flexShrink:0,fontWeight:700,marginTop:1}}>✓</span>
                  <span style={{fontSize:12,color:'#374151',lineHeight:1.6}}>{p}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
export default function JarvisHealth({ user, onLogout }) {
  const uid=user.uid; const userEmail=user.email
  const [tab, setTab] = useState('home')
  const [db, setDb] = useState({})
  const [allLogs, setAllLogs] = useState([])
  const [profile, setProfile] = useState({})
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [listening, setListening] = useState(false)
  const [visited, setVisited] = useState(new Set(['home']))
  const [moreOpen, setMoreOpen] = useState(false)
  const recRef = useRef(null)

  useEffect(()=>{
    async function load() {
      const today = new Date().toISOString().slice(0,10)
      const [food,blood,guides,plans,,intols,daily,meds,medlog,prof] = await Promise.all([
        getFoodLogs(uid),getBloodReports(uid),getGuides(uid),getPlans(uid),
        getChat(uid),getIntolerances(uid),getDailyLog(uid,today),
        getMedicines(uid),getMedLog(uid,today),getHealthProfile(uid)
      ])
      const logPs=[]
      for(let i=1;i<=30;i++){
        const d=new Date(); d.setDate(d.getDate()-i)
        const ds=d.toISOString().slice(0,10)
        logPs.push(getDailyLog(uid,ds).then(l=>l&&Object.keys(l).length>3?{...l,date:ds}:null))
      }
      const pastLogs=(await Promise.all(logPs)).filter(Boolean)
      const todayLog=daily&&Object.keys(daily).length>3?{...daily,date:today}:null
      setAllLogs(todayLog?[todayLog,...pastLogs]:pastLogs)
      setDb({foodLogs:food,bloodReports:blood,recoveryGuides:guides,fitnessPlans:plans,
             intolerances:intols,todayChecks:daily?.checks||{},todayLog,medicines:meds,
             medLog:{...medlog,date:today}})
      setProfile(prof||{})
      setReady(true)
    }
    load().catch(e=>{console.error(e);setReady(true)})
  },[uid])

  useEffect(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SR) return
    const rec=new SR()
    rec.continuous=false; rec.interimResults=false; rec.lang='en-IN'
    rec.onresult=e=>{
      const text=e.results[0][0].transcript.toLowerCase().trim()
      setVoiceText(text); setTimeout(()=>setVoiceText(''),5000)
      const MAP={'log today':'log','daily log':'log','food':'food','scan food':'food','blood':'blood','lab':'blood','medicines':'meds','progress':'track','track':'track','fitness':'fit','yoga':'fit','recovery':'heal','profile':'prof','jarvis':'ai','chat':'ai','home':'home','dashboard':'home'}
      for(const[p,t] of Object.entries(MAP)){if(text.includes(p)){handleTab(t);return}}
      handleTab('ai')
    }
    rec.onend=()=>setListening(false)
    rec.onerror=()=>setListening(false)
    recRef.current=rec
  },[])

  function handleTab(t){
    setTab(t)
    setVisited(v=>new Set([...v,t]))
  }

  function toggleVoice(){
    unlockSpeech()
    if(!recRef.current) return
    if(listening){try{recRef.current.stop()}catch{}setListening(false)}
    else{try{recRef.current.start();setListening(true)}catch{}}
  }

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(''),3000)}

  // FIX #3: dbUpdate handles direct objects properly — all children pass direct objects now
  function dbUpdate(newDb) {
    setDb(newDb)
    // Update allLogs when todayLog changes
    if (newDb.todayLog) {
      const today = new Date().toISOString().slice(0,10)
      const logWithDate = {...newDb.todayLog, date:today}
      const sc = scorePillars(newDb.todayLog, newDb.medLog)
      const logWithScore = {...logWithDate, ...sc}
      setAllLogs(prev=>[logWithScore,...prev.filter(l=>l.date!==today)])
    }
  }

  const shared={uid,db,setDb:dbUpdate,userEmail,aiLoading,setAiLoading,showToast,profile}
  const todaySc=scorePillars(db.todayLog,db.medLog)
  const hasNoLog=!db.todayLog

  const PAGE_TITLES={home:'Dashboard',log:'Daily Log',track:'Progress',food:'Food Tracker',meds:'Medicines',blood:'Lab Reports',fit:'Yoga & Gym',heal:'Recovery Guides',ai:'JARVIS AI Coach',prof:'My Profile',super:'Superfoods & Supplements',plan:'Daily Routine & Plans'}

  if(!ready) return (
    <div style={{minHeight:'100vh',background:'#EEF2F7',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
      <style>{CSS}</style>
      <div style={{width:26,height:26,border:'3px solid #BFDBFE',borderTop:'3px solid #0EA5E9',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <span style={{fontSize:14,color:'#64748B',fontWeight:500}}>Loading your health data...</span>
    </div>
  )

  return (
    <div className="shell">
      <style>{CSS}</style>
      {toast&&<div className="toast">{toast}</div>}

      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-icon">🌱</div>
            <div><div className="sb-name">Badal Health Care</div><div className="sb-sub">Cancer Recovery AI</div></div>
          </div>
          <div className="sb-status"><div className="sb-dot pulse"/><span>Remission Active</span></div>
        </div>
        {NAV.map((item,i)=>item.s
          ?<div key={i} className="sec-lbl">{item.s}</div>
          :(<a key={item.id} className={`nav-item${tab===item.id?' active':''}`} href="#" onClick={e=>{e.preventDefault();handleTab(item.id)}}>
            {item.icon}<span>{item.label}</span>
            {item.badge&&hasNoLog&&<span className="nav-badge"/>}
          </a>)
        )}
        <div className="sb-footer">
          <div className="sb-ca199">
            <div className="sb-ca199-lbl">CA 19-9 GOAL</div>
            <div className="sb-ca199-val">~6 <span style={{fontSize:12,fontWeight:500}}>U/mL</span></div>
            {profile.ca199Current&&<div style={{fontSize:11,color:'#3B82F6',marginTop:2}}>Current: {profile.ca199Current}</div>}
          </div>
          <button className="btn btn-ou btn-sm btn-full" onClick={onLogout}>Sign Out</button>
        </div>
      </nav>

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <button className={`voice-btn${listening?' active':''}`} onClick={toggleVoice} title={listening?'Stop':'Speak'}>
            {listening&&<div className="voice-rip"/>}
            {listening?'🎙️':'🎤'}
          </button>
          <div style={{flex:1,fontSize:12,color:'#94A3B8',overflow:'hidden'}}>
            {listening?<span style={{color:'#0EA5E9',fontWeight:600}}>● Listening...</span>
              :voiceText?<span style={{color:'#374151'}}>"{voiceText}"</span>
              :'Tap mic · "log today" · "superfoods" · "daily routine"'}
          </div>
          <button onClick={stopSpeaking} style={{padding:'6px 10px',borderRadius:7,border:'1px solid #E2E8F0',background:'white',color:'#64748B',fontSize:13,cursor:'pointer',flexShrink:0}}>⏹</button>
          {db.todayLog
            ?<div style={{fontSize:14,fontWeight:800,color:scoreColor(todaySc.overall),flexShrink:0}}>{todaySc.overall}<span style={{fontSize:10,fontWeight:500,color:'#94A3B8'}}>/100</span></div>
            :<button className="btn btn-pr btn-sm" onClick={()=>handleTab('log')} style={{flexShrink:0}}>Log Today</button>
          }
        </div>

        <div className="page">
          <div style={{marginBottom:18}}>
            <h1 style={{fontSize:22,fontWeight:800,color:'#0F172A',letterSpacing:'-0.4px'}}>{PAGE_TITLES[tab]||tab}</h1>
          </div>

          <div style={{display:tab==='home'?'block':'none'}}>
            <Dashboard {...shared} setTab={handleTab} allLogs={allLogs}/>
          </div>
          {visited.has('log')   &&<div style={{display:tab==='log'?'block':'none'}}><LogTab {...shared}/></div>}
          {visited.has('track') &&<div style={{display:tab==='track'?'block':'none'}}><TrackTab allLogs={allLogs}/></div>}
          {visited.has('food')  &&<div style={{display:tab==='food'?'block':'none'}}><FoodTab {...shared}/></div>}
          {visited.has('meds')  &&<div style={{display:tab==='meds'?'block':'none'}}><MedTab {...shared}/></div>}
          {visited.has('blood') &&<div style={{display:tab==='blood'?'block':'none'}}><BloodTab {...shared}/></div>}
          {visited.has('fit')   &&<div style={{display:tab==='fit'?'block':'none'}}><FitTab {...shared}/></div>}
          {visited.has('heal')  &&<div style={{display:tab==='heal'?'block':'none'}}><HealTab {...shared}/></div>}
          {visited.has('ai')    &&<div style={{display:tab==='ai'?'block':'none'}}><AICoach uid={uid} db={db} userEmail={userEmail} aiLoading={aiLoading} setAiLoading={setAiLoading} profile={profile}/></div>}
          {visited.has('prof')  &&<div style={{display:tab==='prof'?'block':'none'}}><ProfileTab uid={uid} profile={profile} setProfile={setProfile} showToast={showToast}/></div>}
          {visited.has('super') &&<div style={{display:tab==='super'?'block':'none'}}><SuperTab userEmail={userEmail} aiLoading={aiLoading} setAiLoading={setAiLoading}/></div>}
          {visited.has('plan')  &&<div style={{display:tab==='plan'?'block':'none'}}><RoutineTab userEmail={userEmail} aiLoading={aiLoading} setAiLoading={setAiLoading}/></div>}
        </div>
      </div>

      {/* MOBILE MORE DRAWER */}
      {moreOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}
          onClick={()=>setMoreOpen(false)}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,0.5)'}}/>
          <div style={{position:'relative',background:'white',borderRadius:'20px 20px 0 0',
            padding:'16px 16px 36px',boxShadow:'0 -4px 32px rgba(0,0,0,0.12)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 16px'}}/>
            <div style={{fontSize:11,fontWeight:700,color:'#94A3B8',letterSpacing:0.8,
              textTransform:'uppercase',marginBottom:12}}>All Sections</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {MOB_MORE.map(t=>(
                <button key={t.id} onClick={()=>{handleTab(t.id);setMoreOpen(false)}} style={{
                  padding:'12px 6px',borderRadius:12,cursor:'pointer',
                  border:`1.5px solid ${tab===t.id?'#0EA5E9':'#E2E8F0'}`,
                  background:tab===t.id?'#EFF6FF':'#FAFAFA',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                  WebkitTapHighlightColor:'transparent'}}>
                  <span style={{color:tab===t.id?'#0EA5E9':'#64748B'}}>{t.icon}</span>
                  <span style={{fontSize:10,fontWeight:600,
                    color:tab===t.id?'#0EA5E9':'#64748B',textAlign:'center',lineHeight:1.3}}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="mob-nav">
        {MOB.map(t=>t.id==='__more'?(
          <button key="more" className="mob-ni" onClick={()=>setMoreOpen(true)}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}>
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
            <span>More</span>
          </button>
        ):(
          <button key={t.id} className={`mob-ni${tab===t.id?' on':''}`}
            onClick={()=>handleTab(t.id)} style={{position:'relative'}}>
            {t.icon}<span>{t.label}</span>
            {t.badge&&hasNoLog&&<span className="mob-badge"/>}
          </button>
        ))}
      </nav>
    </div>
  )
}
