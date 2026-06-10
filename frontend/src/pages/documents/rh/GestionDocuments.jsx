import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import { getDocuments, getCategories, uploadDocument, deleteDocument } from '../../../api/documents'
import api from '../../../api/axios'

const VISIBILITES = [
  { value: 'PRIVE',   label: 'Privé (RH)' },
  { value: 'EMPLOYE', label: "Visible par l'employé" },
  { value: 'EQUIPE',  label: "Visible par l'équipe" },
  { value: 'TOUS',    label: 'Visible par tous' },
]

const VIS_CLS = {
  PRIVE: 'badge-dark', EMPLOYE: 'badge-primary',
  EQUIPE: 'badge-info', TOUS: 'badge-success',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const EMPTY_FORM = {
  employe: '', categorie: '', titre: '', description: '',
  visibilite: 'EMPLOYE', date_expiration: '', fichier: null,
}

export default function GestionDocuments() {
  const [docs,       setDocs]       = useState([])
  const [categories, setCategories] = useState([])
  const [employes,   setEmployes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [showForm,   setShowForm]   = useState(false)

  const [form,          setForm]          = useState(EMPTY_FORM)
  const [filtreEmploye, setFiltreEmploye] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreVis,     setFiltreVis]     = useState('')

  async function load() {
    try {
      const [dRes, cRes, uRes] = await Promise.all([
        getDocuments(),
        getCategories(),
        api.get('/accounts/users/'),
      ])
      setDocs(dRes.data.results ?? dRes.data)
      setCategories(cRes.data.results ?? cRes.data)
      setEmployes((uRes.data.results ?? uRes.data).filter(u => u.role === 'EMPLOYE'))
    } catch {
      toast.error('Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleChange(e) {
    const { name, value, files } = e.target
    if (name === 'fichier') setForm(f => ({ ...f, fichier: files[0] }))
    else setForm(f => ({ ...f, [name]: value }))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.categorie || !form.titre.trim() || !form.fichier) {
      toast.error('Catégorie, titre et fichier sont obligatoires.')
      return
    }
    if (form.fichier.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 Mo).')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('categorie',        form.categorie)
      fd.append('titre',            form.titre)
      fd.append('description',      form.description)
      fd.append('visibilite',       form.visibilite)
      fd.append('fichier',          form.fichier)
      if (form.employe)          fd.append('employe',           form.employe)
      if (form.date_expiration)  fd.append('date_expiration',   form.date_expiration)

      await uploadDocument(fd)
      toast.success('Document uploadé avec succès.')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      const data = err.response?.data
      const msg  = data ? Object.values(data).flat().join(' ') : 'Erreur d\'upload.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, titre) {
    if (!window.confirm(`Supprimer "${titre}" ?`)) return
    try {
      await deleteDocument(id)
      toast.success('Document supprimé.')
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  const filtered = docs.filter(d => {
    if (filtreEmploye && String(d.employe) !== filtreEmploye) return false
    if (filtreCategorie && String(d.categorie) !== filtreCategorie) return false
    if (filtreVis && d.visibilite !== filtreVis) return false
    return true
  })

  const expirantBientot = docs.filter(d => d.expire_bientot).length

  if (loading) {
    return (
      <RHLayout pageTitle="Gestion des documents">
        <Spinner message="Chargement…" />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle="Gestion des documents RH">

      {/* Alerte documents expirants */}
      {expirantBientot > 0 && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between mb-3" style={{ fontSize: 13 }}>
          <span>
            <i className="fas fa-exclamation-triangle mr-2" />
            <strong>{expirantBientot}</strong> document{expirantBientot > 1 ? 's' : ''} expire{expirantBientot > 1 ? 'nt' : ''} dans moins de 30 jours.
          </span>
        </div>
      )}

      {/* Bouton upload */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          {docs.length} document{docs.length !== 1 ? 's' : ''} au total
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <i className={`fas fa-${showForm ? 'minus' : 'upload'} mr-1`} />
          {showForm ? 'Masquer le formulaire' : 'Uploader un document'}
        </button>
      </div>

      {/* Formulaire upload */}
      {showForm && (
        <div className="card card-primary card-outline mb-3">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-upload mr-2" />Nouveau document
            </h3>
          </div>
          <form onSubmit={handleUpload} encType="multipart/form-data">
            <div className="card-body">
              <div className="form-row">
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">Employé <span className="text-muted font-weight-normal">(optionnel)</span></label>
                  <select name="employe" className="form-control form-control-sm"
                    value={form.employe} onChange={handleChange}>
                    <option value="">Document général</option>
                    {employes.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">Catégorie <span className="text-danger">*</span></label>
                  <select name="categorie" className="form-control form-control-sm"
                    value={form.categorie} onChange={handleChange} required>
                    <option value="">— Sélectionner —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">Visibilité</label>
                  <select name="visibilite" className="form-control form-control-sm"
                    value={form.visibilite} onChange={handleChange}>
                    {VISIBILITES.map(v => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-6">
                  <label className="font-weight-bold">Titre <span className="text-danger">*</span></label>
                  <input type="text" name="titre" className="form-control form-control-sm"
                    value={form.titre} onChange={handleChange} required
                    placeholder="ex: CDI Alice Mballa 2026" />
                </div>
                <div className="form-group col-md-3">
                  <label className="font-weight-bold">Date expiration</label>
                  <input type="date" name="date_expiration" className="form-control form-control-sm"
                    value={form.date_expiration} onChange={handleChange} />
                </div>
                <div className="form-group col-md-3">
                  <label className="font-weight-bold">Fichier <span className="text-danger">*</span></label>
                  <input type="file" name="fichier" className="form-control-file mt-1"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleChange} required />
                  <small className="text-muted">PDF, DOC, JPG, PNG · max 10 Mo</small>
                </div>
              </div>
              <div className="form-group">
                <label className="font-weight-bold">Description</label>
                <textarea name="description" className="form-control form-control-sm" rows={2}
                  value={form.description} onChange={handleChange}
                  placeholder="Description optionnelle…" />
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin mr-1" />Upload…</>
                  : <><i className="fas fa-cloud-upload-alt mr-1" />Uploader</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div className="card card-outline card-secondary">
        <div className="card-body py-2">
          <div className="form-row">
            <div className="form-group col-md-4 mb-2">
              <label className="text-sm font-weight-bold">Employé</label>
              <select className="form-control form-control-sm"
                value={filtreEmploye} onChange={e => setFiltreEmploye(e.target.value)}>
                <option value="">Tous</option>
                {employes.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-4 mb-2">
              <label className="text-sm font-weight-bold">Catégorie</label>
              <select className="form-control form-control-sm"
                value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}>
                <option value="">Toutes</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-4 mb-2">
              <label className="text-sm font-weight-bold">Visibilité</label>
              <select className="form-control form-control-sm"
                value={filtreVis} onChange={e => setFiltreVis(e.target.value)}>
                <option value="">Toutes</option>
                {VISIBILITES.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-folder mr-2" />
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== docs.length && (
              <span className="text-muted font-weight-normal ml-1">(sur {docs.length})</span>
            )}
          </h3>
        </div>
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-folder-open fa-2x mb-2 d-block" />Aucun document.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Employé</th>
                    <th>Catégorie</th>
                    <th>Taille</th>
                    <th>Visibilité</th>
                    <th>Expiration</th>
                    <th>Uploadé par</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => (
                    <tr key={doc.id} className={doc.expire_bientot ? 'table-warning' : ''}>
                      <td className="font-weight-bold" style={{ fontSize: 12 }}>
                        <i className={`${doc.categorie_detail?.icone || 'fas fa-file'} mr-1`}
                          style={{ color: doc.categorie_detail?.couleur }} />
                        {doc.titre}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {doc.employe_detail?.full_name || doc.employe_detail?.username || (
                          <span className="text-muted">Général</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{doc.categorie_detail?.nom || '—'}</td>
                      <td style={{ fontSize: 11 }}>{doc.taille_lisible}</td>
                      <td>
                        <span className={`badge ${VIS_CLS[doc.visibilite] || 'badge-secondary'}`}
                          style={{ fontSize: 10 }}>
                          {VISIBILITES.find(v => v.value === doc.visibilite)?.label || doc.visibilite}
                        </span>
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {doc.date_expiration ? (
                          <span className={doc.expire_bientot ? 'text-warning font-weight-bold' : ''}>
                            {fmtDate(doc.date_expiration)}
                            {doc.expire_bientot && (
                              <i className="fas fa-exclamation-triangle ml-1 text-warning" />
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {doc.uploade_par_detail?.full_name || '—'}
                      </td>
                      <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                        <a href={doc.fichier} target="_blank" rel="noopener noreferrer"
                          className="btn btn-xs btn-outline-primary mr-1"
                          title="Télécharger">
                          <i className="fas fa-download" />
                        </a>
                        <button
                          className="btn btn-xs btn-outline-danger"
                          onClick={() => handleDelete(doc.id, doc.titre)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </RHLayout>
  )
}
