"""
Chapters Service - Business logic for chapter management.
"""
import json
import logging
import re
from typing import Dict, List, Optional

from fastapi import HTTPException

from app.db.connection import get_db
from app.modules.chapters.schema import ChapterCreate, ChapterUpdate

logger = logging.getLogger(__name__)


class ChapterService:
    """Chapter business logic."""

    _SCHOOL_SCOPE_RE = re.compile(r"^s\d+_(.+)$")
    _BASELINE_DESC_MARKERS = (
        "This chapter, '",
        "builds core",
        "By the end of this chapter",
    )
    _DESC_TEMPLATE_BY_LANGUAGE = {
        "english": (
            "This chapter, '{chapter}', develops a strong foundation in {subject} for {standard} under {board}{stream}. "
            "It explains key ideas in a step-by-step way with practical examples, typical textbook patterns, and exam-oriented problem practice. "
            "After completing this chapter, you should be able to explain the concepts clearly, apply them to standard questions, and revise with confidence using notes, examples, and exercises."
        ),
        "hindi": (
            "Yeh adhyay '{chapter}', {board}{stream} ke {standard} ke liye {subject} ki majboot buniyad taiyar karta hai. "
            "Isme mukhya concepts ko step-by-step tarike se practical examples, textbook patterns aur exam-oriented practice ke saath samjhaya jata hai. "
            "Is adhyay ke baad aapko concepts ko spasht roop se samjhana, standard prashnon par lagu karna aur notes aur exercises ke saath atmvishvas se revision karna aana chahiye."
        ),
        "marathi": (
            "Ha adhyay '{chapter}', {board}{stream} madhil {standard} sathi {subject} che bhakkam mulabhut samaj tayar karto. "
            "Yat mukhya sankalpana tappya-tappyanne practical udaharane, pathyapustakache pattern ani pariksha-kendrit sarav yanchya sahyane samjavlya jatat. "
            "Ha adhyay purna jhalyanantar tumhala sankalpana spashtpane samjavta yene, sadharan prashnanvar lagu karta yene ani notes va exercises sobat atmvishvasane punaravalokan karta yene apekshit aahe."
        ),
        "gujarati": (
            "Aa adhyay '{chapter}', {board}{stream} na {standard} mate {subject} no majbut adhar taiyar kare chhe. "
            "Tema mukhya concepts ne step-by-step rite practical examples, textbook patterns ane exam-oriented practice sathe saral rite samjhavama aave chhe. "
            "Aa adhyay pachi tame concepts ne spasht rite samjavi shaksho, standard prashno ma lagu kari shaksho ane notes ane exercises sathe vishvaspurvak revision kari shaksho."
        ),
        "tamil": (
            "Indha paguthi '{chapter}', {board}{stream} il {standard} maanavargalukku {subject} il valuvana adithalam amaikkiradhu. "
            "Mukkiya karuthugalai step-by-step muraiyil practical examples, textbook patterns, matrum exam-oriented practice-udan thelivaga vilakkugiradhu. "
            "Indha paguthiyai mudithapin, neengal karuthugalai thelivaga vivarikka, standard vinaigalil payanpadutha, matrum notes-exercises moolam nambikkaiyudan thirumba padikka mudiyum."
        ),
        "telugu": (
            "Ee adhyayam '{chapter}', {board}{stream} lo {standard} kosam {subject} pai balamaina aadhaaram andistundi. "
            "Mukhya amshalanu step-by-step vidhanamlo practical examples, textbook patterns, mariyu exam-oriented practice tho spashtanga vivaristhundi. "
            "Ee adhyayam taruvata miru concepts ni spashtanga cheppagalru, standard prashnala pai apply cheyagalru, mariyu notes-exercises tho nammakamto revision cheyagalru."
        ),
        "kannada": (
            "Ee adhyaya '{chapter}', {board}{stream} na {standard} ge {subject} na gatti adharavannu nirmisuttade. "
            "Pramukha tattvagalannu step-by-step vidhanadalli practical examples, textbook patterns mattu exam-oriented practice jothege spashtavagi vivarisalagutade. "
            "Ee adhyaya mugida mele, neevu tattvagalannu spashtavagi vivarisabahudu, sadharana prashnegala mele anvayisabahudu, mattu notes-exercises jothege atmavishvasadinda revision maadabahudu."
        ),
        "bengali": (
            "Ei oddhay '{chapter}', {board}{stream}-er {standard} er jonno {subject}-er majbut bhitti toiri kore. "
            "Ekhane mul dharanaguli step-by-step bhabe practical examples, textbook patterns ebong exam-oriented practice er sathe sohoje bujhano hoy. "
            "Ei oddhay seshe tumi dharanaguli spashto bhabe bojhate parbe, standard prosne prayog korte parbe, ebong notes-exercises diye atmobiswase revision korte parbe."
        ),
        "punjabi": (
            "Ih chapter '{chapter}', {board}{stream} de {standard} layi {subject} di mazboot buniyad banaunda hai. "
            "Is vich mukh vicharan nu step-by-step tareeke naal practical examples, textbook patterns te exam-oriented practice de naal samjhaya janda hai. "
            "Is chapter ton baad tusi concepts nu spasht tareeke naal samjha sakoge, standard sawaalan te lagu kar sakoge, te notes-exercises de naal vishvas naal revision kar sakoge."
        ),
        "odia": (
            "Ehi adhyaya '{chapter}', {board}{stream} ra {standard} pain {subject} ra majabuta bhitti gathana kare. "
            "Ethire mukhya dharanagudiku step-by-step bhabare practical examples, textbook patterns ebam exam-oriented practice saha sahajare bujhaijae. "
            "Ehi adhyaya sesa pare, tume dharanagudiku spashta bhabare bujhai pariba, standard prasnare prayoga kari pariba, ebam notes-exercises saha biswasa saha revision kari pariba."
        ),
        "urdu": (
            "Yeh bab '{chapter}', {board}{stream} ke {standard} ke liye {subject} ki mazboot bunyad tayar karta hai. "
            "Is mein aham concepts ko step-by-step andaaz mein practical examples, textbook patterns aur exam-oriented practice ke saath wazeh kiya jata hai. "
            "Is bab ke baad aap concepts ko wazeh taur par samjha sakte hain, standard sawalon par apply kar sakte hain, aur notes-exercises ke saath itminan se revision kar sakte hain."
        ),
    }

    @staticmethod
    def _normalize_language(language: Optional[str]) -> str:
        """Normalize language/medium value to template key."""
        if not language:
            return "english"
        value = language.strip().lower().replace("_", " ").replace("-", " ")
        aliases = {
            "eng": "english",
            "gujrati": "gujarati",
            "guj": "gujarati",
            "marathi medium": "marathi",
            "hindi medium": "hindi",
            "english medium": "english",
        }
        return aliases.get(value, value)

    @staticmethod
    def _is_generic_baseline_description(description: Optional[str]) -> bool:
        """Return True when description is missing or auto-generated baseline text."""
        if not description or not description.strip():
            return True
        text = description.strip()
        return all(marker in text for marker in ChapterService._BASELINE_DESC_MARKERS)

    @staticmethod
    def _build_medium_aware_description(chapter: Dict, medium_language: Optional[str]) -> str:
        """Build localized fallback description for a chapter."""
        lang_key = ChapterService._normalize_language(medium_language)
        template = ChapterService._DESC_TEMPLATE_BY_LANGUAGE.get(lang_key) or ChapterService._DESC_TEMPLATE_BY_LANGUAGE["english"]

        chapter_name = (chapter.get("chapter_name") or "This topic").strip()
        subject_name = (chapter.get("subject_name") or "the subject").strip()
        standard_name = (chapter.get("standard_name") or chapter.get("standard_id") or "this class").strip()
        board_name = (chapter.get("board_name") or chapter.get("board_id") or "the selected board").strip()
        stream_name = (chapter.get("stream_name") or "").strip()
        stream_part = f" {stream_name}" if stream_name else ""

        return template.format(
            chapter=chapter_name,
            subject=subject_name,
            standard=standard_name,
            board=board_name,
            stream=stream_part,
        )

    @staticmethod
    def _to_global_id(scoped_or_global_id: Optional[str]) -> Optional[str]:
        """Convert school-scoped ID (s{school_id}_*) to global ID; return input when already global."""
        if not scoped_or_global_id:
            return scoped_or_global_id
        value = scoped_or_global_id.strip()
        if not value:
            return value
        match = ChapterService._SCHOOL_SCOPE_RE.match(value)
        return match.group(1) if match else value

    @staticmethod
    def _merge_scoped_and_global_chapters(
        scoped_chapters: List[Dict],
        global_chapters: List[Dict],
    ) -> List[Dict]:
        """Merge chapter lists by chapter_number, preferring school-scoped rows when present."""
        if not scoped_chapters:
            return global_chapters
        if not global_chapters:
            return scoped_chapters

        merged: Dict[int, Dict] = {}

        # Start with global baseline.
        for ch in global_chapters:
            merged[int(ch.get("chapter_number") or 0)] = ch

        # Overlay school-specific chapters.
        for ch in scoped_chapters:
            merged[int(ch.get("chapter_number") or 0)] = ch

        return [merged[k] for k in sorted(merged.keys())]

    @staticmethod
    def _is_stream_standard(standard_id: str) -> bool:
        """Return True for Class 11/12 standards that require stream."""
        if not standard_id:
            return False
        normalized = standard_id.strip().lower()
        return "11" in normalized or "12" in normalized

    @staticmethod
    def _infer_stream_id_from_user_subjects(
        cur,
        board_id: str,
        standard_id: str,
        user_subjects: list,
    ) -> Optional[str]:
        """Infer stream_id by maximizing overlap between user subjects and stream-scoped subjects."""
        if not user_subjects:
            return None

        normalized_subjects = {
            str(s).strip().lower()
            for s in user_subjects
            if isinstance(s, str) and str(s).strip()
        }
        if not normalized_subjects:
            return None

        cur.execute(
            """
            SELECT stream_id, LOWER(name) AS name
            FROM subjects
            WHERE board_id = %s
              AND standard_id = %s
              AND stream_id IS NOT NULL
              AND is_active = TRUE
            """,
            (board_id, standard_id),
        )
        rows = cur.fetchall()
        if not rows:
            return None

        scores: Dict[str, int] = {}
        for row in rows:
            sid = row.get("stream_id")
            name = row.get("name")
            if sid and name in normalized_subjects:
                scores[sid] = scores.get(sid, 0) + 1

        if not scores:
            return None

        # Pick stream with strongest subject overlap.
        return max(scores.items(), key=lambda item: item[1])[0]

    @staticmethod
    def _resolve_stream_id(cur, stream_id: Optional[str]) -> Optional[str]:
        """Resolve stream value (id or name) to canonical stream id."""
        if not stream_id:
            return None

        raw = stream_id.strip()
        if not raw:
            return None

        # Direct id match first.
        cur.execute("SELECT id FROM streams WHERE id = %s", (raw,))
        row = cur.fetchone()
        if row:
            return row["id"]

        # Slug fallback for values like "Commerce" -> "commerce".
        slug = raw.lower().replace(" ", "-")
        cur.execute("SELECT id FROM streams WHERE id = %s", (slug,))
        row = cur.fetchone()
        if row:
            return row["id"]

        # Name lookup fallback.
        cur.execute("SELECT id FROM streams WHERE LOWER(name) = LOWER(%s)", (raw,))
        row = cur.fetchone()
        return row["id"] if row else None
    
    @staticmethod
    def _resolve_board_id(cur, board_id: str, school_id: int = None) -> str:
        """Resolve board name to ID, trying school-scoped first if school_id set."""
        if school_id:
            scoped = f"s{school_id}_{board_id.lower().replace(' ', '-')}"
            cur.execute("SELECT id FROM boards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        cur.execute("SELECT id FROM boards WHERE id = %s", (board_id,))
        if cur.fetchone():
            return board_id
        cur.execute("SELECT id FROM boards WHERE LOWER(name) = LOWER(%s)", (board_id,))
        row = cur.fetchone()
        found_id = row["id"] if row else board_id
        # Try school-scoped version of the resolved ID
        if school_id:
            scoped = f"s{school_id}_{found_id}"
            cur.execute("SELECT id FROM boards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        return found_id
    
    @staticmethod
    def _resolve_standard_id(cur, standard_id: str, school_id: int = None) -> str:
        """Resolve standard name to ID, trying school-scoped first if school_id set."""
        if school_id:
            scoped = f"s{school_id}_{standard_id.lower().replace(' ', '-')}"
            cur.execute("SELECT id FROM standards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        cur.execute("SELECT id FROM standards WHERE id = %s", (standard_id,))
        if cur.fetchone():
            return standard_id
        cur.execute("SELECT id FROM standards WHERE LOWER(name) = LOWER(%s)", (standard_id,))
        row = cur.fetchone()
        found_id = row["id"] if row else standard_id
        # Try school-scoped version of the resolved ID
        if school_id:
            scoped = f"s{school_id}_{found_id}"
            cur.execute("SELECT id FROM standards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        return found_id
    
    @staticmethod
    def list_chapters(
        board_id: Optional[str] = None,
        standard_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        stream_id: Optional[str] = None,
        is_active: bool = True,
        school_id: Optional[int] = None
    ) -> List[Dict]:
        """
        List chapters with optional filters.
        Returns chapters ordered by chapter_number.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Resolve names to IDs (with school scoping if applicable)
            if board_id:
                board_id = ChapterService._resolve_board_id(cur, board_id, school_id)
            if standard_id:
                standard_id = ChapterService._resolve_standard_id(cur, standard_id, school_id)
            if stream_id:
                stream_id = ChapterService._resolve_stream_id(cur, stream_id)
            
            query = """
                SELECT c.id, c.board_id, c.standard_id, c.subject_id, c.stream_id, c.chapter_number, c.chapter_name,
                       c.chapter_name_local, c.description, c.topics, c.is_active, c.created_at,
                       b.name as board_name, st.name as standard_name, s.name as subject_name,
                       str.name as stream_name
                FROM chapters c
                LEFT JOIN boards b ON c.board_id = b.id
                LEFT JOIN standards st ON c.standard_id = st.id
                LEFT JOIN subjects s ON c.subject_id = s.id
                LEFT JOIN streams str ON c.stream_id = str.id
                WHERE 1=1
            """
            params = []
            
            if board_id:
                query += " AND c.board_id = %s"
                params.append(board_id)
            if standard_id:
                query += " AND c.standard_id = %s"
                params.append(standard_id)
            if subject_id:
                query += " AND c.subject_id = %s"
                params.append(subject_id)
            if stream_id:
                # Support migrated rows where stream may live on subjects table.
                query += " AND COALESCE(c.stream_id, s.stream_id) = %s"
                params.append(stream_id)
            if is_active is not None:
                query += " AND c.is_active = %s"
                params.append(is_active)
            
            query += " ORDER BY c.chapter_number ASC"
            
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            
            result = []
            for row in rows:
                chapter = dict(row)
                # Parse topics JSON
                if chapter.get("topics"):
                    try:
                        if isinstance(chapter["topics"], str):
                            chapter["topics"] = json.loads(chapter["topics"])
                    except json.JSONDecodeError:
                        chapter["topics"] = []
                else:
                    chapter["topics"] = []
                result.append(chapter)
            
            return result
        finally:
            conn.close()
    
    @staticmethod
    def get_chapter(chapter_id: int) -> Optional[Dict]:
        """Get a single chapter by ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT c.id, c.board_id, c.standard_id, c.subject_id, c.chapter_number, c.chapter_name,
                          c.chapter_name_local, c.description, c.topics, c.is_active, c.created_at,
                          b.name as board_name, st.name as standard_name, s.name as subject_name
                   FROM chapters c
                   LEFT JOIN boards b ON c.board_id = b.id
                   LEFT JOIN standards st ON c.standard_id = st.id
                   LEFT JOIN subjects s ON c.subject_id = s.id
                   WHERE c.id = %s""",
                (chapter_id,)
            )
            row = cur.fetchone()
            if not row:
                return None
            
            chapter = dict(row)
            if chapter.get("topics"):
                try:
                    if isinstance(chapter["topics"], str):
                        chapter["topics"] = json.loads(chapter["topics"])
                except json.JSONDecodeError:
                    chapter["topics"] = []
            else:
                chapter["topics"] = []
            
            return chapter
        finally:
            conn.close()
    
    @staticmethod
    def create_chapter(data: ChapterCreate, school_id: int = None) -> Dict:
        """Create a new chapter. School admins can only create for their school."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check for duplicate (same board_id+standard_id+subject_id+chapter_number)
            cur.execute(
                """SELECT id FROM chapters
                   WHERE board_id = %s AND standard_id = %s AND subject_id = %s AND chapter_number = %s""",
                (data.board_id, data.standard_id, data.subject_id, data.chapter_number)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail=f"Chapter {data.chapter_number} already exists for {data.board_id}/{data.standard_id}/{data.subject_id}"
                )
            
            topics_json = json.dumps(data.topics or [])
            
            cur.execute(
                """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name,
                                         chapter_name_local, description, topics, is_active, school_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id, created_at""",
                (data.board_id, data.standard_id, data.subject_id, data.chapter_number, data.chapter_name,
                 data.chapter_name_local, data.description, topics_json, data.is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            
            return {
                "id": row["id"],
                "board_id": data.board_id,
                "standard_id": data.standard_id,
                "subject_id": data.subject_id,
                "chapter_number": data.chapter_number,
                "chapter_name": data.chapter_name,
                "chapter_name_local": data.chapter_name_local,
                "description": data.description,
                "topics": data.topics or [],
                "is_active": data.is_active,
                "created_at": str(row["created_at"]),
            }
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to create chapter: {e}")
            raise HTTPException(status_code=500, detail="Failed to create chapter")
        finally:
            conn.close()
    
    @staticmethod
    def update_chapter(chapter_id: int, data: ChapterUpdate, school_id: int = None) -> Dict:
        """Update an existing chapter. School admins can only update their own chapters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check chapter exists and belongs to the admin's school
            if school_id is not None:
                cur.execute("SELECT id FROM chapters WHERE id = %s AND school_id = %s", (chapter_id, school_id))
            else:
                cur.execute("SELECT id FROM chapters WHERE id = %s", (chapter_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Chapter not found")
            
            # Build dynamic update query
            updates = []
            params = []
            
            if data.chapter_name is not None:
                updates.append("chapter_name = %s")
                params.append(data.chapter_name)
            if data.chapter_name_local is not None:
                updates.append("chapter_name_local = %s")
                params.append(data.chapter_name_local)
            if data.description is not None:
                updates.append("description = %s")
                params.append(data.description)
            if data.topics is not None:
                updates.append("topics = %s")
                params.append(json.dumps(data.topics))
            if data.is_active is not None:
                updates.append("is_active = %s")
                params.append(data.is_active)
            
            if not updates:
                # Nothing to update, return existing
                return ChapterService.get_chapter(chapter_id)
            
            params.append(chapter_id)
            query = f"UPDATE chapters SET {', '.join(updates)} WHERE id = %s"
            cur.execute(query, tuple(params))
            conn.commit()
            
            return ChapterService.get_chapter(chapter_id)
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to update chapter: {e}")
            raise HTTPException(status_code=500, detail="Failed to update chapter")
        finally:
            conn.close()
    
    @staticmethod
    def delete_chapter(chapter_id: int, school_id: int = None) -> bool:
        """Delete a chapter. School admins can only delete their own chapters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            if school_id is not None:
                cur.execute("DELETE FROM chapters WHERE id = %s AND school_id = %s RETURNING id", (chapter_id, school_id))
            else:
                cur.execute("DELETE FROM chapters WHERE id = %s RETURNING id", (chapter_id,))
            row = cur.fetchone()
            conn.commit()
            return row is not None
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to delete chapter: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete chapter")
        finally:
            conn.close()
    
    @staticmethod
    def get_subjects_with_chapters(
        board_id: str,
        standard_id: str,
        stream_id: Optional[str] = None,
        user_id: str = None,
    ) -> List[Dict]:
        """
        Get list of subjects with chapter counts for a board+standard.
        Accepts either IDs (e.g. "cbse") or names (e.g. "CBSE").
        For school students, resolves to school-scoped curriculum.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Look up user's school_id
            school_id = None
            user_stream = None
            user_subjects = []
            if user_id:
                cur.execute("SELECT school_id, stream, subjects FROM users WHERE id = %s", (user_id,))
                row = cur.fetchone()
                if row:
                    school_id = row.get("school_id")
                    user_stream = row.get("stream")
                    raw_subjects = row.get("subjects")
                    if isinstance(raw_subjects, str):
                        try:
                            parsed = json.loads(raw_subjects)
                            if isinstance(parsed, list):
                                user_subjects = parsed
                        except Exception:
                            user_subjects = []
                    elif isinstance(raw_subjects, list):
                        user_subjects = raw_subjects
            
            board_id = ChapterService._resolve_board_id(cur, board_id, school_id)
            standard_id = ChapterService._resolve_standard_id(cur, standard_id, school_id)
            global_board_id = ChapterService._to_global_id(board_id)
            global_standard_id = ChapterService._to_global_id(standard_id)

            # Explicit query param takes precedence, then user profile stream.
            effective_stream_id = ChapterService._resolve_stream_id(cur, stream_id) or ChapterService._resolve_stream_id(cur, user_stream)

            # If stream is missing for Class 11/12 users, infer from saved subjects.
            if (
                not effective_stream_id
                and user_id
                and ChapterService._is_stream_standard(standard_id)
            ):
                inferred_stream_id = ChapterService._infer_stream_id_from_user_subjects(
                    cur,
                    board_id,
                    standard_id,
                    user_subjects,
                )
                if inferred_stream_id:
                    effective_stream_id = inferred_stream_id

            # Start from subjects so valid subjects are visible even when chapters are not seeded yet.
            query = """
                SELECT
                    s.id AS subject_id,
                    s.name AS subject_name,
                    COUNT(c.id) AS chapter_count
                FROM subjects s
                LEFT JOIN chapters c
                    ON c.subject_id = s.id
                    AND c.board_id = %s
                    AND c.standard_id = %s
                    AND c.is_active = TRUE
                WHERE s.board_id = %s
                  AND s.standard_id = %s
                  AND s.is_active = TRUE
            """
            params = [board_id, standard_id, board_id, standard_id]

            if effective_stream_id:
                query += " AND s.stream_id = %s"
                params.append(effective_stream_id)
            else:
                query += " AND s.stream_id IS NULL"

            query += """
                GROUP BY s.id, s.name, s.sort_order
                ORDER BY s.sort_order, s.name
            """
            
            cur.execute(query, tuple(params))
            rows = [dict(row) for row in cur.fetchall()]

            # No school context: current query result is sufficient.
            if not school_id:
                return rows

            # School context: overlay global subjects/counts so superadmin CRUD reflects instantly.
            # Key by normalized name+stream to align scoped/global twins.
            merged_by_key: Dict[tuple, Dict] = {}

            for item in rows:
                global_subject_id = ChapterService._to_global_id(item.get("subject_id"))
                cur.execute(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM chapters
                    WHERE board_id = %s
                      AND standard_id = %s
                      AND subject_id = %s
                      AND is_active = TRUE
                    """,
                    (global_board_id, global_standard_id, global_subject_id),
                )
                global_count = int((cur.fetchone() or {}).get("cnt") or 0)
                scoped_count = int(item.get("chapter_count") or 0)
                item["chapter_count"] = max(scoped_count, global_count)

                key = (item.get("subject_name", "").strip().lower(), effective_stream_id or "")
                merged_by_key[key] = item

            global_subject_query = """
                SELECT s.id AS subject_id, s.name AS subject_name, s.sort_order,
                       COUNT(c.id) AS chapter_count
                FROM subjects s
                LEFT JOIN chapters c
                  ON c.subject_id = s.id
                 AND c.board_id = %s
                 AND c.standard_id = %s
                 AND c.is_active = TRUE
                WHERE s.board_id = %s
                  AND s.standard_id = %s
                  AND s.is_active = TRUE
            """
            global_params = [global_board_id, global_standard_id, global_board_id, global_standard_id]

            if effective_stream_id:
                global_subject_query += " AND s.stream_id = %s"
                global_params.append(effective_stream_id)
            else:
                global_subject_query += " AND s.stream_id IS NULL"

            global_subject_query += """
                GROUP BY s.id, s.name, s.sort_order
                ORDER BY s.sort_order, s.name
            """

            cur.execute(global_subject_query, tuple(global_params))
            global_rows = [dict(r) for r in cur.fetchall()]

            for g in global_rows:
                key = (g.get("subject_name", "").strip().lower(), effective_stream_id or "")
                if key in merged_by_key:
                    merged_by_key[key]["chapter_count"] = max(
                        int(merged_by_key[key].get("chapter_count") or 0),
                        int(g.get("chapter_count") or 0),
                    )
                else:
                    merged_by_key[key] = g

            merged = list(merged_by_key.values())
            merged.sort(key=lambda x: (x.get("subject_name") or ""))
            return merged
        finally:
            conn.close()
    
    @staticmethod
    def get_chapters_with_progress(
        user_id: str,
        board_id: str,
        standard_id: str,
        subject_id: str,
        stream_id: Optional[str] = None,
    ) -> List[Dict]:
        """
        Get chapters with user's progress data.
        Uses 5 checkpoints, each worth 20%:
        □ Has notes/uploads → +20%
        □ Watched videos → +20%
        □ Has flashcards → +20%
        □ Took quiz → +20%
        □ Quiz ≥70% (with at least 5 quizzes) → +20%
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Resolve school_id for the user
            school_id = None
            user_stream_id = None
            user_medium_language = "English"
            if user_id:
                cur.execute("SELECT school_id, stream, language FROM users WHERE id = %s", (user_id,))
                urow = cur.fetchone()
                if urow:
                    school_id = urow.get("school_id")
                    user_stream_id = ChapterService._resolve_stream_id(cur, urow.get("stream"))
                    user_medium_language = urow.get("language") or "English"

            effective_stream_id = ChapterService._resolve_stream_id(cur, stream_id) or user_stream_id
            
            # Get base chapters
            chapters = ChapterService.list_chapters(
                board_id=board_id, standard_id=standard_id, subject_id=subject_id,
                stream_id=effective_stream_id, is_active=True, school_id=school_id
            )

            # School-scoped overlay: merge scoped + global chapter rows by chapter_number.
            if school_id:
                global_board_id = ChapterService._to_global_id(board_id)
                global_standard_id = ChapterService._to_global_id(standard_id)
                global_subject_id = ChapterService._to_global_id(subject_id)

                global_chapters = ChapterService.list_chapters(
                    board_id=global_board_id,
                    standard_id=global_standard_id,
                    subject_id=global_subject_id,
                    stream_id=effective_stream_id,
                    is_active=True,
                    school_id=None,
                )

                chapters = ChapterService._merge_scoped_and_global_chapters(chapters, global_chapters)
            
            if not chapters:
                return []
            
            # Get chapter IDs
            chapter_ids = [c["id"] for c in chapters]
            
            # Get per-chapter quiz progress from chapter_quiz_history
            cur.execute(
                """SELECT chapter_id, 
                          COUNT(*) as quiz_count,
                          COALESCE(AVG(score * 100.0 / NULLIF(total, 0)), 0) as avg_score
                   FROM chapter_quiz_history
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            quiz_progress = {row["chapter_id"]: {
                "count": row["quiz_count"],
                "avg_score": int(row["avg_score"])
            } for row in cur.fetchall()}
            
            # Get per-chapter notes count
            cur.execute(
                """SELECT chapter_id, COUNT(*) as count
                   FROM chapter_notes
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            notes_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Get per-chapter uploads count
            cur.execute(
                """SELECT chapter_id, COUNT(*) as count
                   FROM chapter_uploads
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            uploads_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Get per-chapter video history count
            cur.execute(
                """SELECT chapter_id, COUNT(DISTINCT video_id) as count
                   FROM chapter_video_history
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            videos_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Get per-chapter flashcard sets count
            cur.execute(
                """SELECT chapter_id, COUNT(*) as count
                   FROM chapter_flashcard_sets
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            flashcards_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Attach checkpoint-based progress to each chapter
            for chapter in chapters:
                if ChapterService._is_generic_baseline_description(chapter.get("description")):
                    chapter["description"] = ChapterService._build_medium_aware_description(
                        chapter,
                        user_medium_language,
                    )

                cid = chapter["id"]
                quiz_data = quiz_progress.get(cid, {})
                notes = notes_count.get(cid, 0) + uploads_count.get(cid, 0)
                videos = videos_count.get(cid, 0)
                flashcards = flashcards_count.get(cid, 0)
                quiz_count = quiz_data.get("count", 0)
                quiz_avg = quiz_data.get("avg_score", 0)
                
                # 5 Checkpoints, each worth 20%:
                progress = 0
                
                # □ Has notes/uploads → +20%
                if notes > 0:
                    progress += 20
                
                # □ Watched videos → +20%
                if videos > 0:
                    progress += 20
                
                # □ Has flashcards → +20%
                if flashcards > 0:
                    progress += 20
                
                # □ Took at least 5 quizzes → +20%
                if quiz_count >= 5:
                    progress += 20
                    
                    # □ Quiz avg ≥70% (only counts after 5 quizzes) → +20%
                    if quiz_avg >= 70:
                        progress += 20
                
                chapter["progress_percent"] = progress
                chapter["quiz_count"] = quiz_count
                chapter["quiz_score"] = quiz_avg if quiz_data else None
                chapter["notes_count"] = notes
                chapter["videos_count"] = videos
                chapter["flashcards_count"] = flashcards
                chapter["last_studied"] = None  # Could add from chapter activity tracking
            
            return chapters
        finally:
            conn.close()
    
    @staticmethod
    def bulk_create_chapters(chapters: List[ChapterCreate], school_id: int = None) -> int:
        """
        Bulk create chapters (for seeding).
        Returns count of created chapters.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            created = 0
            
            for data in chapters:
                try:
                    # Skip if exists
                    cur.execute(
                        """SELECT id FROM chapters
                           WHERE board_id = %s AND standard_id = %s AND subject_id = %s AND chapter_number = %s""",
                        (data.board_id, data.standard_id, data.subject_id, data.chapter_number)
                    )
                    if cur.fetchone():
                        continue
                    
                    topics_json = json.dumps(data.topics or [])
                    cur.execute(
                        """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name,
                                                 chapter_name_local, description, topics, is_active)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (data.board_id, data.standard_id, data.subject_id, data.chapter_number, data.chapter_name,
                         data.chapter_name_local, data.description, topics_json, data.is_active)
                    )
                    created += 1
                except Exception as e:
                    logger.warning(f"Skipped chapter {data.chapter_name}: {e}")
                    continue
            
            conn.commit()
            return created
        except Exception as e:
            conn.rollback()
            logger.error(f"Bulk create failed: {e}")
            raise HTTPException(status_code=500, detail="Bulk create failed")
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_chapters(ids: List[int], school_id: int = None) -> int:
        """
        Bulk delete chapters by IDs.
        Returns count of deleted chapters.
        """
        if not ids:
            return 0
            
        conn = get_db()
        try:
            cur = conn.cursor()
            if school_id is not None:
                cur.execute(
                    "DELETE FROM chapters WHERE id = ANY(%s) AND school_id = %s RETURNING id",
                    (ids, school_id)
                )
            else:
                cur.execute(
                    "DELETE FROM chapters WHERE id = ANY(%s) RETURNING id",
                    (ids,)
                )
            deleted = cur.rowcount
            conn.commit()
            return deleted
        except Exception as e:
            conn.rollback()
            logger.error(f"Bulk delete failed: {e}")
            raise HTTPException(status_code=500, detail="Bulk delete failed")
        finally:
            conn.close()
