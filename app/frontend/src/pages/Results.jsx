import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../hooks/useApi.js'
import DetectionCard from '../components/DetectionCard.jsx'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const TYPES = ['behavioural', 'sequence', 'correlation', 'query']

export default function Results() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const paperId = params.get('paper_id')

  const [detections, setDetections] = useState([])
  const [papers, setPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(paperId || '')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exportMsg, setExportMsg] = useState('')

  useEffect(() => {
    apiFetch('/papers').then(p => {
      const processed = (p || []).filter(pp => pp.status === 'complete')
      setPapers(processed)
      if (!selectedPaper && processed.length > 0) setSelectedPaper(processed[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedPaper) {
      setDetections([])
      return
    }
    loadDetections()
  }, [selectedPaper, filterSeverity, filterType])

  async function loadDetections() {
    setLoading(true)
    setError(null)
    try {
      let url = `/detections?paper_id=${selectedPaper}`
      if (filterSeverity) url += `&severity=${filterSeverity}`
      if (filterType) url += `&detection_type=${filterType}`
      const data = await apiFetch(url)
      setDetections(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function exportMarkdown() {
    try {
      const res = await fetch(`/api/detections/paper/${selectedPaper}/export?fmt=markdown`)
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `detections_${selectedPaper.slice(0, 8)}.md`
      a.click()
      setExportMsg('Downloaded!')
      setTimeout(() => setExportMsg(''), 2000)
    } catch (e) {
      setError(e.message)
    }
  }

  const currentPaper = papers.find(p => p.id === selectedPaper)

  const counts = {
    Critical: detections.filter(d => d.severity === 'Critical').length,
    High: detections.filter(d => d.severity === 'High').length,
    Medium: detections.filter(d => d.severity === 'Medium').length,
    Low: detections.filter(d => d.severity === 'Low').length,
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Detections</h1>
        <p className="page-desc">Generated behavioral detections from security research papers</p>
      </div>

      {papers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-title">No processed papers yet</div>
          <div className="empty-desc">Process a paper first to generate detections</div>
          <button className="btn-primary mt-16" onClick={() => navigate('/papers')}>
            Go to Papers →
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="flex-between">
              <div className="gap-12" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div className="form-label">Paper</div>
                  <select value={selectedPaper} onChange={e => setSelectedPaper(e.target.value)} style={{ width: 300 }}>
                    {papers.map(p => (
                      <option key={p.id} value={p.id}>{p.title || p.filename}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="form-label">Severity</div>
                  <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ width: 140 }}>
                    <option value="">All</option>
                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="form-label">Type</div>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 160 }}>
                    <option value="">All</option>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="gap-8">
                {exportMsg && <span className="text-green">{exportMsg}</span>}
                <button className="btn-secondary btn-sm" onClick={exportMarkdown} disabled={!detections.length}>
                  ⬇ Export MD
                </button>
                <button className="btn-secondary btn-sm" onClick={() => navigate(`/gaps?paper_id=${selectedPaper}`)}>
                  ⚠ View Gaps
                </button>
              </div>
            </div>
          </div>

          {Object.values(counts).some(v => v > 0) && (
            <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
              {SEVERITIES.map(s => (
                <div key={s} className="stat-box" style={{ cursor: 'pointer' }}
                  onClick={() => setFilterSeverity(filterSeverity === s ? '' : s)}>
                  <div className={`stat-value badge-${s.toLowerCase()}`} style={{ fontSize: 24, color: s === 'Critical' ? 'var(--red)' : s === 'High' ? 'var(--orange)' : s === 'Medium' ? 'var(--yellow)' : 'var(--green)' }}>
                    {counts[s]}
                  </div>
                  <div className="stat-label">{s}</div>
                </div>
              ))}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <span className="spinner" style={{ width: 24, height: 24 }} />
              <div className="text-muted mt-16">Loading detections...</div>
            </div>
          ) : detections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-title">No detections found</div>
              <div className="empty-desc">
                {filterSeverity || filterType ? 'Try clearing the filters' : 'No detections generated for this paper yet'}
              </div>
            </div>
          ) : (
            <>
              <div className="text-muted mb-8" style={{ fontSize: 12 }}>
                {detections.length} detection{detections.length !== 1 ? 's' : ''}
                {currentPaper ? ` for "${currentPaper.title || currentPaper.filename}"` : ''}
              </div>
              {detections.map(d => <DetectionCard key={d.id} detection={d} />)}
            </>
          )}
        </>
      )}
    </div>
  )
}
