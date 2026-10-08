import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import ManagerLayout from '../../../components/layout/ManagerLayout'
import Spinner from '../../../components/Spinner'
import { getRapportEquipe, getPointages } from '../../../api/presences'

function TauxBadge({ taux }) {
  const color = taux >= 90 ? '#28A745' : taux >= 75 ? '#FD7E14' : '#DC3545'
  return (
    <span className="font-weight-bold" style={{ color, fontSize: 13 }}>
      {taux}%
    </span>
  )
}

function getMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, '0')}`
}

function fmtHeure(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}

export default function PresencesEquipe() {
  const { t } = useTranslation()

  const MONTH_NAMES = [
    t('common.months.1'), t('common.months.2'), t('common.months.3'),
    t('common.months.4'), t('common.months.5'), t('common.months.6'),
    t('common.months.7'), t('common.months.8'), t('common.months.9'),
    t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ]

  const STATUT_CONFIG = {
    PRESENT: { cls: 'badge-success',   label: t('presences.present') },
    ABSENT:  { cls: 'badge-danger',    label: t('presences.absent') },
    RETARD:  { cls: 'badge-warning',   label: t('presences.retard') },
    CONGE:   { cls: 'badge-primary',   label: t('presences.conge') },
    FERIE:   { cls: 'badge-secondary', label: t('presences.ferie') },
    WEEKEND: { cls: 'badge-light',     label: t('presences.weekend_short') },
  }

  const today = new Date()
  const [annee, setAnnee] = useState(today.getFullYear())
  const [mois,  setMois]  = useState(today.getMonth())

  const [rapport,  setRapport]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail,   setDetail]   = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const moisParam = getMoisParam(annee, mois)

  async function load() {
    setLoading(true)
    try {
      const res = await getRapportEquipe(moisParam)
      setRapport(res.data.employes || [])
    } catch {
      toast.error(t('presences.load_error'), { id: 'presences-equipe-error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [annee, mois])

  async function openDetail(emp) {
    setSelected(emp)
    setLoadingDetail(true)
    try {
      const res = await getPointages({ employe: emp.employe_id, mois: moisParam })
      setDetail(res.data.results ?? res.data)
    } catch {
      toast.error(t('presences.detail_load_error'))
    } finally {
      setLoadingDetail(false)
    }
  }

  function prevMois() {
    if (mois === 0) { setMois(11); setAnnee(y => y - 1) }
    else setMois(m => m - 1)
  }
  function nextMois() {
    if (mois === 11) { setMois(0); setAnnee(y => y + 1) }
    else setMois(m => m + 1)
  }

  if (loading) {
    return (
      <ManagerLayout pageTitle={t('presences.team_presences')}>
        <Spinner message={t('presences.loading_report')} />
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout pageTitle={t('presences.team_presences')}>

      {/* Sélecteur de mois */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center">
          <button className="btn btn-sm btn-outline-secondary mr-2" onClick={prevMois}>
            <i className="fas fa-chevron-left" />
          </button>
          <h5 className="m-0 font-weight-bold" style={{ color: 'var(--page-title)', minWidth: 160, textAlign: 'center' }}>
            {MONTH_NAMES[mois]} {annee}
          </h5>
          <button className="btn btn-sm btn-outline-secondary ml-2" onClick={nextMois}>
            <i className="fas fa-chevron-right" />
          </button>
        </div>
        <span className="badge badge-info">
          {rapport.length !== 1
            ? t('presences.n_employees_plural', { count: rapport.length })
            : t('presences.n_employees', { count: rapport.length })}
        </span>
      </div>

      {/* Tableau récapitulatif */}
      <div className="card">
        <div className="card-body p-0">
          {rapport.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-users-slash fa-2x mb-2 d-block" />
              {t('presences.no_team_employees')}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead>
                  <tr>
                    <th>{t('presences.employee_col')}</th>
                    <th>{t('presences.dept_col')}</th>
                    <th className="text-center">{t('presences.present_col')}</th>
                    <th className="text-center">{t('presences.absent_col')}</th>
                    <th className="text-center">{t('presences.late_col')}</th>
                    <th className="text-center">{t('presences.hours_col')}</th>
                    <th className="text-center">{t('presences.rate_col')}</th>
                    <th className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.map(emp => (
                    <tr key={emp.employe_id}>
                      <td className="font-weight-bold" style={{ fontSize: 13 }}>
                        {emp.nom_complet}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.departement}</td>
                      <td className="text-center">
                        <span className="badge badge-success">{emp.jours_presents}</span>
                      </td>
                      <td className="text-center">
                        {emp.jours_absents > 0
                          ? <span className="badge badge-danger">{emp.jours_absents}</span>
                          : <span className="text-muted">0</span>}
                      </td>
                      <td className="text-center">
                        {emp.jours_retard > 0
                          ? <span className="badge badge-warning">{emp.jours_retard}</span>
                          : <span className="text-muted">0</span>}
                      </td>
                      <td className="text-center" style={{ fontSize: 12 }}>
                        {emp.total_heures}h
                      </td>
                      <td className="text-center">
                        <TauxBadge taux={emp.taux_presence} />
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-xs btn-outline-primary"
                          onClick={() => openDetail(emp)}
                        >
                          <i className="fas fa-eye" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal détail employé */}
      {selected && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-clock mr-2" />
                  {selected.nom_complet} — {MONTH_NAMES[mois]} {annee}
                </h5>
                <button type="button" className="close" onClick={() => setSelected(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body p-0">
                {loadingDetail ? (
                  <div className="text-center py-4">
                    <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
                  </div>
                ) : detail.length === 0 ? (
                  <div className="text-center py-4 text-muted">{t('presences.no_pointages')}</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead>
                        <tr>
                          <th>{t('presences.date_col')}</th>
                          <th className="text-center">{t('presences.arrival')}</th>
                          <th className="text-center">{t('presences.departure')}</th>
                          <th className="text-center">{t('presences.hours_col')}</th>
                          <th>{t('presences.status_col')}</th>
                          <th>{t('presences.note_col')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.map(d => {
                          const cfg = STATUT_CONFIG[d.statut] || STATUT_CONFIG.PRESENT
                          return (
                            <tr key={d.id}>
                              <td style={{ fontSize: 12 }}>
                                {new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                                  weekday: 'short', day: '2-digit', month: 'short',
                                })}
                              </td>
                              <td className="text-center" style={{ fontSize: 12, color: '#28A745', fontWeight: 600 }}>
                                {fmtHeure(d.heure_arrivee)}
                              </td>
                              <td className="text-center" style={{ fontSize: 12, color: '#DC3545', fontWeight: 600 }}>
                                {fmtHeure(d.heure_depart)}
                              </td>
                              <td className="text-center" style={{ fontSize: 12 }}>
                                {d.heures_travaillees ? `${parseFloat(d.heures_travaillees).toFixed(2)}h` : '—'}
                              </td>
                              <td>
                                <span className={`badge ${cfg.cls}`} style={{ fontSize: 10 }}>{cfg.label}</span>
                              </td>
                              <td style={{ fontSize: 11 }}>
                                <span className="text-muted">{d.note || '—'}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <div className="row text-center w-100 mx-0">
                  <div className="col">
                    <strong className="text-success">{selected.jours_presents}</strong>
                    <div style={{ fontSize: 11 }} className="text-muted">{t('presences.present_col')}</div>
                  </div>
                  <div className="col">
                    <strong className="text-danger">{selected.jours_absents}</strong>
                    <div style={{ fontSize: 11 }} className="text-muted">{t('presences.absent_col')}</div>
                  </div>
                  <div className="col">
                    <strong className="text-warning">{selected.jours_retard}</strong>
                    <div style={{ fontSize: 11 }} className="text-muted">{t('presences.late_col')}</div>
                  </div>
                  <div className="col">
                    <strong style={{ color: 'var(--acerfi-blue)' }}>{selected.total_heures}h</strong>
                    <div style={{ fontSize: 11 }} className="text-muted">{t('presences.hours_col')}</div>
                  </div>
                  <div className="col">
                    <TauxBadge taux={selected.taux_presence} />
                    <div style={{ fontSize: 11 }} className="text-muted">{t('presences.rate_col')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </ManagerLayout>
  )
}
