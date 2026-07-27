# AI Teacher Explain Video — Research Report & Architecture Design

> **Date:** 2026-07-15  
> **Status:** Research Phase Complete  
> **Access:** Admin & Super Admin only  

---

## 1. Repository Comparison Matrix

| Project | Language | Stars | License | CPU Support | Rendering | Animation Type | Educational Focus |
|---------|----------|-------|---------|-------------|-----------|----------------|-------------------|
| **Manim Community** | Python 98% | 39.5k | MIT | ✅ (via Cairo/FFmpeg) | Frame-by-frame PNG→MP4 | Programmatic math | ✅ Strong |
| **Motion Canvas** | TypeScript 78% | 18.8k | MIT | ✅ (via puppeteer/FFmpeg) | Browser-based render | Code-driven vector | ✅ Moderate |
| **Remotion** | TypeScript 76% | 53.3k | Commercial* | ✅ (via Headless Chrome) | React→Frame→MP4 | React components | ❌ General |
| **Piper TTS** | C++ 73% | 11.2k | MIT | ✅ ONNX Runtime | N/A | N/A (speech only) | ✅ |
| **Edge-TTS** | Python 99% | 11.5k | GPL-3.0 | ✅ (no local model) | N/A | N/A (speech only) | ✅ |
| **Coqui TTS** | Python 92% | 45.8k | MPL-2.0 | ⚠️ (slow on CPU) | N/A | N/A (speech only) | ✅ |
| **FFmpeg** | C | 50k+ | LGPL/GPL | ✅ | Video encoding/muxing | N/A | N/A |
| **Mermaid** | JS/TS | 78k+ | MIT | ✅ | SVG diagrams | Static/animated | ✅ Diagrams |
| **D2** | Go | 20k+ | MPL-2.0 | ✅ | Diagrams | Static | ✅ Diagrams |
| **KaTeX** | JS | 19k+ | MIT | ✅ | Math to SVG/HTML | Static | ✅ Math |

> *Remotion requires a company license for commercial use — **disqualified** for "free & open source" requirement.

---

## 2. Research Papers — Key Findings

### Manimator (arXiv:2507.14306, Jul 2025)
- **Architecture:** LLM interprets input → structured scene description → another LLM generates executable Manim Python code
- **Pipeline:** Paper/Prompt → Scene Description JSON → Manim Code Generation → Execution → Video
- **Key Insight:** Two-stage LLM pipeline (planner + coder) significantly improves quality vs single-shot generation
- **Weakness:** No self-repair mechanism; fails silently on malformed code

### ManimAgent (arXiv:2606.30296, Jun 2026)
- **Architecture:** Self-evolving multimodal agent with dual-channel Episodic Memory Bank
- **Pipeline:** Paper section → Manim code → Render → Vision-language model scores keyframes → Memory update
- **Key Innovation:** Carries reflection experience across tasks via positive (M+) and negative (M−) memory channels
- **Repair Strategy:** Multi-round reflection with vision-based validation of rendered frames
- **Key Insight:** Memory-augmented agents dramatically reduce failure rates vs stateless generation

### OmniManim (arXiv:2605.15585)
- **Architecture:** Multi-agent orchestration for complex multi-scene animations
- **Key Insight:** Scene decomposition into independent sub-tasks allows parallel generation and validation

---

## 3. Architecture Decision Records (ADR)

### ADR-001: Animation Engine Choice
**Decision:** Build custom SVG/Canvas renderer (Python + FFmpeg), inspired by Manim's scene graph but simplified for educational video.

**Rationale:**
- Manim: Excellent quality but heavy dependency chain (Cairo, Pango, LaTeX). Overkill for educational whiteboard videos.
- Motion Canvas: TypeScript/browser-based — doesn't fit our Python backend.
- Remotion: Commercial license — violates "free & open source" requirement.
- Our existing system already has a working SVG renderer + FFmpeg pipeline.

**Outcome:** Extend the existing `VideoService` with a modular rendering pipeline.

### ADR-002: TTS Engine Choice
**Decision:** Use `edge-tts` as primary (free, multilingual, high quality) with `piper` as local fallback.

**Rationale:**
- Edge-TTS: Free, no API key, 300+ voices, excellent Indian language support (Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali)
- Piper: Fast local neural TTS (MIT license), works offline, but limited language coverage for Indian languages
- Coqui TTS: Best quality but archived/unmaintained, slow on CPU, MPL license complexity
- Our backend already uses edge-tts for narration

**Outcome:** Keep edge-tts as primary. Add piper as fallback for offline/no-internet scenarios.

### ADR-003: AI Script Generation
**Decision:** Two-stage LLM pipeline (Planner → Script Generator) following Manimator's architecture.

**Rationale:**
- Single-shot generation produces inconsistent scene counts, missing narration
- Two-stage (lesson plan → scene script) allows validation between stages
- ManimAgent's memory approach is too complex for v1 but should be a v2 enhancement

**Outcome:** Stage 1 generates structured lesson plan JSON; Stage 2 converts to scene-by-scene script.

### ADR-004: Rendering Pipeline
**Decision:** SVG generation → PNG frames (Pillow/Cairo) → FFmpeg composite → MP4

**Rationale:**
- CPU-compatible (no GPU required)
- Already proven in our existing video module
- Frame-by-frame allows progress tracking
- FFmpeg handles audio sync, captions, and final encoding

### ADR-005: Diagram Generation
**Decision:** Custom SVG generator with Mermaid for flowcharts/sequences, KaTeX for math.

**Rationale:**
- Mermaid: Excellent for process diagrams, flowcharts, sequences (common in education)
- KaTeX: Fast math rendering to SVG, lighter than MathJax
- Custom SVG: For whiteboard-style drawings, annotated diagrams

### ADR-006: Access Control
**Decision:** Admin/Super Admin only (implemented in Step 1).

**Rationale:**
- Video generation is resource-intensive (AI calls + rendering)
- Quality control — admin reviews before student-facing content
- Cost management — limits AI API usage to authorized users

---

## 4. Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VIDEO GENERATION PIPELINE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────────┐   ┌───────────────────┐   │
│  │  Topic   │──▶│ Lesson       │──▶│ Scene Script      │   │
│  │  Input   │   │ Planner (AI) │   │ Generator (AI)    │   │
│  └──────────┘   └──────────────┘   └───────────────────┘   │
│                                              │               │
│                                              ▼               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SCENE GRAPH                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ Scene 1 │ │ Scene 2 │ │ Scene 3 │ │ Scene N │   │   │
│  │  │ • Type  │ │ • Type  │ │ • Type  │ │ • Type  │   │   │
│  │  │ • SVG   │ │ • SVG   │ │ • SVG   │ │ • SVG   │   │   │
│  │  │ • Narr  │ │ • Narr  │ │ • Narr  │ │ • Narr  │   │   │
│  │  │ • Dur   │ │ • Dur   │ │ • Dur   │ │ • Dur   │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌──────────┐   ┌──────────────┐  ┌──────────────┐         │
│  │  Visual  │   │    TTS       │  │   Subtitle   │         │
│  │ Renderer │   │  Engine      │  │  Generator   │         │
│  │(SVG→PNG) │   │(edge-tts)   │  │  (SRT/VTT)   │         │
│  └──────────┘   └──────────────┘  └──────────────┘         │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         ▼                                    │
│              ┌───────────────────┐                           │
│              │   Video Assembler │                           │
│              │   (FFmpeg)        │                           │
│              │   • Frame timing  │                           │
│              │   • Audio sync    │                           │
│              │   • Captions      │                           │
│              │   • Transitions   │                           │
│              └───────────────────┘                           │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              POST-PROCESSING                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │   │
│  │  │ Thumbnail  │  │    Quiz    │  │  Optimizer   │   │   │
│  │  │ Generator  │  │ Generator  │  │  (compress)  │   │   │
│  │  └────────────┘  └────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Folder Structure (Backend Extension)

```
backend/app/modules/video/
├── __init__.py
├── router.py              # Admin-only endpoints (✅ done)
├── schemas.py             # Request/response models
├── service.py             # Orchestration layer
├── query.py               # DB operations
├── exceptions.py          # Module exceptions
├── pipeline/              # NEW — Modular generation pipeline
│   ├── __init__.py
│   ├── lesson_planner.py  # Stage 1: Topic → Lesson Plan JSON
│   ├── script_generator.py # Stage 2: Lesson Plan → Scene Script
│   ├── scene_graph.py     # Scene data structure & validation
│   ├── visual_renderer.py # SVG → PNG frame rendering
│   ├── tts_engine.py      # Text → Audio (edge-tts + piper fallback)
│   ├── subtitle_gen.py    # Narration → SRT/VTT with timing
│   ├── diagram_gen.py     # Mermaid/KaTeX → SVG for STEM diagrams
│   ├── assembler.py       # FFmpeg: frames + audio + subs → MP4
│   ├── thumbnail_gen.py   # Auto-generate video thumbnail
│   ├── quiz_gen.py        # AI-generated quiz from lesson content
│   └── optimizer.py       # Video compression & quality adjustment
├── renderers/             # NEW — Pluggable visual renderers
│   ├── __init__.py
│   ├── base.py            # Abstract renderer interface
│   ├── whiteboard.py      # Hand-drawn sketch style
│   ├── blackboard.py      # Chalk-on-blackboard style
│   ├── modern.py          # Clean motion graphics style
│   └── diagram.py         # Mermaid/flowchart renderer
└── prompts/               # NEW — AI prompt templates
    ├── __init__.py
    ├── lesson_plan.py     # System prompts for lesson planning
    ├── script_gen.py      # System prompts for scene scripting
    └── quiz_gen.py        # System prompts for quiz generation
```

---

## 6. Timeline Engine Design

```python
# Scene timing model
@dataclass
class SceneTimeline:
    scene_index: int
    start_time_ms: int       # Absolute start in final video
    duration_ms: int         # Total scene duration
    narration_duration_ms: int  # From TTS audio length
    animation_events: list   # [{time_offset_ms, event_type, target}]
    transition_in: str       # fade | slide | draw | none
    transition_out: str      # fade | slide | wipe | none
    
# Timeline calculation:
# 1. Generate TTS audio for each scene → get actual duration
# 2. Add padding (500ms before, 300ms after narration)
# 3. Calculate transition overlap (200ms)
# 4. Sum all scenes → total video duration
```

---

## 7. Rendering Pipeline (CPU Optimized)

```
Scene Script JSON
       │
       ▼
┌─────────────────┐
│ SVG Generation  │  (Python: svgwrite / custom templates)
│ • Math: KaTeX   │
│ • Diagrams: D2  │
│ • Draw: custom  │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Frame Rendering │  (Pillow + cairosvg for SVG→PNG)
│ • 1920x1080     │  (or 1080x1920 for vertical)
│ • 30fps         │
│ • Progressive   │  (draw animation = multi-frame)
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Audio Pipeline  │  (edge-tts → MP3 → normalize)
│ • TTS per scene │
│ • Silence gaps  │
│ • BG music mix  │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ FFmpeg Compose  │
│ • frames + audio│
│ • hardcoded subs│
│ • H.264 encode  │
│ • -preset fast  │  (CPU optimization)
│ • -crf 23       │  (quality/size balance)
└─────────────────┘
       │
       ▼
     MP4 output
```

**CPU Optimization Strategy:**
- Use `-preset fast` (not `ultrafast` — quality matters; not `slow` — too slow on CPU)
- Render at native resolution, no upscaling
- Use frame deduplication (hold still frames longer instead of rendering identical PNGs)
- Parallel TTS generation (all scenes simultaneously via asyncio)
- PNG frame caching (reuse SVG renders for repeated elements)

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Current Sprint) ✅
- [x] Restrict video module to admin/super admin
- [x] Research report complete
- [ ] Refactor existing service into pipeline modules

### Phase 2: Enhanced Script Generation
- [ ] Implement `lesson_planner.py` — structured lesson plan output
- [ ] Implement `script_generator.py` — scene-by-scene detail
- [ ] Add validation layer between stages
- [ ] Support multi-subject prompts (Math, Science, History, etc.)

### Phase 3: Visual Diversity
- [ ] Add `diagram_gen.py` — KaTeX math + Mermaid diagrams
- [ ] Add `blackboard.py` renderer — chalk-on-dark style
- [ ] Add `modern.py` renderer — clean vector graphics
- [ ] Implement progressive draw animations (simulate hand-drawing)

### Phase 4: Educational Enhancements
- [ ] Implement `quiz_gen.py` — auto-generated quiz from lesson content
- [ ] Implement `thumbnail_gen.py` — topic-specific thumbnail
- [ ] Add chapter markers / sections to video
- [ ] Add recap/summary scene auto-generation

### Phase 5: Offline / Local LLM Support
- [ ] Integrate Piper TTS as local fallback
- [ ] Support Ollama/llama.cpp for local AI script generation
- [ ] Full offline mode for schools with no internet

### Phase 6: Advanced Features
- [ ] ManimAgent-style memory bank for improved generation quality
- [ ] Multi-language content generation (not just narration — visual text too)
- [ ] Export to SCORM for LMS integration
- [ ] Batch generation (curriculum → full video series)

---

## 9. Educational Design Principles

Based on research into Bloom's Taxonomy, Mayer's Multimedia Learning Theory, and Cognitive Load Theory:

1. **Coherence Principle:** Remove extraneous material — each scene should teach ONE concept
2. **Signaling Principle:** Use visual cues (arrows, highlights, color) to direct attention
3. **Redundancy Principle:** Don't duplicate narration as on-screen text verbatim (summarize visually)
4. **Temporal Contiguity:** Sync narration with corresponding visual exactly
5. **Segmenting Principle:** Break complex topics into 8-12 short scenes (not one long animation)
6. **Pre-training Principle:** Open with key terms/definitions before diving into mechanisms
7. **Modality Principle:** Present explanations as narration + graphics (not narration + text walls)

---

## 10. Security Review

- ✅ Admin-only access enforced via JWT role check
- ✅ No user-uploaded executable code (AI generates safe SVG/JSON only)
- ✅ FFmpeg runs in subprocess with no shell injection (arguments passed as list)
- ✅ Video files stored with UUID names (no path traversal)
- ✅ R2 storage limits enforced before generation
- ⚠️ Future: Rate-limit admin video generation to prevent AI API abuse
- ⚠️ Future: Scan AI-generated SVG for embedded scripts before rendering

---

## 11. Key Recommendations

1. **Do NOT adopt Remotion** — commercial license violates the "free & open source" mandate
2. **Do NOT adopt Manim directly** — too heavy (requires LaTeX, Cairo system deps). Instead, adopt its *scene graph pattern* and *animation scheduling concepts*
3. **DO keep edge-tts** — already integrated, excellent multilingual Indian language support, zero cost
4. **DO adopt Manimator's two-stage pipeline** — proven to improve output quality significantly
5. **DO plan for ManimAgent's memory pattern** — v2 enhancement for learning from past generations
6. **DO keep the existing SVG renderer** — it works, it's fast, and it's CPU-friendly

---

## 12. Next Steps

1. Approve this research report
2. Begin Phase 2: Refactor `VideoService._call_ai_for_script()` into the two-stage pipeline
3. Create the `pipeline/` directory with modular components
4. Add admin UI controls for new rendering styles and educational settings
