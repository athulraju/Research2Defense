import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiFetch } from '../hooks/useApi.js'

export default function Landing() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ papers: 0, detections: 0, skills: 0 })

  useEffect(() => {
    Promise.all([
      apiFetch('/papers').catch(() => []),
      apiFetch('/detections').catch(() => []),
      apiFetch('/skills').catch(() => []),
    ]).then(([papers, detections, skills]) => {
      setStats({
        papers: papers?.length || 0,
        detections: detections?.length || 0,
        skills: skills?.length || 0,
      })
    })
  }, [])

  return (
    <div>
      <div className="hero">
        <div className="hero-badge">Local AI Security Agent</div>
        <h1 className="hero-title">
          Research <span>→</span> Detection
        </h1>
        <p className="hero-desc">
          A local AI security research to detection engineering agent.
          Convert AI/LLM/agent security papers into practical detection rules,
          skill files, and telemetry recommendations.
        </p>
        <div className="hero-actions">
          <button className="btn-primary btn-lg" onClick={() => navigate('/papers')}>
            📄 Process Local Research Paper
          </button>
          <button className="btn-secondary btn-lg" onClick={() => navigate('/arxiv')}>
            🔍 Discover Papers from arXiv
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ maxWidth: 700, margin: '0 auto 40px' }}>
        <div className="stat-box">
          <div className="stat-value text-accent">{stats.papers}</div>
          <div className="stat-label">Papers Processed</div>
        </div>
        <div className="stat-box">
          <div className="stat-value text-green">{stats.detections}</div>
          <div className="stat-label">Detections Generated</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{stats.skills}</div>
          <div className="stat-label">Skill Files Created</div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">How It Works</div>
              <div className="card-subtitle">4-step workflow from research to detection</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: '01', icon: '📄', title: 'Ingest Paper', desc: 'Upload a local PDF/text research paper or discover one from arXiv. The AI extracts attack behaviors, entities, and telemetry opportunities.' },
              { step: '02', icon: '🗂', title: 'Provide Log Schema', desc: 'Upload your log schema (JSON, CSV, or text) so detections can be mapped to your actual telemetry. Or skip to get recommendations.' },
              { step: '03', icon: '🎯', title: 'Generate Detections', desc: 'The AI generates behavioral, sequence, and correlation detections with implementation guidance, false positives, and tuning advice.' },
              { step: '04', icon: '📋', title: 'Export Skill Files', desc: 'Download markdown skill files for each detection, plus telemetry recommendations and gap analysis for your environment.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)',
                  fontWeight: 700, minWidth: 44, textAlign: 'center'
                }}>{step}</div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{icon} {title}</div>
                  <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-8">Detection Philosophy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Behavioral Signals', desc: 'Focus on observable behaviors, not just IOCs' },
              { label: 'Sequence Logic', desc: 'Multi-step temporal detection chains' },
              { label: 'Intent Patterns', desc: 'Detect attacker goals, not just actions' },
              { label: 'Low False Positives', desc: 'Practical tuning guidance included' },
            ].map(({ label, desc }) => (
              <div key={label} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '10px 12px'
              }}>
                <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{label}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
