import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import ManagerLayout from '../../../components/layout/ManagerLayout'
import Spinner from '../../../components/Spinner'
import CalendrierAbsences from '../../../components/ui/CalendrierAbsences'
import { getDemandes } from '../../../api/conges'

const STATUT_CONFIG = {
  EN_ATTENTE: { cls: 'badge-warning',   label: 'En attente' },
  APPROUVE:   { cls: 'badge-success',   label: 'Approuvé' },
  REFUSE:     { cls: 'badge-danger',    label: 'Refusé' },
  ANNULE:     { cls: 'badge-secondary', label: 'Annulé' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function tempsDepuis(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const j = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  if (j >= 1) return `il y a ${j} jour${j > 1 ? 's' : ''}`
  if (h >= 1) return `il y a ${h}h`
  return 'à l\'instant'
}

function CarteDemande({ d, onAction }) {
  const soldeApres = d.solde_employe != null
    ? (d.solde_employe - d.nb_jours).toFixed(0)
    : null

  return (
    <div className="card mb-3 card-primary card-outline">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div className="font-weight-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              <i className="fas fa-user-circle mr-2" style={{ color: 'var(--acerfi-blue)' }} />
              {d.employe_detail?.full_name || d.employe_detail?.username}
            </div>
            <small className="text-muted">
              {d.employe_detail?.departement_nom || '—'}
            </small>
          </div>
          <span className="badge" style={{
            background: d.type_conge_detail?.couleur || '#2E74B5',
            color: '#fff', fontSize: 12,
          }}>
            {d.type_conge_detail?.nom}
          </span>
        </div>

        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <i className="fas fa-calendar-alt mr-2" style={{ color: 'var(--acerfi-blue)' }} />
          Du <strong>{fmtDate(d.date_debut)}</strong> au <strong>{fmtDate(d.date_fin)}</strong>
          <span className="badge badge-secondary ml-2">{d.nb_jours}j</span>
        </div>

        {d.created_at && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <i className="fas fa-clock mr-1" />Soumis {tempsDepuis(d.created_at)}
          </div>
        )}

        {d.motif && (
          <div className="text-muted mb-2" style={{ fontSize: 12, fontStyle: 'italic' }}>
            « {d.motif.length > 100 ? d.motif.slice(0, 100) + '…' : d.motif} »
          </div>
        )}

        {soldeApres !== null && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Après approbation : <strong className={soldeApres < 0 ? 'text-danger' : ''}>
              {soldeApres}j restants
            </strong>
          </div>
        )}
      </div>

      {d.statut === 'EN_ATTENTE' && (
        <div className="card-footer py-2" style={{ background: 'transparent' }}>
          <div className="btn-group btn-group-sm w-100">
            <Link to={`/manager/conges/${d.id}/valider?action=approuver`} className="btn btn-success">
              <i className="fas fa-check mr-1" />Approuver
            </Link>
            <Link to={`/manager/conges/${d.id}/valider?action=refuser`} className="btn btn-danger">
              <i className="fas fa-times mr-1" />Refuser
            </Link>
          </div>
        </div>
      )}

      {d.statut !== 'EN_ATTENTE' && (
        <div className="card-footer py-1" style={{ background: 'transparent' }}>
          <span className={`badge ${STATUT_CONFIG[d.statut]?.cls}`}>
            {STATUT_CONFIG[d.statut]?.label}
          </span>
          {d.commentaire_valideur && (
            <span className="text-muted ml-2" style={{ fontSize: 11 }}>
              — {d.commentaire_valideur}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function CongesEquipe() {
  const annee   = new Date().getFullYear()
  const [demandes, setDemandes]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [activeTab, setActiveTab] = useState('en_attente')
  const [showCal,   setShowCal]   = useState(false)

  async function load() {
    try {
      const res = await getDemandes({ annee })
      setDemandes(res.data.results ?? res.data)
    } catch {
      toast.error('Impossible de charger les congés.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <ManagerLayout pageTitle="Congés de mon équipe">
        <Spinner message="Chargement des demandes…" />
      </ManagerLayout>
    )
  }

  const tabs = [
    { key: 'en_attente', label: 'En attente', filter: d => d.statut === 'EN_ATTENTE' },
    { key: 'approuve',   label: 'Approuvés',  filter: d => d.statut === 'APPROUVE' },
    { key: 'refuse',     label: 'Refusés',    filter: d => d.statut === 'REFUSE' },
    { key: 'tous',       label: 'Tous',       filter: () => true },
  ]

  const activeFilter = tabs.find(t => t.key === activeTab)?.filter ?? (() => true)
  const filtered     = demandes.filter(activeFilter)
  const nbAttente    = demandes.filter(d => d.statut === 'EN_ATTENTE').length
  const approuves    = demandes.filter(d => d.statut === 'APPROUVE')

  return (
    <ManagerLayout pageTitle="Congés de mon équipe">

      {/* Résumé */}
      {nbAttente > 0 && (
        <div className="alert alert-warning py-2 mb-3" style={{ fontSize: 13 }}>
          <i className="fas fa-hourglass-half mr-2" />
          <strong>{nbAttente}</strong> demande{nbAttente > 1 ? 's' : ''} en attente de validation.
        </div>
      )}

      {/* Onglets */}
      <ul className="nav nav-tabs mb-0">
        {tabs.map(t => {
          const count = demandes.filter(t.filter).length
          return (
            <li className="nav-item" key={t.key}>
              <button
                className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {count > 0 && (
                  <span className={`badge ml-1 ${t.key === 'en_attente' && count > 0 ? 'badge-danger' : 'badge-secondary'}`}>
                    {count}
                  </span>
                )}
              </button>
            </li>
          )
        })}
        <li className="nav-item ml-auto">
          <button
            className={`nav-link ${showCal ? 'active' : ''}`}
            onClick={() => setShowCal(c => !c)}
          >
            <i className="fas fa-calendar-alt mr-1" />Calendrier
          </button>
        </li>
      </ul>

      {/* Calendrier */}
      {showCal && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <div className="card-body">
            <CalendrierAbsences demandes={approuves} />
          </div>
        </div>
      )}

      {/* Liste */}
      {!showCal && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <div className="card-body">
            {filtered.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-check-double fa-2x mb-2 d-block text-success" />
                Aucune demande dans cet onglet.
              </div>
            ) : (
              <div className="row">
                {filtered.map(d => (
                  <div className="col-md-6" key={d.id}>
                    <CarteDemande d={d} onAction={load} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ManagerLayout>
  )
}
