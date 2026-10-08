import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: 'fas fa-users',          key: 'feat_employes' },
  { icon: 'fas fa-umbrella-beach', key: 'feat_conges' },
  { icon: 'fas fa-fingerprint',    key: 'feat_presences' },
  { icon: 'fas fa-coins',          key: 'feat_paie' },
  { icon: 'fas fa-bullseye',       key: 'feat_objectifs' },
  { icon: 'fas fa-robot',          key: 'feat_ia' },
  { icon: 'fas fa-user-plus',      key: 'feat_recrutements' },
  { icon: 'fas fa-graduation-cap', key: 'feat_formations' },
  { icon: 'fas fa-bell',           key: 'feat_notifications' },
  { icon: 'fas fa-building',       key: 'feat_multi' },
]

const FEATURES_FR = {
  feat_employes:     'Gestion des employés',
  feat_conges:       'Congés & Absences',
  feat_presences:    'Présences & Pointages',
  feat_paie:         'Paie automatisée CNPS + IRPP',
  feat_objectifs:    'Objectifs & Évaluations',
  feat_ia:           'Rapport IA mensuel (Groq)',
  feat_recrutements: 'Recrutements',
  feat_formations:   'Formations',
  feat_notifications:'Notifications internes',
  feat_multi:        'Multi-entreprises',
}

const FEATURES_EN = {
  feat_employes:     'Employee Management',
  feat_conges:       'Leave & Absences',
  feat_presences:    'Attendance & Time Tracking',
  feat_paie:         'Automated Payroll CNPS + IRPP',
  feat_objectifs:    'Objectives & Evaluations',
  feat_ia:           'Monthly AI Report (Groq)',
  feat_recrutements: 'Recruitment',
  feat_formations:   'Training',
  feat_notifications:'Internal Notifications',
  feat_multi:        'Multi-company',
}

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const isEn = i18n.language?.startsWith('en')
  const featLabels = isEn ? FEATURES_EN : FEATURES_FR

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      toast.success(`${t('auth.welcome')}, ${user.first_name || user.username} !`)
      if      (user.role === 'RH' || user.role === 'ADMIN') navigate('/rh/dashboard')
      else if (user.role === 'MANAGER')                     navigate('/manager/dashboard')
      else                                                  navigate('/employe/dashboard')
    } catch {
      toast.error(t('auth.invalid_credentials'))
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
      backgroundColor: isDark ? '#243D52' : '#FFFFFF',
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
      {/* Controls top-right */}
      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ul className="navbar-nav" style={{ margin: 0 }}>
          <LanguageSwitcher />
        </ul>
        <button onClick={toggleTheme} title={isDark ? t('nav.light_mode') : t('nav.dark_mode')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            borderRadius: '50%', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: '#fff',
          }}>
          <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'} />
        </button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 48, flexWrap: 'wrap', width: '100%', maxWidth: 900, padding: '24px 16px',
      }}>

        {/* Left column: features */}
        <div style={{ flex: '1 1 340px', color: '#fff' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>SIRH</h2>
          <p style={{ opacity: 0.8, marginBottom: 24, fontSize: 14 }}>
            {t('auth.platform')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FEATURES.map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={f.icon} style={{ fontSize: 12 }} />
                </div>
                <span style={{ opacity: 0.9 }}>{featLabels[f.key]}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, opacity: 0.55, fontSize: 11 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              <i className="fas fa-arrow-left mr-1" />
              {isEn ? 'Back to home' : 'Retour à l\'accueil'}
            </Link>
          </div>
        </div>

        {/* Right column: form */}
        <div style={s.card}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={s.logo}>S</div>
            <h1 style={s.title}>{t('auth.welcome')}</h1>
            <p style={s.subtitle}>{t('auth.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={s.label}>{t('auth.username')}</label>
              <input style={s.input} type="text" placeholder={t('auth.username_placeholder')}
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                required autoFocus />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={s.label}>{t('auth.password')}</label>
              <input style={s.input} type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required />
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin mr-2" />{t('auth.logging_in')}</>
                : <><i className="fas fa-sign-in-alt mr-2" />{t('auth.login_btn')}</>}
            </button>
          </form>

          <p style={s.footer}>{t('auth.powered_by')}</p>
        </div>
      </div>
    </div>
  )
}
