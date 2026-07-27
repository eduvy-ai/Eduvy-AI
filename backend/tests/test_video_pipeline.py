"""
Tests for Video Pipeline modules.
Run with: pytest backend/tests/test_video_pipeline.py -v
"""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# ── Scene Graph Tests ─────────────────────────────────────────────────────────


class TestSceneGraph:
    def test_scene_from_dict(self):
        from app.modules.video.pipeline.scene_graph import Scene
        data = {
            "id": 0,
            "title": "Test Scene",
            "duration_sec": 12,
            "narration": "Hello world",
            "svg_type": "draw",
            "svg_data": {"subject": "a cat"},
            "onscreen_text": ["Cat facts"],
            "accent": "#e74c3c",
        }
        scene = Scene.from_dict(data)
        assert scene.title == "Test Scene"
        assert scene.narration == "Hello world"
        assert scene.svg_type == "draw"
        assert scene.is_valid()

    def test_scene_invalid_without_narration(self):
        from app.modules.video.pipeline.scene_graph import Scene
        scene = Scene(id=0, title="Empty", narration="", svg_type="draw")
        assert not scene.is_valid()

    def test_scene_graph_from_ai_output(self):
        from app.modules.video.pipeline.scene_graph import SceneGraph
        data = {
            "title": "Test Video",
            "scenes": [
                {"id": 0, "title": "S1", "narration": "Scene one", "svg_type": "draw",
                 "svg_data": {"subject": "test"}, "duration_sec": 10},
                {"id": 1, "title": "S2", "narration": "Scene two", "svg_type": "scene",
                 "svg_data": {"layout": "row", "items": []}, "duration_sec": 8},
            ],
        }
        graph = SceneGraph.from_ai_output(data)
        assert graph.scene_count == 2
        assert graph.total_duration_sec == 18
        assert graph.title == "Test Video"

    def test_scene_graph_validation(self):
        from app.modules.video.pipeline.scene_graph import SceneGraph, Scene
        graph = SceneGraph(title="T", scenes=[
            Scene(id=0, title="X", narration="", svg_type="draw", duration_sec=10),
        ])
        warnings = graph.validate()
        assert any("no narration" in w for w in warnings)

    def test_auto_repair_missing_narration(self):
        from app.modules.video.pipeline.scene_graph import SceneGraph, Scene
        graph = SceneGraph(title="T", scenes=[
            Scene(id=0, title="Opening", narration="", svg_type="draw",
                  svg_data={"subject": "a flower"}, duration_sec=10,
                  onscreen_text=["Flowers bloom"]),
        ])
        graph.auto_repair("Flowers")
        assert graph.scenes[0].narration != ""  # Should be synthesized

    def test_auto_repair_invalid_svg_type(self):
        from app.modules.video.pipeline.scene_graph import SceneGraph, Scene
        graph = SceneGraph(title="T", scenes=[
            Scene(id=0, title="Broken", narration="Hello", svg_type="invalid_type",
                  svg_data={}, duration_sec=10),
        ])
        graph.auto_repair("Topic")
        assert graph.scenes[0].svg_type == "draw"
        assert graph.scenes[0].svg_data.get("subject")

    def test_auto_repair_duration_bounds(self):
        from app.modules.video.pipeline.scene_graph import SceneGraph, Scene
        graph = SceneGraph(title="T", scenes=[
            Scene(id=0, title="Short", narration="Hi", svg_type="draw",
                  svg_data={"subject": "x"}, duration_sec=2),
            Scene(id=1, title="Long", narration="Hi", svg_type="draw",
                  svg_data={"subject": "y"}, duration_sec=60),
        ])
        graph.auto_repair("Topic")
        assert graph.scenes[0].duration_sec >= 5
        assert graph.scenes[1].duration_sec <= 25

    def test_auto_repair_generic_opening(self):
        from app.modules.video.pipeline.scene_graph import SceneGraph, Scene
        graph = SceneGraph(title="T", scenes=[
            Scene(id=0, title="Title", narration="Hi", svg_type="title_card",
                  svg_data={}, duration_sec=10),
            Scene(id=1, title="Body", narration="Content", svg_type="draw",
                  svg_data={"subject": "thing"}, duration_sec=10),
        ])
        graph.auto_repair("Volcanoes")
        assert graph.scenes[0].svg_type == "draw"  # Should be changed from title_card


class TestLessonPlan:
    def test_lesson_plan_from_dict(self):
        from app.modules.video.pipeline.scene_graph import LessonPlan
        data = {
            "topic": "Gravity",
            "subject": "Physics",
            "grade": "Class 9",
            "learning_objectives": ["Understand gravity"],
            "key_concepts": [{"concept": "Force", "explanation": "pull",
                             "visual_anchor": "apple falling", "bloom_level": "understand"}],
            "visual_strategy": [{"scene_purpose": "show force",
                                "recommended_type": "draw",
                                "visual_description": "apple falling from tree"}],
        }
        plan = LessonPlan.from_dict(data)
        assert plan.topic == "Gravity"
        assert len(plan.key_concepts) == 1

    def test_lesson_plan_to_dict_roundtrip(self):
        from app.modules.video.pipeline.scene_graph import LessonPlan
        plan = LessonPlan(topic="X", subject="Y", grade="Z",
                         key_concepts=[{"concept": "A"}])
        d = plan.to_dict()
        plan2 = LessonPlan.from_dict(d)
        assert plan2.topic == "X"
        assert plan2.key_concepts == [{"concept": "A"}]


# ── Subtitle Generator Tests ─────────────────────────────────────────────────


class TestSubtitleGenerator:
    def test_generate_srt(self, tmp_path):
        from app.modules.video.pipeline.subtitle_gen import SubtitleGenerator
        scenes = [
            {"narration": "Hello world. This is a test."},
            {"narration": "Second scene narration here."},
        ]
        durations = [5.0, 4.0]
        out = str(tmp_path / "test.srt")
        result = SubtitleGenerator.generate_srt(scenes, durations, out)
        assert os.path.exists(result)
        content = open(result, encoding="utf-8").read()
        assert "Hello" in content
        assert "-->" in content

    def test_empty_narration_skipped(self, tmp_path):
        from app.modules.video.pipeline.subtitle_gen import SubtitleGenerator
        scenes = [{"narration": ""}, {"narration": "Real content"}]
        durations = [3.0, 5.0]
        out = str(tmp_path / "test2.srt")
        SubtitleGenerator.generate_srt(scenes, durations, out)
        content = open(out, encoding="utf-8").read()
        assert "Real content" in content


# ── Transitions Tests ─────────────────────────────────────────────────────────


class TestTransitions:
    def test_transition_types_defined(self):
        from app.modules.video.pipeline.transitions import TRANSITION_TYPES
        assert "fade" in TRANSITION_TYPES
        assert "dissolve" in TRANSITION_TYPES
        assert len(TRANSITION_TYPES) >= 10


# ── Renderers Tests ───────────────────────────────────────────────────────────


class TestRenderers:
    def test_get_style_variant(self):
        from app.modules.video.pipeline.renderers import get_style_variant
        assert get_style_variant("whiteboard") == "sketch_classic"
        assert get_style_variant("blackboard") == "blackboard"
        assert get_style_variant("dark") == "sketch_dark"
        assert get_style_variant("unknown") == "sketch_classic"  # default

    def test_get_available_styles(self):
        from app.modules.video.pipeline.renderers import get_available_styles
        styles = get_available_styles()
        assert len(styles) >= 5
        assert all("key" in s and "label" in s for s in styles)

    def test_style_css_overrides(self):
        from app.modules.video.pipeline.renderers import get_style_css_overrides
        overrides = get_style_css_overrides("blackboard")
        assert "--bg-color" in overrides
        assert overrides["--bg-color"] == "#2d4a3e"


# ── Visual Validator Tests ────────────────────────────────────────────────────


class TestVisualValidator:
    @pytest.mark.asyncio
    async def test_missing_frame(self):
        from app.modules.video.pipeline.visual_validator import VisualValidator
        result = await VisualValidator.validate_frames(
            ["/nonexistent/path.mp4"], [{"duration_sec": 10}]
        )
        assert result["overall_score"] == 0.0
        assert result["failed_frames"] == 1

    @pytest.mark.asyncio
    async def test_valid_frame(self, tmp_path):
        from app.modules.video.pipeline.visual_validator import VisualValidator
        # Create a fake MP4 file with some content
        fake = tmp_path / "frame.mp4"
        fake.write_bytes(b"\x00" * 50000)  # 50KB fake file
        result = await VisualValidator.validate_single(str(fake), "test content")
        assert result["score"] > 0.3


# ── Offline LLM Tests ─────────────────────────────────────────────────────────


class TestOfflineLLM:
    def test_capabilities_report(self):
        from app.modules.video.pipeline.offline_llm import get_local_capabilities
        caps = get_local_capabilities()
        assert "ollama" in caps
        assert "piper_tts" in caps
        assert "available" in caps["ollama"]

    def test_piper_voices_defined(self):
        from app.modules.video.pipeline.offline_llm import PIPER_VOICES
        assert "English" in PIPER_VOICES


# ── KaTeX/Mermaid Tests ───────────────────────────────────────────────────────


class TestKaTexMermaid:
    def test_availability_checks(self):
        from app.modules.video.pipeline.katex_mermaid import is_katex_available, is_mermaid_available
        # These just shouldn't crash — availability depends on environment
        assert isinstance(is_katex_available(), bool)
        assert isinstance(is_mermaid_available(), bool)


# ── Diagram Generator Tests ───────────────────────────────────────────────────


class TestDiagramGenerator:
    def test_math_svg(self):
        from app.modules.video.pipeline.diagram_gen import DiagramGenerator
        svg = DiagramGenerator.generate_math_svg("E=mc^2", ["E=Energy", "m=Mass"])
        assert "<svg" in svg
        assert "E=mc" in svg

    def test_flowchart_svg(self):
        from app.modules.video.pipeline.diagram_gen import DiagramGenerator
        svg = DiagramGenerator.generate_flowchart_svg(["Start", "Middle", "End"])
        assert "<svg" in svg
        assert "Start" in svg

    def test_cycle_svg(self):
        from app.modules.video.pipeline.diagram_gen import DiagramGenerator
        svg = DiagramGenerator.generate_cycle_svg(["A", "B", "C"])
        assert "<svg" in svg


# ── Needed for file-based tests ───────────────────────────────────────────────
import os
