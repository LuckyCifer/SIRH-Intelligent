import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import { getMonDashboard } from '../../api/encadreur'
import FiliereBadge from '../../components/ui/FiliereBadge'
import { getFiliere } from '../../constants/filieres'

const ALERTE_CONFIG = {
  AUCUNE:  { cls: 'badge-success',  icon: '🟢', label: 'Aucune alerte',  pulse: false },
  FAIBLE:  { cls: 'badge-success',  icon: '🟡', label: 'Faible',          pulse: false },
  MOYENNE: { cls: 'badge-warning',  icon: '🟠', label: 'Moyenne',         pulse: true  },
  ELEVEE:  { cls: 'badge-danger',   icon: '🔴', label: 'Élevée',          pulse: true  },
}

const STATUT_PERIODE = {
  EN_COURS:  { cls: 'badge-primary', label: 'En cours' },
  TERMINE:   { cls: 'badge-secondary', label: 'Terminé' },
  ABANDONNE: { cls: 'badge-danger',    label: 'Abandonné' },
}

function ScoreBar({ score }) {
  if (score == null) return <span className="text-muted" style={{ fontSize: 12 }}>—</span>
  const color = score >= 80 ? '#28a745' : score >= 60 ? '#2E74B5' : score >= 40 ? '#fd7e14' : '#dc3545'
  return (
    <div>
      <div className="d-flex justify-content-between" style={{ fontSize: 12, marginBottom: 2 }}>
        <span style={{ color }}>Score IA moyen : <strong>{score}/100</strong></span>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div className="progress-bar" role="progressbar"
          style={{ width: `${score}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, j] = d.split('-')
  const mois = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']
  return `${parseInt(j)} ${mois[parseInt(m) - 1]} ${y}`
}

export default function MesStagiaires() {
  const [stagiaires, setStagiaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreFiliere, setFiltreFiliere] = useState('')

  useEffect(() => {
    getMonDashboard()
      .then(r => setStagiaires(r.data.stagiaires || []))
      .catch(() => toast.error('Impossible de charger les stagiaires.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <EncadreurLayout pageTitle="Mes stagiaires">
        <Spinner message="Chargement des stagiaires…" />
      </EncadreurLayout>
    )
  }

  const filieres = [...new Set(stagiaires.map(s => s.filiere))]

  const filtered = stagiaires.filter(s => {
    const matchSearch = !search || s.nom_complet.toLowerCase().includes(search.toLowerCase())
      || s.username.toLowerCase().includes(search.toLowerCase())
    const matchFiliere = !filtreFiliere || s.filiere === filtreFiliere
    return matchSearch && matchFiliere
  })

  return (
    <EncadreurLayout pageTitle="Mes stagiaires">
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(220,53,69,.4); }
          70%  { box-shadow: 0 0 0 6px rgba(220,53,69,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,53,69,0); }
        }
        .alerte-pulse { animation: pulse-ring 1.8s ease-in-out infinite; }
      `}</style>

      {/* ── Filtres ── */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="input-group input-group-sm">
            <div className="input-group-prepend">
              <span className="input-group-text"><i className="fas fa-search" /></span>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher par nom ou username…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select className="form-control form-control-sm" value={filtreFiliere} onChange={e => setFiltreFiliere(e.target.value)}>
            <option value="">Toutes les filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="col-md-3 text-right">
          <span className="text-muted" style={{ fontSize: 13, lineHeight: '30px' }}>
            {filtered.length} / {stagiaires.length} stagiaire{stagiaires.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="fas fa-user-slash fa-3x mb-3 d-block" />
          <p>Aucun stagiaire ne correspond à ces critères.</p>
        </div>
      ) : (
        <div className="row">
          {filtered.map(s => {
            const alerteCfg  = ALERTE_CONFIG[s.ia?.niveau_alerte] || ALERTE_CONFIG.AUCUNE
            const periodeCfg = STATUT_PERIODE[s.periode?.statut] || STATUT_PERIODE.EN_COURS
            const isPulse    = alerteCfg.pulse
            return (
              <div className="col-xl-4 col-md-6" key={s.id}>
                <div
                  className={`card mb-4 ${isPulse ? 'alerte-pulse' : ''}`}
                  style={{
                    border: isPulse ? '2px solid #dc3545' : '1px solid var(--border-color)',
                    transition: 'border-color .2s',
                  }}
                >
                  <div className="card-body pb-2">

                    {/* ── Ligne 1 : Avatar + Nom ── */}
                    <div className="d-flex align-items-center mb-3">
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                        background: getFiliere(s.filiere).couleur,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 19, marginRight: 12,
                      }}>
                        {(s.nom_complet || s.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-weight-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                          {s.nom_complet}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          <FiliereBadge code={s.filiere} size="sm" />
                          <span className="ml-1">&middot; {s.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Période ── */}
                    <div className="mb-2" style={{ fontSize: 12 }}>
                      <i className="fas fa-calendar-alt mr-1" style={{ color: 'var(--acerfi-blue)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Stage : <strong>{fmtDate(s.periode?.date_debut)}</strong> → <strong>{fmtDate(s.periode?.date_fin)}</strong>
                      </span>
                      <span className={`badge ${periodeCfg.cls} ml-2`} style={{ fontSize: 10 }}>
                        {periodeCfg.label}
                      </span>
                    </div>

                    <hr className="my-2" style={{ borderColor: 'var(--border-color)' }} />

                    {/* ── Rapports ── */}
                    <div className="d-flex flex-wrap mb-2" style={{ gap: 4 }}>
                      <span className="badge badge-secondary">
                        <i className="fas fa-file-alt mr-1" />{s.rapports.total} rapports
                      </span>
                      {s.rapports.valides > 0 && (
                        <span className="badge badge-success">
                          <i className="fas fa-check mr-1" />{s.rapports.valides} validé{s.rapports.valides > 1 ? 's' : ''}
                        </span>
                      )}
                      {s.rapports.en_attente_validation > 0 && (
                        <span className="badge badge-warning">
                          <i className="fas fa-hourglass-half mr-1" />{s.rapports.en_attente_validation} en attente
                        </span>
                      )}
                      {s.rapports.brouillons > 0 && (
                        <span className="badge badge-secondary">
                          <i className="fas fa-pencil-alt mr-1" />{s.rapports.brouillons} brouillon{s.rapports.brouillons > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <hr className="my-2" style={{ borderColor: 'var(--border-color)' }} />

                    {/* ── Score IA ── */}
                    <div className="mb-2">
                      <ScoreBar score={s.ia?.score_moyen} />
                      <div className="mt-1" style={{ fontSize: 12 }}>
                        {alerteCfg.icon}
                        <span className={`badge ${alerteCfg.cls} ml-1`}>{alerteCfg.label}</span>
                      </div>
                    </div>

                    {/* ── Projet ── */}
                    {s.projet && (
                      <>
                        <hr className="my-2" style={{ borderColor: 'var(--border-color)' }} />
                        <div style={{ fontSize: 12 }}>
                          <i className="fas fa-bullseye mr-1" style={{ color: 'var(--acerfi-blue)' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {s.projet.theme.length > 55 ? s.projet.theme.slice(0, 55) + '…' : s.projet.theme}
                          </span>
                          <span className="badge badge-info ml-1" style={{ fontSize: 10 }}>{s.projet.statut}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className="card-footer py-2" style={{ background: 'transparent', border: 'none' }}>
                    <div className="btn-group btn-group-sm w-100">
                      <Link to={`/encadreur/stagiaires/${s.id}`} className="btn btn-outline-primary">
                        <i className="fas fa-user mr-1" />Voir le profil
                      </Link>
                      <Link to={`/encadreur/rapports-a-valider`} className="btn btn-outline-secondary">
                        <i className="fas fa-clipboard-list mr-1" />Rapports
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </EncadreurLayout>
  )
}
