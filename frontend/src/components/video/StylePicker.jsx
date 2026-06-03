// StylePicker.jsx — Visual style selector for Video Creator
const STYLES = [
  {
    key: 'sketch_classic',
    label: 'Sketch Classic',
    description: 'Hand-drawn look, warm paper background',
    bg: '#fdf6e3',
    border: '#8b6914',
    textColor: '#3d2b00',
    preview: '✏️',
  },
  {
    key: 'sketch_dark',
    label: 'Sketch Dark',
    description: 'Dark board with chalk-style white drawing',
    bg: '#1a1a2e',
    border: '#e0e0e0',
    textColor: '#e0e0e0',
    preview: '🖊️',
  },
  {
    key: 'canvas_colorful',
    label: 'Canvas Colorful',
    description: 'Bright colors, bold shapes, vibrant energy',
    bg: '#fff9f0',
    border: '#ff6b35',
    textColor: '#1a1a1a',
    preview: '🎨',
  },
  {
    key: 'canvas_minimal',
    label: 'Canvas Minimal',
    description: 'Clean white canvas with blue accents',
    bg: '#f8fafc',
    border: '#3b82f6',
    textColor: '#1e293b',
    preview: '⬜',
  },
  {
    key: 'blackboard',
    label: 'Blackboard',
    description: 'Classic classroom chalkboard in green',
    bg: '#1c3d2e',
    border: '#a8d8b8',
    textColor: '#e8f5ec',
    preview: '🟩',
  },
]

export default function StylePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {STYLES.map((s) => {
        const selected = value === s.key
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              backgroundColor: s.bg,
              color: s.textColor,
              borderColor: selected ? s.border : 'rgba(255,255,255,0.06)',
              outline: selected ? `2px solid ${s.border}` : '2px solid transparent',
            }}
            className={`
              relative rounded-xl p-4 text-left transition-all duration-200
              border-2 cursor-pointer
              ${selected ? 'shadow-lg scale-[1.02]' : 'opacity-75 hover:opacity-100 hover:scale-[1.01]'}
            `}
          >
            {selected && (
              <span
                className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: s.border, color: '#fff' }}
              >
                ✓ Selected
              </span>
            )}
            <div className="text-3xl mb-2">{s.preview}</div>
            <div className="font-semibold text-sm mb-1">{s.label}</div>
            <div className="text-xs opacity-75">{s.description}</div>
          </button>
        )
      })}
    </div>
  )
}
