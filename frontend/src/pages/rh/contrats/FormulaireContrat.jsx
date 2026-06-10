import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'

const EMPTY = {
  employe: '', type_contrat: 'CDI', poste: '', date_debut: '', date_fin: '',
  salaire: '', statut: 'ACTIF', notes: '',
}

export default function FormulaireContrat() {
  const { id }    = useParams()
  const isEdit    = Boolean(id)
  const navigate  = useNavigate()
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving]   = useState(false)
  const [employes, setEmployes] = useState([])
  const [postes,   setPostes]   = useState([])

  useEffect(() => {
    api.get('/accounts/users/?role=EMPLOYE')
      .then(r => setEmployes(r.data.results ?? r.data))
      .catch(() => {})
    api.get('/departements/postes/')
      .then(r => setPostes(r.data.results ?? r.data))
      .catch(() => {})
    if (isEdit) {
      api.get(`/contrats/${id}/`)
        .then(r => setForm({ ...r.data, poste: r.data.poste ?? '', employe: r.data.employe ?? '', salaire: r.data.salaire ?? '', date_fin: r.data.date_fin ?? '' }))
        .catch(() => { toast.error('Contrat introuvable.'); navigate('/rh/contrats') })
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, navigate])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.employe || !form.type_contrat || !form.date_debut) {
      toast.error('Employé, type et date de début sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        poste:    form.poste    || null,
        date_fin: form.date_fin || null,
        salaire:  form.salaire  || null,
      }
      if (isEdit) {
        await api.put(`/contrats/${id}/`, payload)
        toast.success('Contrat mis à jour.')
      } else {
        await api.post('/contrats/', payload)
        toast.success('Contrat créé.')
      }
      navigate('/rh/contrats')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <RHLayout pageTitle={isEdit ? 'Modifier le contrat' : 'Nouveau contrat'}><Spinner /></RHLayout>
  }

  return (
    <RHLayout pageTitle={isEdit ? 'Modifier le contrat' : 'Nouveau contrat'}>
      <div className="row">
        <div className="col-md-8">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-file-contract mr-2" />
                {isEdit ? 'Modifier le contrat' : 'Créer un contrat'}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="card-body">

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Employé <span className="text-danger">*</span></label>
                    <select name="employe" className="form-control" value={form.employe} onChange={handleChange} required>
                      <option value="">— Sélectionner un employé —</option>
                      {employes.map(e => (
                        <option key={e.id} value={e.id}>{e.full_name || e.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Type de contrat <span className="text-danger">*</span></label>
                    <select name="type_contrat" className="form-control" value={form.type_contrat} onChange={handleChange}>
                      <option value="CDI">CDI — Durée Indéterminée</option>
                      <option value="CDD">CDD — Durée Déterminée</option>
                      <option value="STAGE">Convention de Stage</option>
                      <option value="FREELANCE">Contrat Freelance</option>
                      <option value="INTERIM">Contrat d'Intérim</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="font-weight-bold">Poste</label>
                  <select name="poste" className="form-control" value={form.poste} onChange={handleChange}>
                    <option value="">— Aucun poste —</option>
                    {postes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.titre} ({p.departement_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Date de début <span className="text-danger">*</span></label>
                    <input type="date" name="date_debut" className="form-control"
                      value={form.date_debut} onChange={handleChange} required />
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">
                      Date de fin
                      <small className="text-muted ml-1">(vide = CDI)</small>
                    </label>
                    <input type="date" name="date_fin" className="form-control"
                      value={form.date_fin}
                      onChange={handleChange}
                      disabled={form.type_contrat === 'CDI'} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Salaire mensuel brut (FCFA)</label>
                    <input type="number" name="salaire" className="form-control"
                      value={form.salaire} onChange={handleChange}
                      placeholder="Ex: 350000" min="0" />
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">Statut</label>
                    <select name="statut" className="form-control" value={form.statut} onChange={handleChange}>
                      <option value="ACTIF">Actif</option>
                      <option value="EXPIRE">Expiré</option>
                      <option value="RESILIE">Résilié</option>
                      <option value="EN_COURS">En cours de renouvellement</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="font-weight-bold">Notes internes</label>
                  <textarea name="notes" className="form-control" rows={3}
                    value={form.notes} onChange={handleChange}
                    placeholder="Informations complémentaires sur ce contrat…" />
                </div>
              </div>

              <div className="card-footer d-flex justify-content-between">
                <button type="button" className="btn btn-secondary"
                  onClick={() => navigate('/rh/contrats')}>
                  <i className="fas fa-times mr-1" />Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fas fa-save mr-1" />
                  {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer le contrat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RHLayout>
  )
}
