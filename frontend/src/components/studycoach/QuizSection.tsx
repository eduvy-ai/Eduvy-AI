// ─── Quiz Section Component ───────────────────────────────────

import { useState } from 'react'
import type { QuizQuestion } from '../../modules/studycoach'

interface QuizSectionProps {
  questions: QuizQuestion[]
}

export default function QuizSection({ questions }: QuizSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)

  const currentQuestion = questions[currentIndex]

  const handleAnswer = (option: string) => {
    if (selectedAnswer) return // Already answered
    
    const letter = option.charAt(0) // Get A, B, C, or D
    setSelectedAnswer(letter)
    setShowExplanation(true)
    
    if (letter === currentQuestion.correct_answer) {
      setScore(score + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      setCompleted(true)
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setScore(0)
    setCompleted(false)
  }

  if (completed) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold text-white">Quiz Complete! 🎉</h3>
          <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {percentage}%
          </div>
          <p className="text-slate-300">
            You got {score} out of {questions.length} questions correct
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">❓</span>
          Knowledge Check
        </h3>
        <span className="text-sm text-slate-400">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-white text-lg mb-6">{currentQuestion.question}</p>

      {/* Options */}
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          const letter = option.charAt(0)
          const isSelected = selectedAnswer === letter
          const isCorrect = letter === currentQuestion.correct_answer
          const showResult = selectedAnswer !== null

          let bgClass = 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50'
          if (showResult) {
            if (isCorrect) {
              bgClass = 'bg-green-500/20 border-green-500/50'
            } else if (isSelected && !isCorrect) {
              bgClass = 'bg-red-500/20 border-red-500/50'
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={selectedAnswer !== null}
              className={`
                w-full p-4 rounded-xl border text-left transition-all
                ${bgClass}
                ${selectedAnswer === null ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className={`${showResult && isCorrect ? 'text-green-400' : 'text-slate-300'}`}>
                {option}
              </span>
              {showResult && isCorrect && (
                <span className="ml-2 text-green-400">✓</span>
              )}
              {showResult && isSelected && !isCorrect && (
                <span className="ml-2 text-red-400">✗</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
          <p className="text-sm text-slate-400 mb-1">Explanation:</p>
          <p className="text-slate-300">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Next Button */}
      {selectedAnswer && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-colors"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  )
}
