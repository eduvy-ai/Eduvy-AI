// ─── Diagram Viewer Component ───────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { DiagramData } from '../../modules/studycoach'

interface DiagramViewerProps {
  diagram: DiagramData
}

/**
 * Sanitize and fix common Mermaid syntax issues from AI output
 */
function sanitizeMermaidContent(content: string): string {
  if (!content) return ''
  
  let sanitized = content
  
  // Convert escaped newlines to actual newlines
  sanitized = sanitized.replace(/\\n/g, '\n')
  
  // Remove any markdown code fences that AI might have included
  sanitized = sanitized.replace(/^```mermaid\s*/i, '')
  sanitized = sanitized.replace(/^```\s*/gm, '')
  sanitized = sanitized.replace(/\s*```$/g, '')
  
  // Fix common AI mistakes in flowchart syntax
  // Convert "flowchart TD\n" to proper format
  if (!sanitized.match(/^(flowchart|graph|mindmap|sequenceDiagram|classDiagram)/i)) {
    sanitized = 'flowchart TD\n' + sanitized
  }
  
  // Remove problematic characters that break Mermaid
  // Keep alphanumeric, basic punctuation, arrows, brackets
  sanitized = sanitized.split('\n').map(line => {
    // Skip directive lines
    if (line.match(/^(flowchart|graph|mindmap|sequenceDiagram|classDiagram|subgraph|end)/i)) {
      return line
    }
    // For node labels in brackets, simplify to ASCII-safe text
    return line.replace(/\[([^\]]+)\]/g, (_match, label) => {
      // If label has non-ASCII, keep it but wrap safely
      return `[${label}]`
    })
  }).join('\n')
  
  // Ensure consistent spacing around arrows
  sanitized = sanitized.replace(/\s*-->\s*/g, ' --> ')
  sanitized = sanitized.replace(/\s*---\s*/g, ' --- ')
  sanitized = sanitized.replace(/\s*-\.->\s*/g, ' -.-> ')
  
  return sanitized.trim()
}

/**
 * Create a simple text-based fallback diagram
 */
function createTextDiagram(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())
  const nodes: string[] = []
  
  // Extract node labels from the content
  lines.forEach(line => {
    const matches = line.match(/\[([^\]]+)\]/g)
    if (matches) {
      matches.forEach(match => {
        const label = match.slice(1, -1)
        if (!nodes.includes(label)) {
          nodes.push(label)
        }
      })
    }
  })
  
  if (nodes.length === 0) {
    return content
  }
  
  // Create a simple text representation
  return nodes.map((node, i) => `${i + 1}. ${node}`).join('\n↓\n')
}

export default function DiagramViewer({ diagram }: DiagramViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [fallbackText, setFallbackText] = useState<string | null>(null)

  useEffect(() => {
    if (!diagram.content || !containerRef.current) return

    const renderDiagram = async () => {
      const sanitizedContent = sanitizeMermaidContent(diagram.content)
      
      if (!sanitizedContent) {
        setError('Empty diagram content')
        return
      }

      try {
        // Dynamically import mermaid to avoid bundle bloat
        const mermaid = (await import('mermaid')).default
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#64748b',
            lineColor: '#64748b',
            secondaryColor: '#8b5cf6',
            tertiaryColor: '#1e293b',
            fontFamily: 'Sora, sans-serif',
          },
          flowchart: {
            curve: 'basis',
            padding: 20,
            htmlLabels: true,
          },
          securityLevel: 'loose',
          suppressErrorRendering: true,
        })

        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
        
        // Validate syntax first
        const isValid = await mermaid.parse(sanitizedContent, { suppressErrors: true })
        
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax')
        }
        
        const { svg } = await mermaid.render(uniqueId, sanitizedContent)
        setSvgContent(svg)
        setError(null)
        setFallbackText(null)
      } catch (err) {
        console.error('Mermaid render error:', err, '\nContent:', sanitizedContent)
        
        // Create fallback text diagram
        const textDiagram = createTextDiagram(sanitizedContent)
        setFallbackText(textDiagram)
        setError('Diagram preview (simplified)')
        setSvgContent(null)
      }
    }

    renderDiagram()
  }, [diagram.content])

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Visual Diagram
        <span className="text-xs text-slate-400 font-normal ml-2">({diagram.type})</span>
      </h3>
      
      <div
        ref={containerRef}
        className="bg-slate-900/50 rounded-xl p-4 overflow-x-auto"
      >
        {svgContent ? (
          <div
            className="flex justify-center min-w-fit [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : fallbackText ? (
          <div className="space-y-3">
            <p className="text-amber-400/80 text-xs">{error}</p>
            <div className="text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
              {fallbackText}
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-yellow-400 text-sm">{error}</p>
            <pre className="text-xs text-slate-400 overflow-x-auto bg-slate-900 p-3 rounded-lg whitespace-pre-wrap">
              {diagram.content}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
