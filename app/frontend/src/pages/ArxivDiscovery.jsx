import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../hooks/useApi.js'
import { JobPoller } from '../components/ProgressBar.jsx'

function ScoreDot({ score }) {
  const color = score >= 7 ? 'var(--green)' : score >= 4 ? 'var(--yellow)' : 'var(--text-dim)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ color, fontSize: 12 }}>{score}/10</span>
    </div>
  )
}

export default function ArxivDiscovery() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState({})
  const [processing, setProcessing] = useState({})
  const [jobIds, setJobIds] = useState({})
  const [maxResults, setMaxResults] = useState(3)

  async function search() {
    setLoading(true)
    setError(null)
    try {
      const results = await apiFetch(`/arxiv/search?ranked=true&max_results=${maxResults}`)
      setPapers(results || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function savePaper(paper) {
    try {
      const res = await apiFetch('/arxiv/save', {
        method: 'POST',
        body: JSON.stringify({
          arxiv_id: paper.arxiv_id,
          title: paper.title,
          url: paper.url,
          summary: paper.summary,
        }),
      })
      setSaved(s => ({ ...s, [paper.arxiv_id]: res.id }))
    } catch (e) {
      setError(e.message)
    }
  }

  async function downloadAndProcess(paper) {
    let paperId = saved[paper.arxiv_id]
    if (!paperId) {
      const res = await apiFetch('/arxiv/save', {
        method: 'POST',
        body: JSON.stringify({
          arxiv_id: paper.arxiv_id,
          title: paper.title,
          url: paper.url,
          summary: paper.summary,
        }),
      })
      paperId = res.id
      setSaved(s => ({ ...s, [paper.arxiv_id]: paperId }))
    }

    setProcessing(p => ({ ...p, [paper.arxiv_id]: 'downloading' }))
    try {
      await apiFetch(`/arxiv/download/${paperId}`, { method: 'POST' })
      await new Promise(r => setTimeout(r, 3000))

      const res = await apiFetch(`/papers/${paperId}/process`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setJobIds(j => ({ ...j, [paper.arxiv_id]: res.job_id }))
      setProcessing(p => ({ ...p, [paper.arxiv_id]: 'processing' }))
    } catch (e) {
      setError(e.message)
      setProcessing(p => ({ ...p, [paper.arxiv_id]: null }))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">arXiv Discovery</h1>
        <p className="page-desc">Discover and rank recent AI/LLM security papers by detection relevance</p>
      </div>

      <div className="card">
        <div className="card-title mb-8">Search Parameters</div>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
          Queries arXiv for papers related to: AI agents, LLM security, prompt injection, agent misuse, goal drift, deceptive alignment.
          Papers are ranked by detection engineering usefulness using AI.
        </p>
        <div className="gap-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Results per query:</label>
            <select value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} style={{ width: 80 }}>
              {[2, 3, 5, 8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={search} disabled={loading}>
            {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Searching & ranking...</> : '🔍 Search arXiv'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="card">
          <div className="alert alert-info">
            <span className="spinner" style={{ marginRight: 10 }} />
            Querying arXiv and scoring papers for detection relevance. This takes 30-60 seconds...
          </div>
        </div>
      )}

      {!loading && papers.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No results yet</div>
          <div className="empty-desc">Click "Search arXiv" to discover relevant papers</div>
        </div>
      )}

      {papers.map(paper => (
        <div key={paper.arxiv_id} className="arxiv-card">
          <div className="flex-between">
            <div style={{ flex: 1, marginRight: 12 }}>
              <div className="arxiv-title">{paper.title}</div>
              <div className="arxiv-meta">
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ''}
                {' · '}{paper.published}
                {' · '}{paper.categories.join(', ')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScoreDot score={paper.relevance_score || 0} />
              <span className={`badge badge-${paper.detection_potential === 'high' ? 'success' : paper.detection_potential === 'medium' ? 'warning' : 'pending'}`}>
                {paper.detection_potential || 'unknown'}
              </span>
            </div>
          </div>

          {paper.relevance_reason && (
            <div className="arxiv-relevance">💡 {paper.relevance_reason}</div>
          )}

          <div className="arxiv-summary">{paper.summary}</div>

          {paper.key_threats?.length > 0 && (
            <div className="tag-list mb-8">
              {paper.key_threats.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          )}

          <div className="gap-8">
            <a href={paper.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm"
              style={{ display: 'inline-block' }}>
              View on arXiv ↗
            </a>

            {!saved[paper.arxiv_id] ? (
              <button className="btn-secondary btn-sm" onClick={() => savePaper(paper)}>
                💾 Save Paper
              </button>
            ) : (
              <span className="badge badge-success">Saved</span>
            )}

            {processing[paper.arxiv_id] === 'processing' && jobIds[paper.arxiv_id] ? (
              <div style={{ flex: 1 }}>
                <JobPoller
                  jobId={jobIds[paper.arxiv_id]}
                  onDone={() => {
                    setProcessing(p => ({ ...p, [paper.arxiv_id]: 'done' }))
                    navigate(`/results?paper_id=${saved[paper.arxiv_id]}`)
                  }}
                  onError={(err) => {
                    setError(err)
                    setProcessing(p => ({ ...p, [paper.arxiv_id]: null }))
                  }}
                />
              </div>
            ) : processing[paper.arxiv_id] === 'done' ? (
              <button className="btn-primary btn-sm" onClick={() => navigate(`/results?paper_id=${saved[paper.arxiv_id]}`)}>
                View Results →
              </button>
            ) : (
              <button className="btn-primary btn-sm"
                onClick={() => downloadAndProcess(paper)}
                disabled={!!processing[paper.arxiv_id]}>
                {processing[paper.arxiv_id] === 'downloading' ?
                  <><span className="spinner" style={{ marginRight: 6 }} />Downloading...</> :
                  '▶ Download & Process'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
