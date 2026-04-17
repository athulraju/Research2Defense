import { useEffect, useState } from 'react'
import { apiFetch } from '../hooks/useApi.js'

export function ProgressBar({ value = 0 }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-fill" style={{ width: `${value}%` }} />
    </div>
  )
}

export function JobPoller({ jobId, onDone, onError }) {
  const [job, setJob] = useState(null)

  useEffect(() => {
    if (!jobId) return
    let active = true
    const poll = async () => {
      try {
        const data = await apiFetch(`/jobs/${jobId}`)
        if (!active) return
        setJob(data)
        if (data.status === 'done') { onDone?.(data); return }
        if (data.status === 'error') { onError?.(data.error || 'Processing failed'); return }
        setTimeout(poll, 2000)
      } catch (e) {
        if (!active) return
        setTimeout(poll, 3000)
      }
    }
    poll()
    return () => { active = false }
  }, [jobId])

  if (!job) return null

  const pct = job.progress || 0
  const statusColor = job.status === 'error' ? 'var(--red)' : job.status === 'done' ? 'var(--green)' : 'var(--accent)'

  return (
    <div className="card">
      <div className="flex-between mb-8">
        <span style={{ color: statusColor, fontWeight: 600 }}>
          {job.status === 'running' && <><span className="spinner" style={{ marginRight: 8 }} /></>}
          {job.status === 'done' ? '✓ Complete' : job.status === 'error' ? '✗ Failed' : 'Processing...'}
        </span>
        <span className="text-muted">{pct}%</span>
      </div>
      <ProgressBar value={pct} />
      {job.message && <div className="mt-8 text-muted" style={{ fontSize: 12 }}>{job.message}</div>}
      {job.error && <div className="mt-8 alert alert-error">{job.error}</div>}
    </div>
  )
}
