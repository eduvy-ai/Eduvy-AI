---
description: "Use when parsing AI responses as JSON, handling JSON from quiz, flashcard, mindmap, podcast features, or any code that calls JSON.parse on AI output. Covers parseAIObject, parseAIArray helpers and safe extraction patterns."
applyTo: "src/**/*.{js,jsx}"
---

# JSON Parsing Rules

## Never Call JSON.parse Directly on AI Responses

AI responses frequently include markdown fences (` ```json `) or extra explanation text before/after the JSON. Direct `JSON.parse` always breaks on these.

```js
// ❌ WRONG — breaks when AI adds explanation text or markdown fences
JSON.parse(response)
JSON.parse(response.trim())

// ✅ CORRECT — always use boundary extraction first
```

## Import the Helpers — from `shared.js`

Do NOT copy-paste these functions into components. They live in `src/shared.js` and are re-exported from `App.jsx`:

```js
import { parseAIObject, parseAIArray } from '../../shared.js'
// OR (same thing via re-export):
import { parseAIObject, parseAIArray } from '../../App.jsx'
```

## Helper Implementations (for reference only — do not duplicate)

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

## Usage Patterns

### Quiz Question
```js
const parsed = parseAIObject(response);
if (!parsed) { setError("Could not parse quiz. Try again."); return; }
setQuestion(parsed);  // { q, o, c, e, concept }
```

### Flashcards (array)
```js
const cards = parseAIArray(response);
if (!cards || !cards.length) { setError("Could not parse flashcards. Try again."); return; }
setFlashcards(cards);  // [{ q, a, hint, d }]
```

### Mind Map (object)
```js
const map = parseAIObject(response);
if (!map?.center || !map?.branches) { setError("Could not parse mind map. Try again."); return; }
setMindMap(map);  // { center, branches: [{ label, emoji, color, nodes[] }] }
```

### Podcast (object)
```js
const ep = parseAIObject(response);
if (!ep?.exchanges?.length) { setError("Could not parse podcast. Try again."); return; }
setEpisode(ep);  // { title, exchanges: [{ h, t }], pts[], tip }
```

## Null Handling

`parseAIObject` and `parseAIArray` return `null` on failure — **always check before using**:

```js
// ❌ WRONG — crashes if parsing fails
const { q, o } = parseAIObject(response);

// ✅ CORRECT
const data = parseAIObject(response);
if (!data) { /* show user-friendly retry message */ return; }
const { q, o } = data;
```

## AI Prompt Tips to Improve Parse Success

Always include this instruction in prompts that expect JSON:

> `Return ONLY valid JSON (no markdown, no extra text):`

This reduces but does not eliminate markdown wrapping — always use the safe parsers regardless.
