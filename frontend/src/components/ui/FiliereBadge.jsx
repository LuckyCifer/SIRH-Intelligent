import { getFiliere, getBadgeStyle } from '../../constants/filieres'

/**
 * Badge coloré d'une filière ACERFI.
 * Props : code (string), size ("sm"|"md"|"lg")
 */
export default function FiliereBadge({ code, size = 'md' }) {
  const f = getFiliere(code)
  return (
    <span style={getBadgeStyle(code, size)}>
      <i className={f.icone} style={{ fontSize: size === 'sm' ? 9 : size === 'lg' ? 12 : 10 }} />
      {f.label}
    </span>
  )
}
