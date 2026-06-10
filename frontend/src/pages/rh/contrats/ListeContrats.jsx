import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'

const TYPE_CONFIG = {
  CDI:       { cls: 'badge-success',   label: 'CDI' },
  CDD:       { cls: 'badge-primary',   label: 'CDD' },
  STAGE:     { cls: 'badge-warning',   label: 'Stage' },
  FREELANCE: { cls: 'badge-info',      label: 'Freelance' },
  INTERIM:   { cls: 'badge-secondary', label: 'Intérim' },
}

const STATUT_CONFIG = {
  ACTIF:    { cls: 'badge-success',   label: 'Actif',         row: '' },
  EXPIRE:   { cls: 'badge-danger',    label: 'Expiré',        row: 'table-danger' },
  RESILIE:  { cls: 'badge-secondary', label: 'Résilié',       row: '' },
  EN_COURS: { cls: 'badge-warning',   label: 'Renouvellement', row: 'table-warning' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ListeContrats() {
  const [contrats,    setContrats]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filtreType,  setFiltreType]  = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')

  function load() {
    const params = new URLSearchParams()
    if (filtreType)   params.append('type', filtreType)
    if (filtreStatut) params.append('statut', filtreStatut)
    setLoading(true)
    api.get(`/contrats/?${params}`)
      .then(r => setContrats(r.data.results ?? r.data))
      .catch(() => toast.error('Impossible de charger les contrats.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filtreType, filtreStatut])

  return (
    <RHLayout pageTitle="Gestion des Contrats">

      {/* ── Filtres ── */}
      <div className="row mb-3">
        <div className="col-md-3">
          <select className="form-control form-control-sm"
            value={filtreType} onChange={e => setFiltreType(e.target.value)}>
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-control form-control-sm"
            value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 text-right">
          <Link to="/rh/contrats/nouveau" className="btn btn-primary btn-sm">
            <i className="fas fa-plus mr-1" />Nouveau contrat
          </Link>
        </div>
      </div>

      {loading ? (
        <Spinner message="Chargement des contrats…" />
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-file-contract mr-2" />
              {contrats.length} contrat{contrats.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="card-body p-0">
            {contrats.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-file-contract fa-3x mb-3 d-block" />
                Aucun contrat trouvé.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Employé</th>
                      <th>Type</th>
                      <th>Poste / Département</th>
                      <th>Début</th>
                      <th>Fin</th>
                      <th>Expire dans</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contrats.map(c => {
                      const typeCfg   = TYPE_CONFIG[c.type_contrat]   || TYPE_CONFIG.CDI
                      const statutCfg = STATUT_CONFIG[c.statut]       || STATUT_CONFIG.ACTIF
                      return (
                        <tr key={c.id} className={statutCfg.row}>
                          <td className="font-weight-bold" style={{ fontSize: 13 }}>
                            {c.employe_nom}
                          </td>
                          <td>
                            <span className={`badge ${typeCfg.cls}`}>{typeCfg.label}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <div>{c.poste_titre || '—'}</div>
                            <small className="text-muted">{c.departement_nom}</small>
                          </td>
                          <td style={{ fontSize: 12 }}>{fmtDate(c.date_debut)}</td>
                          <td style={{ fontSize: 12 }}>{c.date_fin ? fmtDate(c.date_fin) : <span className="badge badge-success">CDI</span>}</td>
                          <td>
                            {c.jours_restants != null ? (
                              <span className={`badge ${c.expire_bientot ? 'badge-danger' : 'badge-secondary'}`}>
                                {c.jours_restants}j
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={`badge ${statutCfg.cls}`}>{statutCfg.label}</span>
                          </td>
                          <td>
                            <Link to={`/rh/contrats/${c.id}/edit`}
                              className="btn btn-xs btn-outline-secondary" style={{ fontSize: 11 }}>
                              <i className="fas fa-edit" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </RHLayout>
  )
}
