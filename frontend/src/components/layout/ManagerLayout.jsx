import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import { getStatsConges } from '../../api/conges'
import ClochNotifications from '../ui/ClochNotifications'
import UserAvatar from '../ui/UserAvatar'
import LanguageSwitcher from '../ui/LanguageSwitcher'

export default function ManagerLayout({ children, pageTitle = 'Espace Manager' }) {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [collapsed,       setCollapsed]       = useState(false)
  const [nbEnAttente,     setNbEnAttente]     = useState(0)
  const [nbCongesAttente, setNbCongesAttente] = useState(0)

  useEffect(() => {
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed', 'layout-navbar-fixed')
    return () => {
      document.body.classList.remove('hold-transition', 'sidebar-mini', 'layout-fixed', 'layout-navbar-fixed')
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

  useEffect(() => {
    api.get('/rapports/?statut=SOUMIS')
      .then(r => {
        const data = r.data.results ?? r.data
        setNbEnAttente(Array.isArray(data) ? data.length : 0)
      })
      .catch(() => {})
    getStatsConges()
      .then(r => setNbCongesAttente(r.data.en_attente ?? 0))
      .catch(() => {})
  }, [location.pathname])

  function handleLogout() {
    logout()
    toast.success('Déconnexion réussie.')
    navigate('/login')
  }

  function isActive(to, exact = false) {
    if (exact) return location.pathname === to
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  const navLinks = [
    { to: '/manager/dashboard',           icon: 'fas fa-tachometer-alt', label: t('nav.tableau_de_bord'),    exact: true },
    { to: '/manager/employes',            icon: 'fas fa-users',          label: t('nav.mon_equipe') },
    { to: '/manager/presences',           icon: 'fas fa-fingerprint',    label: t('nav.presences_equipe') },
    { to: '/manager/rapports-a-valider',  icon: 'fas fa-clipboard-check',label: t('nav.rapports_valider'),   badge: nbEnAttente },
    { to: '/manager/conges',              icon: 'fas fa-umbrella-beach', label: t('nav.validation_conges'),  badge: nbCongesAttente },
    { to: '/manager/objectifs-equipe',    icon: 'fas fa-bullseye',       label: t('nav.objectifs_equipe') },
    { to: '/manager/formations',          icon: 'fas fa-graduation-cap', label: t('nav.formations_equipe') },
    { to: '/manager/profil',              icon: 'fas fa-user-circle',    label: t('nav.mon_profil_manager') },
  ]

  const initial = (user?.first_name?.[0] || user?.username?.[0] || 'M').toUpperCase()

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
              {t('nav.espace_manager')}
            </span>
          </li>
        </ul>

        <ul className="navbar-nav ml-auto align-items-center">
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              <i className="fas fa-chalkboard-teacher mr-1" style={{ color: 'var(--acerfi-blue)' }} />
              {user?.first_name || user?.username}
              <span className="badge badge-primary ml-2">{t('auth.role_manager')}</span>
            </span>
          </li>
          {nbEnAttente > 0 && (
            <li className="nav-item d-none d-sm-inline-block">
              <Link to="/manager/rapports-a-valider" className="nav-link" style={{ color: '#fd7e14' }}>
                <i className="fas fa-bell mr-1" />
                <span className="badge badge-warning">{nbEnAttente}</span>
              </Link>
            </li>
          )}
          <LanguageSwitcher />
          <li className="nav-item ml-1 mr-1">
            <button className="theme-toggle-btn" onClick={toggleTheme}
              title={theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}>
              <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} />
            </button>
          </li>
          <ClochNotifications />
          <li className="nav-item">
            <button className="btn btn-sm btn-outline-secondary mr-2" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-1" />{t('nav.logout')}
            </button>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/manager/dashboard" className="brand-link">
          <span className="brand-text">SIRH</span>
        </Link>

        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">
            <div className="image">
              <UserAvatar user={user} size={38} shape="circle" style={{ border: '2px solid rgba(255,255,255,0.2)' }} />
            </div>
            <div className="info ml-2">
              <span className="d-block" style={{ color: '#c2d3e2', fontWeight: 600, fontSize: 13 }}>
                {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username}
              </span>
              <small style={{ color: '#8ba7c0' }}>{t('nav.role_manager')}</small>
            </div>
          </div>

          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column nav-flat" role="menu">
              <li className="nav-header">{t('nav.section_mon_equipe')}</li>
              {navLinks.map((link, i) => (
                <li className="nav-item" key={i}>
                  <Link to={link.to} className={`nav-link ${isActive(link.to, link.exact) ? 'active' : ''}`}>
                    <i className={`nav-icon ${link.icon}`} />
                    <p>
                      {link.label}
                      {link.badge != null && link.badge > 0 && (
                        <span className="badge badge-danger right" style={{ marginLeft: 4 }}>
                          {link.badge}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
              <li className="nav-header mt-2">{t('nav.section_ressources')}</li>
              <li className="nav-item">
                <Link to="/notifications" className={`nav-link ${location.pathname === '/notifications' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-bell" />
                  <p>{t('nav.notifications')}</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/annuaire" className={`nav-link ${location.pathname === '/annuaire' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-address-book" />
                  <p>{t('nav.annuaire')}</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/filieres" className={`nav-link ${location.pathname === '/filieres' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-graduation-cap" />
                  <p>{t('nav.postes_metiers')}</p>
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
                    <Link to="/manager/dashboard">
                      <i className="fas fa-home mr-1" />{t('nav.home')}
                    </Link>
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
        <strong>{t('footer.copyright', { year: new Date().getFullYear() })}</strong>
        <span className="float-right">{t('footer.platform')}</span>
      </footer>
      <aside className="control-sidebar control-sidebar-dark" />
    </div>
  )
}
