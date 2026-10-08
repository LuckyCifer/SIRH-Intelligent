import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import ManagerLayout from '../../../components/layout/ManagerLayout'
import Spinner from '../../../components/Spinner'
import { getDemande, approuverConge, refuserConge } from '../../../api/conges'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function ValidationConge() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const action = searchParams.get('action') || 'approuver'
  const isApprouver = action === 'approuver'

  const [demande,     setDemande]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [commentaire, setCommentaire] = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    getDemande(id)
      .then(r => {
        const d = r.data
        if (d.statut !== 'EN_ATTENTE') {
          toast.error(t('conges_extra.no_longer_pending'))
          navigate('/manager/conges')
        } else {
          setDemande(d)
        }
      })
      .catch(() => {
        toast.error(t('conges_extra.request_not_found'))
        navigate('/manager/conges')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleConfirm() {
    if (!isApprouver && !commentaire.trim()) {
      toast.error(t('conges_extra.comment_required_rejection'))
      return
    }
    setSaving(true)
    try {
      if (isApprouver) {
        await approuverConge(id, { commentaire })
        toast.success(t('conges_extra.approved_success'))
      } else {
        await refuserConge(id, { commentaire })
        toast.success(t('conges_extra.rejected_success'))
      }
      navigate('/manager/conges')
    } catch (err) {
      toast.error(err.response?.data?.error || t('conges_extra.validation_error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ManagerLayout pageTitle={t('conges_extra.leave_validation')}>
        <Spinner message={t('conges_extra.loading_request')} />
      </ManagerLayout>
    )
  }

  if (!demande) return null

  const d = demande
  const empNom   = d.employe_detail?.full_name || d.employe_detail?.username || '—'
  const typeNom  = d.type_conge_detail?.nom    || '—'
  const couleur  = d.type_conge_detail?.couleur || '#2E74B5'

  return (
    <ManagerLayout
      pageTitle={isApprouver ? t('conges_extra.approve_leave') : t('conges_extra.reject_leave')}
    >
      <div className="row">

        {/* Formulaire de validation */}
        <div className="col-md-7">
          <div className={`card card-${isApprouver ? 'success' : 'danger'} card-outline`}>
            <div className="card-header">
              <h3 className="card-title">
                <i className={`fas fa-${isApprouver ? 'check-circle text-success' : 'times-circle text-danger'} mr-2`} />
                {isApprouver ? t('conges_extra.confirm_approval') : t('conges_extra.confirm_rejection')}
              </h3>
            </div>

            <div className="card-body">
              {/* Résumé de la demande */}
              <div className="callout callout-info mb-4">
                <div className="mb-2">
                  <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                    <i className="fas fa-user-circle mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                    {empNom}
                  </strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span className="badge mr-2" style={{ background: couleur, color: '#fff' }}>
                    {typeNom}
                  </span>
                  <i className="fas fa-calendar-alt mr-1" />
                  {t('conges_extra.from')} <strong>{fmtDate(d.date_debut)}</strong> {t('conges_extra.to')} <strong>{fmtDate(d.date_fin)}</strong>
                  <span className="badge badge-secondary ml-2">{d.nb_jours} {t('conges_extra.working_days', { count: d.nb_jours })}</span>
                </div>
                {d.motif && (
                  <div className="mt-2 text-muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                    « {d.motif} »
                  </div>
                )}
              </div>

              {/* Champ commentaire */}
              <div className="form-group">
                <label className="font-weight-bold">
                  {t('conges.comment')}{' '}
                  {!isApprouver
                    ? <span className="text-danger">*</span>
                    : <span className="text-muted font-weight-normal ml-1">({t('conges_extra.optional')})</span>
                  }
                </label>
                {!isApprouver && (
                  <p className="text-muted mb-2" style={{ fontSize: 12 }}>
                    <i className="fas fa-info-circle mr-1" />
                    {t('conges_extra.rejection_reason_hint')}
                  </p>
                )}
                <textarea
                  className="form-control"
                  rows={3}
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  placeholder={
                    isApprouver
                      ? t('conges_extra.comment_optional_placeholder')
                      : t('conges_extra.rejection_reason_placeholder')
                  }
                />
              </div>
            </div>

            <div className="card-footer d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/manager/conges')}
                disabled={saving}
              >
                <i className="fas fa-arrow-left mr-1" />{t('common.back')}
              </button>
              <button
                type="button"
                className={`btn btn-${isApprouver ? 'success' : 'danger'}`}
                disabled={saving || (!isApprouver && !commentaire.trim())}
                onClick={handleConfirm}
              >
                {saving ? (
                  <><i className="fas fa-spinner fa-spin mr-1" />{t('conges_extra.processing')}</>
                ) : isApprouver ? (
                  <><i className="fas fa-check mr-1" />{t('conges_extra.confirm_approval')}</>
                ) : (
                  <><i className="fas fa-times mr-1" />{t('conges_extra.confirm_rejection')}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Détails résumé */}
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">
                <i className="fas fa-clipboard-list mr-1 text-info" />{t('conges_extra.request_details')}
              </h3>
            </div>
            <div className="card-body p-0">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12, width: '40%' }}>{t('conges.employee')}</td>
                    <td className="font-weight-bold pr-3" style={{ fontSize: 12 }}>{empNom}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>{t('conges.type')}</td>
                    <td className="pr-3">
                      <span className="badge" style={{ background: couleur, color: '#fff', fontSize: 11 }}>
                        {typeNom}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>{t('conges.start_date')}</td>
                    <td className="pr-3" style={{ fontSize: 12 }}>{fmtDate(d.date_debut)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>{t('conges.end_date')}</td>
                    <td className="pr-3" style={{ fontSize: 12 }}>{fmtDate(d.date_fin)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>{t('conges.duration')}</td>
                    <td className="font-weight-bold pr-3" style={{ fontSize: 12 }}>
                      {d.nb_jours} {t('conges_extra.working_days', { count: d.nb_jours })}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>{t('conges.status')}</td>
                    <td className="pr-3">
                      <span className="badge badge-warning" style={{ fontSize: 11 }}>
                        <i className="fas fa-hourglass-half mr-1" />{t('conges.pending')}
                      </span>
                    </td>
                  </tr>
                  {d.motif && (
                    <tr>
                      <td className="text-muted pl-3" style={{ fontSize: 12, verticalAlign: 'top' }}>{t('conges.reason')}</td>
                      <td className="text-muted pr-3" style={{ fontSize: 12, fontStyle: 'italic' }}>
                        {d.motif}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!isApprouver && (
            <div className="alert alert-warning py-2 mt-2" style={{ fontSize: 12 }}>
              <i className="fas fa-exclamation-triangle mr-1" />
              <strong>{t('common.warning')} :</strong> {t('conges_extra.rejection_warning')}
            </div>
          )}
        </div>

      </div>
    </ManagerLayout>
  )
}
