import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import { getTypesConge, getMesSoldes, creerDemande } from '../../../api/conges'

function calculerJoursOuvrables(debut, fin) {
  if (!debut || !fin) return 0
  const d = new Date(debut)
  const f = new Date(fin)
  if (f < d) return 0
  let count = 0
  const cur = new Date(d)
  while (cur <= f) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function fmtDateFr(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DemanderConge() {
  const navigate = useNavigate()
  const annee    = new Date().getFullYear()

  const [types,   setTypes]   = useState([])
  const [soldes,  setSoldes]  = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const [form, setForm] = useState({
    type_conge: '', date_debut: '', date_fin: '', motif: '', justificatif: null,
  })

  useEffect(() => {
    Promise.all([getTypesConge(), getMesSoldes({ annee })])
      .then(([tRes, sRes]) => {
        setTypes(tRes.data.results ?? tRes.data)
        setSoldes(sRes.data.results ?? sRes.data)
      })
      .catch(() => toast.error('Erreur de chargement.'))
      .finally(() => setLoading(false))
  }, [])

  const nbJours = calculerJoursOuvrables(form.date_debut, form.date_fin)

  const typeSelectionne = types.find(t => String(t.id) === String(form.type_conge))
  const soldeActuel = soldes.find(s => String(s.type_conge) === String(form.type_conge))
  const soldeRestant = soldeActuel
    ? parseFloat(soldeActuel.solde_restant)
    : (typeSelectionne ? typeSelectionne.jours_par_an : null)

  function handleChange(e) {
    const { name, value, files } = e.target
    if (name === 'justificatif') {
      setForm(f => ({ ...f, justificatif: files[0] }))
    } else {
      setForm(f => ({ ...f, [name]: value }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.type_conge || !form.date_debut || !form.date_fin || !form.motif.trim()) {
      toast.error('Tous les champs obligatoires doivent être remplis.')
      return
    }
    if (new Date(form.date_fin) < new Date(form.date_debut)) {
      toast.error('La date de fin doit être postérieure ou égale à la date de début.')
      return
    }
    if (soldeRestant !== null && nbJours > soldeRestant) {
      toast.error(`Solde insuffisant. Il vous reste ${soldeRestant.toFixed(0)} jours pour ce type de congé.`)
      return
    }

    setSaving(true)
    try {
      const payload = new FormData()
      payload.append('type_conge', form.type_conge)
      payload.append('date_debut', form.date_debut)
      payload.append('date_fin',   form.date_fin)
      payload.append('motif',      form.motif)
      if (form.justificatif) payload.append('justificatif', form.justificatif)

      await creerDemande(payload)
      toast.success('✅ Demande de congé envoyée !')
      navigate('/employe/conges')
    } catch (err) {
      const detail = err.response?.data
      toast.error(detail ? JSON.stringify(detail) : 'Erreur lors de la soumission.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <EmployeLayout pageTitle="Nouvelle demande de congé">
        <Spinner />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout
      pageTitle="Nouvelle demande de congé"
      breadcrumb={{ to: '/employe/conges', label: 'Mes congés' }}
    >
      <div className="row">
        <div className="col-md-8">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-umbrella-beach mr-2" />
                Demander un congé
              </h3>
            </div>
            <form onSubmit={handleSubmit} encType="multipart/form-data">
              <div className="card-body">

                {/* Type de congé */}
                <div className="form-group">
                  <label className="font-weight-bold">
                    Type de congé <span className="text-danger">*</span>
                  </label>
                  <select name="type_conge" className="form-control"
                    value={form.type_conge} onChange={handleChange} required>
                    <option value="">— Sélectionner un type —</option>
                    {types.map(t => {
                      const s = soldes.find(x => String(x.type_conge) === String(t.id))
                      const restant = s ? parseFloat(s.solde_restant).toFixed(0) : t.jours_par_an
                      return (
                        <option key={t.id} value={t.id}>
                          {t.nom} — {restant}j restants {!t.est_paye ? '(non payé)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {typeSelectionne && (
                    <small className="form-text text-muted">
                      {typeSelectionne.description}
                      {typeSelectionne.necessite_justificatif && (
                        <span className="text-warning ml-2">
                          <i className="fas fa-paperclip mr-1" />Justificatif requis
                        </span>
                      )}
                    </small>
                  )}
                </div>

                {/* Dates */}
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Date de début <span className="text-danger">*</span></label>
                    <input type="date" name="date_debut" className="form-control"
                      value={form.date_debut} onChange={handleChange} required />
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Date de fin <span className="text-danger">*</span></label>
                    <input type="date" name="date_fin" className="form-control"
                      value={form.date_fin} onChange={handleChange}
                      min={form.date_debut} required />
                  </div>
                </div>

                {/* Aperçu calcul */}
                {form.date_debut && form.date_fin && (
                  <div className={`alert py-2 mb-3 ${
                    soldeRestant !== null && nbJours > soldeRestant
                      ? 'alert-danger' : 'alert-info'
                  }`} style={{ fontSize: 13 }}>
                    <i className="fas fa-calendar-check mr-2" />
                    Du <strong>{fmtDateFr(form.date_debut)}</strong> au <strong>{fmtDateFr(form.date_fin)}</strong>
                    {' = '}
                    <strong>{nbJours} jour{nbJours > 1 ? 's' : ''} ouvrable{nbJours > 1 ? 's' : ''}</strong>
                    {soldeRestant !== null && (
                      <>
                        <span className="mx-2">·</span>
                        Solde actuel : <strong>{typeof soldeRestant === 'number' ? soldeRestant.toFixed(0) : soldeRestant}j</strong>
                        <span className="mx-2">·</span>
                        Après demande : <strong className={nbJours > soldeRestant ? 'text-danger' : ''}>
                          {(soldeRestant - nbJours).toFixed(0)}j
                        </strong>
                      </>
                    )}
                  </div>
                )}

                {/* Motif */}
                <div className="form-group">
                  <label className="font-weight-bold">Motif <span className="text-danger">*</span></label>
                  <textarea name="motif" className="form-control" rows={3}
                    value={form.motif} onChange={handleChange}
                    placeholder="Expliquez brièvement la raison de votre demande…"
                    required />
                </div>

                {/* Justificatif conditionnel */}
                {typeSelectionne?.necessite_justificatif && (
                  <div className="form-group">
                    <label className="font-weight-bold">
                      Justificatif <span className="text-danger">*</span>
                      <small className="text-muted ml-1">(PDF, JPG, PNG)</small>
                    </label>
                    <input type="file" name="justificatif" className="form-control-file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleChange} />
                  </div>
                )}
              </div>

              <div className="card-footer d-flex justify-content-between">
                <button type="button" className="btn btn-secondary"
                  onClick={() => navigate('/employe/conges')}>
                  <i className="fas fa-times mr-1" />Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || nbJours === 0}>
                  {saving
                    ? <><i className="fas fa-spinner fa-spin mr-1" />Envoi…</>
                    : <><i className="fas fa-paper-plane mr-1" />Envoyer la demande</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Colonne info */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">
                <i className="fas fa-info-circle mr-1 text-info" />Mes soldes actuels
              </h3>
            </div>
            <div className="card-body p-0">
              {soldes.length === 0 ? (
                <div className="text-center py-3 text-muted" style={{ fontSize: 12 }}>
                  Aucun solde initialisé.
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {soldes.map(s => (
                    <li className="list-group-item py-2 d-flex justify-content-between" key={s.id}>
                      <span style={{ fontSize: 12, color: s.type_conge_detail?.couleur }}>
                        {s.type_conge_detail?.nom}
                      </span>
                      <span className="font-weight-bold" style={{ fontSize: 12 }}>
                        {parseFloat(s.solde_restant).toFixed(0)}j restants
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </EmployeLayout>
  )
}
