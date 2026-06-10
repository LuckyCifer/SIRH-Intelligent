import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import FiliereBadge from '../../components/ui/FiliereBadge'
import AnalyseIACard from '../../components/ui/AnalyseIACard'
import { getRapport, validerRapport } from '../../api/encadreur'

function Section({ title, icon, children }) {
  if (!children) return null
  return (
    <div className="mb-3">
      <h6 style={{ color: 'var(--acerfi-blue)', borderBottom: '1px solid var(--border-color)', paddingBottom: 4, marginBottom: 8 }}>
        <i className={`${icon} mr-2`} />{title}
      </h6>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{children}</p>
    </div>
  )
}

export default function ValidationRapport() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [rapport,     setRapport]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [commentaire, setCommentaire] = useState('')
  const [submitting,  setSubmitting]  = useState(null)

  useEffect(() => {
    getRapport(id)
      .then(r => setRapport(r.data))
      .catch(() => {
        toast.error('Impossible de charger ce rapport.')
        navigate('/encadreur/rapports-a-valider')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleAction(action) {
    if (action === 'rejeter' && !commentaire.trim()) {
      toast.error('Un commentaire est obligatoire pour rejeter un rapport.')
      return
    }
    setSubmitting(action)
    try {
      await validerRapport(id, { action, commentaire })
      toast.success(action === 'valider' ? '✅ Rapport validé avec succès !' : '❌ Rapport rejeté.')
      navigate('/encadreur/rapports-a-valider')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation.')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <EncadreurLayout pageTitle="Validation du rapport">
        <Spinner message="Chargement du rapport…" />
      </EncadreurLayout>
    )
  }
  if (!rapport) return null

  const analyse    = rapport.analyse
  const stagiaire  = rapport.stagiaire_detail || {}
  const dejaTraite = rapport.statut !== 'SOUMIS'

  return (
    <EncadreurLayout pageTitle={`Rapport S${rapport.semaine_numero} — ${stagiaire.full_name || stagiaire.username || ''}`}>

      {/* ── Fil d'Ariane ── */}
      <div className="d-flex align-items-center flex-wrap mb-3" style={{ gap: 8 }}>
        <Link to="/encadreur/rapports-a-valider" className="btn btn-sm btn-outline-secondary">
          <i className="fas fa-arrow-left mr-1" />Retour
        </Link>
        {stagiaire.filiere
          ? <FiliereBadge code={stagiaire.filiere} size="sm" />
          : <span className="badge badge-secondary">—</span>}
        <span className="font-weight-bold" style={{ color: 'var(--text-primary)' }}>
          {stagiaire.full_name || stagiaire.username}
        </span>
        <span className="badge badge-primary">Semaine {rapport.semaine_numero}</span>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {rapport.date_debut_semaine} → {rapport.date_fin_semaine}
        </span>
        {dejaTraite && (
          <span className={`badge ${rapport.statut === 'VALIDE' ? 'badge-success' : 'badge-danger'}`}>
            {rapport.statut === 'VALIDE' ? '✅ Validé' : '❌ Rejeté'}
          </span>
        )}
      </div>

      <div className="row">

        {/* ── PANNEAU GAUCHE : Contenu du rapport ── */}
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-file-alt mr-2" />Contenu du rapport
              </h3>
            </div>
            <div className="card-body">
              <Section title="Activités réalisées"       icon="fas fa-tasks">
                {rapport.activites_realisees}
              </Section>
              <Section title="Projets en cours"          icon="fas fa-project-diagram">
                {rapport.projets_en_cours}
              </Section>
              <Section title="Difficultés rencontrées"   icon="fas fa-exclamation-circle">
                {rapport.difficultes}
              </Section>
              <Section title="Objectifs semaine suivante" icon="fas fa-bullseye">
                {rapport.objectifs_semaine_suiv}
              </Section>
              {rapport.commentaire_encadreur && (
                <div className="alert alert-info py-2 mt-2" style={{ fontSize: 13 }}>
                  <i className="fas fa-comment mr-2" />
                  <strong>Commentaire encadreur :</strong> {rapport.commentaire_encadreur}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PANNEAU DROIT : Analyse IA + Décision ── */}
        <div className="col-lg-5">

          {/* Analyse IA */}
          {analyse
            ? <div className="mb-3"><AnalyseIACard analyse={analyse} /></div>
            : (
              <div className="card mb-3">
                <div className="card-body text-center text-muted py-4">
                  <i className="fas fa-hourglass fa-2x mb-2 d-block" />
                  Analyse IA non disponible pour ce rapport.
                </div>
              </div>
            )
          }

          {/* Décision encadreur */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-gavel mr-2" />Décision encadreur
              </h3>
            </div>
            <div className="card-body">
              {dejaTraite ? (
                <div className={`alert ${rapport.statut === 'VALIDE' ? 'alert-success' : 'alert-danger'} py-2`}>
                  <i className={`fas ${rapport.statut === 'VALIDE' ? 'fa-check-circle' : 'fa-times-circle'} mr-2`} />
                  Ce rapport a déjà été <strong>{rapport.statut === 'VALIDE' ? 'validé' : 'rejeté'}</strong>.
                </div>
              ) : (
                <>
                  <div className="form-group mb-3">
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      <i className="fas fa-comment mr-1" />Votre commentaire
                      <span className="text-danger ml-1" title="Obligatoire si rejet">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Ajoutez un commentaire (obligatoire en cas de rejet, optionnel si validation)…"
                      value={commentaire}
                      onChange={e => setCommentaire(e.target.value)}
                      disabled={!!submitting}
                    />
                    <small className="text-muted">
                      <i className="fas fa-info-circle mr-1" />
                      Obligatoire pour rejeter. Le stagiaire verra ce commentaire.
                    </small>
                  </div>
                  <div className="row">
                    <div className="col-6 pr-1">
                      <button className="btn btn-success btn-block" disabled={!!submitting}
                        onClick={() => handleAction('valider')}>
                        {submitting === 'valider'
                          ? <><i className="fas fa-spinner fa-spin mr-1" />Validation…</>
                          : <><i className="fas fa-check mr-1" />VALIDER</>}
                      </button>
                    </div>
                    <div className="col-6 pl-1">
                      <button className="btn btn-danger btn-block" disabled={!!submitting}
                        onClick={() => handleAction('rejeter')}>
                        {submitting === 'rejeter'
                          ? <><i className="fas fa-spinner fa-spin mr-1" />Rejet…</>
                          : <><i className="fas fa-times mr-1" />REJETER</>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </EncadreurLayout>
  )
}
