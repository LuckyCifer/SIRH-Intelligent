import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import AnalyseIACard from '../../components/ui/AnalyseIACard'
import { getRapport } from '../../api/rapports'

const STATUT_CONFIG = {
  BROUILLON: { badge: 'badge-secondary', label: 'Brouillon',  icon: 'fas fa-pencil-alt' },
  SOUMIS:    { badge: 'badge-primary',   label: 'Soumis',     icon: 'fas fa-clock' },
  VALIDE:    { badge: 'badge-success',   label: 'Validé',     icon: 'fas fa-check-circle' },
  REJETE:    { badge: 'badge-danger',    label: 'Rejeté',     icon: 'fas fa-times-circle' },
}


export default function DetailRapport() {
  const { id } = useParams()
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRapport(id)
      .then(res => setRapport(res.data))
      .catch(() => toast.error('Rapport introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <StagiaireLayout pageTitle="Chargement…"
        breadcrumb={{ to: '/stagiaire/rapports', label: 'Mes rapports' }}>
        <Spinner />
      </StagiaireLayout>
    )
  }

  if (!rapport) {
    return (
      <StagiaireLayout pageTitle="Rapport introuvable"
        breadcrumb={{ to: '/stagiaire/rapports', label: 'Mes rapports' }}>
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle mr-2" />
          Ce rapport n'existe pas ou vous n'avez pas les droits pour y accéder.
        </div>
      </StagiaireLayout>
    )
  }

  const cfg = STATUT_CONFIG[rapport.statut] || STATUT_CONFIG.BROUILLON
  const analyse = rapport.analyse

  return (
    <StagiaireLayout
      pageTitle={`Rapport — Semaine ${rapport.semaine_numero}`}
      breadcrumb={{ to: '/stagiaire/rapports', label: 'Mes rapports' }}>

      {/* ── En-tête avec statut + actions ── */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3" style={{ gap: 12 }}>
              <span className={`badge badge-lg ${cfg.badge} p-2`} style={{ fontSize: 14 }}>
                <i className={`${cfg.icon} mr-1`} />{cfg.label}
              </span>
              <span className="text-muted" style={{ fontSize: 13 }}>
                <i className="fas fa-calendar mr-1" />
                {rapport.date_debut_semaine} → {rapport.date_fin_semaine}
              </span>
              {rapport.date_soumission && (
                <span className="text-muted" style={{ fontSize: 13 }}>
                  <i className="fas fa-paper-plane mr-1" />
                  Soumis le {rapport.date_soumission.slice(0, 10)}
                </span>
              )}
            </div>
            {rapport.statut === 'BROUILLON' && (
              <Link to={`/stagiaire/rapports/${id}/edit`}
                className="btn btn-sm btn-outline-primary">
                <i className="fas fa-edit mr-1" />
                Modifier ce brouillon
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Commentaire encadreur si validé/rejeté ── */}
      {rapport.commentaire_encadreur && (
        <div className={`alert ${rapport.statut === 'REJETE' ? 'alert-danger' : 'alert-success'} mb-3`}>
          <i className="fas fa-comment-alt mr-2" />
          <strong>Commentaire de l'encadreur :</strong> {rapport.commentaire_encadreur}
          {rapport.date_validation && (
            <small className="d-block mt-1 text-muted">
              Le {rapport.date_validation.slice(0, 10)}
            </small>
          )}
        </div>
      )}

      {/* ══ SECTION 1 — Contenu du rapport ══ */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h3 className="card-title">
                <i className="fas fa-tasks mr-2" />
                Activités réalisées
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.activites_realisees || <span className="text-muted">Non renseigné</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-project-diagram mr-2" />
                Projets en cours
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.projets_en_cours || <span className="text-muted">Non renseigné</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-exclamation-circle text-warning mr-2" />
                Difficultés rencontrées
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.difficultes || <span className="text-muted">Aucune difficulté signalée</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-forward text-success mr-2" />
                Objectifs semaine suivante
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.objectifs_semaine_suiv || <span className="text-muted">Non renseigné</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 2 — Analyse IA ══ */}
      {rapport.statut === 'SOUMIS' && !analyse && (
        <div className="alert alert-info mt-2">
          <i className="fas fa-spinner fa-spin mr-2" />
          <strong>Analyse IA en cours…</strong> Groq traite votre rapport.
          Rechargez la page dans quelques instants.
        </div>
      )}

      {analyse && (
        <div className="mt-2">
          <AnalyseIACard analyse={analyse} />
        </div>
      )}

    </StagiaireLayout>
  )
}
