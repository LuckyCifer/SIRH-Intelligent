import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import { getProjets, createProjet, updateProjet } from '../../api/stagiaires'

const STATUT_CONFIG = {
  PROPOSE:  { badge: 'badge-secondary', label: 'Proposé',  icon: 'fas fa-hourglass-start' },
  VALIDE:   { badge: 'badge-success',   label: 'Validé',   icon: 'fas fa-check-circle' },
  EN_COURS: { badge: 'badge-primary',   label: 'En cours', icon: 'fas fa-spinner' },
  LIVRE:    { badge: 'badge-info',      label: 'Livré',    icon: 'fas fa-box' },
  SOUTENU:  { badge: 'badge-warning',   label: 'Soutenu',  icon: 'fas fa-graduation-cap' },
}

export default function MonProjet() {
  const [projet, setProjet]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ theme: '', description: '' })

  async function load() {
    try {
      const res = await getProjets()
      const projets = res.data.results ?? res.data
      const p = projets[0] ?? null
      setProjet(p)
      if (p) setForm({ theme: p.theme, description: p.description })
    } catch {
      toast.error('Impossible de charger le projet.')
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
      toast.error('Le thème du projet est obligatoire.')
      return
    }
    setSaving(true)
    try {
      if (projet) {
        await updateProjet(projet.id, form)
        toast.success('Projet mis à jour.')
      } else {
        await createProjet(form)
        toast.success('Projet déclaré avec succès !')
      }
      setEditing(false)
      load()
    } catch (err) {
      const detail = err.response?.data
      toast.error(detail ? JSON.stringify(detail) : 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <StagiaireLayout pageTitle="Mon Projet de Soutenance">
        <Spinner />
      </StagiaireLayout>
    )
  }

  return (
    <StagiaireLayout pageTitle="Mon Projet de Soutenance">

      {/* ── Projet existant ── */}
      {projet && !editing ? (
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-primary card-outline">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-bullseye mr-2" />
                  Mon projet
                </h3>
                {projet.statut === 'PROPOSE' && (
                  <button className="btn btn-sm btn-outline-primary"
                    onClick={() => setEditing(true)}>
                    <i className="fas fa-edit mr-1" />
                    Modifier
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
                    <dt className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Statut</dt>
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
                        Date de soutenance
                      </dt>
                      <dd className="font-weight-bold" style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-calendar mr-1" />{projet.date_soutenance}
                      </dd>
                    </div>
                  )}
                  {projet.note != null && (
                    <div className="col-sm-4">
                      <dt className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Note finale</dt>
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
                    <strong>Commentaire du jury :</strong> {projet.commentaire_jury}
                  </div>
                )}

                {projet.statut !== 'PROPOSE' && (
                  <div className="alert alert-warning mt-3" style={{ fontSize: 13 }}>
                    <i className="fas fa-lock mr-2" />
                    Le projet a été validé par votre encadreur. Contactez-le pour toute modification.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline du statut */}
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title text-sm">Progression</h3>
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
        /* ── Formulaire : création ou édition ── */
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-plus-circle mr-2" />
                  {projet ? 'Modifier mon projet' : 'Déclarer mon projet de soutenance'}
                </h3>
              </div>
              <div className="card-body">
                {!projet && (
                  <div className="alert alert-info mb-4">
                    <i className="fas fa-info-circle mr-2" />
                    Déclarez le thème de votre projet de fin de formation. Votre encadreur
                    le validera et pourra le modifier si nécessaire.
                  </div>
                )}

                <div className="form-group">
                  <label className="font-weight-bold">
                    Thème du projet <span className="text-danger">*</span>
                  </label>
                  <textarea className="form-control" name="theme" rows={3}
                    placeholder="Ex: Développement d'un système de recommandation IA pour la santé…"
                    value={form.theme} onChange={handleChange} />
                  <small className="text-muted">Décrivez le sujet de façon précise (50-200 caractères recommandés)</small>
                </div>

                <div className="form-group">
                  <label className="font-weight-bold">Description du projet</label>
                  <textarea className="form-control" name="description" rows={5}
                    placeholder="Contexte, objectifs, technologies utilisées, résultats attendus…"
                    value={form.description} onChange={handleChange} />
                </div>
              </div>
              <div className="card-footer d-flex justify-content-between">
                {editing && (
                  <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                    <i className="fas fa-times mr-1" />Annuler
                  </button>
                )}
                <button className="btn btn-primary ml-auto" onClick={handleSave} disabled={saving}>
                  <i className="fas fa-save mr-1" />
                  {saving ? 'Enregistrement…' : projet ? 'Enregistrer les modifications' : 'Déclarer mon projet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </StagiaireLayout>
  )
}
