import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import { createRapport, updateRapport, getRapport, soumettreRapport, getMesStats } from '../../api/rapports'
import { getAnalyseStatut } from '../../api/analyse'

const EMPTY = {
  semaine_numero: '',
  date_debut_semaine: '',
  date_fin_semaine: '',
  activites_realisees: '',
  projets_en_cours: '',
  difficultes: '',
  objectifs_semaine_suiv: '',
}

function addDays(dateStr, days) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function FormulaireRapport() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm]               = useState(EMPTY)
  const [loading, setLoading]         = useState(isEdit)
  const [saving, setSaving]           = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [charCount, setCharCount]     = useState(0)

  const [pollingId, setPollingId]     = useState(null)
  const pollingStartRef               = useRef(null)
  const pollingTimerRef               = useRef(null)

  useEffect(() => {
    if (!isEdit) {
      getMesStats().then(res => {
        const next = (res.data.dernier_rapport_semaine ?? 0) + 1
        setForm(f => ({ ...f, semaine_numero: String(next) }))
      }).catch(() => {})
      return
    }
    getRapport(id)
      .then(res => {
        const r = res.data
        if (r.statut !== 'BROUILLON') {
          toast.error(t('stagiaire.draft_only_edit'))
          navigate('/employe/rapports')
          return
        }
        setForm({
          semaine_numero:         String(r.semaine_numero),
          date_debut_semaine:     r.date_debut_semaine,
          date_fin_semaine:       r.date_fin_semaine,
          activites_realisees:    r.activites_realisees,
          projets_en_cours:       r.projets_en_cours,
          difficultes:            r.difficultes,
          objectifs_semaine_suiv: r.objectifs_semaine_suiv,
        })
        setCharCount(r.activites_realisees.length)
      })
      .catch(() => {
        toast.error(t('stagiaire.not_found_title'))
        navigate('/employe/rapports')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  useEffect(() => {
    return () => { if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current) }
  }, [])

  useEffect(() => {
    if (!pollingId) return

    async function poll() {
      const elapsed = Date.now() - pollingStartRef.current
      if (elapsed > 30000) {
        toast.dismiss('ia-loader')
        toast(t('stagiaire.ia_timeout_msg'), { icon: '⏳' })
        navigate('/employe/rapports')
        setPollingId(null)
        return
      }
      try {
        const { data } = await getAnalyseStatut(pollingId)
        if (data.analyse_disponible) {
          toast.dismiss('ia-loader')
          toast.success(`${t('stagiaire.ia_done')} ${data.score_engagement}/100`)
          navigate(`/employe/rapports/${pollingId}`)
          setPollingId(null)
          return
        }
      } catch { /* silencieux */ }
      pollingTimerRef.current = setTimeout(poll, 3000)
    }

    pollingTimerRef.current = setTimeout(poll, 3000)
    return () => { if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current) }
  }, [pollingId, navigate])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const updated = { ...f, [name]: value }
      if (name === 'date_debut_semaine' && value) {
        updated.date_fin_semaine = addDays(value, 4)
      }
      return updated
    })
    if (name === 'activites_realisees') setCharCount(value.length)
  }

  async function handleSaveDraft() {
    if (!form.semaine_numero || !form.activites_realisees.trim()) {
      toast.error(t('stagiaire.error_required'))
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateRapport(id, form)
        toast.success(t('stagiaire.draft_updated'))
      } else {
        await createRapport(form)
        toast.success(t('stagiaire.draft_saved'))
      }
      navigate('/employe/rapports')
    } catch (err) {
      const detail = err.response?.data
      toast.error(detail ? JSON.stringify(detail) : t('stagiaire.save_error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    setShowConfirm(false)
    setSubmitting(true)
    try {
      let rapportId = id
      if (!isEdit) {
        const { data } = await createRapport(form)
        rapportId = data.id
      } else {
        await updateRapport(id, form)
      }
      await soumettreRapport(rapportId)
      setSubmitting(false)

      toast.loading(t('stagiaire.polling_desc'), { id: 'ia-loader', duration: 35000 })
      pollingStartRef.current = Date.now()
      setPollingId(rapportId)
    } catch (err) {
      toast.dismiss('ia-loader')
      const detail = err.response?.data?.error || err.response?.data
      toast.error(detail ? String(detail) : t('stagiaire.submit_error'))
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <StagiaireLayout
        pageTitle={isEdit ? t('stagiaire.edit_report_title') : t('stagiaire.new_report_title')}
        breadcrumb={{ to: '/employe/rapports', label: t('stagiaire.my_weekly_reports') }}>
        <Spinner />
      </StagiaireLayout>
    )
  }

  // Écran de polling
  if (pollingId) {
    return (
      <StagiaireLayout pageTitle={t('stagiaire.polling_title')}
        breadcrumb={{ to: '/employe/rapports', label: t('stagiaire.my_weekly_reports') }}>
        <div className="text-center py-5">
          <div style={{ marginBottom: 16 }}>
            <i className="fas fa-robot" style={{ fontSize: 64, color: 'var(--acerfi-blue)' }} />
          </div>
          <h4 style={{ color: 'var(--page-title)' }}>{t('stagiaire.polling_title')}</h4>
          <p className="text-muted" style={{ fontSize: 14 }}>
            {t('stagiaire.polling_desc')}
          </p>
          <div className="my-4">
            <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--acerfi-blue)' }} />
          </div>
          <div className="progress" style={{ height: 8, maxWidth: 300, margin: '0 auto' }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
              style={{ width: '100%' }} />
          </div>
          <p className="text-muted mt-3" style={{ fontSize: 12 }}>
            {t('stagiaire.polling_hint')}
          </p>
        </div>
      </StagiaireLayout>
    )
  }

  return (
    <StagiaireLayout
      pageTitle={isEdit
        ? `${t('stagiaire.edit_report_title')} S${form.semaine_numero}`
        : t('stagiaire.new_report_title')}
      breadcrumb={{ to: '/employe/rapports', label: t('stagiaire.my_weekly_reports') }}>

      <div className="row">
        <div className="col-lg-9 col-md-12">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-pen-alt mr-2" />
                {isEdit ? t('stagiaire.edit_draft') : t('stagiaire.new_report_title')}
              </h3>
            </div>
            <div className="card-body">

              {/* Semaine + dates */}
              <div className="form-row">
                <div className="form-group col-md-3">
                  <label className="font-weight-bold">
                    {t('stagiaire.week_no_label')} <span className="text-danger">*</span>
                  </label>
                  <input type="number" className="form-control" name="semaine_numero"
                    min="1" max="52" value={form.semaine_numero} onChange={handleChange}
                    placeholder="Ex: 5" />
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">{t('stagiaire.date_start_label')}</label>
                  <input type="date" className="form-control" name="date_debut_semaine"
                    value={form.date_debut_semaine} onChange={handleChange} />
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">
                    {t('stagiaire.date_end_label')} <small className="text-muted ml-1">({t('stagiaire.auto_label')})</small>
                  </label>
                  <input type="date" className="form-control" name="date_fin_semaine"
                    value={form.date_fin_semaine} onChange={handleChange} />
                </div>
              </div>

              {/* Activités */}
              <div className="form-group">
                <label className="font-weight-bold">
                  {t('stagiaire.activities_label')} <span className="text-danger">*</span>
                </label>
                <textarea className="form-control" name="activites_realisees" rows={5}
                  placeholder={t('stagiaire.activities_placeholder')}
                  value={form.activites_realisees} onChange={handleChange} />
                <small className={`form-text ${charCount < 100 ? 'text-warning' : 'text-muted'}`}>
                  {charCount} {t('stagiaire.chars_label')}
                  {charCount < 100 && ` — ${t('stagiaire.chars_min', { n: 100 - charCount })}`}
                </small>
              </div>

              {/* Projets */}
              <div className="form-group">
                <label className="font-weight-bold">{t('stagiaire.projects_label')}</label>
                <textarea className="form-control" name="projets_en_cours" rows={3}
                  placeholder={t('stagiaire.projects_placeholder')}
                  value={form.projets_en_cours} onChange={handleChange} />
              </div>

              {/* Difficultés */}
              <div className="form-group">
                <label className="font-weight-bold">{t('stagiaire.difficulties_label')}</label>
                <textarea className="form-control" name="difficultes" rows={3}
                  placeholder={t('stagiaire.difficulties_placeholder')}
                  value={form.difficultes} onChange={handleChange} />
              </div>

              {/* Objectifs */}
              <div className="form-group">
                <label className="font-weight-bold">{t('stagiaire.next_objectives_label')}</label>
                <textarea className="form-control" name="objectifs_semaine_suiv" rows={3}
                  placeholder={t('stagiaire.objectives_placeholder')}
                  value={form.objectifs_semaine_suiv} onChange={handleChange} />
              </div>

              {/* Info IA */}
              <div className="alert alert-info mb-0">
                <i className="fas fa-robot mr-2" />
                <strong>{t('stagiaire.ia_info_title')}</strong> — {t('stagiaire.ia_info_desc')}
              </div>
            </div>

            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={() => navigate('/employe/rapports')}>
                <i className="fas fa-times mr-1" />{t('stagiaire.cancel_btn')}
              </button>
              <div className="d-flex gap-2" style={{ gap: 8 }}>
                <button className="btn btn-outline-primary" onClick={handleSaveDraft}
                  disabled={saving || submitting}>
                  <i className="fas fa-save mr-1" />
                  {saving ? t('stagiaire.saving') : t('stagiaire.save_draft_btn')}
                </button>
                <button className="btn btn-primary" onClick={() => setShowConfirm(true)}
                  disabled={saving || submitting || charCount < 100 || !form.semaine_numero}>
                  <i className="fas fa-paper-plane mr-1" />
                  {submitting ? t('stagiaire.submitting') : t('stagiaire.submit_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne d'aide */}
        <div className="col-lg-3 d-none d-lg-block">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">
                <i className="fas fa-lightbulb mr-1 text-warning" />{t('stagiaire.tips_title')}
              </h3>
            </div>
            <div className="card-body" style={{ fontSize: 12 }}>
              <p className="text-muted">
                <strong>{t('stagiaire.tip_activities_title')} :</strong> {t('stagiaire.tip_activities_body')}
              </p>
              <p className="text-muted">
                <strong>{t('stagiaire.tip_difficulties_title')} :</strong> {t('stagiaire.tip_difficulties_body')}
              </p>
              <p className="text-muted">
                <strong>{t('stagiaire.tip_objectives_title')} :</strong> {t('stagiaire.tip_objectives_body')}
              </p>
              <hr />
              <div className="text-center">
                <span className="badge badge-success">80-100</span> {t('stagiaire.score_excellent')}<br />
                <span className="badge badge-primary mt-1">60-79</span> {t('stagiaire.score_good')}<br />
                <span className="badge badge-warning mt-1">40-59</span> {t('stagiaire.score_improve')}<br />
                <span className="badge badge-danger mt-1">0-39</span> {t('stagiaire.score_insufficient')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de confirmation */}
      {showConfirm && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog modal-dialog-scrollable" role="document">
              <div className="modal-content">
                <div className="modal-header"
                  style={{ background: 'var(--acerfi-dark)', color: '#fff' }}>
                  <h5 className="modal-title">
                    <i className="fas fa-paper-plane mr-2" />{t('stagiaire.confirm_title')}
                  </h5>
                  <button type="button" className="close text-white"
                    onClick={() => setShowConfirm(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle mr-2" />
                    <strong>{t('stagiaire.confirm_warning_label')} :</strong> {t('stagiaire.confirm_warning')}
                  </div>
                  <p>
                    <i className="fas fa-robot mr-1 text-primary" />
                    {t('stagiaire.confirm_ia_msg')}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                    {t('stagiaire.week_no_label')} <strong>{form.semaine_numero}</strong> ·{' '}
                    {form.date_debut_semaine} → {form.date_fin_semaine}
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                    {t('stagiaire.cancel_btn')}
                  </button>
                  <button className="btn btn-primary" onClick={handleSubmit}>
                    <i className="fas fa-check mr-1" />{t('stagiaire.confirm_submit_btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowConfirm(false)} />
        </>
      )}
    </StagiaireLayout>
  )
}
