import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import { getDemandes, getMesSoldes, annulerConge } from '../../../api/conges'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SoldeCard({ solde }) {
  const { t } = useTranslation()
  const pct    = solde.jours_acquis > 0
    ? (parseFloat(solde.jours_pris) / parseFloat(solde.jours_acquis)) * 100
    : 0
  const color  = pct < 50 ? '#28A745' : pct < 80 ? '#FD7E14' : '#DC3545'
  const barPct = Math.min(100, pct)

  return (
    <div className="card mb-3" style={{ borderLeft: `4px solid ${solde.type_conge_detail?.couleur || '#2E74B5'}` }}>
      <div className="card-body py-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="font-weight-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <i className="fas fa-umbrella-beach mr-2" style={{ color: solde.type_conge_detail?.couleur }} />
            {solde.type_conge_detail?.nom || '—'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {parseFloat(solde.jours_pris).toFixed(0)} / {parseFloat(solde.jours_acquis).toFixed(0)} {t('conges_extra.days_taken_short')}
          </span>
        </div>
        <div className="progress mb-1" style={{ height: 8 }}>
          <div className="progress-bar" role="progressbar"
            style={{ width: `${barPct}%`, background: color, transition: 'width .6s ease' }} />
        </div>
        <div className="d-flex justify-content-between" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <span>
            <strong style={{ color }}>{parseFloat(solde.solde_restant).toFixed(0)}</strong>{' '}
            {t('conges.days_remaining')}
          </span>
          {parseFloat(solde.jours_en_attente) > 0 && (
            <span>
              <i className="fas fa-clock mr-1" />
              {parseFloat(solde.jours_en_attente).toFixed(0)}{t('conges_extra.days_pending_short')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MesConges() {
  const { t } = useTranslation()
  const annee = new Date().getFullYear()
  const [demandes, setDemandes] = useState([])
  const [soldes,   setSoldes]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [cancelling, setCancelling] = useState(null)

  const STATUT_CONFIG = {
    EN_ATTENTE: { cls: 'badge-warning',   label: t('conges.pending'),   icon: 'fas fa-hourglass-half' },
    APPROUVE:   { cls: 'badge-success',   label: t('conges.approved'),  icon: 'fas fa-check-circle' },
    REFUSE:     { cls: 'badge-danger',    label: t('conges.rejected'),  icon: 'fas fa-times-circle' },
    ANNULE:     { cls: 'badge-secondary', label: t('conges.cancelled'), icon: 'fas fa-ban' },
  }

  async function load() {
    try {
      const [dRes, sRes] = await Promise.all([
        getDemandes({ annee }),
        getMesSoldes({ annee }),
      ])
      setDemandes(dRes.data.results ?? dRes.data)
      setSoldes(sRes.data.results ?? sRes.data)
    } catch {
      toast.error(t('conges_extra.load_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAnnuler(id) {
    if (!window.confirm(t('conges_extra.confirm_cancel'))) return
    setCancelling(id)
    try {
      await annulerConge(id)
      toast.success(t('conges_extra.cancel_success'))
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || t('conges_extra.cancel_error'))
    } finally {
      setCancelling(null)
    }
  }

  if (loading) {
    return (
      <EmployeLayout pageTitle={t('conges.my_leaves')}>
        <Spinner message={t('conges_extra.loading_leaves')} />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout pageTitle={`${t('conges.my_leaves')} — ${annee}`}>

      {/* ── Soldes ── */}
      <div className="row mb-2">
        <div className="col-12 d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0" style={{ color: 'var(--page-title)' }}>
            <i className="fas fa-wallet mr-2" />{t('conges_extra.my_balances')}
          </h5>
          <Link to="/employe/conges/nouveau" className="btn btn-primary btn-sm">
            <i className="fas fa-plus mr-1" />{t('conges.new_request')}
          </Link>
        </div>
      </div>

      {soldes.length === 0 ? (
        <div className="alert alert-info" style={{ fontSize: 13 }}>
          <i className="fas fa-info-circle mr-2" />
          {t('conges_extra.no_balance_init')}
        </div>
      ) : (
        <div className="row">
          {soldes.map(s => (
            <div className="col-md-4" key={s.id}>
              <SoldeCard solde={s} />
            </div>
          ))}
        </div>
      )}

      {/* ── Demandes ── */}
      <div className="card mt-2">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">
            <i className="fas fa-list-ul mr-2" />
            {t('conges_extra.my_requests')} ({demandes.length})
          </h3>
          <Link to="/employe/conges/nouveau" className="btn btn-sm btn-outline-primary">
            <i className="fas fa-plus mr-1" />{t('conges.new_request')}
          </Link>
        </div>
        <div className="card-body p-0">
          {demandes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-umbrella-beach fa-3x mb-3 d-block" />
              <p>{t('conges.no_leaves')}</p>
              <Link to="/employe/conges/nouveau" className="btn btn-primary btn-sm">
                <i className="fas fa-plus mr-1" />{t('conges_extra.make_request')}
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead>
                  <tr>
                    <th>{t('conges_extra.col_type')}</th>
                    <th>{t('conges_extra.col_period')}</th>
                    <th>{t('conges_extra.col_nb_days')}</th>
                    <th>{t('conges_extra.col_status')}</th>
                    <th>{t('conges.comment')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map(d => {
                    const cfg = STATUT_CONFIG[d.statut] || STATUT_CONFIG.EN_ATTENTE
                    return (
                      <tr key={d.id}>
                        <td style={{ fontSize: 13 }}>
                          <span className="font-weight-bold"
                            style={{ color: d.type_conge_detail?.couleur }}>
                            <i className={`${d.type_conge_detail?.couleur ? 'fas fa-circle' : 'fas fa-tag'} mr-1`} style={{ fontSize: 8 }} />
                            {d.type_conge_detail?.nom || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}
                        </td>
                        <td className="text-center font-weight-bold">{d.nb_jours}j</td>
                        <td>
                          <span className={`badge ${cfg.cls}`}>
                            <i className={`${cfg.icon} mr-1`} />{cfg.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, maxWidth: 200 }}>
                          {d.commentaire_valideur ? (
                            <span className="text-muted">{d.commentaire_valideur}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {d.statut === 'EN_ATTENTE' && (
                            <button
                              className="btn btn-xs btn-outline-danger"
                              style={{ fontSize: 11 }}
                              disabled={cancelling === d.id}
                              onClick={() => handleAnnuler(d.id)}
                            >
                              {cancelling === d.id
                                ? <i className="fas fa-spinner fa-spin" />
                                : <><i className="fas fa-times mr-1" />{t('common.cancel')}</>
                              }
                            </button>
                          )}
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
    </EmployeLayout>
  )
}
