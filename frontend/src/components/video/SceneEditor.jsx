// SceneEditor.jsx — Editable scene card in Step 3 of Video Creator
import { useState } from 'react'

const SVG_TYPE_LABELS = {
  title_card: '🎬 Title',
  bullet_reveal: '📋 Bullet List',
  flow_arrows: '➡️ Flow Chart',
  comparison_table: '📊 Comparison',
  timeline_dots: '🕐 Timeline',
  radial_web: '🕸️ Radial Web',
  equation_write: '✏️ Equation',
  staircase_steps: '🪜 Steps',
  venn_two: '⭕ Venn',
  tree_hierarchy: '🌳 Hierarchy',
  bar_chart: '📈 Bar Chart',
  cycle_loop: '🔄 Cycle',
  funnel_layers: '🔽 Funnel',
  paragraph_reveal: '📝 Paragraph',
  annotated_diagram: '🔬 Labeled Diagram',
  illustration: '🖼️ Illustration',
  scene: '🎨 Scene',
  composition: '🎨 Scene',
  draw: '✏️ Sketch',
}

export default function SceneEditor({ scene, index, onChange }) {
  const [expanded, setExpanded] = useState(index === 0)

  const label = SVG_TYPE_LABELS[scene.svg_type] || scene.svg_type

  return (
    <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-app-muted text-sm font-mono w-6 shrink-0">#{index + 1}</span>
        <span className="flex-1 font-medium text-sm text-app-text truncate">
          {scene.title || `Scene ${index + 1}`}
        </span>
        <span className="text-xs bg-app-blue/15 text-app-blue px-2 py-0.5 rounded-full shrink-0">
          {label}
        </span>
        <span className="text-xs text-app-muted shrink-0">{scene.duration_sec}s</span>
        <span className="text-app-muted text-xs ml-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-app-border">
          <label className="label mt-3 mb-1">
            Narration script
          </label>
          <textarea
            value={scene.narration}
            onChange={(e) => onChange(index, { ...scene, narration: e.target.value })}
            rows={3}
            className="input-base resize-y"
            placeholder="What the narrator will say for this scene…"
          />
          {scene.onscreen_text && (
            <div className="mt-2 text-xs text-app-muted">
              <span className="font-medium">On-screen text: </span>
              <span className="italic">{scene.onscreen_text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
