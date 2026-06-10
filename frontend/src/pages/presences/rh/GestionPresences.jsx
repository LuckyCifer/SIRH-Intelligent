import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import { getRapportEquipe, getPointages, creerPointage, updatePointage } from '../../../api/presences'
import api from '../../../api/axios'

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const STATUTS = ['PRESENT','ABSENT','RETARD','CONGE','FERIE','WEEKEND']
const STATUT_LABELS = {
  PRESENT:'Présent', ABSENT:'Absent', RETARD:'En retard',
  CONGE:'En congé', FERIE:'Jour férié', WEEKEND:'Week-end',
}
const STATUT_CLS = {
  PRESENT:'badge-success', ABSENT:'badge-danger', RETARD:'badge-warning',
  CONGE:'badge-primary', FERIE:'badge-secondary', WEEKEND:'badge-light',
}

function TauxBadge({ taux }) {
  const color = taux >= 90 ? '#28A745' : taux >= 75 ? '#FD7E14' : '#DC3545'
  return <span className="font-weight-bold" style={{ color, fontSize: 13 }}>{taux}%</span>
}

function getMoisParam(annee, mois) {
  return `${annee}-${String(mois + 1).padStart(2, '0')}`
}

function exportCSV(rapport, moisLabel) {
  const header = ['Employé','Département','Présents','Absents','Retards','Heures','Taux%']
  const rows   = rapport.map(e => [
    e.nom_complet, e.departement,
    e.jours_presents, e.jours_absents, e.jours_retard,
    e.total_heures, e.taux_presence,
  ])
  const csv = [header, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = `presences_${moisLabel}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const EMPTY_FORM = {
  employe: '', date: '', heure_arrivee: '', heure_depart: '',
  statut: 'PRESENT', note: '',
}

export default function GestionPresences() {
  const today = new Date()
  const [annee, setAnnee] = useState(today.getFullYear())
  const [mois,  setMois]  = useState(today.getMonth())

  const [rapport,  setRapport]  = useState([])
  const [employes, setEmployes] = useState([])
  const [depts,    setDepts]    = useState([])
  const [loading,  setLoading]  = useState(true)

  const [filtreDept, setFiltreDept] = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)

  const moisParam = getMoisParam(annee, mois)

  async function load() {
    setLoading(true)
    const [rRes, uRes, dRes] = await Promise.allSettled([
      getRapportEquipe(moisParam),
      api.get('/accounts/users/'),
      api.get('/departements/'),
    ])
    if (rRes.status === 'fulfilled') {
      setRapport(rRes.value.data.employes || [])
    } else {
      console.error('presences/rapport-equipe:', rRes.reason)
      toast.error('Erreur lors du chargement du rapport.', { id: 'presences-rapport-error' })
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
      toast.error('Employé et date sont obligatoires.')
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
        toast.success('Pointage mis à jour.')
      } else {
        await creerPointage(payload)
        toast.success('Pointage créé.')
      }
      setShowModal(false)
      load()
    } catch (err) {
      const data = err.response?.data
      const msg  = data ? Object.values(data).flat().join(' ') : 'Erreur.'
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
      <RHLayout pageTitle="Gestion des présences">
        <Spinner message="Chargement du rapport…" />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle="Gestion des présences">

      {/* En-tête : mois + filtres + actions */}
      <div className="card card-outline card-primary">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-calendar-alt mr-2" />
            Rapport mensuel
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
              <i className="fas fa-plus mr-1" />Saisie manuelle
            </button>
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => exportCSV(filtered, moisParam)}
            >
              <i className="fas fa-file-csv mr-1" />CSV
            </button>
          </div>
        </div>
        <div className="card-body py-2">
          <div className="form-row align-items-end">
            <div className="form-group col-md-4 mb-0">
              <label className="text-sm font-weight-bold">Département</label>
              <select className="form-control form-control-sm"
                value={filtreDept} onChange={e => setFiltreDept(e.target.value)}>
                <option value="">Tous les départements</option>
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
            {filtered.length} employé{filtered.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-inbox fa-2x mb-2 d-block" />Aucune donnée.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th>Département</th>
                    <th className="text-center">Présents</th>
                    <th className="text-center">Absents</th>
                    <th className="text-center">Retards</th>
                    <th className="text-center">Heures</th>
                    <th className="text-center">Taux</th>
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
                      <td className="text-center"><TauxBadge taux={emp.taux_presence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal saisie manuelle */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-edit mr-2" />Saisie manuelle de pointage
                  </h5>
                  <button type="button" className="close" onClick={() => setShowModal(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="font-weight-bold">
                      Employé <span className="text-danger">*</span>
                    </label>
                    <select name="employe" className="form-control"
                      value={form.employe} onChange={handleChange} required>
                      <option value="">— Sélectionner —</option>
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
                        Date <span className="text-danger">*</span>
                      </label>
                      <input type="date" name="date" className="form-control"
                        value={form.date} onChange={handleChange} required />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">Statut</label>
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
                      <label className="font-weight-bold">Heure arrivée</label>
                      <input type="time" name="heure_arrivee" className="form-control"
                        value={form.heure_arrivee} onChange={handleChange} />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">Heure départ</label>
                      <input type="time" name="heure_depart" className="form-control"
                        value={form.heure_depart} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold">Note / Justification</label>
                    <textarea name="note" className="form-control" rows={2}
                      value={form.note} onChange={handleChange}
                      placeholder="Observation éventuelle…" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving
                      ? <><i className="fas fa-spinner fa-spin mr-1" />Enregistrement…</>
                      : <><i className="fas fa-save mr-1" />Enregistrer</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </RHLayout>
  )
}
