import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import JaugeCirculaire from '../../components/ui/JaugeCirculaire'
import { getRapports, soumettreRapport, getMesStats } from '../../api/rapports'

export default function MesRapports() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rapports, setRapports] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(null)

  const STATUT_CONFIG = {
    BROUILLON: { badge: 'badge-secondary', label: t('stagiaire.status_draft'),    icon: 'fas fa-pencil-alt' },
    SOUMIS:    { badge: 'badge-primary',   label: t('stagiaire.status_submitted'), icon: 'fas fa-clock' },
    VALIDE:    { badge: 'badge-success',   label: t('stagiaire.status_validated'), icon: 'fas fa-check-circle' },
    REJETE:    { badge: 'badge-danger',    label: t('stagiaire.status_rejected'),  icon: 'fas fa-times-circle' },
  }

  async function load() {
    try {
      const [rRes, sRes] = await Promise.all([getRapports(), getMesStats()])
      setRapports(rRes.data.results ?? rRes.data)
      setStats(sRes.data)
    } catch (err) {
      console.error('[MesRapports] load error:', err)
      toast.error(t('stagiaire.load_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSoumettre(id) {
    if (!window.confirm(t('stagiaire.submit_confirm'))) return
    setSubmitting(id)
    try {
      await soumettreRapport(id)
      toast.success(t('stagiaire.submit_success'))
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || t('stagiaire.submit_error'))
    } finally {
      setSubmitting(null)
    }
  }

  const semaineDejaCouverte = stats?.dernier_rapport_semaine
  const semaineCourante = semaineDejaCouverte ? semaineDejaCouverte + 1 : 1
  const rapportSemaineCourante = rapports.find(r => r.semaine_numero === semaineCourante)

  if (loading) {
    return (
      <StagiaireLayout pageTitle={t('stagiaire.my_weekly_reports')} breadcrumb={null}>
        <Spinner message={t('stagiaire.report_loading')} />
      </StagiaireLayout>
    )
  }

  return (
    <StagiaireLayout pageTitle={t('stagiaire.my_weekly_reports')}>

      {/* En-tête */}
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <span className="text-muted" style={{ fontSize: 13 }}>
              {rapports.length} rapport{rapports.length !== 1 ? 's' : ''} au total
              {stats && ` · ${stats.valides} validé${stats.valides !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div>
            {rapportSemaineCourante ? (
              <span className="badge badge-warning p-2">
                <i className="fas fa-info-circle mr-1" />
                {t('stagiaire.week_already_saved', { n: semaineCourante })}
              </span>
            ) : (
              <Link to="/employe/rapports/nouveau" className="btn btn-primary">
                <i className="fas fa-plus-circle mr-2" />
                {t('stagiaire.write_report')} (S{semaineCourante})
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-file-alt mr-2" />
            {t('stagiaire.my_weekly_reports')}
          </h3>
        </div>
        <div className="card-body p-0">
          {rapports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-inbox fa-3x mb-3 d-block" />
              <h5>{t('stagiaire.no_reports_yet')}</h5>
              <p>{t('stagiaire.no_reports_hint')}</p>
              <Link to="/employe/rapports/nouveau" className="btn btn-primary mt-2">
                <i className="fas fa-plus-circle mr-2" />
                {t('stagiaire.start_week1')}
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>{t('stagiaire.col_week')}</th>
                    <th>{t('stagiaire.col_period')}</th>
                    <th style={{ width: 120 }}>{t('stagiaire.col_status')}</th>
                    <th style={{ width: 120 }}>{t('stagiaire.col_ia_score')}</th>
                    <th>{t('stagiaire.col_supervisor_comment')}</th>
                    <th style={{ width: 200, textAlign: 'center' }}>{t('stagiaire.col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rapports.map(r => {
                    const cfg = STATUT_CONFIG[r.statut] || STATUT_CONFIG.BROUILLON
                    return (
                      <tr key={r.id}>
                        <td className="text-center font-weight-bold align-middle">
                          S{r.semaine_numero}
                        </td>
                        <td className="text-sm align-middle" style={{ color: 'var(--text-secondary)' }}>
                          {r.date_debut_semaine}<br />
                          <small>→ {r.date_fin_semaine}</small>
                        </td>
                        <td className="align-middle">
                          <span className={`badge ${cfg.badge}`}>
                            <i className={`${cfg.icon} mr-1`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          {r.analyse ? (
                            <JaugeCirculaire score={r.analyse.score_engagement} size="sm" />
                          ) : r.statut === 'SOUMIS' ? (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              <i className="fas fa-spinner fa-spin mr-1" />
                              {t('stagiaire.ia_in_progress')}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="align-middle" style={{ fontSize: 12, maxWidth: 220 }}>
                          {r.commentaire_encadreur ? (
                            <span style={{ color: 'var(--text-secondary)' }}>
                              <i className="fas fa-comment-alt mr-1" style={{ color: 'var(--acerfi-blue)' }} />
                              {r.commentaire_encadreur}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center align-middle">
                          <div className="btn-group btn-group-sm">
                            <Link to={`/employe/rapports/${r.id}`}
                              className="btn btn-outline-secondary" title={t('stagiaire.view_btn')}>
                              <i className="fas fa-eye" />
                            </Link>
                            {r.statut === 'BROUILLON' && (
                              <Link to={`/employe/rapports/${r.id}/edit`}
                                className="btn btn-outline-primary" title={t('stagiaire.edit_btn')}>
                                <i className="fas fa-edit" />
                              </Link>
                            )}
                            {r.statut === 'BROUILLON' && (
                              <button
                                className="btn btn-primary"
                                disabled={submitting === r.id}
                                onClick={() => handleSoumettre(r.id)}
                                title={t('stagiaire.submit_btn')}>
                                {submitting === r.id
                                  ? <i className="fas fa-spinner fa-spin" />
                                  : <><i className="fas fa-paper-plane mr-1" />{t('stagiaire.submit_btn')}</>}
                              </button>
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

    </StagiaireLayout>
  )
}
