import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
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
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm]               = useState(EMPTY)
  const [loading, setLoading]         = useState(isEdit)
  const [saving, setSaving]           = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [charCount, setCharCount]     = useState(0)

  // Polling state
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
          toast.error('Seul un brouillon peut être modifié.')
          navigate('/stagiaire/rapports')
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
        toast.error('Rapport introuvable.')
        navigate('/stagiaire/rapports')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  // Nettoyage du polling à l'unmount
  useEffect(() => {
    return () => { if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current) }
  }, [])

  // Polling toutes les 3s jusqu'à 30s
  useEffect(() => {
    if (!pollingId) return

    async function poll() {
      const elapsed = Date.now() - pollingStartRef.current
      if (elapsed > 30000) {
        toast.dismiss('ia-loader')
        toast("L'analyse est en cours de traitement. Revenez dans quelques instants.", { icon: '⏳' })
        navigate('/stagiaire/rapports')
        setPollingId(null)
        return
      }
      try {
        const { data } = await getAnalyseStatut(pollingId)
        if (data.analyse_disponible) {
          toast.dismiss('ia-loader')
          toast.success(`✅ Analyse IA terminée ! Score : ${data.score_engagement}/100`)
          navigate(`/stagiaire/rapports/${pollingId}`)
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
      toast.error('Le numéro de semaine et les activités sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateRapport(id, form)
        toast.success('Brouillon mis à jour.')
      } else {
        await createRapport(form)
        toast.success('Brouillon enregistré.')
      }
      navigate('/stagiaire/rapports')
    } catch (err) {
      const detail = err.response?.data
      toast.error(detail ? JSON.stringify(detail) : "Erreur lors de l'enregistrement.")
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

      // Lancer le polling
      toast.loading('⚡ Rapport soumis ! Groq IA analyse votre rapport...', { id: 'ia-loader', duration: 35000 })
      pollingStartRef.current = Date.now()
      setPollingId(rapportId)
    } catch (err) {
      toast.dismiss('ia-loader')
      const detail = err.response?.data?.error || err.response?.data
      toast.error(detail ? String(detail) : 'Erreur lors de la soumission.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <StagiaireLayout pageTitle={isEdit ? 'Modifier le rapport' : 'Nouveau rapport'}
        breadcrumb={{ to: '/stagiaire/rapports', label: 'Mes rapports' }}>
        <Spinner />
      </StagiaireLayout>
    )
  }

  // Écran de polling affiché pendant que l'analyse tourne
  if (pollingId) {
    return (
      <StagiaireLayout pageTitle="Analyse IA en cours…"
        breadcrumb={{ to: '/stagiaire/rapports', label: 'Mes rapports' }}>
        <div className="text-center py-5">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
          <h4 style={{ color: 'var(--page-title)' }}>Groq IA analyse votre rapport…</h4>
          <p className="text-muted" style={{ fontSize: 14 }}>
            Le modèle <strong>llama-3.3-70b-versatile</strong> génère votre score, points forts
            et recommandations. Cela prend généralement 5 à 15 secondes.
          </p>
          <div className="my-4">
            <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--acerfi-blue)' }} />
          </div>
          <div className="progress" style={{ height: 8, maxWidth: 300, margin: '0 auto' }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
              style={{ width: '100%' }} />
          </div>
          <p className="text-muted mt-3" style={{ fontSize: 12 }}>
            Vérification toutes les 3 secondes · Timeout après 30 secondes
          </p>
        </div>
      </StagiaireLayout>
    )
  }

  return (
    <StagiaireLayout
      pageTitle={isEdit ? `Modifier rapport S${form.semaine_numero}` : 'Nouveau rapport'}
      breadcrumb={{ to: '/stagiaire/rapports', label: 'Mes rapports' }}>

      <div className="row">
        <div className="col-lg-9 col-md-12">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-pen-alt mr-2" />
                {isEdit ? 'Modifier le brouillon' : 'Rédiger un nouveau rapport'}
              </h3>
            </div>
            <div className="card-body">

              {/* Semaine + dates */}
              <div className="form-row">
                <div className="form-group col-md-3">
                  <label className="font-weight-bold">
                    Semaine n° <span className="text-danger">*</span>
                  </label>
                  <input type="number" className="form-control" name="semaine_numero"
                    min="1" max="52" value={form.semaine_numero} onChange={handleChange}
                    placeholder="Ex: 5" />
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">Date de début</label>
                  <input type="date" className="form-control" name="date_debut_semaine"
                    value={form.date_debut_semaine} onChange={handleChange} />
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">
                    Date de fin <small className="text-muted ml-1">(auto)</small>
                  </label>
                  <input type="date" className="form-control" name="date_fin_semaine"
                    value={form.date_fin_semaine} onChange={handleChange} />
                </div>
              </div>

              {/* Activités réalisées */}
              <div className="form-group">
                <label className="font-weight-bold">
                  Activités réalisées <span className="text-danger">*</span>
                </label>
                <textarea className="form-control" name="activites_realisees" rows={5}
                  placeholder="Décrivez en détail les activités réalisées cette semaine (minimum 100 caractères)…"
                  value={form.activites_realisees} onChange={handleChange} />
                <small className={`form-text ${charCount < 100 ? 'text-warning' : 'text-muted'}`}>
                  {charCount} caractère{charCount !== 1 ? 's' : ''}
                  {charCount < 100 && ` — minimum 100 (encore ${100 - charCount})`}
                </small>
              </div>

              {/* Projets en cours */}
              <div className="form-group">
                <label className="font-weight-bold">Projets en cours</label>
                <textarea className="form-control" name="projets_en_cours" rows={3}
                  placeholder="État d'avancement des projets…"
                  value={form.projets_en_cours} onChange={handleChange} />
              </div>

              {/* Difficultés */}
              <div className="form-group">
                <label className="font-weight-bold">Difficultés rencontrées</label>
                <textarea className="form-control" name="difficultes" rows={3}
                  placeholder="Difficultés techniques, organisationnelles, autres…"
                  value={form.difficultes} onChange={handleChange} />
              </div>

              {/* Objectifs */}
              <div className="form-group">
                <label className="font-weight-bold">Objectifs semaine suivante</label>
                <textarea className="form-control" name="objectifs_semaine_suiv" rows={3}
                  placeholder="Que prévoyez-vous pour la semaine prochaine ?…"
                  value={form.objectifs_semaine_suiv} onChange={handleChange} />
              </div>

              {/* Info IA */}
              <div className="alert alert-info mb-0">
                <i className="fas fa-robot mr-2" />
                <strong>Analyse IA Groq</strong> — après la soumission, le modèle
                <em> llama-3.3-70b-versatile</em> analysera votre rapport et générera
                automatiquement un score, des points forts, des compétences détectées
                et une recommandation pour votre encadreur.
              </div>
            </div>

            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={() => navigate('/stagiaire/rapports')}>
                <i className="fas fa-times mr-1" />Annuler
              </button>
              <div className="d-flex gap-2" style={{ gap: 8 }}>
                <button className="btn btn-outline-primary" onClick={handleSaveDraft}
                  disabled={saving || submitting}>
                  <i className="fas fa-save mr-1" />
                  {saving ? 'Enregistrement…' : '💾 Enregistrer en brouillon'}
                </button>
                <button className="btn btn-primary" onClick={() => setShowConfirm(true)}
                  disabled={saving || submitting || charCount < 100 || !form.semaine_numero}>
                  <i className="fas fa-paper-plane mr-1" />
                  {submitting ? 'Soumission…' : '📤 Soumettre le rapport'}
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
                <i className="fas fa-lightbulb mr-1 text-warning" />Conseils de rédaction
              </h3>
            </div>
            <div className="card-body" style={{ fontSize: 12 }}>
              <p className="text-muted"><strong>Activités :</strong> Soyez précis et détaillé. L'IA analyse la richesse du contenu.</p>
              <p className="text-muted"><strong>Difficultés :</strong> Ne pas hésiter à mentionner les blocages — cela aide votre encadreur.</p>
              <p className="text-muted"><strong>Objectifs :</strong> Des objectifs SMART obtiennent de meilleurs scores IA.</p>
              <hr />
              <div className="text-center">
                <span className="badge badge-success">80-100</span> Excellent<br />
                <span className="badge badge-primary mt-1">60-79</span> Bon<br />
                <span className="badge badge-warning mt-1">40-59</span> À améliorer<br />
                <span className="badge badge-danger mt-1">0-39</span> Insuffisant
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modale de confirmation ── */}
      {showConfirm && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header"
                  style={{ background: 'var(--acerfi-dark)', color: '#fff' }}>
                  <h5 className="modal-title">
                    <i className="fas fa-paper-plane mr-2" />Confirmer la soumission
                  </h5>
                  <button type="button" className="close text-white"
                    onClick={() => setShowConfirm(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle mr-2" />
                    <strong>Attention :</strong> Une fois soumis, le rapport ne peut plus être modifié.
                  </div>
                  <p>
                    <i className="fas fa-robot mr-1 text-primary" />
                    L'analyse IA sera lancée automatiquement par <strong>Groq llama-3.3-70b</strong>
                    dès la soumission.
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                    Rapport <strong>Semaine {form.semaine_numero}</strong> ·{' '}
                    {form.date_debut_semaine} → {form.date_fin_semaine}
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                    Annuler
                  </button>
                  <button className="btn btn-primary" onClick={handleSubmit}>
                    <i className="fas fa-check mr-1" />Oui, soumettre
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
