import { useState, useEffect } from 'react'
import EmployeLayout from '../../components/layout/EmployeLayout'
import Spinner from '../../components/Spinner'
import useAuthStore from '../../store/authStore'
import api from '../../api/axios'

const TYPE_CONFIG = {
  CDI:       { cls: 'badge-success', label: 'CDI — Durée Indéterminée' },
  CDD:       { cls: 'badge-primary', label: 'CDD — Durée Déterminée' },
  STAGE:     { cls: 'badge-warning', label: 'Convention de Stage' },
  FREELANCE: { cls: 'badge-info',    label: 'Contrat Freelance' },
  INTERIM:   { cls: 'badge-secondary', label: "Contrat d'Intérim" },
}

const STATUT_CONFIG = {
  ACTIF:    { cls: 'badge-success', label: 'Actif' },
  EXPIRE:   { cls: 'badge-danger',  label: 'Expiré' },
  RESILIE:  { cls: 'badge-secondary', label: 'Résilié' },
  EN_COURS: { cls: 'badge-warning', label: 'En cours de renouvellement' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtSalaire(s) {
  if (!s) return '—'
  return new Intl.NumberFormat('fr-FR').format(s) + ' FCFA'
}

export default function MonContrat() {
  const { user } = useAuthStore()
  const [contrat, setContrat] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contrats/?statut=ACTIF')
      .then(r => {
        const data = r.data.results ?? r.data
        setContrat(Array.isArray(data) && data.length > 0 ? data[0] : null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <EmployeLayout pageTitle="Mon contrat" breadcrumb={{ to: '/employe/dashboard', label: 'Tableau de bord' }}>
        <Spinner message="Chargement de votre contrat…" />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout pageTitle="Mon contrat" breadcrumb={{ to: '/employe/dashboard', label: 'Tableau de bord' }}>
      {!contrat ? (
        <div className="text-center py-5">
          <i className="fas fa-file-contract fa-3x mb-3 d-block text-muted" />
          <h5 style={{ color: 'var(--text-primary)' }}>Aucun contrat actif</h5>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Votre contrat n'est pas encore enregistré dans le système.<br />
            Contactez votre responsable RH pour plus d'informations.
          </p>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-8">
            <div className="card card-primary card-outline">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="fas fa-file-contract mr-2" />
                  Détails de votre contrat
                </h3>
                <div>
                  <span className={`badge ${TYPE_CONFIG[contrat.type_contrat]?.cls || 'badge-secondary'} mr-2`}>
                    {TYPE_CONFIG[contrat.type_contrat]?.label || contrat.type_contrat}
                  </span>
                  <span className={`badge ${STATUT_CONFIG[contrat.statut]?.cls || 'badge-secondary'}`}>
                    {STATUT_CONFIG[contrat.statut]?.label || contrat.statut}
                  </span>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-sm table-borderless" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>
                        <i className="fas fa-building mr-2" />Département
                      </td>
                      <td className="font-weight-bold">{contrat.departement_nom || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-briefcase mr-2" />Poste</td>
                      <td className="font-weight-bold">{contrat.poste_titre || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-calendar-check mr-2" />Date de début</td>
                      <td>{fmtDate(contrat.date_debut)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-calendar-times mr-2" />Date de fin</td>
                      <td>
                        {contrat.date_fin ? fmtDate(contrat.date_fin) : (
                          <span className="badge badge-success">CDI — Sans limite</span>
                        )}
                      </td>
                    </tr>
                    {contrat.salaire && (
                      <tr>
                        <td className="text-muted"><i className="fas fa-money-bill mr-2" />Salaire mensuel brut</td>
                        <td className="font-weight-bold">{fmtSalaire(contrat.salaire)}</td>
                      </tr>
                    )}
                    {contrat.jours_restants != null && (
                      <tr>
                        <td className="text-muted"><i className="fas fa-hourglass-half mr-2" />Jours restants</td>
                        <td>
                          <span className={`badge ${contrat.expire_bientot ? 'badge-danger' : 'badge-info'}`}>
                            {contrat.jours_restants} jour{contrat.jours_restants > 1 ? 's' : ''}
                          </span>
                          {contrat.expire_bientot && (
                            <span className="text-danger ml-2" style={{ fontSize: 12 }}>
                              <i className="fas fa-exclamation-triangle mr-1" />Expire bientôt
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {contrat.notes && (
                  <div className="alert alert-info py-2 mt-2" style={{ fontSize: 12 }}>
                    <i className="fas fa-info-circle mr-1" />
                    {contrat.notes}
                  </div>
                )}
              </div>
              {contrat.document && (
                <div className="card-footer">
                  <a href={contrat.document} target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary">
                    <i className="fas fa-download mr-1" />Télécharger mon contrat (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-user-tie mr-2" />Informations
                </h3>
              </div>
              <div className="card-body" style={{ fontSize: 13 }}>
                <p className="text-muted mb-1">Nom complet</p>
                <p className="font-weight-bold">{user?.first_name} {user?.last_name}</p>
                <p className="text-muted mb-1 mt-2">Identifiant</p>
                <p><code>{user?.username}</code></p>
                <p className="text-muted mb-1 mt-2">Email</p>
                <p>{user?.email || '—'}</p>
                <hr />
                <p className="text-muted" style={{ fontSize: 11 }}>
                  <i className="fas fa-lock mr-1" />
                  Pour toute modification de contrat, contactez votre responsable RH.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployeLayout>
  )
}
