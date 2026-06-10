import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import { getMonDashboard } from '../../api/encadreur'
import FiliereBadge from '../../components/ui/FiliereBadge'
import { getFiliere } from '../../constants/filieres'
import { getStatsConges } from '../../api/conges'
import { getRapportEquipe } from '../../api/presences'
import { getObjectifsEquipe } from '../../api/objectifs'
import { getInscriptions } from '../../api/formations'

const ALERTE_CONFIG = {
  AUCUNE:  { cls: 'badge-success',  dot: '#28a745', label: 'Aucune alerte' },
  FAIBLE:  { cls: 'badge-success',  dot: '#28a745', label: 'Faible' },
  MOYENNE: { cls: 'badge-warning',  dot: '#fd7e14', label: 'Moyenne' },
  ELEVEE:  { cls: 'badge-danger',   dot: '#dc3545', label: 'Élevée' },
}

const STATUT_CONFIG = {
  BROUILLON: 'badge-secondary',
  SOUMIS:    'badge-primary',
  VALIDE:    'badge-success',
  REJETE:    'badge-danger',
}

function AlerteDot({ niveau }) {
  const cfg = ALERTE_CONFIG[niveau] || ALERTE_CONFIG.AUCUNE
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: cfg.dot, marginRight: 5,
      animation: ['MOYENNE', 'ELEVEE'].includes(niveau) ? 'pulse-alerte 1.5s ease-in-out infinite' : 'none',
    }} />
  )
}

export default function EncadreurDashboard() {
  const [dashboard,        setDashboard]        = useState(null)
  const [statsConges,      setStatsConges]      = useState(null)
  const [rapportPresences, setRapportPresences] = useState(null)
  const [objectifsEquipe,  setObjectifsEquipe]  = useState([])
  const [statsFormations,  setStatsFormations]  = useState(null)
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    const moisAujourdhui = new Date().toISOString().slice(0, 7)
    Promise.all([
      getMonDashboard(),
      getStatsConges(),
      getRapportEquipe(moisAujourdhui),
      getObjectifsEquipe().catch(() => ({ data: [] })),
      getInscriptions().catch(() => ({ data: { results: [] } })),
    ])
      .then(([dRes, cRes, pRes, objRes, inscRes]) => {
        setDashboard(dRes.data)
        setStatsConges(cRes.data)
        setRapportPresences(pRes.data)
        const allObj = objRes.data.results ?? objRes.data
        setObjectifsEquipe(Array.isArray(allObj) ? allObj.slice(0, 5) : [])
        const allInsc = inscRes.data.results ?? inscRes.data
        if (Array.isArray(allInsc)) {
          const now = new Date()
          const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1)
          const inscrits = allInsc.filter(i => i.statut === 'INSCRIT' || i.statut === 'EN_ATTENTE')
          const presents = allInsc.filter(i => i.statut === 'PRESENT').length
          const total = allInsc.filter(i => i.statut !== 'ANNULE').length
          setStatsFormations({ inscrits: inscrits.length, presents, total, taux: total > 0 ? Math.round((presents / total) * 100) : 0 })
        }
      })
      .catch(() => toast.error('Erreur lors du chargement du tableau de bord.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <EncadreurLayout pageTitle="Tableau de bord">
        <Spinner message="Chargement des données…" />
      </EncadreurLayout>
    )
  }

  const { stagiaires = [], resume = {} } = dashboard || {}
  const rapportsEnAttente = stagiaires
    .flatMap(s => Array(s.rapports.en_attente_validation).fill(s))
    .slice(0, 10)

  return (
    <EncadreurLayout pageTitle="Tableau de bord Encadreur">
      <style>{`
        @keyframes pulse-alerte {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(1.4); }
        }
        @keyframes pulse-card {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253,126,20,.4); }
          50%       { box-shadow: 0 0 0 8px rgba(253,126,20,0); }
        }
      `}</style>

      {/* ── 4 Small Boxes ── */}
      <div className="row">

        {/* Total stagiaires */}
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{ background: '#2E74B5', color: '#fff' }}>
            <div className="inner">
              <h3>{resume.total_stagiaires ?? 0}</h3>
              <p>Stagiaires encadrés</p>
            </div>
            <div className="icon"><i className="fas fa-users" /></div>
            <Link to="/encadreur/stagiaires" className="small-box-footer" style={{ color: 'rgba(255,255,255,.85)' }}>
              Voir tous <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>

        {/* Rapports en attente */}
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{
            background: '#fd7e14', color: '#fff',
            animation: (resume.rapports_en_attente ?? 0) > 0 ? 'pulse-card 2s ease-in-out infinite' : 'none',
          }}>
            <div className="inner">
              <h3>{resume.rapports_en_attente ?? 0}</h3>
              <p>Rapports en attente</p>
            </div>
            <div className="icon"><i className="fas fa-hourglass-half" /></div>
            <Link to="/encadreur/rapports-a-valider" className="small-box-footer" style={{ color: 'rgba(255,255,255,.85)' }}>
              Valider <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>

        {/* Score IA moyen */}
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{ background: '#6f42c1', color: '#fff' }}>
            <div className="inner">
              <h3>{resume.score_moyen_global != null ? `${resume.score_moyen_global}` : '—'}</h3>
              <p>Score IA moyen / 100</p>
            </div>
            <div className="icon"><i className="fas fa-robot" /></div>
            <span className="small-box-footer" style={{ color: 'rgba(255,255,255,.85)' }}>
              <i className="fas fa-chart-line mr-1" />Analyse IA Groq
            </span>
          </div>
        </div>

        {/* Alertes actives */}
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{
            background: (resume.alertes_actives ?? 0) > 0 ? '#dc3545' : '#28a745',
            color: '#fff',
          }}>
            <div className="inner">
              <h3>{resume.alertes_actives ?? 0}</h3>
              <p>Alertes actives</p>
            </div>
            <div className="icon">
              <i className={(resume.alertes_actives ?? 0) > 0 ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle'} />
            </div>
            <span className="small-box-footer" style={{ color: 'rgba(255,255,255,.85)' }}>
              {(resume.alertes_actives ?? 0) > 0 ? 'Nécessitent un suivi' : 'Tout est normal'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Deux colonnes ── */}
      <div className="row">

        {/* ── Colonne gauche 65% — Liste des stagiaires ── */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-id-card mr-2" />
                Mes stagiaires
              </h3>
              <Link to="/encadreur/stagiaires" className="btn btn-sm btn-outline-primary">
                Voir tout
              </Link>
            </div>
            <div className="card-body p-0">
              {stagiaires.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-user-slash fa-2x mb-2 d-block" />
                  Aucun stagiaire assigné.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Stagiaire</th>
                        <th>Filière</th>
                        <th>Rapports</th>
                        <th>Score IA</th>
                        <th>Alerte</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stagiaires.map(s => {
                        const cfg = ALERTE_CONFIG[s.ia?.niveau_alerte] || ALERTE_CONFIG.AUCUNE
                        return (
                          <tr key={s.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                  background: getFiliere(s.filiere).couleur,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontWeight: 700, fontSize: 13, marginRight: 8,
                                }}>
                                  {(s.nom_complet || s.username)[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-weight-bold" style={{ fontSize: 13 }}>{s.nom_complet}</div>
                                  <small className="text-muted">{s.username}</small>
                                </div>
                              </div>
                            </td>
                            <td><FiliereBadge code={s.filiere} size="sm" /></td>
                            <td>
                              <span className="badge badge-secondary mr-1">{s.rapports.total} total</span>
                              {s.rapports.en_attente_validation > 0 && (
                                <span className="badge badge-warning">{s.rapports.en_attente_validation} att.</span>
                              )}
                            </td>
                            <td className="font-weight-bold" style={{ fontSize: 13 }}>
                              {s.ia?.dernier_score != null ? `${s.ia.dernier_score}/100` : '—'}
                            </td>
                            <td>
                              <AlerteDot niveau={s.ia?.niveau_alerte} />
                              <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                            </td>
                            <td>
                              <Link to={`/encadreur/stagiaires/${s.id}`}
                                className="btn btn-xs btn-outline-primary" style={{ fontSize: 11 }}>
                                <i className="fas fa-eye mr-1" />Fiche
                              </Link>
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
        </div>

        {/* ── Colonne droite 35% — Rapports en attente ── */}
        <div className="col-lg-4">
          <div className="card card-warning card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-clipboard-check mr-2" />
                Rapports à valider
                {(resume.rapports_en_attente ?? 0) > 0 && (
                  <span className="badge badge-danger ml-2">{resume.rapports_en_attente}</span>
                )}
              </h3>
            </div>
            <div className="card-body p-0">
              {stagiaires.filter(s => s.rapports.en_attente_validation > 0).length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-check-circle fa-2x mb-2 text-success d-block" />
                  <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                    Tous les rapports sont traités !
                  </p>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {stagiaires
                    .filter(s => s.rapports.en_attente_validation > 0)
                    .map(s => (
                      <li className="list-group-item px-3 py-2" key={s.id}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="font-weight-bold" style={{ fontSize: 13 }}>{s.nom_complet}</div>
                            <small className="text-muted">
                              {s.filiere} &middot; {s.rapports.en_attente_validation} rapport{s.rapports.en_attente_validation > 1 ? 's' : ''} en attente
                            </small>
                          </div>
                          <Link to="/encadreur/rapports-a-valider"
                            className="btn btn-sm btn-warning" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            <i className="fas fa-gavel mr-1" />Valider
                          </Link>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {(resume.rapports_en_attente ?? 0) > 0 && (
              <div className="card-footer text-center py-2">
                <Link to="/encadreur/rapports-a-valider" className="text-warning font-weight-bold" style={{ fontSize: 13 }}>
                  <i className="fas fa-list mr-1" />Voir tous les rapports à valider
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Carte Présences Équipe ── */}
      {rapportPresences && (
        <div className="row mt-1 mb-2">
          <div className="col-12">
            <div className="card card-success card-outline mb-0">
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-fingerprint mr-2" />
                  Présences équipe — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <Link to="/manager/presences" className="btn btn-xs btn-outline-success">
                  Voir le rapport
                </Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  {(() => {
                    const emps = rapportPresences.employes || []
                    const totalEmps = emps.length
                    const presents = emps.filter(e => e.jours_presents > 0).length
                    const absents  = emps.filter(e => e.jours_absents > 0).length
                    const tauxMoyen = totalEmps > 0
                      ? Math.round(emps.reduce((s, e) => s + e.taux_presence, 0) / totalEmps)
                      : 0
                    return (
                      <>
                        <div className="col-3 border-right">
                          <div className="font-weight-bold" style={{ fontSize: 20, color: '#28A745' }}>{presents}</div>
                          <small className="text-muted">Avec présences</small>
                        </div>
                        <div className="col-3 border-right">
                          <div className="font-weight-bold" style={{ fontSize: 20, color: '#DC3545' }}>{absents}</div>
                          <small className="text-muted">Avec absences</small>
                        </div>
                        <div className="col-3 border-right">
                          <div className="font-weight-bold" style={{ fontSize: 20, color: 'var(--acerfi-blue)' }}>
                            {totalEmps}
                          </div>
                          <small className="text-muted">Employés</small>
                        </div>
                        <div className="col-3">
                          <div className="font-weight-bold" style={{
                            fontSize: 20,
                            color: tauxMoyen >= 90 ? '#28A745' : tauxMoyen >= 75 ? '#FD7E14' : '#DC3545',
                          }}>
                            {tauxMoyen}%
                          </div>
                          <small className="text-muted">Taux moyen</small>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Carte Congés Équipe ── */}
      {statsConges && (
        <div className="row mt-1">
          <div className="col-12">
            <div className="card card-warning card-outline">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-umbrella-beach mr-2" />
                  Congés équipe
                  {statsConges.en_attente > 0 && (
                    <span className="badge badge-danger ml-2">{statsConges.en_attente}</span>
                  )}
                </h3>
                <Link to="/manager/conges" className="btn btn-sm btn-outline-warning">
                  Voir les demandes
                </Link>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 col-6 text-center border-right">
                    <div className="font-weight-bold" style={{ fontSize: 24, color: '#fd7e14' }}>
                      {statsConges.en_attente}
                    </div>
                    <small className="text-muted">En attente</small>
                  </div>
                  <div className="col-md-3 col-6 text-center border-right">
                    <div className="font-weight-bold" style={{ fontSize: 24, color: '#28a745' }}>
                      {statsConges.approuves}
                    </div>
                    <small className="text-muted">Approuvés</small>
                  </div>
                  <div className="col-md-3 col-6 text-center border-right">
                    <div className="font-weight-bold" style={{ fontSize: 24, color: '#2E74B5' }}>
                      {statsConges.total_jours_pris}j
                    </div>
                    <small className="text-muted">Jours pris</small>
                  </div>
                  <div className="col-md-3 col-6 text-center">
                    <div className="font-weight-bold" style={{ fontSize: 24, color: '#6f42c1' }}>
                      {statsConges.taux_approbation}%
                    </div>
                    <small className="text-muted">Taux approbation</small>
                  </div>
                </div>
                {statsConges.en_attente > 0 && (
                  <div className="alert alert-warning py-2 mt-3 mb-0" style={{ fontSize: 13 }}>
                    <i className="fas fa-hourglass-half mr-2" />
                    <strong>{statsConges.en_attente}</strong> demande{statsConges.en_attente > 1 ? 's' : ''} en attente de votre validation.
                    {' '}
                    <Link to="/manager/conges" className="alert-link">Valider maintenant →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Objectifs équipe ── */}
      {objectifsEquipe.length > 0 && (
        <div className="row mt-1">
          <div className="col-12">
            <div className="card card-outline card-primary">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-bullseye mr-2" />
                  Objectifs équipe
                </h3>
                <Link to="/manager/objectifs-equipe" className="btn btn-sm btn-outline-primary">
                  Gérer
                </Link>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Employé</th>
                        <th>Objectif</th>
                        <th>Priorité</th>
                        <th style={{ minWidth: 100 }}>Progression</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectifsEquipe.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontSize: 13 }}>{o.employe_detail?.nom_complet}</td>
                          <td style={{ fontSize: 13 }}>{o.titre}</td>
                          <td>
                            <span className={`badge badge-${
                              o.priorite === 'CRITIQUE' ? 'danger' :
                              o.priorite === 'HAUTE' ? 'warning' :
                              o.priorite === 'MOYENNE' ? 'info' : 'secondary'
                            }`}>{o.priorite}</span>
                          </td>
                          <td>
                            <div className="progress" style={{ height: 6 }}>
                              <div className="progress-bar bg-primary" style={{ width: `${o.progression}%` }} />
                            </div>
                            <small className="text-muted">{o.progression}%</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Formations équipe ── */}
      {statsFormations && (
        <div className="row mt-1">
          <div className="col-12">
            <div className="card card-outline card-primary">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-graduation-cap mr-2" />
                  Formations équipe
                </h3>
                <Link to="/manager/formations" className="btn btn-sm btn-outline-primary">
                  Voir le détail
                </Link>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-4 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 22, color: '#007bff' }}>
                      {statsFormations.inscrits}
                    </div>
                    <small className="text-muted">Inscrits / en attente</small>
                  </div>
                  <div className="col-4 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 22, color: '#28a745' }}>
                      {statsFormations.presents}
                    </div>
                    <small className="text-muted">Présents</small>
                  </div>
                  <div className="col-4">
                    <div className="font-weight-bold" style={{
                      fontSize: 22,
                      color: statsFormations.taux >= 80 ? '#28a745' : statsFormations.taux >= 60 ? '#fd7e14' : '#dc3545',
                    }}>
                      {statsFormations.taux}%
                    </div>
                    <small className="text-muted">Taux de présence</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </EncadreurLayout>
  )
}
