import { useEffect, useState } from 'react'
import { apiFetch } from '../hooks/useApi.js'

const EXAMPLES = {
  json: `{
  "timestamp": "2024-01-15T10:23:45Z",
  "agent_id": "agent-abc123",
  "session_id": "sess-xyz789",
  "event_type": "tool_call",
  "tool_name": "web_search",
  "prompt": "Search for information about X",
  "tool_input": {"query": "..."},
  "tool_output": "...",
  "model": "gpt-4",
  "user_id": "user-001",
  "token_count": 1024,
  "latency_ms": 342
}`,
  csv: `timestamp,agent_id,event_type,tool_name,prompt,model,user_id,token_count
2024-01-15T10:23:45Z,agent-abc123,tool_call,web_search,"Search for...",gpt-4,user-001,1024`,
  fields: `timestamp
agent_id
session_id
event_type (tool_call|prompt_received|response_sent|error)
tool_name
prompt
tool_input
tool_output
model
user_id
token_count
latency_ms
ip_address`,
}

export default function LogSchema() {
  const [detectedFiles, setDetectedFiles] = useState([])
  const [content, setContent] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('paste')

  useEffect(() => {
    apiFetch('/schema/detect').then(setDetectedFiles).catch(() => {})
  }, [])

  async function parseSchema() {
    if (!content.trim()) { setError('Please enter schema content'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/schema/parse', {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      setParsed(res.parsed)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function uploadSchemaFile(file) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await fetch('/api/schema/upload', { method: 'POST', body: fd })
      const detected = await apiFetch('/schema/detect')
      setDetectedFiles(detected || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  function loadExample(type) {
    setContent(EXAMPLES[type])
    setParsed(null)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Log Schema</h1>
        <p className="page-desc">Define your log schema to map detections to your actual telemetry fields</p>
      </div>

      <div className="alert alert-info">
        💡 Providing a log schema helps the AI generate detections that reference your actual field names and identify which attacks you can and cannot detect.
      </div>

      {detectedFiles.length > 0 && (
        <div className="card">
          <div className="card-title mb-8">Detected Schema Files</div>
          {detectedFiles.map(f => (
            <div key={f.filename} className="file-card" onClick={async () => {
              const res = await fetch(`/api/papers/files`)
              const text = await fetch(`/api/schema/detect`)
              const raw = await (await fetch(`/Research_Papers/Input/${f.filename}`)).text().catch(() => '')
              setContent(raw || f.filename)
            }}>
              <div className="file-icon">{f.suffix === '.json' ? '{}' : '📋'}</div>
              <div className="file-info">
                <div className="file-name">{f.filename}</div>
                <div className="file-meta">{(f.size / 1024).toFixed(1)} KB · {f.suffix}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Schema Input</div>
          <div className="gap-8">
            <span className="text-muted" style={{ fontSize: 12 }}>Examples:</span>
            {Object.keys(EXAMPLES).map(k => (
              <button key={k} className="btn-secondary btn-sm" onClick={() => loadExample(k)}>
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
          {['paste', 'upload'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                borderRadius: 0, color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                padding: '8px 16px', marginBottom: -1, cursor: 'pointer',
              }}
            >
              {t === 'paste' ? '✏ Paste Schema' : '⬆ Upload File'}
            </button>
          ))}
        </div>

        {tab === 'paste' ? (
          <>
            <div className="form-group">
              <div className="form-label">Schema Content</div>
              <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Paste JSON sample, CSV headers, or a list of field names
              </p>
              <textarea
                value={content}
                onChange={e => { setContent(e.target.value); setParsed(null) }}
                placeholder="Paste JSON, CSV, or field list..."
                style={{ height: 200, fontSize: 12 }}
              />
            </div>
            <button className="btn-primary" onClick={parseSchema} disabled={loading || !content.trim()}>
              {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Parsing...</> : '⚡ Parse Schema'}
            </button>
          </>
        ) : (
          <div
            className="upload-zone"
            onClick={() => document.getElementById('schema-file-input').click()}
          >
            {uploading ? (
              <><span className="spinner" /> Uploading...</>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div>Click to upload a schema file</div>
                <div className="text-muted mt-8" style={{ fontSize: 11 }}>Supports: .json, .csv, .txt</div>
              </>
            )}
          </div>
        )}
        <input id="schema-file-input" type="file" accept=".json,.csv,.txt" style={{ display: 'none' }}
          onChange={e => e.target.files[0] && uploadSchemaFile(e.target.files[0])} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {parsed && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">✓ Parsed Schema</div>
              <div className="card-subtitle">{parsed.source_name} · {parsed.log_type} · {parsed.fields?.length || 0} fields</div>
            </div>
          </div>

          {parsed.coverage_assessment && (
            <div className="alert alert-info" style={{ marginBottom: 16 }}>{parsed.coverage_assessment}</div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Sample Values</th>
                </tr>
              </thead>
              <tbody>
                {(parsed.fields || []).map((f, i) => (
                  <tr key={i}>
                    <td><code style={{ color: 'var(--accent)' }}>{f.name}</code></td>
                    <td><span className="badge badge-info">{f.type}</span></td>
                    <td className="text-muted">{f.description || '—'}</td>
                    <td>
                      {(f.sample_values || []).slice(0, 2).map((v, vi) => (
                        <code key={vi} style={{ marginRight: 4, fontSize: 11 }}>{v}</code>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-16 alert alert-success">
            ✓ Schema parsed. When processing a paper, paste this schema content in the Log Schema field for field-mapped detections.
          </div>
        </div>
      )}
    </div>
  )
}
