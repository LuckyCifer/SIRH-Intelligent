import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import RHLayout from '../../components/layout/RHLayout'
import Spinner from '../../components/Spinner'
import { getRapportDetail } from '../../api/rapportIA'

const NIVEAU_CLS  = { CRITIQUE: 'badge-danger', IMPORTANT: 'badge-warning', INFO: 'badge-info' }
const PRIO_STYLE  = { HAUTE: '#DC3545', MOYENNE: '#FD7E14', BASSE: '#28A745' }
const TENDANCE_ICON = { HAUSSE: 'fas fa-arrow-up text-success', STABLE: 'fas fa-minus text-info', BAISSE: 'fas fa-arrow-down text-danger' }

function ScoreCircle({ score }) {
  const color = score >= 85 ? '#28A745' : score >= 70 ? '#5ba3d9' : score >= 55 ? '#FD7E14' : '#DC3545'
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Bon' : score >= 55 ? 'Correct' : 'Fragile'
  return (
    <div className="d-flex align-items-center">
      <div style={{
        width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
        border: `5px solid ${color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--card-bg)',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>/100</span>
      </div>
      <div className="ml-3">
        <div style={{ fontWeight: 700, color, fontSize: 16 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score santé RH</div>
      </div>
    </div>
  )
}

function MetriqueCard({ label, valeur, icon, color = 'var(--acerfi-blue)' }) {
  return (
    <div className="col-6 col-md-3 mb-3">
      <div className="p-3 rounded text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <i className={`${icon} fa-lg mb-1`} style={{ color }} />
        <div style={{ fontSize: 20, fontWeight: 700, color }}>{valeur}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function DetailRapport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rapport,   setRapport]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showData,  setShowData]  = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await getRapportDetail(id)
        setRapport(res.data)
      } catch {
        toast.error('Rapport introuvable.', { id: 'rapport-detail-error' })
        navigate('/rh/rapport-ia')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  if (loading) {
    return (
      <RHLayout pageTitle="Détail du rapport IA">
        <Spinner message="Chargement du rapport…" />
      </RHLayout>
    )
  }

  if (!rapport) return null

  const d = rapport.donnees_collectees || {}
  const score = Math.round(rapport.score_sante_rh)

  return (
    <RHLayout pageTitle={`Rapport IA — ${rapport.periode}`}>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <Link to="/rh/rapport-ia" className="btn btn-sm btn-outline-secondary mr-3">
            <i className="fas fa-arrow-left mr-1" />Retour
          </Link>
          <ScoreCircle score={score} />
        </div>
        <div className="text-right">
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Généré le {new Date(rapport.created_at).toLocaleDateString('fr-FR')}
          </div>
          {rapport.genere_par_nom && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Par {rapport.genere_par_nom}
            </div>
          )}
        </div>
      </div>

      {/* Résumé exécutif */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-file-alt mr-2" style={{ color: 'var(--acerfi-blue)' }} />
            Résumé exécutif
          </h3>
          {rapport.indicateurs_cles?.tendance && (
            <div className="card-tools">
              <i className={TENDANCE_ICON[rapport.indicateurs_cles.tendance] || ''} />
              <span className="ml-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {rapport.indicateurs_cles.tendance}
              </span>
            </div>
          )}
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.8 }}>
            {rapport.resume_executif || '—'}
          </p>
          {rapport.indicateurs_cles && (
            <div className="row mt-3">
              <div className="col-md-6 mb-2">
                <div className="p-3 rounded" style={{ background: 'rgba(40,167,69,.08)', border: '1px solid rgba(40,167,69,.2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#28A745', textTransform: 'uppercase' }}>
                    <i className="fas fa-check-circle mr-1" />Point fort
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                    {rapport.indicateurs_cles.point_fort}
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-2">
                <div className="p-3 rounded" style={{ background: 'rgba(253,126,20,.08)', border: '1px solid rgba(253,126,20,.2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#FD7E14', textTransform: 'uppercase' }}>
                    <i className="fas fa-eye mr-1" />Point de vigilance
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                    {rapport.indicateurs_cles.point_vigilance}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métriques collectées */}
      {d.nb_employes !== undefined && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-database mr-2" style={{ color: 'var(--acerfi-blue)' }} />
              Données collectées — {rapport.periode}
            </h3>
          </div>
          <div className="card-body">
            <div className="row">
              <MetriqueCard label="Employés actifs"      valeur={d.nb_employes || 0}             icon="fas fa-users"          color="var(--acerfi-blue)" />
              <MetriqueCard label="Taux présence"         valeur={`${d.presences?.taux_presence ?? '—'}%`} icon="fas fa-fingerprint"  color="#28A745" />
              <MetriqueCard label="Congés ce mois"        valeur={d.conges?.total ?? 0}            icon="fas fa-umbrella-beach" color="#5ba3d9" />
              <MetriqueCard label="Objectifs atteints"    valeur={`${d.objectifs?.taux_atteinte ?? '—'}%`} icon="fas fa-bullseye"     color="#FD7E14" />
              <MetriqueCard label="Formations actives"    valeur={d.formations?.en_cours ?? 0}     icon="fas fa-graduation-cap" color="#7B2D8B" />
              <MetriqueCard label="Postes ouverts"        valeur={d.recrutements?.postes_ouverts ?? 0} icon="fas fa-user-plus"  color="#17A2B8" />
              <MetriqueCard label="Masse salariale nette" valeur={d.paie?.masse_nette ? `${Math.round(d.paie.masse_nette / 1000)}k` : '—'} icon="fas fa-coins" color="#6C757D" />
              <MetriqueCard label="Sanctions ce mois"     valeur={d.sanctions?.ce_mois ?? 0}       icon="fas fa-gavel"          color="#DC3545" />
            </div>
          </div>
        </div>
      )}

      {/* Alertes */}
      {(rapport.alertes_ia || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-exclamation-triangle mr-2 text-warning" />
              Alertes IA ({rapport.alertes_ia.length})
            </h3>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {rapport.alertes_ia.map((a, i) => (
                <li key={i} className="list-group-item" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="d-flex align-items-start">
                    <span className={`badge ${NIVEAU_CLS[a.niveau] || 'badge-secondary'} mr-2 mt-1`}>{a.niveau}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{a.titre}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.detail}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recommandations */}
      {(rapport.recommandations || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-lightbulb mr-2" style={{ color: 'var(--acerfi-blue)' }} />
              Recommandations ({rapport.recommandations.length})
            </h3>
          </div>
          <div className="card-body">
            <div className="row">
              {rapport.recommandations.map((r, i) => (
                <div key={i} className="col-md-6 mb-3">
                  <div className="p-3 rounded h-100" style={{
                    border: `1px solid ${PRIO_STYLE[r.priorite] || 'var(--border-color)'}22`,
                    background: 'var(--card-bg)',
                  }}>
                    <div className="d-flex align-items-center mb-2">
                      <span className="badge mr-2" style={{ background: PRIO_STYLE[r.priorite] || '#6C757D', color: '#fff', fontSize: 10 }}>
                        {r.priorite}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{r.titre}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 0 }}>{r.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rapport complet */}
      {rapport.contenu_rapport && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-align-left mr-2" />Rapport complet
            </h3>
          </div>
          <div className="card-body">
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 13, color: 'var(--text-primary)',
              background: 'var(--card-bg)', border: 'none', padding: 0, margin: 0,
              fontFamily: 'inherit', lineHeight: 1.7,
            }}>
              {rapport.contenu_rapport}
            </pre>
          </div>
        </div>
      )}

      {/* Données brutes (expandable) */}
      <div className="card">
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowData(v => !v)}>
          <h3 className="card-title" style={{ color: 'var(--text-muted)' }}>
            <i className="fas fa-code mr-2" />
            Données brutes collectées
          </h3>
          <div className="card-tools">
            <i className={`fas fa-chevron-${showData ? 'up' : 'down'}`} />
          </div>
        </div>
        {showData && (
          <div className="card-body p-0">
            <pre style={{
              margin: 0, padding: 16, fontSize: 11,
              color: 'var(--text-muted)', background: 'var(--card-bg)',
              maxHeight: 400, overflow: 'auto',
            }}>
              {JSON.stringify(rapport.donnees_collectees, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </RHLayout>
  )
}
