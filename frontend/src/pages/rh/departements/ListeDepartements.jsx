import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'

export default function ListeDepartements() {
  const [departements, setDepartements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [deleting, setDeleting]         = useState(null)

  function load() {
    setLoading(true)
    api.get('/departements/')
      .then(r => setDepartements(r.data.results ?? r.data))
      .catch(() => toast.error('Impossible de charger les départements.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id, nom) {
    if (!window.confirm(`Supprimer le département "${nom}" ?`)) return
    setDeleting(id)
    try {
      await api.delete(`/departements/${id}/`)
      toast.success('Département supprimé.')
      load()
    } catch {
      toast.error('Erreur lors de la suppression.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <RHLayout pageTitle="Départements">
        <Spinner message="Chargement des départements…" />
      </RHLayout>
    )
  }

  const filtered = departements.filter(d =>
    !search ||
    d.nom.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <RHLayout pageTitle="Gestion des Départements">

      {/* ── Toolbar ── */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="input-group input-group-sm">
            <div className="input-group-prepend">
              <span className="input-group-text"><i className="fas fa-search" /></span>
            </div>
            <input type="text" className="form-control"
              placeholder="Rechercher par nom ou code…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="col-md-6 text-right">
          <Link to="/rh/departements/nouveau" className="btn btn-primary btn-sm">
            <i className="fas fa-plus mr-1" />Nouveau département
          </Link>
        </div>
      </div>

      {/* ── Grille ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="fas fa-building fa-3x mb-3 d-block" />
          <p>Aucun département trouvé.</p>
        </div>
      ) : (
        <div className="row">
          {filtered.map(d => (
            <div className="col-xl-3 col-md-4 col-sm-6 mb-4" key={d.id}>
              <div className="card h-100" style={{ borderTop: `4px solid ${d.couleur}`, borderRadius: 10 }}>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      background: d.couleur, color: '#fff', fontSize: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <i className={d.icone} />
                    </div>
                    <div>
                      <div className="font-weight-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {d.nom}
                      </div>
                      <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.code}</code>
                    </div>
                  </div>

                  {d.description && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {d.description.length > 80 ? d.description.slice(0, 80) + '…' : d.description}
                    </p>
                  )}

                  <div className="d-flex justify-content-between align-items-center" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <i className="fas fa-users mr-1" />
                      <strong>{d.nb_employes}</strong> employé{d.nb_employes !== 1 ? 's' : ''}
                    </span>
                    {d.responsable_nom && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        <i className="fas fa-user-tie mr-1" />{d.responsable_nom}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-footer py-2" style={{ background: 'transparent', border: 'none' }}>
                  <div className="btn-group btn-group-sm w-100">
                    <Link to={`/rh/departements/${d.id}`} className="btn btn-outline-primary">
                      <i className="fas fa-eye mr-1" />Détail
                    </Link>
                    <Link to={`/rh/departements/${d.id}/edit`} className="btn btn-outline-secondary">
                      <i className="fas fa-edit mr-1" />Modifier
                    </Link>
                    <button className="btn btn-outline-danger" disabled={deleting === d.id}
                      onClick={() => handleDelete(d.id, d.nom)}>
                      <i className={`fas ${deleting === d.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RHLayout>
  )
}
