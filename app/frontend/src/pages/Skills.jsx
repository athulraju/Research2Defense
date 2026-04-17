import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../hooks/useApi.js'
import MarkdownViewer from '../components/MarkdownViewer.jsx'

export default function Skills() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const paperId = params.get('paper_id')

  const [skills, setSkills] = useState([])
  const [papers, setPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(paperId || '')
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [skillContent, setSkillContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/papers').then(p => {
      const processed = (p || []).filter(pp => pp.status === 'complete')
      setPapers(processed)
      if (!selectedPaper && processed.length > 0) setSelectedPaper(processed[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadSkills()
  }, [selectedPaper])

  async function loadSkills() {
    setLoading(true)
    setError(null)
    try {
      const url = selectedPaper ? `/skills?paper_id=${selectedPaper}` : '/skills'
      const data = await apiFetch(url)
      setSkills(data || [])
      setSelectedSkill(null)
      setSkillContent(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function viewSkill(skill) {
    setSelectedSkill(skill)
    try {
      const data = await apiFetch(`/skills/${skill.id}`)
      setSkillContent(data.content)
    } catch (e) {
      setError(e.message)
    }
  }

  async function downloadSkill(skill) {
    window.open(`/api/skills/${skill.id}/download`, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Skill Files</h1>
        <p className="page-desc">Reusable detection skill files generated from research papers</p>
      </div>

      {papers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No skill files yet</div>
          <div className="empty-desc">Process a paper to generate detection skill files</div>
          <button className="btn-primary mt-16" onClick={() => navigate('/papers')}>
            Go to Papers →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSkill ? '280px 1fr' : '1fr', gap: 16 }}>
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="form-label">Filter by Paper</div>
              <select value={selectedPaper} onChange={e => setSelectedPaper(e.target.value)}>
                <option value="">All Papers</option>
                {papers.map(p => <option key={p.id} value={p.id}>{p.title || p.filename}</option>)}
              </select>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
              <div className="card" style={{ textAlign: 'center' }}>
                <span className="spinner" />
              </div>
            ) : skills.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No skill files</div>
              </div>
            ) : (
              skills.map(skill => (
                <div
                  key={skill.id}
                  className={`file-card ${selectedSkill?.id === skill.id ? 'selected' : ''}`}
                  onClick={() => viewSkill(skill)}
                >
                  <div className="file-icon">📋</div>
                  <div className="file-info">
                    <div className="file-name" style={{ fontSize: 12 }}>{skill.filename}</div>
                    <div className="file-meta">{new Date(skill.created_at).toLocaleDateString()}</div>
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={e => { e.stopPropagation(); downloadSkill(skill) }}
                    title="Download"
                  >⬇</button>
                </div>
              ))
            )}
          </div>

          {selectedSkill && (
            <div className="card">
              <div className="flex-between mb-16">
                <div>
                  <div className="card-title">{selectedSkill.filename}</div>
                </div>
                <div className="gap-8">
                  <button className="btn-primary btn-sm" onClick={() => downloadSkill(selectedSkill)}>
                    ⬇ Download .md
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setSelectedSkill(null)}>
                    ✕
                  </button>
                </div>
              </div>
              {skillContent ? (
                <MarkdownViewer content={skillContent} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
