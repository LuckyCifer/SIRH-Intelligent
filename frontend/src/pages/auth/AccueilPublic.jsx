import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const FEATURES = [
  { icon: 'fas fa-users',            label: 'Gestion des employés' },
  { icon: 'fas fa-umbrella-beach',   label: 'Congés & Absences' },
  { icon: 'fas fa-fingerprint',      label: 'Présences & Pointages' },
  { icon: 'fas fa-coins',            label: 'Paie automatisée (CNPS + IRPP)' },
  { icon: 'fas fa-bullseye',         label: 'Objectifs & Évaluations' },
  { icon: 'fas fa-robot',            label: 'Analyses IA mensuelles (Groq)' },
  { icon: 'fas fa-user-plus',        label: 'Recrutements & Candidatures' },
  { icon: 'fas fa-graduation-cap',   label: 'Formations & Compétences' },
  { icon: 'fas fa-gavel',            label: 'Sanctions disciplinaires' },
  { icon: 'fas fa-building',         label: 'Multi-entreprises' },
  { icon: 'fas fa-bell',             label: 'Notifications internes' },
  { icon: 'fas fa-file-alt',         label: 'Documents RH' },
]

export default function AccueilPublic() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark
        ? 'linear-gradient(135deg, #0D1B2A 0%, #1A2F4A 50%, #1F3864 100%)'
        : 'linear-gradient(135deg, #1F3864 0%, #2E74B5 60%, #3A8CC8 100%)',
      color: '#fff',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: 'relative',
    }}>
      {/* Toggle thème */}
      <button onClick={toggleTheme} title={isDark ? 'Mode clair' : 'Mode sombre'}
        style={{
          position: 'fixed', top: 18, right: 18, zIndex: 100,
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          borderRadius: '50%', width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 17, color: '#fff',
        }}>
        {isDark ? '☀️' : '🌙'}
      </button>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Hero ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 40, padding: '64px 0 48px',
        }}>
          {/* Gauche */}
          <div style={{ flex: '1 1 420px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.12)', borderRadius: 100,
              padding: '6px 16px', marginBottom: 24, fontSize: 13,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
              Propulsé par l'Intelligence Artificielle
            </div>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 16px' }}>
              SIRH
              <span style={{ display: 'block', fontSize: '0.55em', fontWeight: 400, opacity: 0.85, marginTop: 4 }}>
                Système d'Information des Ressources Humaines Intelligent
              </span>
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.7, opacity: 0.88, maxWidth: 480, marginBottom: 36 }}>
              Gérez vos ressources humaines avec l'intelligence artificielle.
              Automatisation de la paie, analyses prédictives et gestion complète du cycle RH.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 10,
                background: '#fff', color: '#1F3864',
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s',
              }}>
                <i className="fas fa-sign-in-alt" />
                Se connecter
              </Link>
              <a href="#fonctionnalites" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontWeight: 600, fontSize: 15,
                textDecoration: 'none',
              }}>
                <i className="fas fa-th-list" />
                Fonctionnalités
              </a>
            </div>

            <div style={{ display: 'flex', gap: 28, marginTop: 40, flexWrap: 'wrap' }}>
              {[['18', 'Modules RH'], ['6', 'Rôles & accès'], ['IA', 'Groq intégrée']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{val}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Droite — carte aperçu */}
          <div style={{ flex: '0 0 auto' }}>
            <div style={{
              background: isDark ? 'rgba(30,52,72,0.85)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 20, padding: '28px 24px', width: 280,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', fontSize: 28,
                }}>
                  <i className="fas fa-building" />
                </div>
                <strong style={{ fontSize: 16 }}>ACERFI SARL</strong>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Yaoundé, Cameroun</div>
              </div>
              {[['fas fa-users', '6 employés actifs', '#4ADE80'],
                ['fas fa-umbrella-beach', '2 congés en attente', '#FBBF24'],
                ['fas fa-robot', 'Score RH: 82/100', '#60A5FA'],
                ['fas fa-bell', '3 notifications', '#F472B6']].map(([ic, txt, col]) => (
                <div key={txt} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 13,
                }}>
                  <i className={ic} style={{ color: col, width: 16 }} />
                  {txt}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Fonctionnalités ── */}
        <div id="fonctionnalites" style={{ paddingBottom: 64 }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Tout ce dont votre équipe RH a besoin
          </h2>
          <p style={{ textAlign: 'center', opacity: 0.75, marginBottom: 36 }}>
            Une plateforme complète, du recrutement à la paie
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
          }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{
                background: isDark ? 'rgba(30,52,72,0.7)' : 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12, padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 15,
                }}>
                  <i className={f.icon} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA final ── */}
        <div style={{
          textAlign: 'center', paddingBottom: 60,
          borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 48,
        }}>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 40px', borderRadius: 12,
            background: '#fff', color: '#1F3864',
            fontWeight: 700, fontSize: 16, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}>
            <i className="fas fa-sign-in-alt" />
            Accéder à la plateforme
          </Link>
          <div style={{ marginTop: 32, opacity: 0.55, fontSize: 12 }}>
            Développé par <strong>Yemeya Luc</strong> — ACERFI 2026<br />
            Filière ISA — IA Solutions Architect
          </div>
        </div>

      </div>
    </div>
  )
}
