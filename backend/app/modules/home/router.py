"""
Home Router - API endpoints for daily content.
"""
import asyncio
import json
import re
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.modules.home.schemas import (
    DailyContentSave, 
    DailyContentResponse,
    GenerateDailyQRequest,
    GenerateDailyQResponse,
    DailyQuestion,
    GenerateBriefRequest,
    GenerateBriefResponse,
    StudyPlanRequest,
    StudyPlanResponse,
    ExamOracleRequest,
    ExamOracleResponse,
    OracleTopic,
    DeepDiveRequest,
    DeepDiveResponse
)
from app.modules.home.service import HomeService
from app.modules.ai.prompts import get_lang_rule, get_home_prompt
from services.ai_service import call_ai

router = APIRouter(prefix="/home", tags=["Home"])


# ── Language enforcement rules (Claude prompt engineering) ────────────
LANG_ENFORCEMENT = {
    "Marathi": """<language_constraint>
You MUST write ENTIRELY in Marathi (मराठी) using Devanagari script.

CRITICAL: Marathi and Hindi both use Devanagari but are COMPLETELY DIFFERENT languages.
You are writing in MARATHI, NOT Hindi. Scan every word before outputting.

BANNED Hindi words (if you use ANY of these, the response is WRONG):
है, हैं, हो, होता, था, थे, थी, की, का, के, में, पर, से, और, भी, तो, यह, वह, कि, जो, नहीं, मैं, आप, हम, तुम, क्या, कैसे, बहुत, अच्छा, ठीक है, बताओ, समझो, देखो, करो, लिखो, सोचो, पढ़ो, जानो, चलो, ये, वो, कोई, कुछ, अब, जब, तब, फिर, लेकिन, मगर, इसलिए, क्योंकि, अगर

CORRECT Marathi equivalents you MUST use:
आहे, आहेत, होते, होती, ची/चा/चे, मध्ये, वर, पासून, आणि, पण, हे, ते, ती, म्हणून, नाही, मी, तुम्ही, आम्ही, काय, कसे, खूप, चांगले, ठीक आहे, सांगा, समजा, बघा, करा, लिहा, विचार करा, वाचा, जाणून घ्या, चला, हा/ही, कोणी, काही, आता, जेव्हा, तेव्हा, मग, परंतु, कारण, जर

Self-check: Before outputting, verify EVERY sentence contains Marathi grammar (verb endings like -ला, -ते, -तो, -ता, -णे, -ून). If you see Hindi verb endings (-ता है, -ती है, -ते हैं), REWRITE in Marathi.
</language_constraint>""",
    "Hindi": """<language_constraint>
You MUST write ENTIRELY in Hindi (हिंदी) using Devanagari script (Unicode U+0900–U+097F).
- Do NOT mix English words. Use Hindi equivalents.
- Do NOT use Cyrillic characters (п, р, в, д) which look like Devanagari but are wrong.
- Every sentence must be grammatically correct Hindi.
</language_constraint>""",
    "Gujarati": """<language_constraint>
You MUST write ENTIRELY in Gujarati (ગુજરાતી) using Gujarati script (Unicode U+0A80–U+0AFF).
- Do NOT use Hindi, English, or any other language.
- Every word must be in Gujarati script only.
</language_constraint>""",
    "English": """<language_constraint>
Write in English only. Use simple, clear language appropriate for Indian school students.
</language_constraint>""",
}


def _get_local_lang_rule(language: str) -> str:
    """Get local fallback language rule (used when dynamic lookup fails)."""
    return LANG_ENFORCEMENT.get(language, LANG_ENFORCEMENT["English"])


# ── Class-wise syllabus topics ────────────────────────────────────────
CLASS_TOPICS = {
    "10": {
        "Math": ["Quadratic Equations", "Arithmetic Progression", "Trigonometry", "Circles", "Statistics"],
        "Science": ["Chemical Reactions", "Acids Bases Salts", "Life Processes", "Electricity", "Light"]
    },
    "9": {
        "Math": ["Polynomials", "Linear Equations", "Triangles", "Heron's Formula", "Statistics"],
        "Science": ["Motion", "Force Laws", "Atoms Molecules", "Cell Structure", "Tissues"]
    },
    "8": {
        "Math": ["Rational Numbers", "Square Roots", "Profit Loss", "Mensuration", "Algebra"],
        "Science": ["Crop Production", "Microorganisms", "Force Pressure", "Friction", "Sound"]
    }
}

def build_teacher_prompt(data: "GenerateDailyQRequest") -> str:
    """
    Build a dynamic prompt like a real teacher who knows the student.
    Uses dynamic template from get_home_prompt().
    """
    # Mood-based difficulty
    mood_instruction = {
        "fresh": "Student is energetic - give slightly challenging questions.",
        "okay": "Student is normal - give standard difficulty questions.",
        "stressed": "Student is stressed - give EASY questions to build confidence.",
        "tired": "Student is tired - give very simple questions, no complex calculations."
    }.get(data.mood, "Give standard difficulty questions.")
    
    # Mastery-based focus — use full masteries dict if available
    mastery_lines = []
    masteries = data.masteries or {}
    if masteries:
        for subj, score in masteries.items():
            level = "basic" if score < 40 else "intermediate" if score < 70 else "advanced"
            mastery_lines.append(f"- {subj}: {level} ({score}%)")
    else:
        math_level = "basic" if data.math_mastery < 40 else "intermediate" if data.math_mastery < 70 else "advanced"
        science_level = "basic" if data.science_mastery < 40 else "intermediate" if data.science_mastery < 70 else "advanced"
        mastery_lines = [f"- Math: {math_level}", f"- Science: {science_level}"]
    
    # Weak topics to reinforce
    weak_topics_text = ""
    if data.weak_topics:
        weak_topics_text = f"\nWeak topics to reinforce: {', '.join(data.weak_topics[:5])}"
    
    # Get class number
    class_num = "10"
    for c in ["10", "9", "8", "7", "6", "5", "11", "12"]:
        if c in data.standard:
            class_num = c
            break
    
    # Use student's actual subjects if available, else fall back to hardcoded topics
    student_subjects = data.subjects or []
    if student_subjects:
        subjects_text = ", ".join(student_subjects[:6])
        topic_section = f"STUDENT'S SUBJECTS: {subjects_text}"
    else:
        topics = CLASS_TOPICS.get(class_num, CLASS_TOPICS["10"])
        topic_section = "SYLLABUS TOPICS:\n" + "\n".join(f"- {k}: {', '.join(v)}" for k, v in topics.items())
    
    mastery_text = "\n".join(mastery_lines)
    lang_rule = get_lang_rule(data.language)

    # Get dynamic template and format it
    return get_home_prompt(
        "home_dailyq_user",
        board=data.board,
        class_num=class_num,
        lang_rule=lang_rule,
        topic_section=topic_section,
        weak_topics_text=weak_topics_text,
        mastery_text=mastery_text,
        mood_instruction=mood_instruction,
        language=data.language
    )


def _parse_ai_array(text: str) -> list:
    """Parse AI response to JSON array with error recovery."""
    try:
        # Clean markdown code blocks
        clean = re.sub(r'```json|```', '', text).strip()
        
        # Find JSON array bounds
        start = clean.find('[')
        end = clean.rfind(']')
        if start == -1 or end == -1:
            print(f"[Parser] No brackets found")
            return []
        
        json_str = clean[start:end + 1]
        print(f"[Parser] JSON string: {json_str[:200]}...")
        
        # Try direct parse first
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[Parser] Direct parse failed: {e}")
        
        # Fix common AI mistakes
        json_str = re.sub(r'^\[\s*"q"\s*:', '[{"q":', json_str)
        json_str = re.sub(r'},\s*"q"\s*:', '},{"q":', json_str)
        
        # Fix unescaped newlines in strings
        json_str = re.sub(r'(?<!\\)\n', '\\n', json_str)
        
        return json.loads(json_str)
    except Exception as e:
        print(f"[Parser] Final error: {e}")
        return []


@router.get("/daily-content/{content_type}")
async def get_daily_content(
    content_type: str,
    language: str = "English",
    current_user: str = Depends(get_current_user)
):
    """
    Get today's daily content (brief or dailyq).
    Returns null if not generated yet today.
    """
    if content_type not in ("brief", "dailyq"):
        raise HTTPException(status_code=400, detail="Invalid content_type. Use 'brief' or 'dailyq'")
    
    result = await asyncio.to_thread(
        HomeService.get_daily_content,
        current_user,
        content_type,
        language
    )
    
    if not result:
        return {"exists": False, "content": None}
    
    return result


@router.get("/recent-practice")
async def get_recent_practice(
    current_user: str = Depends(get_current_user)
):
    """
    Get last 10 practice activities (quizzes, battles, chapter quizzes).
    Returns unified activity feed sorted by most recent first.
    """
    items = await asyncio.to_thread(
        HomeService.get_recent_practice,
        current_user,
        10
    )
    return items


@router.post("/daily-content")
async def save_daily_content(
    data: DailyContentSave,
    current_user: str = Depends(get_current_user)
):
    """
    Save today's daily content after AI generation.
    """
    if data.content_type not in ("brief", "dailyq"):
        raise HTTPException(status_code=400, detail="Invalid content_type. Use 'brief' or 'dailyq'")
    
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    
    result = await asyncio.to_thread(
        HomeService.save_daily_content,
        current_user,
        data.content_type,
        data.content,
        data.language
    )
    
    return result


@router.post("/generate-daily-questions", response_model=GenerateDailyQResponse)
async def generate_daily_questions(
    data: GenerateDailyQRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Generate 2 daily questions using AI - like a real teacher.
    Uses full student context: mood, mastery, weak topics, etc.
    """
    # Check if already generated today
    existing = await asyncio.to_thread(
        HomeService.get_daily_content,
        current_user,
        "dailyq",
        data.language
    )
    
    if existing and existing.get("exists") and existing.get("content"):
        try:
            questions = json.loads(existing["content"])
            if isinstance(questions, list) and len(questions) > 0:
                return GenerateDailyQResponse(
                    questions=[DailyQuestion(**q) for q in questions[:2]],
                    saved=True
                )
        except:
            pass
    
    # Build dynamic prompt based on student context
    prompt = build_teacher_prompt(data)
    
    try:
        response, _, _ = await call_ai(
            provider="groq",
            model="llama-3.3-70b-versatile",
            prompt=prompt,
            system_prompt=get_home_prompt("home_dailyq_system", board=data.board, standard=data.standard, language=data.language),
            history=[],
            max_tokens=1500  # Marathi/Hindi need more tokens per character
        )
        
        print(f"[DailyQ] Response length: {len(response)}, ends with: {response[-50:]}")  # Debug log
        
        parsed = _parse_ai_array(response)
        print(f"[DailyQ] Parsed count: {len(parsed)}")  # Debug log
        
        questions = parsed[:2] if isinstance(parsed, list) and len(parsed) > 0 else []
        
        if questions:
            # Save to database
            await asyncio.to_thread(
                HomeService.save_daily_content,
                current_user,
                "dailyq",
                json.dumps(questions),
                data.language
            )
            return GenerateDailyQResponse(
                questions=[DailyQuestion(**q) for q in questions],
                saved=True
            )
        
        # Return fallback questions if AI fails - based on student's class
        print(f"[DailyQ] No questions parsed, returning fallback for {data.standard}")
        
        # Class-appropriate fallbacks with teacher-style explanations
        if "10" in data.standard:
            fallback = [
                {"q": "एक काटकोन त्रिकोणाच्या दोन बाजू 6 सेमी आणि 8 सेमी आहेत. कर्ण किती?", 
                 "a": "चला सोडवूया!\nStep 1: पायथागोरस प्रमेय: c² = a² + b²\nStep 2: c² = 6² + 8² = 36 + 64 = 100\nStep 3: c = √100 = 10\nउत्तर: कर्ण = 10 सेमी ✓", 
                 "concept": "Pythagoras Theorem", "subject": "Mathematics"},
                {"q": "आम्ल आणि आम्लारी यांच्या अभिक्रियेला काय म्हणतात?",
                 "a": "उदासीनीकरण (Neutralization)\nका? आम्ल + आम्लारी → मीठ + पाणी\nउदाहरण: HCl + NaOH → NaCl + H₂O\nदैनंदिन जीवनात: अॅसिडिटीवर antacid घेतो - हेच उदासीनीकरण!",
                 "concept": "Acids and Bases", "subject": "Science"}
            ]
        elif "9" in data.standard:
            fallback = [
                {"q": "एका आयताची लांबी 12 मीटर आणि रुंदी 5 मीटर आहे. क्षेत्रफळ आणि परिमिती किती?",
                 "a": "चला सोडवूया!\nक्षेत्रफळ = लांबी × रुंदी = 12 × 5 = 60 चौ.मी.\nपरिमिती = 2(लांबी + रुंदी) = 2(12 + 5) = 2 × 17 = 34 मी.\nउत्तर: क्षेत्रफळ = 60 चौ.मी., परिमिती = 34 मी. ✓",
                 "concept": "Mensuration", "subject": "Mathematics"},
                {"q": "पेशीचे 'पॉवरहाउस' कोणते आणि का?",
                 "a": "माइटोकॉन्ड्रिया\nका? ATP (ऊर्जा) तयार करते - पेशीला काम करण्यासाठी ऊर्जा लागते!\nउदाहरण: बॅटरी जसे फोनला ऊर्जा देते, तसे माइटोकॉन्ड्रिया पेशीला ऊर्जा देते.",
                 "concept": "Cell Biology", "subject": "Science"}
            ]
        elif "8" in data.standard:
            fallback = [
                {"q": "एका वस्तूची किंमत Rs 400 आहे. 15% सूट मिळाल्यास किती रुपये द्यावे लागतील?",
                 "a": "चला सोडवूया!\nStep 1: सूट = 400 × 15/100 = Rs 60\nStep 2: देय रक्कम = 400 - 60 = Rs 340\nउत्तर: Rs 340 द्यावे लागतील ✓",
                 "concept": "Discount", "subject": "Mathematics"},
                {"q": "प्रकाशसंश्लेषण म्हणजे काय आणि कुठे होते?",
                 "a": "वनस्पती सूर्यप्रकाशाच्या मदतीने अन्न तयार करतात.\nका? CO₂ + H₂O + सूर्यप्रकाश → ग्लुकोज + O₂\nकुठे? पानांतील हरितलवक (Chloroplast) मध्ये\nमजेशीर: वनस्पती आपल्यासाठी ऑक्सिजन तयार करतात!",
                 "concept": "Photosynthesis", "subject": "Science"}
            ]
        else:
            fallback = [
                {"q": "एका बागेत 5 ओळींमध्ये प्रत्येकी 8 झाडे आहेत. एकूण किती झाडे?",
                 "a": "चला सोडवूया!\n5 ओळी × 8 झाडे = 40 झाडे\nउत्तर: बागेत एकूण 40 झाडे आहेत ✓",
                 "concept": "Multiplication", "subject": "Mathematics"},
                {"q": "पाण्याचे रासायनिक सूत्र काय आहे?",
                 "a": "H₂O\nका? 2 हायड्रोजन + 1 ऑक्सिजन = पाणी\nमजेशीर: H-O-H असे तीन अणू एकत्र येऊन पाण्याचा एक रेणू बनतो!",
                 "concept": "Chemistry", "subject": "Science"}
            ]
        
        return GenerateDailyQResponse(questions=[DailyQuestion(**q) for q in fallback], saved=False)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DailyQ] Error: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed. Please try again.")


# ── Daily Brief Prompt ────────────────────────────────────────────────
def build_brief_prompt(data: "GenerateBriefRequest") -> str:
    """Build a dynamic brief prompt based on student mood."""
    mood_note = {
        "stressed": "Student is STRESSED. Focus on easy wins and revision. Be gentle and encouraging.",
        "tired": "Student is TIRED. Suggest short 20-min study blocks only. Keep it light.",
        "fresh": "Student is FRESH and energetic. Challenge them with harder topics today.",
        "okay": "Student is in normal mood. Give balanced study advice."
    }.get(data.mood, "")
    
    subjects_text = ", ".join(data.subjects[:3]) if data.subjects else "Mathematics, Science"
    lang_rule = get_lang_rule(data.language)

    # Get dynamic template and format it
    return get_home_prompt(
        "home_brief_user",
        standard=data.standard,
        board=data.board,
        lang_rule=lang_rule,
        mood_note=mood_note,
        subjects_text=subjects_text,
        language=data.language
    )


@router.post("/generate-daily-brief", response_model=GenerateBriefResponse)
async def generate_daily_brief(
    data: GenerateBriefRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Generate daily study brief using AI - mood-aware.
    """
    # Check if already generated today
    existing = await asyncio.to_thread(
        HomeService.get_daily_content,
        current_user,
        "brief",
        data.language
    )
    
    if existing and existing.get("exists") and existing.get("content"):
        return GenerateBriefResponse(brief=existing["content"], saved=True)
    
    # Build prompt
    prompt = build_brief_prompt(data)
    
    try:
        response, _, _ = await call_ai(
            provider="groq",
            model="llama-3.3-70b-versatile",
            prompt=prompt,
            system_prompt=get_home_prompt("home_brief_system", board=data.board, standard=data.standard, language=data.language),
            history=[],
            max_tokens=800
        )
        
        if response and not response.startswith("⚠️"):
            # Save to database
            await asyncio.to_thread(
                HomeService.save_daily_content,
                current_user,
                "brief",
                response,
                data.language
            )
            return GenerateBriefResponse(brief=response, saved=True)
        
        # Fallback brief (English — universal fallback)
        fallback = f"""📚 Today's Focus: Mathematics - Quadratic Equations and their properties

🎯 Exam Tip: Always show your working steps clearly in board exams.

💪 You can do it! Consistent daily practice leads to exam success.

🌙 Tonight: Revise the area of triangle formula."""
        
        return GenerateBriefResponse(brief=fallback, saved=False)
        
    except Exception as e:
        print(f"[Brief] Error: {e}")
        raise HTTPException(status_code=500, detail="Brief generation failed. Please try again.")


# ══════════════════════════════════════════════════════════════════════
# STUDY PLAN
# ══════════════════════════════════════════════════════════════════════
@router.post("/generate-study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(
    data: StudyPlanRequest,
    current_user: str = Depends(get_current_user)
):
    """Generate personalized study plan for a subject based on mastery."""
    
    # Check if already generated today
    cache_key = f"plan_{data.subject}"
    existing = await asyncio.to_thread(
        HomeService.get_daily_content,
        current_user,
        cache_key,
        data.language
    )
    
    if existing and existing.get("exists") and existing.get("content"):
        return StudyPlanResponse(plan=existing["content"], saved=True)
    
    level = "beginner" if data.mastery < 30 else "intermediate" if data.mastery < 70 else "advanced"
    lang_rule = get_lang_rule(data.language)
    
    # Get dynamic user prompt
    prompt = get_home_prompt(
        "home_studyplan_user",
        subject=data.subject,
        lang_rule=lang_rule,
        standard=data.standard,
        board=data.board,
        mastery=data.mastery,
        level=level,
        language=data.language
    )

    try:
        response, _, _ = await call_ai(
            provider="groq",
            model="llama-3.3-70b-versatile",
            prompt=prompt,
            system_prompt=get_home_prompt("home_studyplan_system", board=data.board, standard=data.standard, subject=data.subject),
            history=[],
            max_tokens=1200
        )
        
        if response and not response.startswith("⚠️"):
            await asyncio.to_thread(
                HomeService.save_daily_content,
                current_user,
                cache_key,
                response,
                data.language
            )
            return StudyPlanResponse(plan=response, saved=True)
        
        fallback = f"📚 Could not generate a study plan for {data.subject}. Please try again."
        return StudyPlanResponse(plan=fallback, saved=False)
        
    except Exception as e:
        print(f"[StudyPlan] Error: {e}")
        raise HTTPException(status_code=500, detail="Study plan generation failed. Please try again.")


# ══════════════════════════════════════════════════════════════════════
# EXAM ORACLE
# ══════════════════════════════════════════════════════════════════════
def _parse_oracle_topics(text: str) -> list:
    """Parse AI response to topic predictions."""
    try:
        clean = re.sub(r'```json|```', '', text).strip()
        start = clean.find('[')
        end = clean.rfind(']')
        if start == -1 or end == -1:
            return []
        json_str = clean[start:end + 1]
        parsed = json.loads(json_str)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    return []


@router.post("/generate-exam-oracle", response_model=ExamOracleResponse)
async def generate_exam_oracle(
    data: ExamOracleRequest,
    current_user: str = Depends(get_current_user)
):
    """Predict important exam topics based on past patterns."""
    
    # Check if already generated today
    existing = await asyncio.to_thread(
        HomeService.get_daily_content,
        current_user,
        "oracle",
        data.language
    )
    
    if existing and existing.get("exists") and existing.get("content"):
        try:
            topics = json.loads(existing["content"])
            if isinstance(topics, list) and len(topics) > 0:
                return ExamOracleResponse(
                    topics=[OracleTopic(**t) for t in topics],
                    saved=True
                )
        except:
            pass
    
    subjects_text = ", ".join(data.subjects[:4]) if data.subjects else "Mathematics, Science"
    
    # Get dynamic user prompt
    prompt = get_home_prompt(
        "home_oracle_user",
        board=data.board,
        standard=data.standard,
        subjects_text=subjects_text,
        language=data.language
    )

    try:
        response, _, _ = await call_ai(
            provider="groq",
            model="llama-3.3-70b-versatile",
            prompt=prompt,
            system_prompt=get_home_prompt("home_oracle_system", board=data.board, language=data.language),
            history=[],
            max_tokens=800
        )
        
        parsed = _parse_oracle_topics(response)
        
        if parsed:
            # Save to database
            await asyncio.to_thread(
                HomeService.save_daily_content,
                current_user,
                "oracle",
                json.dumps(parsed),
                data.language
            )
            return ExamOracleResponse(
                topics=[OracleTopic(**t) for t in parsed[:5]],
                saved=True
            )
        
        # Fallback topics
        fallback = [
            {"topic": "Quadratic Equations", "subject": "Mathematics", "pct": 90},
            {"topic": "Chemical Reactions", "subject": "Science", "pct": 85},
            {"topic": "Electricity", "subject": "Science", "pct": 80},
            {"topic": "Trigonometry", "subject": "Mathematics", "pct": 75},
            {"topic": "Life Processes", "subject": "Science", "pct": 70}
        ]
        return ExamOracleResponse(
            topics=[OracleTopic(**t) for t in fallback],
            saved=False
        )
        
    except Exception as e:
        print(f"[Oracle] Error: {e}")
        raise HTTPException(status_code=500, detail="Oracle generation failed. Please try again.")


# ══════════════════════════════════════════════════════════════════════
# DEEP DIVE
# ══════════════════════════════════════════════════════════════════════
@router.post("/generate-deep-dive", response_model=DeepDiveResponse)
async def generate_deep_dive(
    data: DeepDiveRequest,
    current_user: str = Depends(get_current_user)
):
    """Generate deep dive content for a specific topic."""
    
    # Get dynamic user prompt
    prompt = get_home_prompt(
        "home_deepdive_user",
        topic=data.topic,
        board=data.board,
        standard=data.standard,
        subject=data.subject,
        language=data.language
    )

    try:
        response, _, _ = await call_ai(
            provider="groq",
            model="llama-3.3-70b-versatile",
            prompt=prompt,
            system_prompt=get_home_prompt("home_deepdive_system", board=data.board, standard=data.standard, subject=data.subject, language=data.language),
            history=[],
            max_tokens=1000
        )
        
        if response and not response.startswith("⚠️"):
            return DeepDiveResponse(content=response, saved=True)
        
        fallback = f"📖 Could not generate deep dive for {data.topic}. Please try again."
        return DeepDiveResponse(content=fallback, saved=False)
        
    except Exception as e:
        print(f"[DeepDive] Error: {e}")
        raise HTTPException(status_code=500, detail="Deep dive generation failed. Please try again.")
