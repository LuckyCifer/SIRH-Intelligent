import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
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

const ALERTE_CONFIG = {
  AUCUNE:  { badge: 'badge-success', row: '',             label: 'OK',      color: '#28A745' },
  FAIBLE:  { badge: 'badge-success', row: '',             label: 'Faible',  color: '#FFC107' },
  MOYENNE: { badge: 'badge-warning', row: 'table-warning', label: 'Moyenne', color: '#FD7E14' },
  ELEVEE:  { badge: 'badge-danger',  row: 'table-danger',  label: 'Élevée',  color: '#DC3545' },
}

const PROGRESSION_COLORS = {
  FAIBLE:     '#DC3545',
  MOYENNE:    '#FD7E14',
  BONNE:      '#2E74B5',
  EXCELLENTE: '#28A745',
}
const PROGRESSION_LABELS = {
  FAIBLE: 'Faible', MOYENNE: 'Moyenne', BONNE: 'Bonne', EXCELLENTE: 'Excellente',
}

const ROLE_OPTIONS = ['EMPLOYE', 'MANAGER', 'RH', 'ADMIN']
const ROLE_LABELS  = { EMPLOYE: 'Employé', MANAGER: 'Manager', RH: 'RH', ADMIN: 'Admin' }

export default function DashboardAdmin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'stats'
  const { theme } = useTheme()
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
  const [statsPaie,         setStatsPaie]         = useState(null)
  const [dernierRapportIA,  setDernierRapportIA]  = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [updatingRole,      setUpdatingRole]      = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const moisAujourdhui = new Date().toISOString().slice(0, 7)
        const [sRes, aRes, uRes, cRes, docRes, presRes, evalRes, recrutRes, formStatsRes, formInscRes, sanctStatsRes, paieStatsRes, rapportIARes] = await Promise.all([
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
      } catch {
        toast.error('Erreur lors du chargement des données admin.')
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
      toast.success('Rôle mis à jour.')
    } catch {
      toast.error('Erreur lors de la mise à jour du rôle.')
    } finally {
      setUpdatingRole(null)
    }
  }

  if (loading) {
    return (
      <AdminLayout pageTitle="Administration">
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
          <p className="mt-2 text-muted">Chargement…</p>
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
    name:  ALERTE_CONFIG[k]?.label || k,
    value: v,
    key:   k,
  }))

  const nbAlertesActives = alertes.filter(a => ['MOYENNE', 'ELEVEE'].includes(a.niveau_alerte)).length

  const TABS = [
    { key: 'stats',      icon: 'fas fa-chart-pie',           label: 'Statistiques' },
    { key: 'analyses',   icon: 'fas fa-robot',               label: 'Analyses IA' },
    { key: 'alertes',    icon: 'fas fa-exclamation-triangle', label: `Alertes (${nbAlertesActives})` },
    { key: 'utilisateurs', icon: 'fas fa-users-cog',         label: 'Utilisateurs' },
  ]

  return (
    <AdminLayout pageTitle="Tableau de bord Administration">

      {/* ── Small Boxes ── */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stats?.total_analyses ?? 0}</h3>
              <p>Analyses IA réalisées</p>
            </div>
            <div className="icon"><i className="fas fa-robot" /></div>
            <span className="small-box-footer">
              <i className="fas fa-chart-bar mr-1" />Toutes filières confondues
            </span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-primary">
            <div className="inner">
              <h3>{stats?.score_moyen_global != null ? `${stats.score_moyen_global}` : '—'}</h3>
              <p>Score moyen global / 100</p>
            </div>
            <div className="icon"><i className="fas fa-star" /></div>
            <span className="small-box-footer">
              <i className="fas fa-graduation-cap mr-1" />Toutes filières
            </span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{stats?.par_niveau_alerte?.MOYENNE ?? 0}</h3>
              <p>Alertes moyennes</p>
            </div>
            <div className="icon"><i className="fas fa-exclamation-circle" /></div>
            <span className="small-box-footer"><i className="fas fa-eye mr-1" />À surveiller</span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{stats?.par_niveau_alerte?.ELEVEE ?? 0}</h3>
              <p>Alertes élevées</p>
            </div>
            <div className="icon"><i className="fas fa-times-circle" /></div>
            <span className="small-box-footer"><i className="fas fa-bell mr-1" />Intervention requise</span>
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
                  Congés & Absences — {new Date().getFullYear()}
                </h3>
                <Link to="/rh/conges" className="btn btn-xs btn-outline-primary">
                  Gérer les congés
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
                    <small className="text-muted">Approuvés</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#2E74B5' }}>
                      {statsConges.total_jours_pris}j
                    </div>
                    <small className="text-muted">Jours pris</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#6f42c1' }}>
                      {statsConges.taux_approbation}%
                    </div>
                    <small className="text-muted">Taux approbation</small>
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
                  Évaluations de performance — période en cours
                </h3>
                <Link to="/rh/evaluations" className="btn btn-xs btn-outline-primary">
                  Tableau des évaluations
                </Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: 'var(--acerfi-blue)' }}>
                      {statsEvaluations.total}
                    </div>
                    <small className="text-muted">Évaluations</small>
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
                        Répartition par filière
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
                          Aucune donnée disponible.
                        </div>
                      )}
                    </div>

                    {/* BarChart scores par filière */}
                    <div className="col-md-7 d-flex flex-column">
                      <h5 className="text-center mb-3" style={{ color: 'var(--page-title)', fontSize: 14 }}>
                        Score IA moyen par filière
                      </h5>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barFiliereData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartText }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: chartText }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="score" name="Score moyen" radius={[4, 4, 0, 0]}>
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
                            <tr><th>Filière</th><th>Analyses</th><th>Score moyen</th><th>Alertes</th></tr>
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
                        <h5 style={{ color: 'var(--page-title)', fontSize: 14 }}>Répartition des alertes</h5>
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
                        Évolution du score moyen global semaine par semaine
                      </h5>
                      {evolutionData.length >= 2 ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart data={evolutionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="semaine" tickFormatter={v => `S${v}`}
                              tick={{ fontSize: 12, fill: chartText }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: chartText }} />
                            <Tooltip
                              formatter={v => [`${v}/100`, 'Score moyen']}
                              labelFormatter={l => `Semaine ${l}`}
                              contentStyle={tooltipStyle}
                            />
                            <ReferenceLine y={60} stroke="#FD7E14" strokeDasharray="6 3"
                              label={{ value: 'Seuil 60', fill: '#FD7E14', fontSize: 11 }} />
                            <Line type="monotone" dataKey="score_moyen" name="Score moyen"
                              stroke="#2E74B5" strokeWidth={2}
                              dot={{ r: 4, fill: '#2E74B5' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <i className="fas fa-chart-line fa-2x mb-2 d-block" />
                          Pas assez de données (minimum 2 semaines).
                        </div>
                      )}
                    </div>

                    {/* Graphique 2 — Répartition progression */}
                    <div className="col-lg-5">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-chart-bar mr-2" style={{ color: '#6f42c1' }} />
                        Répartition des niveaux de progression
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
                            <Bar dataKey="value" name="Stagiaires" radius={[0, 4, 4, 0]}>
                              {progressionData.map(entry => (
                                <Cell key={entry.key} fill={PROGRESSION_COLORS[entry.key] || '#8ba7c0'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <i className="fas fa-chart-bar fa-2x mb-2 d-block" />
                          Aucune donnée de progression.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graphique 3 — PieChart alertes */}
                  <div className="row">
                    <div className="col-md-5">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-bell mr-2 text-danger" />
                        Répartition des alertes IA
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
                          Aucune alerte active.
                        </div>
                      )}
                    </div>

                    {/* Résumé chiffré */}
                    <div className="col-md-7">
                      <h5 style={{ color: 'var(--page-title)', fontSize: 14, marginBottom: 12 }}>
                        <i className="fas fa-table mr-2" />
                        Résumé des analyses
                      </h5>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr><th>Niveau d'alerte</th><th>Analyses</th><th>% du total</th></tr>
                          </thead>
                          <tbody>
                            {Object.entries(stats?.par_niveau_alerte ?? {}).map(([k, v]) => {
                              const pct = stats.total_analyses > 0
                                ? ((v / stats.total_analyses) * 100).toFixed(1) : 0
                              return (
                                <tr key={k}>
                                  <td>
                                    <span className={`badge ${ALERTE_CONFIG[k]?.badge || 'badge-secondary'}`}>
                                      {ALERTE_CONFIG[k]?.label || k}
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
                          <tr><th>Progression</th><th>Stagiaires</th></tr>
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
                        <strong>{statsConges.en_attente}</strong> demande{statsConges.en_attente > 1 ? 's' : ''} de congé en attente de validation
                      </span>
                      <Link to="/rh/conges" className="btn btn-xs btn-warning ml-3">
                        <i className="fas fa-arrow-right mr-1" />Voir
                      </Link>
                    </div>
                  )}
                  {docsExpirants > 0 && (
                    <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-paperclip mr-2" />
                        <strong>{docsExpirants}</strong> document{docsExpirants > 1 ? 's' : ''} expir{docsExpirants > 1 ? 'ant' : 'ant'} dans moins de 30 jours
                      </span>
                      <Link to="/rh/documents" className="btn btn-xs btn-warning ml-3">
                        <i className="fas fa-arrow-right mr-1" />Voir
                      </Link>
                    </div>
                  )}
                  {sansPointageCount > 0 && (
                    <div className="alert alert-info d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-fingerprint mr-2" />
                        <strong>{sansPointageCount}</strong> employé{sansPointageCount > 1 ? 's' : ''} sans aucun pointage ce mois
                      </span>
                      <Link to="/rh/presences" className="btn btn-xs btn-info ml-3">
                        <i className="fas fa-arrow-right mr-1" />Voir
                      </Link>
                    </div>
                  )}
                  {nbInscEnAttente > 0 && (
                    <div className="alert alert-info d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-graduation-cap mr-2" />
                        <strong>{nbInscEnAttente}</strong> inscription{nbInscEnAttente > 1 ? 's' : ''} en formation en attente de validation
                      </span>
                      <Link to="/rh/formations" className="btn btn-xs btn-info ml-3">
                        <i className="fas fa-arrow-right mr-1" />Voir
                      </Link>
                    </div>
                  )}
                  {(statsPaie?.bulletins_par_statut?.BROUILLON ?? 0) > 0 && (
                    <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-coins mr-2" />
                        <strong>{statsPaie.bulletins_par_statut.BROUILLON}</strong> bulletin{statsPaie.bulletins_par_statut.BROUILLON > 1 ? 's' : ''} de paie en attente de validation ce mois
                      </span>
                      <Link to="/rh/paie" className="btn btn-xs btn-warning ml-3">
                        <i className="fas fa-arrow-right mr-1" />Voir
                      </Link>
                    </div>
                  )}
                  {statsSanctionsRH?.contestees > 0 && (
                    <div className="alert alert-danger d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                      <span>
                        <i className="fas fa-gavel mr-2" />
                        <strong>{statsSanctionsRH.contestees}</strong> sanction{statsSanctionsRH.contestees > 1 ? 's' : ''} contestée{statsSanctionsRH.contestees > 1 ? 's' : ''} — nécessite{statsSanctionsRH.contestees > 1 ? 'nt' : ''} une révision
                      </span>
                      <Link to="/rh/sanctions" className="btn btn-xs btn-danger ml-3">
                        <i className="fas fa-arrow-right mr-1" />Voir
                      </Link>
                    </div>
                  )}
                  <div className="d-flex align-items-center mb-3">
                    <h5 className="m-0" style={{ color: 'var(--page-title)' }}>
                      <i className="fas fa-exclamation-triangle text-warning mr-2" />
                      Alertes actives — {nbAlertesActives} stagiaire{nbAlertesActives !== 1 ? 's' : ''} concerné{nbAlertesActives !== 1 ? 's' : ''}
                    </h5>
                  </div>
                  {alertes.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fas fa-check-circle fa-3x text-success mb-3 d-block" />
                      <strong>Aucune alerte active !</strong>
                      <p className="mt-1">Tous les stagiaires sont en bonne progression.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover">
                        <thead>
                          <tr>
                            <th>Stagiaire</th><th>Filière</th><th>Semaine</th>
                            <th>Score IA</th><th>Niveau alerte</th><th>Motif</th><th>Date</th>
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
                                <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
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
                      Gestion des comptes — {users.length} utilisateur{users.length !== 1 ? 's' : ''}
                    </h5>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Nom complet</th><th>Identifiant</th><th>Email</th>
                          <th>Filière</th><th>Rôle</th><th>Statut</th>
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
                                ? <span className="badge badge-success"><i className="fas fa-check mr-1" />Actif</span>
                                : <span className="badge badge-secondary"><i className="fas fa-ban mr-1" />Inactif</span>}
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
                    <i className="fas fa-graduation-cap mr-2" style={{ color: '#17a2b8' }} />Formations
                  </h3>
                  <Link to="/rh/formations" className="btn btn-xs btn-outline-info">Gérer</Link>
                </div>
                <div className="card-body py-2">
                  <div className="row text-center">
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#17a2b8' }}>
                        {(statsFormationsRH.formations_planifiees ?? 0) + (statsFormationsRH.formations_en_cours ?? 0)}
                      </div>
                      <small className="text-muted">Actives</small>
                    </div>
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#28a745' }}>
                        {statsFormationsRH.taux_presence != null ? `${statsFormationsRH.taux_presence}%` : '—'}
                      </div>
                      <small className="text-muted">Taux présence</small>
                    </div>
                    <div className="col-4">
                      <div className="font-weight-bold" style={{ fontSize: 16, color: '#E76F51' }}>
                        {statsFormationsRH.cout_total != null
                          ? `${Number(statsFormationsRH.cout_total).toLocaleString('fr-FR')} F`
                          : '—'}
                      </div>
                      <small className="text-muted">Coût total</small>
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
                    <i className="fas fa-gavel mr-2" style={{ color: '#dc3545' }} />Sanctions disciplinaires
                  </h3>
                  <Link to="/rh/sanctions" className="btn btn-xs btn-outline-danger">Gérer</Link>
                </div>
                <div className="card-body py-2">
                  <div className="row text-center">
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#6c757d' }}>{statsSanctionsRH.total ?? '—'}</div>
                      <small className="text-muted">Total</small>
                    </div>
                    <div className="col-4 border-right">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#ffc107' }}>{statsSanctionsRH.en_cours ?? '—'}</div>
                      <small className="text-muted">En cours</small>
                    </div>
                    <div className="col-4">
                      <div className="font-weight-bold" style={{ fontSize: 18, color: '#dc3545' }}>{statsSanctionsRH.contestees ?? '—'}</div>
                      <small className="text-muted">Contestées</small>
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
                  Paie — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  <span className="badge badge-secondary ml-2" style={{ fontSize: 11 }}>
                    {statsPaie.nb_bulletins} bulletin{statsPaie.nb_bulletins > 1 ? 's' : ''}
                  </span>
                </h3>
                <Link to="/rh/paie" className="btn btn-xs btn-outline-primary">Gérer la paie</Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: 'var(--acerfi-blue)' }}>
                      {Number(statsPaie.masse_nette).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">Masse nette</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#fd7e14' }}>
                      {Number(statsPaie.total_cnps).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">Total CNPS</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#6f42c1' }}>
                      {Number(statsPaie.total_irpp).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">Total IRPP</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: statsPaie.bulletins_par_statut?.BROUILLON > 0 ? '#fd7e14' : '#28a745' }}>
                      {statsPaie.bulletins_par_statut?.BROUILLON ?? 0}
                    </div>
                    <small className="text-muted">
                      {(statsPaie.bulletins_par_statut?.BROUILLON ?? 0) > 0
                        ? <span style={{ color: '#fd7e14' }}>À valider</span>
                        : 'À valider'}
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
                  Santé RH — Rapport IA {dernierRapportIA.periode}
                  {(() => {
                    const s = dernierRapportIA.score_sante_rh
                    const color = s >= 85 ? '#28A745' : s >= 70 ? '#5ba3d9' : s >= 55 ? '#FD7E14' : '#DC3545'
                    return <span className="badge ml-2" style={{ background: color, color: '#fff', fontSize: 11 }}>{Math.round(s)}/100</span>
                  })()}
                </h3>
                <Link to="/rh/rapport-ia" className="btn btn-xs btn-outline-primary">Voir le rapport</Link>
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
                  Recrutements en cours
                </h3>
                <Link to="/rh/recrutements" className="btn btn-xs btn-outline-success">
                  Tableau de bord recrutement
                </Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#28a745' }}>
                      {statsRecrutements.publiees}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Offres publiées</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#fd7e14' }}>
                      {(statsRecrutements.par_statut_candidature?.RECUE || 0) +
                       (statsRecrutements.par_statut_candidature?.EN_COURS || 0)}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Candidatures en attente</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#007bff' }}>
                      {statsRecrutements.entretiens_a_venir}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Entretiens à venir</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 20, color: '#6c757d' }}>
                      {statsRecrutements.total_candidatures}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Candidatures totales</small>
                  </div>
                </div>
                {/* Alerte candidatures non traitées */}
                {(statsRecrutements.par_statut_candidature?.RECUE || 0) > 5 && (
                  <div className="alert alert-warning mt-2 mb-0 py-1 px-3" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-exclamation-triangle mr-1" />
                    <strong>{statsRecrutements.par_statut_candidature.RECUE} candidatures</strong> non traitées — pensez à les examiner.
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
