from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import httpx
import re
import asyncio
import functools
import concurrent.futures

router = APIRouter()


class FetchRequest(BaseModel):
    url: str


class FetchResponse(BaseModel):
    content: str
    isYouTube: bool


_YOUTUBE_RE = re.compile(r"youtube\.com|youtu\.be", re.IGNORECASE)
_MAX_CHARS = 10_000


# ── YouTube Search via yt-dlp ─────────────────────────────────

class VideoResult(BaseModel):
    id: str
    title: str
    channel: str
    thumbnail: str
    duration: int
    views: int
    uploaded: str


class VideoInfo(BaseModel):
    title: str
    channel: str
    description: str
    duration: int
    views: int
    thumbnail: str
    captions: str


def _yt_search(query: str, limit: int = 10) -> list[dict]:
    """Run yt-dlp search synchronously (called in thread)."""
    import yt_dlp
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'extract_flat': True,
        'default_search': f'ytsearch{limit}',
        'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        r = ydl.extract_info(f'ytsearch{limit}:{query}', download=False)
        entries = r.get('entries') or []
        results = []
        for e in entries:
            results.append({
                'id': e.get('id', ''),
                'title': e.get('title', ''),
                'channel': e.get('channel') or e.get('uploader') or '',
                'thumbnail': e.get('thumbnail') or f"https://i.ytimg.com/vi/{e.get('id', '')}/hqdefault.jpg",
                'duration': int(e.get('duration') or 0),
                'views': int(e.get('view_count') or 0),
                'uploaded': e.get('upload_date') or '',
            })
        return results


# ── Smart multi-query YouTube search ─────────────────────────

# Educational YouTube channels for each subject — used to bias search queries
_YT_EDU_CHANNELS = {
    "physics":     "PhysicsWallah OR Vedantu OR Khan Academy",
    "chemistry":   "PhysicsWallah OR Unacademy OR Khan Academy",
    "mathematics": "Cuemath OR Khan Academy OR Vedantu OR 3Blue1Brown",
    "math":        "Cuemath OR Khan Academy OR Vedantu",
    "biology":     "Unacademy OR Vedantu OR Khan Academy",
    "science":     "PhysicsWallah OR Khan Academy OR Vedantu",
    "history":     "Unacademy OR Khan Academy",
    "geography":   "Unacademy OR Khan Academy",
    "economics":   "Unacademy OR Khan Academy",
    "english":     "Unacademy OR Khan Academy",
    "computer":    "CodeWithHarry OR Kunal Kushwaha OR freeCodeCamp",
    "python":      "CodeWithHarry OR Corey Schafer OR freeCodeCamp",
}

def _build_smart_yt_queries(topic: str, base_words: list[str], concept_words: list[str]) -> list[str]:
    """Build 3 targeted YouTube search queries for a topic using concept expansion.

    Returns queries that target:
    1. Core concept fundamentals (first chunk of concept words)
    2. Quick revision / shortcut tricks (second chunk)
    3. Topic-specific exam tips or formulae (third chunk)
    """
    # Split concept words into 3 groups
    chunk = max(4, len(concept_words) // 3)
    g1 = concept_words[:chunk]
    g2 = concept_words[chunk:chunk*2]
    g3 = concept_words[chunk*2:chunk*3]

    # Modifiers that encourage short, educational content
    modifiers = [
        "explained in 60 seconds short",
        "quick revision tricks shortcut",
        "important formula concepts short",
    ]

    queries = []
    groups = [g1, g2, g3]
    for i, (group, mod) in enumerate(zip(groups, modifiers)):
        if group:
            terms = " ".join(group[:5])
            queries.append(f"{topic} {terms} {mod}")
        else:
            queries.append(f"{topic} {mod}")

    return queries


def _smart_yt_search_sync(
    topic: str,
    base_words: list[str],
    concept_words: list[str],
    limit: int = 12,
    max_duration: int = 180,
) -> list[dict]:
    """Run 3 targeted YouTube sub-queries in parallel threads.

    Merges results, deduplicates by video ID, scores by concept relevance,
    filters by duration, and returns the top `limit` videos.
    """
    queries = _build_smart_yt_queries(topic, base_words, concept_words)
    per_q = max(8, limit)

    all_results: list[dict] = []
    seen_ids: set[str] = set()

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(_yt_search, q, per_q): q for q in queries}
        for future in concurrent.futures.as_completed(futures, timeout=28):
            try:
                for r in future.result():
                    vid_id = r.get("id", "")
                    if not vid_id or vid_id in seen_ids:
                        continue
                    seen_ids.add(vid_id)
                    # Score by concept relevance (title only — no captions here)
                    title_lower = r["title"].lower()
                    score = 0
                    for w in base_words:
                        if w in title_lower:
                            score += 3
                    for w in concept_words:
                        if w in title_lower:
                            score += 2
                    r["_score"] = score
                    all_results.append(r)
            except Exception:
                pass

    # Sort: relevance score first, then view count as tie-breaker
    all_results.sort(key=lambda r: (r.pop("_score"), r.get("views", 0)), reverse=True)

    # Prefer short videos but keep anything educational if we don't have enough
    short = [r for r in all_results if 0 < r["duration"] <= max_duration]
    if len(short) >= 4:
        return short[:limit]
    # Fallback: mix short + longer, prioritised by score
    return all_results[:limit]


@router.get("/youtube/smart-search")
async def youtube_smart_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(12, ge=1, le=20),
    max_duration: int = Query(180, ge=30, le=600),
):
    """Smart topic-aware YouTube search.

    Expands the query into concept-level keywords, builds 3 targeted
    sub-queries, runs them in parallel, and returns the most educationally
    relevant short videos — deduplicated and scored.
    """
    q_lower = q.lower().strip()
    stopwords = {"the", "and", "for", "with", "from", "that", "this", "are", "was", "how", "what", "why"}
    base_words = [w for w in re.split(r'\W+', q_lower) if len(w) >= 3 and w not in stopwords]
    if q_lower not in base_words:
        base_words.insert(0, q_lower)

    concept_words = [w for w in _expand_query_words(q_lower, base_words) if w not in base_words]

    loop = asyncio.get_event_loop()
    try:
        results = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                functools.partial(_smart_yt_search_sync, q_lower, base_words, concept_words, limit, max_duration),
            ),
            timeout=35.0,
        )
        return {"items": results, "queries_used": _build_smart_yt_queries(q_lower, base_words, concept_words)}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Smart search timed out")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200])


# ── Creator-targeted YouTube Shorts ──────────────────────────
# Instagram's server-side API is reliably blocked. We instead search YouTube
# for content from the same Indian educational creators, which is 100% reliable.

# ── Edu Reels — unified YouTube Shorts feed ──────────────────
# Combines creator-targeted queries + smart concept queries.
# Strictly filters to ≤ 90s (real Shorts format). Deduplicates.

_CREATOR_QUERIES: dict[str, list[str]] = {
    "physics":     ["PhysicsWallah physics #shorts", "Vedantu physics #shorts", "Unacademy physics #shorts"],
    "chemistry":   ["PhysicsWallah chemistry #shorts", "Vedantu chemistry #shorts", "Unacademy chemistry #shorts"],
    "mathematics": ["Vedantu maths #shorts", "Cuemath maths #shorts", "Unacademy maths #shorts"],
    "math":        ["Vedantu maths #shorts", "Cuemath maths #shorts", "Unacademy maths #shorts"],
    "biology":     ["Vedantu biology #shorts", "Unacademy biology #shorts", "PhysicsWallah biology #shorts"],
    "science":     ["PhysicsWallah science #shorts", "Vedantu science #shorts", "Unacademy science #shorts"],
    "history":     ["Unacademy history #shorts", "Vedantu history #shorts", "History facts #shorts"],
    "geography":   ["Unacademy geography #shorts", "Vedantu geography #shorts"],
    "economics":   ["Unacademy economics #shorts", "Vedantu economics #shorts"],
    "english":     ["Unacademy english #shorts", "Vedantu english grammar #shorts"],
    "computer":    ["CodeWithHarry #shorts", "Kunal Kushwaha #shorts", "Apna College #shorts"],
    "python":      ["CodeWithHarry python #shorts", "Python tutorial #shorts"],
    "neet":        ["PhysicsWallah NEET #shorts", "Vedantu NEET #shorts", "Unacademy NEET #shorts"],
    "jee":         ["PhysicsWallah JEE #shorts", "Unacademy JEE #shorts", "Vedantu JEE #shorts"],
    "ai":          ["AI explained #shorts", "Artificial Intelligence #shorts", "Machine learning #shorts"],
}

_SHORTS_PROMO = {
    "subscribe", "follow", "like", "comment", "share", "giveaway",
    "discount", "offer", "coupon", "enroll", "admission", "batch",
    "motivation", "inspirational", "vlog", "daily routine",
}

def _score_short(title: str, base_words: list[str], concept_words: list[str]) -> int:
    t = title.lower()
    # Block promo/motivational content
    if any(p in t for p in _SHORTS_PROMO):
        return -5
    score = 0
    for w in base_words:
        if w in t:
            score += 4
    for w in concept_words:
        if w in t:
            score += 2
    # Boost actual Shorts indicators
    if "#shorts" in t or "shorts" in t or " short " in t:
        score += 3
    if any(x in t for x in ["explained", "formula", "trick", "concept", "revision", "quick"]):
        score += 2
    return score


def _edu_reels_sync(
    topic: str,
    base_words: list[str],
    concept_words: list[str],
    limit: int = 16,
) -> list[dict]:
    """Fetch a unified feed of short educational YouTube videos (≤ 90s).

    Runs 6 parallel queries:
    - 3 creator-targeted (#shorts from PhysicsWallah, Vedantu, Unacademy, etc.)
    - 3 concept-targeted (topic + concept keywords + #shorts)
    Deduplicates, scores by educational relevance, strictly filters to ≤ 90s.
    """
    # Creator queries
    creator_bases = _CREATOR_QUERIES.get("general", [
        f"PhysicsWallah {topic} #shorts",
        f"Vedantu {topic} #shorts",
        f"Unacademy {topic} #shorts",
    ])
    for key, bases in _CREATOR_QUERIES.items():
        if key in topic.lower():
            creator_bases = bases
            break

    # Concept queries
    concept_q = " ".join(concept_words[:3]) if concept_words else topic
    concept_queries = [
        f"{topic} explained #shorts",
        f"{topic} {concept_q} #shorts",
        f"{topic} quick revision short",
    ]

    all_queries = list(creator_bases[:3]) + concept_queries

    per_q = max(8, limit)
    all_results: list[dict] = []
    seen_ids: set[str] = set()

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(_yt_search, q, per_q): q for q in all_queries}
        for future in concurrent.futures.as_completed(futures, timeout=32):
            try:
                for r in future.result():
                    vid_id = r.get("id", "")
                    if not vid_id or vid_id in seen_ids:
                        continue
                    seen_ids.add(vid_id)
                    r["_score"] = _score_short(r.get("title", ""), base_words, concept_words)
                    all_results.append(r)
            except Exception:
                pass

    # Remove blocked items
    all_results = [r for r in all_results if r["_score"] >= 0]
    all_results.sort(key=lambda r: (r["_score"], r.get("views", 0)), reverse=True)
    for r in all_results:
        r.pop("_score", None)

    # Strictly prefer ≤ 90s (real Shorts), fall back to ≤ 180s if too few
    strict = [r for r in all_results if 0 < r["duration"] <= 90]
    relaxed = [r for r in all_results if 0 < r["duration"] <= 180]
    feed = strict if len(strict) >= 6 else relaxed if len(relaxed) >= 4 else all_results
    return feed[:limit]


@router.get("/youtube/edu-reels")
async def youtube_edu_reels(
    q: str = Query(..., min_length=1),
    limit: int = Query(16, ge=1, le=24),
):
    """Unified Edu Reels feed — YouTube Shorts from top Indian educators.

    Combines creator-targeted and concept-targeted queries, strictly filters
    to short videos (≤ 90s preferred), deduplicates, and scores by relevance.
    This is the primary endpoint for the Reels tab.
    """
    q_lower = q.lower().strip()
    stopwords = {"the", "and", "for", "with", "from", "that", "this", "are", "was", "how", "what", "why"}
    base_words = [w for w in re.split(r'\W+', q_lower) if len(w) >= 3 and w not in stopwords]
    if q_lower not in base_words:
        base_words.insert(0, q_lower)
    concept_words = [w for w in _expand_query_words(q_lower, base_words) if w not in base_words]

    loop = asyncio.get_event_loop()
    try:
        results = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                functools.partial(_edu_reels_sync, q_lower, base_words, concept_words, limit),
            ),
            timeout=38.0,
        )
        return {"items": results, "count": len(results)}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Edu reels search timed out")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200])


# Keep old endpoints for backward compatibility
@router.get("/youtube/creator-shorts")
async def youtube_creator_shorts(
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=16),
):
    """Alias — redirects to edu-reels with same params."""
    return await youtube_edu_reels(q=q, limit=limit)


def _yt_video_info(video_id: str) -> dict:
    """Get full video info + captions via yt-dlp (called in thread)."""
    import yt_dlp
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'no_warnings': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'hi'],
        'subtitlesformat': 'vtt',
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
        # Extract captions text
        captions = ''
        subs = info.get('subtitles') or info.get('automatic_captions') or {}
        for lang in ['en', 'hi']:
            if lang in subs and subs[lang]:
                for fmt in subs[lang]:
                    if fmt.get('ext') == 'vtt' and fmt.get('url'):
                        try:
                            import urllib.request
                            with urllib.request.urlopen(fmt['url'], timeout=10) as resp:
                                raw = resp.read().decode('utf-8', errors='ignore')
                                # Strip VTT formatting
                                raw = re.sub(r'WEBVTT.*?\n\n', '', raw)
                                raw = re.sub(r'\d{2}:\d{2}[\d:.,\-> ]+\n', '', raw)
                                raw = re.sub(r'<[^>]+>', '', raw)
                                captions = re.sub(r'\n{2,}', '\n', raw).strip()[:4000]
                        except Exception:
                            pass
                        break
            if captions:
                break

        return {
            'title': info.get('title', ''),
            'channel': info.get('channel') or info.get('uploader') or '',
            'description': (info.get('description') or '')[:2000],
            'duration': int(info.get('duration') or 0),
            'views': int(info.get('view_count') or 0),
            'thumbnail': info.get('thumbnail') or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            'captions': captions,
        }


@router.get("/youtube/search")
async def youtube_search(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=20)):
    """Search YouTube videos — no API key needed."""
    loop = asyncio.get_event_loop()
    try:
        results = await loop.run_in_executor(None, functools.partial(_yt_search, q, limit))
        return {"items": results}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"YouTube search failed: {str(exc)[:200]}")


@router.get("/youtube/video/{video_id}")
async def youtube_video_info(video_id: str):
    """Get video details + captions for a YouTube video."""
    if not re.match(r'^[A-Za-z0-9_-]{11}$', video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    loop = asyncio.get_event_loop()
    try:
        info = await loop.run_in_executor(None, functools.partial(_yt_video_info, video_id))
        return info
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Video info failed: {str(exc)[:200]}")


# ── Instagram Reels ─────────────────────────────────────────────

_INSTA_EDUCATORS = {
    "physics": ["physicswallah", "unacademy", "vedantu"],
    "chemistry": ["unacademy", "neetprep", "physicswallah"],
    "mathematics": ["mathongo", "unacademy", "physicswallah"],
    "math": ["mathongo", "unacademy"],
    "biology": ["neetprep", "byjus", "vedantu"],
    "science": ["physicswallah", "byjus", "vedantu", "unacademy"],
    "ai": ["codewithharry", "unacademy"],
    "computer": ["codewithharry", "unacademy"],
    "programming": ["codewithharry"],
    "python": ["codewithharry"],
    "english": ["byjus", "unacademy"],
    "history": ["unacademy", "byjus"],
    "geography": ["unacademy", "byjus"],
    "economics": ["unacademy", "byjus"],
    "neet": ["neetprep", "physicswallah", "vedantu"],
    "jee": ["physicswallah", "unacademy", "mathongo"],
    "cbse": ["byjus", "vedantu", "unacademy"],
    "class10": ["byjus", "vedantu", "unacademy"],
    "class12": ["physicswallah", "unacademy", "byjus"],
}

# Semi-public Instagram headers (mimics the web client)
_IG_HEADERS = {
    "X-IG-App-ID": "936619743392459",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.instagram.com/",
    "Origin": "https://www.instagram.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
}


# ── Query → keyword scoring ───────────────────────────────────

# Terms that indicate a reel is about platform/marketing, not a subject concept
_PROMO_TERMS = {
    "centre", "center", "offline", "campus", "enrol", "enroll", "admission",
    "scholarship", "batch", "launch", "facility", "facilities", "infrastructure",
    "join us", "registration", "register now", "fee", "fees", "coupon",
    "discount", "offer", "sale", "promo", "announcement", "opening",
    "congratulations", "congrats", "rank", "topper", "result", "results",
    "selected", "selection", "interview", "unboxing", "tour", "vlog",
    # motivational / inspirational non-subject content
    "soldier", "army", "military", "motivat", "inspirat", "hardwork", "dedication",
    "never give up", "success story", "life lesson", "mindset", "struggle",
    "dream big", "believe in", "winners", "loser", "attitude", "personality",
    "morning routine", "daily routine", "productivity", "habit", "goal",
    "birthday", "happy", "celebration", "event", "seminar", "webinar",
    "faculty", "teacher join", "hiring", "vacancy",
}

# ── Topic → concept-level keyword expansion ──────────────────
# When the user searches a broad topic, we expand it to concept keywords
# so that "Newton's Laws in 60s" scores high for query "physics" even
# though the word "physics" isn't in the title.
_TOPIC_EXPANSION: dict[str, list[str]] = {
    "physics": [
        "newton", "force", "motion", "energy", "velocity", "acceleration",
        "momentum", "wave", "optics", "electricity", "magnetism", "gravity",
        "gravitation", "thermodynamics", "quantum", "nuclear", "electrostatics",
        "capacitor", "resistor", "refraction", "reflection", "lens", "prism",
        "light", "sound", "pressure", "fluid", "circular", "rotational",
        "friction", "tension", "torque", "power", "work done", "kinetic",
        "potential", "current", "voltage", "ohm", "faraday", "doppler",
        "projectile", "displacement", "wavelength", "frequency",
    ],
    "chemistry": [
        "atom", "molecule", "bond", "reaction", "acid", "base", "salt",
        "organic", "carbon", "electron", "periodic", "element", "compound",
        "oxidation", "reduction", "equilibrium", "solution", "mole", "titration",
        "valence", "ionic", "covalent", "hybridization", "isomer", "alkane",
        "alkene", "benzene", "aldehyde", "ketone", "ester", "polymer",
        "electrolysis", "cathode", "anode", "ph", "buffer", "entropy",
        "enthalpy", "gibbs",
    ],
    "mathematics": [
        "algebra", "geometry", "calculus", "trigonometry", "derivative",
        "integral", "matrix", "vector", "probability", "statistics",
        "theorem", "equation", "function", "graph", "coordinate", "binomial",
        "arithmetic", "geometric", "progression", "logarithm", "limit",
        "continuity", "differentiability", "area under curve", "permutation",
        "combination", "complex number", "quadratic", "polynomial", "circle",
        "ellipse", "parabola", "hyperbola", "determinant",
    ],
    "biology": [
        "cell", "dna", "rna", "gene", "protein", "photosynthesis", "respiration",
        "evolution", "ecology", "organism", "chromosome", "enzyme", "hormone",
        "neuron", "mitosis", "meiosis", "osmosis", "diffusion", "nutrition",
        "digestion", "circulatory", "excretion", "reproduction", "heredity",
        "mutation", "bacteria", "virus", "fungi", "ecosystem",
    ],
    "math": [
        "algebra", "geometry", "calculus", "trigonometry", "equation",
        "function", "graph", "probability", "theorem",
    ],
    "science": [
        "atom", "cell", "force", "energy", "reaction", "wave", "motion",
        "experiment", "formula", "theory", "law", "concept",
    ],
    "computer": [
        "code", "algorithm", "program", "function", "loop", "array", "stack",
        "queue", "tree", "graph", "recursion", "sorting", "binary", "variable",
        "class", "object", "database", "query", "network", "os", "bit", "byte",
    ],
    "python": [
        "python", "def", "class", "list", "dict", "tuple", "loop", "function",
        "module", "library", "pandas", "numpy", "flask", "django",
    ],
    "history": [
        "mughal", "british", "revolution", "war", "empire", "dynasty",
        "independence", "treaty", "battle", "king", "queen", "colonial",
        "nationalist", "constitution", "reform",
    ],
    "geography": [
        "climate", "soil", "river", "mountain", "ocean", "continent", "latitude",
        "longitude", "earthquake", "volcano", "monsoon", "erosion", "delta",
        "plateau", "plain", "forest", "mineral", "population", "migration",
    ],
    "economics": [
        "gdp", "inflation", "demand", "supply", "market", "trade", "fiscal",
        "monetary", "policy", "poverty", "unemployment", "budget", "tax",
        "bank", "interest", "capital", "labour", "production",
    ],
    "english": [
        "grammar", "tense", "verb", "noun", "adjective", "essay", "comprehension",
        "vocabulary", "idiom", "phrase", "preposition", "conjunction", "sentence",
        "paragraph", "poem", "prose", "literature",
    ],
}


def _expand_query_words(q_lower: str, base_words: list[str]) -> list[str]:
    """Add concept-level terms if the query matches a known topic."""
    expanded = list(base_words)
    for topic, concepts in _TOPIC_EXPANSION.items():
        if topic in q_lower or q_lower in topic:
            for c in concepts:
                if c not in expanded:
                    expanded.append(c)
    return expanded

def _score_reel(title: str, caption: str, query_words: list[str], base_words: list[str]) -> int:
    """Return a relevance score for a reel.

    Scoring:
      +5  exact query phrase in title (e.g. "physics" in title when query is "physics")
      +3  per base query word found in title
      +2  per expanded concept word found in title
      +1  per base query word found in caption
      +1  per expanded concept word found in caption (max 3 caption boosts)
      -8  if the reel contains any promo/non-educational/motivational term
    """
    text_title = title.lower()
    text_cap = caption.lower()
    combined = text_title + " " + text_cap
    score = 0

    # Hard penalty for promo/motivational content — applied first
    for term in _PROMO_TERMS:
        if term in combined:
            return -8  # immediately disqualify

    # Base query words (highest weight — direct match)
    for word in base_words:
        if word in text_title:
            score += 3
        elif word in text_cap:
            score += 1

    # Exact phrase match bonus
    for word in base_words:
        if len(word) > 4 and word in text_title:
            score += 2  # extra bonus for exact subject name in title

    # Expanded concept words (lower weight — indirect match)
    caption_boosts = 0
    for word in query_words:
        if word in base_words:
            continue  # already scored above
        if word in text_title:
            score += 2
        elif word in text_cap and caption_boosts < 3:
            score += 1
            caption_boosts += 1

    return score


async def _fetch_instagram_user_reels(
    handle: str,
    limit: int = 5,
    query_words: list[str] | None = None,
    base_words: list[str] | None = None,
) -> list[dict]:
    """Fetch reels from a handle, score by topic relevance, return top `limit`.

    Fetches up to limit*5 reels so we have a large pool to filter from.
    Only returns reels with score >= 2 (concept match in title or strong caption match).
    """
    fetch_limit = min(limit * 5, 30)
    _qw = query_words or []
    _bw = base_words or _qw
    try:
        url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={handle}"
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=_IG_HEADERS)
            if resp.status_code != 200:
                return []
            data = resp.json()
            user = data.get("data", {}).get("user", {})
            if not user:
                return []
            edges = user.get("edge_felix_video_timeline", {}).get("edges", [])
            candidates = []
            for edge in edges[:fetch_limit]:
                node = edge.get("node", {})
                sc = node.get("shortcode", "")
                if not sc:
                    continue
                cap_edges = node.get("edge_media_to_caption", {}).get("edges", [])
                raw_caption = cap_edges[0]["node"]["text"] if cap_edges else ""
                first_line = (raw_caption.split("\n")[0][:120] if raw_caption else "") or f"Reel by @{handle}"
                display_res = node.get("display_resources") or node.get("thumbnail_resources") or []
                thumb = (
                    display_res[-1].get("src", "") if display_res
                    else node.get("display_url") or node.get("thumbnail_src") or ""
                )
                score = _score_reel(first_line, raw_caption[:500], _qw, _bw)
                candidates.append({
                    "shortcode": sc,
                    "title": first_line.strip(),
                    "thumbnail": thumb,
                    "handle": handle,
                    "duration": int(node.get("video_duration", 0)),
                    "_score": score,
                })

            if not candidates:
                return []

            # Sort by relevance score descending
            candidates.sort(key=lambda r: r["_score"], reverse=True)

            # Only return reels with score >= 2 (at least one concept word in title)
            # This is the key gate — no fallback to unrelated content
            relevant = [r for r in candidates if r["_score"] >= 2]
            chosen = relevant[:limit]

            return [{k: v for k, v in r.items() if not k.startswith("_")} for r in chosen]
    except Exception:
        return []


def _insta_reels_ytdlp(
    handle: str,
    limit: int = 5,
    query_words: list[str] | None = None,
    base_words: list[str] | None = None,
) -> list[dict]:
    """DEPRECATED — yt-dlp cannot access Instagram /reels/ pages (Unsupported URL).
    Kept as a stub so existing call-sites don't crash; always returns [].
    """
    return []


@router.get("/instagram/reels")
async def instagram_reels(q: str = Query(..., min_length=1), limit: int = Query(6, ge=1, le=12)):
    """Search Instagram Reels from known educational creators.

    Uses Instagram's semi-public web profile API to fetch reels, then
    scores each one for topic relevance before returning.
    The broken yt-dlp /reels/ scraping fallback has been removed.
    """
    q_lower = q.lower().strip()

    stopwords = {"the", "and", "for", "with", "from", "that", "this", "are", "was", "how", "what", "why"}
    base_words = [w for w in re.split(r'\W+', q_lower) if len(w) >= 3 and w not in stopwords]
    if q_lower not in base_words:
        base_words.insert(0, q_lower)
    query_words = _expand_query_words(q_lower, base_words)

    handles: set[str] = set()
    for key, vals in _INSTA_EDUCATORS.items():
        if key in q_lower or q_lower in key:
            handles.update(vals)
    for word in q_lower.split():
        if len(word) < 2:
            continue
        for key, vals in _INSTA_EDUCATORS.items():
            if word in key or key in word:
                handles.update(vals)
    if not handles:
        handles = {"physicswallah", "unacademy", "byjus"}

    per_handle = max(2, (limit + len(handles) - 1) // max(1, len(handles)))
    handle_list = list(handles)[:5]

    api_tasks = [_fetch_instagram_user_reels(h, per_handle, query_words, base_words) for h in handle_list]
    api_results = await asyncio.gather(*api_tasks, return_exceptions=True)

    results: list[dict] = []
    for h, res in zip(handle_list, api_results):
        if not isinstance(res, Exception) and res:
            results.extend(res)

    return {"items": results[:limit], "source": "instagram", "count": len(results[:limit])}

# ── Instagram Reel stream URL (for in-app playback) ───────────

_INSTA_SC_RE = re.compile(r'^[A-Za-z0-9_-]{6,50}$')

def _get_reel_stream(shortcode: str) -> dict:
    """Use yt-dlp to extract the direct mp4 stream URL for an Instagram reel.

    Returns a dict with keys: url, thumbnail, title, duration.
    Raises ValueError if extraction fails or no suitable format found.
    """
    import yt_dlp

    reel_url = f"https://www.instagram.com/reel/{shortcode}/"
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "no_warnings": True,
        "socket_timeout": 20,
        # Prefer the best mp4 video ≤ 720p so the browser can play it natively
        "format": "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[ext=mp4]/best",
        "http_headers": {
            **_IG_HEADERS,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(reel_url, download=False)
        if not info:
            raise ValueError("yt-dlp returned no info")

        # Prefer a pre-merged url, fall back to the best single-format url
        stream_url = info.get("url") or ""
        if not stream_url:
            fmts = info.get("formats") or []
            # Pick the best mp4 that has a direct url
            mp4s = [f for f in fmts if f.get("ext") == "mp4" and f.get("url")]
            if not mp4s:
                mp4s = [f for f in fmts if f.get("url")]
            if not mp4s:
                raise ValueError("No playable format found")
            mp4s.sort(key=lambda f: f.get("height") or 0, reverse=True)
            stream_url = mp4s[0]["url"]

        return {
            "url": stream_url,
            "thumbnail": info.get("thumbnail") or "",
            "title": info.get("title") or "",
            "duration": int(info.get("duration") or 0),
        }


@router.get("/instagram/reel/{shortcode}/stream")
async def instagram_reel_stream(shortcode: str):
    """Return a direct mp4 stream URL for an Instagram reel so it can be
    played inline via an HTML5 <video> tag without any Instagram UI.

    The URL is a time-limited CDN link returned by yt-dlp; it is valid
    for a few hours but is NOT stored by the server.
    """
    if not _INSTA_SC_RE.match(shortcode):
        raise HTTPException(status_code=400, detail="Invalid shortcode")

    loop = asyncio.get_event_loop()
    try:
        data = await asyncio.wait_for(
            loop.run_in_executor(None, functools.partial(_get_reel_stream, shortcode)),
            timeout=30.0,
        )
        return data
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Stream extraction timed out")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not extract reel: {str(exc)[:200]}")

@router.post("/fetch-url", response_model=FetchResponse)
async def fetch_url(req: FetchRequest):

    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    if _YOUTUBE_RE.search(url):
        return FetchResponse(
            content=f"[YouTube video: {url}]\n(Transcript not available. AI will reference this URL.)",
            isYouTube=True,
        )

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": "Eduvy-AI-Bot/1.0"})
            res.raise_for_status()
            html = res.text
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Remote site returned {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    # Strip scripts, styles, then all HTML tags
    html = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<style[\s\S]*?</style>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", html).strip()[:_MAX_CHARS]

    if not text:
        raise HTTPException(status_code=422, detail="Could not extract text from URL")

    return FetchResponse(content=text, isYouTube=False)
