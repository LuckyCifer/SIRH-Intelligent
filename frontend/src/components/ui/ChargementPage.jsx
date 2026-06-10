export default function ChargementPage({ message = 'Chargement…' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
      <p className="mt-3" style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
    </div>
  )
}
