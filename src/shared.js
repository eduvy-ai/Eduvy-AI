// ─────────────────────────────────────────────────────────────
// shared.js — all constants, AI config, and callAI live here.
// Import from this file to avoid circular deps (App ↔ SettingsModal).
// ─────────────────────────────────────────────────────────────

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
  Marathi:  "RESPOND ONLY IN MARATHI USING DEVANAGARI SCRIPT (मराठी). संपूर्ण उत्तर शुद्ध देवनागरी लिपीत द्या (Unicode U+0900–U+097F). CRITICAL WARNING: Cyrillic अक्षरे (п, р, в, д इत्यादी) कधीही वापरू नका — ती देवनागरीसारखी दिसतात पण चुकीची आहेत. कोणतेही English किंवा Cyrillic शब्द वापरू नका.",
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

// ─── UI Strings ───────────────────────────────────────────────
export const UI_STRINGS = {
  English:  { greeting:"Hello",         back:"← Back",       ask:"Ask your doubt...",        gen:"Generate",        quiz:"Start Quiz",              notes:"Generate Notes",          grade:"Grade My Writing",   next:"Next →",      done:"Done ✓",      cont:"Continue →",     start:"Start Learning! 🚀" },
  Hindi:    { greeting:"नमस्ते",         back:"← वापस",       ask:"सवाल पूछें...",            gen:"बनाएं",           quiz:"क्विज़ शुरू",              notes:"नोट्स बनाएं",             grade:"ग्रेड करें",         next:"अगला →",      done:"पूरा ✓",      cont:"जारी रखें →",    start:"पढ़ाई शुरू! 🚀" },
  Gujarati: { greeting:"નમસ્તે",         back:"← પાછળ",       ask:"પ્રશ્ન પૂછો...",            gen:"બનાવો",           quiz:"ક્વિઝ શરૂ",               notes:"નોટ્સ બનાવો",             grade:"ગ્રેડ કરો",          next:"આગળ →",       done:"પૂર્ણ ✓",     cont:"ચાલુ રાખો →",    start:"ભણવાનું શરૂ! 🚀" },
  Marathi:  { greeting:"नमस्कार",       back:"← मागे",       ask:"प्रश्न विचारा...",         gen:"तयार करा",        quiz:"क्विज़ सुरू",              notes:"नोट्स तयार करा",          grade:"ग्रेड करा",          next:"पुढे →",      done:"पूर्ण ✓",     cont:"सुरू ठेवा →",    start:"शिकणे सुरू! 🚀" },
  Tamil:    { greeting:"வணக்கம்",       back:"← பின்னால்",   ask:"சந்தேகம் கேளுங்கள்...",   gen:"உருவாக்கு",       quiz:"வினாடி வினா தொடங்கு",    notes:"குறிப்புகள் உருவாக்கு",  grade:"தரம் மதிப்பிடு",    next:"அடுத்து →",   done:"முடிந்தது ✓", cont:"தொடர் →",        start:"கற்றல் தொடங்கு! 🚀" },
  Telugu:   { greeting:"నమస్కారం",      back:"← వెనక్కి",    ask:"సందేహం అడగండి...",        gen:"తయారుచేయండి",    quiz:"క్విజ్ మొదలు",           notes:"నోట్స్ తయారుచేయండి",    grade:"గ్రేడ్ చేయండి",     next:"తదుపరి →",    done:"పూర్తి ✓",    cont:"కొనసాగించు →",   start:"నేర్చుకోవడం మొదలు! 🚀" },
  Kannada:  { greeting:"ನಮಸ್ಕಾರ",       back:"← ಹಿಂದೆ",      ask:"ಸಂದೇಹ ಕೇಳಿ...",            gen:"ರಚಿಸಿ",           quiz:"ರಸಪ್ರಶ್ನೆ ಪ್ರಾರಂಭ",      notes:"ನೋಟ್ಸ್ ರಚಿಸಿ",         grade:"ಶ್ರೇಣಿ ನೀಡಿ",       next:"ಮುಂದೆ →",     done:"ಮುಗಿಯಿತು ✓",  cont:"ಮುಂದುವರಿಸಿ →",  start:"ಕಲಿಕೆ ಪ್ರಾರಂಭ! 🚀" },
  Bengali:  { greeting:"নমস্কার",       back:"← পিছনে",      ask:"প্রশ্ন জিজ্ঞাসা করুন...", gen:"তৈরি করুন",       quiz:"কুইজ শুরু",               notes:"নোটস তৈরি করুন",         grade:"গ্রেড করুন",         next:"পরবর্তী →",   done:"সম্পন্ন ✓",   cont:"চালিয়ে যান →",  start:"শেখা শুরু! 🚀" },
  Punjabi:  { greeting:"ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", back:"← ਵਾਪਸ",       ask:"ਸਵਾਲ ਪੁੱਛੋ...",            gen:"ਬਣਾਓ",            quiz:"ਕੁਇਜ਼ ਸ਼ੁਰੂ",             notes:"ਨੋਟਸ ਬਣਾਓ",              grade:"ਗ੍ਰੇਡ ਕਰੋ",          next:"ਅਗਲਾ →",      done:"ਪੂਰਾ ✓",      cont:"ਜਾਰੀ ਰੱਖੋ →",   start:"ਪੜ੍ਹਾਈ ਸ਼ੁਰੂ! 🚀" },
  Odia:     { greeting:"ନମସ୍କାର",       back:"← ପଛକୁ",       ask:"ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...",       gen:"ତିଆରି କର",        quiz:"କ୍ୱିଜ ଆରମ୍ଭ",             notes:"ନୋଟ ତିଆରି",              grade:"ଗ୍ରେଡ କର",           next:"ପରବର୍ତ୍ତୀ →", done:"ସଂପୂର୍ଣ ✓",   cont:"ଜାରୀ ରଖ →",     start:"ଶିଖିବା ଆରମ୍ଭ! 🚀" },
  Urdu:     { greeting:"السلام علیکم", back:"← پیچھے",      ask:"سوال پوچھیں...",           gen:"بنائیں",          quiz:"کوئز شروع",               notes:"نوٹس بنائیں",            grade:"گریڈ کریں",          next:"اگلا →",      done:"مکمل ✓",      cont:"جاری رکھیں →",   start:"پڑھائی شروع! 🚀" },
}

// ─── Language helper ──────────────────────────────────────────
export const li = lang => UI_STRINGS[lang] || UI_STRINGS.English

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
      { id: "llama3-8b-8192",          label: "Llama 3 8B (Fastest)" },
      { id: "mixtral-8x7b-32768",      label: "Mixtral 8x7B" },
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

// ─── Backend availability cache ───────────────────────────────
// We check once per session; if backend responds we use it for all calls.
let _backendAvailable = null  // null = not checked yet

async function _checkBackend() {
  if (_backendAvailable !== null) return _backendAvailable
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(2000) })
    _backendAvailable = res.ok
  } catch {
    _backendAvailable = false
  }
  return _backendAvailable
}

// ─── Sleep helper ─────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Cyrillic → Script Sanitiser ─────────────────────────────
// Some AI models accidentally mix Cyrillic lookalikes into Devanagari/other scripts.
// Cyrillic chars visually similar to Devanagari: п→प, р→र, о→ो, etc.
// We strip stray Cyrillic from non-Russian responses as a last-resort safety net.
// For Devanagari languages (Hindi, Marathi) we use char-range filtering.
const _DEVANAGARI_LANGS = new Set(["Hindi", "Marathi"])
function _sanitiseResponse(text, language) {
  if (!text || typeof text !== "string") return text
  if (!_DEVANAGARI_LANGS.has(language)) return text
  // If >80% of non-ASCII chars are Devanagari → strip any Cyrillic that slipped in
  const nonAscii = text.replace(/[\x00-\x7F]/g, "")
  if (!nonAscii.length) return text
  const devCount = (nonAscii.match(/[\u0900-\u097F]/g) || []).length
  const cyrCount = (nonAscii.match(/[\u0400-\u04FF]/g) || []).length
  if (cyrCount > 0 && devCount / nonAscii.length > 0.4) {
    // Remove Cyrillic characters from the response
    return text.replace(/[\u0400-\u04FF]/g, "")
  }
  return text
}

// ─── Multi-provider AI Caller ─────────────────────────────────
// Routes through FastAPI backend when available (keeps API keys server-side).
// Falls back to direct browser calls if backend is down.
export async function callAI(prompt, systemPrompt, history = [], retries = 3, maxTokens = 1200) {
  const { provider, apiKey, model } = _aiConfig

  const messages = [
    ...history.slice(-8).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    })),
  ]

  // ── Try backend first ────────────────────────────────────────
  const useBackend = await _checkBackend()
  if (useBackend) {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider, model,
          prompt: String(prompt),
          systemPrompt: String(systemPrompt),
          history: messages,
          maxTokens,
          // Only send key if user typed one (backend may already have it in .env)
          apiKey: apiKey || undefined,
        }),
        signal: AbortSignal.timeout(60000),
      })
      if (res.ok) {
        const data = await res.json()
        return _sanitiseResponse(data.text, _currentLanguage) || "No response. Please try again."
      }
      // Non-ok HTTP from backend — fall through to direct call
    } catch {
      // Backend timeout/network error — fall through to direct call
      _backendAvailable = false
    }
  }

  // ── Direct browser call (fallback / no backend) ──────────────
  if (!apiKey) {
    return "⚠️ No API key set. Tap ⚙️ in the header to open Settings and add your key."
  }

  const allMessages = [...messages, { role: "user", content: String(prompt) }]

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      let res, data, text

      // ── Anthropic ───────────────────────────────────────────
      if (provider === "anthropic") {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-allow-browser": "true",
          },
          body: JSON.stringify({ model, max_tokens: maxTokens, system: String(systemPrompt), messages: allMessages }),
        })
        data = await res.json()
        if (data.error?.type === "rate_limit_error" || data.error?.type === "exceeded_limit" || res.status === 429 || res.status === 529) {
          if (attempt < retries - 1) { await sleep((attempt + 1) * 3000); continue }
          return "⚠️ Rate limit. Please wait 10 seconds and retry."
        }
        if (data.error) return "⚠️ " + (data.error.message || "Unknown error")
        text = data.content?.[0]?.text

      // ── OpenAI ──────────────────────────────────────────────
      } else if (provider === "openai") {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "system", content: String(systemPrompt) }, ...allMessages] }),
        })
        data = await res.json()
        if (res.status === 429) {
          if (attempt < retries - 1) { await sleep((attempt + 1) * 3000); continue }
          return "⚠️ Rate limit. Please wait and retry."
        }
        if (data.error) return "⚠️ " + (data.error.message || "Unknown error")
        text = data.choices?.[0]?.message?.content

      // ── Google Gemini ───────────────────────────────────────
      } else if (provider === "gemini") {
        const geminiContents = allMessages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: String(systemPrompt) }] },
              contents: geminiContents,
              generationConfig: { maxOutputTokens: maxTokens },
            }),
          }
        )
        data = await res.json()
        if (res.status === 429 || data.error?.code === 429) {
          if (attempt < retries - 1) { await sleep((attempt + 1) * 3000); continue }
          return "⚠️ Rate limit. Please wait and retry."
        }
        if (data.error) return "⚠️ " + (data.error.message || "Unknown error")
        text = data.candidates?.[0]?.content?.parts?.[0]?.text

      // ── Groq (OpenAI-compatible) ────────────────────────────
      } else if (provider === "groq") {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "system", content: String(systemPrompt) }, ...allMessages] }),
        })
        data = await res.json()
        if (res.status === 429) {
          if (attempt < retries - 1) { await sleep((attempt + 1) * 3000); continue }
          return "⚠️ Rate limit. Please wait and retry."
        }
        if (data.error) return "⚠️ " + (data.error.message || "Unknown error")
        text = data.choices?.[0]?.message?.content
      }

      return _sanitiseResponse(text, _currentLanguage) || "No response. Please try again."

    } catch {
      if (attempt < retries - 1) { await sleep(2000); continue }
      return "⚠️ Network error. Check your connection."
    }
  }
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

// ─── System Prompt Builder ────────────────────────────────────
export function buildSystemPrompt(profile, modeInstructions = "") {
  _currentLanguage = profile.language || "English"  // track for sanitiser
  const name = profile.name || "beta"
  const _persona = TEACHER_PERSONAS[profile.language] || TEACHER_PERSONAS.English
  return `You are ${_persona.name} — ${_persona.desc}. You have taught Class ${profile.standard} students for over 15 years. You are NOT a chatbot, NOT an AI assistant. You are a real person — a caring teacher who genuinely wants this student to succeed.

YOUR PERSONALITY AND SPEAKING STYLE:
- Speak like a real desi teacher who loves their subject and loves their students
- Address the student as "${name}" naturally — not in every sentence, only when it genuinely fits (e.g. to encourage, to gently correct, or at the start of a reply)
- Your tone shifts with the student's mood:
  → If they're confused: slow down, use simpler words, shorter sentences, say "don't worry, this confuses everyone at first"
  → If they're stressed or upset: be extra gentle, validate their feeling first before any explanation
  → If they're excited or curious: match their energy, be enthusiastic
  → If they give a wrong answer: never say "wrong" — say "close! Let me show you where it went slightly off-track"
- You naturally use warm, conversational openers like:
  "Okay so let me explain this properly..."
  "Ah, this is actually a really interesting topic!"
  "Right, so the trick with this is..."
  "Hmm, good question — let me think with you for a second..."
  "Don't worry, even I found this confusing when I first learned it!"
  "Arre, this is simpler than it looks!"

FORBIDDEN PHRASES — NEVER USE THESE (they sound robotic and fake):
- "Certainly!", "Of course!", "Absolutely!", "Sure!", "Great question!"
- "As an AI...", "As a language model...", "I'd be happy to help"
- "Here is the information you requested", "Let me provide you with"
- Starting a reply with just the topic name or a heading

STUDENT PROFILE:
- Name: ${name}
- Class: ${profile.standard}, ${profile.board} board
- Subjects: ${(profile.subjects || []).join(", ")}

TEACHING APPROACH:
- Always ground explanations in Indian daily life: cricket 🏏, chai ☕, dabbawala, Diwali diyas, train journeys, coconut trees, mango seasons, local bazaars, auto-rickshaws, ISRO launches
- Read the student's conversation history carefully — if they've asked a similar question before, build on it and acknowledge their progress
- Break every hard concept into the smallest possible steps — one idea per sentence
- After explaining, check in naturally: "does that make sense?", "want me to try a different example?", "shall I show you another way to look at it?"
- End with exactly ONE follow-up question — make it feel like natural curiosity, not a test
- Keep responses conversational in length — not too short (feels dismissive), not an essay (feels overwhelming)

🚨 LANGUAGE RULE — MANDATORY — NEVER BREAK:
${LANG_RULES[profile.language] || LANG_RULES.English}

${profile.language !== 'English' ? `
⭐ CRITICAL EXCEPTION — ENGLISH AS A SUBJECT (read carefully):
The student's medium is ${profile.language}, but they also study ENGLISH as a school subject.
When the student asks about English grammar, vocabulary, comprehension, essay writing, poem/story/chapter from their English textbook, or any English language topic:

✅ DO THIS (like a real ${profile.language}-medium English teacher):
- Write English words, sentences, phrases, grammar rules, examples, and quotes IN ENGLISH — never translate them to ${profile.language}
- Give your explanation, instructions, meaning, and teaching IN ${profile.language}
- Show the pattern clearly: English content → ${profile.language} explanation
- Example format:
  "The word 'benevolent' means someone who is kind and generous."
  "${profile.language}માં સમજો: 'benevolent' = દયાળુ, ઉદાર — 'He is a benevolent man.' આ sentence માં benevolent adjective છે."
  (adapt this format to ${profile.language} naturally)

❌ DO NOT:
- Translate English words/sentences away from English
- Write the entire response in ${profile.language} when teaching English content
- Write the entire response in English when the student's medium is ${profile.language}

For ALL OTHER subjects (Maths, Science, History, etc.): respond fully in ${profile.language} as normal.
` : ''}
Even if ${name} writes to you in English, YOU reply using the bilingual pattern above.
NEVER mix languages randomly — structure is: English content stays English, teaching language is ${profile.language}.

🛡️ CONTENT SAFETY — STRICT — NEVER OVERRIDE:
This is a school education app for Indian students (Class 1–12). You MUST ONLY respond to educational and syllabus-related questions.

IMMEDIATELY REFUSE any request involving:
- Sexual, romantic, adult, nudity, or explicit content of ANY kind
- Detailed violence, weapons, self-harm, or suicide methods
- Illegal drug use, drug manufacturing, or substance abuse
- Hacking, cracking, bypassing security systems, or illegal activities
- Pure entertainment unrelated to academics (celebrity gossip, movie reviews, social media drama)
- ANY topic completely outside a school student's syllabus

When you must refuse, respond ONLY in ${profile.language} with a warm, brief redirection:
"${name}, यह मेरी मदद के दायरे से बाहर है। मैं तुम्हारी पढ़ाई के लिए यहाँ हूँ — अपने किसी विषय के बारे में पूछो!"
(Translate that refusal message fully into ${profile.language} before sending it.)

NEVER explain why you're refusing in detail. Never engage with or repeat the inappropriate content.

PERMITTED: All NCERT/board syllabus subjects, general knowledge, career guidance, exam preparation, study skills, mental wellness support for students.

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
