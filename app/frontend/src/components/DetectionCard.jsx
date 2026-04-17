import { useState } from 'react'

function SeverityBadge({ severity }) {
  const cls = severity?.toLowerCase()
  return <span className={`badge badge-${cls}`}>{severity}</span>
}

function TypeBadge({ type }) {
  return <span className={`badge badge-${type}`}>{type}</span>
}

export default function DetectionCard({ detection }) {
  const [open, setOpen] = useState(false)
  const {
    title, description, rationale, severity, confidence,
    detection_type, required_telemetry, implementation_notes,
    false_positives, tuning_advice, pseudo_logic, behavioral_indicators,
    attack_stage,
  } = detection

  return (
    <div className="detection-card">
      <div className="detection-card-header" onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div className="bold" style={{ fontSize: 14 }}>{title}</div>
          <div className="detection-badges">
            <SeverityBadge severity={severity} />
            <TypeBadge type={detection_type} />
            {confidence && <span className="badge badge-info">{confidence} confidence</span>}
            {attack_stage && <span className="badge badge-pending">{attack_stage}</span>}
          </div>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 18 }}>{open ? '▲' : '▼'}</div>
      </div>

      {open && (
        <div className="detection-card-body">
          <div className="form-group">
            <div className="form-label">Description</div>
            <p className="text-muted">{description}</p>
          </div>

          <div className="form-group">
            <div className="form-label">Rationale</div>
            <p className="text-muted">{rationale}</p>
          </div>

          {pseudo_logic && (
            <div className="form-group">
              <div className="form-label">Detection Logic</div>
              <pre>{pseudo_logic}</pre>
            </div>
          )}

          {behavioral_indicators?.length > 0 && (
            <div className="form-group">
              <div className="form-label">Behavioral Indicators</div>
              <ul style={{ paddingLeft: 20, color: 'var(--text-muted)' }}>
                {behavioral_indicators.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
              </ul>
            </div>
          )}

          <div className="form-group">
            <div className="form-label">Required Telemetry</div>
            <div className="tag-list">
              {(required_telemetry || []).map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          </div>

          <div className="form-group">
            <div className="form-label">Implementation Notes</div>
            <p className="text-muted">{implementation_notes}</p>
          </div>

          {false_positives?.length > 0 && (
            <div className="form-group">
              <div className="form-label">False Positives</div>
              <ul style={{ paddingLeft: 20, color: 'var(--text-muted)' }}>
                {false_positives.map((fp, i) => <li key={i} style={{ marginBottom: 4 }}>{fp}</li>)}
              </ul>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="form-label">Tuning Advice</div>
            <p className="text-muted">{tuning_advice}</p>
          </div>
        </div>
      )}
    </div>
  )
}
