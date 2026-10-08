import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import RHLayout from '../../components/layout/RHLayout'
import Spinner from '../../components/Spinner'
import { getDernierRapport, getHistoriqueRapports } from '../../api/rapportIA'

const NIVEAU_CLS = { CRITIQUE: 'badge-danger', IMPORTANT: 'badge-warning', INFO: 'badge-info' }
const PRIO_CLS   = { HAUTE: 'text-danger', MOYENNE: 'text-warning', BASSE: 'text-success' }
const TENDANCE_ICON = { HAUSSE: 'fas fa-arrow-up text-success', STABLE: 'fas fa-minus text-info', BAISSE: 'fas fa-arrow-down text-danger' }

function ScoreGauge({ score, label, sublabel }) {
  const color = score >= 85 ? '#28A745' : score >= 70 ? '#5ba3d9' : score >= 55 ? '#FD7E14' : '#DC3545'
  return (
    <div className="text-center py-3">
      <div style={{
        width: 120, height: 120, borderRadius: '50%', margin: '0 auto',
        border: `8px solid ${color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--card-bg)',
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
      </div>
      <div className="mt-2" style={{ fontWeight: 600, color, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sublabel}</div>
    </div>
  )
}

export default function TableauBordIA() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [dernier,   setDernier]   = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [dRes, hRes] = await Promise.allSettled([
        getDernierRapport(),
        getHistoriqueRapports({ type_rapport: 'GLOBAL' }),
      ])
      if (dRes.status === 'fulfilled') setDernier(dRes.value.data)
      else console.error('dernier rapport:', dRes.reason)
      if (hRes.status === 'fulfilled') {
        const items = hRes.value.data.results ?? hRes.value.data
        setHistorique(items)
      } else {
        console.error('historique:', hRes.reason)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <RHLayout pageTitle={t('rapport_ia.title')}>
        <Spinner message={t('common.loading')} />
      </RHLayout>
    )
  }

  const chartData = [...historique]
    .sort((a, b) => a.annee !== b.annee ? a.annee - b.annee : a.mois - b.mois)
    .map(r => ({ name: `${r.annee}-${String(r.mois).padStart(2, '0')}`, score: r.score_sante_rh }))

  const getScoreLabel = (score) =>
    score >= 85 ? t('rapport_ia.score_labels.excellent')
    : score >= 70 ? t('rapport_ia.score_labels.bon')
    : score >= 55 ? t('rapport_ia.score_labels.correct')
    : t('rapport_ia.score_labels.fragile')

  const getNiveauLabel = (niveau) => {
    const map = { CRITIQUE: t('rapport_ia.level_critical'), IMPORTANT: t('rapport_ia.level_important'), INFO: t('rapport_ia.level_info') }
    return map[niveau] || niveau
  }

  return (
    <RHLayout pageTitle={t('rapport_ia.title')}>

      {/* En-tête actions */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="mb-0" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {t('rapport_ia.subtitle')}
        </p>
        <Link to="/rh/rapport-ia/generer" className="btn btn-primary btn-sm">
          <i className="fas fa-robot mr-1" />{t('rapport_ia.generate')}
        </Link>
      </div>

      {!dernier ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-chart-line fa-3x mb-3" style={{ color: 'var(--acerfi-blue)' }} />
            <h5 style={{ color: 'var(--text-primary)' }}>{t('rapport_ia.no_report')}</h5>
            <p style={{ color: 'var(--text-muted)' }}>{t('rapport_ia.generate_first')}</p>
            <Link to="/rh/rapport-ia/generer" className="btn btn-primary">
              <i className="fas fa-robot mr-1" />{t('rapport_ia.generate')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Score + Indicateurs */}
          <div className="row">
            <div className="col-lg-3 col-md-4">
              <div className="card">
                <div className="card-body">
                  <ScoreGauge
                    score={Math.round(dernier.score_sante_rh)}
                    label={getScoreLabel(Math.round(dernier.score_sante_rh))}
                    sublabel={t('rapport_ia.score_sante')}
                  />
                  <hr style={{ borderColor: 'var(--border-color)' }} />
                  <div className="text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('rapport_ia.report_prefix')} {dernier.periode}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-9 col-md-8">
              <div className="card h-100">
                <div className="card-header">
                  <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-file-alt mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                    {t('rapport_ia.executive_summary')}
                  </h3>
                  <div className="card-tools">
                    {dernier.indicateurs_cles?.tendance && (
                      <i className={TENDANCE_ICON[dernier.indicateurs_cles.tendance] || 'fas fa-minus text-info'} />
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.7 }}>
                    {dernier.resume_executif || t('common.no_data')}
                  </p>
                  {dernier.indicateurs_cles && (
                    <div className="row mt-2">
                      <div className="col-6">
                        <div className="p-2 rounded" style={{ background: 'rgba(40,167,69,.1)', border: '1px solid rgba(40,167,69,.3)' }}>
                          <div style={{ fontSize: 10, color: '#28A745', fontWeight: 700, textTransform: 'uppercase' }}>{t('rapport_ia.strength')}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{dernier.indicateurs_cles.point_fort}</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 rounded" style={{ background: 'rgba(253,126,20,.1)', border: '1px solid rgba(253,126,20,.3)' }}>
                          <div style={{ fontSize: 10, color: '#FD7E14', fontWeight: 700, textTransform: 'uppercase' }}>{t('rapport_ia.vigilance')}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{dernier.indicateurs_cles.point_vigilance}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-right">
                    <Link to={`/rh/rapport-ia/${dernier.id}`} className="btn btn-xs btn-outline-primary">
                      <i className="fas fa-eye mr-1" />{t('rapport_ia.view_full')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alertes + Recommandations */}
          <div className="row">
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-exclamation-triangle mr-2 text-warning" />
                    {t('rapport_ia.ia_alerts')} ({(dernier.alertes_ia || []).length})
                  </h3>
                </div>
                <div className="card-body p-0">
                  {(dernier.alertes_ia || []).length === 0 ? (
                    <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>
                      <i className="fas fa-check-circle mr-1 text-success" />{t('rapport_ia.no_alerts')}
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {(dernier.alertes_ia || []).map((a, i) => (
                        <li key={i} className="list-group-item" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                          <div className="d-flex align-items-start">
                            <span className={`badge ${NIVEAU_CLS[a.niveau] || 'badge-secondary'} mr-2 mt-1`}>
                              {getNiveauLabel(a.niveau)}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{a.titre}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.detail}</div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-lightbulb mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                    {t('rapport_ia.recommendations')} ({(dernier.recommandations || []).length})
                  </h3>
                </div>
                <div className="card-body p-0">
                  {(dernier.recommandations || []).length === 0 ? (
                    <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>
                      {t('rapport_ia.no_recommendations')}
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {(dernier.recommandations || []).map((r, i) => (
                        <li key={i} className="list-group-item" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                          <div className="d-flex align-items-start">
                            <i className={`fas fa-circle mr-2 mt-1 ${PRIO_CLS[r.priorite] || ''}`} style={{ fontSize: 8 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.titre}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.action}</div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Évolution + Historique */}
      {chartData.length > 1 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-chart-line mr-2" style={{ color: 'var(--acerfi-blue)' }} />
              {t('rapport_ia.score_evolution')}
            </h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 6 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="score" stroke="var(--acerfi-blue)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {historique.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-history mr-2" />{t('rapport_ia.history')}
            </h3>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-bordered mb-0">
                <thead>
                  <tr>
                    <th>{t('rapport_ia.col_period')}</th>
                    <th>{t('rapport_ia.col_type')}</th>
                    <th className="text-center">{t('rapport_ia.col_score')}</th>
                    <th>{t('rapport_ia.col_trend')}</th>
                    <th className="text-center">{t('rapport_ia.col_alerts')}</th>
                    <th className="text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map(r => {
                    const color = r.score_sante_rh >= 85 ? '#28A745' : r.score_sante_rh >= 70 ? '#5ba3d9' : r.score_sante_rh >= 55 ? '#FD7E14' : '#DC3545'
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.periode}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.type_rapport}</td>
                        <td className="text-center">
                          <span style={{ color, fontWeight: 700 }}>{Math.round(r.score_sante_rh)}/100</span>
                        </td>
                        <td>
                          {r.indicateurs_cles?.tendance && (
                            <i className={TENDANCE_ICON[r.indicateurs_cles.tendance] || ''} />
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge badge-secondary">{(r.alertes_ia || []).length}</span>
                        </td>
                        <td className="text-center">
                          <Link to={`/rh/rapport-ia/${r.id}`} className="btn btn-xs btn-outline-primary">
                            <i className="fas fa-eye" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </RHLayout>
  )
}
