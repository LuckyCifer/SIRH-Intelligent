import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import { getDetailStagiaire } from '../../api/encadreur'
import FiliereBadge from '../../components/ui/FiliereBadge'
import { getFiliere } from '../../constants/filieres'
import useAuthStore from '../../store/authStore'
import { getTimelineEmploye } from '../../api/carriere'
import { getInscriptions } from '../../api/formations'
import { getSanctions } from '../../api/sanctions'

const TYPE_COULEUR_CARRIERE = {
  EMBAUCHE: '#28a745', PROMOTION: '#007bff', MUTATION: '#fd7e14',
  CHANGEMENT_POSTE: '#6f42c1', AUGMENTATION: '#20c997', FORMATION: '#17a2b8',
  CONGE_LONG: '#6c757d', AVERTISSEMENT: '#dc3545', FELICITATION: '#ffc107',
DEPART: '#343a40', AUTRE: '#adb5bd',
}

export default function DetailStagiaire() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'

  const STATUT_BADGE = {
    BROUILLON: { cls: 'badge-secondary', label: t('encadreur.status_draft') },
    SOUMIS:    { cls: 'badge-primary',   label: t('encadreur.status_submitted') },
    VALIDE:    { cls: 'badge-success',   label: t('encadreur.status_validated') },
    REJETE:    { cls: 'badge-danger',    label: t('encadreur.status_rejected') },
  }

  const ALERTE_BADGE = {
    AUCUNE:  { cls: 'badge-success',  label: t('encadreur.alert_none_full') },
    FAIBLE:  { cls: 'badge-success',  label: t('encadreur.alert_low') },
    MOYENNE: { cls: 'badge-warning',  label: t('encadreur.alert_medium') },
    ELEVEE:  { cls: 'badge-danger',   label: t('encadreur.alert_high') },
  }

  const STATUT_PERIODE = {
    EN_COURS:  { cls: 'badge-primary',   label: t('encadreur.period_ongoing') },
    TERMINE:   { cls: 'badge-secondary', label: t('encadreur.period_done') },
    ABANDONNE: { cls: 'badge-danger',    label: t('encadreur.period_abandoned') },
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isRH = user?.role === 'RH' || user?.role === 'ADMIN'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rapports')
  const [carriere, setCarriere] = useState([])
  const [carriereLoading, setCarriereLoading] = useState(false)
  const [formationsEmploye, setFormationsEmploye] = useState([])
  const [formationsLoading, setFormationsLoading] = useState(false)
  const [sanctionsEmploye, setSanctionsEmploye] = useState([])
  const [sanctionsLoading, setSanctionsLoading] = useState(false)

  useEffect(() => {
    getDetailStagiaire(id)
      .then(r => setData(r.data))
      .catch(err => {
        toast.error(t('encadreur.load_error_fiche'))
        if (err.response?.status === 403) navigate('/manager/employes')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <EncadreurLayout pageTitle={t('encadreur.detail_page_loading')}>
        <Spinner message={t('encadreur.detail_page_loading')} />
      </EncadreurLayout>
    )
  }

  useEffect(() => {
    if (activeTab === 'carriere' && carriere.length === 0) {
      setCarriereLoading(true)
      getTimelineEmploye(id)
        .then((r) => setCarriere(r.data))
        .catch(() => {})
        .finally(() => setCarriereLoading(false))
    }
    if (activeTab === 'formations' && formationsEmploye.length === 0) {
      setFormationsLoading(true)
      getInscriptions({ employe: id })
        .then((r) => setFormationsEmploye(r.data.results ?? r.data))
        .catch(() => {})
        .finally(() => setFormationsLoading(false))
    }
    if (activeTab === 'sanctions' && sanctionsEmploye.length === 0 && isRH) {
      setSanctionsLoading(true)
      getSanctions({ employe: id })
        .then((r) => setSanctionsEmploye(r.data.results ?? r.data))
        .catch(() => {})
        .finally(() => setSanctionsLoading(false))
    }
  }, [activeTab])

  if (!data) return null

  const filiereColor = getFiliere(data.filiere).couleur
  const rapports     = data.rapports || []
  const evolutionIA  = data.evolution_ia || []
  const initial      = (data.nom_complet || data.username)[0].toUpperCase()

  return (
    <EncadreurLayout pageTitle={`Fiche — ${data.nom_complet}`}>

      {/* En-tête */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: filiereColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 26, marginRight: 20,
            }}>
              {initial}
            </div>
            <div className="flex-grow-1">
              <h4 className="mb-1" style={{ color: 'var(--page-title)' }}>{data.nom_complet}</h4>
              <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                <FiliereBadge code={data.filiere} />
                <span className="text-muted" style={{ fontSize: 13 }}>
                  <i className="fas fa-user mr-1" />{data.username}
                </span>
                {data.email && (
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    <i className="fas fa-envelope mr-1" />{data.email}
                  </span>
                )}
                {data.telephone && (
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    <i className="fas fa-phone mr-1" />{data.telephone}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto">
              {data.periode && (
                <div className="text-right">
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('encadreur.internship_period')}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fmtDate(data.periode.date_debut)} → {fmtDate(data.periode.date_fin)}
                  </div>
                  <span className={`badge ${STATUT_PERIODE[data.periode.statut]?.cls || 'badge-primary'}`}>
                    {STATUT_PERIODE[data.periode.statut]?.label || data.periode.statut}
                  </span>
                  <span className="badge badge-secondary ml-1">
                    {data.periode.duree_semaines} sem.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projet de soutenance */}
      {data.projet && (
        <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
          <i className="fas fa-bullseye mr-2" />
          <strong>{t('encadreur.project_label')}</strong> {data.projet.theme}
          <span className="badge badge-info ml-2">{data.projet.statut}</span>
          {data.projet.date_soutenance && (
            <span className="ml-2 text-muted">
              <i className="fas fa-calendar mr-1" />{t('encadreur.defense_date')} {fmtDate(data.projet.date_soutenance)}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-0">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'rapports' ? 'active' : ''}`}
            onClick={() => setActiveTab('rapports')}>
            <i className="fas fa-file-alt mr-2" />
            {t('encadreur.tab_reports')}
            <span className="badge badge-secondary ml-2">{rapports.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'ia' ? 'active' : ''}`}
            onClick={() => setActiveTab('ia')}>
            <i className="fas fa-robot mr-2" />
            {t('encadreur.tab_ia')}
            <span className="badge badge-secondary ml-2">{evolutionIA.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'carriere' ? 'active' : ''}`}
            onClick={() => setActiveTab('carriere')}>
            <i className="fas fa-stream mr-2" />
            {t('encadreur.tab_career')}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'formations' ? 'active' : ''}`}
            onClick={() => setActiveTab('formations')}>
            <i className="fas fa-graduation-cap mr-2" />
            {t('encadreur.tab_trainings')}
          </button>
        </li>
        {isRH && (
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'sanctions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sanctions')}>
              <i className="fas fa-gavel mr-2" />
              {t('encadreur.tab_sanctions')}
            </button>
          </li>
        )}
      </ul>

      {/* Onglet Rapports */}
      {activeTab === 'rapports' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <div className="card-body p-0">
            {rapports.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-inbox fa-2x mb-2 d-block" />
                {t('encadreur.no_reports_submitted')}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{t('encadreur.col_week')}</th>
                      <th>{t('encadreur.col_period')}</th>
                      <th>{t('encadreur.col_status')}</th>
                      <th>{t('encadreur.col_ia_score')}</th>
                      <th>{t('encadreur.col_alert')}</th>
                      <th>{t('encadreur.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapports.map(r => {
                      const sB = STATUT_BADGE[r.statut] || STATUT_BADGE.BROUILLON
                      const aB = ALERTE_BADGE[r.analyse?.niveau_alerte] || ALERTE_BADGE.AUCUNE
                      return (
                        <tr key={r.id}>
                          <td className="font-weight-bold text-center">S{r.semaine_numero}</td>
                          <td className="text-sm text-muted" style={{ fontSize: 12 }}>
                            {r.date_debut_semaine} → {r.date_fin_semaine}
                          </td>
                          <td><span className={`badge ${sB.cls}`}>{sB.label}</span></td>
                          <td className="text-center">
                            {r.analyse
                              ? <span className="font-weight-bold">{r.analyse.score_engagement}/100</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {r.analyse
                              ? <span className={`badge ${aB.cls}`}>{aB.label}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link to={`/encadreur/rapports/${r.id}/valider`}
                                className="btn btn-outline-secondary" style={{ fontSize: 11 }}>
                                <i className="fas fa-eye mr-1" />{t('encadreur.read_btn')}
                              </Link>
                              {r.statut === 'SOUMIS' && (
                                <Link to={`/encadreur/rapports/${r.id}/valider`}
                                  className="btn btn-warning" style={{ fontSize: 11 }}>
                                  <i className="fas fa-gavel mr-1" />{t('encadreur.validate_report_btn')}
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Évolution IA */}
      {activeTab === 'ia' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <div className="card-body">
            {evolutionIA.length < 2 ? (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-chart-line fa-2x mb-2 d-block" />
                {t('encadreur.not_enough_data')}
                <br />
                <small>{t('encadreur.min_reports_needed')}</small>
              </div>
            ) : (
              <>
                <h6 style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                  <i className="fas fa-robot mr-2" />
                  {t('encadreur.ia_evolution_title')}
                </h6>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolutionIA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="semaine" tickFormatter={v => `S${v}`}
                      tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                    <Tooltip
                      formatter={(v) => [`${v}/100`, 'Score IA']}
                      labelFormatter={l => `Semaine ${l}`}
                      contentStyle={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={60} stroke="#fd7e14" strokeDasharray="6 3"
                      label={{ value: 'Seuil 60', fill: '#fd7e14', fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" name="Score IA" stroke="#2E74B5"
                      strokeWidth={2} dot={{ r: 4, fill: '#2E74B5' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      )}

      {/* Onglet Carrière */}
      {activeTab === 'carriere' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 style={{ color: 'var(--text-primary)', margin: 0 }}>
                <i className="fas fa-stream mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                {t('encadreur.career_history')}
              </h6>
              {isRH && (
                <Link to={`/rh/employes/${id}/carriere`} className="btn btn-primary btn-sm">
                  <i className="fas fa-external-link-alt mr-1" /> {t('encadreur.manage_career')}
                </Link>
              )}
            </div>

            {carriereLoading ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
              </div>
            ) : carriere.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-history fa-2x mb-2 d-block" />
                {t('encadreur.no_career_events')}
                {isRH && (
                  <div className="mt-2">
                    <Link to={`/rh/employes/${id}/carriere`} className="btn btn-outline-primary btn-sm">
                      <i className="fas fa-plus mr-1" /> {t('encadreur.add_first_event')}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="timeline timeline-inverse">
                {carriere.map((ev) => {
                  const couleur = TYPE_COULEUR_CARRIERE[ev.type_evenement] || '#adb5bd'
                  return (
                    <div key={ev.id}>
                      <i className="fas fa-circle" style={{ color: couleur }} />
                      <div className="timeline-item">
                        <span className="time" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(ev.date_evenement).toLocaleDateString(locale, {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                        <h3 className="timeline-header" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                          <span className="badge mr-2" style={{ background: couleur, color: '#fff', fontSize: '0.72rem' }}>
                            {ev.type_display}
                          </span>
                          {ev.titre}
                        </h3>
                        {ev.description && (
                          <div className="timeline-body" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)', borderColor: 'var(--border-color)', fontSize: '0.85rem' }}>
                            {ev.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div><i className="fas fa-clock bg-gray" /></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Formations */}
      {activeTab === 'formations' && (
        <div className="card" style={{ borderTopLeftRadius: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="card-body p-0">
            {formationsLoading ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
              </div>
            ) : formationsEmploye.length === 0 ? (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                <i className="fas fa-graduation-cap fa-2x mb-2 d-block" />
                {t('encadreur.no_trainings')}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <th>{t('encadreur.training_col_name')}</th>
                      <th>{t('encadreur.training_col_category')}</th>
                      <th>{t('encadreur.training_col_date')}</th>
                      <th>{t('encadreur.training_col_status')}</th>
                      <th>{t('encadreur.training_col_grade')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formationsEmploye.map(i => (
                      <tr key={i.id} style={{ color: 'var(--text-primary)' }}>
                        <td style={{ fontWeight: 600 }}>{i.formation_detail?.titre}</td>
                        <td style={{ fontSize: '0.8rem' }}>{i.formation_detail?.categorie_detail?.nom}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {i.formation_detail?.date_debut
                            ? new Date(i.formation_detail.date_debut).toLocaleDateString(locale)
                            : '—'}
                        </td>
                        <td>
                          <span className={`badge badge-${
                            i.statut === 'PRESENT' ? 'success' : i.statut === 'INSCRIT' ? 'primary'
                            : i.statut === 'EN_ATTENTE' ? 'warning' : 'secondary'
                          }`}>{i.statut_display}</span>
                        </td>
                        <td>
                          {i.note_formation
                            ? <span>{Array.from({length: 5}, (_, k) => <i key={k} className={k < i.note_formation ? 'fas fa-star' : 'far fa-star'} style={{ color: '#ffc107', fontSize: 11 }} />)}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Sanctions (RH/ADMIN seulement) */}
      {activeTab === 'sanctions' && isRH && (
        <div className="card" style={{ borderTopLeftRadius: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="card-body p-0">
            {sanctionsLoading ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
              </div>
            ) : sanctionsEmploye.length === 0 ? (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                <i className="fas fa-shield-alt fa-2x mb-2 d-block" style={{ color: '#28a745' }} />
                {t('encadreur.no_sanctions')}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <th>{t('encadreur.sanction_col_type')}</th>
                      <th>{t('encadreur.sanction_col_reason')}</th>
                      <th>{t('encadreur.sanction_col_date')}</th>
                      <th>{t('encadreur.sanction_col_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sanctionsEmploye.map(s => (
                      <tr key={s.id} style={{ color: 'var(--text-primary)' }}>
                        <td style={{ fontSize: '0.82rem' }}>{s.type_sanction_display}</td>
                        <td style={{ fontSize: '0.82rem' }}>{s.motif}</td>
                        <td style={{ fontSize: '0.82rem' }}>{new Date(s.date_sanction).toLocaleDateString(locale)}</td>
                        <td>
                          <span className={`badge badge-${
                            s.statut === 'CONTESTEE' ? 'danger' : s.statut === 'ACCEPTEE' ? 'success'
                            : s.statut === 'NOTIFIEE' ? 'warning' : 'secondary'
                          }`}>{s.statut_display}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {isRH && (
            <div className="card-footer py-2" style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)' }}>
              <Link to="/rh/sanctions/nouveau" className="btn btn-sm btn-outline-danger">
                <i className="fas fa-plus mr-1" />{t('encadreur.add_sanction')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Bouton retour */}
      <div className="mt-3">
        <Link to="/manager/employes" className="btn btn-sm btn-outline-secondary">
          <i className="fas fa-arrow-left mr-1" />{t('encadreur.back_to_list')}
        </Link>
      </div>

    </EncadreurLayout>
  )
}
