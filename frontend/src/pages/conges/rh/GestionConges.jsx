import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import CalendrierAbsences from '../../../components/ui/CalendrierAbsences'
import { getDemandes, getTypesConge, getStatsConges } from '../../../api/conges'
import api from '../../../api/axios'

const STATUT_CONFIG = {
  EN_ATTENTE: { cls: 'badge-warning',   label: 'En attente' },
  APPROUVE:   { cls: 'badge-success',   label: 'Approuvé' },
  REFUSE:     { cls: 'badge-danger',    label: 'Refusé' },
  ANNULE:     { cls: 'badge-secondary', label: 'Annulé' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function exportCSV(demandes) {
  const header = ['Employé','Département','Type','Début','Fin','Jours','Motif','Statut','Valideur','Commentaire']
  const rows = demandes.map(d => [
    d.employe_detail?.full_name || d.employe_detail?.username || '',
    d.employe_detail?.departement_nom || '',
    d.type_conge_detail?.nom || '',
    d.date_debut,
    d.date_fin,
    d.nb_jours,
    `"${(d.motif || '').replace(/"/g, '""')}"`,
    d.statut_display || d.statut,
    d.valideur_detail?.full_name || '',
    `"${(d.commentaire_valideur || '').replace(/"/g, '""')}"`,
  ])
  const csv = [header, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `conges_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function GestionConges() {
  const annee = new Date().getFullYear()

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

  useEffect(() => {
    async function load() {
      const [dRes, tRes, deptRes, sRes] = await Promise.allSettled([
        getDemandes({ annee }),
        getTypesConge(),
        api.get('/departements/'),
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
      <RHLayout pageTitle="Gestion des congés">
        <Spinner message="Chargement des congés…" />
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
    <RHLayout pageTitle="Gestion des congés">

      {/* Stats KPI */}
      <div className="row mb-3">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{stats?.en_attente ?? 0}</h3>
              <p>En attente</p>
            </div>
            <div className="icon"><i className="fas fa-hourglass-half" /></div>
            <span className="small-box-footer">
              <i className="fas fa-clock mr-1" />À valider
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{stats?.approuves ?? 0}</h3>
              <p>Approuvés</p>
            </div>
            <div className="icon"><i className="fas fa-check-circle" /></div>
            <span className="small-box-footer">
              <i className="fas fa-calendar-check mr-1" />Ce mois
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{ background: '#2E74B5', color: '#fff' }}>
            <div className="inner">
              <h3>{stats?.total_jours_pris ?? 0}j</h3>
              <p>Jours pris</p>
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
              <p>Taux approbation</p>
            </div>
            <div className="icon"><i className="fas fa-percent" /></div>
            <span className="small-box-footer">
              <i className="fas fa-thumbs-up mr-1" />Sur l'année
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
              className={`btn btn-sm ${showCal ? 'btn-primary' : 'btn-outline-primary'} mr-2`}
              onClick={() => setShowCal(c => !c)}
            >
              <i className="fas fa-calendar-alt mr-1" />Calendrier
            </button>
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => exportCSV(filtered)}
            >
              <i className="fas fa-file-csv mr-1" />Export CSV
            </button>
          </div>
        </div>
        <div className="card-body py-2">
          <div className="form-row align-items-end">
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">Statut</label>
              <select className="form-control form-control-sm"
                value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
                <option value="">Tous les statuts</option>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">Département</label>
              <select className="form-control form-control-sm"
                value={filtreDept} onChange={e => setFiltreDept(e.target.value)}>
                <option value="">Tous les départements</option>
                {depts.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">Type de congé</label>
              <select className="form-control form-control-sm"
                value={filtreType} onChange={e => setFiltreType(e.target.value)}>
                <option value="">Tous les types</option>
                {types.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="text-sm font-weight-bold">Employé</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Rechercher…"
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
              <i className="fas fa-calendar-alt mr-2" />Calendrier des absences (approuvées)
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
              Aucune demande correspondant aux filtres.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th>Type</th>
                    <th>Période</th>
                    <th className="text-center">Jours</th>
                    <th>Motif</th>
                    <th>Statut</th>
                    <th>Valideur</th>
                    <th>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => {
                    const cfg = STATUT_CONFIG[d.statut] || STATUT_CONFIG.EN_ATTENTE
                    return (
                      <tr key={d.id}>
                        <td style={{ fontSize: 12 }}>
                          <div className="font-weight-bold">{d.employe_detail?.full_name || d.employe_detail?.username || '—'}</div>
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
                        </td>
                        <td style={{ fontSize: 11, maxWidth: 150 }}>
                          <span className="text-muted">
                            {d.motif ? (d.motif.length > 60 ? d.motif.slice(0, 60) + '…' : d.motif) : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {d.valideur_detail?.full_name || d.valideur_detail?.username || '—'}
                        </td>
                        <td style={{ fontSize: 11, maxWidth: 150 }}>
                          <span className="text-muted">
                            {d.commentaire_valideur
                              ? (d.commentaire_valideur.length > 60
                                  ? d.commentaire_valideur.slice(0, 60) + '…'
                                  : d.commentaire_valideur)
                              : '—'}
                          </span>
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

    </RHLayout>
  )
}
