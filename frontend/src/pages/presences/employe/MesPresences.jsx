import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import {
  getPointages, getMonPointageAujourdhui,
  getStatsMensuel, pointerArrivee, pointerDepart,
} from '../../../api/presences'

function fmtHeure(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short',
  })
}

function getMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, '0')}`
}

export default function MesPresences() {
  const { t } = useTranslation()
  const today = new Date()
  const [annee, setAnnee] = useState(today.getFullYear())
  const [mois,  setMois]  = useState(today.getMonth())

  const [pointageAujourdhui, setPointageAujourdhui] = useState(null)
  const [stats,    setStats]    = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [actioning, setActioning] = useState(null)

  const STATUT_CONFIG = {
    PRESENT: { cls: 'badge-success',   label: t('presences.present'),  color: '#28A745' },
    ABSENT:  { cls: 'badge-danger',    label: t('presences.absent'),   color: '#DC3545' },
    RETARD:  { cls: 'badge-warning',   label: t('presences.late'),     color: '#FD7E14' },
    CONGE:   { cls: 'badge-primary',   label: t('nav.conges'),         color: '#2E74B5' },
    FERIE:   { cls: 'badge-secondary', label: t('presences.holiday'),  color: '#6C757D' },
    WEEKEND: { cls: 'badge-light',     label: t('presences.weekend'),  color: '#ADB5BD' },
  }

  const MONTH_NAMES = [
    t('common.months.1'), t('common.months.2'), t('common.months.3'), t('common.months.4'),
    t('common.months.5'), t('common.months.6'), t('common.months.7'), t('common.months.8'),
    t('common.months.9'), t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ]

  async function loadAll() {
    setLoading(true)
    try {
      const moisParam = getMoisParam(annee, mois)
      const [pRes, sRes, hRes] = await Promise.all([
        getMonPointageAujourdhui(),
        getStatsMensuel(),
        getPointages({ mois: moisParam }),
      ])
      setPointageAujourdhui(pRes.data.pointage !== undefined ? pRes.data : pRes.data)
      setStats(sRes.data)
      setHistorique(hRes.data.results ?? hRes.data)
    } catch {
      toast.error('Erreur lors du chargement des présences.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [annee, mois])

  async function handleArrivee() {
    setActioning('arrivee')
    try {
      const res = await pointerArrivee()
      toast.success(res.data.message)
      setPointageAujourdhui(res.data.pointage)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de pointage.')
    } finally {
      setActioning(null)
    }
  }

  async function handleDepart() {
    setActioning('depart')
    try {
      const res = await pointerDepart()
      toast.success(res.data.message)
      setPointageAujourdhui(res.data.pointage)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de pointage.')
    } finally {
      setActioning(null)
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

  const todayStr = today.toISOString().slice(0, 10)
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const p = pointageAujourdhui

  if (loading) {
    return (
      <EmployeLayout pageTitle={t('presences.my_presences')}>
        <Spinner message={t('common.loading')} />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout pageTitle={t('presences.my_presences')}>

      {/* ── Widget pointage du jour ── */}
      <div className="card card-primary card-outline mb-3">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-fingerprint mr-2" />
            {t('presences.title')} — <em style={{ fontWeight: 400 }}>{todayLabel}</em>
          </h3>
        </div>
        <div className="card-body">
          {p && p.id ? (
            <div className="row align-items-center">
              <div className="col-md-4 text-center border-right">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{t('presences.arrival')}</div>
                {p.heure_arrivee ? (
                  <div>
                    <i className="fas fa-check-circle text-success mr-2" />
                    <strong style={{ fontSize: 22, color: '#28A745' }}>{fmtHeure(p.heure_arrivee)}</strong>
                  </div>
                ) : (
                  <button
                    className="btn btn-success btn-sm"
                    disabled={actioning === 'arrivee'}
                    onClick={handleArrivee}
                  >
                    {actioning === 'arrivee'
                      ? <i className="fas fa-spinner fa-spin" />
                      : <><i className="fas fa-sign-in-alt mr-1" />Pointer</>}
                  </button>
                )}
              </div>
              <div className="col-md-4 text-center border-right">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{t('presences.departure')}</div>
                {p.heure_depart ? (
                  <div>
                    <i className="fas fa-check-circle text-danger mr-2" />
                    <strong style={{ fontSize: 22, color: '#DC3545' }}>{fmtHeure(p.heure_depart)}</strong>
                  </div>
                ) : (
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={!p.heure_arrivee || actioning === 'depart'}
                    onClick={handleDepart}
                  >
                    {actioning === 'depart'
                      ? <i className="fas fa-spinner fa-spin" />
                      : <><i className="fas fa-sign-out-alt mr-1" />Pointer</>}
                  </button>
                )}
              </div>
              <div className="col-md-4 text-center">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{t('presences.hours')}</div>
                <strong style={{ fontSize: 20, color: 'var(--acerfi-blue)' }}>
                  {p.heures_travaillees ? `${parseFloat(p.heures_travaillees).toFixed(2)}h` : '—'}
                </strong>
                {parseFloat(p.heures_supplementaires || 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#6f42c1' }}>
                    +{parseFloat(p.heures_supplementaires).toFixed(2)}h supp.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="row align-items-center">
              <div className="col-md-8">
                <div className="text-muted mb-2" style={{ fontSize: 13 }}>
                  <i className="fas fa-info-circle mr-1" />{t('presences.no_presences')}
                </div>
                <div className="btn-group">
                  <button
                    className="btn btn-success"
                    disabled={actioning === 'arrivee'}
                    onClick={handleArrivee}
                  >
                    {actioning === 'arrivee'
                      ? <><i className="fas fa-spinner fa-spin mr-1" />{t('presences.saving')}</>
                      : <><i className="fas fa-sign-in-alt mr-2" />{t('presences.mark_arrival')}</>}
                  </button>
                </div>
              </div>
              <div className="col-md-4 text-center">
                <i className="fas fa-clock fa-3x" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats du mois ── */}
      {stats && (
        <div className="row mb-3">
          <div className="col-6 col-md-3">
            <div className="info-box">
              <span className="info-box-icon bg-success elevation-1">
                <i className="fas fa-user-check" />
              </span>
              <div className="info-box-content">
                <span className="info-box-text">{t('presences.days_present')}</span>
                <span className="info-box-number font-weight-bold">{stats.jours_presents}</span>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="info-box">
              <span className="info-box-icon bg-danger elevation-1">
                <i className="fas fa-user-times" />
              </span>
              <div className="info-box-content">
                <span className="info-box-text">{t('presences.days_absent')}</span>
                <span className="info-box-number font-weight-bold">{stats.jours_absents}</span>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="info-box">
              <span className="info-box-icon bg-warning elevation-1">
                <i className="fas fa-exclamation-circle" />
              </span>
              <div className="info-box-content">
                <span className="info-box-text">{t('presences.days_late')}</span>
                <span className="info-box-number font-weight-bold">{stats.jours_retard}</span>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="info-box">
              <span className="info-box-icon elevation-1" style={{ background: 'var(--acerfi-blue)' }}>
                <i className="fas fa-clock" />
              </span>
              <div className="info-box-content">
                <span className="info-box-text">{t('presences.total_hours')}</span>
                <span className="info-box-number font-weight-bold">{stats.total_heures}h</span>
              </div>
            </div>
          </div>
          {(stats.hs_jour > 0 || stats.hs_nuit > 0 || stats.hs_weekend_ferie > 0) && (
            <div className="col-12">
              <div className="card card-outline card-purple mb-0">
                <div className="card-body py-2">
                  <div className="d-flex flex-wrap align-items-center" style={{ gap: '16px' }}>
                    <small className="font-weight-bold text-muted mr-2">
                      <i className="fas fa-clock mr-1" />Heures supplémentaires du mois :
                    </small>
                    {stats.hs_jour > 0 && (
                      <span className="badge badge-info p-2">
                        Jour&nbsp;<strong>{stats.hs_jour}h</strong>&nbsp;<small>(+20%/+30%)</small>
                      </span>
                    )}
                    {stats.hs_nuit > 0 && (
                      <span className="badge badge-dark p-2">
                        Nuit&nbsp;<strong>{stats.hs_nuit}h</strong>&nbsp;<small>(+50%)</small>
                      </span>
                    )}
                    {stats.hs_weekend_ferie > 0 && (
                      <span className="badge badge-warning p-2">
                        W-E/Fériés&nbsp;<strong>{stats.hs_weekend_ferie}h</strong>&nbsp;<small>(+40%/+100%)</small>
                      </span>
                    )}
                    {stats.montant_hs > 0 && (
                      <span className="badge badge-success p-2 ml-auto">
                        <i className="fas fa-money-bill-wave mr-1" />
                        <strong>{Number(stats.montant_hs).toLocaleString('fr-FR')} FCFA</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Historique du mois ── */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">
            <i className="fas fa-history mr-2" />{t('common.details')}
          </h3>
          <div className="d-flex align-items-center">
            <button className="btn btn-sm btn-outline-secondary mr-2" onClick={prevMois}>
              <i className="fas fa-chevron-left" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--page-title)', minWidth: 130, textAlign: 'center' }}>
              {MONTH_NAMES[mois]} {annee}
            </span>
            <button className="btn btn-sm btn-outline-secondary ml-2" onClick={nextMois}>
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {historique.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-calendar-times fa-2x mb-2 d-block" />
              Aucun pointage ce mois.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th className="text-center">{t('presences.arrival')}</th>
                    <th className="text-center">{t('presences.departure')}</th>
                    <th className="text-center">{t('presences.hours')}</th>
                    <th className="text-center" title={t('presences.overtime')}>{t('presences.overtime')}</th>
                    <th>{t('common.status')}</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map(h => {
                    const cfg = STATUT_CONFIG[h.statut] || STATUT_CONFIG.PRESENT
                    const rowBg = h.est_jour_ferie
                      ? '#fff8cc'
                      : h.est_dimanche
                        ? '#fff0e0'
                        : undefined
                    const hsJour   = parseFloat(h.hs_jour_20 || 0) + parseFloat(h.hs_jour_30 || 0)
                    const hsNuit   = parseFloat(h.hs_nuit || 0)
                    const hsWkFerie = parseFloat(h.hs_dimanche || 0) + parseFloat(h.hs_ferie || 0)
                    return (
                      <tr key={h.id} style={rowBg ? { background: rowBg } : {}}>
                        <td style={{ fontSize: 12 }}>
                          {fmtDate(h.date)}
                          {h.est_jour_ferie && (
                            <span className="badge badge-warning ml-1" style={{ fontSize: 9 }}>{t('presences.holiday')}</span>
                          )}
                        </td>
                        <td className="text-center font-weight-bold" style={{ color: '#28A745', fontSize: 12 }}>
                          {fmtHeure(h.heure_arrivee)}
                        </td>
                        <td className="text-center font-weight-bold" style={{ color: '#DC3545', fontSize: 12 }}>
                          {fmtHeure(h.heure_depart)}
                        </td>
                        <td className="text-center" style={{ fontSize: 12 }}>
                          {h.heures_travaillees
                            ? `${parseFloat(h.heures_travaillees).toFixed(2)}h`
                            : '—'}
                        </td>
                        <td className="text-center" style={{ fontSize: 11 }}>
                          {hsJour > 0 && (
                            <span className="badge badge-info mr-1" title="HS jour">{hsJour.toFixed(1)}h</span>
                          )}
                          {hsNuit > 0 && (
                            <span className="badge badge-dark mr-1" title="HS nuit">{hsNuit.toFixed(1)}h</span>
                          )}
                          {hsWkFerie > 0 && (
                            <span className="badge badge-warning" title="HS W-E/Fériés">{hsWkFerie.toFixed(1)}h</span>
                          )}
                          {hsJour === 0 && hsNuit === 0 && hsWkFerie === 0 && (
                            parseFloat(h.heures_supplementaires || 0) > 0
                              ? <span className="badge badge-info" title="HS (approx.)">{parseFloat(h.heures_supplementaires).toFixed(1)}h</span>
                              : h.heure_depart
                                ? <span className="text-muted" style={{ fontSize: 11 }}>0</span>
                                : <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`} style={{ fontSize: 10 }}>{cfg.label}</span>
                          {h.est_retard && h.minutes_retard > 0 && (
                            <div style={{ fontSize: 9, color: '#856404', marginTop: 1 }}>
                              {h.minutes_retard} min
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 11 }}>
                          <span className="text-muted">{h.note || '—'}</span>
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
