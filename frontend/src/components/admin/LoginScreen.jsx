import { useState, useEffect } from 'react'
import { API, inputClass, btnClass, ghostBtnClass } from './shared'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail]     = useState("")
  const [password, setPass]   = useState("")
  const [err, setErr]         = useState("")
  const [loading, setLoading] = useState(false)
  const [isSetup, setIsSetup] = useState(false)
  const [setupName, setSetupName] = useState("SuperAdmin")

  useEffect(() => {
    API('/admin/me', { signal: AbortSignal.timeout(3000) }).then(r => {
      if (r.status === 401) setIsSetup(false)
    }).catch(() => {})
  }, [])

  const submit = async () => {
    if (!email || !password) { setErr("Email and password required"); return }
    setLoading(true); setErr("")
    try {
      const endpoint = isSetup ? '/admin/setup' : '/admin/login'
      const body = isSetup ? { email, password, name: setupName } : { email, password }
      const res = await API(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.detail || "Failed"); setLoading(false); return }
      localStorage.setItem('eduvyai_admin_token', data.token)
      onLogin(data)
    } catch (e) {
      setErr(e.message || "Network error")
    }
    setLoading(false)
  }

  return (
    <div className="admin-panel-root bg-app-bg items-center justify-center p-5">
      <div className="bg-app-card border border-app-border rounded-[18px] p-8 w-full max-w-[400px] flex flex-col gap-4">
        <div>
          <div className="text-[28px]">⚙️</div>
          <h2 className="text-app-text my-2 text-[22px] font-extrabold">
            Eduvy-AI Admin
          </h2>
          <p className="text-app-muted text-[13px]">
            {isSetup ? "Create the first superadmin account" : "Sign in to manage curriculum"}
          </p>
        </div>

        {isSetup && (
          <input className={inputClass} placeholder="Your name" value={setupName}
            onChange={e => setSetupName(e.target.value)} />
        )}
        <input className={inputClass} type="email" placeholder="Admin email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className={inputClass} type="password" placeholder="Password (min 8 chars)"
          value={password} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />

        {err && <p className="text-app-red text-xs m-0">{err}</p>}

        <button className={btnClass('green')} onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : (isSetup ? "Create Admin" : "Login")}
        </button>

        <button className={`${ghostBtnClass} text-xs`} onClick={() => setIsSetup(v => !v)}>
          {isSetup ? "Already have an account? Login" : "First time? Create superadmin"}
        </button>
      </div>
    </div>
  )
}
