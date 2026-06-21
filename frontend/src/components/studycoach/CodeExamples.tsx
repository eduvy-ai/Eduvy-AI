// ─── Code Examples Component ───────────────────────────────────

import React, { useState } from 'react'
import type { CodeExample } from '../../modules/studycoach'

interface CodeExamplesProps {
  examples: CodeExample[]
}

export default function CodeExamples({ examples }: CodeExamplesProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const currentExample = examples[activeTab]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentExample.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">💻</span>
        Code Examples
      </h3>

      {/* Tabs */}
      {examples.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${index === activeTab
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }
              `}
            >
              {example.title || `Example ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Code Block */}
      <div className="relative">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 rounded-t-xl border-b border-slate-700">
          <span className="text-xs text-slate-400 font-mono">{currentExample.language}</span>
          <button
            onClick={handleCopy}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="bg-slate-900 p-4 rounded-b-xl overflow-x-auto">
          <code className="text-sm text-slate-300 font-mono whitespace-pre">
            {currentExample.code}
          </code>
        </pre>
      </div>

      {/* Explanation */}
      {currentExample.explanation && (
        <div className="mt-4 p-4 bg-slate-700/30 rounded-xl">
          <p className="text-sm text-slate-400 mb-1">Explanation:</p>
          <p className="text-slate-300 text-sm">{currentExample.explanation}</p>
        </div>
      )}
    </div>
  )
}
