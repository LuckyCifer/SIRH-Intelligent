import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const C = {
  navy: '#1F3864',
  blue: '#2E74B5',
  lightBlue: '#D6E4F0',
}

export default function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const roleLabel = { STAGIAIRE: 'Stagiaire', ENCADREUR: 'Encadreur', ADMIN: 'Administrateur' }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: C.navy, color: '#fff', padding: '0 24px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1, color: C.lightBlue }}>GSRIA</span>
          <span style={{ color: '#8ab4d4', fontSize: 12 }}>· ACERFI Formation</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#d0e8f7' }}>
              {user.first_name || user.username}
              <span style={{
                marginLeft: 8, background: C.blue, borderRadius: 10, padding: '2px 8px', fontSize: 11,
              }}>
                {roleLabel[user.role] || user.role}
              </span>
            </span>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid #5a8fbf', color: '#d0e8f7',
              borderRadius: 6, padding: '4px 14px', fontSize: 12, cursor: 'pointer',
            }}>
              Déconnexion
            </button>
          </div>
        )}
      </nav>
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
