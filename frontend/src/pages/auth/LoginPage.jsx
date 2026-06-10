import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: 'fas fa-users',          label: 'Gestion des employés' },
  { icon: 'fas fa-umbrella-beach', label: 'Congés & Absences' },
  { icon: 'fas fa-fingerprint',    label: 'Présences & Pointages' },
  { icon: 'fas fa-coins',          label: 'Paie automatisée CNPS + IRPP' },
  { icon: 'fas fa-bullseye',       label: 'Objectifs & Évaluations' },
  { icon: 'fas fa-robot',          label: 'Rapport IA mensuel (Groq)' },
  { icon: 'fas fa-user-plus',      label: 'Recrutements' },
  { icon: 'fas fa-graduation-cap', label: 'Formations' },
  { icon: 'fas fa-bell',           label: 'Notifications internes' },
  { icon: 'fas fa-building',       label: 'Multi-entreprises' },
]

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      toast.success(`Bienvenue, ${user.first_name || user.username} !`)
      if      (user.role === 'RH' || user.role === 'ADMIN') navigate('/rh/dashboard')
      else if (user.role === 'MANAGER')                     navigate('/manager/dashboard')
      else                                                  navigate('/employe/dashboard')
    } catch {
      toast.error('Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0D1B2A 0%, #1F3864 100%)'
        : 'linear-gradient(135deg, #1F3864 0%, #2E74B5 100%)',
      transition: 'background 0.3s ease',
      position: 'relative',
    },
    card: {
      background: isDark ? '#1E3448' : '#fff',
      borderRadius: 16,
      padding: '40px 36px',
      width: '100%',
      maxWidth: 420,
      boxShadow: isDark
        ? '0 20px 60px rgba(0,0,0,0.5)'
        : '0 20px 60px rgba(0,0,0,0.25)',
      border: isDark ? '1px solid #2A4A64' : 'none',
      transition: 'background 0.3s ease, box-shadow 0.3s ease',
    },
    logo: {
      width: 56, height: 56, borderRadius: 14,
      background: isDark ? '#2E74B5' : '#1F3864',
      color: '#fff', fontSize: 24, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 12px',
    },
    title: {
      fontSize: 26, fontWeight: 800,
      color: isDark ? '#E8F1F8' : '#1F3864',
      margin: 0,
    },
    subtitle: {
      fontSize: 13,
      color: isDark ? '#8BA8C0' : '#666',
      margin: '4px 0 0',
    },
    label: {
      fontSize: 13, fontWeight: 600,
      color: isDark ? '#C9D8E8' : '#333',
    },
    input: {
      padding: '10px 14px',
      border: `1.5px solid ${isDark ? '#2A4A64' : '#d0d0d0'}`,
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      transition: 'border 0.2s, background 0.3s',
      // background via box-shadow inset géré par le CSS autofill
      // On positionne quand même la couleur de fond native
      backgroundColor: isDark ? '#243D52' : '#FFFFFF',
      // color sert aux navigateurs sans autofill, webkit-text-fill-color
      // est géré côté CSS pour couvrir Chrome autofill
      color: isDark ? '#F0F6FC' : '#1A1A2E',
      caretColor: isDark ? '#F0F6FC' : '#1A1A2E',
      width: '100%',
    },
    btn: {
      padding: '12px',
      background: isDark ? '#2E74B5' : '#1F3864',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 700,
      cursor: 'pointer',
      marginTop: 4,
      width: '100%',
      transition: 'background 0.2s',
    },
    footer: {
      textAlign: 'center',
      fontSize: 11,
      color: isDark ? '#6B8FA8' : '#aaa',
      marginTop: 24,
    },
  }

  return (
    <div style={s.page}>
      {/* Bouton toggle thème */}
      <button onClick={toggleTheme} title={isDark ? 'Mode clair' : 'Mode sombre'}
        style={{
          position: 'fixed', top: 18, right: 18, zIndex: 100,
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          borderRadius: '50%', width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, color: '#fff',
        }}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Grille 2 colonnes sur grand écran */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 48, flexWrap: 'wrap', width: '100%', maxWidth: 900, padding: '24px 16px',
      }}>

        {/* ── Colonne gauche : fonctionnalités ── */}
        <div style={{ flex: '1 1 340px', color: '#fff' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>SIRH</h2>
          <p style={{ opacity: 0.8, marginBottom: 24, fontSize: 14 }}>
            Plateforme RH intelligente propulsée par l'IA
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={f.icon} style={{ fontSize: 12 }} />
                </div>
                <span style={{ opacity: 0.9 }}>{f.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, opacity: 0.55, fontSize: 11 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              <i className="fas fa-arrow-left mr-1" />Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* ── Colonne droite : formulaire ── */}
        <div style={s.card}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={s.logo}>S</div>
            <h1 style={s.title}>Connexion</h1>
            <p style={s.subtitle}>Accédez à votre espace RH</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={s.label}>Identifiant</label>
              <input style={s.input} type="text" placeholder="nom.prenom"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                required autoFocus />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={s.label}>Mot de passe</label>
              <input style={s.input} type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required />
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin mr-2" />Connexion…</>
                : <><i className="fas fa-sign-in-alt mr-2" />Se connecter</>}
            </button>
          </form>

          <p style={s.footer}>Développé par Yemeya Luc · ACERFI 2026</p>
        </div>
      </div>
    </div>
  )
}
