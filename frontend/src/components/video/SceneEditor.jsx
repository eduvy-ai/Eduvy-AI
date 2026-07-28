// SceneEditor.jsx — Editable scene card in Step 3 of Video Creator
import { useState } from 'react'
import { li } from '../../i18n/index.js'

const SVG_TYPE_KEYS = {
  title_card: 'svgTitleCard',
  bullet_reveal: 'svgBulletReveal',
  flow_arrows: 'svgFlowArrows',
  comparison_table: 'svgComparisonTable',
  timeline_dots: 'svgTimelineDots',
  radial_web: 'svgRadialWeb',
  equation_write: 'svgEquationWrite',
  staircase_steps: 'svgStaircaseSteps',
  venn_two: 'svgVennTwo',
  tree_hierarchy: 'svgTreeHierarchy',
  bar_chart: 'svgBarChart',
  cycle_loop: 'svgCycleLoop',
  funnel_layers: 'svgFunnelLayers',
  paragraph_reveal: 'svgParagraphReveal',
  annotated_diagram: 'svgAnnotatedDiagram',
  illustration: 'svgIllustration',
  scene: 'svgScene',
  composition: 'svgScene',
  draw: 'svgDraw',
}

export default function SceneEditor({ scene, index, onChange, lang = 'English' }) {
  const [expanded, setExpanded] = useState(index === 0)
  const ui = li(lang)

  const typeKey = SVG_TYPE_KEYS[scene.svg_type]
  const label = (typeKey && ui[typeKey]) || scene.svg_type

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
            {ui.narrationScript || 'Narration script'}
          </label>
          <textarea
            value={scene.narration}
            onChange={(e) => onChange(index, { ...scene, narration: e.target.value })}
            rows={3}
            className="input-base resize-y"
            placeholder={ui.narrationPlaceholder || 'What the narrator will say for this scene…'}
          />
          {scene.onscreen_text && (
            <div className="mt-2 text-xs text-app-muted">
              <span className="font-medium">{ui.onScreenText || 'On-screen text: '}</span>
              <span className="italic">{scene.onscreen_text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
