import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import AdminLayout   from '../../components/layout/AdminLayout'
import FiliereBadge  from '../../components/ui/FiliereBadge'
import { useTheme }  from '../../context/ThemeContext'
import { getFiliere } from '../../constants/filieres'
import api from '../../api/axios'
import { getStatsConges } from '../../api/conges'
import { getDocuments } from '../../api/documents'
import { getRapportEquipe } from '../../api/presences'
import { getTableauBord } from '../../api/objectifs'
import { getTableauBordRecrutement } from '../../api/recrutements'
import { getStatsFormations, getInscriptions } from '../../api/formations'
import { getStatsSanctions } from '../../api/sanctions'
import { getStatsMasseSalariale } from '../../api/paie'
import { getDernierRapport } from '../../api/rapportIA'
import { getAlertesAvancement } from '../../api/gestionComptes'
import { getOnboardingsEnCours } from '../../api/recrutements'

const ALERTE_CONFIG = {
  AUCUNE:  { badge: 'badge-success', row: '',              color: '#28A745' },
  FAIBLE:  { badge: 'badge-success', row: '',              color: '#FFC107' },
  MOYENNE: { badge: 'badge-warning', row: 'table-warning', color: '#FD7E14' },
  ELEVEE:  { badge: 'badge-danger',  row: 'table-danger',  color: '#DC3545' },
}

const PROGRESSION_COLORS = {
  FAIBLE:     '#DC3545',
  MOYENNE:    '#FD7E14',
  BONNE:      '#2E74B5',
  EXCELLENTE: '#28A745',
}

const ROLE_OPTIONS = ['EMPLOYE', 'MANAGER', 'RH', 'ADMIN']

export default function DashboardAdmin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'stats'
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const { theme } = useTheme()

  const PROGRESSION_LABELS = {
    FAIBLE: t('admin.progression_labels.FAIBLE'),
    MOYENNE: t('admin.progression_labels.MOYENNE'),
    BONNE: t('admin.progression_labels.BONNE'),
    EXCELLENTE: t('admin.progression_labels.EXCELLENTE'),
  }
  const ROLE_LABELS = {
    EMPLOYE: t('accounts.employe'), MANAGER: t('accounts.manager'),
    RH: t('accounts.rh'), ADMIN: t('accounts.admin'),
  }
  const alerteLabel = (key) => t(`admin.alerte_labels.${key}`) || key
  const chartText = theme === 'dark' ? '#A8C4D8' : '#555555'
  const chartGrid = theme === 'dark' ? '#2A4A64' : '#DDDDDD'
  const tooltipStyle = { background: theme === 'dark' ? '#1E3448' : '#fff', border: `1px solid ${chartGrid}`, color: chartText }

  const [stats,             setStats]             = useState(null)
  const [alertes,           setAlertes]           = useState([])
  const [users,             setUsers]             = useState([])
  const [statsConges,       setStatsConges]       = useState(null)
  const [docsExpirants,     setDocsExpirants]     = useState(0)
  const [sansPointageCount, setSansPointageCount] = useState(0)
  const [statsEvaluations,  setStatsEvaluations]  = useState(null)
  const [statsRecrutements, setStatsRecrutements] = useState(null)
  const [statsFormationsRH, setStatsFormationsRH] = useState(null)
  const [nbInscEnAttente,   setNbInscEnAttente]   = useState(0)
  const [statsSanctionsRH,  setStatsSanctionsRH]  = useState(null)
  const [statsPaie,          setStatsPaie]          = useState(null)
  const [dernierRapportIA,   setDernierRapportIA]   = useState(null)
  const [alertesAvancement,  setAlertesAvancement]  = useState([])
  const [onboardingsEnCours, setOnboardingsEnCours] = useState([])
  const [loading,            setLoading]            = useState(true)
  const [updatingRole,       setUpdatingRole]       = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const moisAujourdhui = new Date().toISOString().slice(0, 7)
        const [sRes, aRes, uRes, cRes, docRes, presRes, evalRes, recrutRes, formStatsRes, formInscRes, sanctStatsRes, paieStatsRes, rapportIARes, avancRes, onbRes] = await Promise.all([
          api.get('/analyse/stats/').catch(() => ({ data: null })),
          api.get('/analyse/alertes/').catch(() => ({ data: [] })),
          api.get('/accounts/users/').catch(() => ({ data: [] })),
          getStatsConges().catch(() => ({ data: null })),
          getDocuments().catch(() => ({ data: [] })),
          getRapportEquipe(moisAujourdhui).catch(() => ({ data: null })),
          getTableauBord().catch(() => ({ data: null })),
          getTableauBordRecrutement().catch(() => ({ data: null })),
          getStatsFormations().catch(() => ({ data: null })),
          getInscriptions({ statut: 'EN_ATTENTE' }).catch(() => ({ data: { count: 0, results: [] } })),
          getStatsSanctions().catch(() => ({ data: null })),
          getStatsMasseSalariale({ mois: new Date().getMonth() + 1, annee: new Date().getFullYear() }).catch(() => ({ data: null })),
          getDernierRapport().catch(() => ({ data: null })),
          getAlertesAvancement().catch(() => ({ data: [] })),
          getOnboardingsEnCours().catch(() => ({ data: [] })),
        ])
        setStats(sRes.data)
        setAlertes(aRes.data.results ?? aRes.data)
        setUsers(uRes.data.results ?? uRes.data)
        setStatsConges(cRes.data)
        const allDocs = docRes.data.results ?? docRes.data
        setDocsExpirants(allDocs.filter(d => d.expire_bientot).length)
        const allEmps = presRes.data?.employes || []
        setSansPointageCount(allEmps.filter(e => e.jours_presents === 0 && e.jours_absents === 0 && e.jours_retard === 0).length)
        setStatsEvaluations(evalRes.data)
        setStatsRecrutements(recrutRes.data)
        setStatsFormationsRH(formStatsRes.data)
        const inscData = formInscRes.data
        setNbInscEnAttente(inscData?.count ?? (inscData?.results ?? inscData ?? []).length)
        setStatsSanctionsRH(sanctStatsRes.data)
        setStatsPaie(paieStatsRes.data)
        setDernierRapportIA(rapportIARes.data)
        setAlertesAvancement(avancRes.data?.results ?? avancRes.data ?? [])
        setOnboardingsEnCours(onbRes.data?.results ?? onbRes.data ?? [])
      } catch {
        toast.error(t('admin.load_error'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleRoleChange(userId, newRole) {
    setUpdatingRole(userId)
    try {
      await api.put(`/accounts/users/${userId}/`, { role: newRole })
      setUsers(us => us.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(t('admin.role_updated'))
    } catch {
      toast.error(t('admin.role_update_error'))
    } finally {
      setUpdatingRole(null)
    }
  }

  if (loading) {
    return (
      <AdminLayout pageTitle={t('admin.title')}>
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
          <p className="mt-2 text-muted">{t('common.loading')}</p>
        </div>
      </AdminLayout>
    )
  }

  // par_filiere est maintenant une liste [{filiere, label, nb_analyses, score_moyen, alertes_actives}]
  const filiereList = stats?.par_filiere ?? []

  const pieData = filiereList
    .filter(f => f.nb_analyses > 0)
    .map(f => ({ name: f.label, value: f.nb_analyses, key: f.filiere }))

  const barFiliereData = filiereList.map(f => ({
    name:  f.label.length > 12 ? f.label.slice(0, 12) + '…' : f.label,
    score: f.score_moyen ?? 0,
    key:   f.filiere,
  }))

  // Données onglet Analyses IA
  const evolutionData  = stats?.evolution_scores ?? []
  const progressionData = Object.entries(stats?.repartition_progression ?? {}).map(([k, v]) => ({
    name:  PROGRESSION_LABELS[k] || k,
    value: v,
    key:   k,
  }))
  const alertePieData = Object.entries(stats?.par_niveau_alerte ?? {}).map(([k, v]) => ({
    name:  alerteLabel(k),
    value: v,
    key:   k,
  }))

  const nbAlertesActives = alertes.filter(a => ['MOYENNE', 'ELEVEE'].includes(a.niveau_alerte)).length

  const TABS = [
    { key: 'stats',        icon: 'fas fa-chart-pie',           label: t('admin.tab_stats') },
    { key: 'analyses',     icon: 'fas fa-robot',               label: t('admin.tab_ia') },
    { key: 'alertes',      icon: 'fas fa-exclamation-triangle', label: t('admin.tab_alerts', { count: nbAlertesActives }) },
    { key: 'utilisateurs', icon: 'fas fa-users-cog',           label: t('admin.tab_users') },
  ]

  return (
    <AdminLayout pageTitle={t('admin.title')}>

      {/* ── Small Boxes ── */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stats?.total_analyses ?? 0}</h3>
              <p>{t('admin.ia_analyses_done')}</p>
            </div>
            <div className="icon"><i className="fas fa-robot" /></div>
            <span className="small-box-footer">
              <i className="fas fa-chart-bar mr-1" />{t('admin.all_filieres')}
            </span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-primary">
            <div className="inner">
              <h3>{stats?.score_moyen_global != null ? `${stats.score_moyen_global}` : '—'}</h3>
              <p>{t('admin.global_score')}</p>
            </div>
            <div className="icon"><i className="fas fa-star" /></div>
            <span className="small-box-footer">
              <i className="fas fa-graduation-cap mr-1" />{t('admin.all_filieres_short')}
            </span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{stats?.par_niveau_alerte?.MOYENNE ?? 0}</h3>
              <p>{t('admin.medium_alerts')}</p>
            </div>
            <div className="icon"><i className="fas fa-exclamation-circle" /></div>
            <span className="small-box-footer"><i className="fas fa-eye mr-1" />{t('admin.to_monitor')}</span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{stats?.par_niveau_alerte?.ELEVEE ?? 0}</h3>
              <p>{t('admin.high_alerts')}</p>
            </div>
            <div className="icon"><i className="fas fa-times-circle" /></div>
            <span className="small-box-footer"><i className="fas fa-bell mr-1" />{t('admin.intervention_needed')}</span>
          </div>
        </div>
      </div>

      {/* ── Récapitulatif Congés ── */}
      {statsConges && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-primary card-outline mb-0">
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-umbrella-beach mr-2" />
                  {t('admin.leave_absences', { year: new Date().getFullYear() })}
                </h3>
                <Link to="/rh/conges" className="btn btn-xs btn-outline-primary">
                  {t('admin.manage_leaves')}
                </Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#fd7e14' }}>
                      {statsConges.en_attente}
                    </div>
                    <small className="text-muted">
                      {statsConges.en_attente > 0
                        ? <span className="text-warning"><i className="fas fa-hourglass-half mr-1" />En attente</span>
                        : 'En attente'}
                    </small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#28a745' }}>
                      {statsConges.approuves}
                    </div>
                    <small className="text-muted">{t('admin.approved_leaves')}</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#2E74B5' }}>
                      {statsConges.total_jours_pris}j
                    </div>
                    <small className="text-muted">{t('admin.days_taken')}</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#6f42c1' }}>
                      {statsConges.taux_approbation}%
                    </div>
                    <small className="text-muted">{t('admin.approval_rate')}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Récapitulatif Évaluations ── */}
      {statsEvaluations && statsEvaluations.total > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-outline mb-0" style={{ borderColor: 'var(--acerfi-blue)', background: 'var(--card-bg)' }}>
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-chart-bar mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                  {t('admin.performance_evals')}
                </h3>
                <Link to="/rh/evaluations" className="btn btn-xs btn-outline-primary">
                  {t('admin.eval_board')}
                </Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: 'var(--acerfi-blue)' }}>
                      {statsEvaluations.total}
                    </div>
                    <small className="text-muted">{t('nav.evaluations')}</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#28a745' }}>
                      {statsEvaluations.note_moyenne
                        ? Number(statsEvaluations.note_moyenne).toFixed(1)
                        : '—'}
                    </div>
                    <small className="text-muted">Note moy. /5</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#6f42c1' }}>
                      {statsEvaluations.score_ia_moyen
                        ? Math.round(statsEvaluations.score_ia_moyen)
                        : '—'}
                    </div>
                    <small className="text-muted">Score IA moy. /100</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#fd7e14' }}>
                      {statsEvaluations.par_statut?.find(s => s.statut === 'EN_ATTENTE')?.nb ?? 0}
                    </div>
                    <small className="text-muted">En attente</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboardings en cours ── */}
      {onboardingsEnCours.length > 0 && (() => {
        const today = new Date()
        const avecRetardCnps = onboardingsEnCours.filter(c => {
          if (c.cnps_declare) return false
          if (!c.date_embauche_effective) return false
          const dl = new Date(new Date(c.date_embauche_effective + 'T00:00:00').getTime() + 8 * 86400000)
          return today > dl
        })
        return (
          <div className="row mb-3">
            <div className="col-12">
              <div className={`card ${avecRetardCnps.length > 0 ? 'card-danger' : 'card-success'} card-outline mb-0`}>
                <div className="card-header d-flex justify-content-between align-items-center py-2">
                  <h3 className="card-title" style={{ fontSize: 13 }}>
                    <i className="fas fa-clipboard-list mr-2" />
                    {t('admin_extra.onboardings_title')} —{' '}
                    <strong>{onboardingsEnCours.length}</strong> {t('admin_extra.onboardings_count', { count: onboardingsEnCours.length })}
                    {avecRetardCnps.length > 0 && (
                      <span className="badge badge-danger ml-2" style={{ fontSize: 10 }}>
                        {t('admin_extra.cnps_late_count', { count: avecRetardCnps.length })}
                      </span>
                    )}
                  </h3>
                  <Link to="/rh/recrutements" className="btn btn-xs btn-outline-secondary">
                    {t('admin_extra.module_recrutements')}
                  </Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                      <thead className="thead-light">
                        <tr>
                          <th>{t('admin_extra.col_candidate')}</th>
                          <th>{t('admin_extra.col_poste')}</th>
                          <th>{t('admin_extra.col_hire_date')}</th>
                          <th className="text-center">CNPS</th>
                          <th className="text-center">{t('admin_extra.col_register')}</th>
                          <th className="text-center">{t('admin_extra.col_medical')}</th>
                          <th>{t('admin_extra.col_progression')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {onboardingsEnCours.map(c => {
                          const cl = c.checklist_onboarding
                          const pct = cl ? Math.round((cl.nb_done / cl.nb_total) * 100) : 0
                          const cnpsRetard = (() => {
                            if (c.cnps_declare) return false
                            if (!c.date_embauche_effective) return false
                            const dl = new Date(new Date(c.date_embauche_effective + 'T00:00:00').getTime() + 8 * 86400000)
                            return today > dl
                          })()
                          return (
                            <tr key={c.id} style={{ background: cnpsRetard ? 'rgba(220,53,69,0.06)' : '' }}>
                              <td className="font-weight-bold align-middle">
                                <Link to={`/rh/recrutements/candidatures/${c.id}`} className="text-dark">
                                  {c.nom_complet}
                                </Link>
                              </td>
                              <td className="align-middle text-muted" style={{ fontSize: 11 }}>
                                {c.offre_detail?.titre || '—'}
                              </td>
                              <td className="align-middle">
                                {c.date_embauche_effective
                                  ? new Date(c.date_embauche_effective + 'T00:00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short' })
                                  : <span className="text-muted">—</span>
                                }
                              </td>
                              <td className="text-center align-middle">
                                {c.cnps_declare
                                  ? <i className="fas fa-check-circle text-success" title={t('admin_extra.cnps_declared')} />
                                  : <i className={`fas fa-times-circle ${cnpsRetard ? 'text-danger' : 'text-muted'}`}
                                      title={cnpsRetard ? t('admin_extra.cnps_late_tooltip') : t('admin_extra.cnps_not_declared')} />
                                }
                              </td>
                              <td className="text-center align-middle">
                                {c.inscrit_registre_personnel
                                  ? <i className="fas fa-check-circle text-success" />
                                  : <i className="fas fa-times-circle text-muted" />
                                }
                              </td>
                              <td className="text-center align-middle">
                                {c.visite_medicale_faite
                                  ? <i className="fas fa-check-circle text-success" />
                                  : <i className="fas fa-times-circle text-muted" />
                                }
                              </td>
                              <td className="align-middle" style={{ minWidth: 100 }}>
                                <div className="progress" style={{ height: 6 }}>
                                  <div className={`progress-bar bg-${pct === 100 ? 'success' : pct >= 50 ? 'warning' : 'danger'}`}
                                    style={{ width: `${pct}%` }} />
                                </div>
                                <small className="text-muted">{pct}%</small>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Avancements à traiter ── */}
      {alertesAvancement.length > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-warning card-outline mb-0">
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-star-half-alt mr-2 text-warning" />
                  {t('admin_extra.advancements_title')} —{' '}
                  <strong>{alertesAvancement.length}</strong> {t('admin_extra.advancements_count', { count: alertesAvancement.length })}
                </h3>
                <Link to="/rh/gestion-comptes" className="btn btn-xs btn-outline-warning">
                  {t('admin_extra.manage_accounts')}
                </Link>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                    <thead className="thead-light">
                      <tr>
                        <th>{t('admin_extra.col_employee')}</th>
                        <th>{t('admin_extra.col_cat_ech')}</th>
                        <th>{t('admin_extra.col_next_advancement')}</th>
                        <th>{t('admin_extra.col_seniority')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertesAvancement.map(u => {
                        const today    = new Date()
                        const dateAv   = u.prochain_avancement ? new Date(u.prochain_avancement + 'T00:00:00') : null
                        const enRetard = dateAv && dateAv < today
                        return (
                          <tr key={u.id} style={{ background: enRetard ? 'rgba(220,53,69,0.07)' : 'rgba(255,193,7,0.07)' }}>
                            <td className="font-weight-bold align-middle">
                              {u.full_name || u.username}
                            </td>
                            <td className="align-middle">
                              {u.categorie_pro
                                ? <span>Cat. {u.categorie_pro} — Éch. {u.echelon}</span>
                                : <span className="text-muted">—</span>
                              }
                            </td>
                            <td className="align-middle">
                              {dateAv
                                ? <span className={enRetard ? 'text-danger font-weight-bold' : 'text-warning font-weight-bold'}>
                                    {enRetard && <i className="fas fa-exclamation-triangle mr-1" />}
                                    {dateAv.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    {enRetard && ` ${t('admin_extra.overdue')}`}
                                  </span>
                                : '—'
                              }
                            </td>
                            <td className="align-middle text-muted">
                              {u.anciennete_mois != null
                                ? `${Math.floor(u.anciennete_mois / 12)}a ${u.anciennete_mois % 12}m`
                                : '—'
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Onglets ── */}
      <div className="row">
        <div className="col-12">
          <div className="card card-primary card-outline">
            <div className="card-header p-0">
              <ul className="nav nav-tabs" role="tablist">
                {TABS.map(t => (
                  <li className="nav-item" key={t.key}>
                    <a className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                      href="#"
                      onClick={e => { e.preventDefault(); setSearchParams({ tab: t.key }) }}>
                      <i className={`${t.icon} mr-1`} />{t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-body">

              {/* ══ Tab : Statistiques ══ */}
              {activeTab === 'stats' && (
                <div>
                  <div className="row">
                    {/* PieChart répartition filières */}
                    <div className="col-md-5 d-flex flex-column align-items-center">
                      <h5 className="text-center mb-3" style={{ color: 'var(--page-title)', fontSize: 14 }}>
                        {t('admin.distribution_by_filiere')}
                      </h5>
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name"
                              cx="50%" cy="50%" outerRadius={90}
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                              {pieData.map(entry => (
                                <Cell key={entry.key} fill={getFiliere(entry.key).couleur} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ color: chartText, fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-muted text-center py-5">
                          <i className="fas fa-chart-pie fa-2x mb-2 d-block" />
                          {t('admin_extra.no_data')}
                        </div>
                      )}
                    </div>

                    {/* BarChart scores par filière */}
                    <div className="col-md-7 d-flex flex-column">
                      <h5 className="text-center mb-3" style={{ color: 'var(--page-title)', fontSize: 14 }}>
                        {t('admin.avg_score_by_filiere')}
                      </h5>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barFiliereData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartText }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: chartText }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="score" name={t('admin_extra.avg_score')} radius={[4, 4, 0, 0]}>
                            {barFiliereData.map((entry, idx) => (
                              <Cell key={idx} fill={getFiliere(entry.key || 'AUTRE').couleur} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Tableau filières */}
                      <div className="table-responsive mt-3">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr><th>{t('admin_extra.col_filiere')}</th><th>{t('admin_extra.col_analyses')}</th><th>{t('admin_extra.avg_score')}</th><th>{t('admin_extra.col_alerts')}</th></tr>
                          </thead>
                          <tbody>
                            {filiereList.map(f => (
                              <tr key={f.filiere}>
                                <td><FiliereBadge code={f.filiere} size="sm" /></td>
                                <td className="text-center">{f.nb_analyses}</td>
                                <td className="font-weight-bold text-center" style={{ color: 'var(--page-title)' }}>
                                  {f.score_moyen != null ? `${f.score_moyen}/100` : '—'}
                                </td>
                                <td className="text-center">
                                  {f.alertes_actives > 0
                                    ? <span className="badge badge-danger">{f.alertes_actives}</span>
                                    : <span className="badge badge-success">0</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Barres alertes */}
                  {stats && (
                    <div className="row mt-3">
                      <div className="col-12">
                        <h5 style={{ color: 'var(--page-title)', fontSize: 14 }}>{t('admin_extra.alerts_distribution')}</h5>
                        {Object.entries(stats.par_niveau_alerte).map(([lvl, count]) => {
                          const pct = stats.total_analyses > 0
                            ? ((count / stats.total_analyses) * 100).toFixed(1) : 0
                          const colors = { AUCUNE: 'bg-success', FAIBLE: 'bg-info', MOYENNE: 'bg-warning', ELEVEE: 'bg-danger' }
                          return (
                            <div key={lvl} className="mb-2">
                              <div className="d-flex justify-content-between mb-1">
                                <span className="text-sm font-weight-bold">{ALERTE_CONFIG[lvl]?.label || lvl}</span>
                                <span className="text-sm text-muted">{count} analyse{count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="progress" style={{ height: 14 }}>
                                <div className={`progress-bar ${colors[lvl] || 'bg-secondary'}`}
                                  style={{ width: `${pct}%` }} role="progressbar">
                                  {pct > 5 ? `${pct}%` : ''}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ Tab : Analyses IA ══ */}
              {activeTab === 'analyses' && (
                <div>
                  <div className="row mb-4">

                    {/* Graphique 1 — Évolution scores */}
                    <div className="col-lg-7">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-chart-line mr-2 text-primary" />
                        {t('admin.score_evolution')}
                      </h5>
                      {evolutionData.length >= 2 ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart data={evolutionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="semaine" tickFormatter={v => `S${v}`}
                              tick={{ fontSize: 12, fill: chartText }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: chartText }} />
                            <Tooltip
                              formatter={v => [`${v}/100`, t('admin_extra.avg_score')]}
                              labelFormatter={l => `${t('admin.week_label')} ${l}`}
                              contentStyle={tooltipStyle}
                            />
                            <ReferenceLine y={60} stroke="#FD7E14" strokeDasharray="6 3"
                              label={{ value: t('admin_extra.threshold_60'), fill: '#FD7E14', fontSize: 11 }} />
                            <Line type="monotone" dataKey="score_moyen" name={t('admin_extra.avg_score')}
                              stroke="#2E74B5" strokeWidth={2}
                              dot={{ r: 4, fill: '#2E74B5' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <i className="fas fa-chart-line fa-2x mb-2 d-block" />
                          {t('admin_extra.not_enough_data')}
                        </div>
                      )}
                    </div>

                    {/* Graphique 2 — Répartition progression */}
                    <div className="col-lg-5">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-chart-bar mr-2" style={{ color: '#6f42c1' }} />
                        {t('admin.progression_distribution')}
                      </h5>
                      {progressionData.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={progressionData} layout="vertical"
                            margin={{ top: 5, right: 30, bottom: 5, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis type="number" tick={{ fontSize: 12, fill: chartText }} />
                            <YAxis type="category" dataKey="name"
                              tick={{ fontSize: 12, fill: chartText }} width={75} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="value" name={t('admin_extra.interns')} radius={[0, 4, 4, 0]}>
                              {progressionData.map(entry => (
                                <Cell key={entry.key} fill={PROGRESSION_COLORS[entry.key] || '#8ba7c0'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <i className="fas fa-chart-bar fa-2x mb-2 d-block" />
                          {t('admin_extra.no_progression_data')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graphique 3 — PieChart alertes */}
                  <div className="row">
                    <div className="col-md-5">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-bell mr-2 text-danger" />
                        {t('admin_extra.alerts_ia_distribution')}
                      </h5>
                      {alertePieData.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={alertePieData} dataKey="value" nameKey="name"
                              cx="50%" cy="50%" outerRadius={80}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {alertePieData.map(entry => (
                                <Cell key={entry.key} fill={ALERTE_CONFIG[entry.key]?.color || '#8ba7c0'} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ color: chartText, fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <i className="fas fa-check-circle fa-2x text-success mb-2 d-block" />
                          {t('admin_extra.no_active_alerts_chart')}
                        </div>
                      )}
                    </div>

                    {/* Résumé chiffré */}
                    <div className="col-md-7">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-table mr-2" />
                        {t('admin_extra.analyses_summary')}
                      </h5>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr><th>{t('admin_extra.col_alert_level')}</th><th>{t('admin_extra.col_analyses')}</th><th>{t('admin_extra.col_pct_total')}</th></tr>
                          </thead>
                          <tbody>
                            {Object.entries(stats?.par_niveau_alerte ?? {}).map(([k, v]) => {
                              const pct = stats.total_analyses > 0
                                ? ((v / stats.total_analyses) * 100).toFixed(1) : 0
                              return (
                                <tr key={k}>
                                  <td>
                                    <span className={`badge ${ALERTE_CONFIG[k]?.badge || 'badge-secondary'}`}>
                                      {alerteLabel(k)}
                                    </span>
                                  </td>
                                  <td className="text-center font-weight-bold">{v}</td>
                                  <td className="text-center text-muted">{pct}%</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <table className="table table-sm table-bordered mt-2">
                        <thead>
                          <tr><th>{t('admin.progression_distribution')}</th><th>{t('admin_extra.interns')}</th></tr>
                        </thead>
                        <tbody>
                          {progressionData.map(d => (
                            <tr key={d.key}>
                              <td>
                                <span className="badge" style={{
                                  background: PROGRESSION_COLORS[d.key] || '#8ba7c0',
                                  color: '#fff',
                                }}>
                                  {d.name}
                                </span>
                              </td>
                              <td className="text-center font-weight-bold">{d.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ Tab : Alertes ══ */}
              {activeTab === 'alertes' && (
                <div>
                  {statsConges?.en_attente > 0 && (
                    <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-umbrella-beach mr-2" />
                        {t('admin_extra.alert_conges', { count: statsConges.en_attente })}
                      </span>
                      <Link to="/rh/conges" className="btn btn-xs btn-warning ml-3">
                        <i className="fas fa-arrow-right mr-1" />{t('admin_extra.see_btn')}
                      </Link>
                    </div>
                  )}
                  {docsExpirants > 0 && (
                    <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-paperclip mr-2" />
                        {t('admin_extra.alert_docs', { count: docsExpirants })}
                      </span>
                      <Link to="/rh/documents" className="btn btn-xs btn-warning ml-3">
                        <i className="fas fa-arrow-right mr-1" />{t('admin_extra.see_btn')}
                      </Link>
                    </div>
                  )}
                  {sansPointageCount > 0 && (
                    <div className="alert alert-info d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-fingerprint mr-2" />
                        {t('admin_extra.alert_pointage', { count: sansPointageCount })}
                      </span>
                      <Link to="/rh/presences" className="btn btn-xs btn-info ml-3">
                        <i className="fas fa-arrow-right mr-1" />{t('admin_extra.see_btn')}
                      </Link>
                    </div>
                  )}
                  {nbInscEnAttente > 0 && (
                    <div className="alert alert-info d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-graduation-cap mr-2" />
                        {t('admin_extra.alert_insc', { count: nbInscEnAttente })}
                      </span>
                      <Link to="/rh/formations" className="btn btn-xs btn-info ml-3">
                        <i className="fas fa-arrow-right mr-1" />{t('admin_extra.see_btn')}
                      </Link>
                    </div>
                  )}
                  {(statsPaie?.bulletins_par_statut?.BROUILLON ?? 0) > 0 && (
                    <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-coins mr-2" />
                        {t('admin_extra.alert_paie', { count: statsPaie.bulletins_par_statut.BROUILLON })}
                      </span>
                      <Link to="/rh/paie" className="btn btn-xs btn-warning ml-3">
                        <i className="fas fa-arrow-right mr-1" />{t('admin_extra.see_btn')}
                      </Link>
                    </div>
                  )}
                  {statsSanctionsRH?.contestees > 0 && (
                    <div className="alert alert-danger d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-gavel mr-2" />
                        {t('admin_extra.alert_sanctions', { count: statsSanctionsRH.contestees })}
                      </span>
                      <Link to="/rh/sanctions" className="btn btn-xs btn-danger ml-3">
                        <i className="fas fa-arrow-right mr-1" />{t('admin_extra.see_btn')}
                      </Link>
                    </div>
                  )}
                  <div className="d-flex align-items-center mb-3">
                    <h5 className="m-0" style={{ color: 'var(--page-title)' }}>
                      <i className="fas fa-exclamation-triangle text-warning mr-2" />
                      {t('admin.active_alerts')} — {nbAlertesActives}
                    </h5>
                  </div>
                  {alertes.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fas fa-check-circle fa-3x text-success mb-3 d-block" />
                      <strong>{t('admin_extra.no_active_alerts_msg')}</strong>
                      <p className="mt-1">{t('admin_extra.all_good_msg')}</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover">
                        <thead>
                          <tr>
                            <th>{t('admin_extra.col_intern')}</th><th>{t('admin_extra.col_filiere')}</th><th>{t('admin_extra.col_week')}</th>
                            <th>{t('admin_extra.col_ia_score')}</th><th>{t('admin_extra.col_alert_lv')}</th><th>{t('admin_extra.col_reason')}</th><th>{t('admin_extra.col_date')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alertes.map((a, i) => {
                            const cfg = ALERTE_CONFIG[a.niveau_alerte] || ALERTE_CONFIG.AUCUNE
                            return (
                              <tr key={i} className={cfg.row}>
                                <td className="font-weight-bold">{a.stagiaire}</td>
                                <td><FiliereBadge code={a.filiere} size="sm" /></td>
                                <td className="text-center">S{a.semaine}</td>
                                <td className="text-center font-weight-bold" style={{ color: 'var(--page-title)' }}>
                                  {a.score}/100
                                </td>
                                <td><span className={`badge ${cfg.badge}`}>{alerteLabel(a.niveau_alerte)}</span></td>
                                <td className="text-sm" style={{ maxWidth: 300 }}>
                                  {a.motif || <span className="text-muted">—</span>}
                                </td>
                                <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                                  {a.date_analyse ? String(a.date_analyse).slice(0, 10) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══ Tab : Utilisateurs ══ */}
              {activeTab === 'utilisateurs' && (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="m-0" style={{ color: 'var(--page-title)' }}>
                      <i className="fas fa-users-cog mr-2" />
                      {t('admin.user_management')} — {users.length}
                    </h5>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-hover">
                      <thead>
                        <tr>
                          <th>{t('admin_extra.col_fullname')}</th><th>{t('admin_extra.col_username')}</th><th>{t('admin_extra.col_email')}</th>
                          <th>{t('admin_extra.col_filiere')}</th><th>{t('admin_extra.col_role')}</th><th>{t('admin_extra.col_status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id}>
                            <td className="font-weight-bold">
                              {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username}
                            </td>
                            <td className="text-muted text-sm">{u.username}</td>
                            <td className="text-muted text-sm">{u.email || '—'}</td>
                            <td>
                              {u.filiere
                                ? <FiliereBadge code={u.filiere} size="sm" />
                                : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              <select className="form-control form-control-sm"
                                value={u.role} disabled={updatingRole === u.id}
                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                style={{ minWidth: 120 }}>
                                {ROLE_OPTIONS.map(r => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              {u.is_active
                                ? <span className="badge badge-success"><i className="fas fa-check mr-1" />{t('common.active')}</span>
                                : <span className="badge badge-secondary"><i className="fas fa-ban mr-1" />{t('common.inactive')}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Formations & Sanctions ── */}
      {(statsFormationsRH || statsSanctionsRH) && (
        <div className="row mb-3">
          {statsFormationsRH && (
            <div className="col-md-6">
              <div className="card card-outline mb-0" style={{ borderColor: '#17a2b8', background: 'var(--card-bg)' }}>
                <div className="card-header d-flex justify-content-between align-items-center py-2">
                  <h3 className="card-title" style={{ fontSize: 13 }}>
                    <i className="fas fa-graduation-cap mr-2" style={{ color: '#17a2b8' }} />{t('admin_extra.formations_card')}
                  </h3>
                  <Link to="/rh/formations" className="btn btn-xs btn-outline-info">{t('admin_extra.manage_btn')}</Link>
                </div>
                <div className="card-body py-2">
                  <div className="row text-center">
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#17a2b8' }}>
                        {(statsFormationsRH.formations_planifiees ?? 0) + (statsFormationsRH.formations_en_cours ?? 0)}
                      </div>
                      <small className="text-muted">{t('admin_extra.active_stat')}</small>
                    </div>
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#28a745' }}>
                        {statsFormationsRH.taux_presence != null ? `${statsFormationsRH.taux_presence}%` : '—'}
                      </div>
                      <small className="text-muted">{t('admin_extra.attendance_rate_stat')}</small>
                    </div>
                    <div className="col-4">
                      <div className="font-weight-bold" style={{ fontSize: 16, color: '#E76F51' }}>
                        {statsFormationsRH.cout_total != null
                          ? `${Number(statsFormationsRH.cout_total).toLocaleString(locale)} F`
                          : '—'}
                      </div>
                      <small className="text-muted">{t('admin_extra.total_cost_stat')}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {statsSanctionsRH && (
            <div className="col-md-6">
              <div className="card card-outline mb-0" style={{ borderColor: '#dc3545', background: 'var(--card-bg)' }}>
                <div className="card-header d-flex justify-content-between align-items-center py-2">
                  <h3 className="card-title" style={{ fontSize: 13 }}>
                    <i className="fas fa-gavel mr-2" style={{ color: '#dc3545' }} />{t('admin_extra.sanctions_card')}
                  </h3>
                  <Link to="/rh/sanctions" className="btn btn-xs btn-outline-danger">{t('admin_extra.manage_btn')}</Link>
                </div>
                <div className="card-body py-2">
                  <div className="row text-center">
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#6c757d' }}>{statsSanctionsRH.total ?? '—'}</div>
                      <small className="text-muted">{t('admin_extra.total_stat')}</small>
                    </div>
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#ffc107' }}>{statsSanctionsRH.en_cours ?? '—'}</div>
                      <small className="text-muted">{t('admin_extra.ongoing_stat')}</small>
                    </div>
                    <div className="col-4">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#dc3545' }}>{statsSanctionsRH.contestees ?? '—'}</div>
                      <small className="text-muted">{t('admin_extra.contested_stat')}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Paie du mois ── */}
      {statsPaie && statsPaie.nb_bulletins > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-outline mb-0" style={{ borderColor: 'var(--acerfi-blue)', background: 'var(--card-bg)' }}>
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-coins mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                  {t('admin_extra.paie_card_prefix')} {new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                  <span className="badge badge-secondary ml-2" style={{ fontSize: 11 }}>
                    {statsPaie.nb_bulletins} bulletin{statsPaie.nb_bulletins > 1 ? 's' : ''}
                  </span>
                </h3>
                <Link to="/rh/paie" className="btn btn-xs btn-outline-primary">{t('admin_extra.manage_payroll_btn')}</Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: 'var(--acerfi-blue)' }}>
                      {Number(statsPaie.masse_nette).toLocaleString(locale)} F
                    </div>
                    <small className="text-muted">{t('admin_extra.net_mass_stat')}</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#fd7e14' }}>
                      {Number(statsPaie.total_cnps).toLocaleString(locale)} F
                    </div>
                    <small className="text-muted">{t('admin_extra.total_cnps_stat')}</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#6f42c1' }}>
                      {Number(statsPaie.total_irpp).toLocaleString(locale)} F
                    </div>
                    <small className="text-muted">{t('admin_extra.total_irpp_stat')}</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: statsPaie.bulletins_par_statut?.BROUILLON > 0 ? '#fd7e14' : '#28a745' }}>
                      {statsPaie.bulletins_par_statut?.BROUILLON ?? 0}
                    </div>
                    <small className="text-muted">
                      {(statsPaie.bulletins_par_statut?.BROUILLON ?? 0) > 0
                        ? <span style={{ color: '#fd7e14' }}>{t('admin_extra.to_validate_stat')}</span>
                        : t('admin_extra.to_validate_stat')}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Santé RH — Rapport IA ── */}
      {dernierRapportIA && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-outline mb-0" style={{ borderColor: 'var(--acerfi-blue)', background: 'var(--card-bg)' }}>
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-robot mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                  {t('admin_extra.rapport_ia_card_prefix')} {dernierRapportIA.periode}
                  {(() => {
                    const s = dernierRapportIA.score_sante_rh
                    const color = s >= 85 ? '#28A745' : s >= 70 ? '#5ba3d9' : s >= 55 ? '#FD7E14' : '#DC3545'
                    return <span className="badge ml-2" style={{ background: color, color: '#fff', fontSize: 11 }}>{Math.round(s)}/100</span>
                  })()}
                </h3>
                <Link to="/rh/rapport-ia" className="btn btn-xs btn-outline-primary">{t('admin_extra.see_report_btn')}</Link>
              </div>
              <div className="card-body py-2">
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>
                  {dernierRapportIA.resume_executif
                    ? (dernierRapportIA.resume_executif.length > 200
                        ? dernierRapportIA.resume_executif.slice(0, 200) + '…'
                        : dernierRapportIA.resume_executif)
                    : 'Rapport disponible.'}
                </p>
                <div className="d-flex" style={{ gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <i className="fas fa-exclamation-triangle mr-1 text-warning" />
                    {(dernierRapportIA.alertes_ia || []).length} alerte{(dernierRapportIA.alertes_ia || []).length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <i className="fas fa-lightbulb mr-1" style={{ color: 'var(--acerfi-blue)' }} />
                    {(dernierRapportIA.recommandations || []).length} recommandation{(dernierRapportIA.recommandations || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recrutements en cours ── */}
      {statsRecrutements && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-success card-outline mb-0">
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-user-plus mr-2" />
                  {t('admin_extra.recrutements_card')}
                </h3>
                <Link to="/rh/recrutements" className="btn btn-xs btn-outline-success">
                  {t('admin_extra.recruitment_dashboard_btn')}
                </Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#28a745' }}>
                      {statsRecrutements.publiees}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{t('admin_extra.published_offers_stat')}</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#fd7e14' }}>
                      {(statsRecrutements.par_statut_candidature?.RECUE || 0) +
                       (statsRecrutements.par_statut_candidature?.EN_COURS || 0)}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{t('admin_extra.pending_applications_stat')}</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#007bff' }}>
                      {statsRecrutements.entretiens_a_venir}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{t('admin_extra.upcoming_interviews_stat')}</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#6c757d' }}>
                      {statsRecrutements.total_candidatures}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{t('admin_extra.total_applications_stat')}</small>
                  </div>
                </div>
                {/* Alerte candidatures non traitées */}
                {(statsRecrutements.par_statut_candidature?.RECUE || 0) > 5 && (
                  <div className="alert alert-warning mt-2 mb-0 py-1 px-3" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-exclamation-triangle mr-1" />
                    {t('admin_extra.unprocessed_alert', { count: statsRecrutements.par_statut_candidature.RECUE })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
