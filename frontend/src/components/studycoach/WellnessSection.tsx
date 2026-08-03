// ─── Wellness Section Component ───────────────────────────────────
// Renders wellness mode response with validation, techniques, and affirmations

import type { WellnessResponse } from '../../modules/studycoach'
import { Heart, Sparkle, ListChecks, Leaf } from '@phosphor-icons/react'

interface WellnessSectionProps {
  wellness: WellnessResponse
  ui: Record<string, string>
}

export default function WellnessSection({ wellness, ui }: WellnessSectionProps) {
  if (!wellness) return null

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Title & Validation */}
      <div className="bg-gradient-to-br from-blue-500/15 to-purple-500/15 rounded-2xl p-6 border border-blue-500/20">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <Heart size={24} weight="duotone" className="text-blue-400" />
          {wellness.title}
        </h2>
        
        {/* Validation */}
        <p className="text-slate-300 text-[15px] leading-relaxed mb-4">
          {wellness.validation}
        </p>
        
        {/* Normalisation */}
        {wellness.normalisation && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-slate-400 text-[14px] italic">
              {wellness.normalisation}
            </p>
          </div>
        )}
      </div>

      {/* Technique */}
      {wellness.technique && (
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkle size={22} weight="duotone" className="text-emerald-400" />
            {wellness.technique.name}
          </h3>
          
          {/* Steps */}
          <ol className="space-y-3 mb-4">
            {wellness.technique.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {index + 1}
                </span>
                <span className="text-slate-300 text-[14px] leading-relaxed pt-0.5">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          
          {/* When to use */}
          {wellness.technique.when_to_use && (
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span>💡</span>
              <span>{wellness.technique.when_to_use}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Tips */}
      {wellness.quick_tips && wellness.quick_tips.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/20">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <ListChecks size={22} weight="duotone" className="text-amber-400" />
            {ui.quickTips || 'Quick Tips'}
          </h3>
          <ul className="space-y-2">
            {wellness.quick_tips.map((tip, index) => (
              <li key={index} className="text-slate-300 text-[14px] flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Affirmation */}
      {wellness.affirmation && (
        <div className="bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-2xl p-5 border border-purple-500/20 text-center">
          <p className="text-[16px] text-white font-medium">
            💜 {wellness.affirmation}
          </p>
        </div>
      )}

      {/* Self-Care Reminder */}
      {wellness.self_care_reminder && (
        <div className="bg-gradient-to-br from-green-500/10 to-lime-500/10 rounded-2xl p-5 border border-green-500/20">
          <div className="flex items-center gap-3">
            <Leaf size={24} weight="duotone" className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-green-400 font-medium uppercase tracking-wide mb-1">
                {ui.selfCareReminder || 'Self-Care Reminder'}
              </p>
              <p className="text-slate-300 text-[14px]">
                {wellness.self_care_reminder}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
