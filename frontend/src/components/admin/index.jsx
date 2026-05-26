import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Import shared utilities and components
import { useWindowWidth, ghostBtnClass, Toast } from './shared'
import LoginScreen from './LoginScreen'
import {
  BoardsTab,
  StandardsTab,
  MediumsTab,
  CurriculumTab,
  UsersTab,
  UsageTab,
  AIConfigTab,
  DrishtiHelpersTab,
} from './tabs'

// ── Main Admin Panel ──────────────────────────────────────────
export default function AdminPanel() {
  const navigate  = useNavigate()
  const { section = 'curriculum' } = useParams()
  const activeTab = ['curriculum','boards','standards','mediums','users','usage','aiconfig','drishti'].includes(section)
    ? section : 'curriculum'

  const [authed, setAuthed]   = useState(!!localStorage.getItem('eduvyai_admin_token'))
  const [adminInfo, setInfo]  = useState(null)
  const [toast, setToast]     = useState(null)
  const width = useWindowWidth()
  const isDesktop = width >= 1024
  const isMobile  = width < 640

  const setTab = (id) => navigate(`/admin/${id}`)

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type, key: Date.now() })
  }, [])

  const logout = () => {
    localStorage.removeItem('eduvyai_admin_token')
    setAuthed(false)
    setInfo(null)
    navigate('/admin/login', { replace: true })
  }

  if (!authed) {
    return <LoginScreen onLogin={d => {
      setAuthed(true)
      setInfo(d)
      navigate('/admin/curriculum', { replace: true })
    }} />
  }

  // Already logged in but landed on /login → go to curriculum
  if (section === 'login') {
    navigate('/admin/curriculum', { replace: true })
    return null
  }

  const TABS = [
    { id: "curriculum", label: "📚 Curriculum",  short: "📚" },
    { id: "boards",     label: "🏫 Boards",       short: "🏫" },
    { id: "standards",  label: "🎓 Standards",    short: "🎓" },
    { id: "mediums",    label: "🌐 Mediums",       short: "🌐" },
    { id: "users",      label: "👥 Users",         short: "👥" },
    { id: "usage",      label: "📊 AI Usage",      short: "📊" },
    { id: "aiconfig",   label: "🤖 AI Models",     short: "🤖" },
    { id: "drishti",    label: "👁️ Drishti",       short: "👁️" },
  ]

  const contentMap = {
    curriculum: <CurriculumTab toast={showToast} />,
    boards:     <BoardsTab     toast={showToast} />,
    standards:  <StandardsTab  toast={showToast} />,
    mediums:    <MediumsTab    toast={showToast} />,
    users:      <UsersTab      toast={showToast} />,
    usage:      <UsageTab      toast={showToast} />,
    aiconfig:   <AIConfigTab   toast={showToast} />,
    drishti:    <DrishtiHelpersTab toast={showToast} />,
  }

  // Shared title bar rendered inside content area for all breakpoints
  const ContentTitle = () => (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-app-text font-extrabold text-xl m-0">
        {TABS.find(t => t.id === activeTab)?.label}
      </h2>
    </div>
  )

  // ── Desktop: sidebar + content ──────────────────────────────
  if (isDesktop) {
    return (
      <div className="admin-panel-root bg-app-bg">
        {/* Header */}
        <div className="bg-app-card border-b border-app-border py-3.5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[22px]">⚙️</span>
            <div>
              <div className="text-app-text font-extrabold text-base">Eduvy-AI Admin Panel</div>
              {adminInfo && <div className="text-app-muted text-xs">{adminInfo.name} · {adminInfo.email}</div>}
            </div>
          </div>
          <button className={`${ghostBtnClass} py-2 px-[18px]`} onClick={logout}>Logout</button>
        </div>

        {/* Body: sidebar + main */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[220px] bg-app-card border-r border-app-border flex flex-col py-5 px-3 gap-1 shrink-0 overflow-y-auto">
            <p className="text-[10px] text-app-muted font-bold tracking-wider mb-2 pl-2.5">NAVIGATION</p>
            {TABS.map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id)} 
                className={`rounded-[10px] py-2.5 px-3.5 flex items-center gap-2.5 cursor-pointer font-[Sora,sans-serif] text-left border-[1.5px] ${
                  activeTab === t.id 
                    ? 'bg-app-green/10 border-app-green/30' 
                    : 'bg-transparent border-transparent'
                }`}
              >
                <span className="text-lg">{t.short}</span>
                <span className={`text-sm ${activeTab === t.id ? 'font-bold text-app-green' : 'font-medium text-app-text'}`}>
                  {t.label.slice(2)}
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <button className={`${ghostBtnClass} w-full mt-3 text-[13px]`} onClick={logout}>← Logout</button>
          </div>

          {/* Main content — scrolls internally */}
          <div className="flex-1 overflow-y-auto py-7 px-8">
            <div className="max-w-[960px] mx-auto">
              <ContentTitle />
              {contentMap[activeTab]}
            </div>
          </div>
        </div>

        {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </div>
    )
  }

  // ── Tablet / Mobile: top tab bar ─────────────────────────────
  return (
    <div className="admin-panel-root bg-app-bg">
      {/* Header */}
      <div className={`bg-app-card border-b border-app-border ${isMobile ? 'py-3 px-4' : 'py-3.5 px-6'} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2.5">
          <span className={isMobile ? 'text-lg' : 'text-xl'}>⚙️</span>
          <div>
            <div className={`text-app-text font-extrabold ${isMobile ? 'text-sm' : 'text-[15px]'}`}>Eduvy-AI Admin</div>
            {adminInfo && !isMobile && <div className="text-app-muted text-[11px]">{adminInfo.email}</div>}
          </div>
        </div>
        <button
          className={`${ghostBtnClass} ${isMobile ? 'py-1.5 px-3' : 'py-2 px-4'} text-xs`}
          onClick={logout}
        >{isMobile ? "✕ Exit" : "Logout"}</button>
      </div>

      {/* Tab bar */}
      <div className="bg-app-card border-b border-app-border flex overflow-x-auto px-2 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bg-transparent border-none cursor-pointer whitespace-nowrap shrink-0 font-[Sora,sans-serif] ${
              isMobile ? 'py-2.5 px-3.5 text-xs' : 'py-3 px-[18px] text-[13px]'
            } ${activeTab === t.id 
              ? 'text-app-green font-bold border-b-2 border-app-green' 
              : 'text-app-muted font-medium border-b-2 border-transparent'
            }`}
          >{isMobile ? t.short : t.label}</button>
        ))}
      </div>

      {/* Content — scrolls internally, uniform padding */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'py-4 px-3.5' : 'py-6 px-6'}`}>
        <div className="max-w-[960px] mx-auto">
          <ContentTitle />
          {contentMap[activeTab]}
        </div>
      </div>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
