export default function EtatVide({ icone = 'fas fa-inbox', titre = 'Aucune donnée', message = '', actionLabel = null, onAction = null }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
      <i className={`${icone} fa-3x mb-3 d-block`} style={{ opacity: 0.4 }} />
      <h6 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>{titre}</h6>
      {message && <p style={{ fontSize: 13, maxWidth: 360, margin: '0 auto 16px' }}>{message}</p>}
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}
          style={{ background: 'var(--acerfi-blue)', borderColor: 'var(--acerfi-blue)' }}>
          <i className="fas fa-plus mr-2" />{actionLabel}
        </button>
      )}
    </div>
  )
}
