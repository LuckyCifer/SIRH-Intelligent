import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import AnalyseIACard from '../../components/ui/AnalyseIACard'
import { getRapport } from '../../api/rapports'

export default function DetailRapport() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)

  const STATUT_CONFIG = {
    BROUILLON: { badge: 'badge-secondary', label: t('stagiaire.status_draft'),     icon: 'fas fa-pencil-alt' },
    SOUMIS:    { badge: 'badge-primary',   label: t('stagiaire.status_submitted'),  icon: 'fas fa-clock' },
    VALIDE:    { badge: 'badge-success',   label: t('stagiaire.status_validated'),  icon: 'fas fa-check-circle' },
    REJETE:    { badge: 'badge-danger',    label: t('stagiaire.status_rejected'),   icon: 'fas fa-times-circle' },
  }

  useEffect(() => {
    getRapport(id)
      .then(res => setRapport(res.data))
      .catch(() => toast.error(t('stagiaire.not_found_title')))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <StagiaireLayout pageTitle={t('stagiaire.report_loading')}
        breadcrumb={{ to: '/employe/rapports', label: t('stagiaire.my_weekly_reports') }}>
        <Spinner />
      </StagiaireLayout>
    )
  }

  if (!rapport) {
    return (
      <StagiaireLayout pageTitle={t('stagiaire.not_found_title')}
        breadcrumb={{ to: '/employe/rapports', label: t('stagiaire.my_weekly_reports') }}>
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle mr-2" />
          {t('stagiaire.not_found_msg')}
        </div>
      </StagiaireLayout>
    )
  }

  const cfg = STATUT_CONFIG[rapport.statut] || STATUT_CONFIG.BROUILLON
  const analyse = rapport.analyse

  return (
    <StagiaireLayout
      pageTitle={`${t('stagiaire.report_title_prefix')} — ${t('stagiaire.week_no_label')} ${rapport.semaine_numero}`}
      breadcrumb={{ to: '/employe/rapports', label: t('stagiaire.my_weekly_reports') }}>

      {/* En-tête avec statut + actions */}
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
                  {t('stagiaire.submitted_on')} {rapport.date_soumission.slice(0, 10)}
                </span>
              )}
            </div>
            {rapport.statut === 'BROUILLON' && (
              <Link to={`/employe/rapports/${id}/edit`}
                className="btn btn-sm btn-outline-primary">
                <i className="fas fa-edit mr-1" />
                {t('stagiaire.edit_draft')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Commentaire encadreur */}
      {rapport.commentaire_encadreur && (
        <div className={`alert ${rapport.statut === 'REJETE' ? 'alert-danger' : 'alert-success'} mb-3`}>
          <i className="fas fa-comment-alt mr-2" />
          <strong>{t('stagiaire.supervisor_comment')} :</strong> {rapport.commentaire_encadreur}
          {rapport.date_validation && (
            <small className="d-block mt-1 text-muted">
              {rapport.date_validation.slice(0, 10)}
            </small>
          )}
        </div>
      )}

      {/* Sections du rapport */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h3 className="card-title">
                <i className="fas fa-tasks mr-2" />
                {t('stagiaire.activities_title')}
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.activites_realisees || <span className="text-muted">{t('stagiaire.not_filled')}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-project-diagram mr-2" />
                {t('stagiaire.projects_title')}
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.projets_en_cours || <span className="text-muted">{t('stagiaire.not_filled')}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-exclamation-circle text-warning mr-2" />
                {t('stagiaire.difficulties_title')}
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.difficultes || <span className="text-muted">{t('stagiaire.no_difficulties')}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-forward text-success mr-2" />
                {t('stagiaire.next_objectives_title')}
              </h3>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {rapport.objectifs_semaine_suiv || <span className="text-muted">{t('stagiaire.not_filled')}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analyse IA */}
      {rapport.statut === 'SOUMIS' && !analyse && (
        <div className="alert alert-info mt-2">
          <i className="fas fa-spinner fa-spin mr-2" />
          <strong>{t('stagiaire.ia_analyzing_title')}</strong> {t('stagiaire.ia_analyzing_msg')}
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
