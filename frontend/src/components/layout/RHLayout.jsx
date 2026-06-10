import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import ClochNotifications from '../ui/ClochNotifications'

export default function RHLayout({ children, pageTitle = 'Espace RH' }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed')
    return () => {
      document.body.classList.remove('hold-transition', 'sidebar-mini', 'layout-fixed')
    }
  }, [])

  useEffect(() => {
    collapsed
      ? document.body.classList.add('sidebar-collapse')
      : document.body.classList.remove('sidebar-collapse')
  }, [collapsed])

  useEffect(() => {
    const activeLink = document.querySelector('.nav-sidebar .nav-link.active')
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [location.pathname])

  function handleLogout() {
    logout()
    toast.success('Déconnexion réussie.')
    navigate('/login')
  }

  const activeTab = searchParams.get('tab') || 'stats'

  const navLinks = [
    { to: '/rh/dashboard',                  icon: 'fas fa-tachometer-alt',      label: 'Vue globale',    tab: null },
    { to: '/rh/dashboard?tab=stats',        icon: 'fas fa-chart-pie',           label: 'Statistiques',   tab: 'stats' },
    { to: '/rh/dashboard?tab=analyses',     icon: 'fas fa-robot',               label: 'Analyses IA',    tab: 'analyses' },
    { to: '/rh/dashboard?tab=alertes',      icon: 'fas fa-exclamation-triangle', label: 'Alertes',        tab: 'alertes' },
    { to: '/rh/dashboard?tab=employes',     icon: 'fas fa-users-cog',           label: 'Employés',       tab: 'employes' },
  ]

  const rhLinks = [
    { to: '/rh/departements',        icon: 'fas fa-building',       label: 'Départements' },
    { to: '/rh/contrats',            icon: 'fas fa-file-contract',  label: 'Contrats' },
    { to: '/rh/presences',           icon: 'fas fa-fingerprint',    label: 'Présences' },
    { to: '/rh/conges',              icon: 'fas fa-umbrella-beach', label: 'Congés' },
    { to: '/rh/conges/types',        icon: 'fas fa-tags',           label: 'Types de congé' },
    { to: '/rh/documents',           icon: 'fas fa-folder-open',    label: 'Documents' },
    { to: '/rh/objectifs',           icon: 'fas fa-bullseye',       label: 'Objectifs' },
    { to: '/rh/objectifs/periodes',  icon: 'fas fa-calendar-alt',   label: 'Périodes éval.' },
    { to: '/rh/evaluations',         icon: 'fas fa-chart-bar',      label: 'Évaluations' },
    { to: '/rh/recrutements',         icon: 'fas fa-user-plus',      label: 'Recrutements' },
    { to: '/rh/formations',          icon: 'fas fa-graduation-cap', label: 'Formations' },
    { to: '/rh/sanctions',           icon: 'fas fa-gavel',          label: 'Sanctions' },
    { to: '/rh/paie',                icon: 'fas fa-coins',          label: 'Paie' },
    { to: '/rh/paie/masse-salariale', icon: 'fas fa-chart-area',   label: 'Masse salariale' },
    { to: '/rh/rapport-ia',              icon: 'fas fa-robot',         label: 'Rapport IA' },
    { to: '/rh/parametres-entreprise',   icon: 'fas fa-cog',           label: 'Paramètres' },
    { to: '/notifications',              icon: 'fas fa-bell',          label: 'Notifications' },
    { to: '/annuaire',                   icon: 'fas fa-address-book',  label: 'Annuaire' },
    { to: '/filieres',                   icon: 'fas fa-graduation-cap', label: 'Postes & Métiers' },
  ]

  const initial = (user?.first_name?.[0] || user?.username?.[0] || 'R').toUpperCase()

  return (
    <div className="wrapper">

      {/* ── Navbar ── */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" role="button" style={{ cursor: 'pointer' }}
              onClick={() => setCollapsed(c => !c)}>
              <i className="fas fa-bars" />
            </a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link font-weight-bold" style={{ color: 'var(--acerfi-dark)' }}>
              SIRH — Espace RH
            </span>
          </li>
        </ul>

        <ul className="navbar-nav ml-auto align-items-center">
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              <i className="fas fa-user-shield mr-1" style={{ color: 'var(--acerfi-blue)' }} />
              {user?.first_name || user?.username}
              <span className="badge badge-danger ml-2">RH</span>
            </span>
          </li>
          <li className="nav-item ml-1 mr-1">
            <button className="theme-toggle-btn" onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
              <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} />
            </button>
          </li>
          <ClochNotifications />
          <li className="nav-item">
            <button className="btn btn-sm btn-outline-secondary mr-2" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-1" />Déconnexion
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Sidebar ── */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/rh/dashboard" className="brand-link">
          <span className="brand-text">SIRH</span>
        </Link>

        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">
            <div className="image">
              <div className="sidebar-avatar">{initial}</div>
            </div>
            <div className="info ml-2">
              <span className="d-block" style={{ color: '#c2d3e2', fontWeight: 600, fontSize: 13 }}>
                {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username}
              </span>
              <small style={{ color: '#8ba7c0' }}>Responsable RH</small>
            </div>
          </div>

          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column nav-flat" role="menu">
              <li className="nav-header">TABLEAU DE BORD</li>
              {navLinks.map((link, i) => {
                const isActive = link.tab
                  ? activeTab === link.tab
                  : location.pathname === '/rh/dashboard' && !searchParams.get('tab')
                return (
                  <li className="nav-item" key={i}>
                    <Link to={link.to} className={`nav-link ${isActive ? 'active' : ''}`}>
                      <i className={`nav-icon ${link.icon}`} />
                      <p>{link.label}</p>
                    </Link>
                  </li>
                )
              })}

              <li className="nav-header mt-2">GESTION RH</li>
              {rhLinks.map((link, i) => (
                <li className="nav-item" key={`rh-${i}`}>
                  <Link to={link.to}
                    className={`nav-link ${
                      location.pathname === link.to ||
                      location.pathname.startsWith(link.to + '/')
                        ? 'active' : ''
                    }`}>
                    <i className={`nav-icon ${link.icon}`} />
                    <p>{link.label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2 align-items-center">
              <div className="col-sm-6">
                <h1 className="m-0" style={{ color: 'var(--page-title)', fontSize: 22 }}>
                  {pageTitle}
                </h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item">
                    <Link to="/rh/dashboard"><i className="fas fa-home mr-1" />Accueil</Link>
                  </li>
                  <li className="breadcrumb-item active">{pageTitle}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">{children}</div>
        </section>
      </div>

      <footer className="main-footer text-sm">
        <strong>SIRH &copy; {new Date().getFullYear()} — Système d'Information RH</strong>
        <span className="float-right">Plateforme RH intelligente</span>
      </footer>
      <aside className="control-sidebar control-sidebar-dark" />
    </div>
  )
}
