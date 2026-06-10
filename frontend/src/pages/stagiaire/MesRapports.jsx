import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import JaugeCirculaire from '../../components/ui/JaugeCirculaire'
import { getRapports, soumettreRapport, getMesStats } from '../../api/rapports'

const STATUT_CONFIG = {
  BROUILLON: { badge: 'badge-secondary', label: 'Brouillon',  icon: 'fas fa-pencil-alt' },
  SOUMIS:    { badge: 'badge-primary',   label: 'Soumis',     icon: 'fas fa-clock' },
  VALIDE:    { badge: 'badge-success',   label: 'Validé',     icon: 'fas fa-check-circle' },
  REJETE:    { badge: 'badge-danger',    label: 'Rejeté',     icon: 'fas fa-times-circle' },
}

export default function MesRapports() {
  const navigate = useNavigate()
  const [rapports, setRapports] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(null) // id du rapport en cours de soumission

  async function load() {
    try {
      const [rRes, sRes] = await Promise.all([getRapports(), getMesStats()])
      setRapports(rRes.data.results ?? rRes.data)
      setStats(sRes.data)
    } catch (err) {
      console.error('[MesRapports] load error:', err)
      toast.error('Impossible de charger les rapports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSoumettre(id) {
    if (!window.confirm('Soumettre ce rapport ? Une fois soumis, il ne peut plus être modifié.')) return
    setSubmitting(id)
    try {
      await soumettreRapport(id)
      toast.success('Rapport soumis ! Analyse IA lancée automatiquement.')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la soumission.')
    } finally {
      setSubmitting(null)
    }
  }

  // Numéro de semaine courante (dernier + 1)
  const semaineDejaCouverte = stats?.dernier_rapport_semaine
  const semaineCourante = semaineDejaCouverte ? semaineDejaCouverte + 1 : 1
  const rapportSemaineCourante = rapports.find(r => r.semaine_numero === semaineCourante)

  if (loading) {
    return (
      <StagiaireLayout pageTitle="Mes rapports"
        breadcrumb={null}>
        <Spinner message="Chargement des rapports…" />
      </StagiaireLayout>
    )
  }

  return (
    <StagiaireLayout pageTitle="Mes Rapports Hebdomadaires">

      {/* En-tête avec bouton */}
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
                Rapport semaine {semaineCourante} déjà enregistré
              </span>
            ) : (
              <Link to="/stagiaire/rapports/nouveau" className="btn btn-primary">
                <i className="fas fa-plus-circle mr-2" />
                Nouveau rapport (S{semaineCourante})
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tableau des rapports */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-file-alt mr-2" />
            Liste de mes rapports
          </h3>
        </div>
        <div className="card-body p-0">
          {rapports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-inbox fa-3x mb-3 d-block" />
              <h5>Aucun rapport pour l'instant</h5>
              <p>Commencez par rédiger votre rapport de la semaine 1.</p>
              <Link to="/stagiaire/rapports/nouveau" className="btn btn-primary mt-2">
                <i className="fas fa-plus-circle mr-2" />
                Rédiger le rapport S1
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Semaine</th>
                    <th>Période</th>
                    <th style={{ width: 120 }}>Statut</th>
                    <th style={{ width: 120 }}>Score IA</th>
                    <th>Commentaire encadreur</th>
                    <th style={{ width: 200, textAlign: 'center' }}>Actions</th>
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
                              <i className="fas fa-spinner fa-spin mr-1" style={{
                                animation: 'spin 1s linear infinite',
                              }} />
                              <span style={{
                                animation: 'pulse 1.5s ease-in-out infinite',
                                opacity: 0.8,
                              }}>
                                En cours…
                              </span>
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
                            {/* Voir le détail — toujours disponible */}
                            <Link to={`/stagiaire/rapports/${r.id}`}
                              className="btn btn-outline-secondary" title="Voir le rapport">
                              <i className="fas fa-eye" />
                            </Link>

                            {/* Modifier — brouillon uniquement */}
                            {r.statut === 'BROUILLON' && (
                              <Link to={`/stagiaire/rapports/${r.id}/edit`}
                                className="btn btn-outline-primary" title="Modifier">
                                <i className="fas fa-edit" />
                              </Link>
                            )}

                            {/* Soumettre — brouillon uniquement */}
                            {r.statut === 'BROUILLON' && (
                              <button
                                className="btn btn-primary"
                                disabled={submitting === r.id}
                                onClick={() => handleSoumettre(r.id)}
                                title="Soumettre pour validation">
                                {submitting === r.id
                                  ? <i className="fas fa-spinner fa-spin" />
                                  : <><i className="fas fa-paper-plane mr-1" />Soumettre</>}
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
