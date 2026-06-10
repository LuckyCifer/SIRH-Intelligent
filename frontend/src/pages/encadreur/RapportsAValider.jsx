import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import { getRapportsAValider } from '../../api/encadreur'

const ALERTE_CONFIG = {
  AUCUNE:  { cls: 'badge-success',  icon: 'fas fa-check-circle text-success',  label: 'Aucune alerte' },
  FAIBLE:  { cls: 'badge-success',  icon: 'fas fa-check-circle text-success',  label: 'Faible' },
  MOYENNE: { cls: 'badge-warning',  icon: 'fas fa-exclamation-circle text-warning', label: 'Moyenne' },
  ELEVEE:  { cls: 'badge-danger',   icon: 'fas fa-exclamation-triangle text-danger', label: 'Élevée' },
}

function tempsDepuis(dateStr) {
  if (!dateStr) return null
  const diff  = Date.now() - new Date(dateStr).getTime()
  const jours = Math.floor(diff / 86400000)
  const heures = Math.floor(diff / 3600000)
  if (jours >= 1) return `il y a ${jours} jour${jours > 1 ? 's' : ''}`
  if (heures >= 1) return `il y a ${heures} heure${heures > 1 ? 's' : ''}`
  return "à l'instant"
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, j] = d.split('-')
  const mois = ['jan', 'fév', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']
  return `${parseInt(j)} ${mois[parseInt(m) - 1]}. ${y}`
}

export default function RapportsAValider() {
  const [rapports, setRapports] = useState([])
  const [loading, setLoading]   = useState(true)

  function load() {
    setLoading(true)
    getRapportsAValider()
      .then(r => {
        const data = r.data.results ?? r.data
        // Trier : plus ancien en premier
        const sorted = [...data].sort((a, b) =>
          new Date(a.date_soumission || 0) - new Date(b.date_soumission || 0)
        )
        setRapports(sorted)
      })
      .catch(() => toast.error('Impossible de charger les rapports.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <EncadreurLayout pageTitle="Rapports à valider">
        <Spinner message="Chargement des rapports en attente…" />
      </EncadreurLayout>
    )
  }

  return (
    <EncadreurLayout pageTitle="Rapports à valider">

      {/* ── Résumé ── */}
      <div className="row mb-3">
        <div className="col-12">
          {rapports.length > 0 ? (
            <div className="alert alert-warning py-2 mb-0" style={{ fontSize: 13 }}>
              <i className="fas fa-hourglass-half mr-2" />
              <strong>{rapports.length}</strong> rapport{rapports.length > 1 ? 's' : ''} en attente de validation
              — triés par ancienneté de soumission.
            </div>
          ) : (
            <div className="alert alert-success py-2 mb-0" style={{ fontSize: 13 }}>
              <i className="fas fa-check-circle mr-2" />
              <strong>Tous les rapports sont traités !</strong> Aucun rapport en attente de validation.
            </div>
          )}
        </div>
      </div>

      {rapports.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-check-double fa-4x mb-3 text-success d-block" />
          <h5 style={{ color: 'var(--text-primary)' }}>Aucun rapport en attente</h5>
          <p className="text-muted">Tous les rapports soumis ont été traités.</p>
          <Link to="/encadreur/dashboard" className="btn btn-outline-primary">
            <i className="fas fa-home mr-1" />Retour au tableau de bord
          </Link>
        </div>
      ) : (
        <div className="row">
          {rapports.map(r => {
            const alerteCfg = ALERTE_CONFIG[r.analyse?.niveau_alerte] || ALERTE_CONFIG.AUCUNE
            const stagiaire = r.stagiaire_detail || {}
            return (
              <div className="col-lg-6" key={r.id}>
                <div className="card mb-3 card-primary card-outline">
                  <div className="card-body">
                    {/* ── Stagiaire + semaine ── */}
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
                        Semaine {r.semaine_numero}
                      </span>
                    </div>

                    {/* ── Période ── */}
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <i className="fas fa-calendar-week mr-1" />
                      Du <strong>{fmtDate(r.date_debut_semaine)}</strong> au <strong>{fmtDate(r.date_fin_semaine)}</strong>
                    </div>

                    {/* ── Soumis il y a ── */}
                    {r.date_soumission && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        <i className="fas fa-clock mr-1" />
                        Soumis <strong>{tempsDepuis(r.date_soumission)}</strong>
                      </div>
                    )}

                    {/* ── Score IA ── */}
                    {r.analyse && (
                      <div className="d-flex align-items-center mb-2" style={{ fontSize: 13 }}>
                        <i className="fas fa-robot mr-2" style={{ color: '#6f42c1' }} />
                        Score IA : <strong className="mx-1">{r.analyse.score_engagement}/100</strong>
                        <span className={`badge ${alerteCfg.cls} ml-1`}>
                          <i className={`${alerteCfg.icon} mr-1`} />{alerteCfg.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className="card-footer py-2" style={{ background: 'transparent' }}>
                    <div className="btn-group btn-group-sm w-100">
                      <Link
                        to={`/encadreur/rapports/${r.id}/valider`}
                        className="btn btn-outline-secondary"
                      >
                        <i className="fas fa-eye mr-1" />Lire le rapport
                      </Link>
                      <Link
                        to={`/encadreur/rapports/${r.id}/valider`}
                        className="btn btn-success"
                      >
                        <i className="fas fa-gavel mr-1" />Valider / Rejeter
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
