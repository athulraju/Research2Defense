import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Landing from './pages/Landing.jsx'
import LocalPapers from './pages/LocalPapers.jsx'
import ArxivDiscovery from './pages/ArxivDiscovery.jsx'
import LogSchema from './pages/LogSchema.jsx'
import Results from './pages/Results.jsx'
import Skills from './pages/Skills.jsx'
import AssumptionsGaps from './pages/AssumptionsGaps.jsx'

const navItems = [
  { to: '/', label: 'Home', icon: '⌂', exact: true },
  { to: '/papers', label: 'Local Papers', icon: '📄' },
  { to: '/arxiv', label: 'arXiv Discovery', icon: '🔍' },
  { to: '/schema', label: 'Log Schema', icon: '🗂' },
  { to: '/results', label: 'Detections', icon: '🎯' },
  { to: '/skills', label: 'Skill Files', icon: '📋' },
  { to: '/gaps', label: 'Assumptions & Gaps', icon: '⚠' },
]

function LocalModelBanner() {
  const [health, setHealth] = useState({ model_ready: true })

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => {})
  }, [])

  if (health.model_ready) return null

  return (
    <div style={{
      background: 'rgba(210, 153, 34, 0.12)',
      border: '1px solid rgba(210, 153, 34, 0.5)',
      borderLeft: '3px solid var(--yellow)',
      padding: '10px 14px',
      margin: '8px',
      borderRadius: 6,
      fontSize: 11,
      lineHeight: 1.6,
    }}>
      <div style={{ color: 'var(--yellow)', fontWeight: 700, marginBottom: 4 }}>
        ⚠ Local model not ready
      </div>
      <div style={{ color: 'var(--text-muted)' }}>
        {health.message || 'AI features are disabled until Ollama is running with the configured model.'}
      </div>
      <code style={{
        display: 'block', marginTop: 6, padding: '4px 8px',
        background: '#010409', borderRadius: 4, color: 'var(--green)',
        fontSize: 11, wordBreak: 'break-all'
      }}>
        ollama pull {health.model || 'llama3.1:8b'}
      </code>
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">R2D</div>
        <div className="logo-sub">Research2Defense</div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {navItems.map(({ to, label, icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <LocalModelBanner />
      <div className="sidebar-footer">
        <div>AI Security Research</div>
        <div>→ Detection Engineering</div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/papers" element={<LocalPapers />} />
            <Route path="/arxiv" element={<ArxivDiscovery />} />
            <Route path="/schema" element={<LogSchema />} />
            <Route path="/results" element={<Results />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/gaps" element={<AssumptionsGaps />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
