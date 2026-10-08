import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import ClochNotifications from '../ui/ClochNotifications'
import UserAvatar from '../ui/UserAvatar'
import LanguageSwitcher from '../ui/LanguageSwitcher'

export default function RHLayout({ children, pageTitle = 'Espace RH' }) {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

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

  function handleLogout() {
    logout()
    toast.success('Déconnexion réussie.')
    navigate('/login')
  }

  const activeTab = searchParams.get('tab') || 'stats'

  const navLinks = [
    { to: '/rh/dashboard',                  icon: 'fas fa-tachometer-alt',       label: t('nav.vue_globale'),    tab: null },
    { to: '/rh/dashboard?tab=stats',        icon: 'fas fa-chart-pie',            label: t('nav.statistiques'),   tab: 'stats' },
    { to: '/rh/dashboard?tab=analyses',     icon: 'fas fa-robot',                label: t('nav.analyses_ia'),    tab: 'analyses' },
    { to: '/rh/dashboard?tab=alertes',      icon: 'fas fa-exclamation-triangle', label: t('nav.alertes'),        tab: 'alertes' },
    { to: '/rh/dashboard?tab=employes',     icon: 'fas fa-users-cog',            label: t('nav.employes'),       tab: 'employes' },
  ]

  const rhLinks = [
    { to: '/rh/gestion-comptes',          icon: 'fas fa-users-cog',       label: t('nav.gestion_comptes') },
    { to: '/rh/departements',             icon: 'fas fa-building',        label: t('nav.departements') },
    { to: '/rh/contrats',                 icon: 'fas fa-file-contract',   label: t('nav.contrats') },
    { to: '/rh/presences',                icon: 'fas fa-fingerprint',     label: t('nav.presences') },
    { to: '/rh/conges',                   icon: 'fas fa-umbrella-beach',  label: t('nav.conges') },
    { to: '/rh/conges/types',             icon: 'fas fa-tags',            label: t('nav.types_conge') },
    { to: '/rh/documents',                icon: 'fas fa-folder-open',     label: t('nav.documents') },
    { to: '/rh/objectifs',                icon: 'fas fa-bullseye',        label: t('nav.objectifs') },
    { to: '/rh/objectifs/periodes',       icon: 'fas fa-calendar-alt',    label: t('nav.periodes_eval') },
    { to: '/rh/evaluations',              icon: 'fas fa-chart-bar',       label: t('nav.evaluations') },
    { to: '/rh/recrutements',             icon: 'fas fa-user-plus',       label: t('nav.recrutements') },
    { to: '/rh/formations',               icon: 'fas fa-graduation-cap',  label: t('nav.formations') },
    { to: '/rh/sanctions',                icon: 'fas fa-gavel',           label: t('nav.sanctions') },
    { to: '/rh/paie',                     icon: 'fas fa-coins',           label: t('nav.paie') },
    { to: '/rh/paie/masse-salariale',     icon: 'fas fa-chart-area',      label: t('nav.masse_salariale') },
    { to: '/rh/paie/virements',           icon: 'fas fa-mobile-alt',      label: t('virements.nav_link') },
    { to: '/rh/paie/import',              icon: 'fas fa-file-import',     label: t('nav.importer_donnees') },
    { to: '/rh/rapport-ia',               icon: 'fas fa-robot',           label: t('nav.rapport_ia') },
    { to: '/rh/parametres-entreprise',    icon: 'fas fa-cog',             label: t('nav.parametres') },
    { to: '/notifications',               icon: 'fas fa-bell',            label: t('nav.notifications') },
    { to: '/annuaire',                    icon: 'fas fa-address-book',    label: t('nav.annuaire') },
    { to: '/filieres',                    icon: 'fas fa-graduation-cap',  label: t('nav.postes_metiers') },
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
              {t('nav.espace_rh')}
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

      {/* ── Sidebar ── */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/rh/dashboard" className="brand-link">
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
              <small style={{ color: '#8ba7c0' }}>{t('nav.role_rh')}</small>
            </div>
          </div>

          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column nav-flat" role="menu">
              <li className="nav-header">{t('nav.section_dashboard')}</li>
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

              <li className="nav-header mt-2">{t('nav.section_gestion_rh')}</li>
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
                    <Link to="/rh/dashboard"><i className="fas fa-home mr-1" />{t('nav.home')}</Link>
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
