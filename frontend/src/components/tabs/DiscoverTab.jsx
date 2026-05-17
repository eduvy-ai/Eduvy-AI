import { useState, useEffect, useRef } from "react";
import {
  COLORS,
  getYTKey, setYTKey,
  searchYouTubeVideos, summarizeVideoWithAI,
  fetchInstagramOEmbed, summarizeIGReel,
  getIGTeachersForProfile,
} from "../../shared.js";

// ─── Shared style helpers ──────────────────────────────────────────────────
const DIFF_COLOR = {
  Beginner: COLORS.green,
  Intermediate: COLORS.yellow,
  Advanced: COLORS.red,
};

function Tag({ label, color }) {
  return (
    <span style={{
      background: color + "22", color,
      borderRadius: 8, padding: "3px 10px",
      fontSize: 11, fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

function ActionBtn({ color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: color + "18",
        border: `1px solid ${color}44`,
        borderRadius: 10,
        padding: "9px 0",
        color,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

// ─── YouTube Video Card ────────────────────────────────────────────────────
function YTCard({ video, profile, aiConfig, onSendToTutor, onSaveToNotebook, onWatch }) {
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    summarizeVideoWithAI(video, profile, aiConfig).then((d) => {
      if (!cancelled) { setAiData(d); setAiLoading(false); }
    });
    return () => { cancelled = true; };
  }, [video.videoId]);

  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 18,
      margin: "0 16px 16px",
      overflow: "hidden",
    }}>
      {/* Thumbnail */}
      <div style={{ position: "relative", cursor: "pointer" }} onClick={() => onWatch(video)}>
        <img
          src={video.thumbnail}
          alt={video.title}
          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "#00000055",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "#ffffffcc",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, paddingLeft: 3,
          }}>▶</div>
        </div>
        {aiData?.boardRelevance >= 70 && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: COLORS.green, color: "#000",
            borderRadius: 8, padding: "3px 10px",
            fontSize: 11, fontWeight: 700,
          }}>
            ✓ {profile.board}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <p style={{
          fontSize: 14, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          color: COLORS.text,
        }}>
          {video.title}
        </p>
        <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 10px" }}>
          📺 {video.channel}
        </p>

        {aiLoading ? (
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 10px" }}>
            🤖 Summarizing in {profile.language}…
          </p>
        ) : aiData ? (
          <>
            <p style={{ fontSize: 13, color: "#c0c0e0", lineHeight: 1.6, margin: "0 0 10px" }}>
              {aiData.summary}
            </p>
            <div style={{
              background: COLORS.card2, borderRadius: 10,
              padding: "10px 12px", marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                KEY POINTS · {profile.language.toUpperCase()}
              </div>
              {(aiData.keyPoints || []).map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: COLORS.green, margin: "3px 0" }}>• {p}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {aiData.difficulty && <Tag label={aiData.difficulty} color={DIFF_COLOR[aiData.difficulty] || COLORS.blue} />}
              {aiData.subjectTag && <Tag label={aiData.subjectTag} color={COLORS.orange} />}
              {aiData.boardRelevance != null && <Tag label={`${aiData.boardRelevance}% match`} color={COLORS.muted} />}
            </div>
          </>
        ) : null}

        <div style={{ display: "flex", gap: 8 }}>
          <ActionBtn color={COLORS.blue} onClick={() => onWatch(video)}>▶ Watch</ActionBtn>
          {onSendToTutor && (
            <ActionBtn
              color={COLORS.green}
              onClick={() => onSendToTutor(
                `I watched this video: "${video.title}". ${aiData?.summary || ""} Please explain this topic to me.`
              )}
            >
              🤖 Ask Tutor
            </ActionBtn>
          )}
          {onSaveToNotebook && (
            <ActionBtn
              color={COLORS.yellow}
              onClick={() => onSaveToNotebook(
                `## 🎬 ${video.title}\n\n**Channel**: ${video.channel}\n\n**Summary**: ${aiData?.summary || ""}\n\n**Key Points**:\n${(aiData?.keyPoints || []).map(p => `- ${p}`).join("\n")}\n\n[Watch](${video.url})`
              )}
            >
              📓 Save
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Instagram Reel Embed ──────────────────────────────────────────────────
function IGReelEmbed({ reel, profile, aiConfig, onSendToTutor, onSaveToNotebook }) {
  const [oEmbed, setOEmbed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [embedErr, setEmbedErr] = useState(false);
  const [aiData, setAiData] = useState(null);

  useEffect(() => {
    // Inject Instagram embed.js once
    if (!document.getElementById("ig-embed-js")) {
      const s = document.createElement("script");
      s.id = "ig-embed-js";
      s.src = "https://www.instagram.com/embed.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchInstagramOEmbed(reel.url)
      .then((data) => {
        if (cancelled) return;
        setOEmbed(data);
        setLoading(false);
        setTimeout(() => {
          if (window.instgrm) window.instgrm.Embeds.process();
        }, 400);
      })
      .catch(() => {
        if (!cancelled) { setEmbedErr(true); setLoading(false); }
      });

    summarizeIGReel(reel, profile, aiConfig).then((d) => {
      if (!cancelled) setAiData(d);
    });

    return () => { cancelled = true; };
  }, [reel.url]);

  return (
    <div style={{
      background: COLORS.card2,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 12,
    }}>
      {/* oEmbed area */}
      <div style={{
        background: "#000",
        minHeight: loading ? 200 : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {loading && (
          <p style={{ color: COLORS.muted, fontSize: 12 }}>Loading reel…</p>
        )}
        {embedErr && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <p style={{ color: COLORS.red, fontSize: 12, margin: "0 0 8px" }}>
              Reel unavailable (private or deleted)
            </p>
            <a
              href={reel.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: COLORS.blue, fontSize: 12 }}
            >
              Open on Instagram ↗
            </a>
          </div>
        )}
        {oEmbed?.html && !loading && (
          <div
            style={{ width: "100%", maxWidth: 400 }}
            dangerouslySetInnerHTML={{ __html: oEmbed.html }}
          />
        )}
      </div>

      {/* AI Summary */}
      {aiData && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            🤖 AI SUMMARY · {profile.language.toUpperCase()}
          </div>
          <p style={{ fontSize: 12, color: "#c0c0e0", lineHeight: 1.6, margin: "0 0 8px" }}>
            {aiData.summary}
          </p>
          {(aiData.keyPoints || []).map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: COLORS.green, margin: "2px 0" }}>• {p}</div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
            {aiData.difficulty && <Tag label={aiData.difficulty} color={DIFF_COLOR[aiData.difficulty] || COLORS.blue} />}
            {aiData.boardRelevance != null && <Tag label={`${aiData.boardRelevance}% match`} color={COLORS.muted} />}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {onSendToTutor && (
              <ActionBtn
                color={COLORS.green}
                onClick={() => onSendToTutor(
                  `I watched this Instagram reel: "${reel.caption || reel.title || "educational reel"}". ${aiData.summary} Please explain this topic in detail.`
                )}
              >
                🤖 Ask Tutor
              </ActionBtn>
            )}
            {onSaveToNotebook && (
              <ActionBtn
                color={COLORS.yellow}
                onClick={() => onSaveToNotebook(
                  `## 📸 ${reel.caption || reel.title || "Instagram Reel"}\n\n**Teacher**: ${reel.teacherName || ""}\n\n**Summary**: ${aiData.summary}\n\n**Key Points**:\n${(aiData.keyPoints || []).map(p => `- ${p}`).join("\n")}\n\n[View Reel](${reel.url})`
                )}
              >
                📓 Save
              </ActionBtn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Instagram Teacher Card ────────────────────────────────────────────────
function IGTeacherCard({ teacher, profile, aiConfig, onSendToTutor, onSaveToNotebook }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 18,
      margin: "0 16px 14px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, cursor: "pointer" }}
        onClick={() => setExpanded(p => !p)}
      >
        {/* Instagram gradient ring avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          padding: 2,
          background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: COLORS.card,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>👨‍🏫</div>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: "0 0 2px" }}>
            {teacher.teacherName}
            {teacher.verified && <span style={{ color: COLORS.blue, marginLeft: 4, fontSize: 12 }}>✓</span>}
          </p>
          <p style={{ fontSize: 11, color: "#E1306C", margin: "0 0 3px" }}>{teacher.igHandle}</p>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: 0 }}>
            {teacher.followers && `${teacher.followers} · `}{teacher.subjects.join(", ")}
          </p>
        </div>
        <span style={{
          fontSize: 13, color: COLORS.muted,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}>▼</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${COLORS.border}` }}>
          {teacher.bio && (
            <p style={{ fontSize: 12, color: COLORS.muted, margin: "12px 0", lineHeight: 1.6 }}>
              "{teacher.bio}"
            </p>
          )}

          {/* Tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {teacher.subjects.map(s => <Tag key={s} label={s} color={COLORS.blue} />)}
            {teacher.boards.map(b => <Tag key={b} label={b} color={COLORS.muted} />)}
            <Tag label={teacher.language} color={teacher.language === "Hindi" ? COLORS.orange : COLORS.green} />
          </div>

          {/* Curated reels */}
          {teacher.reels?.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
                FEATURED REELS
              </div>
              {teacher.reels.map((reel, i) => (
                <IGReelEmbed
                  key={i}
                  reel={{ ...reel, teacherName: teacher.teacherName }}
                  profile={profile}
                  aiConfig={aiConfig}
                  onSendToTutor={onSendToTutor}
                  onSaveToNotebook={onSaveToNotebook}
                />
              ))}
            </>
          )}

          {/* Visit button */}
          <button
            onClick={() => window.open(teacher.profileUrl, "_blank", "noopener,noreferrer")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
              border: "none",
              borderRadius: 12,
              padding: "12px 0",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'Sora', sans-serif",
              marginTop: teacher.reels?.length > 0 ? 8 : 0,
            }}
          >
            📸 Visit {teacher.igHandle} on Instagram ↗
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main DiscoverTab ──────────────────────────────────────────────────────
const QUICK_TOPICS = [
  "Photosynthesis", "Quadratic Equations", "Newton's Laws",
  "Periodic Table", "French Revolution", "Trigonometry",
  "Human Body", "Electricity",
];

export default function DiscoverTab({ profile, aiConfig, onSendToTutor, onSaveToNotebook }) {
  const [platform, setPlatform] = useState("youtube"); // "youtube" | "instagram"
  const [query, setQuery] = useState("");
  const [ytResults, setYtResults] = useState([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [ytKey, setYtKeyState] = useState(getYTKey());
  const [keyDraft, setKeyDraft] = useState("");
  const [embedVideo, setEmbedVideo] = useState(null);
  const [reelUrl, setReelUrl] = useState("");
  const [customReels, setCustomReels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("eduvyai_custom_reels") || "[]"); }
    catch { return []; }
  });
  const [reelStatus, setReelStatus] = useState(""); // "" | "ok" | "err"

  const igTeachers = getIGTeachersForProfile(profile);

  function saveYTKey() {
    if (!keyDraft.trim()) return;
    setYTKey(keyDraft.trim());
    setYtKeyState(keyDraft.trim());
    setKeyDraft("");
  }

  async function handleYTSearch(overrideQ) {
    const q = overrideQ || query;
    if (!q.trim()) return;
    setYtLoading(true);
    setYtError("");
    setYtResults([]);
    try {
      const videos = await searchYouTubeVideos(q, profile, 6);
      setYtResults(videos);
    } catch (e) {
      if (e.message === "NO_YT_KEY") setYtError("Add your YouTube API key below.");
      else if (e.message?.includes("403")) setYtError("YouTube API quota exceeded. Try again tomorrow.");
      else setYtError("Could not fetch videos. Check your internet connection.");
    } finally {
      setYtLoading(false);
    }
  }

  function handleAddReel() {
    const url = reelUrl.trim();
    if (!url || !url.includes("instagram.com")) {
      setReelStatus("err");
      setTimeout(() => setReelStatus(""), 3000);
      return;
    }
    const updated = [
      { url, caption: "Saved reel", title: "Instagram Reel", submitted: true },
      ...customReels,
    ];
    localStorage.setItem("eduvyai_custom_reels", JSON.stringify(updated));
    setCustomReels(updated);
    setReelUrl("");
    setReelStatus("ok");
    setTimeout(() => setReelStatus(""), 3000);
  }

  function clearCustomReels() {
    setCustomReels([]);
    localStorage.removeItem("eduvyai_custom_reels");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'Sora', sans-serif",
      paddingBottom: 90,
    }}>
      {/* Header */}
      <div style={{ padding: "24px 20px 8px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: COLORS.text }}>
          🔍 Discover
        </h2>
        <p style={{ fontSize: 13, color: COLORS.muted, margin: "4px 0 0" }}>
          Class {profile.standard} · {profile.board} · {profile.language}
        </p>
      </div>

      {/* Platform switcher */}
      <div style={{
        display: "flex", gap: 0,
        margin: "14px 20px",
        background: COLORS.card2,
        borderRadius: 14, padding: 4,
      }}>
        {[
          { id: "youtube", label: "▶ YouTube" },
          { id: "instagram", label: "📸 Instagram" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setPlatform(id)}
            style={{
              flex: 1, padding: "10px 0",
              borderRadius: 11, border: "none",
              background: platform === id ? COLORS.blue : "transparent",
              color: platform === id ? "#fff" : COLORS.muted,
              fontWeight: platform === id ? 700 : 400,
              fontSize: 14, cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── YOUTUBE TAB ─── */}
      {platform === "youtube" && (
        <>
          {/* API key setup */}
          {!ytKey && (
            <div style={{
              margin: "0 20px 20px",
              background: COLORS.card,
              border: `1.5px dashed ${COLORS.yellow}55`,
              borderRadius: 18, padding: 20,
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.yellow, margin: "0 0 8px" }}>
                🔑 Add YouTube API Key (Free)
              </p>
              <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 14px", lineHeight: 1.7 }}>
                Get a free key →{" "}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: COLORS.blue }}
                >
                  Google Cloud Console
                </a>
                {" "}→ Enable YouTube Data API v3 → Create API Key.
                Free quota: ~100 searches/day.
              </p>
              <input
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: COLORS.card2,
                  border: `1.5px solid ${COLORS.border}`,
                  borderRadius: 12, padding: "11px 14px",
                  color: COLORS.text, fontSize: 14, outline: "none",
                  marginBottom: 10,
                  fontFamily: "'Sora', sans-serif",
                }}
                placeholder="AIzaSy..."
                value={keyDraft}
                onChange={e => setKeyDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveYTKey()}
              />
              <button
                onClick={saveYTKey}
                style={{
                  background: COLORS.yellow, color: "#000",
                  border: "none", borderRadius: 12,
                  padding: "11px 28px", fontWeight: 700,
                  fontSize: 14, cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Save & Activate
              </button>
            </div>
          )}

          {/* Search bar */}
          {ytKey && (
            <>
              <div style={{ display: "flex", gap: 10, padding: "0 20px 14px", alignItems: "center" }}>
                <input
                  style={{
                    flex: 1, background: COLORS.card2,
                    border: `1.5px solid ${COLORS.border}`,
                    borderRadius: 14, padding: "12px 16px",
                    color: COLORS.text, fontSize: 15, outline: "none",
                    fontFamily: "'Sora', sans-serif",
                  }}
                  placeholder={`e.g. "What is photosynthesis?"`}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleYTSearch()}
                />
                <button
                  onClick={() => handleYTSearch()}
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.green})`,
                    border: "none", borderRadius: 14,
                    padding: "12px 22px",
                    color: "#fff", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  {ytLoading ? "…" : "Search"}
                </button>
              </div>

              {/* Quick topic chips */}
              {!ytResults.length && !ytLoading && (
                <div style={{ display: "flex", gap: 8, padding: "0 20px 16px", flexWrap: "wrap" }}>
                  {QUICK_TOPICS.map(t => (
                    <button
                      key={t}
                      onClick={() => { setQuery(t); handleYTSearch(t); }}
                      style={{
                        background: COLORS.card2,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 20, padding: "6px 14px",
                        fontSize: 12, color: COLORS.muted,
                        cursor: "pointer",
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Error */}
          {ytError && (
            <div style={{
              margin: "0 20px 14px",
              background: COLORS.red + "18",
              border: `1px solid ${COLORS.red}33`,
              borderRadius: 12, padding: "12px 16px",
              color: COLORS.red, fontSize: 13,
            }}>
              {ytError}
            </div>
          )}

          {/* Skeletons */}
          {ytLoading && [1,2,3].map(i => (
            <div key={i} style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              margin: "0 16px 16px",
              padding: 16,
            }}>
              <div style={{ background: COLORS.card2, borderRadius: 10, height: 160, marginBottom: 12 }} />
              <div style={{ background: COLORS.card2, borderRadius: 6, height: 14, width: "75%", marginBottom: 8 }} />
              <div style={{ background: COLORS.card2, borderRadius: 6, height: 12, width: "45%" }} />
            </div>
          ))}

          {/* Results */}
          {ytResults.map(v => (
            <YTCard
              key={v.videoId}
              video={v}
              profile={profile}
              aiConfig={aiConfig}
              onSendToTutor={onSendToTutor}
              onSaveToNotebook={onSaveToNotebook}
              onWatch={setEmbedVideo}
            />
          ))}

          {/* Empty state */}
          {!ytLoading && !ytResults.length && ytKey && !ytError && (
            <div style={{ textAlign: "center", padding: "50px 20px", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
                Search Educational Videos
              </div>
              <div style={{ fontSize: 13 }}>
                AI summarizes everything in {profile.language}
              </div>
            </div>
          )}

          {/* Change key link */}
          {ytKey && (
            <div style={{ textAlign: "center", padding: "0 20px 20px" }}>
              <button
                onClick={() => { setYTKey(""); setYtKeyState(""); setYtResults([]); }}
                style={{
                  background: "none", border: "none",
                  color: COLORS.muted, fontSize: 11,
                  cursor: "pointer", textDecoration: "underline",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Change YouTube API key
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── INSTAGRAM TAB ─── */}
      {platform === "instagram" && (
        <>
          {/* How it works */}
          <div style={{
            margin: "0 16px 16px",
            background: "linear-gradient(135deg, #833ab422, #fd1d1d11, #fcb04511)",
            border: "1px solid #833ab433",
            borderRadius: 16, padding: "14px 16px",
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#E1306C", margin: "0 0 5px" }}>
              📸 Instagram in Eduvy-AI
            </p>
            <p style={{ fontSize: 12, color: COLORS.muted, margin: 0, lineHeight: 1.7 }}>
              Uses Instagram's official <strong style={{ color: COLORS.text }}>oEmbed API</strong> — no scraping, no ToS violations.
              Paste any public reel link to embed it with AI summary, or browse curated teachers below.
            </p>
          </div>

          {/* Paste reel */}
          <div style={{
            margin: "0 16px 16px",
            background: COLORS.card2,
            border: `1px dashed ${COLORS.blue}44`,
            borderRadius: 16, padding: 16,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.blue, margin: "0 0 10px" }}>
              🔗 Paste any public Instagram Reel
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{
                  flex: 1, background: COLORS.card,
                  border: `1.5px solid ${COLORS.border}`,
                  borderRadius: 10, padding: "10px 12px",
                  color: COLORS.text, fontSize: 13, outline: "none",
                  fontFamily: "'Sora', sans-serif",
                }}
                placeholder="https://www.instagram.com/reel/..."
                value={reelUrl}
                onChange={e => setReelUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddReel()}
              />
              <button
                onClick={handleAddReel}
                style={{
                  background: "#E1306C",
                  border: "none", borderRadius: 10,
                  padding: "10px 16px",
                  color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                + Embed
              </button>
            </div>
            {reelStatus === "ok" && (
              <p style={{ fontSize: 12, color: COLORS.green, margin: "8px 0 0" }}>
                ✓ Reel added! See below.
              </p>
            )}
            {reelStatus === "err" && (
              <p style={{ fontSize: 12, color: COLORS.red, margin: "8px 0 0" }}>
                Please paste a valid instagram.com/reel/... URL
              </p>
            )}
          </div>

          {/* Custom reels */}
          {customReels.length > 0 && (
            <>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px", marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>
                  YOUR SAVED REELS ({customReels.length})
                </span>
                <button
                  onClick={clearCustomReels}
                  style={{
                    background: "none", border: "none",
                    color: COLORS.red, fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  Clear all
                </button>
              </div>
              <div style={{ padding: "0 16px" }}>
                {customReels.map((reel, i) => (
                  <IGReelEmbed
                    key={i}
                    reel={reel}
                    profile={profile}
                    aiConfig={aiConfig}
                    onSendToTutor={onSendToTutor}
                    onSaveToNotebook={onSaveToNotebook}
                  />
                ))}
              </div>
            </>
          )}

          {/* Curated teachers */}
          <div style={{ padding: "8px 20px 12px" }}>
            <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>
              CURATED TEACHERS · CLASS {profile.standard} · {profile.board}
            </span>
          </div>

          {igTeachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 20px", color: COLORS.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📸</div>
              <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>
                No teachers yet for your profile
              </div>
              <div style={{ fontSize: 12 }}>
                Paste a reel link above to get started!
              </div>
            </div>
          ) : (
            igTeachers.map(t => (
              <IGTeacherCard
                key={t.id}
                teacher={t}
                profile={profile}
                aiConfig={aiConfig}
                onSendToTutor={onSendToTutor}
                onSaveToNotebook={onSaveToNotebook}
              />
            ))
          )}

          {/* Suggest a teacher */}
          <div style={{
            margin: "8px 20px 20px",
            background: COLORS.card2,
            borderRadius: 14, padding: 16,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.blue, margin: "0 0 6px" }}>
              Know a great teacher on Instagram?
            </p>
            <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 12px" }}>
              Help us grow the directory!
            </p>
            <button
              onClick={() => window.open("mailto:team@eduvyai.in?subject=Teacher%20Suggestion", "_blank")}
              style={{
                background: COLORS.blue + "22",
                border: `1px solid ${COLORS.blue}44`,
                color: COLORS.blue, borderRadius: 10,
                padding: "9px 20px", fontSize: 12,
                fontWeight: 700, cursor: "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              📧 Suggest a Teacher
            </button>
          </div>
        </>
      )}

      {/* ─── YouTube Embed Modal ─── */}
      {embedVideo && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "#000000dd", zIndex: 999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setEmbedVideo(null)}
        >
          <iframe
            style={{
              width: "100%", maxWidth: 720,
              aspectRatio: "16/9",
              borderRadius: 16, border: "none",
            }}
            src={`${embedVideo.embedUrl}?autoplay=1`}
            title={embedVideo.title}
            allowFullScreen
            allow="autoplay; encrypted-media"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setEmbedVideo(null)}
            style={{
              marginTop: 16,
              background: COLORS.red + "22",
              border: `1px solid ${COLORS.red}44`,
              color: COLORS.red, borderRadius: 12,
              padding: "10px 32px",
              fontWeight: 700, fontSize: 14,
              cursor: "pointer",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}