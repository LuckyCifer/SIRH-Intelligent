import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import { getProjets, createProjet, updateProjet } from '../../api/stagiaires'

export default function MonProjet() {
  const { t } = useTranslation()
  const [projet, setProjet]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ theme: '', description: '' })

  const STATUT_CONFIG = {
    PROPOSE:  { badge: 'badge-secondary', label: t('stagiaire.status_proposed'),  icon: 'fas fa-hourglass-start' },
    VALIDE:   { badge: 'badge-success',   label: t('stagiaire.status_validated'), icon: 'fas fa-check-circle' },
    EN_COURS: { badge: 'badge-primary',   label: t('stagiaire.status_ongoing'),   icon: 'fas fa-spinner' },
    LIVRE:    { badge: 'badge-info',      label: t('stagiaire.status_delivered'), icon: 'fas fa-box' },
    SOUTENU:  { badge: 'badge-warning',   label: t('stagiaire.status_defended'),  icon: 'fas fa-graduation-cap' },
  }

  async function load() {
    try {
      const res = await getProjets()
      const projets = res.data.results ?? res.data
      const p = projets[0] ?? null
      setProjet(p)
      if (p) setForm({ theme: p.theme, description: p.description })
    } catch {
      toast.error(t('stagiaire.load_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    if (!form.theme.trim()) {
      toast.error(t('stagiaire.theme_required'))
      return
    }
    setSaving(true)
    try {
      if (projet) {
        await updateProjet(projet.id, form)
        toast.success(t('stagiaire.project_update_success'))
      } else {
        await createProjet(form)
        toast.success(t('stagiaire.project_create_success'))
      }
      setEditing(false)
      load()
    } catch (err) {
      const detail = err.response?.data
      toast.error(detail ? JSON.stringify(detail) : t('stagiaire.save_error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <StagiaireLayout pageTitle={t('stagiaire.my_project_page')}>
        <Spinner />
      </StagiaireLayout>
    )
  }

  return (
    <StagiaireLayout pageTitle={t('stagiaire.my_project_page')}>

      {/* Projet existant — vue */}
      {projet && !editing ? (
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-primary card-outline">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-bullseye mr-2" />
                  {t('stagiaire.my_project_card')}
                </h3>
                {projet.statut === 'PROPOSE' && (
                  <button className="btn btn-sm btn-outline-primary"
                    onClick={() => setEditing(true)}>
                    <i className="fas fa-edit mr-1" />
                    {t('stagiaire.edit_btn')}
                  </button>
                )}
              </div>
              <div className="card-body">
                <h4 className="font-weight-bold" style={{ color: 'var(--page-title)' }}>
                  {projet.theme}
                </h4>
                {projet.description && (
                  <p className="text-muted mt-2" style={{ lineHeight: 1.7 }}>
                    {projet.description}
                  </p>
                )}

                <hr />
                <div className="row mt-3">
                  <div className="col-sm-4">
                    <dt className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                      {t('stagiaire.status_label')}
                    </dt>
                    {(() => {
                      const cfg = STATUT_CONFIG[projet.statut] || STATUT_CONFIG.PROPOSE
                      return (
                        <span className={`badge ${cfg.badge} p-2 mt-1 d-inline-block`}>
                          <i className={`${cfg.icon} mr-1`} />{cfg.label}
                        </span>
                      )
                    })()}
                  </div>
                  {projet.date_soutenance && (
                    <div className="col-sm-4">
                      <dt className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                        {t('stagiaire.defense_date_label')}
                      </dt>
                      <dd className="font-weight-bold" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-calendar mr-1" />{projet.date_soutenance}
                      </dd>
                    </div>
                  )}
                  {projet.note != null && (
                    <div className="col-sm-4">
                      <dt className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                        {t('stagiaire.final_grade_label')}
                      </dt>
                      <dd>
                        <span className="badge badge-success p-2" style={{ fontSize: 16 }}>
                          {projet.note} / 20
                        </span>
                      </dd>
                    </div>
                  )}
                </div>

                {projet.commentaire_jury && (
                  <div className="alert alert-info mt-3">
                    <i className="fas fa-comment-dots mr-2" />
                    <strong>{t('stagiaire.jury_comment')} :</strong> {projet.commentaire_jury}
                  </div>
                )}

                {projet.statut !== 'PROPOSE' && (
                  <div className="alert alert-warning mt-3" style={{ fontSize: 13 }}>
                    <i className="fas fa-lock mr-2" />
                    {t('stagiaire.locked_msg')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm">{t('stagiaire.progression_title')}</h3>
              </div>
              <div className="card-body p-3">
                {['PROPOSE', 'VALIDE', 'EN_COURS', 'LIVRE', 'SOUTENU'].map((s, i) => {
                  const cfg = STATUT_CONFIG[s]
                  const done = ['PROPOSE', 'VALIDE', 'EN_COURS', 'LIVRE', 'SOUTENU']
                    .indexOf(projet.statut) >= i
                  return (
                    <div key={s} className="d-flex align-items-center mb-3">
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: done ? 'var(--acerfi-blue)' : 'var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done ? '#fff' : 'var(--text-muted)',
                        flexShrink: 0, fontSize: 12,
                      }}>
                        <i className={cfg.icon} />
                      </div>
                      <span className="ml-2" style={{
                        fontSize: 13,
                        color: done ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: projet.statut === s ? 700 : 400,
                      }}>
                        {cfg.label}
                      </span>
                      {projet.statut === s && (
                        <i className="fas fa-arrow-left ml-auto text-primary" style={{ fontSize: 11 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* Formulaire création / édition */
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-plus-circle mr-2" />
                  {projet ? t('stagiaire.edit_project_title') : t('stagiaire.declare_project_btn')}
                </h3>
              </div>
              <div className="card-body">
                {!projet && (
                  <div className="alert alert-info mb-4">
                    <i className="fas fa-info-circle mr-2" />
                    {t('stagiaire.declare_project_hint')}
                  </div>
                )}

                <div className="form-group">
                  <label className="font-weight-bold">
                    {t('stagiaire.theme_label')} <span className="text-danger">*</span>
                  </label>
                  <textarea className="form-control" name="theme" rows={3}
                    placeholder={t('stagiaire.theme_placeholder')}
                    value={form.theme} onChange={handleChange} />
                  <small className="text-muted">{t('stagiaire.theme_hint')}</small>
                </div>

                <div className="form-group">
                  <label className="font-weight-bold">{t('stagiaire.description_label')}</label>
                  <textarea className="form-control" name="description" rows={5}
                    placeholder={t('stagiaire.description_placeholder')}
                    value={form.description} onChange={handleChange} />
                </div>
              </div>
              <div className="card-footer d-flex justify-content-between">
                {editing && (
                  <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                    <i className="fas fa-times mr-1" />{t('stagiaire.cancel_btn')}
                  </button>
                )}
                <button className="btn btn-primary ml-auto" onClick={handleSave} disabled={saving}>
                  <i className="fas fa-save mr-1" />
                  {saving
                    ? t('stagiaire.saving')
                    : projet
                      ? t('stagiaire.save_changes_btn')
                      : t('stagiaire.declare_project_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </StagiaireLayout>
  )
}
