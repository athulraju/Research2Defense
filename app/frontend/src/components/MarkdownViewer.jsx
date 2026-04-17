export default function MarkdownViewer({ content }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(<pre key={key++}><code>{codeLines.join('\n')}</code></pre>)
      i++
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={key++}>{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++}>{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++}>{line.slice(4)}</h3>)
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={key++}>{line.slice(5)}</h4>)
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={key++}>{line.slice(2)}</blockquote>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(<li key={i}>{lines[i].slice(2)}</li>)
        i++
      }
      elements.push(<ul key={key++}>{listItems}</ul>)
      continue
    } else if (/^\d+\. /.test(line)) {
      const listItems = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(<li key={i}>{lines[i].replace(/^\d+\. /, '')}</li>)
        i++
      }
      elements.push(<ol key={key++}>{listItems}</ol>)
      continue
    } else if (line.startsWith('---') || line.startsWith('===')) {
      elements.push(<hr key={key++} className="divider" />)
    } else if (line.startsWith('| ')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').slice(1, -1).map(h => h.trim())
        const rows = tableLines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()))
        elements.push(
          <table key={key++}>
            <thead><tr>{headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody>
          </table>
        )
      }
      continue
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 8 }} />)
    } else {
      const rendered = renderInline(line)
      elements.push(<p key={key++}>{rendered}</p>)
    }
    i++
  }

  return <div className="md-preview">{elements}</div>
}

function renderInline(text) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) parts.push(<strong key={m.index}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*')) parts.push(<em key={m.index}>{tok.slice(1, -1)}</em>)
    else if (tok.startsWith('`')) parts.push(<code key={m.index}>{tok.slice(1, -1)}</code>)
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}
