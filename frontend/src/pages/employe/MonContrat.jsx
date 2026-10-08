import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import EmployeLayout from '../../components/layout/EmployeLayout'
import Spinner from '../../components/Spinner'
import useAuthStore from '../../store/authStore'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useApercu } from '../../components/ui/useApercu'

export default function MonContrat() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [contrat, setContrat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apercuBusy, setApercuBusy] = useState(false)
  const { voirFichier, apercuModal } = useApercu()

  async function handleApercuContrat() {
    setApercuBusy(true)
    try {
      const res = await fetch(contrat.document)
      if (!res.ok) throw new Error(res.status)
      voirFichier(await res.blob(), decodeURIComponent(contrat.document.split('/').pop()), t('monContrat.download_pdf'))
    } catch {
      toast.error(t('apercu.load_error'), { id: 'apercu-err' })
    } finally {
      setApercuBusy(false)
    }
  }

  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'

  const TYPE_CONFIG = {
    CDI:       { cls: 'badge-success',   label: t('monContrat.type_cdi') },
    CDD:       { cls: 'badge-primary',   label: t('monContrat.type_cdd') },
    STAGE:     { cls: 'badge-warning',   label: t('monContrat.type_stage') },
    FREELANCE: { cls: 'badge-info',      label: t('monContrat.type_freelance') },
    INTERIM:   { cls: 'badge-secondary', label: t('monContrat.type_interim') },
  }

  const STATUT_CONFIG = {
    ACTIF:    { cls: 'badge-success',   label: t('monContrat.status_actif') },
    EXPIRE:   { cls: 'badge-danger',    label: t('monContrat.status_expire') },
    RESILIE:  { cls: 'badge-secondary', label: t('monContrat.status_resilie') },
    EN_COURS: { cls: 'badge-warning',   label: t('monContrat.status_en_cours') },
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d + 'T12:00:00').toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  function fmtSalaire(s) {
    if (!s) return '—'
    return new Intl.NumberFormat(locale).format(s) + ' FCFA'
  }

  useEffect(() => {
    api.get('/contrats/?statut=ACTIF')
      .then(r => {
        const data = r.data.results ?? r.data
        setContrat(Array.isArray(data) && data.length > 0 ? data[0] : null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <EmployeLayout pageTitle={t('monContrat.title')}
        breadcrumb={{ to: '/employe/dashboard', label: t('nav.tableau_de_bord') }}>
        <Spinner message={t('monContrat.loading')} />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout pageTitle={t('monContrat.title')}
      breadcrumb={{ to: '/employe/dashboard', label: t('nav.tableau_de_bord') }}>
      {!contrat ? (
        <div className="text-center py-5">
          <i className="fas fa-file-contract fa-3x mb-3 d-block text-muted" />
          <h5 style={{ color: 'var(--text-primary)' }}>{t('monContrat.no_contract')}</h5>
          <p className="text-muted" style={{ fontSize: 13 }}>
            {t('monContrat.no_contract_msg')}<br />
            {t('monContrat.contact_rh')}
          </p>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-8">
            <div className="card card-primary card-outline">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-file-contract mr-2" />
                  {t('monContrat.details_title')}
                </h3>
                <div>
                  <span className={`badge ${TYPE_CONFIG[contrat.type_contrat]?.cls || 'badge-secondary'} mr-2`}>
                    {TYPE_CONFIG[contrat.type_contrat]?.label || contrat.type_contrat}
                  </span>
                  <span className={`badge ${STATUT_CONFIG[contrat.statut]?.cls || 'badge-secondary'}`}>
                    {STATUT_CONFIG[contrat.statut]?.label || contrat.statut}
                  </span>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-sm table-borderless" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>
                        <i className="fas fa-building mr-2" />{t('monContrat.field_dept')}
                      </td>
                      <td className="font-weight-bold">{contrat.departement_nom || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">
                        <i className="fas fa-briefcase mr-2" />{t('monContrat.field_poste')}
                      </td>
                      <td className="font-weight-bold">{contrat.poste_titre || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">
                        <i className="fas fa-calendar-check mr-2" />{t('monContrat.field_start')}
                      </td>
                      <td>{fmtDate(contrat.date_debut)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">
                        <i className="fas fa-calendar-times mr-2" />{t('monContrat.field_end')}
                      </td>
                      <td>
                        {contrat.date_fin ? fmtDate(contrat.date_fin) : (
                          <span className="badge badge-success">{t('monContrat.no_end_date')}</span>
                        )}
                      </td>
                    </tr>
                    {contrat.salaire && (
                      <tr>
                        <td className="text-muted">
                          <i className="fas fa-money-bill mr-2" />{t('monContrat.field_salary')}
                        </td>
                        <td className="font-weight-bold">{fmtSalaire(contrat.salaire)}</td>
                      </tr>
                    )}
                    {contrat.jours_restants != null && (
                      <tr>
                        <td className="text-muted">
                          <i className="fas fa-hourglass-half mr-2" />{t('monContrat.field_days_remaining')}
                        </td>
                        <td>
                          <span className={`badge ${contrat.expire_bientot ? 'badge-danger' : 'badge-info'}`}>
                            {contrat.jours_restants} j
                          </span>
                          {contrat.expire_bientot && (
                            <span className="text-danger ml-2" style={{ fontSize: 12 }}>
                              <i className="fas fa-exclamation-triangle mr-1" />{t('monContrat.expires_soon')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {contrat.notes && (
                  <div className="alert alert-info py-2 mt-2" style={{ fontSize: 12 }}>
                    <i className="fas fa-info-circle mr-1" />
                    {contrat.notes}
                  </div>
                )}
              </div>
              {contrat.document && (
                <div className="card-footer">
                  <button type="button" className="btn btn-sm btn-outline-primary"
                    onClick={handleApercuContrat} disabled={apercuBusy}>
                    <i className={`fas ${apercuBusy ? 'fa-spinner fa-spin' : 'fa-eye'} mr-1`} />
                    {t('apercu.preview')} — {t('monContrat.download_pdf')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-user-tie mr-2" />{t('monContrat.info_section')}
                </h3>
              </div>
              <div className="card-body" style={{ fontSize: 13 }}>
                <p className="text-muted mb-1">{t('monContrat.info_fullname')}</p>
                <p className="font-weight-bold">{user?.first_name} {user?.last_name}</p>
                <p className="text-muted mb-1 mt-2">{t('monContrat.info_username')}</p>
                <p><code>{user?.username}</code></p>
                <p className="text-muted mb-1 mt-2">{t('monContrat.info_email')}</p>
                <p>{user?.email || '—'}</p>
                <hr />
                <p className="text-muted" style={{ fontSize: 11 }}>
                  <i className="fas fa-lock mr-1" />
                  {t('monContrat.info_readonly')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {apercuModal}
    </EmployeLayout>
  )
}
