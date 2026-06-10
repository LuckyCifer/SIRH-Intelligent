export default function Spinner({ message = 'Chargement…', size = '2x', className = 'py-5' }) {
  return (
    <div className={`text-center ${className}`}>
      <i className={`fas fa-spinner fa-spin fa-${size}`}
        style={{ color: 'var(--acerfi-blue)' }} />
      {message && <p className="mt-2 text-muted">{message}</p>}
    </div>
  )
}
