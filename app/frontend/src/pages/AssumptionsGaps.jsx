import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../hooks/useApi.js'

function PriorityBadge({ priority }) {
  const cls = priority?.toLowerCase()
  return <span className={`badge badge-${cls || 'pending'}`}>{priority || 'Unknown'}</span>
}

export default function AssumptionsGaps() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const paperId = params.get('paper_id')

  const [papers, setPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(paperId || '')
  const [data, setData] = useState(null)
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
    if (!selectedPaper) return
    loadGaps()
  }, [selectedPaper])

  async function loadGaps() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await apiFetch(`/gaps/${selectedPaper}`)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const gaps = data?.gaps || {}
  const telemetry = data?.telemetry || {}

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Assumptions & Gaps</h1>
        <p className="page-desc">Missing telemetry, inferred assumptions, and coverage gaps</p>
      </div>

      {papers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚠</div>
          <div className="empty-title">No processed papers yet</div>
          <button className="btn-primary mt-16" onClick={() => navigate('/papers')}>
            Go to Papers →
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-label">Select Paper</div>
            <select value={selectedPaper} onChange={e => setSelectedPaper(e.target.value)} style={{ width: 400 }}>
              {papers.map(p => <option key={p.id} value={p.id}>{p.title || p.filename}</option>)}
            </select>
          </div>

          {error && (
            <div className="alert alert-warning">
              {error.includes('404') ? 'No gap analysis found for this paper. Process the paper first.' : error}
            </div>
          )}

          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <span className="spinner" style={{ width: 24, height: 24 }} />
              <div className="text-muted mt-16">Loading gap analysis...</div>
            </div>
          )}

          {data && !loading && (
            <>
              {gaps.coverage_score && (
                <div className="card">
                  <div className="card-title mb-16">Coverage Assessment</div>
                  <div className="grid-2">
                    <div>
                      <div className="form-label">Overall Coverage</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>
                        {gaps.coverage_score?.overall || 'N/A'}
                      </div>
                    </div>
                    {gaps.coverage_score?.by_attack_stage && (
                      <div>
                        <div className="form-label">By Attack Stage</div>
                        {Object.entries(gaps.coverage_score.by_attack_stage).map(([stage, level]) => (
                          <div key={stage} className="flex-between" style={{ marginBottom: 8 }}>
                            <span className="text-muted" style={{ fontSize: 12 }}>{stage.replace(/_/g, ' ')}</span>
                            <span className={`badge badge-${level === 'high' ? 'success' : level === 'medium' ? 'warning' : 'error'}`}>
                              {level}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {gaps.missing_telemetry?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Missing Telemetry</div>
                      <div className="card-subtitle">{gaps.missing_telemetry.length} gaps identified</div>
                    </div>
                  </div>
                  {gaps.missing_telemetry.map((item, i) => (
                    <div key={i} style={{
                      border: '1px solid var(--border)', borderRadius: 6, padding: 14,
                      marginBottom: 10, background: 'var(--surface2)'
                    }}>
                      <div className="flex-between mb-8">
                        <div className="bold">{item.source}</div>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                        <strong>Why needed:</strong> {item.why_needed}
                      </div>
                      {item.collection_guidance && (
                        <div style={{ fontSize: 12, color: 'var(--accent)' }}>
                          <strong>Collection:</strong> {item.collection_guidance}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {gaps.inferred_assumptions?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Inferred Assumptions</div>
                      <div className="card-subtitle">These assumptions were made during detection generation</div>
                    </div>
                  </div>
                  {gaps.inferred_assumptions.map((item, i) => (
                    <div key={i} style={{
                      border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 14,
                      marginBottom: 10, background: 'var(--bg)'
                    }}>
                      <div className="bold mb-8">
                        <span style={{ color: 'var(--yellow)' }}>⚠ </span>
                        {item.assumption}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                        <strong>Impact if wrong:</strong> {item.impact_if_wrong}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--green)' }}>
                        <strong>Validation:</strong> {item.validation_step}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {telemetry.recommended_sources?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Telemetry Recommendations</div>
                      <div className="card-subtitle">Recommended log sources to maximize detection coverage</div>
                    </div>
                  </div>
                  {telemetry.recommended_sources.map((src, i) => (
                    <div key={i} style={{
                      border: '1px solid var(--border)', borderRadius: 6, padding: 14,
                      marginBottom: 10, background: 'var(--surface2)'
                    }}>
                      <div className="flex-between mb-8">
                        <div className="bold">{src.name}</div>
                        <PriorityBadge priority={src.priority} />
                      </div>
                      <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>{src.description}</div>
                      {src.key_fields?.length > 0 && (
                        <div className="tag-list" style={{ marginBottom: 8 }}>
                          {src.key_fields.map((f, fi) => <span key={fi} className="tag">{f}</span>)}
                        </div>
                      )}
                      {src.collection_method && (
                        <div style={{ fontSize: 12, color: 'var(--accent)' }}>
                          <strong>How to collect:</strong> {src.collection_method}
                        </div>
                      )}
                      {src.platform_examples?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {src.platform_examples.map((ex, ei) => (
                            <div key={ei} style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>• {ex}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
