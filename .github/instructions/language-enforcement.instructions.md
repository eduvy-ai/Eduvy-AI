---
description: "Use when writing AI system prompts, language instructions, LANG_RULES, buildSystemPrompt, or any feature that must respond in Hindi, Gujarati, Tamil, Marathi, Telugu, Kannada, Bengali, Punjabi, Odia, or Urdu. Covers language enforcement patterns, LANG_RULES constant, and anti-patterns."
applyTo: "src/**/*.{js,jsx}"
---

# Language Enforcement Rules

## The #1 Rule

**Every AI response must be in `profile.language`.** This is non-negotiable. If a student picks Gujarati, every note, quiz, podcast dialogue, flashcard, explanation, and wellness message must be in Gujarati script. No mixing. No fallback to English.

## Where `LANG_RULES` Lives

`LANG_RULES` is defined and exported from `src/shared.js`. Do NOT redefine it in components. Import it:

```js
import { LANG_RULES, buildSystemPrompt } from '../../shared.js'
```

Or use `buildSystemPrompt(profile, instructions)` which already injects `LANG_RULES[profile.language]` automatically.

## How to Inject in Every System Prompt

The language rule must appear **at the top** of every system prompt, explicitly, redundantly:

```js
// ❌ WRONG — vague, AI ignores weak instructions
"Please respond in the student's language."
"Try to use the student's preferred medium."

// ✅ CORRECT — use buildSystemPrompt which handles this automatically
const sys = buildSystemPrompt(profile, `Your extra instructions here in ${profile.language}`)

// ✅ CORRECT — if writing custom system prompt, inject explicitly:
`🚨 LANGUAGE RULE — MANDATORY — NEVER BREAK:
${LANG_RULES[profile.language] || LANG_RULES.English}
YOU MUST write your ENTIRE response in ${profile.language} ONLY.
Even if the student writes to you in English, YOU reply in ${profile.language}.
NEVER write in English if the chosen language is not English.
NEVER mix languages.`
```

## UI Strings Must Use `UI_STRINGS` Map

All visible button labels, placeholders, and headings must come from `UI_STRINGS[profile.language]`:

```js
import { li } from '../../shared.js'
const t = li(profile.language)  // { greeting, back, ask, gen, quiz, notes, grade, next, done, cont, start }

<button>{t.gen}</button>  // ✓ correct
<button>Generate</button>  // ✗ hardcoded English
```

## Injection Checklist

Before shipping any new feature, verify:
- [ ] `buildSystemPrompt` used, OR `LANG_RULES[profile.language]` manually injected
- [ ] All button/label text uses `UI_STRINGS[profile.language]`
- [ ] Podcast dialogue includes language instruction per-exchange
- [ ] Flashcard front + back in student's language
- [ ] Quiz question, options, and explanation in student's language
- [ ] Error/fallback messages avoid English (use `t.done`, etc.)

## Anti-Patterns

```js
// ❌ Missing language rule
buildSystemPrompt(profile, "You are a quiz generator.")
// Should be:
buildSystemPrompt(profile, `Create a quiz in ${profile.language}.`)

// ❌ Hardcoded English in system prompt
"Explain photosynthesis clearly."
// Should be:
`Explain photosynthesis clearly in ${profile.language} only.`

// ❌ Not injecting LANG_RULES in custom prompts
`You are a podcast host. Generate dialogue.`
// Should be:
`You are a podcast host. ALL dialogue in ${profile.language} only.
${LANG_RULES[profile.language]}`
```

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

## How to Inject in Every System Prompt

The language rule must appear **at the top** of every system prompt, explicitly, redundantly:

```js
// ❌ WRONG — vague, AI ignores weak instructions
"Please respond in the student's language."
"Try to use the student's preferred medium."

// ✅ CORRECT — explicit, in the native script, repeated
`🚨 LANGUAGE RULE — MANDATORY — NEVER BREAK:
${LANG_RULES[profile.language] || LANG_RULES.English}
YOU MUST write your ENTIRE response in ${profile.language} ONLY.
Even if the student writes to you in English, YOU reply in ${profile.language}.
NEVER write in English if the chosen language is not English.
NEVER mix languages.`
```

## UI Strings Must Use UI_STRINGS Map

All visible button labels, placeholders, and headings must come from `UI_STRINGS[profile.language]`:

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

## Shorthand Helper (Optional)

```js
const li = lang => UI_STRINGS[lang] || UI_STRINGS.English;
// Usage: li(profile.language).start
// ⚠️ Never name a state variable 'li' — it shadows this helper
```

## Checklist for Every New Feature

- [ ] `LANG_RULES[profile.language]` injected in system prompt?
- [ ] All AI output text in student's language (no hardcoded English strings in prompts)?
- [ ] All button labels from `UI_STRINGS[profile.language]`?
- [ ] JSON prompts instruct AI to write values in student's language?
