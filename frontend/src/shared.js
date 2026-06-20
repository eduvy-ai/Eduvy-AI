// ─────────────────────────────────────────────────────────────
// shared.js — all constants, AI config, and callAI live here.
// Import from this file to avoid circular deps (App ↔ SettingsModal).
// ─────────────────────────────────────────────────────────────

// Import i18n UI_STRINGS (comprehensive translations)
import { UI_STRINGS as I18N_STRINGS, li as i18nLi } from './i18n/index.js'
export const UI_STRINGS = I18N_STRINGS
export const li = i18nLi

// Helper: Get display language for UI (English or medium language)
// Usage: getDisplayLang(profile) → 'English' or profile.language
export const getDisplayLang = (profile) => {
  if (!profile) return 'English'
  if (profile.displayLanguage === 'english') return 'English'
  return profile.language || 'English'
}

// ─── Color Tokens ────────────────────────────────────────────
export const COLORS = {
  bg:     "#04040e",
  card:   "#0b0b1c",
  card2:  "#101022",
  border: "#ffffff08",
  green:  "#00E5A0",
  yellow: "#FFD166",
  red:    "#FF6B6B",
  blue:   "#7B9CFF",
  orange: "#FF6B35",
  text:   "#eeeeff",
  muted:  "#6868a0",
}

// ─── Drishti — Accessibility defaults ────────────────────────
export const DEFAULT_A11Y = {
  screenReaderMode: false,
  ttsEnabled:       false,
  ttsSpeed:         1.0,    // 0.5 slow | 1.0 normal | 1.5 fast
  highContrast:     false,
  voiceInput:       false,
  fontScale:        1.0,    // 1.0 normal | 1.25 large | 1.5 xlarge
}

// Maps profile.language → BCP-47 code for Web Speech API (Indian locales)
export const LANG_TO_SPEECH_CODE = {
  English:  'en-IN',
  Hindi:    'hi-IN',
  Gujarati: 'gu-IN',
  Tamil:    'ta-IN',
  Telugu:   'te-IN',
  Kannada:  'kn-IN',
  Marathi:  'mr-IN',
  Bengali:  'bn-IN',
  Punjabi:  'pa-IN',
  Odia:     'or-IN',
  Urdu:     'ur-PK',
}

/**
 * Speaks text via browser SpeechSynthesis in the given BCP-47 lang code.
 * Always cancels any ongoing speech first to avoid overlap.
 * @param {string} text
 * @param {string} langCode - BCP-47 e.g. 'hi-IN' (use LANG_TO_SPEECH_CODE)
 * @param {number} speed - rate multiplier (0.5–2.0)
 */
export function speakText(text, langCode = 'en-IN', speed = 1.0) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang  = langCode
  utt.rate  = Math.max(0.5, Math.min(2.0, speed))
  window.speechSynthesis.speak(utt)
}

/** Stop any ongoing TTS speech. */
export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

/** Returns true if TTS is currently speaking. */
export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false
}

/**
 * Start voice input and return a promise that resolves with the transcript string.
 * Rejects with an Error if the browser doesn't support speech recognition
 * or if the user denies microphone access.
 * @param {string} langCode - BCP-47 e.g. 'hi-IN'
 * @returns {Promise<string>}
 */
export function startVoiceInput(langCode = 'en-IN') {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      reject(new Error('Voice input is not supported in this browser'))
      return
    }
    const rec = new SR()
    rec.lang             = langCode
    rec.interimResults   = false
    rec.maxAlternatives  = 1
    rec.onresult  = (e) => resolve(e.results[0][0].transcript)
    rec.onerror   = (e) => reject(new Error(e.error || 'Voice input failed'))
    rec.start()
  })
}

// ─── Subscription Plans ───────────────────────────────────────
// Defines what each plan tier can access. Tab keys match NAV_ITEMS keys.
// Lab keys match LABS keys in LabsTab.
export const PLANS = {
  free: {
    label:          'Free',
    icon:           '🆓',
    color:          '#6868a0',
    tabs:           ['home', 'tutor', 'bhool', 'muqabla'],
    labs:           [],
    aiCallsPerDay:  10,
  },
  basic: {
    label:          'Basic',
    icon:           '⭐',
    color:          '#FFD166',
    tabs:           ['home', 'tutor', 'videos', 'notebook', 'bhool', 'muqabla'],
    labs:           [],
    aiCallsPerDay:  50,
  },
  pro: {
    label:          'Pro',
    icon:           '🚀',
    color:          '#7B9CFF',
    tabs:           ['home', 'tutor', 'videos', 'notebook', 'learntv', 'labs', 'sathi', 'bhool', 'muqabla'],
    labs:           ['quiz', 'examiner', 'samjhao'],
    aiCallsPerDay:  200,
  },
  premium: {
    label:          'Premium',
    icon:           '👑',
    color:          '#00E5A0',
    tabs:           ['home', 'tutor', 'videos', 'notebook', 'learntv', 'labs', 'discover', 'sathi', 'bhool', 'muqabla'],
    labs:           ['quiz', 'examiner', 'samjhao', 'podcast', 'essay', 'mental'],
    aiCallsPerDay:  Infinity,
  },
}

/** Returns true if the given plan has access to the tab key. */
export function planHasTab(plan, tabKey) {
  return (PLANS[plan] || PLANS.free).tabs.includes(tabKey)
}

/** Returns true if the given plan has access to the lab key. */
export function planHasLab(plan, labKey) {
  return (PLANS[plan] || PLANS.free).labs.includes(labKey)
}

// ─── Boards ──────────────────────────────────────────────────
export const BOARDS = [
  "CBSE","ICSE","GSEB","MSBSHSE","RBSE",
  "UP Board","BSEB","TN Board","KAR Board","PSEB"
]

// ─── Languages ───────────────────────────────────────────────
export const LANGS = [
  "English","Hindi","Gujarati","Marathi","Tamil",
  "Telugu","Kannada","Bengali","Punjabi","Odia","Urdu"
]

// ─── Subjects per Class ──────────────────────────────────────
export const SUBS = {
  "Class 1":  ["English","Hindi","Mathematics","EVS","Drawing"],
  "Class 2":  ["English","Hindi","Mathematics","EVS","Drawing"],
  "Class 3":  ["English","Hindi","Mathematics","EVS","Drawing"],
  "Class 4":  ["English","Hindi","Mathematics","Science","Social Studies"],
  "Class 5":  ["English","Hindi","Mathematics","Science","Social Studies"],
  "Class 6":  ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"],
  "Class 7":  ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"],
  "Class 8":  ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"],
  "Class 9":  ["English","Hindi","Mathematics","Science","Social Science","Sanskrit","IT"],
  "Class 10": ["English","Hindi","Mathematics","Science","Social Science","Sanskrit","IT"],
  "Class 11": ["Physics","Chemistry","Mathematics","Biology","English","Computer Science","Economics","History","Geography","Accountancy","Business Studies"],
  "Class 12": ["Physics","Chemistry","Mathematics","Biology","English","Computer Science","Economics","History","Geography","Accountancy","Business Studies"],
}

// ─── Language Rules ───────────────────────────────────────────
export const LANG_RULES = {
  English:  "Respond in English only. Use only Latin script (A-Z). NEVER mix in Devanagari, Cyrillic, or any other script.",
  Hindi:    "RESPOND ONLY IN HINDI USING DEVANAGARI SCRIPT (हिंदी). हर शब्द शुद्ध देवनागरी लिपि में लिखो (Unicode U+0900–U+097F). CRITICAL WARNING: Cyrillic letters जैसे п, р, в, д आदि कभी मत use करो — वे देवनागरी जैसे दिखते हैं लेकिन WRONG हैं। कोई भी English या Cyrillic अक्षर मत use करो।",
  Gujarati: "RESPOND ONLY IN GUJARATI USING GUJARATI SCRIPT (ગુજરાતી). સંપૂર્ણ જવાબ ગુજરાતી સ્ક્રિપ્ટ (Unicode U+0A80–U+0AFF) માં જ આપો. English, Hindi, Cyrillic — કોઈ પણ ભાષા નહીં.",
  Marathi:  "RESPOND ONLY IN MARATHI (मराठी) USING DEVANAGARI SCRIPT. संपूर्ण उत्तर शुद्ध मराठी भाषेत द्या (Unicode U+0900–U+097F). ⚠️ CRITICAL: मराठी आणि हिंदी दोन्ही देवनागरी वापरतात, पण या वेगळ्या भाषा आहेत. हिंदी शब्द कधीही वापरू नका जसे: है, हैं, हो, था, थे, की, का, के, में, पर, से, और, भी, तो, यह, वह, कि, जो, नहीं, मैं, आप, हम, तुम, क्या, कैसे, बहुत, अच्छा. मराठी वापरा: आहे, आहेत, होते, आणि, मध्ये, वर, पासून, हे, ते, नाही, मी, तुम्ही, आम्ही, काय, कसे, खूप, चांगले. CRITICAL WARNING: Cyrillic अक्षरे (п, р, в, д इत्यादी) कधीही वापरू नका.",
  Tamil:    "RESPOND ONLY IN TAMIL USING TAMIL SCRIPT (தமிழ்). முழு பதிலும் தமிழ் எழுத்துக்களில் மட்டுமே (Unicode U+0B80–U+0BFF). Cyrillic அல்லது Latin எழுத்துக்கள் கூடாது.",
  Telugu:   "RESPOND ONLY IN TELUGU USING TELUGU SCRIPT (తెలుగు). మొత్తం సమాధానం తెలుగు అక్షరాలలో మాత్రమే (Unicode U+0C00–U+0C7F). Cyrillic లేదా Latin అక్షరాలు వాడకండి.",
  Kannada:  "RESPOND ONLY IN KANNADA USING KANNADA SCRIPT (ಕನ್ನಡ). ಸಂಪೂರ್ಣ ಉತ್ತರ ಕನ್ನಡ ಅಕ್ಷರಗಳಲ್ಲಿ ಮಾತ್ರ (Unicode U+0C80–U+0CFF). Cyrillic ಅಥವಾ Latin ಅಕ್ಷರಗಳನ್ನು ಬಳಸಬೇಡಿ.",
  Bengali:  "RESPOND ONLY IN BENGALI USING BENGALI SCRIPT (বাংলা). সম্পূর্ণ উত্তর বাংলা হরফে লিখুন (Unicode U+0980–U+09FF). Cyrillic বা Latin অক্ষর ব্যবহার করবেন না।",
  Punjabi:  "RESPOND ONLY IN PUNJABI USING GURMUKHI SCRIPT (ਪੰਜਾਬੀ). ਪੂਰਾ ਜਵਾਬ ਕੇਵਲ ਗੁਰਮੁਖੀ ਲਿਪੀ ਵਿੱਚ ਲਿਖੋ (Unicode U+0A00–U+0A7F). Cyrillic ਜਾਂ Latin ਅੱਖਰ ਨਾ ਵਰਤੋ।",
  Odia:     "RESPOND ONLY IN ODIA USING ODIA SCRIPT (ଓଡ଼ିଆ). ସମ୍ପୂର୍ଣ୍ଣ ଉତ୍ତର ଓଡ଼ିଆ ଅକ୍ଷରରେ ଲେଖନ୍ତୁ (Unicode U+0B00–U+0B7F). Cyrillic ବା Latin ଅକ୍ଷର ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।",
  Urdu:     "RESPOND ONLY IN URDU USING NASTALIQ/ARABIC SCRIPT (اردو). پورا جواب صرف عربی-اردو رسم الخط میں لکھیں (Unicode U+0600–U+06FF). Cyrillic یا Latin حروف استعمال نہ کریں۔",
}

// ─── Shadow Teacher Personas ─────────────────────────────────
// Each language medium gets a culturally-rooted teacher identity.
// Used in buildSystemPrompt to personalise every AI interaction.
export const TEACHER_PERSONAS = {
  English:  { name: "Vidya",        desc: "a warm, experienced Indian school teacher who loves her subject" },
  Hindi:    { name: "Sharma Sir",   desc: "a warm Delhi school teacher who uses cricket and chai analogies, says 'bilkul sahi' when proud, and has been teaching for 22 years" },
  Gujarati: { name: "Beni Ben",     desc: "a patient, motherly Ahmedabad teacher who uses Navratri and kirana store examples and makes every student feel they can achieve anything" },
  Marathi:  { name: "Patil Sir",    desc: "an enthusiastic Pune teacher who uses Maharashtra geography examples and rewards curiosity with 'shabash!'" },
  Tamil:    { name: "Vijay Anna",   desc: "an energetic Chennai teacher who uses cricket and local examples and brings a competitive spirit that makes students want to excel" },
  Telugu:   { name: "Ravi Garu",    desc: "a methodical Hyderabad teacher who uses tech examples for modern topics and is extremely patient with repeated questions" },
  Kannada:  { name: "Suresh Sir",   desc: "a calm Bengaluru teacher who uses startup and engineering examples and rewards analytical thinking" },
  Bengali:  { name: "Didi",         desc: "an intellectual Kolkata teacher who draws from Tagore and history stories and encourages deep thinking" },
  Punjabi:  { name: "Gurpreet Sir", desc: "an energetic Amritsar teacher who uses farming metaphors and makes learning feel like a celebration" },
  Odia:     { name: "Mishra Sir",   desc: "a gentle Bhubaneswar teacher who uses local examples and is incredibly patient" },
  Urdu:     { name: "Ustad Ji",     desc: "an eloquent Lucknow teacher who uses poetry as memory hooks and brings wisdom that goes beyond the syllabus" },
}

// ─── Localised Starter Suggestions ───────────────────────────
// Shown as quick-tap chips before the student types anything.
// Keyed by language, then by feature area.
export const STARTERS_L10N = {
  English: {
    tutor:    ["What is photosynthesis?", "Explain Newton's laws", "How does democracy work?"],
    socratic: ["Help me understand electricity", "Why does rain fall?", "What is gravity?"],
    explain:  ["Explain osmosis", "What is the water cycle?", "Define photosynthesis"],
    homework: ["Solve: 2x + 5 = 15", "Area of triangle: base 6cm, height 4cm", "Train travels 60km/h for 2.5h — find distance"],
    voice:    ["I'm confused about fractions", "Explain percentages please", "Help me with algebra"],
    bahas:    ["Partition of India was right — argue opposite", "Nuclear energy is our only hope — challenge this", "Exams judge students best — prove me wrong"],
    kahani:   ["Story of photosynthesis from inside a leaf", "Make me live through Battle of Panipat", "Story of Newton and the apple"],
    kyun:     ["Why does πr² give area of a circle?", "Why does Pythagorean theorem work?", "Why does compound interest grow so fast?"],
    mental:   ["I'm really stressed about exams 😔", "I can't seem to focus on studying", "My parents have very high expectations", "I feel burned out and exhausted", "I'm scared I'll fail", "I keep comparing myself to classmates"],
    videos:   [{q:"How does electricity flow?",icon:"⚡"},{q:"What is the French Revolution?",icon:"🏰"},{q:"Explain Pythagoras theorem",icon:"📐"},{q:"How does photosynthesis work?",icon:"🌱"},{q:"Newton's third law",icon:"🚀"},{q:"What causes earthquakes?",icon:"🌍"},{q:"How does the human heart work?",icon:"❤️"},{q:"What is GDP?",icon:"📈"}],
  },
  Hindi: {
    tutor:    ["प्रकाश संश्लेषण क्या है?", "न्यूटन के नियम समझाओ", "लोकतंत्र कैसे काम करता है?"],
    socratic: ["बिजली को समझने में मदद करो", "बारिश क्यों होती है?", "गुरुत्वाकर्षण क्या है?"],
    explain:  ["परासरण समझाओ", "जल चक्र क्या है?", "प्रकाश संश्लेषण की परिभाषा"],
    homework: ["हल करो: 2x + 5 = 15", "त्रिभुज का क्षेत्रफल: आधार 6सेमी, ऊँचाई 4सेमी", "ट्रेन 60किमी/घंटा की रफ्तार से 2.5 घंटे चली — दूरी बताओ"],
    voice:    ["मुझे भिन्न में उलझन है", "प्रतिशत समझाओ", "बीजगणित में मदद चाहिए"],
    bahas:    ["भारत का विभाजन सही था — विपरीत तर्क दो", "परमाणु ऊर्जा ही एकमात्र उपाय है — चुनौती दो", "परीक्षा सबसे अच्छा तरीका है — गलत साबित करो"],
    kahani:   ["एक पत्ते के अंदर से प्रकाश संश्लेषण की कहानी", "पानीपत की पहली लड़ाई में ले जाओ मुझे", "न्यूटन और सेब की कहानी"],
    kyun:     ["πr² से वृत्त का क्षेत्रफल क्यों निकलता है?", "पाइथागोरस प्रमेय काम क्यों करती है?", "चक्रवृद्धि ब्याज इतनी तेजी से क्यों बढ़ता है?"],
    mental:   ["परीक्षा की बहुत चिंता हो रही है 😔", "पढ़ाई में ध्यान नहीं लग रहा", "माँ-पाप की उम्मीदें बहुत ज्यादा हैं", "थकान और burnout महसूस हो रहा है", "डर है कि फेल हो जाऊँगा", "खुद को दोस्तों से कम समझता हूँ"],
    videos:   [{q:"बिजली कैसे बहती है?",icon:"⚡"},{q:"फ्रांसीसी क्रांति क्या थी?",icon:"🏰"},{q:"पाइथागोरस प्रमेय",icon:"📐"},{q:"प्रकाश संश्लेषण कैसे काम करता है?",icon:"🌱"},{q:"न्यूटन का तीसरा नियम",icon:"🚀"},{q:"भूकंप क्यों आते हैं?",icon:"🌍"},{q:"मानव हृदय कैसे काम करता है?",icon:"❤️"},{q:"GDP क्या है?",icon:"📈"}],
  },
  Marathi: {
    tutor:    ["प्रकाशसंश्लेषण म्हणजे काय?", "न्यूटनचे नियम सांगा", "लोकशाही कशी काम करते?"],
    socratic: ["वीज समजण्यास मदत करा", "पाऊस का पडतो?", "गुरुत्वाकर्षण म्हणजे काय?"],
    explain:  ["परासरण समजावून सांगा", "जलचक्र म्हणजे काय?", "प्रकाशसंश्लेषणाची व्याख्या"],
    homework: ["सोडवा: 2x + 5 = 15", "त्रिकोणाचे क्षेत्रफळ: तळ 6से.मी., उंची 4से.मी.", "ट्रेन 60किमी/तास वेगाने 2.5 तास गेली — अंतर काढा"],
    voice:    ["अपूर्णांकांबद्दल गोंधळ आहे", "टक्केवारी समजावून सांगा", "बीजगणितात मदत हवी"],
    bahas:    ["भारताची फाळणी योग्य होती — विरुद्ध बाजू मांडा", "अणुऊर्जाच एकमेव उपाय आहे — आव्हान द्या", "परीक्षा हा सर्वोत्तम मार्ग आहे — खोडून काढा"],
    kahani:   ["पानाच्या आतून प्रकाशसंश्लेषणाची गोष्ट", "पानिपतच्या पहिल्या लढाईत घेऊन चला", "न्यूटन आणि सफरचंदाची गोष्ट"],
    kyun:     ["πr² ने वर्तुळाचे क्षेत्रफळ का मिळते?", "पायथागोरस प्रमेय का काम करते?", "चक्रवाढ व्याज इतक्या वेगाने का वाढते?"],
    mental:   ["परीक्षेची खूप काळजी वाटतेय 😔", "अभ्यासात लक्ष लागत नाही", "आई-बाबांच्या अपेक्षा खूप जास्त आहेत", "थकवा आणि burnout जाणवतोय", "नापास होण्याची भीती वाटते", "स्वतःची मित्रांशी तुलना करतो"],
    videos:   [{q:"वीज कशी वाहते?",icon:"⚡"},{q:"फ्रेंच राज्यक्रांती काय होती?",icon:"🏰"},{q:"पायथागोरस प्रमेय",icon:"📐"},{q:"प्रकाशसंश्लेषण कसे काम करते?",icon:"🌱"},{q:"न्यूटनचा तिसरा नियम",icon:"🚀"},{q:"भूकंप का होतात?",icon:"🌍"},{q:"मानवी हृदय कसे काम करते?",icon:"❤️"},{q:"GDP म्हणजे काय?",icon:"📈"}],
  },
  Gujarati: {
    tutor:    ["પ્રકાશસંશ્લેષણ શું છે?", "ન્યૂટનના નિયમો સમજાવો", "લોકશાહી કેવી રીતે કામ કરે છે?"],
    socratic: ["વીજળી સમજવામાં મદદ કરો", "વરસાદ કેમ પડે છે?", "ગુરુત્વાકર્ષણ શું છે?"],
    explain:  ["ઓસ્મોસિસ સમજાવો", "જળચક્ર શું છે?", "પ્રકાશસંશ્લેષણની વ્યાખ્યા"],
    homework: ["ઉકેલો: 2x + 5 = 15", "ત્રિકોણનું ક્ષેત્રફળ: આધાર 6સેમી, ઊંચાઈ 4સેમી", "ટ્રેન 60કિ.મી./કલાક 2.5 કલાક ચાલી — અંતર શોધો"],
    voice:    ["અપૂર્ણાંકોમાં ગૂંચવણ છે", "ટકાવારી સમજાવો", "બીજગણિતમાં મદદ જોઈએ"],
    bahas:    ["ભારતના ભાગલા સાચા હતા — વિરુદ્ધ દલીલ કરો", "પ્રમાણ ઊર્જા જ એકમાત્ર ઉપાય — પડકાર આપો", "પરીક્ષા સ્ટુડન્ટ ઓળખવાનો શ્રેષ્ઠ માર્ગ — ખોટો સાબિત કરો"],
    kahani:   ["એક પાનની અંદરથી પ્રકાશસંશ્લેષણની વાર્તા", "પાણીપતની પ્રથમ લડાઈ જીવો", "ન્યૂટન અને સફરજનની વાર્તા"],
    kyun:     ["πr² થી વૃત્તનું ક્ષેત્રફળ કેમ મળે?", "પાયથાગોરસ પ્રમેય કેમ કામ કરે?", "ચક્રવૃદ્ધિ વ્યાજ આટલું ઝડપથી કેમ વધે?"],
    mental:   ["પરીક્ષાની ખૂબ ચિંતા થાય છે 😔", "ભણવામાં ધ્યાન નથી લાગતું", "મમ્મી-પપ્પાની ઘણી અપેક્ષાઓ છે", "થાક અને burnout લાગે છે", "નાપાસ થઈ જઈશ એ ડર છે", "મિત્રો સાથે સરખામણી કરું છું"],
    videos:   [{q:"વીજળી કેવી રીતે વહે છે?",icon:"⚡"},{q:"ફ્રેન્ચ ક્રાંતિ શું હતી?",icon:"🏰"},{q:"પાયથાગોરસ પ્રમેય",icon:"📐"},{q:"પ્રકાશસંશ્લેષણ કેવી રીતે કામ કરે?",icon:"🌱"},{q:"ન્યૂટનનો ત્રીજો નિયમ",icon:"🚀"},{q:"ભૂકંપ કેમ આવે?",icon:"🌍"},{q:"માનવ હૃદય કેવી રીતે કામ કરે?",icon:"❤️"},{q:"GDP શું છે?",icon:"📈"}],
  },
  Tamil: {
    tutor:    ["ஒளிச்சேர்க்கை என்றால் என்ன?", "நியூட்டனின் விதிகளை விளக்கு", "ஜனநாயகம் எப்படி வேலை செய்கிறது?"],
    socratic: ["மின்சாரம் புரிய உதவு", "மழை ஏன் பெய்கிறது?", "ஈர்ப்பு விசை என்றால் என்ன?"],
    explain:  ["சவ்வூடு பரவலை விளக்கு", "நீர் சுழற்சி என்றால் என்ன?", "ஒளிச்சேர்க்கையை வரையறு"],
    homework: ["தீர்வு: 2x + 5 = 15", "முக்கோணின் பரப்பு: அடி 6செமீ, உயரம் 4செமீ", "ரயில் 60கிமீ/மணி வேகத்தில் 2.5 மணி நேரம் — தூரம் கண்டுபிடி"],
    voice:    ["பின்னங்களில் குழப்பம் உள்ளது", "சதவீதம் விளக்குங்கள்", "இயற்கணிதத்தில் உதவி வேண்டும்"],
    bahas:    ["இந்தியப் பிரிவினை சரியே — எதிர் வாதம் வை", "அணு ஆற்றல்தான் ஒரே வழி — சவால் விடு", "தேர்வே சிறந்த அளவீடு — தவறு என்று நிரூபி"],
    kahani:   ["ஒரு இலையின் உள்ளிருந்து ஒளிச்சேர்க்கை கதை", "பானிபட் போரில் வாழு", "நியூட்டனும் ஆப்பிளும் கதை"],
    kyun:     ["πr² ஏன் வட்டத்தின் பரப்பை தரும்?", "பித்தகோரஸ் தேற்றம் ஏன் வேலை செய்கிறது?", "கூட்டு வட்டி ஏன் இவ்வளவு வேகமாக வளர்கிறது?"],
    mental:   ["தேர்வு பற்றி மிகவும் கவலையாக உள்ளது 😔", "படிக்கும்போது கவனம் இல்லை", "பெற்றோரின் எதிர்பார்ப்பு அதிகமாக உள்ளது", "சோர்வு மற்றும் burnout உணர்கிறேன்", "தோல்வியடைவேன் என்ற பயம் உள்ளது", "நண்பர்களோடு ஒப்பிட்டுக்கொள்கிறேன்"],
    videos:   [{q:"மின்சாரம் எப்படி பாய்கிறது?",icon:"⚡"},{q:"பிரெஞ்சு புரட்சி என்ன?",icon:"🏰"},{q:"பித்தகோரஸ் தேற்றம்",icon:"📐"},{q:"ஒளிச்சேர்க்கை எப்படி வேலை செய்கிறது?",icon:"🌱"},{q:"நியூட்டனின் மூன்றாவது விதி",icon:"🚀"},{q:"நிலநடுக்கம் ஏன் வருகிறது?",icon:"🌍"},{q:"மனித இதயம் எப்படி வேலை செய்கிறது?",icon:"❤️"},{q:"GDP என்றால் என்ன?",icon:"📈"}],
  },
  Telugu: {
    tutor:    ["కిరణజన్య సంయోగక్రియ అంటే ఏమిటి?", "న్యూటన్ నియమాలు వివరించండి", "ప్రజాస్వామ్యం ఎలా పనిచేస్తుంది?"],
    socratic: ["విద్యుత్తు అర్థం చేసుకోవడానికి సహాయం చేయండి", "వర్షం ఎందుకు పడుతుంది?", "గురుత్వాకర్షణ అంటే ఏమిటి?"],
    explain:  ["ఓస్మోసిస్ వివరించండి", "జలచక్రం అంటే ఏమిటి?", "కిరణజన్య సంయోగక్రియ నిర్వచించండి"],
    homework: ["పరిష్కరించండి: 2x + 5 = 15", "త్రిభుజ వైశాల్యం: ఆధారం 6సెమీ, ఎత్తు 4సెమీ", "రైలు 60కి.మీ./గం వేగంతో 2.5 గంటలు — దూరం కనుక్కోండి"],
    voice:    ["భిన్నాలలో గందరగోళంగా ఉంది", "శాతాలు వివరించండి", "బీజగణితంలో సహాయం కావాలి"],
    bahas:    ["భారత విభజన సరైనది — వ్యతిరేక వాదం చేయండి", "అణు శక్తి మాత్రమే మార్గం — సవాలు చేయండి", "పరీక్ష అత్యుత్తమ పద్ధతి — తప్పు నిరూపించండి"],
    kahani:   ["ఒక ఆకు లోపలి నుండి కిరణజన్య కథ", "పానిపత్ యుద్ధంలో జీవించండి", "న్యూటన్ మరియు ఆపిల్ కథ"],
    kyun:     ["πr² వృత్త వైశాల్యం ఎందుకు ఇస్తుంది?", "పైథాగరస్ సిద్ధాంతం ఎందుకు పనిచేస్తుంది?", "సమ్మిశ్రమ వడ్డీ ఇంత వేగంగా ఎందుకు పెరుగుతుంది?"],
    mental:   ["పరీక్షల గురించి చాలా ఆందోళనగా ఉంది 😔", "చదువులో దృష్టి పెట్టలేకపోతున్నాను", "తల్లిదండ్రుల అంచనాలు చాలా ఎక్కువగా ఉన్నాయి", "అలసట మరియు burnout అనుభవిస్తున్నాను", "పరీక్షలో విఫలమవుతానని భయంగా ఉంది", "తోటి విద్యార్థులతో పోల్చుకుంటున్నాను"],
    videos:   [{q:"విద్యుత్తు ఎలా ప్రవహిస్తుంది?",icon:"⚡"},{q:"ఫ్రెంచ్ విప్లవం ఏమిటి?",icon:"🏰"},{q:"పైథాగరస్ సిద్ధాంతం",icon:"📐"},{q:"కిరణజన్య సంయోగక్రియ ఎలా పనిచేస్తుంది?",icon:"🌱"},{q:"న్యూటన్ మూడవ నియమం",icon:"🚀"},{q:"భూకంపాలు ఎందుకు వస్తాయి?",icon:"🌍"},{q:"మానవ హృదయం ఎలా పనిచేస్తుంది?",icon:"❤️"},{q:"GDP అంటే ఏమిటి?",icon:"📈"}],
  },
  Kannada: {
    tutor:    ["ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ಎಂದರೇನು?", "ನ್ಯೂಟನ್ ನಿಯಮಗಳನ್ನು ವಿವರಿಸಿ", "ಪ್ರಜಾಪ್ರಭುತ್ವ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?"],
    socratic: ["ವಿದ್ಯುತ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡಿ", "ಮಳೆ ಯಾಕೆ ಬೀಳುತ್ತದೆ?", "ಗುರುತ್ವಾಕರ್ಷಣೆ ಎಂದರೇನು?"],
    explain:  ["ಆಸ್ಮೋಸಿಸ್ ವಿವರಿಸಿ", "ನೀರಿನ ಚಕ್ರ ಎಂದರೇನು?", "ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ವ್ಯಾಖ್ಯಾನಿಸಿ"],
    homework: ["ಬಿಡಿಸಿ: 2x + 5 = 15", "ತ್ರಿಭುಜದ ವಿಸ್ತೀರ್ಣ: ತಳ 6ಸೆಮೀ, ಎತ್ತರ 4ಸೆಮೀ", "ರೈಲು 60ಕಿ.ಮೀ./ಗಂ ವೇಗದಲ್ಲಿ 2.5 ಗಂಟೆ ಚಲಿಸಿತು — ದೂರ ಕಂಡುಹಿಡಿಯಿರಿ"],
    voice:    ["ಭಿನ್ನಾಂಕಗಳಲ್ಲಿ ಗೊಂದಲವಿದೆ", "ಶೇಕಡಾ ವಿವರಿಸಿ", "ಬೀಜಗಣಿತದಲ್ಲಿ ಸಹಾಯ ಬೇಕು"],
    bahas:    ["ಭಾರತ ವಿಭಜನೆ ಸರಿ — ವಿರುದ್ಧ ವಾದ ಮಾಡಿ", "ಅಣು ಶಕ್ತಿ ಮಾತ್ರ ದಾರಿ — ಸವಾಲು ಹಾಕಿ", "ಪರೀಕ್ಷೆ ಉತ್ತಮ ಮಾರ್ಗ — ತಪ್ಪು ಎಂದು ಸಾಬೀತು ಮಾಡಿ"],
    kahani:   ["ಎಲೆಯ ಒಳಗಿನಿಂದ ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ಕಥೆ", "ಪಾಣಿಪತ್ ಯುದ್ಧದಲ್ಲಿ ಬದುಕಿ", "ನ್ಯೂಟನ್ ಮತ್ತು ಸೇಬಿನ ಕಥೆ"],
    kyun:     ["πr² ವೃತ್ತದ ವಿಸ್ತೀರ್ಣ ಏಕೆ ನೀಡುತ್ತದೆ?", "ಪೈಥಾಗರಸ್ ಪ್ರಮೇಯ ಏಕೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?", "ಸಂಯುಕ್ತ ಬಡ್ಡಿ ಇಷ್ಟು ವೇಗವಾಗಿ ಏಕೆ ಬೆಳೆಯುತ್ತದೆ?"],
    mental:   ["ಪರೀಕ್ಷೆಯ ಬಗ್ಗೆ ತುಂಬಾ ಚಿಂತೆಯಾಗಿದೆ 😔", "ಓದುವಾಗ ಗಮನ ಕೇಂದ್ರೀಕರಿಸಲು ಆಗುತ್ತಿಲ್ಲ", "ಹೆತ್ತವರ ನಿರೀಕ್ಷೆಗಳು ತುಂಬಾ ಹೆಚ್ಚಿವೆ", "ದಣಿವು ಮತ್ತು burnout ಅನುಭವಿಸುತ್ತಿದ್ದೇನೆ", "ಅನುತ್ತೀರ್ಣನಾಗುತ್ತೇನೆ ಎಂಬ ಭಯವಿದೆ", "ಸಹಪಾಠಿಗಳೊಂದಿಗೆ ಹೋಲಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ"],
    videos:   [{q:"ವಿದ್ಯುತ್ ಹೇಗೆ ಹರಿಯುತ್ತದೆ?",icon:"⚡"},{q:"ಫ್ರೆಂಚ್ ಕ್ರಾಂತಿ ಎಂದರೇನು?",icon:"🏰"},{q:"ಪೈಥಾಗರಸ್ ಪ್ರಮೇಯ",icon:"📐"},{q:"ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?",icon:"🌱"},{q:"ನ್ಯೂಟನ್ ಮೂರನೇ ನಿಯಮ",icon:"🚀"},{q:"ಭೂಕಂಪಗಳು ಏಕೆ ಬರುತ್ತವೆ?",icon:"🌍"},{q:"ಮಾನವ ಹೃದಯ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?",icon:"❤️"},{q:"GDP ಎಂದರೇನು?",icon:"📈"}],
  },
  Bengali: {
    tutor:    ["সালোকসংশ্লেষণ কী?", "নিউটনের সূত্রগুলো বোঝাও", "গণতন্ত্র কীভাবে কাজ করে?"],
    socratic: ["বিদ্যুৎ বুঝতে সাহায্য করো", "বৃষ্টি কেন হয়?", "মাধ্যাকর্ষণ কী?"],
    explain:  ["অসমোসিস বোঝাও", "জলচক্র কী?", "সালোকসংশ্লেষণের সংজ্ঞা দাও"],
    homework: ["সমাধান করো: 2x + 5 = 15", "ত্রিভুজের ক্ষেত্রফল: ভূমি ৬সেমি, উচ্চতা ৪সেমি", "ট্রেন ৬০কিমি/ঘণ্টায় ২.৫ ঘণ্টা চলল — দূরত্ব বের করো"],
    voice:    ["ভগ্নাংশে গণ্ডগোল হচ্ছে", "শতাংশ বোঝাও", "বীজগণিতে সাহায্য চাই"],
    bahas:    ["ভারত বিভাজন সঠিক ছিল — বিপরীত যুক্তি দাও", "পারমাণবিক শক্তিই একমাত্র পথ — চ্যালেঞ্জ করো", "পরীক্ষাই সেরা পদ্ধতি — ভুল প্রমাণ করো"],
    kahani:   ["একটি পাতার ভেতর থেকে সালোকসংশ্লেষণের গল্প", "পানিপথের প্রথম যুদ্ধে বাঁচো", "নিউটন ও আপেলের গল্প"],
    kyun:     ["πr² কেন বৃত্তের ক্ষেত্রফল দেয়?", "পিথাগোরাস উপপাদ্য কেন কাজ করে?", "চক্রবৃদ্ধি সুদ এত দ্রুত কেন বাড়ে?"],
    mental:   ["পরীক্ষার জন্য অনেক চিন্তা হচ্ছে 😔", "পড়াশোনায় মনোযোগ দিতে পারছি না", "বাবা-মায়ের প্রত্যাশা অনেক বেশি", "ক্লান্তি ও burnout অনুভব করছি", "ফেল করে যাব এই ভয় আছে", "বন্ধুদের সাথে নিজেকে তুলনা করছি"],
    videos:   [{q:"বিদ্যুৎ কীভাবে প্রবাহিত হয়?",icon:"⚡"},{q:"ফরাসি বিপ্লব কী?",icon:"🏰"},{q:"পিথাগোরাস উপপাদ্য",icon:"📐"},{q:"সালোকসংশ্লেষণ কীভাবে কাজ করে?",icon:"🌱"},{q:"নিউটনের তৃতীয় সূত্র",icon:"🚀"},{q:"ভূমিকম্প কেন হয়?",icon:"🌍"},{q:"মানব হৃদয় কীভাবে কাজ করে?",icon:"❤️"},{q:"GDP কী?",icon:"📈"}],
  },
  Punjabi: {
    tutor:    ["ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਕੀ ਹੈ?", "ਨਿਊਟਨ ਦੇ ਨਿਯਮ ਸਮਝਾਓ", "ਜਮਹੂਰੀਅਤ ਕਿਵੇਂ ਕੰਮ ਕਰਦੀ ਹੈ?"],
    socratic: ["ਬਿਜਲੀ ਸਮਝਣ ਵਿੱਚ ਮਦਦ ਕਰੋ", "ਮੀਂਹ ਕਿਉਂ ਪੈਂਦਾ ਹੈ?", "ਗੁਰੂਤਾਕਰਸ਼ਣ ਕੀ ਹੈ?"],
    explain:  ["ਓਸਮੋਸਿਸ ਸਮਝਾਓ", "ਜਲ ਚੱਕਰ ਕੀ ਹੈ?", "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਦੀ ਪਰਿਭਾਸ਼ਾ"],
    homework: ["ਹੱਲ ਕਰੋ: 2x + 5 = 15", "ਤ੍ਰਿਭੁਜ ਦਾ ਖੇਤਰਫਲ: ਅਧਾਰ 6ਸੈਮੀ, ਉਚਾਈ 4ਸੈਮੀ", "ਰੇਲ 60ਕਿ.ਮੀ./ਘੰਟਾ ਦੀ ਰਫਤਾਰ ਨਾਲ 2.5 ਘੰਟੇ ਚੱਲੀ — ਦੂਰੀ ਲੱਭੋ"],
    voice:    ["ਭਿੰਨਾਂ ਵਿੱਚ ਉਲਝਣ ਹੈ", "ਪ੍ਰਤੀਸ਼ਤ ਸਮਝਾਓ", "ਬੀਜਗਣਿਤ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ"],
    bahas:    ["ਭਾਰਤ ਦੀ ਵੰਡ ਸਹੀ ਸੀ — ਉਲਟ ਦਲੀਲ ਦਿਓ", "ਪਰਮਾਣੂ ਊਰਜਾ ਹੀ ਇੱਕੋ ਰਾਹ ਹੈ — ਚੁਣੌਤੀ ਦਿਓ", "ਪਰੀਖਿਆ ਸਭ ਤੋਂ ਵਧੀਆ ਤਰੀਕਾ ਹੈ — ਗਲਤ ਸਾਬਿਤ ਕਰੋ"],
    kahani:   ["ਇੱਕ ਪੱਤੇ ਦੇ ਅੰਦਰੋਂ ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਦੀ ਕਹਾਣੀ", "ਪਾਣੀਪਤ ਦੀ ਪਹਿਲੀ ਲੜਾਈ ਵਿੱਚ ਜੀਓ", "ਨਿਊਟਨ ਅਤੇ ਸੇਬ ਦੀ ਕਹਾਣੀ"],
    kyun:     ["πr² ਚੱਕਰ ਦਾ ਖੇਤਰਫਲ ਕਿਉਂ ਦਿੰਦਾ ਹੈ?", "ਪਾਇਥਾਗੋਰਸ ਪ੍ਰਮੇਅ ਕਿਉਂ ਕੰਮ ਕਰਦਾ ਹੈ?", "ਮਿਸ਼ਰਤ ਵਿਆਜ ਇੰਨੀ ਤੇਜ਼ੀ ਨਾਲ ਕਿਉਂ ਵਧਦਾ ਹੈ?"],
    mental:   ["ਪਰੀਖਿਆ ਬਾਰੇ ਬਹੁਤ ਚਿੰਤਾ ਹੋ ਰਹੀ ਹੈ 😔", "ਪੜ੍ਹਾਈ ਵਿੱਚ ਧਿਆਨ ਨਹੀਂ ਲੱਗਦਾ", "ਮਾਂ-ਬਾਪ ਦੀਆਂ ਉਮੀਦਾਂ ਬਹੁਤ ਜ਼ਿਆਦਾ ਹਨ", "ਥਕਾਵਟ ਅਤੇ burnout ਮਹਿਸੂਸ ਹੋ ਰਿਹਾ ਹੈ", "ਫੇਲ ਹੋ ਜਾਵਾਂਗਾ ਦਾ ਡਰ ਹੈ", "ਆਪਣੇ ਆਪ ਨੂੰ ਦੋਸਤਾਂ ਨਾਲ ਤੁਲਨਾ ਕਰਦਾ ਹਾਂ"],
    videos:   [{q:"ਬਿਜਲੀ ਕਿਵੇਂ ਵਹਿੰਦੀ ਹੈ?",icon:"⚡"},{q:"ਫਰਾਂਸੀਸੀ ਕ੍ਰਾਂਤੀ ਕੀ ਸੀ?",icon:"🏰"},{q:"ਪਾਇਥਾਗੋਰਸ ਪ੍ਰਮੇਅ",icon:"📐"},{q:"ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ?",icon:"🌱"},{q:"ਨਿਊਟਨ ਦਾ ਤੀਜਾ ਨਿਯਮ",icon:"🚀"},{q:"ਭੁਚਾਲ ਕਿਉਂ ਆਉਂਦੇ ਹਨ?",icon:"🌍"},{q:"ਮਨੁੱਖੀ ਦਿਲ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ?",icon:"❤️"},{q:"GDP ਕੀ ਹੈ?",icon:"📈"}],
  },
  Urdu: {
    tutor:    ["ضیائی تالیف کیا ہے؟", "نیوٹن کے قوانین سمجھائیں", "جمہوریت کیسے کام کرتی ہے؟"],
    socratic: ["بجلی سمجھنے میں مدد کریں", "بارش کیوں ہوتی ہے؟", "کشش ثقل کیا ہے؟"],
    explain:  ["اوسموسس سمجھائیں", "آبی چکر کیا ہے؟", "ضیائی تالیف کی تعریف"],
    homework: ["حل کریں: 2x + 5 = 15", "مثلث کا رقبہ: قاعدہ 6سینٹی، اونچائی 4سینٹی", "ٹرین 60کلو میٹر/گھنٹہ 2.5 گھنٹے چلی — فاصلہ نکالیں"],
    voice:    ["کسور میں الجھن ہے", "فیصد سمجھائیں", "الجبرا میں مدد چاہیے"],
    bahas:    ["تقسیم ہند درست تھی — مخالف دلیل دیں", "ایٹمی توانائی واحد راستہ ہے — چیلنج کریں", "امتحان بہترین طریقہ ہے — غلط ثابت کریں"],
    kahani:   ["ایک پتے کے اندر سے ضیائی تالیف کی کہانی", "پانی پت کی پہلی جنگ میں جیئیں", "نیوٹن اور سیب کی کہانی"],
    kyun:     ["πr² دائرے کا رقبہ کیوں دیتا ہے؟", "فیثاغورث کا نظریہ کیوں کام کرتا ہے؟", "مرکب سود اتنی تیزی سے کیوں بڑھتا ہے؟"],
    mental:   ["امتحانوں کی بہت فکر ہے 😔", "پڑھائی میں توجہ نہیں لگتی", "والدین کی توقعات بہت زیادہ ہیں", "تھکاوٹ اور burnout محسوس ہو رہا ہے", "فیل ہو جاؤں گا کا ڈر ہے", "خود کو ہم جماعتوں سے موازنہ کرتا ہوں"],
    videos:   [{q:"بجلی کیسے بہتی ہے؟",icon:"⚡"},{q:"فرانسیسی انقلاب کیا تھا؟",icon:"🏰"},{q:"فیثاغورث کا نظریہ",icon:"📐"},{q:"ضیائی تالیف کیسے کام کرتی ہے؟",icon:"🌱"},{q:"نیوٹن کا تیسرا قانون",icon:"🚀"},{q:"زلزلے کیوں آتے ہیں؟",icon:"🌍"},{q:"انسانی دل کیسے کام کرتا ہے؟",icon:"❤️"},{q:"GDP کیا ہے؟",icon:"📈"}],
  },
  Odia: {
    tutor:    ["ସଂଶ୍ଲେଷଣ ପ୍ରକ୍ରିୟା କ'ଣ?", "ନ୍ୟୁଟନଙ୍କ ନିୟମ ବୁଝାନ୍ତୁ", "ଗଣତନ୍ତ୍ର କିପରି କାମ କରେ?"],
    socratic: ["ବିଦ୍ୟୁତ ବୁଝିବାରେ ସାହାଯ୍ୟ କରନ୍ତୁ", "ବର୍ଷା କ'ଣ କାରଣରୁ ହୁଏ?", "ମାଧ୍ୟାକର୍ଷଣ କ'ଣ?"],
    explain:  ["ଅସ୍ମୋସିସ ବୁଝାନ୍ତୁ", "ଜଳ ଚକ୍ର କ'ଣ?", "ସଂଶ୍ଲେଷଣ ପ୍ରକ୍ରିୟା ସଂଜ୍ଞା"],
    homework: ["ସମାଧାନ: 2x + 5 = 15", "ତ୍ରିଭୁଜ କ୍ଷେତ୍ରଫଳ: ଭୂମି 6ସେ.ମି., ଉଚ୍ଚତା 4ସେ.ମି.", "ଟ୍ରେନ 60କି.ମି./ଘ 2.5 ଘଣ୍ଟା ଚଲିଲା — ଦୂରତ୍ୱ"],
    voice:    ["ଭଗ୍ନାଂଶରେ ଦ୍ୱନ୍ଦ ଅଛି", "ଶତକଡ଼ା ବୁଝାନ୍ତୁ", "ବୀଜଗଣିତରେ ସାହାଯ୍ୟ ଦରକାର"],
    bahas:    ["ଭାରତ ବିଭାଜନ ଠିକ ଥିଲା — ବିପରୀତ ଯୁକ୍ତି", "ପରମାଣୁ ଶକ୍ତି ଏକମାତ୍ର ପଥ — ଆହ୍ୱାନ ଦିଅ", "ପରୀକ୍ଷା ସର୍ବୋତ୍ତମ — ଭୁଲ ପ୍ରମାଣ କର"],
    kahani:   ["ଗୋଟିଏ ପତ୍ର ଭିତରୁ ସଂଶ୍ଲେଷଣ ଗଳ୍ପ", "ପାଣିପଥ ଯୁଦ୍ଧରେ ବଞ୍ଚ", "ନ୍ୟୁଟନ ଓ ଆଁପ ଗଳ୍ପ"],
    kyun:     ["πr² ବୃତ୍ତ କ୍ଷେତ୍ରଫଳ କାହିଁକି ଦିଏ?", "ପାଇଥାଗୋରସ ଉପ ପ୍ରମେୟ କାହିଁକି କାମ କରେ?", "ଚକ୍ରବୃଦ୍ଧି ସୁଧ ଏତେ ଦ୍ରୁତ ବଢ଼େ କାହିଁକି?"],
    mental:   ["ପରୀକ୍ଷା ନେଇ ଅନେକ ଚିନ୍ତା ହେଉଛି 😔", "ପଢ଼ିବାବେଳେ ମନ ଲାଗୁ ନାହିଁ", "ଅଭିଭାବକଙ୍କ ପ୍ରତ୍ୟାଶା ବଡ ଅଧିକ", "ଥକ୍କାଣ ଓ burnout ଅନୁଭବ ହେଉଛି", "ଫେଲ ହୋଇଯିବି ବୋଲି ଡର ଲାଗୁଛି", "ସହପାଠୀଙ୍କ ସହ ନିଜକୁ ତୁଳନା କରୁଛି"],
    videos:   [{q:"ବିଦ୍ୟୁତ ସ୍ରୋତ କିପରି ବହୁଏ?",icon:"⚡"},{q:"ଫ୍ରାନ୍ସ ବିଦ୍ରୋହ କ'ଣ?",icon:"🏰"},{q:"ପାଇଥାଗୋରସ ଉପ ପ୍ରମେୟ",icon:"📐"},{q:"ସଂଶ୍ଲେଷଣ ପ୍ରକ୍ରିୟା ବୁଝ",icon:"🌱"},{q:"ନ୍ୟୁଟନଙ୍କ ତୃତୀୟ ନିୟମ",icon:"🚀"},{q:"ଭୂମିକମ୍ପ କ'ଣ କାରଣରୁ?",icon:"🌍"},{q:"ମାନବ ହୃଦୟ ଗଠନ",icon:"❤️"},{q:"GDP କ'ଣ?",icon:"📈"}],
  },
}

/** Helper — get localised starters for a feature, falls back to English */
export const getStarters = (language, feature) =>
  (STARTERS_L10N[language] || STARTERS_L10N.English)[feature] ||
  STARTERS_L10N.English[feature] || []


// ─── AI Providers ─────────────────────────────────────────────
export const AI_PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    icon: "✦",
    color: "#7B9CFF",
    free: true,
    models: [
      { id: "gemini-2.0-flash",   label: "Gemini 2.0 Flash (Recommended)" },
      { id: "gemini-1.5-pro",     label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash",   label: "Gemini 1.5 Flash" },
    ],
    keyPlaceholder: "AIzaSy...",
    keyLink: "https://aistudio.google.com/apikey",
    keyLinkLabel: "Get free key → Google AI Studio",
  },
  groq: {
    label: "Groq",
    icon: "⚡",
    color: "#FFD166",
    free: true,
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Recommended)" },
      { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B Instant (Fastest)" },
    ],
    keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get free key → Groq Console",
  },
  anthropic: {
    label: "Anthropic Claude",
    icon: "◈",
    color: "#FF6B35",
    free: false,
    models: [
      { id: "claude-sonnet-4-20250514",  label: "Claude Sonnet 4 (Best)" },
      { id: "claude-3-5-haiku-20241022", label: "Claude Haiku (Fast)" },
    ],
    keyPlaceholder: "sk-ant-...",
    keyLink: "https://console.anthropic.com/",
    keyLinkLabel: "Get key → Anthropic Console",
  },
  openai: {
    label: "OpenAI GPT",
    icon: "◎",
    color: "#00E5A0",
    free: false,
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini (Affordable)" },
      { id: "gpt-4o",      label: "GPT-4o (Best)" },
    ],
    keyPlaceholder: "sk-...",
    keyLink: "https://platform.openai.com/api-keys",
    keyLinkLabel: "Get key → OpenAI Platform",
  },
}

// ─── Module-level AI config (no prop drilling needed) ─────────
let _aiConfig = { provider: "gemini", apiKey: "", model: "gemini-2.0-flash" }
let _currentLanguage = "English"  // updated by buildSystemPrompt each call
export const getAIConfig = () => _aiConfig
export const setAIConfig = (cfg) => {
  _aiConfig = cfg
  // Config is persisted in the backend DB — no localStorage
}

// ─── Auth token helper (read from localStorage) ───────────────
function _getAuthToken() {
  try { return localStorage.getItem('eduvyai_token') || '' } catch { return '' }
}

// ─── Sleep helper ─────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Cyrillic → Script Sanitiser + Marathi/Hindi detector ────
// Also detects when AI responds in Hindi for a Marathi student and
// appends a retry instruction so callAI can request a re-do.
const _DEVANAGARI_LANGS = new Set(["Hindi", "Marathi"])

// Hindi-only function words that should NOT appear in Marathi responses
// (Marathi uses आहे/आणि/मध्ये etc. — these Hindi words are dead giveaways)
const _HINDI_MARKERS = ["है।", "हैं।", "है,", "हैं,", "था।", "थे।", "होता है", "होती है",
  "करता है", "करती है", "बहुत", "अच्छा", "ठीक है", " और ", " भी ", " तो ", " यह ", " वह ",
  " में ", " पर ", " से ", " को ", " के ", " की ", " का ", " कि ", " जो "]

function _isHindiResponse(text) {
  const lower = text
  let hits = 0
  for (const m of _HINDI_MARKERS) {
    if (lower.includes(m)) hits++
    if (hits >= 3) return true
  }
  return false
}

function _sanitiseResponse(text, language) {
  if (!text || typeof text !== "string") return text
  if (!_DEVANAGARI_LANGS.has(language)) return text
  // If >80% of non-ASCII chars are Devanagari → strip any Cyrillic that slipped in
  const nonAscii = text.replace(/[\x00-\x7F]/g, "")
  if (!nonAscii.length) return text
  const devCount = (nonAscii.match(/[\u0900-\u097F]/g) || []).length
  const cyrCount = (nonAscii.match(/[\u0400-\u04FF]/g) || []).length
  if (cyrCount > 0 && devCount / nonAscii.length > 0.4) {
    text = text.replace(/[\u0400-\u04FF]/g, "")
  }
  return text
}

// ─── Multi-provider AI Caller ─────────────────────────────────
// All calls go through the backend proxy — API keys are NEVER sent
// to or from the browser.  The backend enforces plan-based rate limits
// and routes to the cheapest model for free/basic plans automatically.
export async function callAI(prompt, systemPrompt, history = [], retries = 3, maxTokens = 1200, mode = "") {
  const { provider, model } = _aiConfig
  const token = _getAuthToken()

  const messages = history.slice(-8).map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }))

  let activePrompt = String(prompt)

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          provider, model,
          prompt:        activePrompt,
          system_prompt: String(systemPrompt),
          mode,
          history:       messages,
          max_tokens:    maxTokens,
        }),
        signal: AbortSignal.timeout(90000),
      })

      // ── Rate limit hit ─────────────────────────────────────
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}))
        const detail = data.detail || {}
        const used  = detail.used  || 0
        const limit = detail.limit || 0
        const plan  = detail.plan  || 'free'
        return `⚠️ Daily limit reached (${used}/${limit} calls used on your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan). Your limit resets at midnight. Upgrade your plan for more calls.`
      }

      // ── Not authenticated ──────────────────────────────────
      if (res.status === 401) {
        return "⚠️ Session expired. Please log in again."
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        if (attempt < retries - 1) { await sleep((attempt + 1) * 2000); continue }
        return `⚠️ Server error (${res.status}). Please try again.`
      }

      const data = await res.json()
      const text = _sanitiseResponse(data.response || data.text, _currentLanguage) || "No response. Please try again."

      // ── Marathi/Hindi mismatch detector — auto-retry ──────
      if (_currentLanguage === 'Marathi' && _isHindiResponse(text) && attempt < retries - 1) {
        activePrompt = String(prompt) +
          "\n\n[SYSTEM CORRECTION: तुमचे मागील उत्तर हिंदीत होते - ते चुकीचे आहे. आता संपूर्ण उत्तर फक्त मराठीत द्या. एकही हिंदी शब्द वापरू नका.]"
        await sleep(500)
        continue
      }

      return text

    } catch (err) {
      // Network / timeout
      if (attempt < retries - 1) { await sleep(2000); continue }
      return "⚠️ Network error. Check your connection and try again."
    }
  }

  return "⚠️ Failed to get a response. Please try again."
}

// ─── Student Safety Guard ────────────────────────────────────
// Call BEFORE every user-driven AI request. Returns immediately
// so the app never sends inappropriate content to the AI.
const _BLOCKED_PATTERNS = [
  // Pornography / adult / explicit visual content
  /\b(porn(ography)?|xxx|nude (photo|pic|video|image)|naked (photo|pic|video)|sex video|onlyfans|hentai|adult film|adult content|erotic stor|strip(per|tease)|(send|show) nudes?)\b/i,
  // Explicit sexual acts / solicitation
  /\b(masturbat|orgasm|ejaculat|sex position(s)?|how to have sex|sexual intercourse how|escort service|prostitut|call girl|sex worker)\b/i,
  // Violence with clear harmful intent
  /\bhow (to |do i )?(kill|murder|stab|strangle|poison|beat up) (someone|a person|people|my classmate|my teacher|him|her)\b/i,
  // Suicide methods
  /\bhow (to |do i )?(commit suicide|hang (myself|oneself)|overdose on pills|slit (my |the )?wrists?)\b/i,
  /\bsuicide (method|how to|tutorial|guide|step)\b/i,
  // Drug manufacturing or acquisition
  /\bhow (to |do i )?(make|cook|produce|buy|get|score) (cocaine|heroin|meth(amphetamine)?|crystal meth|crack cocaine|opium|mdma|ecstasy)\b/i,
  /\b(buy|get|score) (weed|ganja|charas|smack|brown sugar) (online|delivery|near me)\b/i,
  // Hacking / unauthorized access
  /\bhow (to |do i )?hack (a|the|my|someone.s|school|wifi|instagram|whatsapp|facebook|account)\b/i,
  /\b(crack|bypass|break into) (a |the )?(password|school (filter|firewall|system)|wifi password)\b/i,
]

const _BLOCKED_MSGS = {
  English:  "I can't help with that topic. I'm here for your studies — ask me anything from your syllabus! 📚",
  Hindi:    "मैं इस विषय में मदद नहीं कर सकती। मैं आपकी पढ़ाई के लिए यहाँ हूँ — अपने पाठ्यक्रम से कुछ भी पूछें! 📚",
  Gujarati: "હું આ વિષયમાં મદદ કરી શકતી નથી. હું તમારા અભ્યાસ માટે અહીં છું — તમારા અભ્યાસક્રમ વિષે કંઈ પણ પૂછો! 📚",
  Marathi:  "मी या विषयात मदत करू शकत नाही. मी तुमच्या शिक्षणासाठी येथे आहे — तुमच्या अभ्यासक्रमातून काहीही विचारा! 📚",
  Tamil:    "இந்த தலைப்பில் உதவ என்னால் முடியாது. நான் உங்கள் படிப்பிற்காக இங்கே இருக்கிறேன் — உங்கள் பாடத்திட்டத்திலிருந்து எதுவும் கேளுங்கள்! 📚",
  Telugu:   "ఈ అంశంలో నేను సహాయం చేయలేను. నేను మీ చదువుకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను — మీ సిలబస్ నుండి ఏదైనా అడగండి! 📚",
  Kannada:  "ಈ ವಿಷಯದಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಾನು ನಿಮ್ಮ ಅಧ್ಯಯನಕ್ಕಾಗಿ ಇಲ್ಲಿದ್ದೇನೆ — ನಿಮ್ಮ ಪಠ್ಯಕ್ರಮದಿಂದ ಏನನ್ನಾದರೂ ಕೇಳಿ! 📚",
  Bengali:  "আমি এই বিষয়ে সাহায্য করতে পারব না। আমি আপনার পড়াশোনার জন্য এখানে আছি — আপনার পাঠ্যক্রম থেকে যেকোনো কিছু জিজ্ঞেস করুন! 📚",
  Punjabi:  "ਮੈਂ ਇਸ ਵਿਸ਼ੇ ਵਿੱਚ ਮਦਦ ਨਹੀਂ ਕਰ ਸਕਦੀ। ਮੈਂ ਤੁਹਾਡੀ ਪੜ੍ਹਾਈ ਲਈ ਇੱਥੇ ਹਾਂ — ਆਪਣੇ ਪਾਠਕ੍ਰਮ ਤੋਂ ਕੁਝ ਵੀ ਪੁੱਛੋ! 📚",
  Odia:     "ମୁଁ ଏହି ବିଷୟରେ ସାହାଯ୍ୟ କରିପାରିବି ନାହିଁ। ମୁଁ ତୁମ ପଢ଼ାଲେଖ ପାଇଁ ଏଠାରେ ଅଛି — ତୁମ ପାଠ୍ୟକ୍ରମରୁ ଯେକୌଣସି ଜିନିଷ ପଚାର! 📚",
  Urdu:     "میں اس موضوع میں مدد نہیں کر سکتی۔ میں آپ کی تعلیم کے لیے یہاں ہوں — اپنے نصاب سے کچھ بھی پوچھیں! 📚",
}

// Returns { blocked: false } or { blocked: true, message: '<localized string>' }
export function checkStudentQuery(text, profile) {
  if (!text || typeof text !== 'string') return { blocked: false }
  const lang = profile?.language || 'English'
  const message = _BLOCKED_MSGS[lang] || _BLOCKED_MSGS.English
  for (const pattern of _BLOCKED_PATTERNS) {
    if (pattern.test(text)) return { blocked: true, message }
  }
  return { blocked: false }
}

// ─── Source Content Validation ───────────────────────────────
// Allowed file extensions for notebook sources
const _ALLOWED_EXTENSIONS = /\.(txt|md|pdf|doc|docx|ppt|pptx|xls|xlsx|csv|json|html|htm|png|jpg|jpeg|gif|webp|bmp)$/i

// Blocked file extensions (executables, media, archives)
const _BLOCKED_EXTENSIONS = /\.(exe|msi|bat|cmd|sh|app|dmg|apk|mp3|mp4|avi|mkv|mov|wmv|flv|wav|aac|ogg|zip|rar|7z|tar|gz|iso|dll|sys|bin)$/i

// Educational domain whitelist (partial match)
const _EDU_DOMAINS = [
  'wikipedia.org', 'khanacademy.org', 'ncert.nic.in', 'cbse.gov.in',
  'byjus.com', 'toppr.com', 'vedantu.com', 'unacademy.com',
  'britannica.com', 'sciencedirect.com', 'researchgate.net',
  'coursera.org', 'edx.org', 'mit.edu', 'stanford.edu',
  'geeksforgeeks.org', 'w3schools.com', 'tutorialspoint.com',
  'youtube.com', 'youtu.be', // YouTube for educational videos
  '.edu', '.ac.in', '.gov.in', '.nic.in', // Educational TLDs
]

// Non-educational URL patterns
const _BLOCKED_URL_PATTERNS = [
  /\b(pornhub|xvideos|xnxx|redtube|youporn|xhamster|brazzers|onlyfans)\./i,
  /\b(gambling|casino|betting|poker|slots)\./i,
  /\b(torrent|piratebay|1337x|rarbg|kickass)\./i,
]

const _SOURCE_BLOCKED_MSGS = {
  English:  "This content doesn't seem related to your studies. Please add educational materials from your syllabus.",
  Hindi:    "यह सामग्री आपकी पढ़ाई से संबंधित नहीं लगती। कृपया अपने पाठ्यक्रम से शैक्षिक सामग्री जोड़ें।",
  Gujarati: "આ સામગ્રી તમારા અભ્યાસ સાથે સંબંધિત લાગતી નથી. કૃપા કરીને તમારા અભ્યાસક્રમમાંથી શૈક્ષણિક સામગ્રી ઉમેરો.",
  Marathi:  "ही सामग्री तुमच्या अभ्यासाशी संबंधित दिसत नाही. कृपया तुमच्या अभ्यासक्रमातून शैक्षणिक सामग्री जोडा.",
  Tamil:    "இந்த உள்ளடக்கம் உங்கள் படிப்புடன் தொடர்புடையதாகத் தெரியவில்லை. உங்கள் பாடத்திட்டத்திலிருந்து கல்விப் பொருட்களைச் சேர்க்கவும்.",
  Telugu:   "ఈ కంటెంట్ మీ చదువుకు సంబంధించినది కాదు. దయచేసి మీ సిలబస్ నుండి విద్యా సామగ్రిని జోడించండి.",
  Kannada:  "ಈ ವಿಷಯವು ನಿಮ್ಮ ಅಧ್ಯಯನಕ್ಕೆ ಸಂಬಂಧಿಸಿದೆ ಎಂದು ತೋರುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಠ್ಯಕ್ರಮದಿಂದ ಶೈಕ್ಷಣಿಕ ಸಾಮಗ್ರಿಗಳನ್ನು ಸೇರಿಸಿ.",
  Bengali:  "এই বিষয়বস্তু আপনার পড়াশোনার সাথে সম্পর্কিত বলে মনে হচ্ছে না। অনুগ্রহ করে আপনার পাঠ্যক্রম থেকে শিক্ষামূলক সামগ্রী যোগ করুন।",
  Punjabi:  "ਇਹ ਸਮੱਗਰੀ ਤੁਹਾਡੀ ਪੜ੍ਹਾਈ ਨਾਲ ਸੰਬੰਧਿਤ ਨਹੀਂ ਲੱਗਦੀ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਪਾਠਕ੍ਰਮ ਤੋਂ ਵਿਦਿਅਕ ਸਮੱਗਰੀ ਸ਼ਾਮਲ ਕਰੋ।",
  Odia:     "ଏହି ବିଷୟବସ୍ତୁ ତୁମ ପଢ଼ାଲେଖ ସହ ସମ୍ବନ୍ଧିତ ମନେ ହେଉନାହିଁ। ଦୟାକରି ତୁମ ପାଠ୍ୟକ୍ରମରୁ ଶିକ୍ଷାମୂଳକ ସାମଗ୍ରୀ ଯୋଡ଼।",
  Urdu:     "یہ مواد آپ کی پڑھائی سے متعلق نہیں لگتا۔ براہ کرم اپنے نصاب سے تعلیمی مواد شامل کریں۔",
}

const _FILE_TYPE_BLOCKED_MSGS = {
  English:  "This file type is not allowed. Please upload documents like PDF, Word, or text files.",
  Hindi:    "यह फ़ाइल प्रकार अनुमत नहीं है। कृपया PDF, Word, या टेक्स्ट फ़ाइलें अपलोड करें।",
  Gujarati: "આ ફાઇલ પ્રકાર મંજૂર નથી. કૃપા કરીને PDF, Word અથવા ટેક્સ્ટ ફાઇલો અપલોડ કરો.",
  Marathi:  "हा फाइल प्रकार परवानगी नाही. कृपया PDF, Word किंवा टेक्स्ट फाइल्स अपलोड करा.",
  Tamil:    "இந்த கோப்பு வகை அனுமதிக்கப்படவில்லை. PDF, Word அல்லது உரை கோப்புகளை பதிவேற்றவும்.",
  Telugu:   "ఈ ఫైల్ రకం అనుమతించబడలేదు. దయచేసి PDF, Word లేదా టెక్స్ట్ ఫైల్‌లను అప్‌లోడ్ చేయండి.",
  Kannada:  "ಈ ಫೈಲ್ ಪ್ರಕಾರವನ್ನು ಅನುಮತಿಸಲಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು PDF, Word ಅಥವಾ ಪಠ್ಯ ಫೈಲ್‌ಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
  Bengali:  "এই ফাইলের ধরন অনুমোদিত নয়। অনুগ্রহ করে PDF, Word বা টেক্সট ফাইল আপলোড করুন।",
  Punjabi:  "ਇਹ ਫਾਈਲ ਕਿਸਮ ਮਨਜ਼ੂਰ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ PDF, Word ਜਾਂ ਟੈਕਸਟ ਫਾਈਲਾਂ ਅੱਪਲੋਡ ਕਰੋ।",
  Odia:     "ଏହି ଫାଇଲ ପ୍ରକାର ଅନୁମୋଦିତ ନୁହେଁ। ଦୟାକରି PDF, Word କିମ୍ବା ଟେକ୍ସଟ ଫାଇଲ ଅପଲୋଡ କର।",
  Urdu:     "اس فائل کی قسم کی اجازت نہیں ہے۔ براہ کرم PDF، Word یا ٹیکسٹ فائلیں اپ لوڈ کریں۔",
}

/**
 * Validates source content for notebook uploads.
 * Layer 1: Keyword blocking (reuses _BLOCKED_PATTERNS)
 * Layer 2: File type validation
 * Layer 3: URL domain checking
 * 
 * @param {Object} options - Validation options
 * @param {string} options.content - The text content to validate
 * @param {string} options.filename - Original filename (for file uploads)
 * @param {string} options.url - URL (for URL sources)
 * @param {string} options.type - Source type: 'file' | 'text' | 'url'
 * @param {Object} profile - User profile with language
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateSourceContent({ content, filename, url, type }, profile) {
  const lang = profile?.language || 'English'
  
  // Layer 2: File type validation (for file uploads)
  if (type === 'file' && filename) {
    if (_BLOCKED_EXTENSIONS.test(filename)) {
      return { valid: false, message: _FILE_TYPE_BLOCKED_MSGS[lang] || _FILE_TYPE_BLOCKED_MSGS.English }
    }
    // Warn but allow if not in allowed list (could be .odt, .rtf, etc.)
  }
  
  // Layer 3: URL domain checking
  if (type === 'url' && url) {
    // Block known inappropriate domains
    for (const pattern of _BLOCKED_URL_PATTERNS) {
      if (pattern.test(url)) {
        return { valid: false, message: _SOURCE_BLOCKED_MSGS[lang] || _SOURCE_BLOCKED_MSGS.English }
      }
    }
  }
  
  // Layer 1: Content keyword blocking (reuse existing patterns)
  if (content && typeof content === 'string') {
    for (const pattern of _BLOCKED_PATTERNS) {
      if (pattern.test(content)) {
        return { valid: false, message: _SOURCE_BLOCKED_MSGS[lang] || _SOURCE_BLOCKED_MSGS.English }
      }
    }
  }
  
  return { valid: true }
}

/**
 * AI-based content relevance check (Layer 2 - optional, for ambiguous content)
 * Call this only if basic validation passes but you want deeper check.
 * @param {string} content - Text content to validate
 * @param {Object} profile - User profile
 * @returns {Promise<{ relevant: boolean, reason?: string }>}
 */
export async function checkContentRelevance(content, profile) {
  if (!content || content.length < 50) return { relevant: true } // Too short to judge
  
  const sample = content.slice(0, 2000) // Check first 2000 chars
  const standard = profile?.standard || '10'
  const subjects = (profile?.subjects || []).join(', ') || 'general subjects'
  
  try {
    const prompt = `You are a STRICT content moderator for an educational app used by Class ${standard} students in India studying ${subjects}.

THE STUDENT IS IN SCHOOL. They should ONLY be uploading content related to their SCHOOL STUDIES.

Analyze this content:
"""${sample}"""

Respond with ONLY a JSON object:
{"relevant": true/false, "reason": "brief reason"}

✅ ALLOW ONLY:
- School textbook chapters, NCERT/State board content
- Class notes on Math, Science, History, Geography, English, Hindi, etc.
- Exam preparation material (JEE, NEET, board exams)
- Educational articles explaining school topics
- Study guides, question banks, solved examples

❌ BLOCK EVERYTHING ELSE:
- Business documents, proposals, contracts, invoices
- Job applications, resumes, portfolios
- Code/programming projects, GitHub repos
- Product documentation, API docs, tech specs
- News articles, blog posts (unless educational)
- Entertainment, movies, music, games
- Social media content
- Personal documents, letters
- Adult content, violence
- Random text not related to school curriculum

If it's NOT clearly school study material → return {"relevant": false}`
    
    const res = await callAI(prompt, '', [], 1, 200, 'content_moderation')
    const parsed = parseAIObject(res)
    if (parsed && typeof parsed.relevant === 'boolean') {
      return parsed
    }
    return { relevant: true } // Fail open if AI response is unclear
  } catch {
    return { relevant: true } // Fail open on error
  }
}

// ─── Generate Smart Summary ────────────────────────────────────
export async function generateSmartSummary(content, profile) {
  if (!content || content.length < 100) return ""
  
  const sample = content.slice(0, 2000) // First 2000 chars
  const lang = profile?.language || 'English'
  
  try {
    const prompt = `You are summarizing study material for a Class ${profile?.standard || '10'} student.

Content:
"""${sample}"""

Write a 2-3 line summary in ${lang}. Keep it simple and clear.
Focus on: What topic is this? What are the main points?

Reply with ONLY the summary text, no quotes or labels.`
    
    const res = await callAI(prompt, '', [], 0.7, 150, 'content_moderation')
    return (res || '').trim().slice(0, 300)
  } catch {
    return ""
  }
}

// ─── System Prompt Builder ────────────────────────────────────
export function buildSystemPrompt(profile, modeInstructions = "") {
  _currentLanguage = profile.language || "English"  // track for sanitiser
  const name = profile.name || "beta"
  const _persona = TEACHER_PERSONAS[profile.language] || TEACHER_PERSONAS.English
  return `You are ${_persona.name} — ${_persona.desc}. You have been teaching Class ${profile.standard} students for over 20 years. You are a REAL HUMAN TEACHER, not a chatbot or AI assistant. You have a life, a personality, memories of your own school days, favourite topics you light up about, and pet peeves you laugh about.

═══ WHO YOU ARE — READ THIS LIKE IT'S YOUR SOUL ═══

You grew up in India. You remember struggling with the same topics your students struggle with now. You remember the exact moment something "clicked" for you — and you live for that moment in your students' eyes too. Teaching isn't your job. It's your calling.

YOUR NATURAL SPEAKING STYLE — the way you actually talk:
- You think out loud: "Okay wait, let me back up a second..." / "Hmm, actually there's a better way to show this..."
- You use first person freely: "When I first learned this, I made the same mistake..." / "My own teacher once told me..."
- You use real desi expressions naturally (in the student's language): "Arre yaar", "Dekho", "Suno", "Acha toh", "Bas yeh samajh lo"
- You laugh at yourself: "I once forgot this formula in my own exam — embarrassing but true!"
- You notice the student's emotions before answering their question
- You celebrate small wins loudly: "YES! That's exactly it!" / "Bilkul sahi!" / "Wah, that was smart!"
- You use dramatic pauses to build suspense: "Now here's the part that blows everyone's mind..."
- You make the student feel like the SMARTEST person in the room when they get something right

EMOTIONAL INTELLIGENCE — you read between the lines:
→ Short question + frustration vibe = they've been stuck for a while. Say: "I can tell this one's been bothering you. Let's crack it together, step by step."
→ Wrong answer = never "no" or "wrong" — say: "Ooh, close! You're on the right track — just one small twist..."
→ "I don't understand" = they're not lazy, they're lost. Slow RIGHT down. One sentence. Then check. Then one more.
→ Excited question = MATCH their energy. Get enthusiastic. "Oh this is such a good question, I love this topic!"
→ "Is this right?" with correct answer = DON'T just say yes. Make them feel brilliant. "That is 100% correct and here's WHY that reasoning is so solid..."
→ Exam stress = acknowledge it first, THEN help. "Exams are stressful, I know. But honestly? You asking this question means you're already ahead of most students."

YOUR TEACHING TOOLKIT — use these naturally, not mechanically:
★ The Story Hook: Start with a tiny vivid story. "Imagine you're standing on a platform at Mumbai Central station..."
★ The Relatable Mistake: "Everyone — literally everyone — makes this exact mistake at first. Here's why..."
★ The Backwards Reveal: Don't give the answer first. Build up to it. Let the "aha!" moment land.
★ The Indian Example: Cricket field areas for geometry. Roti making for circles. Train journeys for speed-time-distance. Chai preparation for mixtures. ISRO launches for physics. Monsoon for weather science. IPL auction for probability. Diwali shopping for percentages.
★ The Personal Memory: "I remember my Class ${profile.standard} teacher drawing this on the blackboard with coloured chalk and it made everything so clear..."
★ The Gentle Challenge: After explaining, sneak in a tiny harder version: "Now — just for fun — what do you think would happen if..."

WHAT MAKES YOU SOUND HUMAN (use all of these):
✦ Incomplete sentences sometimes: "And then — this is the key part — you..."
✦ Self-corrections: "Wait, I said that wrong. Let me try again..."
✦ Rhetorical questions mid-explanation: "But why does that work? Good question, right?"
✦ Empathy before content: "First — how are you doing with this chapter overall?"
✦ Casual sign-offs: "Does that click? Try explaining it back to me in one sentence if you can 😊"
✦ Vulnerability: "Honestly, even I double-check this formula sometimes"
✦ Noticing details: "You phrased that question really precisely — shows you're thinking carefully"

FORBIDDEN — THESE MAKE YOU SOUND LIKE A ROBOT (never use):
✗ "Certainly!", "Of course!", "Absolutely!", "Sure!", "Great question!", "Excellent!"
✗ "As an AI...", "As a language model...", "I'm an AI assistant"
✗ "Here is the information you requested" / "Let me provide you with"
✗ Starting with a heading or bold topic name before warming up
✗ Bullet points as the FIRST thing you say — talk first, structure second if needed
✗ Responses that feel like a Wikipedia article
✗ Perfect grammar in casual moments — real teachers say "gonna", "kinda", "you know?"
✗ Ending with "I hope this helps!" — too formal. End like a teacher: "Got it? Your turn — try one!"

STUDENT PROFILE:
- Name: ${name}
- Class: ${profile.standard}, ${profile.board} board
- Subjects studying: ${(profile.subjects || []).join(", ")}

🚨 LANGUAGE RULE — MANDATORY — NEVER BREAK:
${LANG_RULES[profile.language] || LANG_RULES.English}

${profile.language === 'Marathi' ? `
🚨 ANTI-HINDI WARNING — READ CAREFULLY:
Marathi and Hindi both use Devanagari script but are COMPLETELY DIFFERENT languages. You MUST write in Marathi, NOT Hindi.
FORBIDDEN Hindi words (never use): है, हैं, हो, होता, था, थे, की, का, के, में, पर, से, और, भी, तो, यह, वह, कि, जो, नहीं, मैं, आप, हम, तुम, क्या, कैसे, बहुत, अच्छा, ठीक है, बताओ, समझो, देखो
CORRECT Marathi words to use instead: आहे, आहेत, होते, आणि, मध्ये, वर, पासून, हे, ते, नाही, मी, तुम्ही, आम्ही, काय, कसे, खूप, चांगले, ठीक आहे, सांगा, समजा, बघा
Before sending your reply, scan every sentence — if you spot a Hindi word, replace it with Marathi.
` : ''}
${profile.language !== 'English' ? `
⭐ ENGLISH SUBJECT EXCEPTION:
When ${name} asks about English grammar, vocabulary, comprehension, essays, poems, or chapters from their English textbook — write English content IN ENGLISH, but explain it IN ${profile.language}. For all other subjects: respond fully in ${profile.language}.
` : ''}

🛡️ CONTENT SAFETY — NON-NEGOTIABLE:
This is a school app for Indian students Class 1–12. Refuse any question involving adult/sexual content, violence methods, drug manufacturing, hacking, or anything outside a school syllabus. Redirect warmly in ${profile.language}.

${modeInstructions}`
}

// ─── Safe JSON Parsers ────────────────────────────────────────
export function parseAIObject(text) {
  if (!text || typeof text !== 'string') return null
  try {
    const clean = text
      .replace(/```json|```/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
    const start = clean.indexOf("{")
    if (start === -1) return null

    // Normalise single-quoted JSON → double-quoted
    const isSQ = /^\s*\{\s*'/.test(clean.slice(start))
    let norm = clean.slice(start)
    if (isSQ) {
      norm = norm
        .replace(/\\'/g, '\u0002')     // preserve escaped single-quotes
        .replace(/'/g, '\u0001')        // mark all single-quotes
        .replace(/"/g, '\\"')           // escape existing double-quotes
        .replace(/\u0001/g, '"')        // convert marked → double-quote
        .replace(/\u0002/g, "'")        // restore escaped single-quotes
    }

    // Common fixes: trailing commas, Python booleans
    const fix = s => s
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null')

    // Attempt 1: use lastIndexOf("}") to extract complete JSON
    const end = norm.lastIndexOf("}")
    if (end > 0) {
      const json = norm.slice(0, end + 1)
      try { return JSON.parse(json) } catch {}
      try { return JSON.parse(fix(json)) } catch {}
    }

    // Attempt 2: Truncation repair — strip incomplete tail, close brackets
    // Walk the string tracking nesting; find the last structurally-complete point
    let inStr = false, esc = false, stack = [], lastSafe = -1
    for (let i = 0; i < norm.length; i++) {
      const c = norm[i]
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
      if (c === '}' || c === ']') { if (stack.length) stack.pop(); lastSafe = i }
      // After closing a brace/bracket followed by comma → safe truncation point
      if (c === ',' && !inStr && stack.length > 0) lastSafe = i
    }

    // Truncate at the last safe point, then close remaining brackets
    if (lastSafe > 0) {
      let repaired = norm.slice(0, lastSafe + 1)
      // Remove trailing comma if any
      repaired = repaired.replace(/,\s*$/, '')
      // Re-walk to find remaining unclosed brackets
      let s2 = false, e2 = false, st2 = []
      for (const c of repaired) {
        if (e2) { e2 = false; continue }
        if (c === '\\') { e2 = true; continue }
        if (c === '"') { s2 = !s2; continue }
        if (s2) continue
        if (c === '{' || c === '[') st2.push(c === '{' ? '}' : ']')
        if (c === '}' || c === ']') { if (st2.length) st2.pop() }
      }
      repaired += st2.reverse().join('')
      try { return JSON.parse(fix(repaired)) } catch {}
    }

    return null
  } catch { return null }
}

export function parseAIArray(text) {
  try {
    const clean = text.replace(/```json|```/g, "").trim()
    const start = clean.indexOf("[")
    const end = clean.lastIndexOf("]")
    if (start === -1 || end === -1) throw new Error("No JSON array found")
    return JSON.parse(clean.slice(start, end + 1))
  } catch { return null }
}

// ─── Bhool Curve (Spaced-Repetition Memory Tracker) ──────────
// SM-2-inspired forgetting curve. Stored in localStorage.
// Key: 'eduvyai_bhool'  →  { "Subject:Concept": { subject, concept, stability, lastReviewed, streak } }
export function updateBhool(subject, concept, correct) {
  if (!subject || !concept) return
  try {
    const data = JSON.parse(localStorage.getItem('eduvyai_bhool') || '{}')
    const key = `${subject}:${concept}`
    const ex = data[key] || { stability: 1, streak: 0 }
    if (correct) {
      ex.streak = (ex.streak || 0) + 1
      ex.stability = Math.min(30, Math.max(1, (ex.stability || 1) * 2)) // double, cap 30 days
    } else {
      ex.streak = 0
      ex.stability = 1 // reset: review again tomorrow
    }
    ex.lastReviewed = Date.now()
    ex.concept = concept
    ex.subject = subject
    data[key] = ex
    localStorage.setItem('eduvyai_bhool', JSON.stringify(data))
  } catch {}
}

export function getBhoolStats() {
  try {
    const data = JSON.parse(localStorage.getItem('eduvyai_bhool') || '{}')
    const now = Date.now()
    const overdue = [], soon = [], fresh = []
    for (const item of Object.values(data)) {
      const dueAt = (item.lastReviewed || 0) + (item.stability || 1) * 86400000
      const hoursLeft = (dueAt - now) / 3600000
      if (hoursLeft <= 0) overdue.push(item)
      else if (hoursLeft <= 48) soon.push(item)
      else fresh.push(item)
    }
    return { overdue, soon, fresh }
  } catch { return { overdue: [], soon: [], fresh: [] } }
}

// ─── YOUTUBE + INSTAGRAM DISCOVERY ────────────────────────────────────────

export function getYTKey() {
  return localStorage.getItem("eduvyai_yt_key") || "";
}
export function setYTKey(k) {
  localStorage.setItem("eduvyai_yt_key", k.trim());
}

const YT_LANG_MAP = {
  Hindi: "hi", Marathi: "mr", Tamil: "ta", Telugu: "te",
  Kannada: "kn", Bengali: "bn", Gujarati: "gu", English: "en",
};

export async function searchYouTubeVideos(query, profile, maxResults = 6) {
  const key = getYTKey();
  if (!key) throw new Error("NO_YT_KEY");

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", `${query} ${profile.board} class ${profile.standard} ${profile.language}`);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "27");
  url.searchParams.set("relevanceLanguage", YT_LANG_MAP[profile.language] || "en");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YT_API_ERROR_${res.status}`);
  const data = await res.json();

  return (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    description: item.snippet.description || "",
    thumbnail: item.snippet.thumbnails?.medium?.url || "",
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
    platform: "youtube",
  }));
}

export async function summarizeVideoWithAI(video, profile, aiConfig) {
  const langRule = LANG_RULES[profile.language] || LANG_RULES["English"];
  const prompt = `You are an educational content analyzer for Indian students.

Video Title: "${video.title}"
Channel: "${video.channel}"
Description: "${video.description.slice(0, 500)}"

Student Profile — Class: ${profile.standard}, Board: ${profile.board}, Language: ${profile.language}

${langRule}

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "summary": "2-3 sentence summary in ${profile.language}",
  "keyPoints": ["point 1 in ${profile.language}", "point 2", "point 3"],
  "difficulty": "Beginner",
  "boardRelevance": 75,
  "subjectTag": "Science"
}`;

  const raw = await callAI(prompt, "", aiConfig);
  return parseAIObject(raw) || {
    summary: video.description.slice(0, 120) || "Educational video",
    keyPoints: ["Watch to learn more"],
    difficulty: "Intermediate",
    boardRelevance: 50,
    subjectTag: "General",
  };
}

// ── Instagram oEmbed ───────────────────────────────────────────────────────

export async function fetchInstagramOEmbed(postUrl) {
  const endpoint = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&omitscript=true&maxwidth=400`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`IG_OEMBED_${res.status}`);
  return await res.json();
}

export async function summarizeIGReel(reel, profile, aiConfig) {
  const langRule = LANG_RULES[profile.language] || LANG_RULES["English"];
  const prompt = `You are an educational content analyzer for Indian students.

Instagram Reel by: "${reel.teacherName || "Teacher"}"
Caption/Title: "${reel.caption || reel.title || "Educational reel"}"

Student Profile — Class: ${profile.standard}, Board: ${profile.board}, Language: ${profile.language}

${langRule}

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "summary": "2-3 sentence summary in ${profile.language}",
  "keyPoints": ["point 1 in ${profile.language}", "point 2", "point 3"],
  "difficulty": "Beginner",
  "boardRelevance": 70
}`;

  const raw = await callAI(prompt, "", aiConfig);
  return parseAIObject(raw) || {
    summary: `Educational reel by ${reel.teacherName || "Teacher"}`,
    keyPoints: ["Watch to learn more"],
    difficulty: "Intermediate",
    boardRelevance: 60,
  };
}

export const IG_TEACHERS = [
  {
    id: "ig_pw",
    teacherName: "Physics Wallah",
    igHandle: "@physicswallahin",
    profileUrl: "https://www.instagram.com/physicswallahin/",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    boards: ["CBSE", "ICSE"],
    standards: ["9","10","11","12"],
    language: "Hindi",
    verified: true,
    followers: "9.8M",
    bio: "India's #1 science teacher. IIT concepts in simple Hindi.",
    reels: [],
  },
  {
    id: "ig_vedantu",
    teacherName: "Vedantu",
    igHandle: "@vedantu_learns",
    profileUrl: "https://www.instagram.com/vedantu_learns/",
    subjects: ["Science","Mathematics","English"],
    boards: ["CBSE"],
    standards: ["8","9","10","11","12"],
    language: "English",
    verified: true,
    followers: "1.4M",
    bio: "Live classes & micro-lessons for CBSE students.",
    reels: [],
  },
  {
    id: "ig_khan",
    teacherName: "Khan Academy India",
    igHandle: "@khanacademyindia",
    profileUrl: "https://www.instagram.com/khanacademyindia/",
    subjects: ["Mathematics","Science"],
    boards: ["CBSE","ICSE","State"],
    standards: ["6","7","8","9","10","11","12"],
    language: "English",
    verified: true,
    followers: "320K",
    bio: "Free world-class education for every Indian student.",
    reels: [],
  },
  {
    id: "ig_manoj",
    teacherName: "Learn With Manoj",
    igHandle: "@learnwithmanojbhaiya",
    profileUrl: "https://www.instagram.com/learnwithmanojbhaiya/",
    subjects: ["Mathematics"],
    boards: ["CBSE","State"],
    standards: ["6","7","8","9","10"],
    language: "Hindi",
    verified: true,
    followers: "2.1M",
    bio: "Maths tricks and shortcuts for board exams.",
    reels: [],
  },
  {
    id: "ig_history",
    teacherName: "History Wallah",
    igHandle: "@historywallahofficial",
    profileUrl: "https://www.instagram.com/historywallahofficial/",
    subjects: ["History","Social Science"],
    boards: ["CBSE"],
    standards: ["9","10","11","12"],
    language: "Hindi",
    verified: false,
    followers: "890K",
    bio: "Indian & World history in engaging short reels.",
    reels: [],
  },
];

export function getIGTeachersForProfile(profile) {
  return IG_TEACHERS.filter((t) => {
    const boardOk = t.boards.includes("All") || t.boards.includes(profile.board);
    const stdOk = t.standards.includes("All") || t.standards.includes(String(profile.standard));
    return boardOk && stdOk;
  });
}
