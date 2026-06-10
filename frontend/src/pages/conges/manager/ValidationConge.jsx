import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ManagerLayout from '../../../components/layout/ManagerLayout'
import Spinner from '../../../components/Spinner'
import { getDemande, approuverConge, refuserConge } from '../../../api/conges'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function ValidationConge() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const action = searchParams.get('action') || 'approuver'
  const isApprouver = action === 'approuver'

  const [demande,     setDemande]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [commentaire, setCommentaire] = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    getDemande(id)
      .then(r => {
        const d = r.data
        if (d.statut !== 'EN_ATTENTE') {
          toast.error('Cette demande n\'est plus en attente.')
          navigate('/manager/conges')
        } else {
          setDemande(d)
        }
      })
      .catch(() => {
        toast.error('Demande introuvable.')
        navigate('/manager/conges')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleConfirm() {
    if (!isApprouver && !commentaire.trim()) {
      toast.error('Un commentaire est obligatoire en cas de refus.')
      return
    }
    setSaving(true)
    try {
      if (isApprouver) {
        await approuverConge(id, { commentaire })
        toast.success('✅ Congé approuvé avec succès !')
      } else {
        await refuserConge(id, { commentaire })
        toast.success('Congé refusé.')
      }
      navigate('/manager/conges')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ManagerLayout pageTitle="Validation de congé">
        <Spinner message="Chargement de la demande…" />
      </ManagerLayout>
    )
  }

  if (!demande) return null

  const d = demande
  const empNom   = d.employe_detail?.full_name || d.employe_detail?.username || '—'
  const typeNom  = d.type_conge_detail?.nom    || '—'
  const couleur  = d.type_conge_detail?.couleur || '#2E74B5'

  return (
    <ManagerLayout
      pageTitle={isApprouver ? 'Approuver un congé' : 'Refuser un congé'}
    >
      <div className="row">

        {/* Formulaire de validation */}
        <div className="col-md-7">
          <div className={`card card-${isApprouver ? 'success' : 'danger'} card-outline`}>
            <div className="card-header">
              <h3 className="card-title">
                <i className={`fas fa-${isApprouver ? 'check-circle text-success' : 'times-circle text-danger'} mr-2`} />
                {isApprouver ? 'Confirmer l\'approbation' : 'Confirmer le refus'}
              </h3>
            </div>

            <div className="card-body">
              {/* Résumé de la demande */}
              <div className="callout callout-info mb-4">
                <div className="mb-2">
                  <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                    <i className="fas fa-user-circle mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                    {empNom}
                  </strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span className="badge mr-2" style={{ background: couleur, color: '#fff' }}>
                    {typeNom}
                  </span>
                  <i className="fas fa-calendar-alt mr-1" />
                  Du <strong>{fmtDate(d.date_debut)}</strong> au <strong>{fmtDate(d.date_fin)}</strong>
                  <span className="badge badge-secondary ml-2">{d.nb_jours} jour{d.nb_jours > 1 ? 's' : ''}</span>
                </div>
                {d.motif && (
                  <div className="mt-2 text-muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                    « {d.motif} »
                  </div>
                )}
              </div>

              {/* Champ commentaire */}
              <div className="form-group">
                <label className="font-weight-bold">
                  Commentaire{' '}
                  {!isApprouver
                    ? <span className="text-danger">*</span>
                    : <span className="text-muted font-weight-normal ml-1">(optionnel)</span>
                  }
                </label>
                {!isApprouver && (
                  <p className="text-muted mb-2" style={{ fontSize: 12 }}>
                    <i className="fas fa-info-circle mr-1" />
                    Précisez la raison du refus — l'employé sera informé.
                  </p>
                )}
                <textarea
                  className="form-control"
                  rows={3}
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  placeholder={
                    isApprouver
                      ? 'Ajouter un commentaire pour l\'employé (optionnel)…'
                      : 'Raison du refus (obligatoire)…'
                  }
                />
              </div>
            </div>

            <div className="card-footer d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/manager/conges')}
                disabled={saving}
              >
                <i className="fas fa-arrow-left mr-1" />Retour
              </button>
              <button
                type="button"
                className={`btn btn-${isApprouver ? 'success' : 'danger'}`}
                disabled={saving || (!isApprouver && !commentaire.trim())}
                onClick={handleConfirm}
              >
                {saving ? (
                  <><i className="fas fa-spinner fa-spin mr-1" />Traitement…</>
                ) : isApprouver ? (
                  <><i className="fas fa-check mr-1" />Confirmer l'approbation</>
                ) : (
                  <><i className="fas fa-times mr-1" />Confirmer le refus</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Détails résumé */}
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">
                <i className="fas fa-clipboard-list mr-1 text-info" />Détails de la demande
              </h3>
            </div>
            <div className="card-body p-0">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12, width: '40%' }}>Employé</td>
                    <td className="font-weight-bold pr-3" style={{ fontSize: 12 }}>{empNom}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>Type de congé</td>
                    <td className="pr-3">
                      <span className="badge" style={{ background: couleur, color: '#fff', fontSize: 11 }}>
                        {typeNom}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>Début</td>
                    <td className="pr-3" style={{ fontSize: 12 }}>{fmtDate(d.date_debut)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>Fin</td>
                    <td className="pr-3" style={{ fontSize: 12 }}>{fmtDate(d.date_fin)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>Durée</td>
                    <td className="font-weight-bold pr-3" style={{ fontSize: 12 }}>
                      {d.nb_jours} jour{d.nb_jours > 1 ? 's' : ''} ouvrable{d.nb_jours > 1 ? 's' : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted pl-3" style={{ fontSize: 12 }}>Statut</td>
                    <td className="pr-3">
                      <span className="badge badge-warning" style={{ fontSize: 11 }}>
                        <i className="fas fa-hourglass-half mr-1" />En attente
                      </span>
                    </td>
                  </tr>
                  {d.motif && (
                    <tr>
                      <td className="text-muted pl-3" style={{ fontSize: 12, verticalAlign: 'top' }}>Motif</td>
                      <td className="text-muted pr-3" style={{ fontSize: 12, fontStyle: 'italic' }}>
                        {d.motif}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!isApprouver && (
            <div className="alert alert-warning py-2 mt-2" style={{ fontSize: 12 }}>
              <i className="fas fa-exclamation-triangle mr-1" />
              <strong>Attention :</strong> Un refus est définitif. L'employé sera informé du motif saisi.
            </div>
          )}
        </div>

      </div>
    </ManagerLayout>
  )
}
