/**
 * Jauge circulaire SVG pure — score 0-100
 * Props : score (number), size ("sm"|"md"|"lg")
 */
const SIZES = {
  sm:  { dim: 80,  r: 30, sw: 6,  fontSize: 18, subSize: 10 },
  md:  { dim: 120, r: 46, sw: 8,  fontSize: 26, subSize: 12 },
  lg:  { dim: 160, r: 62, sw: 10, fontSize: 34, subSize: 14 },
}

function scoreColor(score) {
  if (score >= 80) return '#28A745'
  if (score >= 60) return '#2E74B5'
  if (score >= 40) return '#FD7E14'
  return '#DC3545'
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Bon'
  if (score >= 40) return 'Moyen'
  return 'Faible'
}

export default function JaugeCirculaire({ score, size = 'md' }) {
  if (score == null) return <span className="text-muted">—</span>

  const { dim, r, sw, fontSize, subSize } = SIZES[size] || SIZES.md
  const cx   = dim / 2
  const cy   = dim / 2
  const circ = 2 * Math.PI * r
  const prog = (Math.min(100, Math.max(0, score)) / 100) * circ
  const color = scoreColor(score)

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        {/* Fond */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--border-color)" strokeWidth={sw} />
        {/* Arc coloré */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={`${prog} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        {/* Score */}
        <text x={cx} y={cy - 2} textAnchor="middle"
          fontSize={fontSize} fontWeight="800" fill={color}>
          {score}
        </text>
        <text x={cx} y={cy + subSize + 4} textAnchor="middle"
          fontSize={subSize} fill="var(--text-muted)">/100</text>
      </svg>
      {size !== 'sm' && (
        <span style={{
          marginTop: 4, fontSize: size === 'lg' ? 13 : 11,
          background: color, color: '#fff',
          borderRadius: 12, padding: '2px 10px', fontWeight: 700,
        }}>
          {scoreLabel(score)}
        </span>
      )}
    </div>
  )
}
