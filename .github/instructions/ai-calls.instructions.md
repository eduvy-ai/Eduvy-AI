---
description: "Use when writing AI API calls, callAI function, fetch to any AI provider, retry logic, rate limit handling, or any code that calls an AI model. Covers multi-provider routing, error handling, backoff strategy, and message history format."
applyTo: "src/**/*.{js,jsx}"
---

# AI Call Rules

## The Only Approved Function — `callAI()` from `shared.js`

Every AI call **must** go through `callAI()` exported from `src/shared.js`. Never call any AI provider's `fetch` endpoint directly in a component.

```js
import { callAI } from '../../shared.js'
// OR (from App.jsx re-exports):
import { callAI } from '../../App.jsx'
```

## Signature

```js
callAI(prompt, systemPrompt, history = [], retries = 3, maxTokens = 1200)
// Returns: Promise<string> — always a string, never throws
```

## Multi-Provider Routing

`callAI` reads `_aiConfig` (module-level in `shared.js`) and routes to the correct provider:

| Provider | Endpoint | Auth header |
|---|---|---|
| `gemini` | `generativelanguage.googleapis.com` | `?key=` query param |
| `groq` | `api.groq.com/openai/v1/chat/completions` | `Authorization: Bearer` |
| `anthropic` | `api.anthropic.com/v1/messages` | `x-api-key` |
| `openai` | `api.openai.com/v1/chat/completions` | `Authorization: Bearer` |

**Gemini-specific:** uses `system_instruction` at top level (NOT in messages), uses `"model"` role (NOT `"assistant"`).

## No API Key Behavior

If `apiKey` is empty, `callAI` returns:
```
"⚠️ No API key set. Tap ⚙️ in the header to open Settings and add your key."
```
Do NOT add extra null checks in components — `callAI` always returns a string.

## Rate Limit Handling — Automatic

Retries with exponential backoff (3× with `(attempt+1) * 3000ms` delay). Never surface raw 429/529 errors to students. After all retries:
```
"⚠️ Rate limit. Please wait and retry."
```

## Usage in Components

```js
// Standard usage
const res = await callAI(userMessage, systemPrompt, chatHistory, 3, 1200)

// Larger outputs (studio, study guide)
const res = await callAI(prompt, sys, [], 3, 2000)

// Quick single-shot
const res = await callAI(prompt, sys)
```

## Updating AI Config

Use `setAIConfig` / `getAIConfig` from `shared.js`. The SettingsModal does this — never update `_aiConfig` directly.

```js
import { setAIConfig, getAIConfig } from '../shared.js'

const cfg = getAIConfig()           // read current config
setAIConfig({ provider, apiKey, model })  // update + persists to localStorage
```

## Anti-Patterns

```js
// ❌ WRONG — hardcoded Anthropic
fetch("https://api.anthropic.com/v1/messages", { ... })

// ❌ WRONG — using VITE_ANTHROPIC_KEY env var (removed)
import.meta.env.VITE_ANTHROPIC_KEY

// ❌ WRONG — naming function 'ai' (reserved-ish)
async function ai() {}

// ✅ CORRECT
const result = await callAI(prompt, systemPrompt, history, 3, 1500)
```

## Rules

- **Model**: Always `claude-sonnet-4-20250514` — never change this
- **max_tokens**: `1200` default — increase only for note generation (up to 2000)
- **History**: Slice last 8 messages — never send full unbounded history
- **Rate limits**: Retry 3× with exponential backoff (`(attempt+1) * 3000ms`) — NEVER show raw API errors to students
- **Friendly errors**: All returned errors start with `⚠️` — caller displays as-is
- **No `async function ai()`**: The function must be named `callAI` — `ai` is a reserved/ambiguous name

## System Prompt Pattern

Always build the system prompt with `buildSystemPrompt()`:

```js
function buildSystemPrompt(profile, modeInstructions = "") {
  return `You are Eduvy-AI, India's most powerful AI tutor.

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

## Anti-Patterns

```js
// ❌ WRONG — exposes raw API error to student
setOutput(data.error.message);

// ❌ WRONG — no retry, no rate limit handling
const res = await fetch("https://api.anthropic.com/v1/messages", { ... });

// ❌ WRONG — wrong function name
async function ai(prompt) { ... }

// ✅ CORRECT
const result = await callAI(prompt, buildSystemPrompt(profile, modeInstr));
```
