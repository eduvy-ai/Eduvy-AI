import { useEffect, useState } from 'react'
import { COLORS } from '../App.jsx'

export default function Splash({ onDone }) {
  const [opacity, setOpacity] = useState(0)
  const [scale, setScale]     = useState(0.8)

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => { setOpacity(1); setScale(1) }, 50)
    // Auto-advance after 2.8s
    const t2 = setTimeout(onDone, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      width: "100%",
      maxWidth: 480,
      minHeight: "100vh",
      background: COLORS.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}>
      {/* Logo */}
      <div style={{
        opacity,
        transform: `scale(${scale})`,
        transition: "opacity 0.6s ease, transform 0.6s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          width: 90,
          height: 90,
          borderRadius: 28,
          background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          boxShadow: `0 0 40px ${COLORS.green}44`,
        }}>
          🎓
        </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              color: COLORS.text,
              letterSpacing: -1,
            }}>
              Eduvy<span style={{ color: COLORS.green }}>-AI</span>
            </div>
            <div style={{
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 4,
              fontWeight: 500,
            }}>
              विद्या + AI = आपका भविष्य
            </div>
          </div>
      </div>

      {/* Tagline */}
      <div style={{
        opacity,
        transition: "opacity 0.6s ease 0.3s",
        textAlign: "center",
        padding: "0 32px",
      }}>
        <p style={{
          fontSize: 14,
          color: COLORS.muted,
          lineHeight: 1.6,
          fontWeight: 500,
        }}>
          India's smartest AI tutor<br />in your own language
        </p>
      </div>

      {/* Language flags strip */}
      <div style={{
        opacity,
        transition: "opacity 0.6s ease 0.5s",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
        padding: "0 24px",
        maxWidth: 320,
      }}>
        {["हि","ગુ","मर","தமி","తె","ಕ","বাং","ਪੰ","ଓ","اُ","En"].map(l => (
          <div key={l} style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 12,
            color: COLORS.muted,
            fontWeight: 600,
          }}>
            {l}
          </div>
        ))}
      </div>

      {/* Loading dots */}
      <div style={{
        opacity,
        transition: "opacity 0.6s ease 0.7s",
        display: "flex",
        gap: 6,
        marginTop: 12,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: COLORS.green,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.7,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
