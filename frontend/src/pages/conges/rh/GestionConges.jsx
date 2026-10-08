import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import CalendrierAbsences from '../../../components/ui/CalendrierAbsences'
import { getDemandes, getTypesConge, getStatsConges, getSoldeDetaille } from '../../../api/conges'
import { useApercu } from '../../../components/ui/useApercu'
import { chargerTout } from '../../../api/listes'

// ── Jours fériés camerounais (affichage référence) ───────────────────────

function getEasterYear(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const AID = {
  2026: ['2026-03-20', '2026-05-27'],
  2027: ['2027-03-09', '2027-05-16'],
  2028: ['2028-03-28', '2028-05-04'],
}

function getFeriesAnnee(year) {
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
  const toIso   = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const fixed   = [[1,1],[11,2],[1,5],[20,5],[15,8],[1,10],[25,12]]
    .map(([day,month]) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
  const easter  = getEasterYear(year)
  const mobile  = [addDays(easter,-2), addDays(easter,1), addDays(easter,39), addDays(easter,50)]
    .filter(d => d.getFullYear() === year)
    .map(toIso)
  return [...new Set([...fixed, ...mobile, ...(AID[year] || [])])].sort()
}

const NOMS_FERIES = {
  '01-01': "Jour de l'An",
  '02-11': 'Fête de la Jeunesse',
  '05-01': 'Fête du Travail',
  '05-20': 'Fête Nationale',
  '08-15': 'Assomption',
  '10-01': "Fête de l'Unité Nationale",
  '12-25': 'Noël',
}

function nomFerie(iso) {
  return NOMS_FERIES[iso.slice(5)] || 'Jour férié (mobile)'
}

// ── Modal solde légal ────────────────────────────────────────────────────

function SoldeModal({ employe, onClose }) {
  const { t } = useTranslation()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const annee = new Date().getFullYear()

  useEffect(() => {
    getSoldeDetaille({ employe: employe.id, annee })
      .then(r => setData(r.data))
      .catch(() => toast.error('Impossible de charger le solde légal.', { id: 'solde-detail' }))
      .finally(() => setLoading(false))
  }, [employe.id, annee])

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-md modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header" style={{ background: '#1F3864', color: '#fff' }}>
            <h5 className="modal-title">
              <i className="fas fa-balance-scale mr-2" />
              {t('conges_extra.legal_balance_title', { name: employe.nom })}
            </h5>
            <button className="close text-white" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body p-3">
            {loading ? (
              <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x" /></div>
            ) : !data ? (
              <div className="alert alert-danger">Données indisponibles.</div>
            ) : (
              <>
                {/* Éligibilité */}
                <div className={`alert py-2 mb-3 ${data.eligibilite?.eligible ? 'alert-success' : 'alert-warning'}`}
                  style={{ fontSize: 13 }}>
                  {data.eligibilite?.eligible ? (
                    <><i className="fas fa-check-circle mr-1" /><strong>{t('conges_extra.eligible')}</strong> — {data.eligibilite.mois_travailles} {t('conges_extra.months_service')}</>
                  ) : (
                    <><i className="fas fa-hourglass-half mr-1" /><strong>{t('conges_extra.not_eligible')}</strong> — {data.eligibilite.mois_restants} {t('conges_extra.months_remaining')}</>
                  )}
                </div>

                {/* Calcul solde */}
                <h6 className="text-primary font-weight-bold mb-2">{t('conges_extra.annual_right_calc', { year: data.annee })}</h6>
                <table className="table table-sm table-bordered mb-3" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td>{t('conges_extra.months_worked')}</td>
                      <td className="text-right font-weight-bold">{data.droit_calcule?.mois_travailles} / 12</td>
                    </tr>
                    <tr>
                      <td>{t('conges_extra.base_days', { months: data.droit_calcule?.mois_travailles })}</td>
                      <td className="text-right font-weight-bold">{data.droit_calcule?.jours_base} j</td>
                    </tr>
                    <tr>
                      <td>{t('conges_extra.seniority', { years: data.droit_calcule?.anciennete_annees })}</td>
                      <td className={`text-right font-weight-bold ${(data.droit_calcule?.majoration_anciennete ?? 0) > 0 ? 'text-success' : 'text-muted'}`}>
                        +{data.droit_calcule?.majoration_anciennete ?? 0} j
                      </td>
                    </tr>
                    <tr>
                      <td>{t('conges_extra.dependents')}</td>
                      <td className={`text-right font-weight-bold ${(data.droit_calcule?.majoration_enfants ?? 0) > 0 ? 'text-success' : 'text-muted'}`}>
                        +{data.droit_calcule?.majoration_enfants ?? 0} j
                      </td>
                    </tr>
                    <tr className="table-primary">
                      <td className="font-weight-bold">{t('conges_extra.total_right')}</td>
                      <td className="text-right font-weight-bold">{data.droit_calcule?.total_jours_droit} j</td>
                    </tr>
                  </tbody>
                </table>

                {/* Consommation */}
                <h6 className="text-primary font-weight-bold mb-2">{t('conges_extra.consumption')}</h6>
                <table className="table table-sm table-bordered mb-3" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td>{t('conges_extra.days_taken_approved')}</td>
                      <td className="text-right">{data.jours_pris} j</td>
                    </tr>
                    <tr>
                      <td>{t('conges_extra.days_pending')}</td>
                      <td className="text-right text-warning">{data.jours_en_attente} j</td>
                    </tr>
                    <tr className={`${(data.jours_restants ?? 0) < 0 ? 'table-danger' : 'table-success'}`}>
                      <td className="font-weight-bold">{t('conges_extra.remaining_balance')}</td>
                      <td className="text-right font-weight-bold">{data.jours_restants} j</td>
                    </tr>
                  </tbody>
                </table>

                {/* Allocation */}
                {(data.allocation_estimee ?? 0) > 0 && (
                  <div className="alert alert-info py-2 mb-0" style={{ fontSize: 13 }}>
                    <i className="fas fa-money-bill-wave mr-1" />
                    <strong>{t('conges_extra.allocation')}</strong> :{' '}
                    {Number(data.allocation_estimee).toLocaleString('fr-FR')} FCFA
                    <small className="d-block text-muted">{t('conges_extra.allocation_note')}</small>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer py-2">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>{t('common.close')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUT_CLS = {
  EN_ATTENTE: 'badge-warning',
  APPROUVE:   'badge-success',
  REFUSE:     'badge-danger',
  ANNULE:     'badge-secondary',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function exportCSV(demandes) {
  const entetes = ['Employé','Département','Type','Début','Fin','Jours','Motif','Statut','Valideur','Commentaire']
  const lignes = demandes.map(d => [
    d.employe_detail?.full_name || d.employe_detail?.username || '',
    d.employe_detail?.departement_nom || '',
    d.type_conge_detail?.nom || '',
    d.date_debut,
    d.date_fin,
    d.nb_jours,
    d.motif || '',
    d.statut_display || d.statut,
    d.valideur_detail?.full_name || '',
    d.commentaire_valideur || '',
  ])
  return { entetes, lignes, nomFichier: `conges_${new Date().toISOString().slice(0, 10)}.csv` }
}

export default function GestionConges() {
  const { t } = useTranslation()
  const { voirTableau, apercuModal } = useApercu()
  const annee = new Date().getFullYear()
  const STATUT_CONFIG = {
    EN_ATTENTE: { cls: STATUT_CLS.EN_ATTENTE, label: t('conges.pending') },
    APPROUVE:   { cls: STATUT_CLS.APPROUVE,   label: t('conges.approved') },
    REFUSE:     { cls: STATUT_CLS.REFUSE,     label: t('conges.rejected') },
    ANNULE:     { cls: STATUT_CLS.ANNULE,     label: t('conges.cancelled') },
  }

  const [demandes,    setDemandes]    = useState([])
  const [types,       setTypes]       = useState([])
  const [depts,       setDepts]       = useState([])
  const [stats,       setStats]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showCal,     setShowCal]     = useState(false)

  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreDept,   setFiltreDept]   = useState('')
  const [filtreType,   setFiltreType]   = useState('')
  const [filtreSearch, setFiltreSearch] = useState('')

  const [soldeModalEmploye, setSoldeModalEmploye] = useState(null)
  const [showFeries,        setShowFeries]        = useState(false)

  useEffect(() => {
    async function load() {
      const [dRes, tRes, deptRes, sRes] = await Promise.allSettled([
        getDemandes({ annee }),
        getTypesConge(),
        chargerTout('/departements/'),
        getStatsConges(),
      ])
      if (dRes.status === 'fulfilled') {
        setDemandes(dRes.value.data.results ?? dRes.value.data)
      } else {
        console.error('conges/demandes:', dRes.reason)
        toast.error('Erreur lors du chargement des congés.', { id: 'conges-load-error' })
      }
      if (tRes.status === 'fulfilled') {
        setTypes(tRes.value.data.results ?? tRes.value.data)
      } else {
        console.error('conges/types:', tRes.reason)
      }
      if (deptRes.status === 'fulfilled') {
        setDepts(deptRes.value.data.results ?? deptRes.value.data)
      } else {
        console.error('departements:', deptRes.reason)
      }
      if (sRes.status === 'fulfilled') {
        setStats(sRes.value.data)
      } else {
        console.error('conges/stats:', sRes.reason)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <RHLayout pageTitle={t('conges.title')}>
        <Spinner message={t('common.loading')} />
      </RHLayout>
    )
  }

  // Filtrage
  const filtered = demandes.filter(d => {
    if (filtreStatut && d.statut !== filtreStatut) return false
    if (filtreDept) {
      const deptId = String(d.employe_detail?.departement || '')
      if (deptId !== filtreDept) return false
    }
    if (filtreType && String(d.type_conge) !== filtreType) return false
    if (filtreSearch) {
      const nom = (d.employe_detail?.full_name || d.employe_detail?.username || '').toLowerCase()
      if (!nom.includes(filtreSearch.toLowerCase())) return false
    }
    return true
  })

  const approuves = demandes.filter(d => d.statut === 'APPROUVE')

  return (
    <RHLayout pageTitle={t('conges.title')}>

      {/* Stats KPI */}
      <div className="row mb-3">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{stats?.en_attente ?? 0}</h3>
              <p>{t('conges.pending')}</p>
            </div>
            <div className="icon"><i className="fas fa-hourglass-half" /></div>
            <span className="small-box-footer">
              <i className="fas fa-clock mr-1" />{t('conges_extra.to_validate')}
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{stats?.approuves ?? 0}</h3>
              <p>{t('conges.approved')}</p>
            </div>
            <div className="icon"><i className="fas fa-check-circle" /></div>
            <span className="small-box-footer">
              <i className="fas fa-calendar-check mr-1" />{t('dashboard.this_month')}
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{ background: '#2E74B5', color: '#fff' }}>
            <div className="inner">
              <h3>{stats?.total_jours_pris ?? 0}j</h3>
              <p>{t('conges_extra.days_taken_short')}</p>
            </div>
            <div className="icon"><i className="fas fa-umbrella-beach" /></div>
            <span className="small-box-footer" style={{ color: 'rgba(255,255,255,.85)' }}>
              <i className="fas fa-chart-bar mr-1" />{annee}
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stats?.taux_approbation ?? 0}%</h3>
              <p>{t('conges_extra.approval_rate_short')}</p>
            </div>
            <div className="icon"><i className="fas fa-percent" /></div>
            <span className="small-box-footer">
              <i className="fas fa-thumbs-up mr-1" />{t('conges_extra.on_year')}
            </span>
          </div>
        </div>
      </div>

      {/* Filtres + Actions */}
      <div className="card card-outline card-primary">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-filter mr-2" />
            Filtres
          </h3>
          <div className="card-tools">
            <button
              className={`btn btn-sm ${showFeries ? 'btn-warning' : 'btn-outline-warning'} mr-2`}
              onClick={() => setShowFeries(f => !f)}
              title="Jours fériés camerounais"
            >
              <i className="fas fa-star mr-1" />{t('conges_extra.public_holidays')}
            </button>
            <button
              className={`btn btn-sm ${showCal ? 'btn-primary' : 'btn-outline-primary'} mr-2`}
              onClick={() => setShowCal(c => !c)}
            >
              <i className="fas fa-calendar-alt mr-1" />{t('conges_extra.calendar_btn')}
            </button>
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => voirTableau({ titre: t('conges_extra.export_csv'), ...exportCSV(filtered) })}
            >
              <i className="fas fa-file-csv mr-1" />{t('conges_extra.export_csv')}
            </button>
          </div>
        </div>
        <div className="card-body py-2">
          <div className="form-row align-items-end">
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">{t('conges_extra.filter_label_status')}</label>
              <select className="form-control form-control-sm"
                value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
                <option value="">{t('conges_extra.filter_all_statuses')}</option>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">{t('conges_extra.filter_label_dept')}</label>
              <select className="form-control form-control-sm"
                value={filtreDept} onChange={e => setFiltreDept(e.target.value)}>
                <option value="">{t('conges_extra.filter_all_depts')}</option>
                {depts.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">{t('conges_extra.filter_label_type')}</label>
              <select className="form-control form-control-sm"
                value={filtreType} onChange={e => setFiltreType(e.target.value)}>
                <option value="">{t('conges_extra.filter_all_types')}</option>
                {types.map(tp => (
                  <option key={tp.id} value={String(tp.id)}>{tp.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">{t('conges_extra.filter_label_employee')}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={t('conges_extra.search_employee')}
                value={filtreSearch}
                onChange={e => setFiltreSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier des absences */}
      {showCal && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-calendar-alt mr-2" />{t('conges_extra.absence_calendar')}
            </h3>
          </div>
          <div className="card-body">
            <CalendrierAbsences demandes={approuves} />
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">
            <i className="fas fa-list-ul mr-2" />
            {filtered.length} demande{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== demandes.length && (
              <span className="text-muted font-weight-normal ml-1">
                (sur {demandes.length} total)
              </span>
            )}
          </h3>
        </div>
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-inbox fa-2x mb-2 d-block" />
              {t('conges_extra.no_matching')}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>{t('conges_extra.col_employee')}</th>
                    <th>{t('conges_extra.col_type')}</th>
                    <th>{t('conges_extra.col_period')}</th>
                    <th className="text-center">{t('conges_extra.col_days')}</th>
                    <th>{t('conges_extra.col_return')}</th>
                    <th>{t('conges_extra.col_reason')}</th>
                    <th>{t('conges_extra.col_status')}</th>
                    <th>{t('conges_extra.col_validator')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => {
                    const cfg    = STATUT_CONFIG[d.statut] || STATUT_CONFIG.EN_ATTENTE
                    const empNom = d.employe_detail?.full_name || d.employe_detail?.username || '—'
                    return (
                      <tr key={d.id}>
                        <td style={{ fontSize: 12 }}>
                          <div className="font-weight-bold">{empNom}</div>
                          <small className="text-muted">{d.employe_detail?.departement_nom || ''}</small>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span className="badge" style={{
                            background: d.type_conge_detail?.couleur || '#2E74B5',
                            color: '#fff',
                          }}>
                            {d.type_conge_detail?.nom || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}
                        </td>
                        <td className="text-center font-weight-bold" style={{ fontSize: 12 }}>
                          {d.nb_jours}j
                          {d.jours_ouvrable_pauses > 0 && (
                            <div style={{ fontSize: 10, color: '#856404' }}>
                              +{d.jours_ouvrable_pauses}j fériés
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {d.date_retour_prevue ? fmtDate(d.date_retour_prevue) : '—'}
                        </td>
                        <td style={{ fontSize: 11, maxWidth: 150 }}>
                          <span className="text-muted">
                            {d.motif ? (d.motif.length > 50 ? d.motif.slice(0, 50) + '…' : d.motif) : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {d.valideur_detail?.full_name || d.valideur_detail?.username || '—'}
                        </td>
                        <td>
                          <button
                            className="btn btn-xs btn-outline-primary"
                            title="Solde légal détaillé"
                            onClick={() => setSoldeModalEmploye({
                              id:  d.employe_detail?.id,
                              nom: empNom,
                            })}
                          >
                            <i className="fas fa-balance-scale" />
                          </button>
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

      {/* Jours fériés camerounais */}
      {showFeries && (
        <div className="card card-warning card-outline">
          <div className="card-header py-2">
            <h3 className="card-title">
              <i className="fas fa-star mr-2 text-warning" />
              Jours fériés camerounais {annee}
            </h3>
          </div>
          <div className="card-body p-0">
            <div className="row no-gutters">
              {getFeriesAnnee(annee).map(iso => (
                <div key={iso} className="col-md-4 col-lg-3">
                  <div className="d-flex align-items-center px-3 py-2 border-bottom">
                    <span className="badge badge-warning mr-2" style={{ fontSize: 12, minWidth: 90 }}>
                      {new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                    <span style={{ fontSize: 12 }}>{nomFerie(iso)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal solde légal */}
      {soldeModalEmploye && (
        <SoldeModal
          employe={soldeModalEmploye}
          onClose={() => setSoldeModalEmploye(null)}
        />
      )}

      {apercuModal}
    </RHLayout>
  )
}
