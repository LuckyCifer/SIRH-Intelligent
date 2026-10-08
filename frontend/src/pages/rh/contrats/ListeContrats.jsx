import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
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

const STATUT_ROW = {
  ACTIF:    '', EXPIRE: 'table-danger', RESILIE: '', EN_COURS: 'table-warning',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function BadgesLegaux({ c }) {
  const { t } = useTranslation()
  const badges = []

  if (c.en_periode_essai) {
    badges.push(
      <span key="essai" className="badge badge-warning d-block mb-1" style={{ fontSize: 9, whiteSpace: 'normal' }}>
        <i className="fas fa-user-clock mr-1" />
        {t('contracts.badge_in_trial', { days: c.jours_essai_restants })}
      </span>
    )
  }

  if (c.type_contrat === 'CDD' && c.renouvellement_numero === 1) {
    badges.push(
      <span key="renouv" className="badge badge-orange d-block mb-1"
        style={{ fontSize: 9, background: '#fd7e14', color: '#fff', whiteSpace: 'normal' }}>
        <i className="fas fa-redo mr-1" />{t('contracts.badge_last_renewal')}
      </span>
    )
  }

  if (c.expire_bientot && c.statut === 'ACTIF') {
    badges.push(
      <span key="expire" className="badge badge-danger d-block mb-1" style={{ fontSize: 9, whiteSpace: 'normal' }}>
        <i className="fas fa-exclamation-triangle mr-1" />
        {t('contracts.badge_expiring', { days: c.jours_restants })}
      </span>
    )
  }

  if (c.avertissements_legaux?.length > 0) {
    badges.push(
      <span key="legal" className="badge badge-danger d-block mb-1"
        style={{ fontSize: 9, whiteSpace: 'normal', cursor: 'help' }}
        title={c.avertissements_legaux.join(' | ')}>
        <i className="fas fa-gavel mr-1" />{t('contracts.badge_noncompliant', { count: c.avertissements_legaux.length })}
      </span>
    )
  }

  return badges.length > 0
    ? <div>{badges}</div>
    : <span className="badge badge-success" style={{ fontSize: 9 }}>
        <i className="fas fa-check mr-1" />{t('contracts.legal_compliant')}
      </span>
}

export default function ListeContrats() {
  const { t } = useTranslation()
  const [contrats,     setContrats]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtreType,   setFiltreType]   = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')

  const STATUT_CONFIG = {
    ACTIF:    { cls: 'badge-success',   label: t('contracts.status_active') },
    EXPIRE:   { cls: 'badge-danger',    label: t('contracts.status_expired') },
    RESILIE:  { cls: 'badge-secondary', label: t('contracts.status_terminated') },
    EN_COURS: { cls: 'badge-warning',   label: t('contracts.status_renewing') },
  }

  function load() {
    const params = new URLSearchParams()
    if (filtreType)   params.append('type',   filtreType)
    if (filtreStatut) params.append('statut', filtreStatut)
    setLoading(true)
    api.get(`/contrats/?${params}`)
      .then(r => setContrats(r.data.results ?? r.data))
      .catch(() => toast.error(t('contracts.load_error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filtreType, filtreStatut]) // eslint-disable-line

  const nbEnEssai  = contrats.filter(c => c.en_periode_essai).length
  const nbExpirant = contrats.filter(c => c.expire_bientot && c.statut === 'ACTIF').length
  const nbNonConf  = contrats.filter(c => (c.avertissements_legaux?.length || 0) > 0).length

  return (
    <RHLayout pageTitle={t('contracts.title')}>
      {(nbExpirant > 0 || nbNonConf > 0) && (
        <div className="row mb-3">
          {nbExpirant > 0 && (
            <div className="col-md-6">
              <div className="alert alert-danger py-2 mb-0">
                <i className="fas fa-exclamation-triangle mr-2" />
                <strong>{nbExpirant}</strong> {t('contracts.alert_expiring', { count: nbExpirant, s: nbExpirant > 1 ? 's' : '' })}
              </div>
            </div>
          )}
          {nbNonConf > 0 && (
            <div className="col-md-6">
              <div className="alert alert-warning py-2 mb-0">
                <i className="fas fa-gavel mr-2" />
                <strong>{nbNonConf}</strong> {t('contracts.alert_legal_warnings', { count: nbNonConf, s: nbNonConf > 1 ? 's' : '' })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="row mb-3">
        <div className="col-md-3">
          <select className="form-control form-control-sm"
            value={filtreType} onChange={e => setFiltreType(e.target.value)}>
            <option value="">{t('contracts.all_types')}</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-control form-control-sm"
            value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">{t('contracts.all_statuses')}</option>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 text-right">
          <Link to="/rh/contrats/nouveau" className="btn btn-primary btn-sm">
            <i className="fas fa-plus mr-1" />{t('contracts.new_contract')}
          </Link>
        </div>
      </div>

      {loading ? (
        <Spinner message={t('contracts.load_error')} />
      ) : (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title">
              <i className="fas fa-file-contract mr-2" />
              {contrats.length} {t('contracts.col_type').toLowerCase()}{contrats.length !== 1 ? 's' : ''}
            </h3>
            {nbEnEssai > 0 && (
              <span className="badge badge-warning" style={{ fontSize: 11 }}>
                <i className="fas fa-user-clock mr-1" />{nbEnEssai} {t('contracts.trial_badge')}
              </span>
            )}
          </div>
          <div className="card-body p-0">
            {contrats.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-file-contract fa-3x mb-3 d-block" />
                {t('contracts.no_contracts')}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{t('contracts.col_employee')}</th>
                      <th>{t('contracts.col_type')}</th>
                      <th>{t('contracts.col_position')}</th>
                      <th>{t('contracts.col_period')}</th>
                      <th className="text-center">{t('contracts.col_notice')}</th>
                      <th>{t('contracts.col_status')}</th>
                      <th>{t('contracts.col_legal')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contrats.map(c => {
                      const typeCfg   = TYPE_CONFIG[c.type_contrat]  || TYPE_CONFIG.CDI
                      const statutCfg = STATUT_CONFIG[c.statut]      || STATUT_CONFIG.ACTIF
                      return (
                        <tr key={c.id} className={STATUT_ROW[c.statut] || ''}>
                          <td className="font-weight-bold" style={{ fontSize: 13 }}>
                            {c.employe_nom}
                            {c.categorie_pro && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                                {c.categorie_pro_display?.split(' — ')[0]}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${typeCfg.cls} d-block mb-1`}>{typeCfg.label}</span>
                            {c.type_contrat === 'CDD' && c.renouvellement_numero > 0 && (
                              <small className="text-muted" style={{ fontSize: 10 }}>
                                {t('contracts.renewal_label', { num: c.renouvellement_numero })}
                              </small>
                            )}
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <div>{c.poste_titre || '—'}</div>
                            <small className="text-muted">{c.departement_nom}</small>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <div>{fmtDate(c.date_debut)}</div>
                            {c.date_fin
                              ? <div className="text-muted">→ {fmtDate(c.date_fin)}</div>
                              : <span className="badge badge-success" style={{ fontSize: 10 }}>CDI</span>}
                          </td>
                          <td className="text-center" style={{ fontSize: 12 }}>
                            {c.duree_preavis_jours
                              ? <span className="badge badge-secondary">{c.duree_preavis_jours}j</span>
                              : '—'}
                          </td>
                          <td>
                            <span className={`badge ${statutCfg.cls}`}>{statutCfg.label}</span>
                          </td>
                          <td style={{ minWidth: 130 }}>
                            <BadgesLegaux c={c} />
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
          <div className="card-footer text-muted" style={{ fontSize: 11 }}>
            <i className="fas fa-balance-scale mr-1" />
            {t('contracts.legal_footer')}
          </div>
        </div>
      )}
    </RHLayout>
  )
}
