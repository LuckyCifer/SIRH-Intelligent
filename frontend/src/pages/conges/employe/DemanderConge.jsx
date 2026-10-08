import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import { getTypesConge, getMesSoldes, creerDemande, getSoldeDetaille } from '../../../api/conges'

// ── Jours fériés camerounais ─────────────────────────────────────────────

function getEaster(year) {
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

const AID_DATES = {
  2024: ['2024-04-10', '2024-06-16'],
  2025: ['2025-03-30', '2025-06-06'],
  2026: ['2026-03-20', '2026-05-27'],
  2027: ['2027-03-09', '2027-05-16'],
  2028: ['2028-03-28', '2028-05-04'],
  2029: ['2029-03-18', '2029-04-23'],
  2030: ['2030-03-07', '2030-04-12'],
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d, n) {
  return new Date(d.getTime() + n * 86400000)
}

function getJoursFeries(year) {
  const s = new Set()
  // Fixed
  ;[[1,1],[11,2],[1,5],[20,5],[15,8],[1,10],[25,12]].forEach(([day, month]) => {
    s.add(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
  })
  // Easter-derived
  const easter = getEaster(year)
  ;[addDays(easter, -2), addDays(easter, 1), addDays(easter, 39), addDays(easter, 50)].forEach(d => {
    if (d.getFullYear() === year) s.add(toIso(d))
  })
  // Aïds
  ;(AID_DATES[year] || []).forEach(d => s.add(d))
  return s
}

function getAllFeries(yearStart, yearEnd) {
  const s = new Set()
  for (let y = yearStart; y <= yearEnd; y++) {
    getJoursFeries(y).forEach(d => s.add(d))
  }
  return s
}

function calculerJoursOuvrables(debut, fin) {
  if (!debut || !fin) return 0
  const d = new Date(debut + 'T00:00:00')
  const f = new Date(fin + 'T00:00:00')
  if (f < d) return 0
  const feries = getAllFeries(d.getFullYear(), f.getFullYear())
  let count = 0
  const cur = new Date(d)
  while (cur <= f) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6 && !feries.has(toIso(cur))) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function calculerDateRetour(fin) {
  if (!fin) return null
  const f = new Date(fin + 'T00:00:00')
  const feries = getAllFeries(f.getFullYear(), f.getFullYear() + 1)
  const r = new Date(f.getTime() + 86400000)
  while (r.getDay() === 0 || r.getDay() === 6 || feries.has(toIso(r))) {
    r.setDate(r.getDate() + 1)
  }
  return toIso(r)
}

function getFeriesEntreDates(debut, fin) {
  if (!debut || !fin) return []
  const d = new Date(debut + 'T00:00:00')
  const f = new Date(fin + 'T00:00:00')
  const feries = getAllFeries(d.getFullYear(), f.getFullYear())
  const result = []
  const cur = new Date(d)
  while (cur <= f) {
    const iso = toIso(cur)
    if (cur.getDay() !== 0 && cur.getDay() !== 6 && feries.has(iso)) {
      result.push(iso)
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

// ── Helpers affichage ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Composant principal ──────────────────────────────────────────────────

export default function DemanderConge() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const annee    = new Date().getFullYear()

  const NOMS_FERIES = {
    '01-01': t('conges_extra.holiday_new_year'),
    '02-11': t('conges_extra.holiday_youth'),
    '05-01': t('conges_extra.holiday_labour'),
    '05-20': t('conges_extra.holiday_national'),
    '08-15': t('conges_extra.holiday_assumption'),
    '10-01': t('conges_extra.holiday_unity'),
    '12-25': t('conges_extra.holiday_christmas'),
  }

  function nomFerie(iso) {
    const suffix = iso.slice(5) // MM-DD
    return NOMS_FERIES[suffix] || t('conges_extra.holiday_mobile')
  }

  const [types,       setTypes]       = useState([])
  const [soldes,      setSoldes]      = useState([])
  const [soldeDetail, setSoldeDetail] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  const [form, setForm] = useState({
    type_conge: '', date_debut: '', date_fin: '', motif: '', justificatif: null,
  })

  useEffect(() => {
    Promise.all([getTypesConge(), getMesSoldes({ annee })])
      .then(([tRes, sRes]) => {
        setTypes(tRes.data.results ?? tRes.data)
        setSoldes(sRes.data.results ?? sRes.data)
      })
      .catch(() => toast.error(t('conges_extra.load_error_generic'), { id: 'conge-load' }))
      .finally(() => setLoading(false))
  }, [annee])

  // Charger solde légal détaillé quand le type ANNUEL est sélectionné
  useEffect(() => {
    const type = types.find(t => String(t.id) === String(form.type_conge))
    if (type && type.code_legal === 'ANNUEL') {
      getSoldeDetaille({ annee })
        .then(r => setSoldeDetail(r.data))
        .catch(() => setSoldeDetail(null))
    } else {
      setSoldeDetail(null)
    }
  }, [form.type_conge, types, annee])

  const nbJours = calculerJoursOuvrables(form.date_debut, form.date_fin)
  const dateRetour = calculerDateRetour(form.date_fin)
  const feriesEntreDates = getFeriesEntreDates(form.date_debut, form.date_fin)

  const typeSelectionne = types.find(tp => String(tp.id) === String(form.type_conge))

  // Solde disponible : d'abord solde légal (ANNUEL), sinon solde SoldeConge
  const soldeActuel = soldes.find(s => String(s.type_conge) === String(form.type_conge))
  let soldeRestant = null
  if (soldeDetail && typeSelectionne?.code_legal === 'ANNUEL') {
    soldeRestant = soldeDetail.jours_restants
  } else if (soldeActuel) {
    soldeRestant = parseFloat(soldeActuel.solde_restant)
  } else if (typeSelectionne) {
    soldeRestant = typeSelectionne.jours_par_an
  }

  const soldeInsuffisant = soldeRestant !== null && nbJours > soldeRestant
  const nonEligible = soldeDetail?.eligibilite?.eligible === false

  function handleChange(e) {
    const { name, value, files } = e.target
    if (name === 'justificatif') {
      setForm(f => ({ ...f, justificatif: files[0] }))
    } else {
      setForm(f => ({ ...f, [name]: value }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.type_conge || !form.date_debut || !form.date_fin || !form.motif.trim()) {
      toast.error(t('conges_extra.all_fields_required'))
      return
    }
    if (new Date(form.date_fin) < new Date(form.date_debut)) {
      toast.error(t('conges_extra.end_after_start'))
      return
    }
    if (soldeInsuffisant) {
      toast.error(t('conges_extra.insufficient_balance', { days: typeof soldeRestant === 'number' ? soldeRestant.toFixed(0) : soldeRestant }))
      return
    }

    setSaving(true)
    try {
      const payload = new FormData()
      payload.append('type_conge', form.type_conge)
      payload.append('date_debut', form.date_debut)
      payload.append('date_fin',   form.date_fin)
      payload.append('motif',      form.motif)
      if (form.justificatif) payload.append('justificatif', form.justificatif)

      await creerDemande(payload)
      toast.success(t('conges_extra.request_sent'))
      navigate('/employe/conges')
    } catch (err) {
      const detail = err.response?.data
      if (detail?.non_field_errors) {
        toast.error(detail.non_field_errors[0])
      } else {
        toast.error(detail ? JSON.stringify(detail) : t('conges_extra.submit_error'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <EmployeLayout pageTitle={t('conges_extra.new_leave_request')}>
        <Spinner />
      </EmployeLayout>
    )
  }

  return (
    <EmployeLayout
      pageTitle={t('conges_extra.new_leave_request')}
      breadcrumb={{ to: '/employe/conges', label: t('conges.my_leaves') }}
    >
      <div className="row">
        {/* ── Formulaire ─────────────────────────────────────────── */}
        <div className="col-md-8">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-umbrella-beach mr-2" />
                {t('conges_extra.request_leave_title')}
              </h3>
            </div>
            <form onSubmit={handleSubmit} encType="multipart/form-data">
              <div className="card-body">

                {/* Alerte non-éligibilité Art. 92 */}
                {nonEligible && (
                  <div className="alert alert-warning py-2 mb-3" style={{ fontSize: 13 }}>
                    <i className="fas fa-exclamation-triangle mr-2" />
                    <strong>{t('conges_extra.not_eligible_art92')}</strong>
                    {' — '}{t('conges_extra.not_eligible_detail', { months: soldeDetail.eligibilite.mois_restants })}
                  </div>
                )}

                {/* Type de congé */}
                <div className="form-group">
                  <label className="font-weight-bold">
                    {t('conges.type')} <span className="text-danger">*</span>
                  </label>
                  <select name="type_conge" className="form-control"
                    value={form.type_conge} onChange={handleChange} required>
                    <option value="">{t('conges_extra.select_type')}</option>
                    {types.map(tp => {
                      const s = soldes.find(x => String(x.type_conge) === String(tp.id))
                      const restant = s ? parseFloat(s.solde_restant).toFixed(0) : tp.jours_par_an
                      return (
                        <option key={tp.id} value={tp.id}>
                          {tp.nom} — {restant}j{' '}
                          {!tp.est_paye ? `(${t('conges_extra.unpaid')})` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {typeSelectionne && (
                    <small className="form-text text-muted">
                      {typeSelectionne.description}
                      {typeSelectionne.necessite_justificatif && (
                        <span className="text-warning ml-2">
                          <i className="fas fa-paperclip mr-1" />{t('conges_extra.doc_required')}
                        </span>
                      )}
                    </small>
                  )}
                </div>

                {/* Dates */}
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('conges.start_date')} <span className="text-danger">*</span></label>
                    <input type="date" name="date_debut" className="form-control"
                      value={form.date_debut} onChange={handleChange} required />
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('conges.end_date')} <span className="text-danger">*</span></label>
                    <input type="date" name="date_fin" className="form-control"
                      value={form.date_fin} onChange={handleChange}
                      min={form.date_debut} required />
                  </div>
                </div>

                {/* Aperçu calcul */}
                {form.date_debut && form.date_fin && (
                  <div className={`alert py-2 mb-2 ${soldeInsuffisant ? 'alert-danger' : 'alert-info'}`}
                    style={{ fontSize: 13 }}>
                    <div>
                      <i className="fas fa-calendar-check mr-2" />
                      {t('conges_extra.from')} <strong>{fmtDate(form.date_debut)}</strong> {t('conges_extra.to')} <strong>{fmtDate(form.date_fin)}</strong>
                      {' = '}
                      <strong>{nbJours} {t('conges_extra.working_days', { count: nbJours })}</strong>
                      {feriesEntreDates.length > 0 && (
                        <span className="text-muted ml-1">
                          ({t('conges_extra.holidays_excluded', { count: feriesEntreDates.length })})
                        </span>
                      )}
                    </div>
                    {soldeRestant !== null && (
                      <div className="mt-1">
                        <i className="fas fa-piggy-bank mr-1" />
                        {t('conges_extra.available_balance')} : <strong>{typeof soldeRestant === 'number' ? soldeRestant.toFixed(0) : soldeRestant}j</strong>
                        <span className="mx-2">·</span>
                        {t('conges_extra.after_leave')} : <strong className={soldeInsuffisant ? 'text-danger' : ''}>
                          {(soldeRestant - nbJours).toFixed(0)}j
                        </strong>
                      </div>
                    )}
                    {dateRetour && (
                      <div className="mt-1">
                        <i className="fas fa-undo mr-1" />
                        {t('conges_extra.return_date')} : <strong>{fmtDate(dateRetour)}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Jours fériés pendant le congé */}
                {feriesEntreDates.length > 0 && (
                  <div className="alert alert-secondary py-2 mb-3" style={{ fontSize: 12 }}>
                    <i className="fas fa-star mr-1 text-warning" />
                    <strong>{t('conges_extra.holidays_not_counted')} :</strong>
                    {feriesEntreDates.map(d => (
                      <span key={d} className="badge badge-light ml-1 border">{fmtDate(d)} — {nomFerie(d)}</span>
                    ))}
                  </div>
                )}

                {/* Motif */}
                <div className="form-group">
                  <label className="font-weight-bold">{t('conges.reason')} <span className="text-danger">*</span></label>
                  <textarea name="motif" className="form-control" rows={3}
                    value={form.motif} onChange={handleChange}
                    placeholder={t('conges_extra.reason_placeholder_form')}
                    required />
                </div>

                {/* Justificatif conditionnel */}
                {typeSelectionne?.necessite_justificatif && (
                  <div className="form-group">
                    <label className="font-weight-bold">
                      {t('conges_extra.supporting_doc')} <span className="text-danger">*</span>
                      <small className="text-muted ml-1">(PDF, JPG, PNG)</small>
                    </label>
                    <input type="file" name="justificatif" className="form-control-file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleChange} />
                  </div>
                )}
              </div>

              <div className="card-footer d-flex justify-content-between">
                <button type="button" className="btn btn-secondary"
                  onClick={() => navigate('/employe/conges')}>
                  <i className="fas fa-times mr-1" />{t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary"
                  disabled={saving || nbJours === 0 || nonEligible}>
                  {saving
                    ? <><i className="fas fa-spinner fa-spin mr-1" />{t('conges_extra.sending')}</>
                    : <><i className="fas fa-paper-plane mr-1" />{t('conges_extra.send_request')}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Colonne info ────────────────────────────────────────── */}
        <div className="col-md-4">

          {/* Solde légal détaillé (ANNUEL) */}
          {soldeDetail && (
            <div className="card card-outline card-primary mb-3">
              <div className="card-header py-2">
                <h3 className="card-title text-sm">
                  <i className="fas fa-balance-scale mr-1 text-primary" />
                  {t('conges_extra.legal_right')} {soldeDetail.annee}
                </h3>
              </div>
              <div className="card-body p-2">
                <table className="table table-sm table-borderless mb-0" style={{ fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td className="text-muted">{t('conges_extra.months_worked')}</td>
                      <td className="text-right font-weight-bold">
                        {soldeDetail.droit_calcule?.mois_travailles ?? '—'} {t('conges_extra.months')}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('conges_extra.base_art89')}</td>
                      <td className="text-right font-weight-bold">
                        {soldeDetail.droit_calcule?.jours_base ?? '—'} j
                      </td>
                    </tr>
                    {(soldeDetail.droit_calcule?.majoration_enfants ?? 0) > 0 && (
                      <tr>
                        <td className="text-muted">{t('conges_extra.child_bonus')}</td>
                        <td className="text-right font-weight-bold text-success">
                          +{soldeDetail.droit_calcule.majoration_enfants} j
                        </td>
                      </tr>
                    )}
                    {(soldeDetail.droit_calcule?.majoration_anciennete ?? 0) > 0 && (
                      <tr>
                        <td className="text-muted">{t('conges_extra.seniority_bonus')}</td>
                        <td className="text-right font-weight-bold text-success">
                          +{soldeDetail.droit_calcule.majoration_anciennete} j
                        </td>
                      </tr>
                    )}
                    <tr className="border-top">
                      <td className="font-weight-bold">{t('conges_extra.total_right')}</td>
                      <td className="text-right font-weight-bold text-primary">
                        {soldeDetail.droit_calcule?.total_jours_droit ?? '—'} j
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('conges_extra.taken')}</td>
                      <td className="text-right">{soldeDetail.jours_pris ?? 0} j</td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('conges.pending')}</td>
                      <td className="text-right">{soldeDetail.jours_en_attente ?? 0} j</td>
                    </tr>
                    <tr className="border-top">
                      <td className="font-weight-bold">{t('conges_extra.remaining')}</td>
                      <td className={`text-right font-weight-bold ${(soldeDetail.jours_restants ?? 0) < 0 ? 'text-danger' : 'text-success'}`}>
                        {soldeDetail.jours_restants ?? 0} j
                      </td>
                    </tr>
                    {(soldeDetail.allocation_estimee ?? 0) > 0 && (
                      <tr className="border-top">
                        <td className="text-muted" style={{ fontSize: 11 }}>{t('conges_extra.allocation')} (Art. 93)</td>
                        <td className="text-right font-weight-bold" style={{ fontSize: 11 }}>
                          {Number(soldeDetail.allocation_estimee).toLocaleString('fr-FR')} F
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mes soldes actuels */}
          <div className="card">
            <div className="card-header py-2">
              <h3 className="card-title text-sm">
                <i className="fas fa-info-circle mr-1 text-info" />{t('conges_extra.current_balances')}
              </h3>
            </div>
            <div className="card-body p-0">
              {soldes.length === 0 ? (
                <div className="text-center py-3 text-muted" style={{ fontSize: 12 }}>
                  {t('conges_extra.no_balance_init')}
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {soldes.map(s => (
                    <li className="list-group-item py-2 d-flex justify-content-between" key={s.id}>
                      <span style={{ fontSize: 12, color: s.type_conge_detail?.couleur }}>
                        {s.type_conge_detail?.nom}
                      </span>
                      <span className="font-weight-bold" style={{ fontSize: 12 }}>
                        {parseFloat(s.solde_restant).toFixed(0)}j {t('conges.days_remaining')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Jours fériés — référence rapide */}
          <div className="card mt-3">
            <div className="card-header py-2">
              <h3 className="card-title text-sm">
                <i className="fas fa-calendar-day mr-1 text-warning" />
                {t('conges_extra.public_holidays')} {new Date().getFullYear()}
              </h3>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush" style={{ fontSize: 11 }}>
                {[...getJoursFeries(new Date().getFullYear())].sort().map(iso => (
                  <li key={iso} className="list-group-item py-1 d-flex justify-content-between">
                    <span>{fmtDate(iso)}</span>
                    <span className="text-muted">{nomFerie(iso)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </EmployeLayout>
  )
}
