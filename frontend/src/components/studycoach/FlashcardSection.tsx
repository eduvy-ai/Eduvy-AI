// ─── Flashcard Section Component ───────────────────────────────────

import { useState } from 'react'
import type { Flashcard } from '../../modules/studycoach'

interface FlashcardSectionProps {
  flashcards: Flashcard[]
}

export default function FlashcardSection({ flashcards }: FlashcardSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const currentCard = flashcards[currentIndex]

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          Flashcards
        </h3>
        <span className="text-sm text-slate-400">
          {currentIndex + 1} / {flashcards.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {flashcards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index)
              setIsFlipped(false)
            }}
            className={`
              w-2 h-2 rounded-full transition-all
              ${index === currentIndex ? 'bg-blue-500 w-6' : 'bg-slate-600 hover:bg-slate-500'}
            `}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative h-48 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`
            absolute inset-0 transition-transform duration-500 transform-style-3d
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30 flex items-center justify-center p-6 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xl text-white text-center font-medium">{currentCard.front}</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 flex items-center justify-center p-6 backface-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-lg text-slate-200 text-center">{currentCard.back}</p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-3">
        Click to flip
      </p>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
