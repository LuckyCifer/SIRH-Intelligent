import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'

const EMPTY_FORM = {
  nom: '', code: '', jours_par_an: 30,
  est_paye: true, necessite_justificatif: false,
  couleur: '#2E74B5', description: '', actif: true,
}

export default function TypesConges() {
  const [types,   setTypes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  async function load() {
    try {
      const res = await api.get('/conges/types/?actif=0')
      setTypes(res.data.results ?? res.data)
    } catch {
      toast.error('Erreur lors du chargement des types de congé.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(t) {
    setEditId(t.id)
    setForm({
      nom: t.nom, code: t.code, jours_par_an: t.jours_par_an,
      est_paye: t.est_paye, necessite_justificatif: t.necessite_justificatif,
      couleur: t.couleur, description: t.description || '', actif: t.actif,
    })
    setShowModal(true)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim() || !form.code.trim()) {
      toast.error('Nom et code sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, jours_par_an: parseInt(form.jours_par_an, 10) }
      if (editId) {
        await api.put(`/conges/types/${editId}/`, payload)
        toast.success('Type de congé mis à jour.')
      } else {
        await api.post('/conges/types/', payload)
        toast.success('Type de congé créé.')
      }
      setShowModal(false)
      load()
    } catch (err) {
      const data = err.response?.data
      const msg  = data ? Object.values(data).flat().join(' ') : 'Erreur.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActif(t) {
    try {
      await api.patch(`/conges/types/${t.id}/`, { actif: !t.actif })
      toast.success(t.actif ? 'Type désactivé.' : 'Type activé.')
      load()
    } catch {
      toast.error('Erreur lors de la modification.')
    }
  }

  if (loading) {
    return (
      <RHLayout pageTitle="Types de congé">
        <Spinner message="Chargement…" />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle="Types de congé">

      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          {types.filter(t => t.actif).length} type{types.filter(t => t.actif).length !== 1 ? 's' : ''} actif{types.filter(t => t.actif).length !== 1 ? 's' : ''}
          {' / '}{types.length} au total
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <i className="fas fa-plus mr-1" />Nouveau type
        </button>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th className="text-center">Jours/an</th>
                  <th className="text-center">Payé</th>
                  <th className="text-center">Justificatif</th>
                  <th>Couleur</th>
                  <th>Description</th>
                  <th className="text-center">Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      <i className="fas fa-inbox fa-2x mb-2 d-block" />
                      Aucun type de congé configuré.
                    </td>
                  </tr>
                ) : (
                  types.map(t => (
                    <tr key={t.id} className={!t.actif ? 'text-muted' : ''}>
                      <td className="font-weight-bold" style={{ fontSize: 13 }}>
                        <span style={{ borderLeft: `4px solid ${t.couleur}`, paddingLeft: 8 }}>
                          {t.nom}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 12 }}>{t.code}</code>
                      </td>
                      <td className="text-center font-weight-bold" style={{ fontSize: 13 }}>
                        {t.jours_par_an}j
                      </td>
                      <td className="text-center">
                        {t.est_paye
                          ? <i className="fas fa-check-circle text-success" />
                          : <i className="fas fa-times-circle text-danger" />}
                      </td>
                      <td className="text-center">
                        {t.necessite_justificatif
                          ? <span className="badge badge-warning" style={{ fontSize: 10 }}>Requis</span>
                          : <span className="text-muted" style={{ fontSize: 11 }}>Non</span>}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                        }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: 3,
                            background: t.couleur, flexShrink: 0,
                          }} />
                          {t.couleur}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, maxWidth: 200 }}>
                        <span className="text-muted">
                          {t.description
                            ? (t.description.length > 60
                                ? t.description.slice(0, 60) + '…'
                                : t.description)
                            : '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        {t.actif
                          ? <span className="badge badge-success">Actif</span>
                          : <span className="badge badge-secondary">Inactif</span>}
                      </td>
                      <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-xs btn-outline-primary mr-1"
                          onClick={() => openEdit(t)}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          className={`btn btn-xs btn-outline-${t.actif ? 'danger' : 'success'}`}
                          onClick={() => toggleActif(t)}
                          title={t.actif ? 'Désactiver' : 'Activer'}
                        >
                          <i className={`fas fa-${t.actif ? 'ban' : 'check'}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal création / édition */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-umbrella-beach mr-2" />
                    {editId ? 'Modifier le type de congé' : 'Nouveau type de congé'}
                  </h5>
                  <button type="button" className="close" onClick={() => setShowModal(false)}>
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group col-md-8">
                      <label className="font-weight-bold">
                        Nom <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" name="nom" className="form-control"
                        value={form.nom} onChange={handleChange} required
                        placeholder="ex: Congé annuel"
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">
                        Code <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" name="code" className="form-control"
                        value={form.code} onChange={handleChange} required
                        placeholder="ex: CA"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">Jours par an</label>
                      <input
                        type="number" name="jours_par_an" className="form-control"
                        value={form.jours_par_an} onChange={handleChange}
                        min={1} max={365} required
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">Couleur</label>
                      <div className="d-flex align-items-center">
                        <input
                          type="color" name="couleur" className="form-control p-1 mr-2"
                          value={form.couleur} onChange={handleChange}
                          style={{ width: 50, height: 38 }}
                        />
                        <input
                          type="text" name="couleur" className="form-control"
                          value={form.couleur} onChange={handleChange}
                          pattern="^#[0-9A-Fa-f]{6}$"
                          placeholder="#2E74B5"
                        />
                      </div>
                    </div>
                    <div className="form-group col-md-4 d-flex flex-column justify-content-end">
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input" type="checkbox"
                          id="est_paye" name="est_paye"
                          checked={form.est_paye} onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="est_paye">Congé payé</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input" type="checkbox"
                          id="necessite_justificatif" name="necessite_justificatif"
                          checked={form.necessite_justificatif} onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="necessite_justificatif">
                          Justificatif requis
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="font-weight-bold">Description</label>
                    <textarea
                      name="description" className="form-control" rows={2}
                      value={form.description} onChange={handleChange}
                      placeholder="Description ou instructions pour les employés…"
                    />
                  </div>

                  {editId && (
                    <div className="form-check">
                      <input
                        className="form-check-input" type="checkbox"
                        id="actif_modal" name="actif"
                        checked={form.actif} onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="actif_modal">Type actif</label>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving
                      ? <><i className="fas fa-spinner fa-spin mr-1" />Enregistrement…</>
                      : <><i className="fas fa-save mr-1" />Enregistrer</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </RHLayout>
  )
}
