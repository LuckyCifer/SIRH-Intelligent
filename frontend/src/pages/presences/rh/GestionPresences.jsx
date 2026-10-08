import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import { getRapportEquipe, getPointages, creerPointage, updatePointage, getJoursFeries } from '../../../api/presences'
import { useApercu } from '../../../components/ui/useApercu'
import { chargerTout } from '../../../api/listes'

const STATUTS = ['PRESENT','ABSENT','RETARD','CONGE','FERIE','WEEKEND']

const EMPTY_FORM = {
  employe: '', date: '', heure_arrivee: '', heure_depart: '',
  statut: 'PRESENT', note: '',
}

function TauxBadge({ taux }) {
  const color = taux >= 90 ? '#28A745' : taux >= 75 ? '#FD7E14' : '#DC3545'
  return <span className="font-weight-bold" style={{ color, fontSize: 13 }}>{taux}%</span>
}

function getMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, '0')}`
}

function numFr(n) {
  if (n == null || n === '') return '—'
  return Number(n).toLocaleString('fr-FR')
}

function exportCSV(rapport, moisLabel) {
  const entetes = ['Employé','Département','Présents','Absents','Retards','Heures','HS Jour','HS Nuit','HS W-E/Fériés','Montant HS','Taux%']
  const lignes  = rapport.map(e => [
    e.nom_complet, e.departement,
    e.jours_presents, e.jours_absents, e.jours_retard,
    e.total_heures, e.hs_jour || 0, e.hs_nuit || 0,
    e.hs_weekend_ferie || 0, e.montant_hs || 0, e.taux_presence,
  ])
  return { entetes, lignes, nomFichier: `presences_${moisLabel}.csv` }
}

export default function GestionPresences() {
  const { t } = useTranslation()
  const { voirTableau, apercuModal } = useApercu()

  const MONTH_NAMES = [
    t('common.months.1'), t('common.months.2'), t('common.months.3'),
    t('common.months.4'), t('common.months.5'), t('common.months.6'),
    t('common.months.7'), t('common.months.8'), t('common.months.9'),
    t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ]

  const JOURS_SEM = [
    t('common.days_short.mon', 'Lun'),
    t('common.days_short.tue', 'Mar'),
    t('common.days_short.wed', 'Mer'),
    t('common.days_short.thu', 'Jeu'),
    t('common.days_short.fri', 'Ven'),
    t('common.days_short.sat', 'Sam'),
    t('common.days_short.sun', 'Dim'),
  ]

  const STATUT_LABELS = {
    PRESENT:  t('presences.present'),
    ABSENT:   t('presences.absent'),
    RETARD:   t('presences.en_retard'),
    CONGE:    t('presences.en_conge'),
    FERIE:    t('presences.ferie'),
    WEEKEND:  t('presences.weekend'),
  }

  const STATUT_CLS = {
    PRESENT:'badge-success', ABSENT:'badge-danger', RETARD:'badge-warning',
    CONGE:'badge-primary', FERIE:'badge-secondary', WEEKEND:'badge-light',
  }

  const today = new Date()
  const [annee, setAnnee] = useState(today.getFullYear())
  const [mois,  setMois]  = useState(today.getMonth())

  const [rapport,    setRapport]    = useState([])
  const [employes,   setEmployes]   = useState([])
  const [depts,      setDepts]      = useState([])
  const [feries,     setFeries]     = useState([])
  const [loading,    setLoading]    = useState(true)

  const [filtreDept,  setFiltreDept]  = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const [showFeries,  setShowFeries]  = useState(false)
  const [editId,      setEditId]      = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)

  const moisParam = getMoisParam(annee, mois)

  async function load() {
    setLoading(true)
    const [rRes, uRes, dRes, fRes] = await Promise.allSettled([
      getRapportEquipe(moisParam),
      chargerTout('/accounts/users/'),
      chargerTout('/departements/'),
      getJoursFeries(annee),
    ])
    if (rRes.status === 'fulfilled') {
      setRapport(rRes.value.data.employes || [])
    } else {
      console.error('presences/rapport-equipe:', rRes.reason)
      toast.error(t('presences.report_load_error'), { id: 'presences-rapport-error' })
    }
    if (uRes.status === 'fulfilled') {
      setEmployes((uRes.value.data.results ?? uRes.value.data).filter(u => u.role === 'EMPLOYE'))
    } else {
      console.error('accounts/users:', uRes.reason)
    }
    if (dRes.status === 'fulfilled') {
      setDepts(dRes.value.data.results ?? dRes.value.data)
    } else {
      console.error('departements:', dRes.reason)
    }
    if (fRes.status === 'fulfilled') {
      setFeries(fRes.value.data.jours_feries || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [annee, mois])

  function prevMois() {
    if (mois === 0) { setMois(11); setAnnee(y => y - 1) }
    else setMois(m => m - 1)
  }
  function nextMois() {
    if (mois === 11) { setMois(0); setAnnee(y => y + 1) }
    else setMois(m => m + 1)
  }

  function openCreate() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, date: today.toISOString().slice(0, 10) })
    setShowModal(true)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employe || !form.date) {
      toast.error(t('presences.employe_required'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        employe: parseInt(form.employe),
        date: form.date,
        heure_arrivee: form.heure_arrivee || null,
        heure_depart: form.heure_depart || null,
        statut: form.statut,
        note: form.note,
      }
      if (editId) {
        await updatePointage(editId, payload)
        toast.success(t('presences.pointage_updated'))
      } else {
        await creerPointage(payload)
        toast.success(t('presences.pointage_created'))
      }
      setShowModal(false)
      load()
    } catch (err) {
      const data = err.response?.data
      const msg  = data ? Object.values(data).flat().join(' ') : t('common.error')
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const filtered = filtreDept
    ? rapport.filter(e => e.departement === depts.find(d => String(d.id) === filtreDept)?.nom)
    : rapport

  if (loading) {
    return (
      <RHLayout pageTitle={t('presences.title')}>
        <Spinner message={t('presences.loading_report')} />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle={t('presences.title')}>

      {/* En-tête : mois + filtres + actions */}
      <div className="card card-outline card-primary">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-calendar-alt mr-2" />
            {t('presences.team_report')}
          </h3>
          <div className="card-tools d-flex align-items-center">
            <button className="btn btn-sm btn-outline-secondary mr-1" onClick={prevMois}>
              <i className="fas fa-chevron-left" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--page-title)', minWidth: 130, textAlign: 'center' }}>
              {MONTH_NAMES[mois]} {annee}
            </span>
            <button className="btn btn-sm btn-outline-secondary ml-1 mr-3" onClick={nextMois}>
              <i className="fas fa-chevron-right" />
            </button>
            <button className="btn btn-sm btn-primary mr-2" onClick={openCreate}>
              <i className="fas fa-plus mr-1" />{t('presences.manual_entry')}
            </button>
            <button
              className={`btn btn-sm mr-2 ${showFeries ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setShowFeries(v => !v)}
              title={t('presences.public_holidays_btn')}
            >
              <i className="fas fa-star-and-crescent mr-1" />{t('presences.public_holidays_btn')}
            </button>
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => voirTableau({ titre: `${t('nav.presences', 'Présences')} — ${moisParam}`, ...exportCSV(filtered, moisParam) })}
            >
              <i className="fas fa-file-csv mr-1" />CSV
            </button>
          </div>
        </div>
        <div className="card-body py-2">
          <div className="form-row align-items-end">
            <div className="form-group col-md-4 mb-0">
              <label className="text-sm font-weight-bold">{t('common.department')}</label>
              <select className="form-control form-control-sm"
                value={filtreDept} onChange={e => setFiltreDept(e.target.value)}>
                <option value="">{t('presences.all_depts')}</option>
                {depts.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">
            <i className="fas fa-users mr-2" />
            {filtered.length !== 1
              ? t('presences.n_employees_plural', { count: filtered.length })
              : t('presences.n_employees', { count: filtered.length })}
          </h3>
        </div>
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-inbox fa-2x mb-2 d-block" />{t('common.no_data')}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead>
                  <tr>
                    <th>{t('presences.employee_col')}</th>
                    <th>{t('presences.dept_col')}</th>
                    <th className="text-center">{t('presences.present_col')}</th>
                    <th className="text-center">{t('presences.absent_col')}</th>
                    <th className="text-center">{t('presences.late_col')}</th>
                    <th className="text-center">{t('presences.hours_col')}</th>
                    <th className="text-center" title={t('presences.hs_day_col')}>{t('presences.hs_day_col')}</th>
                    <th className="text-center" title={t('presences.hs_night_col')}>{t('presences.hs_night_col')}</th>
                    <th className="text-center" title={t('presences.hs_weekend_col')}>{t('presences.hs_weekend_col')}</th>
                    <th className="text-center">{t('presences.hs_amount_col')}</th>
                    <th className="text-center">{t('presences.rate_col')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.employe_id}>
                      <td className="font-weight-bold" style={{ fontSize: 13 }}>{emp.nom_complet}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.departement}</td>
                      <td className="text-center">
                        <span className="badge badge-success">{emp.jours_presents}</span>
                      </td>
                      <td className="text-center">
                        {emp.jours_absents > 0
                          ? <span className="badge badge-danger">{emp.jours_absents}</span>
                          : <span className="text-muted">0</span>}
                      </td>
                      <td className="text-center">
                        {emp.jours_retard > 0
                          ? <span className="badge badge-warning">{emp.jours_retard}</span>
                          : <span className="text-muted">0</span>}
                      </td>
                      <td className="text-center" style={{ fontSize: 12 }}>{emp.total_heures}h</td>
                      <td className="text-center" style={{ fontSize: 12 }}>
                        {emp.hs_jour > 0
                          ? <span className="text-info font-weight-bold">{numFr(emp.hs_jour)}h</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center" style={{ fontSize: 12 }}>
                        {emp.hs_nuit > 0
                          ? <span className="text-dark font-weight-bold">{numFr(emp.hs_nuit)}h</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center" style={{ fontSize: 12 }}>
                        {emp.hs_weekend_ferie > 0
                          ? <span className="text-warning font-weight-bold">{numFr(emp.hs_weekend_ferie)}h</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center" style={{ fontSize: 12 }}>
                        {emp.montant_hs > 0
                          ? <span className="text-success font-weight-bold">{numFr(emp.montant_hs)} FCFA</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center"><TauxBadge taux={emp.taux_presence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Calendrier jours fériés */}
      {showFeries && (
        <div className="card card-outline card-warning">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-star-and-crescent mr-2" />
              {t('presences.public_holidays_title', { year: annee })}
            </h3>
            <div className="card-tools">
              <span className="badge badge-warning mr-2">
                {t('presences.days_count', { count: feries.length })}
              </span>
              <button className="btn btn-tool" onClick={() => setShowFeries(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            {feries.length === 0 ? (
              <div className="text-center py-3 text-muted">{t('presences.no_holidays')}</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: 120 }}>{t('common.date')}</th>
                      <th>{t('presences.holiday_name_col')}</th>
                      <th style={{ width: 100 }}>{t('presences.holiday_day_col')}</th>
                      <th style={{ width: 80 }} className="text-center">{t('presences.holiday_type_col')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feries.map((f, i) => {
                      const d = new Date(f.date + 'T00:00:00')
                      const jourSem = JOURS_SEM[d.getDay() === 0 ? 6 : d.getDay() - 1]
                      const isSun = d.getDay() === 0
                      return (
                        <tr key={i} style={isSun ? { background: '#fff3cd' } : {}}>
                          <td className="font-weight-bold" style={{ fontSize: 13 }}>
                            {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                          </td>
                          <td style={{ fontSize: 13 }}>{f.nom}</td>
                          <td style={{ fontSize: 12 }}>{jourSem}</td>
                          <td className="text-center">
                            {f.est_mobile
                              ? <span className="badge badge-info" title={t('presences.mobile')}>{t('presences.mobile')}</span>
                              : <span className="badge badge-secondary">{t('presences.fixed')}</span>}
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
            <i className="fas fa-info-circle mr-1" />
            {t('presences.hs_overtime_note')}
          </div>
        </div>
      )}

      {/* Modal saisie manuelle */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-edit mr-2" />{t('presences.manual_entry_title')}
                  </h5>
                  <button type="button" className="close" onClick={() => setShowModal(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="font-weight-bold">
                      {t('presences.employee_col')} <span className="text-danger">*</span>
                    </label>
                    <select name="employe" className="form-control"
                      value={form.employe} onChange={handleChange} required>
                      <option value="">{t('presences.select_employee')}</option>
                      {employes.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">
                        {t('common.date')} <span className="text-danger">*</span>
                      </label>
                      <input type="date" name="date" className="form-control"
                        value={form.date} onChange={handleChange} required />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('common.status')}</label>
                      <select name="statut" className="form-control"
                        value={form.statut} onChange={handleChange}>
                        {STATUTS.map(s => (
                          <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('presences.arrival_time')}</label>
                      <input type="time" name="heure_arrivee" className="form-control"
                        value={form.heure_arrivee} onChange={handleChange} />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('presences.departure_time')}</label>
                      <input type="time" name="heure_depart" className="form-control"
                        value={form.heure_depart} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold">{t('presences.note_justification')}</label>
                    <textarea name="note" className="form-control" rows={2}
                      value={form.note} onChange={handleChange}
                      placeholder={t('presences.note_placeholder')} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving
                      ? <><i className="fas fa-spinner fa-spin mr-1" />{t('presences.saving')}</>
                      : <><i className="fas fa-save mr-1" />{t('common.save')}</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {apercuModal}
    </RHLayout>
  )
}
