import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import {
  getPointages, getMonPointageAujourdhui,
  getStatsMensuel, pointerArrivee, pointerDepart,
} from '../../../api/presences'

const STATUT_CONFIG = {
  PRESENT: { cls: 'badge-success',   label: 'Présent',    color: '#28A745' },
  ABSENT:  { cls: 'badge-danger',    label: 'Absent',     color: '#DC3545' },
  RETARD:  { cls: 'badge-warning',   label: 'En retard',  color: '#FD7E14' },
  CONGE:   { cls: 'badge-primary',   label: 'En congé',   color: '#2E74B5' },
  FERIE:   { cls: 'badge-secondary', label: 'Jour férié', color: '#6C757D' },
  WEEKEND: { cls: 'badge-light',     label: 'Week-end',   color: '#ADB5BD' },
}

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
  const today = new Date()
  const [annee, setAnnee] = useState(today.getFullYear())
  const [mois,  setMois]  = useState(today.getMonth())

  const [pointageAujourdhui, setPointageAujourdhui] = useState(null)
  const [stats,    setStats]    = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [actioning, setActioning] = useState(null)

  const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre']

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
      <EmployeLayout pageTitle="Mes présences">
        <Spinner message="Chargement…" />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout pageTitle="Mes présences">

      {/* ── Widget pointage du jour ── */}
      <div className="card card-primary card-outline mb-3">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-fingerprint mr-2" />
            Pointage du jour — <em style={{ fontWeight: 400 }}>{todayLabel}</em>
          </h3>
        </div>
        <div className="card-body">
          {p && p.id ? (
            <div className="row align-items-center">
              <div className="col-md-4 text-center border-right">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Arrivée</div>
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
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Départ</div>
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
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Heures travaillées</div>
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
                  <i className="fas fa-info-circle mr-1" />Vous n'avez pas encore pointé aujourd'hui.
                </div>
                <div className="btn-group">
                  <button
                    className="btn btn-success"
                    disabled={actioning === 'arrivee'}
                    onClick={handleArrivee}
                  >
                    {actioning === 'arrivee'
                      ? <><i className="fas fa-spinner fa-spin mr-1" />Enregistrement…</>
                      : <><i className="fas fa-sign-in-alt mr-2" />Pointer mon arrivée</>}
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
                <span className="info-box-text">Présents</span>
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
                <span className="info-box-text">Absents</span>
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
                <span className="info-box-text">Retards</span>
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
                <span className="info-box-text">Heures total</span>
                <span className="info-box-number font-weight-bold">{stats.total_heures}h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Historique du mois ── */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">
            <i className="fas fa-history mr-2" />Historique
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
                    <th>Date</th>
                    <th className="text-center">Arrivée</th>
                    <th className="text-center">Départ</th>
                    <th className="text-center">Heures</th>
                    <th>Statut</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map(h => {
                    const cfg = STATUT_CONFIG[h.statut] || STATUT_CONFIG.PRESENT
                    return (
                      <tr key={h.id}>
                        <td style={{ fontSize: 12 }}>{fmtDate(h.date)}</td>
                        <td className="text-center font-weight-bold" style={{ color: '#28A745', fontSize: 12 }}>
                          {fmtHeure(h.heure_arrivee)}
                        </td>
                        <td className="text-center font-weight-bold" style={{ color: '#DC3545', fontSize: 12 }}>
                          {fmtHeure(h.heure_depart)}
                        </td>
                        <td className="text-center" style={{ fontSize: 12 }}>
                          {h.heures_travaillees ? (
                            <span>
                              {parseFloat(h.heures_travaillees).toFixed(2)}h
                              {parseFloat(h.heures_supplementaires || 0) > 0 && (
                                <span className="text-muted ml-1" style={{ fontSize: 10 }}>
                                  +{parseFloat(h.heures_supplementaires).toFixed(1)}sup
                                </span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`} style={{ fontSize: 10 }}>{cfg.label}</span>
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
