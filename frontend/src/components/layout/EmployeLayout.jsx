import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { getFiliere } from '../../constants/filieres'
import ClochNotifications from '../ui/ClochNotifications'

const NAV_LINKS = [
  { to: '/employe/dashboard',         icon: 'fas fa-tachometer-alt', label: 'Mon tableau de bord' },
  { to: '/employe/rapports',          icon: 'fas fa-file-alt',       label: 'Mes rapports' },
  { to: '/employe/presences',         icon: 'fas fa-fingerprint',    label: 'Mes présences' },
  { to: '/employe/conges',            icon: 'fas fa-umbrella-beach', label: 'Mes congés' },
  { to: '/employe/mes-objectifs',     icon: 'fas fa-bullseye',       label: 'Mes objectifs' },
  { to: '/employe/mes-evaluations',   icon: 'fas fa-chart-bar',      label: 'Mes évaluations' },
  { to: '/employe/contrat',           icon: 'fas fa-file-contract',  label: 'Mon contrat' },
  { to: '/employe/documents',         icon: 'fas fa-folder-open',    label: 'Mes documents' },
  { to: '/employe/profil',            icon: 'fas fa-user-circle',    label: 'Mon profil' },
  { to: '/employe/formations',        icon: 'fas fa-graduation-cap', label: 'Formations' },
  { to: '/employe/sanctions',         icon: 'fas fa-gavel',          label: 'Mes sanctions' },
  { to: '/employe/paie',              icon: 'fas fa-coins',          label: 'Ma paie' },
]

export default function EmployeLayout({ children, pageTitle = 'Mon Espace', breadcrumb = null }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
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

  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()

  function isActive(path) {
    if (path === '/employe/dashboard') return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="wrapper">

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
              SIRH — Espace Employé
            </span>
          </li>
        </ul>

        <ul className="navbar-nav ml-auto align-items-center">
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              <i className="fas fa-user-circle mr-1" style={{ color: 'var(--acerfi-blue)' }} />
              {user?.first_name || user?.username}
              <span className="badge badge-primary ml-2">Employé</span>
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

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/employe/dashboard" className="brand-link">
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
              <small style={{ color: '#8ba7c0' }}>
                {getFiliere(user?.filiere)?.label || 'Employé'}
              </small>
            </div>
          </div>

          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column nav-flat nav-child-indent" role="menu">
              <li className="nav-header">MON ESPACE</li>
              {NAV_LINKS.map(link => (
                <li className="nav-item" key={link.to}>
                  <Link to={link.to} className={`nav-link ${isActive(link.to) ? 'active' : ''}`}>
                    <i className={`nav-icon ${link.icon}`} />
                    <p>{link.label}</p>
                  </Link>
                </li>
              ))}
              <li className="nav-header mt-2">ACTION RAPIDE</li>
              <li className="nav-item">
                <Link to="/employe/rapports/nouveau" className="nav-link">
                  <i className="nav-icon fas fa-plus-circle" style={{ color: '#5ba3d9' }} />
                  <p style={{ color: '#5ba3d9' }}>Nouveau rapport</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/employe/conges/nouveau" className="nav-link">
                  <i className="nav-icon fas fa-plus-circle" style={{ color: '#28a745' }} />
                  <p style={{ color: '#28a745' }}>Demander un congé</p>
                </Link>
              </li>
              <li className="nav-header mt-2">RESSOURCES</li>
              <li className="nav-item">
                <Link to="/notifications" className={`nav-link ${location.pathname === '/notifications' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-bell" />
                  <p>Notifications</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/annuaire" className={`nav-link ${location.pathname === '/annuaire' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-address-book" />
                  <p>Annuaire</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/filieres" className={`nav-link ${location.pathname === '/filieres' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-graduation-cap" />
                  <p>Postes & Métiers</p>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

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
                    <Link to="/employe/dashboard">
                      <i className="fas fa-home mr-1" />Accueil
                    </Link>
                  </li>
                  {breadcrumb && (
                    <li className="breadcrumb-item">
                      <Link to={breadcrumb.to}>{breadcrumb.label}</Link>
                    </li>
                  )}
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
