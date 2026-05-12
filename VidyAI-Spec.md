# VidyAI Ultimate — Complete Project Specification
> **For AI Coding Assistants:** Read this entire document before writing a single line of code. This is your single source of truth.

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | VidyAI Ultimate |
| **Tagline** | विद्या + AI = आपका भविष्य *(Knowledge + AI = Your Future)* |
| **Type** | AI-powered Education Mobile/Web App |
| **Target Users** | Indian students, Class 1–12, all boards, all languages |
| **Platform** | React (Web PWA) — easily portable to React Native |
| **AI Provider** | Anthropic Claude API (claude-sonnet-4-20250514) |

---

## 2. The Problem We Are Solving

Indian students face these problems every day:

1. **No affordable 24/7 tutor** — coaching classes are expensive, unavailable at night
2. **Language barrier** — most apps are English-only; millions study in Hindi, Gujarati, Tamil, etc.
3. **Fragmented tools** — students use 5–6 different apps for notes, quizzes, videos, doubts
4. **No personalization** — same content for a Class 6 GSEB Gujarati student and a Class 12 CBSE English student
5. **Exam anxiety** — no mental health support built into education tools
6. **Passive learning** — students read but don't practice or self-test

---

## 3. The Solution — What VidyAI Does

VidyAI is a **single app** that replaces all of the above with one intelligent platform:

- A **personal AI tutor** available 24/7 in the student's own language
- **NotebookLM-style document intelligence** — upload any textbook, AI masters it
- **Live class analyzer** — record teacher's class, AI extracts notes and gaps
- **Adaptive brain map** — visual map of what the student knows and doesn't
- **Exam oracle** — AI predicts which topics will appear in board exams
- **AI podcast** — two AI hosts debate and discuss syllabus topics like a show
- **Socratic tutor** — never gives answers, guides student to discover themselves
- **Draw & learn** — student draws a diagram, AI explains it
- **Video intelligence** — finds best YouTube videos + generates animation scripts
- **Mental wellness coach** — handles exam stress, anxiety, motivation

Everything works in **11 Indian languages**. Every word the AI speaks is in the student's chosen medium language.

---

## 4. Project Goal

> **Build a fully working, production-quality React web app that any Indian student can open, set up their profile in 2 minutes, and immediately get personalized AI-powered education in their own language — completely free.**

### Success Criteria
- A Class 10 GSEB student who selects **Gujarati** as medium gets **100% Gujarati** responses from every AI feature
- A Class 12 CBSE student who selects **Hindi** gets **100% Hindi** responses
- Every button tap works — no broken clicks, no silent failures
- Rate limit errors auto-retry silently — student never sees an API error
- The app works on a mobile browser (Chrome/Safari) with proper touch targets

---

## 5. Core Aims & Goals

### Aim 1 — Language First
Every single AI response must be in the student's medium language. This is not optional. This is the most important feature. If a student selects Gujarati, every note, quiz question, explanation, podcast dialogue, flashcard, and wellness message must be in Gujarati script. No mixing. No fallback to English.

### Aim 2 — Everything in One Place
Student should never need to leave the app. Notes, quizzes, videos, tutor, podcast, mental support — all inside VidyAI.

### Aim 3 — Zero Cost for Students
The core app uses the Anthropic API via the Claude.ai artifact system (free tier). No payment required to use the app.

### Aim 4 — Works for Every Indian Student
- Supports Class 1 to Class 12
- Supports 10 major exam boards
- Supports 11 Indian languages
- Subjects auto-populate based on class selection
- Content aligned to each board's curriculum

### Aim 5 — Reliability
- AI calls must retry automatically on rate limits
- JSON parsing must be robust (handle markdown fences, extra text)
- Buttons must always be tappable — never accidentally disabled
- All fonts must load correctly on all devices

---

## 6. Tech Stack

```
Frontend:     React 18 + Vite
Language:     JavaScript (JSX)
Styling:      Inline styles with theme tokens (no Tailwind, no CSS modules)
Font:         Sora (Google Fonts)
AI:           Multi-provider — Google Gemini, Groq, Anthropic Claude, OpenAI GPT — all via direct browser fetch
TTS:          Web Speech API (speechSynthesis) with auto-fallback voice picker
State:        React useState / useRef (no Redux, no Zustand)
Storage:      localStorage for profile + AI config persistence
Backend:      Python FastAPI + SQLite (profile, drafts, XP, sessions)
Build:        Vite
```

**Backend** stores profile, AI config, lesson drafts, and XP/streak. Frontend calls AI providers directly from the browser.

---

## 7. App Architecture

### Global State (in App.jsx)
```
profile = {
  name: string,
  standard: string,       // "Class 10"
  board: string,          // "CBSE"
  language: string,       // "Gujarati" — CONTROLS ALL AI OUTPUT
  subjects: string[],     // ["Mathematics", "Science", ...]
}
xp: number                // gamification points
streak: number            // day streak
docCtx: string            // uploaded document content (shared across tabs)
docName: string           // uploaded document filename
```

### Navigation
5-tab bottom navigation:
```
🏠 Home  |  📖 Notebook  |  🤖 Tutor  |  🎬 Videos  |  ⚗️ Labs
```

### Screen Flow
```
App Launch
    ↓
Splash (3 seconds, animated)
    ↓
Onboard (3 steps — profile setup)
    ↓
Main App Shell
    ├── HomeTab
    ├── NotebookTab
    ├── TutorTab
    ├── VideosTab
    └── LabsTab
            ├── PodcastLab
            ├── QuizLab
            ├── EssayLab
            └── MentalLab
```

---

## 8. Data Constants

### Boards
```js
const BOARDS = [
  "CBSE","ICSE","GSEB","MSBSHSE","RBSE",
  "UP Board","BSEB","TN Board","KAR Board","PSEB"
];
```

### Languages
```js
const LANGS = [
  "English","Hindi","Gujarati","Marathi","Tamil",
  "Telugu","Kannada","Bengali","Punjabi","Odia","Urdu"
];
```

### Subjects Per Class
```js
const SUBS = {
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
};
```

### UI Strings Per Language
Every button label, placeholder, and heading must come from this map:
```js
const UI_STRINGS = {
  English:  { greeting:"Hello",      back:"← Back",    ask:"Ask your doubt...",    gen:"Generate",    quiz:"Start Quiz",         notes:"Generate Notes",    grade:"Grade My Writing",  next:"Next →",   done:"Done ✓",   cont:"Continue →",  start:"Start Learning! 🚀" },
  Hindi:    { greeting:"नमस्ते",      back:"← वापस",    ask:"सवाल पूछें...",        gen:"बनाएं",       quiz:"क्विज़ शुरू",         notes:"नोट्स बनाएं",       grade:"ग्रेड करें",        next:"अगला →",   done:"पूरा ✓",   cont:"जारी रखें →", start:"पढ़ाई शुरू! 🚀" },
  Gujarati: { greeting:"નમસ્તે",      back:"← પાછળ",    ask:"પ્રશ્ન પૂછો...",        gen:"બનાવો",       quiz:"ક્વિઝ શરૂ",           notes:"નોટ્સ બનાવો",       grade:"ગ્રેડ કરો",         next:"આગળ →",    done:"પૂર્ણ ✓",  cont:"ચાલુ રાખો →", start:"ભણવાનું શરૂ! 🚀" },
  Marathi:  { greeting:"नमस्कार",    back:"← मागे",    ask:"प्रश्न विचारा...",      gen:"तयार करा",    quiz:"क्विझ सुरू",          notes:"नोट्स तयार करा",    grade:"ग्रेड करा",         next:"पुढे →",   done:"पूर्ण ✓",  cont:"सुरू ठेवा →", start:"शिकणे सुरू! 🚀" },
  Tamil:    { greeting:"வணக்கம்",    back:"← பின்னால்", ask:"சந்தேகம் கேளுங்கள்...", gen:"உருவாக்கு",   quiz:"வினாடி வினா தொடங்கு", notes:"குறிப்புகள் உருவாக்கு", grade:"தரம் மதிப்பிடு", next:"அடுத்து →", done:"முடிந்தது ✓", cont:"தொடர் →",  start:"கற்றல் தொடங்கு! 🚀" },
  Telugu:   { greeting:"నమస్కారం",   back:"← వెనక్కి", ask:"సందేహం అడగండి...",    gen:"తయారుచేయండి", quiz:"క్విజ్ మొదలు",        notes:"నోట్స్ తయారుచేయండి", grade:"గ్రేడ్ చేయండి",   next:"తదుపరి →", done:"పూర్తి ✓", cont:"కొనసాగించు →", start:"నేర్చుకోవడం మొదలు! 🚀" },
  Kannada:  { greeting:"ನಮಸ್ಕಾರ",    back:"← ಹಿಂದೆ",   ask:"ಸಂದೇಹ ಕೇಳಿ...",        gen:"ರಚಿಸಿ",        quiz:"ರಸಪ್ರಶ್ನೆ ಪ್ರಾರಂಭ",   notes:"ನೋಟ್ಸ್ ರಚಿಸಿ",      grade:"ಶ್ರೇಣಿ ನೀಡಿ",      next:"ಮುಂದೆ →",  done:"ಮುಗಿಯಿತು ✓", cont:"ಮುಂದುವರಿಸಿ →", start:"ಕಲಿಕೆ ಪ್ರಾರಂಭ! 🚀" },
  Bengali:  { greeting:"নমস্কার",    back:"← পিছনে",   ask:"প্রশ্ন জিজ্ঞাসা করুন...", gen:"তৈরি করুন", quiz:"কুইজ শুরু",           notes:"নোটস তৈরি করুন",    grade:"গ্রেড করুন",        next:"পরবর্তী →", done:"সম্পন্ন ✓", cont:"চালিয়ে যান →", start:"শেখা শুরু! 🚀" },
  Punjabi:  { greeting:"ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", back:"← ਵਾਪਸ", ask:"ਸਵਾਲ ਪੁੱਛੋ...",       gen:"ਬਣਾਓ",        quiz:"ਕੁਇਜ਼ ਸ਼ੁਰੂ",          notes:"ਨੋਟਸ ਬਣਾਓ",         grade:"ਗ੍ਰੇਡ ਕਰੋ",        next:"ਅਗਲਾ →",  done:"ਪੂਰਾ ✓",  cont:"ਜਾਰੀ ਰੱਖੋ →", start:"ਪੜ੍ਹਾਈ ਸ਼ੁਰੂ! 🚀" },
  Odia:     { greeting:"ନମସ୍କାର",    back:"← ପଛକୁ",    ask:"ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...",    gen:"ତିଆରି କର",    quiz:"କ୍ୱିଜ ଆରମ୍ଭ",         notes:"ନୋଟ ତିଆରି",          grade:"ଗ୍ରେଡ କର",          next:"ପରବର୍ତ୍ତୀ →", done:"ସଂପୂର୍ଣ ✓", cont:"ଜାରୀ ରଖ →", start:"ଶିଖିବା ଆରମ୍ଭ! 🚀" },
  Urdu:     { greeting:"السلام علیکم", back:"← پیچھے", ask:"سوال پوچھیں...",       gen:"بنائیں",      quiz:"کوئز شروع",            notes:"نوٹس بنائیں",        grade:"گریڈ کریں",         next:"اگلا →",   done:"مکمل ✓",   cont:"جاری رکھیں →", start:"پڑھائی شروع! 🚀" },
};
```

---

## 9. The AI System — Most Important Section

### 9.1 Core AI Caller Function

This function must be used for **every single AI call** in the app. No exceptions.

```js
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callAI(prompt, systemPrompt, history = [], retries = 3) {
  const messages = [
    ...history.slice(-8).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "")
    })),
    { role: "user", content: String(prompt) }
  ];

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: String(systemPrompt),
          messages
        })
      });
      const data = await res.json();

      // Auto-retry on rate limits
      if (
        data.error?.type === "exceeded_limit" ||
        data.error?.type === "rate_limit_error" ||
        res.status === 429 || res.status === 529
      ) {
        if (attempt < retries - 1) {
          await sleep((attempt + 1) * 3000);
          continue;
        }
        return "⚠️ Server busy. Please wait 10 seconds and try again.";
      }

      if (data.error) return "⚠️ " + (data.error.message || "Unknown error");
      return data.content?.[0]?.text || "No response. Please try again.";

    } catch {
      if (attempt < retries - 1) { await sleep(2000); continue; }
      return "⚠️ Network error. Check your connection.";
    }
  }
}
```

### 9.2 Language Enforcement Instructions

These instructions must be injected into **every** system prompt, based on the student's selected language:

```js
const LANG_RULES = {
  English:  "Respond in English only.",
  Hindi:    "RESPOND ONLY IN HINDI USING DEVANAGARI SCRIPT (हिंदी). हर शब्द हिंदी में लिखो। कोई भी English word मत use करो।",
  Gujarati: "RESPOND ONLY IN GUJARATI USING GUJARATI SCRIPT (ગુજરાતી). સંપૂર્ણ જવાબ ગુજરાતી સ્ક્રિપ્ટમાં જ આપો. English અથવા Hindi નહીં.",
  Marathi:  "RESPOND ONLY IN MARATHI USING DEVANAGARI SCRIPT (मराठी). संपूर्ण उत्तर मराठीत द्या. कोणतेही English शब्द वापरू नका.",
  Tamil:    "RESPOND ONLY IN TAMIL USING TAMIL SCRIPT (தமிழ்). முழு பதிலும் தமிழில் மட்டுமே இருக்க வேண்டும்.",
  Telugu:   "RESPOND ONLY IN TELUGU USING TELUGU SCRIPT (తెలుగు). మొత్తం సమాధానం తెలుగులో మాత్రమే ఉండాలి.",
  Kannada:  "RESPOND ONLY IN KANNADA USING KANNADA SCRIPT (ಕನ್ನಡ). ಸಂಪೂರ್ಣ ಉತ್ತರ ಕನ್ನಡದಲ್ಲಿ ಮಾತ್ರ ಇರಬೇಕು.",
  Bengali:  "RESPOND ONLY IN BENGALI USING BENGALI SCRIPT (বাংলা). সম্পূর্ণ উত্তর শুধুমাত্র বাংলায় লিখুন।",
  Punjabi:  "RESPOND ONLY IN PUNJABI USING GURMUKHI SCRIPT (ਪੰਜਾਬੀ). ਪੂਰਾ ਜਵਾਬ ਕੇਵਲ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ।",
  Odia:     "RESPOND ONLY IN ODIA USING ODIA SCRIPT (ଓଡ଼ିଆ). ସମ୍ପୂର୍ଣ୍ଣ ଉତ୍ତର କେବଳ ଓଡ଼ିଆରେ ଲେଖନ୍ତୁ।",
  Urdu:     "RESPOND ONLY IN URDU USING NASTALIQ SCRIPT (اردو). پورا جواب صرف اردو میں لکھیں۔",
};
```

### 9.3 Base System Prompt Builder

Every screen uses this as the foundation for its system prompt:

```js
function buildSystemPrompt(profile, modeInstructions = "") {
  return `You are VidyAI, India's most powerful AI tutor.

STUDENT PROFILE:
- Name: ${profile.name || "Student"}
- Class: ${profile.standard}
- Board: ${profile.board}
- Subjects: ${(profile.subjects || []).join(", ")}

🚨 LANGUAGE RULE — MANDATORY — NEVER BREAK:
${LANG_RULES[profile.language] || LANG_RULES.English}
YOU MUST write your ENTIRE response in ${profile.language} ONLY.
Even if the student writes to you in English, YOU reply in ${profile.language}.
NEVER write in English if the chosen language is not English.
NEVER mix languages.

TEACHING APPROACH:
- Curriculum aligned to ${profile.board}, ${profile.standard}
- Use Indian daily life examples: cricket 🏏, chai ☕, trains, festivals, Bollywood
- Be warm, encouraging, patient, age-appropriate
- End every response with a follow-up question in ${profile.language}

${modeInstructions}`;
}
```

### 9.4 Robust JSON Parsing

All AI features that return JSON (Quiz, Flashcards, Mind Map, Podcast) must parse the response like this:

```js
// For JSON objects {}
function parseAIObject(text) {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found");
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null; // caller handles fallback
  }
}

// For JSON arrays []
function parseAIArray(text) {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("No JSON array found");
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}
```

---

## 10. Feature Specifications

### Feature 1 — Onboarding (3 Steps)

**Step 1 — Personal Details:**
- Input: Full Name (required — show alert if empty on Continue)
- Input: Mobile number (tel type)
- Input: Parent's mobile number (tel type)
- Dropdown: Class (Class 1 to Class 12)
- Dropdown: Board (10 boards)
- Dropdown: Language/Medium (11 languages)
- Show language confirmation note: "All AI responses will be in [Language]"

**Step 2 — Subject Selection:**
- Load subjects from SUBS constant based on selected Class
- Multi-select chips
- "Select All" button
- If student clicks Continue with 0 selected → auto-select all subjects for that class

**Step 3 — Confirmation:**
- Show selected profile summary
- List all features available
- "Start Learning" button (text from UI_STRINGS in student's language)

---

### Feature 2 — Home Tab

**A) Daily Brain Brief**
- Button triggers AI call
- Prompt: Ask AI to create a personalized 90-second morning study plan for today
- Show: focus topic, board-specific exam tip, motivational message, one concept to master tonight
- All in student's language

**B) Knowledge Brain Map**
- SVG element, viewBox="0 0 100 100"
- Plot each subject as a node using preset X,Y positions
- Node colors: #00E5A0 (mastery ≥75%), #FFD166 (45–74%), #FF6B6B (<45%)
- Each node has:
  - Large invisible `<circle r="12" fill="transparent">` for mobile tap detection
  - Visible `<circle r="5">` colored by mastery
  - `<text>` label below node
  - `<text>` mastery % below label
- Tap node → AI generates study plan for that subject in student's language
- Show mastery progress bar + AI response in panel below SVG

**C) Exam Oracle**
- List 5 topics (use student's subjects) with probability %
- Tap any topic → AI gives: likely question types, formulas, memory trick, common mistakes
- All output in student's language

**D) Quick Actions Grid**
- 2-column grid of 6 action buttons
- Each navigates to relevant tab/lab
- Large touch-friendly buttons (minimum 80px height)

---

### Feature 3 — Notebook Tab

**Hub Screen shows 3 sections:**

**Section A — File Upload**
- File input (accept: .txt, .md, .pdf, .jpg, .png, .doc, .docx)
- For `.txt` / `.md` → use `file.text()` to read content
- For all others → use filename + student profile as context string
- On upload success → switch to Chat mode, set docCtx state, set docName state
- docCtx is shared globally (passed to Tutor tab too)

**Section B — Direct Notes Generator**
- Select subject from student's subjects
- Text input for topic
- On submit → AI generates full structured notes in student's language
- Note structure (all sections in student's language):
  - 📌 Overview
  - 🔑 Key Points (minimum 5, numbered)
  - 💡 Important Definitions
  - 🔢 Formulas / Facts
  - 🌍 Real-life Indian Examples
  - ⚠️ Common Exam Mistakes
  - 🎯 3 Important Questions with Answers
  - ⚡ Quick Revision Checklist

**Section C — Live Class Recorder**
- Red pulsing dot + timer display
- Start Recording button → begin timer, simulate live transcription lines
- Stop & Analyze button → send transcript to AI
- AI output (in student's language): Structured Notes + Knowledge Gaps + Questions to Ask + Exam Points

**Chat Mode (after upload):**
- Toolbar shows: 🃏 Cards | 🗺️ Map | 📋 Summary | ✕ Close
- All chat responses cite the uploaded document
- Toolbar buttons generate respective outputs in student's language

**Flashcards Mode:**
- 8 cards per generation
- Card face: question + optional hint
- Card back: detailed answer
- Tap card to flip (CSS transform or state toggle)
- Prev / Next navigation
- Progress dots at bottom
- Difficulty tag per card
- All text in student's language

**Mind Map Mode:**
- Parsed from AI JSON: `{center, branches:[{label, emoji, color, nodes:[]}]}`
- Render as: central topic box → 4 branch boxes each with bullet nodes
- Each branch has its own color
- All text in student's language

**Summary Mode:**
- Full scrollable notes output
- Same structure as direct notes generator

---

### Feature 4 — Tutor Tab

**6 Mode Tabs (horizontal scroll bar at top):**

| Mode | Icon | AI Behaviour |
|------|------|-------------|
| Adaptive | 🧠 | Detect student level from question, adjust depth automatically. Simple question = story + analogy. Advanced question = deeper explanation. |
| Socratic | 🤔 | NEVER give direct answers. Ask 1-2 guiding questions per turn. Lead student to discover answer themselves. Confirm only after student figures it out. |
| Explain | 💡 | Always follow this structure: 1) Simple definition, 2) Indian life analogy, 3) Step-by-step breakdown, 4) Real India example, 5) Board exam tip. |
| Homework | 📝 | Show full working: What's asked → Given data → Choose formula → Step-by-step solution → Verify → Give one similar practice problem. |
| Voice | 🎤 | Show large microphone button. Simulate voice input (set a sample input text). Student can edit then send. |
| Draw | ✏️ | Show HTML canvas. Student draws, then types description. AI identifies diagram and explains: what it is, label each part, how it works, exam questions about it. |

**Draw Canvas Requirements:**
- `<canvas width={320} height={175}>`
- Handle: `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`
- Handle: `onTouchStart`, `onTouchMove`, `onTouchEnd` (with `e.preventDefault()`)
- `touchAction: "none"` on canvas style
- Stroke: color #00E5A0, lineWidth 2.5, lineCap "round"
- Clear button resets canvas
- Description input below canvas
- "Explain My Diagram" button triggers AI call

**Chat behavior across all modes:**
- Maintain conversation history (last 8 messages) per session
- System prompt changes based on active mode
- Mode change → clear chat history
- Starter question buttons shown when chat is empty
- All responses in student's language

---

### Feature 5 — Videos Tab (AI Whiteboard Lessons)

**Full interactive whiteboard lesson player with TTS narration, self-drawing SVG diagrams, and comprehension tracking.**

No YouTube/video discovery sub-tab — the tab is entirely an AI-generated whiteboard lesson experience.

#### Input Area
- Text input for topic (e.g. "Photosynthesis", "Artificial Intelligence")
- **Board Style Picker** — 3 styles as clickable chips:
  - 🖤 Chalk — dark green chalkboard, Caveat cursive font
  - 🖊 Marker — light parchment whiteboard, Patrick Hand font
  - 🎨 Color — dark theme, Sora sans-serif font
- **Difficulty Level Selector** — 3 levels:
  - 🌱 Foundation — simplified, uses analogies
  - 📘 Standard — textbook-aligned, board exam focus
  - 🚀 Advanced — deeper, competition-level content
- 8 suggested topic cards shown when no lesson is active

#### 3-Stage AI Pipeline

**Stage 1 — Content Intelligence** (understanding the topic):
- AI returns: subject, hook question, key concept, prerequisite, misconception, sub-concepts, visual plan (10 scenes → diagram type mapping), key formula, Indian daily-life example
- ~1000 tokens

**Stage 2 — Storyboard** (client-side, no AI call):
- Resolves each scene's diagram type from 21 valid types
- Builds a draw guide string for the AI

**Stage 3 — Full Lesson Script** (AI generates all 10 scenes):
- Returns 10-scene lesson JSON, each scene has: title, visual emojis, visual_type, draw_elements[], diagram_spec (for complex types), content (3–4 teaching sentences), narration_chunks (3 sentences), timing
- Plus lesson-level: title, subject, level, hook, key_formula, keyPoints[], oneLineTakeaway, practiceQ (MCQ)
- ~8192 tokens. Accepts partial lessons (6–9 scenes if truncated)
- Auto-saved to backend draft

Loading UI shows 4 animated stage pills (Understanding → Storyboard → Scripting → Ready).

#### 21 Self-Drawing SVG Diagram Types
All use CSS `stroke-dashoffset` animation. Variant selected via stable FNV-1a hash (same topic = same layout).

**17 template types:** avatar (stick-figure teacher), steps (3 variants), concept (radial mindmap), cycle, formula, comparison (T-chart), timeline, graph (4 curve variants), tree, venn, buildup (equation reveal), funnel, pulse (radial ripple), wave (sine/damped/interference), bar (vertical/horizontal), ball (free body/inclined/projectile), spotlight

**4 LLM-powered types** (AI provides coordinates):
- `flowchart` — auto-layout with yes/no branching
- `mathsteps` — step-by-step equation reveal
- `dataplot` — scatter plot with annotations
- `freeform` — AI provides arbitrary shapes (circle, rect, arrow, path, text, polygon) on a 300×162 canvas

Ambient floating particles + animated pen trace overlay on every board.

#### TTS Narration System (Web Speech API)
- **Voice picker** with 4-tier fallback: exact locale (e.g. hi-IN) → language family (hi-*) → English voices → any available voice
- Within matches: prefers Google > Natural > Microsoft > first available
- Voice status indicator next to play button: 🔊 ready (green) / ⏳ loading / 🔇 none (yellow) / ❌ error (red)
- Clickable test button speaks first 120 chars of current scene content
- Voice pre-loaded on mount + retried at 1s and 3s (Chrome loads voices async)
- `utterRef` holds utterance to prevent garbage collection
- Chrome 15-second freeze bug workaround: `pause()+resume()` every 10s
- Scene ends when **both** TTS `onend` fires **and** minimum scene timer elapses

#### Playback & Controls
- ⏮ prev / ▶ play/⏸ pause / ⏭ next + voice test button + ✕ reset
- Auto-advance: plays scene by scene recursively, shows summary after last scene
- Seek bar with per-scene dots (white=upcoming, accent=passed, green=got-it, red=confused, clickable)
- Storyboard filmstrip (scrollable horizontal row of 64px scene cards)
- Typewriter text reveal: synced to scene duration in play mode, 30ms/char in manual mode
- **Karaoke highlight**: during playback, current spoken word gets accent background via `onboundary`
- **Narration beats**: in manual mode, shows each sentence on separate line with glowing dot indicator

#### Comprehension Tracking
- After typewriter finishes in manual mode, two buttons appear:
  - **🤔 Confused** → marks scene red, triggers AI re-explain with completely different analogy
  - **✅ Got it!** → marks scene green, auto-advances
- Re-explanation cached per scene, shown in yellow card: "💡 Let me try a completely different approach…"

#### Summary Screen
Shown after all scenes complete:
1. Per-scene colour bar (green/red/grey)
2. **Clarity Score** — `(gotCount / totalScenes) × 100%` with colour coding
3. "RE-WATCH THESE" list for confused scenes
4. Key Takeaways bullet list
5. "Tell a Friend" one-liner
6. Key Formula display
7. Practice MCQ (4 options, +5 XP correct, +1 XP incorrect)
8. Rewatch filmstrip
9. "🎬 Learn Something New" reset button

#### XP Awards
- +8 XP on lesson generation
- +5 XP correct quiz answer
- +1 XP incorrect quiz answer

---

### Feature 6 — Labs Tab

**Menu screen** shows 4 lab cards. Tap to enter each.

---

#### Lab A — AI Podcast Studio 🎙️

**Purpose:** Two AI hosts debate and discuss any topic from the syllabus — like a real podcast

**UI flow:**
1. Topic input OR tap a suggested topic chip
2. Optional button: "Podcast from my uploaded document"
3. Generate → AI returns podcast JSON
4. Display episode title + host names
5. Show one exchange at a time
6. "Continue" button reveals next exchange
7. After last exchange → show Key Takeaways + Exam Tip

**Two hosts:**
- **Priya** — enthusiastic, uses Indian examples, storytelling approach
- **Aryan** — analytical, asks deep questions, connects to real world

**AI JSON format:**
```json
{
  "title": "episode title in student's language",
  "exchanges": [
    {"h": "Priya", "t": "dialogue in student's language"},
    {"h": "Aryan", "t": "dialogue in student's language"}
  ],
  "pts": ["key point 1", "key point 2", "key point 3"],
  "tip": "exam tip in student's language"
}
```

**⚠️ CRITICAL:** The state variable for tracking which exchange is showing must be named `lineIdx` — NOT `li` (which conflicts with the `li(lang)` language instruction function)

---

#### Lab B — Quiz Arena 🎯

**Purpose:** Adaptive board-exam style MCQ practice

**UI:**
- Subject filter chips (student's subjects, max 6 visible)
- Difficulty selector: Easy | Medium | Hard
- Score tracker: X/Y correct — Z% accuracy
- Generate Question button
- Question card with 4 options
- Tap option → green highlight correct, red highlight wrong
- Explanation shown after answer
- Next Question button

**AI JSON format:**
```json
{
  "q": "question in student's language",
  "o": ["A) option", "B) option", "C) option", "D) option"],
  "c": "A",
  "e": "explanation in student's language",
  "concept": "concept name"
}
```

---

#### Lab C — Essay Grader ✍️

**Purpose:** AI board examiner grades student's writing

**UI:**
- Writing type tabs: Essay | Letter | Paragraph | Answer
- Large textarea for student's writing
- Grade button
- Output in student's language

**AI grading output must include:**
- 🎓 Grade (A+/A/B+/B/C) + Marks out of 10
- ✅ Strengths (3 specific points)
- ❌ Improvements needed (3 specific points)
- 📝 Language & grammar feedback
- 💬 Better phrases (show original → improved)
- 🎯 Board examiner's comment
- 📈 Predicted exam score

---

#### Lab D — Mental Wellness Coach 🧘

**Purpose:** Support exam anxiety, motivation, burnout — like a counselor

**UI:** Full chat interface

**AI system prompt for this mode:**
- Be warm, empathetic, non-judgmental
- Help with: exam anxiety, procrastination, motivation, parent pressure, burnout, self-doubt, comparison stress
- Use CBT reframing, breathing exercises, Pomodoro technique, positive affirmations
- Reference Indian cultural context naturally
- For serious issues → gently suggest speaking to a counselor or trusted adult
- NEVER diagnose anything
- All in student's language

---

## 11. Design System

### Color Tokens
```js
const COLORS = {
  bg:     "#04040e",  // App background
  card:   "#0b0b1c",  // Card/panel background
  card2:  "#101022",  // Nested card background
  border: "#ffffff08",// Subtle dividers
  green:  "#00E5A0",  // Primary CTA, mastered, success
  yellow: "#FFD166",  // Warning, learning state, podcast
  red:    "#FF6B6B",  // Error, weak state, danger
  blue:   "#7B9CFF",  // Info, Aryan podcast host
  orange: "#FF6B35",  // Hot/urgent, Priya podcast host
  text:   "#eeeeff",  // Primary text
  muted:  "#6868a0",  // Secondary/placeholder text
};
```

### Typography
```js
// Font: Sora from Google Fonts
// Import in CSS: @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');

// Global CSS MUST include:
// body, input, textarea, select, button { font-family: 'Sora', sans-serif; }
// button { cursor: pointer; -webkit-tap-highlight-color: rgba(0,0,0,0); }
// button:disabled { opacity: 0.5; cursor: not-allowed; }
```

### Primary Button
```js
{
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  border: "none",
  borderRadius: 13,
  padding: "12px 18px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}
```

### Chat Message Bubbles
```js
// User message (right side)
{
  alignSelf: "flex-end",
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  fontWeight: 600,
  borderRadius: 14,
  borderBottomRightRadius: 3,
  padding: "10px 12px",
  maxWidth: "88%",
  fontSize: 13,
}

// AI message (left side)
{
  alignSelf: "flex-start",
  background: "#101022",
  border: "1px solid #ffffff08",
  color: "#eeeeff",
  borderRadius: 14,
  borderBottomLeftRadius: 3,
  padding: "10px 12px",
  maxWidth: "88%",
  fontSize: 13,
}
```

---

## 12. Rules That Must Never Be Broken

These rules caused bugs in every previous build. Follow them exactly.

### Rule 1 — Never Use Reserved Names for Functions
```js
// ❌ WRONG
async function ai() {}   // 'ai' is ambiguous
function sys() {}        // 'sys' conflicts with browser internals

// ✅ CORRECT
async function callAI() {}
function buildSystemPrompt() {}
```

### Rule 2 — Never Name State Variable 'li'
```js
// ❌ WRONG — 'li' conflicts with the li(lang) language lookup function
const [li, setLi] = useState(0);

// ✅ CORRECT
const [lineIdx, setLineIdx] = useState(0);
```

### Rule 3 — Never Parse JSON Directly from AI Response
```js
// ❌ WRONG — breaks when AI adds explanation text or markdown
JSON.parse(response)
JSON.parse(response.trim())

// ✅ CORRECT — extract JSON boundaries first
const clean = response.replace(/```json|```/g, "").trim();
const start = clean.indexOf("{");  // or "["
const end = clean.lastIndexOf("}");  // or "]"
const parsed = JSON.parse(clean.slice(start, end + 1));
```

### Rule 4 — Nav Buttons Must Never Be Disabled
```js
// ❌ WRONG — user can get trapped in a loading state
<button disabled={loading} onClick={() => setTab("home")}>

// ✅ CORRECT — only disable action buttons, never navigation
<button onClick={() => setTab("home")}>Home</button>  // always enabled
<button disabled={loading} onClick={generateNotes}>Generate</button>  // ok
```

### Rule 5 — All Buttons Must Have fontFamily
```js
// ❌ WRONG — buttons inherit system font, looks broken on some devices
<button style={{ background: "#00E5A0" }}>Click</button>

// ✅ CORRECT — either set globally in CSS or per-button
// In global CSS: button { font-family: 'Sora', sans-serif; }
```

### Rule 6 — SVG Nodes Need Large Touch Targets
```js
// ❌ WRONG — r=4 circle is impossible to tap on mobile
<circle cx={x} cy={y} r="4" onClick={handler} />

// ✅ CORRECT — invisible large hit area behind the visible dot
<g onClick={handler} style={{ cursor: "pointer" }}>
  <circle cx={x} cy={y} r="12" fill="transparent" />  {/* hit area */}
  <circle cx={x} cy={y} r="5"  fill={color} />         {/* visible */}
</g>
```

### Rule 7 — Language Rule Must Be Explicit and Redundant
```js
// ❌ WRONG — AI ignores weak language instructions
"Please respond in the student's language."

// ✅ CORRECT — explicit, in the native script, repeated
`RESPOND ONLY IN GUJARATI USING GUJARATI SCRIPT (ગુજરાતી).
સંપૂર્ણ જવાબ ગુજરાતી સ્ક્રિપ્ટમાં આપો.
Do NOT use English. Do NOT use Hindi. Only Gujarati script.`
```

### Rule 8 — Handle Rate Limits Silently
```js
// ❌ WRONG — shows raw API error to student
return data.error.message;

// ✅ CORRECT — retry 3 times with backoff, show friendly message
if (data.error?.type === "exceeded_limit" || res.status === 429) {
  if (attempt < retries - 1) { await sleep((attempt + 1) * 3000); continue; }
  return "⚠️ Server busy. Please wait 10 seconds and try again.";
}
```

---

## 13. Build Order

Build in this exact sequence. Test each step before proceeding.

```
Step 1:  Project setup (Vite + React)
Step 2:  Global CSS + Sora font + color tokens
Step 3:  callAI() function with retry logic
Step 4:  buildSystemPrompt() function
Step 5:  All constants (BOARDS, LANGS, SUBS, UI_STRINGS, LANG_RULES)
Step 6:  Splash screen
Step 7:  Onboard screen (3 steps, with validation)
Step 8:  App shell (header + bottom nav + tab routing)
Step 9:  HomeTab (brief + brain map + oracle + quick actions)
Step 10: NotebookTab (hub + upload + notes + recorder + chat + cards + map + summary)
Step 11: TutorTab (6 modes + draw canvas + voice simulation)
Step 12: VideosTab (script generator + video discovery)
Step 13: LabsTab menu
Step 14: PodcastLab
Step 15: QuizLab
Step 16: EssayLab
Step 17: MentalLab
Step 18: End-to-end language test (switch to Gujarati, test every feature)
Step 19: End-to-end click test (tap every button, verify no broken interactions)
Step 20: Mobile responsiveness check (max-width 480px, touch targets)
```

---

## 14. AI Prompt Templates (Ready to Use)

### Notes Generation
```
Create detailed exam-ready notes on: "[TOPIC]"
For: [CLASS] [BOARD] student | Subject: [SUBJECT]
Language: Write EVERYTHING in [LANGUAGE] only.

Structure (all in [LANGUAGE]):
📌 Overview
🔑 Key Points (5+, numbered)
💡 Important Definitions
🔢 Formulas and Facts
🌍 Real-life Indian Examples (cricket, chai, trains, festivals)
⚠️ Common Exam Mistakes
🎯 3 Important Questions with Answers
⚡ Quick Revision Checklist
```

### Quiz Question
```
Generate ONE [DIFFICULTY] MCQ for [CLASS] [BOARD] on [SUBJECT].
Write question, all 4 options, and explanation in [LANGUAGE] only.
Return ONLY valid JSON (no markdown, no extra text):
{"q":"...","o":["A) ...","B) ...","C) ...","D) ..."],"c":"A","e":"...","concept":"..."}
```

### Flashcards
```
Create 8 exam flashcards from this material for [CLASS] [BOARD].
Write ALL questions, answers, and hints in [LANGUAGE] only.
Return ONLY a valid JSON array (no markdown):
[{"q":"question","a":"answer","hint":"memory trick","d":"easy|medium|hard"}]
```

### Mind Map
```
Create a mind map in [LANGUAGE] only.
Return ONLY valid JSON (no markdown):
{"center":"main topic","branches":[
  {"label":"Branch Name","emoji":"🔬","color":"#00E5A0","nodes":["point 1","point 2","point 3"]},
  {"label":"Branch Name","emoji":"📊","color":"#FFD166","nodes":["point 1","point 2","point 3"]},
  {"label":"Branch Name","emoji":"⚡","color":"#7B9CFF","nodes":["point 1","point 2"]},
  {"label":"Branch Name","emoji":"🎯","color":"#FF6B6B","nodes":["point 1","point 2","point 3"]}
]}
```

### Podcast Episode
```
Create an educational podcast on "[TOPIC]" for [CLASS] [BOARD].
ALL dialogue MUST be in [LANGUAGE] only — zero English unless language IS English.
Hosts: Priya (enthusiastic, Indian examples) + Aryan (analytical, deep questions).
Return ONLY valid JSON (no markdown):
{"title":"...","exchanges":[
  {"h":"Priya","t":"dialogue in [LANGUAGE]"},
  {"h":"Aryan","t":"dialogue in [LANGUAGE]"},
  {"h":"Priya","t":"..."},
  {"h":"Aryan","t":"..."},
  {"h":"Priya","t":"..."},
  {"h":"Aryan","t":"..."}
],"pts":["key point 1","key point 2","key point 3"],"tip":"exam tip"}
```

---

## 15. Definition of Done

The project is complete only when ALL of these pass:

### Language Tests
- [ ] Select Gujarati → every AI response is in Gujarati script
- [ ] Select Hindi → every AI response is in Hindi Devanagari script
- [ ] Select Tamil → every AI response is in Tamil script
- [ ] No English words appear in non-English responses

### Functionality Tests
- [ ] Onboard saves profile and persists on reload
- [ ] All 5 tabs navigate without error
- [ ] Home brain map nodes are tappable and produce AI output
- [ ] Exam Oracle deep-dive works for all 5 topics
- [ ] Daily Brief generates correctly
- [ ] File upload switches to chat mode
- [ ] Document chat responds from the uploaded content
- [ ] Flashcards flip on tap and show in student's language
- [ ] Mind map renders as visual branching structure
- [ ] Subject notes generate without upload
- [ ] Live recorder starts, runs, stops, and produces notes
- [ ] All 6 tutor modes produce different AI behavior
- [ ] Draw canvas accepts mouse and touch input
- [ ] Draw canvas clear button works
- [ ] "Explain My Diagram" produces AI output
- [ ] Voice mode simulates input correctly
- [ ] Video lesson generates 10-scene whiteboard lesson in student's language
- [ ] Video lesson TTS narration plays with fallback voice if native unavailable
- [ ] Video 21 diagram types render correctly (template + LLM-powered)
- [ ] Video comprehension gate (Got-it / Confused) tracks per scene
- [ ] Video re-explain generates different analogy for confused scenes
- [ ] Video summary screen shows clarity score + key takeaways + practice MCQ
- [ ] Video auto-advance plays all scenes then shows summary
- [ ] Podcast plays line by line and completes
- [ ] Quiz shows correct/wrong highlights + explanation
- [ ] Essay grader returns structured feedback in student's language
- [ ] Mental coach conversation works in student's language

### Technical Tests
- [ ] Rate limit errors auto-retry — user never sees raw API error
- [ ] All JSON parsing handles AI markdown fences
- [ ] No console errors on normal usage
- [ ] All buttons tap correctly on mobile browser
- [ ] No buttons accidentally disabled during loading
- [ ] App renders correctly at max-width 480px
- [ ] Bottom nav always visible and functional

---

*VidyAI Ultimate — विद्या + AI = आपका भविष्य*
*Every student deserves a world-class tutor in their own language.*
