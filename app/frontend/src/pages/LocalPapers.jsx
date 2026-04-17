import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../hooks/useApi.js'
import { JobPoller } from '../components/ProgressBar.jsx'

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function LocalPapers() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [papers, setPapers] = useState([])
  const [selected, setSelected] = useState(null)
  const [paper, setPaper] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [step, setStep] = useState(1)
  const [schemaContent, setSchemaContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [f, p] = await Promise.all([
      apiFetch('/papers/files').catch(() => []),
      apiFetch('/papers').catch(() => []),
    ])
    setFiles(f || [])
    setPapers(p || [])
  }

  async function selectFile(filename) {
    setSelected(filename)
    setError(null)
    try {
      const reg = await apiFetch('/papers/register', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      })
      const p = await apiFetch(`/papers/${reg.id}`)
      setPaper(p)
      setStep(2)
    } catch (e) {
      setError(e.message)
    }
  }

  async function uploadFile(file) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/papers/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).detail)
      await loadData()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function startProcessing() {
    setError(null)
    try {
      const res = await apiFetch(`/papers/${paper.id}/process`, {
        method: 'POST',
        body: JSON.stringify({ schema_content: schemaContent || null }),
      })
      setJobId(res.job_id)
      setStep(3)
    } catch (e) {
      setError(e.message)
    }
  }

  const existingPaper = selected ? papers.find(p => p.filename === selected) : null

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Local Research Papers</h1>
        <p className="page-desc">Select or upload a security research paper to process</p>
      </div>

      <div className="steps">
        {['Select Paper', 'Configure', 'Process', 'View Results'].map((label, i) => (
          <>
            <div key={label} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
              <div className="step-num">{step > i + 1 ? '✓' : i + 1}</div>
              {label}
            </div>
            {i < 3 && <div key={`div-${i}`} className="step-divider" />}
          </>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Available Papers</div>
              <button className="btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
                + Upload New
              </button>
            </div>

            {files.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <div className="empty-title">No papers found</div>
                <div className="empty-desc">Upload a PDF, text, or markdown file to get started</div>
              </div>
            ) : (
              files.map(f => {
                const proc = papers.find(p => p.filename === f.name)
                return (
                  <div
                    key={f.name}
                    className={`file-card ${selected === f.name ? 'selected' : ''}`}
                    onClick={() => selectFile(f.name)}
                  >
                    <div className="file-icon">{f.suffix === '.pdf' ? '📕' : '📝'}</div>
                    <div className="file-info">
                      <div className="file-name">{f.name}</div>
                      <div className="file-meta">{formatBytes(f.size)}</div>
                    </div>
                    {proc && (
                      <span className={`badge badge-${proc.status === 'complete' ? 'success' : proc.status === 'error' ? 'error' : proc.status === 'processing' ? 'warning' : 'pending'}`}>
                        {proc.status}
                      </span>
                    )}
                  </div>
                )
              })
            )}

            <div
              className={`upload-zone mt-16 ${dragging ? 'drag-over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) uploadFile(file)
              }}
            >
              {uploading ? (
                <><span className="spinner" /> Uploading...</>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⬆</div>
                  <div>Drop a PDF, TXT, or MD file here, or click to browse</div>
                  <div className="text-muted mt-8" style={{ fontSize: 11 }}>Supports: .pdf, .txt, .md, .markdown</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.markdown" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && uploadFile(e.target.files[0])} />
          </div>
        </div>
      )}

      {step === 2 && paper && (
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📄 {paper.filename}</div>
                <div className="card-subtitle">
                  {existingPaper?.status === 'complete' ? 'Already processed' : 'Ready to process'}
                </div>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => { setStep(1); setSelected(null); setPaper(null) }}>
                ← Back
              </button>
            </div>

            {existingPaper?.status === 'complete' && (
              <div className="alert alert-success">
                This paper has already been processed. You can view results or re-process it.
              </div>
            )}

            {existingPaper?.summary && (
              <div className="form-group">
                <div className="form-label">Summary</div>
                <p className="text-muted">{existingPaper.summary}</p>
              </div>
            )}

            <div className="form-group">
              <div className="form-label">Log Schema (Optional)</div>
              <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Paste your log schema (JSON, CSV headers, or field list) to map detections to your telemetry.
                Leave empty to generate telemetry recommendations.
              </p>
              <textarea
                value={schemaContent}
                onChange={e => setSchemaContent(e.target.value)}
                placeholder={'{"event_type": "...", "agent_id": "...", "prompt": "...", "tool_name": "..."}\n\nor leave empty for telemetry recommendations'}
                style={{ height: 120, fontSize: 12 }}
              />
            </div>

            <div className="gap-8">
              <button className="btn-primary" onClick={startProcessing}>
                ▶ Start Processing
              </button>
              {existingPaper?.status === 'complete' && (
                <button className="btn-secondary" onClick={() => navigate(`/results?paper_id=${paper.id}`)}>
                  View Existing Results →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="card">
            <div className="card-title mb-16">Processing Paper</div>
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              The AI is analyzing the paper and generating detections. This may take 1-3 minutes.
            </div>
            <JobPoller
              jobId={jobId}
              onDone={() => {
                setStep(4)
              }}
              onError={(err) => {
                setError(err)
                setStep(2)
              }}
            />
          </div>
        </div>
      )}

      {step === 4 && paper && (
        <div>
          <div className="alert alert-success">
            ✓ Processing complete! All outputs have been generated.
          </div>
          <div className="grid-2">
            {[
              { label: '🎯 View Detections', path: `/results?paper_id=${paper.id}` },
              { label: '📋 View Skill Files', path: `/skills?paper_id=${paper.id}` },
              { label: '🗂 View Schema Gaps', path: `/gaps?paper_id=${paper.id}` },
              { label: '📝 View Summary', path: `/papers` },
            ].map(({ label, path }) => (
              <button key={path} className="btn-secondary" style={{ padding: '16px', textAlign: 'left', fontSize: 14 }}
                onClick={() => navigate(path)}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-16">
            <button className="btn-secondary" onClick={() => { setStep(1); setSelected(null); setPaper(null); setJobId(null) }}>
              ← Process Another Paper
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
