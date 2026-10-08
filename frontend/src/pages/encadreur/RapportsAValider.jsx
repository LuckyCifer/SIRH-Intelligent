import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import { getRapportsAValider } from '../../api/encadreur'

const ALERTE_CLS = {
  AUCUNE:  'badge-success',
  FAIBLE:  'badge-success',
  MOYENNE: 'badge-warning',
  ELEVEE:  'badge-danger',
}
const ALERTE_ICON = {
  AUCUNE:  'fas fa-check-circle text-success',
  FAIBLE:  'fas fa-check-circle text-success',
  MOYENNE: 'fas fa-exclamation-circle text-warning',
  ELEVEE:  'fas fa-exclamation-triangle text-danger',
}

export default function RapportsAValider() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const [rapports, setRapports] = useState([])
  const [loading, setLoading]   = useState(true)

  const ALERTE_LABEL = {
    AUCUNE:  t('encadreur.alert_none_full'),
    FAIBLE:  t('encadreur.alert_low'),
    MOYENNE: t('encadreur.alert_medium'),
    ELEVEE:  t('encadreur.alert_high'),
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function tempsDepuis(dateStr) {
    if (!dateStr) return null
    const diff  = Date.now() - new Date(dateStr).getTime()
    const jours  = Math.floor(diff / 86400000)
    const heures = Math.floor(diff / 3600000)
    if (jours >= 1) return jours === 1
      ? t('encadreur.time_days', { n: jours })
      : t('encadreur.time_days_plural', { n: jours })
    if (heures >= 1) return heures === 1
      ? t('encadreur.time_hours', { n: heures })
      : t('encadreur.time_hours_plural', { n: heures })
    return t('encadreur.time_instant')
  }

  function load() {
    setLoading(true)
    getRapportsAValider()
      .then(r => {
        const data = r.data.results ?? r.data
        const sorted = [...data].sort((a, b) =>
          new Date(a.date_soumission || 0) - new Date(b.date_soumission || 0)
        )
        setRapports(sorted)
      })
      .catch(() => toast.error(t('encadreur.load_error_rapport')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <EncadreurLayout pageTitle={t('encadreur.reports_to_validate')}>
        <Spinner message={t('encadreur.loading_pending')} />
      </EncadreurLayout>
    )
  }

  return (
    <EncadreurLayout pageTitle={t('encadreur.reports_to_validate')}>

      <div className="row mb-3">
        <div className="col-12">
          {rapports.length > 0 ? (
            <div className="alert alert-warning py-2 mb-0" style={{ fontSize: 13 }}>
              <i className="fas fa-hourglass-half mr-2" />
              <strong>{rapports.length}</strong>{' '}
              {rapports.length > 1
                ? t('encadreur.n_pending_plural', { count: rapports.length })
                : t('encadreur.n_pending', { count: rapports.length })}
            </div>
          ) : (
            <div className="alert alert-success py-2 mb-0" style={{ fontSize: 13 }}>
              <i className="fas fa-check-circle mr-2" />
              <strong>{t('encadreur.all_done')}</strong> {t('encadreur.all_done_sub')}
            </div>
          )}
        </div>
      </div>

      {rapports.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-check-double fa-4x mb-3 text-success d-block" />
          <h5 style={{ color: 'var(--text-primary)' }}>{t('encadreur.no_pending_title')}</h5>
          <p className="text-muted">{t('encadreur.no_pending_sub')}</p>
          <Link to="/manager/dashboard" className="btn btn-outline-primary">
            <i className="fas fa-home mr-1" />{t('encadreur.back_to_dashboard')}
          </Link>
        </div>
      ) : (
        <div className="row">
          {rapports.map(r => {
            const niveauAlerte = r.analyse?.niveau_alerte || 'AUCUNE'
            const alerteCls  = ALERTE_CLS[niveauAlerte] || 'badge-secondary'
            const alerteIcon = ALERTE_ICON[niveauAlerte]
            const alerteLbl  = ALERTE_LABEL[niveauAlerte] || niveauAlerte
            const stagiaire  = r.stagiaire_detail || {}
            return (
              <div className="col-lg-6" key={r.id}>
                <div className="card mb-3 card-primary card-outline">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="font-weight-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                          <i className="fas fa-user-graduate mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                          {stagiaire.full_name || stagiaire.username || `Stagiaire #${r.stagiaire}`}
                        </div>
                        <small className="text-muted">
                          <span className="badge badge-info mr-1">{stagiaire.filiere || '—'}</span>
                          {stagiaire.username}
                        </small>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: 13 }}>
                        {t('encadreur.week_label', { n: r.semaine_numero })}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <i className="fas fa-calendar-week mr-1" />
                      Du <strong>{fmtDate(r.date_debut_semaine)}</strong> au <strong>{fmtDate(r.date_fin_semaine)}</strong>
                    </div>

                    {r.date_soumission && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        <i className="fas fa-clock mr-1" />
                        {t('encadreur.submitted_ago')} <strong>{tempsDepuis(r.date_soumission)}</strong>
                      </div>
                    )}

                    {r.analyse && (
                      <div className="d-flex align-items-center mb-2" style={{ fontSize: 13 }}>
                        <i className="fas fa-robot mr-2" style={{ color: '#6f42c1' }} />
                        {t('encadreur.ia_score_inline')} <strong className="mx-1">{r.analyse.score_engagement}/100</strong>
                        <span className={`badge ${alerteCls} ml-1`}>
                          <i className={`${alerteIcon} mr-1`} />{alerteLbl}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer py-2" style={{ background: 'transparent' }}>
                    <div className="btn-group btn-group-sm w-100">
                      <Link to={`/manager/rapports/${r.id}/valider`} className="btn btn-outline-secondary">
                        <i className="fas fa-eye mr-1" />{t('encadreur.read_report_btn')}
                      </Link>
                      <Link to={`/manager/rapports/${r.id}/valider`} className="btn btn-success">
                        <i className="fas fa-gavel mr-1" />{t('encadreur.validate_reject_btn')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </EncadreurLayout>
  )
}
