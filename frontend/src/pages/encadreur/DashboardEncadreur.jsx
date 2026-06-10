import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import api from '../../api/axios'

const ALERTE_CONFIG = {
  AUCUNE:  { badge: 'badge-success',  icon: 'fas fa-check-circle text-success',  label: 'OK' },
  FAIBLE:  { badge: 'badge-success',  icon: 'fas fa-check-circle text-success',  label: 'Faible' },
  MOYENNE: { badge: 'badge-warning',  icon: 'fas fa-exclamation-circle text-warning', label: 'Moyenne' },
  ELEVEE:  { badge: 'badge-danger',   icon: 'fas fa-times-circle text-danger',   label: 'Élevée' },
}

const STATUT_BADGE = {
  BROUILLON: 'badge-secondary',
  SOUMIS:    'badge-primary',
  VALIDE:    'badge-success',
  REJETE:    'badge-danger',
}

const FILIERE_COLORS = { ISA: '#2E74B5', IT: '#1F3864', GRAPHISME: '#5ba3d9', AUTRE: '#8ba7c0' }

function StatutBadge({ value }) {
  const LABELS = { BROUILLON: 'Brouillon', SOUMIS: 'Soumis', VALIDE: 'Validé', REJETE: 'Rejeté' }
  return <span className={`badge ${STATUT_BADGE[value] || 'badge-secondary'}`}>{LABELS[value] || value}</span>
}

export default function DashboardEncadreur() {
  const [stagiaires, setStagiaires] = useState([])
  const [selected, setSelected]     = useState(null)
  const [rapports, setRapports]     = useState([])
  const [loadingMain, setLoadingMain]       = useState(true)
  const [loadingRapports, setLoadingRapports] = useState(false)
  const [commentaires, setCommentaires] = useState({})
  const [validating, setValidating] = useState(null)

  useEffect(() => {
    api.get('/stagiaires/dashboard/')
      .then(r => setStagiaires(r.data.results ?? r.data))
      .catch(() => toast.error('Impossible de charger les stagiaires.'))
      .finally(() => setLoadingMain(false))
  }, [])

  async function selectStagiaire(s) {
    if (selected?.id === s.id) { setSelected(null); setRapports([]); return }
    setSelected(s)
    setLoadingRapports(true)
    try {
      const r = await api.get(`/rapports/?stagiaire=${s.id}`)
      setRapports(r.data.results ?? r.data)
    } catch {
      toast.error('Erreur lors du chargement des rapports.')
    } finally {
      setLoadingRapports(false)
    }
  }

  async function handleValider(rapportId, action) {
    setValidating(rapportId)
    try {
      await api.post(`/rapports/${rapportId}/valider/`, {
        action,
        commentaire: commentaires[rapportId] || '',
      })
      toast.success(action === 'valider' ? '✓ Rapport validé.' : 'Rapport rejeté.')
      const updated = await api.get(`/rapports/?stagiaire=${selected.id}`)
      setRapports(updated.data.results ?? updated.data)
      setCommentaires(c => { const n = { ...c }; delete n[rapportId]; return n })
    } catch {
      toast.error('Erreur lors de la validation.')
    } finally {
      setValidating(null)
    }
  }

  const nbAlertes = stagiaires.filter(s => ['MOYENNE', 'ELEVEE'].includes(s.niveau_alerte)).length

  if (loadingMain) {
    return (
      <EncadreurLayout pageTitle="Tableau de bord">
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
          <p className="mt-2 text-muted">Chargement des données…</p>
        </div>
      </EncadreurLayout>
    )
  }

  return (
    <EncadreurLayout pageTitle="Tableau de bord Encadreur">

      {/* ── Small Boxes ── */}
      <div className="row">
        <div className="col-lg-4 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stagiaires.length}</h3>
              <p>Stagiaires encadrés</p>
            </div>
            <div className="icon"><i className="fas fa-users" /></div>
            <span className="small-box-footer">
              <i className="fas fa-user-graduate mr-1" />
              En cours de stage
            </span>
          </div>
        </div>

        <div className="col-lg-4 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{nbAlertes}</h3>
              <p>Alertes actives</p>
            </div>
            <div className="icon"><i className="fas fa-exclamation-triangle" /></div>
            <span className="small-box-footer">
              <i className="fas fa-eye mr-1" />
              Nécessitent un suivi
            </span>
          </div>
        </div>

        <div className="col-lg-4 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>
                {stagiaires.length > 0 && stagiaires.some(s => s.dernier_score_ia != null)
                  ? Math.round(
                      stagiaires
                        .filter(s => s.dernier_score_ia != null)
                        .reduce((acc, s) => acc + s.dernier_score_ia, 0) /
                      stagiaires.filter(s => s.dernier_score_ia != null).length
                    )
                  : '—'}
              </h3>
              <p>Score IA moyen / 100</p>
            </div>
            <div className="icon"><i className="fas fa-chart-line" /></div>
            <span className="small-box-footer">
              <i className="fas fa-robot mr-1" />
              Dernière analyse IA
            </span>
          </div>
        </div>
      </div>

      {/* ── Grille des stagiaires ── */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-id-card mr-2" />
                Mes Stagiaires
              </h3>
              <div className="card-tools">
                <button className="btn btn-tool" data-card-widget="collapse">
                  <i className="fas fa-minus" />
                </button>
              </div>
            </div>
            <div className="card-body">
              {stagiaires.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-user-slash fa-2x mb-2 d-block" />
                  Aucun stagiaire assigné.
                </div>
              ) : (
                <div className="row">
                  {stagiaires.map(s => {
                    const cfg = ALERTE_CONFIG[s.niveau_alerte] || ALERTE_CONFIG.AUCUNE
                    const isSelected = selected?.id === s.id
                    return (
                      <div className="col-xl-3 col-lg-4 col-md-6" key={s.id}>
                        <div
                          className={`card mb-3 ${isSelected ? 'card-primary' : ''}`}
                          style={{
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--acerfi-blue)' : '1px solid var(--border-color)',
                            transition: 'all .15s',
                          }}
                          onClick={() => selectStagiaire(s)}
                        >
                          <div className="card-body pb-2">
                            {/* Avatar + nom */}
                            <div className="d-flex align-items-center mb-2">
                              <div className="mr-3" style={{
                                width: 42, height: 42, borderRadius: '50%',
                                background: FILIERE_COLORS[s.filiere] || '#8ba7c0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: 17,
                              }}>
                                {s.nom[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-weight-bold text-sm"
                                  style={{ color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                                  {s.nom}
                                </div>
                                <div className="text-xs text-muted">{s.username}</div>
                              </div>
                            </div>

                            {/* Filière badge */}
                            <span className="badge badge-info mr-1">{s.filiere}</span>

                            {/* Rapport count */}
                            <span className="badge badge-secondary">
                              {s.nb_rapports} rapport{s.nb_rapports !== 1 ? 's' : ''}
                            </span>

                            {/* Score + alerte */}
                            <div className="d-flex justify-content-between align-items-center mt-2">
                              <span style={{ fontSize: 12, color: isSelected ? '#cde' : 'var(--text-secondary)' }}>
                                Score IA :{' '}
                                <strong style={{ color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                                  {s.dernier_score_ia != null ? `${s.dernier_score_ia}/100` : '—'}
                                </strong>
                              </span>
                              <span className={`badge ${cfg.badge}`}>
                                <i className={`${cfg.icon.split(' ').slice(0, 2).join(' ')} mr-1`} />
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rapports du stagiaire sélectionné ── */}
      {selected && (
        <div className="row">
          <div className="col-12">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-file-alt mr-2" />
                  Rapports de <strong>{selected.nom}</strong>
                  <span className="badge badge-info ml-2">{selected.filiere}</span>
                </h3>
                <div className="card-tools">
                  <button className="btn btn-tool" onClick={() => { setSelected(null); setRapports([]) }}>
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                {loadingRapports ? (
                  <div className="text-center py-4">
                    <i className="fas fa-spinner fa-spin text-muted" />
                  </div>
                ) : rapports.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="fas fa-inbox fa-2x mb-2 d-block" />
                    Aucun rapport soumis.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Semaine</th>
                          <th>Période</th>
                          <th>Statut</th>
                          <th>Score IA</th>
                          <th>Synthèse IA</th>
                          <th style={{ minWidth: 280 }}>Action encadreur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rapports.map(r => (
                          <tr key={r.id}>
                            <td className="font-weight-bold text-center">S{r.semaine_numero}</td>
                            <td className="text-sm text-muted">
                              {r.date_debut_semaine} → {r.date_fin_semaine}
                            </td>
                            <td><StatutBadge value={r.statut} /></td>
                            <td className="text-center font-weight-bold"
                              style={{ color: r.analyse_ia ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {r.analyse_ia
                                ? <>
                                    {r.analyse_ia.score_engagement}/100
                                    <br />
                                    <span className={`badge badge-sm ${
                                      ALERTE_CONFIG[r.analyse_ia.niveau_alerte]?.badge || 'badge-secondary'
                                    } mt-1`}>
                                      {ALERTE_CONFIG[r.analyse_ia.niveau_alerte]?.label}
                                    </span>
                                  </>
                                : '—'}
                            </td>
                            <td className="text-sm" style={{ maxWidth: 220 }}>
                              {r.analyse_ia?.synthese
                                ? <span className="text-muted" style={{ fontSize: 12 }}>
                                    {r.analyse_ia.synthese}
                                  </span>
                                : <span className="text-muted">—</span>}
                              {r.commentaire_encadreur && (
                                <div className="alert alert-info p-1 mt-1 mb-0 text-xs">
                                  <i className="fas fa-comment mr-1" />
                                  {r.commentaire_encadreur}
                                </div>
                              )}
                            </td>
                            <td>
                              {r.statut === 'SOUMIS' ? (
                                <div>
                                  <textarea
                                    className="form-control form-control-sm mb-2"
                                    placeholder="Commentaire (optionnel)"
                                    rows={2}
                                    value={commentaires[r.id] || ''}
                                    onChange={e => setCommentaires(c => ({ ...c, [r.id]: e.target.value }))}
                                  />
                                  <div className="btn-group btn-group-sm w-100">
                                    <button
                                      className="btn btn-success"
                                      disabled={validating === r.id}
                                      onClick={() => handleValider(r.id, 'valider')}
                                    >
                                      <i className="fas fa-check mr-1" />
                                      Valider
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      disabled={validating === r.id}
                                      onClick={() => handleValider(r.id, 'rejeter')}
                                    >
                                      <i className="fas fa-times mr-1" />
                                      Rejeter
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted text-sm">
                                  {r.statut === 'VALIDE' && <><i className="fas fa-check-circle text-success mr-1" />Validé</>}
                                  {r.statut === 'REJETE' && <><i className="fas fa-times-circle text-danger mr-1" />Rejeté</>}
                                  {r.statut === 'BROUILLON' && <><i className="fas fa-pencil-alt text-secondary mr-1" />Brouillon</>}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </EncadreurLayout>
  )
}
