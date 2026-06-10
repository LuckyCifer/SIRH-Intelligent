import { getFiliere } from '../../constants/filieres'

/**
 * Carte cliquable affichant une filière.
 * Props : code, selected (bool), onClick
 */
export default function FiliereCard({ code, selected = false, onClick }) {
  const f = getFiliere(code)
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      style={{
        cursor:      'pointer',
        borderLeft:  `5px solid ${f.couleur}`,
        borderRadius: 8,
        padding:     '12px 14px',
        background:  selected ? f.couleur + '18' : 'var(--bg-card)',
        border:      selected
          ? `2px solid ${f.couleur}`
          : `1px solid var(--border-color)`,
        borderLeft:  `5px solid ${f.couleur}`,
        transition:  'all .15s ease',
        outline:     selected ? `2px solid ${f.couleur}` : 'none',
        outlineOffset: 2,
      }}
    >
      <div className="d-flex align-items-center mb-1">
        <div style={{
          width:          38, height: 38, borderRadius: '50%', flexShrink: 0,
          background:     f.couleur,
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          color:          f.couleurTexte, fontSize: 16, marginRight: 10,
        }}>
          <i className={f.icone} />
        </div>
        <div>
          <div className="font-weight-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {f.label}
          </div>
          {selected && (
            <span style={{ fontSize: 10, color: f.couleur, fontWeight: 700 }}>
              <i className="fas fa-check-circle mr-1" />Sélectionné
            </span>
          )}
        </div>
      </div>
      <p className="mb-0" style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {f.description}
      </p>
    </div>
  )
}
