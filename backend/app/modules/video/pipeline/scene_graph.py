"""
Scene Graph — Data structures for video scene representation and validation.
"""
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Valid SVG scene types
VALID_SVG_TYPES = {
    "title_card", "draw", "scene", "equation_write", "cycle_loop",
    "flow_arrows", "timeline_dots", "tree_hierarchy", "venn_two",
    "radial_web", "bar_chart", "staircase_steps", "funnel_layers",
    "comparison_table", "annotated_diagram", "bullet_reveal",
    "paragraph_reveal",
}

# Types that look generic/identical across videos
GENERIC_TYPES = {"", "title_card", "bullet_reveal", "paragraph_reveal"}


@dataclass
class Scene:
    """A single scene in the video."""
    id: int
    title: str
    duration_sec: int = 10
    narration: str = ""
    svg_type: str = "draw"
    svg_data: Dict[str, Any] = field(default_factory=dict)
    onscreen_text: List[str] = field(default_factory=list)
    accent: str = "#2980b9"
    transition_in: str = "fade"
    transition_out: str = "fade"

    def is_valid(self) -> bool:
        """Check if scene has minimum required data."""
        return bool(self.narration and self.svg_type)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "duration_sec": self.duration_sec,
            "narration": self.narration,
            "svg_type": self.svg_type,
            "svg_data": self.svg_data,
            "onscreen_text": self.onscreen_text,
            "accent": self.accent,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], index: int = 0) -> "Scene":
        return cls(
            id=data.get("id", index),
            title=data.get("title", f"Scene {index + 1}"),
            duration_sec=data.get("duration_sec", 10),
            narration=data.get("narration", ""),
            svg_type=data.get("svg_type", "draw"),
            svg_data=data.get("svg_data", {}),
            onscreen_text=data.get("onscreen_text", []),
            accent=data.get("accent", "#2980b9"),
        )


@dataclass
class LessonPlan:
    """Structured lesson plan output from Stage 1."""
    topic: str
    subject: str
    grade: str
    learning_objectives: List[str] = field(default_factory=list)
    key_concepts: List[Dict[str, str]] = field(default_factory=list)
    visual_strategy: List[Dict[str, str]] = field(default_factory=list)
    prerequisite_knowledge: List[str] = field(default_factory=list)
    assessment_points: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "topic": self.topic,
            "subject": self.subject,
            "grade": self.grade,
            "learning_objectives": self.learning_objectives,
            "key_concepts": self.key_concepts,
            "visual_strategy": self.visual_strategy,
            "prerequisite_knowledge": self.prerequisite_knowledge,
            "assessment_points": self.assessment_points,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LessonPlan":
        return cls(
            topic=data.get("topic", ""),
            subject=data.get("subject", ""),
            grade=data.get("grade", ""),
            learning_objectives=data.get("learning_objectives", []),
            key_concepts=data.get("key_concepts", []),
            visual_strategy=data.get("visual_strategy", []),
            prerequisite_knowledge=data.get("prerequisite_knowledge", []),
            assessment_points=data.get("assessment_points", []),
        )


class SceneGraph:
    """
    Ordered collection of scenes that make up a video.
    Handles validation, normalization, and timing calculation.
    """

    def __init__(self, title: str = "", scenes: Optional[List[Scene]] = None):
        self.title = title
        self.scenes: List[Scene] = scenes or []

    @property
    def total_duration_sec(self) -> int:
        return sum(s.duration_sec for s in self.scenes)

    @property
    def scene_count(self) -> int:
        return len(self.scenes)

    def add_scene(self, scene: Scene) -> None:
        self.scenes.append(scene)

    def validate(self) -> List[str]:
        """Return list of validation warnings (empty = all good)."""
        warnings = []
        if not self.scenes:
            warnings.append("No scenes in graph")
            return warnings

        for i, scene in enumerate(self.scenes):
            if not scene.narration:
                warnings.append(f"Scene {i} has no narration")
            if not scene.svg_type or scene.svg_type not in VALID_SVG_TYPES:
                warnings.append(f"Scene {i} has invalid svg_type: {scene.svg_type}")
            if scene.duration_sec < 3:
                warnings.append(f"Scene {i} duration too short: {scene.duration_sec}s")
            if scene.duration_sec > 30:
                warnings.append(f"Scene {i} duration too long: {scene.duration_sec}s")

        # Check variety
        types_used = [s.svg_type for s in self.scenes]
        from collections import Counter
        type_counts = Counter(types_used)
        for t, count in type_counts.items():
            if count > 3 and len(self.scenes) > 4:
                warnings.append(f"svg_type '{t}' used {count} times — lacks variety")

        return warnings

    def auto_repair(self, topic: str = "") -> None:
        """
        Auto-fix common scene issues (ManimAgent-inspired self-repair).
        Mutates scenes in place. Called after SceneGraph is built from AI output.
        """
        if not self.scenes:
            return

        # Alt keys a model might use instead of "narration"
        _ALT_NARRATION_KEYS = ("narration", "voiceover", "voice_over", "narration_text",
                               "script", "text", "speech", "vo", "voice", "say")

        for i, scene in enumerate(self.scenes):
            # Fix 1: Resolve missing narration from alt keys
            if not scene.narration:
                raw = scene.to_dict()
                for k in _ALT_NARRATION_KEYS:
                    v = raw.get(k)
                    if isinstance(v, str) and v.strip():
                        scene.narration = v.strip()
                        break
                # Still empty? Synthesize from title + onscreen_text
                if not scene.narration:
                    parts = []
                    if scene.title:
                        parts.append(scene.title)
                    if scene.onscreen_text:
                        parts.extend(str(x) for x in scene.onscreen_text if str(x).strip())
                    scene.narration = ". ".join(parts)[:200] or f"Let's look at {topic or 'this concept'}."

            # Fix 2: Invalid svg_type → fall back to 'draw'
            if scene.svg_type not in VALID_SVG_TYPES:
                logger.warning("Auto-repair: scene %d invalid type '%s' → 'draw'", i, scene.svg_type)
                scene.svg_type = "draw"
                if not scene.svg_data.get("subject"):
                    scene.svg_data["subject"] = scene.title or topic or "diagram"

            # Fix 3: Duration bounds (min 5s, max 25s)
            if scene.duration_sec < 5:
                scene.duration_sec = 8
            elif scene.duration_sec > 25:
                scene.duration_sec = 15

            # Fix 4: Ensure 'draw' type has a subject
            if scene.svg_type == "draw" and not scene.svg_data.get("subject"):
                scene.svg_data["subject"] = scene.title or topic or "concept illustration"

            # Fix 5: Ensure 'scene' type has items
            if scene.svg_type == "scene" and not scene.svg_data.get("items"):
                scene.svg_data.setdefault("layout", "center")
                scene.svg_data.setdefault("focus", "bulb")
                scene.svg_data.setdefault("items", [
                    {"icon": "star", "label": scene.title[:15] if scene.title else "Idea"}
                ])

        # Fix 6: Opening scene — should not be generic
        first = self.scenes[0]
        if first.svg_type in GENERIC_TYPES:
            first.svg_type = "draw"
            first.svg_data = {"subject": topic or first.title or "the main concept",
                             "label": self.title[:30] if self.title else ""}

        # Fix 7: Closing scene — should be a recap, not bullet_reveal
        if len(self.scenes) >= 2:
            last = self.scenes[-1]
            if last.svg_type in GENERIC_TYPES:
                labels = []
                for s in self.scenes[1:-1]:
                    if s.title and s.title not in labels:
                        labels.append(s.title[:15])
                    if len(labels) >= 4:
                        break
                icons = ["bulb", "star", "check", "gear", "rocket", "heart"]
                items = [{"icon": icons[j % len(icons)], "label": lab}
                         for j, lab in enumerate(labels or ["Key idea"])]
                last.svg_type = "scene"
                last.svg_data = {"layout": "radial", "focus": "target", "items": items}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "total_scenes": self.scene_count,
            "total_duration_sec": self.total_duration_sec,
            "scenes": [s.to_dict() for s in self.scenes],
        }

    def to_scene_list(self) -> List[Dict[str, Any]]:
        """Return scenes as list of dicts (for DB storage)."""
        return [s.to_dict() for s in self.scenes]

    @classmethod
    def from_ai_output(cls, data: Dict[str, Any]) -> "SceneGraph":
        """Build SceneGraph from raw AI JSON output."""
        title = data.get("title", "")
        raw_scenes = data.get("scenes", [])
        scenes = []
        for i, raw in enumerate(raw_scenes):
            if isinstance(raw, dict):
                scenes.append(Scene.from_dict(raw, index=i))
        graph = cls(title=title, scenes=scenes)

        warnings = graph.validate()
        if warnings:
            logger.warning("SceneGraph validation: %s", "; ".join(warnings))

        return graph
