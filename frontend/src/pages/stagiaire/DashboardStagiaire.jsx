import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import Spinner from '../../components/Spinner'
import useAuthStore from '../../store/authStore'
import { getMesStats, getRapports } from '../../api/rapports'
import { getProjets, getPeriodes } from '../../api/stagiaires'
import { getMesSoldes } from '../../api/conges'
import { getMonPointageAujourdhui, pointerArrivee, pointerDepart } from '../../api/presences'
import { getMesDocuments } from '../../api/documents'
import { getMesObjectifs } from '../../api/objectifs'
import { getMesInscriptions } from '../../api/formations'
import { getMesBulletins } from '../../api/paie'

const FILIERE_LABELS = {
  ISA: 'IA Solutions Architect',
  IT: 'Informatique & Télécoms',
  GRAPHISME: 'Graphisme',
  AUTRE: 'Autre',
}

const STATUT_CONFIG = {
  BROUILLON: { badge: 'badge-secondary', label: 'Brouillon' },
  SOUMIS:    { badge: 'badge-primary',   label: 'Soumis' },
  VALIDE:    { badge: 'badge-success',   label: 'Validé' },
  REJETE:    { badge: 'badge-danger',    label: 'Rejeté' },
}

const PROJET_STATUT_CONFIG = {
  PROPOSE:  { badge: 'badge-secondary', label: 'Proposé' },
  VALIDE:   { badge: 'badge-success',   label: 'Validé' },
  EN_COURS: { badge: 'badge-primary',   label: 'En cours' },
  LIVRE:    { badge: 'badge-info',      label: 'Livré' },
  SOUTENU:  { badge: 'badge-warning',   label: 'Soutenu' },
}

// Jauge circulaire SVG simple
function ScoreGauge({ score }) {
  if (score == null) return <span className="text-muted">—</span>
  const r = 36
  const circ = 2 * Math.PI * r
  const prog = (score / 100) * circ
  const color = score >= 80 ? '#28a745' : score >= 60 ? '#2E74B5' : score >= 40 ? '#fd7e14' : '#dc3545'
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--border-color)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${prog} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="45" y="50" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

export default function DashboardStagiaire() {
  const { user } = useAuthStore()
  const [stats, setStats]     = useState(null)
  const [rapports, setRapports] = useState([])
  const [projet, setProjet]   = useState(null)
  const [periode, setPeriode] = useState(null)
  const [soldes,   setSoldes]   = useState([])
  const [pointage, setPointage] = useState(null)
  const [docRecents, setDocRecents] = useState([])
  const [objectifsRecents, setObjectifsRecents] = useState([])
  const [mesFormations, setMesFormations] = useState([])
  const [dernierBulletin, setDernierBulletin] = useState(null)
  const [actioning,  setActioning]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const annee = new Date().getFullYear()
        const [sRes, rRes, pjRes, peRes, soldesRes, ptRes, docRes, objRes, formRes, paieRes] = await Promise.all([
          getMesStats(),
          getRapports(),
          getProjets(),
          getPeriodes(),
          getMesSoldes({ annee }),
          getMonPointageAujourdhui(),
          getMesDocuments(),
          getMesObjectifs().catch(() => ({ data: [] })),
          getMesInscriptions().catch(() => ({ data: [] })),
          getMesBulletins().catch(() => ({ data: [] })),
        ])
        setStats(sRes.data)
        const allRapports = rRes.data.results ?? rRes.data
        setRapports(allRapports.slice(0, 5))
        const projets = pjRes.data.results ?? pjRes.data
        setProjet(projets[0] ?? null)
        const periodes = peRes.data.results ?? peRes.data
        setPeriode(periodes[0] ?? null)
        setSoldes(soldesRes.data.results ?? soldesRes.data)
        setPointage(ptRes.data.pointage !== undefined ? ptRes.data.pointage : ptRes.data)
        const allDocs = docRes.data.results ?? docRes.data
        setDocRecents(allDocs.slice(0, 3))
        const allObj = objRes.data.results ?? objRes.data
        setObjectifsRecents(Array.isArray(allObj) ? allObj.slice(0, 4) : [])
        setMesFormations(Array.isArray(formRes.data) ? formRes.data : (formRes.data.results ?? []))
        const bulletinsData = Array.isArray(paieRes.data) ? paieRes.data : (paieRes.data.results ?? [])
        setDernierBulletin(bulletinsData[0] ?? null)
      } catch (err) {
        console.error('[Dashboard] load error:', err)
        toast.error('Erreur lors du chargement du tableau de bord.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <StagiaireLayout pageTitle="Tableau de bord">
        <Spinner message="Chargement de votre tableau de bord…" />
      </StagiaireLayout>
    )
  }

  const semaineCourante = stats?.dernier_rapport_semaine
    ? stats.dernier_rapport_semaine + 1
    : 1

  async function handleArrivee() {
    setActioning('arrivee')
    try {
      const res = await pointerArrivee()
      toast.success(res.data.message)
      setPointage(res.data.pointage)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de pointage.')
    } finally { setActioning(null) }
  }

  async function handleDepart() {
    setActioning('depart')
    try {
      const res = await pointerDepart()
      toast.success(res.data.message)
      setPointage(res.data.pointage)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de pointage.')
    } finally { setActioning(null) }
  }

  return (
    <StagiaireLayout pageTitle={`Bonjour, ${user?.first_name || user?.username} !`}>

      {/* ── Période active ── */}
      {periode && (
        <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
          <i className="fas fa-calendar-alt mr-2" />
          Stage en cours : <strong>{periode.date_debut}</strong> → <strong>{periode.date_fin}</strong>
          {periode.encadreur_detail && (
            <span className="ml-3">
              <i className="fas fa-user-tie mr-1" />
              Encadreur : <strong>
                {periode.encadreur_detail.full_name || periode.encadreur_detail.username}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* ── 4 Small Boxes stats ── */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box" style={{ background: '#2E74B5', color: '#fff' }}>
            <div className="inner">
              <h3>{stats?.soumis ?? 0}</h3>
              <p>Rapports soumis</p>
            </div>
            <div className="icon"><i className="fas fa-paper-plane" /></div>
            <Link to="/stagiaire/rapports" className="small-box-footer" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Voir tous <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{stats?.valides ?? 0}</h3>
              <p>Rapports validés</p>
            </div>
            <div className="icon"><i className="fas fa-check-double" /></div>
            <span className="small-box-footer">
              {stats?.total_rapports
                ? `${Math.round((stats.valides / stats.total_rapports) * 100)}% du total`
                : 'Aucun rapport'}
            </span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box" style={{ background: '#6f42c1', color: '#fff' }}>
            <div className="inner">
              <h3>{stats?.score_moyen != null ? `${stats.score_moyen}` : '—'}</h3>
              <p>Score IA moyen / 100</p>
            </div>
            <div className="icon"><i className="fas fa-robot" /></div>
            <span className="small-box-footer" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Meilleur : {stats?.meilleur_score ?? '—'}/100
            </span>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>S{semaineCourante}</h3>
              <p>Prochaine semaine</p>
            </div>
            <div className="icon"><i className="fas fa-calendar-week" /></div>
            <Link to="/stagiaire/rapports/nouveau"
              className="small-box-footer">
              Rédiger le rapport <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Barre de taux de soumission ── */}
      {stats && stats.total_rapports > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card mb-0">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="font-weight-bold" style={{ color: 'var(--text-secondary)' }}>
                    Taux de soumission
                  </small>
                  <small style={{ color: 'var(--acerfi-blue)', fontWeight: 700 }}>
                    {stats.taux_soumission}%
                  </small>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-bar bg-primary"
                    style={{ width: `${stats.taux_soumission}%`, transition: 'width 0.6s ease' }}
                    role="progressbar" />
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">{stats.total_rapports} rapport{stats.total_rapports > 1 ? 's' : ''} au total</small>
                  <small className="text-muted">{stats.brouillons} brouillon{stats.brouillons > 1 ? 's' : ''}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Deux colonnes : 5 derniers rapports + Mon projet ── */}
      <div className="row">

        {/* Colonne gauche — 5 derniers rapports (60%) */}
        <div className="col-md-7">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-list-ul mr-2" />
                Derniers rapports
              </h3>
              <Link to="/stagiaire/rapports" className="btn btn-sm btn-outline-primary">
                Voir tout
              </Link>
            </div>
            <div className="card-body p-0">
              {rapports.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-inbox fa-2x mb-2 d-block" />
                  <p className="mb-2">Vous n'avez pas encore soumis de rapport.</p>
                  <Link to="/stagiaire/rapports/nouveau" className="btn btn-sm btn-primary">
                    <i className="fas fa-plus mr-1" />
                    Commencer par la semaine 1
                  </Link>
                </div>
              ) : (
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Semaine</th>
                      <th>Statut</th>
                      <th>Score IA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapports.map(r => {
                      const cfg = STATUT_CONFIG[r.statut] || STATUT_CONFIG.BROUILLON
                      return (
                        <tr key={r.id}>
                          <td className="font-weight-bold">
                            S{r.semaine_numero}
                            <br />
                            <small className="text-muted">{r.date_debut_semaine}</small>
                          </td>
                          <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                          <td className="font-weight-bold"
                            style={{ color: r.analyse ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {r.analyse ? `${r.analyse.score_engagement}/100` : '—'}
                          </td>
                          <td>
                            <Link to={`/stagiaire/rapports/${r.id}`}
                              className="btn btn-xs btn-outline-secondary"
                              style={{ fontSize: 11 }}>
                              <i className="fas fa-eye" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite — Mon projet (40%) */}
        <div className="col-md-5">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-bullseye mr-2" />
                Mon projet de soutenance
              </h3>
            </div>
            <div className="card-body">
              {projet ? (
                <>
                  <h6 className="font-weight-bold" style={{ color: 'var(--page-title)' }}>
                    {projet.theme}
                  </h6>
                  {projet.description && (
                    <p className="text-muted" style={{ fontSize: 12 }}>
                      {projet.description.slice(0, 120)}{projet.description.length > 120 ? '…' : ''}
                    </p>
                  )}
                  <div className="mt-3">
                    {(() => {
                      const cfg = PROJET_STATUT_CONFIG[projet.statut] || PROJET_STATUT_CONFIG.PROPOSE
                      return (
                        <span className={`badge ${cfg.badge} mr-2`}>{cfg.label}</span>
                      )
                    })()}
                    {projet.date_soutenance && (
                      <small className="text-muted">
                        <i className="fas fa-calendar mr-1" />
                        {projet.date_soutenance}
                      </small>
                    )}
                    {projet.note != null && (
                      <span className="badge badge-success ml-2">
                        Note : {projet.note}/20
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <Link to="/stagiaire/projet" className="btn btn-sm btn-outline-primary btn-block">
                      <i className="fas fa-edit mr-1" />
                      Voir mon projet
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <i className="fas fa-folder-open fa-2x mb-2 d-block text-muted" />
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    Aucun projet déclaré.
                  </p>
                  <Link to="/stagiaire/projet" className="btn btn-sm btn-primary">
                    <i className="fas fa-plus mr-1" />
                    Déclarer mon projet
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Score global card */}
          {stats?.score_moyen != null && (
            <div className="card mt-3">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-robot mr-2" />
                  Score IA global
                </h3>
              </div>
              <div className="card-body text-center">
                <ScoreGauge score={stats.score_moyen} />
                <p className="mt-2 mb-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Basé sur {stats.total_rapports - stats.brouillons} analyse{stats.total_rapports - stats.brouillons > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Widget Pointage du jour ── */}
      <div className="row mt-1 mb-2">
        <div className="col-md-6">
          <div className="card card-outline card-success mb-0">
            <div className="card-header py-2">
              <h3 className="card-title" style={{ fontSize: 13 }}>
                <i className="fas fa-fingerprint mr-2" />Pointage du jour
              </h3>
              <div className="card-tools">
                <Link to="/employe/presences" className="btn btn-xs btn-outline-secondary">
                  Historique
                </Link>
              </div>
            </div>
            <div className="card-body py-2">
              {pointage && pointage.id ? (
                <div className="d-flex align-items-center justify-content-around">
                  <div className="text-center">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Arrivée</div>
                    {pointage.heure_arrivee
                      ? <strong style={{ color: '#28A745', fontSize: 16 }}>{pointage.heure_arrivee?.slice(0,5)}</strong>
                      : <button className="btn btn-xs btn-success" disabled={actioning === 'arrivee'}
                          onClick={handleArrivee}>
                          {actioning === 'arrivee' ? <i className="fas fa-spinner fa-spin" /> : 'Pointer'}
                        </button>}
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Départ</div>
                    {pointage.heure_depart
                      ? <strong style={{ color: '#DC3545', fontSize: 16 }}>{pointage.heure_depart?.slice(0,5)}</strong>
                      : <button className="btn btn-xs btn-danger"
                          disabled={!pointage.heure_arrivee || actioning === 'depart'}
                          onClick={handleDepart}>
                          {actioning === 'depart' ? <i className="fas fa-spinner fa-spin" /> : 'Pointer'}
                        </button>}
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Heures</div>
                    <strong style={{ color: 'var(--acerfi-blue)', fontSize: 16 }}>
                      {pointage.heures_travaillees ? `${parseFloat(pointage.heures_travaillees).toFixed(1)}h` : '—'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted" style={{ fontSize: 12 }}>Pas encore pointé aujourd'hui.</span>
                  <button className="btn btn-sm btn-success" disabled={actioning === 'arrivee'} onClick={handleArrivee}>
                    {actioning === 'arrivee'
                      ? <><i className="fas fa-spinner fa-spin mr-1" />…</>
                      : <><i className="fas fa-sign-in-alt mr-1" />Pointer arrivée</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Documents récents ── */}
        <div className="col-md-6">
          <div className="card card-outline card-info mb-0">
            <div className="card-header py-2">
              <h3 className="card-title" style={{ fontSize: 13 }}>
                <i className="fas fa-folder-open mr-2" />Mes documents récents
              </h3>
              <div className="card-tools">
                <Link to="/employe/documents" className="btn btn-xs btn-outline-secondary">
                  Voir tout
                </Link>
              </div>
            </div>
            <div className="card-body p-0">
              {docRecents.length === 0 ? (
                <div className="text-center py-2 text-muted" style={{ fontSize: 12 }}>
                  Aucun document disponible.
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {docRecents.map(doc => (
                    <li key={doc.id} className="list-group-item py-1 d-flex justify-content-between align-items-center">
                      <span style={{ fontSize: 12 }}>
                        <i className={`${doc.categorie_detail?.icone || 'fas fa-file'} mr-1`}
                          style={{ color: doc.categorie_detail?.couleur }} />
                        {doc.titre}
                      </span>
                      <a href={doc.fichier} target="_blank" rel="noopener noreferrer"
                        className="btn btn-xs btn-outline-primary">
                        <i className="fas fa-download" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Carte Congés ── */}
      {(() => {
        const soldeCA = soldes.find(s => s.type_conge_detail?.code === 'CA')
        const restant = soldeCA ? parseFloat(soldeCA.solde_restant).toFixed(0) : null
        const acquis  = soldeCA ? parseFloat(soldeCA.jours_acquis).toFixed(0)  : 30
        const pct     = soldeCA && acquis > 0
          ? Math.min(100, (parseFloat(soldeCA.jours_pris) / parseFloat(acquis)) * 100)
          : 0
        const barColor = pct < 50 ? '#28A745' : pct < 80 ? '#FD7E14' : '#DC3545'
        return (
          <div className="row mt-1">
            <div className="col-12">
              <div className="card card-primary card-outline">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h3 className="card-title">
                    <i className="fas fa-umbrella-beach mr-2" />
                    Mes congés
                  </h3>
                  <Link to="/employe/conges" className="btn btn-sm btn-outline-primary">
                    Voir tout
                  </Link>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      {restant !== null ? (
                        <>
                          <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}>
                            <span className="font-weight-bold">Congé annuel</span>
                            <span className="text-muted">
                              {parseFloat(soldeCA.jours_pris).toFixed(0)}/{acquis} jours pris
                            </span>
                          </div>
                          <div className="progress mb-1" style={{ height: 10 }}>
                            <div className="progress-bar" role="progressbar"
                              style={{ width: `${pct}%`, background: barColor, transition: 'width .6s' }} />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            <strong style={{ color: barColor }}>{restant}</strong> jour{restant !== '1' ? 's' : ''} restant{restant !== '1' ? 's' : ''}
                            {parseFloat(soldeCA.jours_en_attente) > 0 && (
                              <span className="ml-2">
                                <i className="fas fa-clock mr-1" />{parseFloat(soldeCA.jours_en_attente).toFixed(0)}j en attente
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                          Faites votre première demande pour initialiser vos soldes.
                        </p>
                      )}
                    </div>
                    <div className="col-md-6 text-right">
                      <Link to="/employe/conges/nouveau" className="btn btn-success btn-sm">
                        <i className="fas fa-plus mr-1" />Faire une demande
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Objectifs récents ── */}
      {objectifsRecents.length > 0 && (
        <div className="row mt-1">
          <div className="col-12">
            <div className="card card-outline card-primary">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-bullseye mr-2" />Mes objectifs en cours
                </h3>
                <Link to="/employe/mes-objectifs" className="btn btn-xs btn-outline-secondary">
                  Voir tout
                </Link>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {objectifsRecents.map(o => (
                    <li key={o.id} className="list-group-item py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span style={{ fontSize: 13 }}>{o.titre}</span>
                        <div className="d-flex align-items-center" style={{ gap: 8 }}>
                          <div style={{ width: 80 }}>
                            <div className="progress" style={{ height: 6 }}>
                              <div className="progress-bar bg-primary" style={{ width: `${o.progression}%` }} />
                            </div>
                          </div>
                          <small className="text-muted">{o.progression}%</small>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mes formations ── */}
      {(() => {
        const now = new Date()
        const aVenir = mesFormations.filter(i =>
          (i.statut === 'INSCRIT' || i.statut === 'EN_ATTENTE') &&
          i.formation_detail?.date_debut &&
          new Date(i.formation_detail.date_debut) >= now
        )
        const suivies = mesFormations.filter(i => i.statut === 'PRESENT').length
        const prochaine = aVenir.sort((a, b) =>
          new Date(a.formation_detail.date_debut) - new Date(b.formation_detail.date_debut)
        )[0]
        return (
          <div className="row mt-1">
            <div className="col-12">
              <div className="card card-outline card-primary">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h3 className="card-title" style={{ fontSize: 13 }}>
                    <i className="fas fa-graduation-cap mr-2" />Mes formations
                  </h3>
                  <div className="d-flex gap-2">
                    <Link to="/employe/mes-formations" className="btn btn-xs btn-outline-secondary">Mes inscriptions</Link>
                    <Link to="/employe/formations" className="btn btn-xs btn-primary">Catalogue</Link>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-4 border-right">
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#28a745' }}>{suivies}</div>
                      <small className="text-muted">Formations suivies</small>
                    </div>
                    <div className="col-4 border-right">
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#007bff' }}>{aVenir.length}</div>
                      <small className="text-muted">À venir</small>
                    </div>
                    <div className="col-4">
                      {prochaine ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--page-title)' }}>
                            {prochaine.formation_detail?.titre}
                          </div>
                          <small className="text-muted">
                            <i className="fas fa-calendar mr-1" />
                            {new Date(prochaine.formation_detail.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </small>
                        </>
                      ) : (
                        <small className="text-muted">Aucune à venir</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dernier bulletin de paie ── */}
      {dernierBulletin && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card card-outline mb-0" style={{ borderColor: 'var(--acerfi-blue)', background: 'var(--card-bg)' }}>
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <h3 className="card-title" style={{ fontSize: 13 }}>
                  <i className="fas fa-coins mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                  Dernier bulletin de paie — {dernierBulletin.periode}
                </h3>
                <Link to="/employe/paie" className="btn btn-xs btn-outline-primary">Mes bulletins</Link>
              </div>
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: 'var(--acerfi-blue)' }}>
                      {Number(dernierBulletin.salaire_brut).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">Salaire brut</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#fd7e14' }}>
                      {Number(dernierBulletin.cnps_employe).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">CNPS</small>
                  </div>
                  <div className="col-6 col-md-3 border-right">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#6f42c1' }}>
                      {Number(dernierBulletin.irpp).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">IRPP</small>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="font-weight-bold" style={{ fontSize: 18, color: '#28a745' }}>
                      {Number(dernierBulletin.salaire_net).toLocaleString('fr-FR')} F
                    </div>
                    <small className="text-muted">Net à payer</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </StagiaireLayout>
  )
}
