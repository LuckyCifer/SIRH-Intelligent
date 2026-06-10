import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import useAuthStore from '../../store/authStore'
import api from '../../api/axios'
import { getMesStatsEncadreur } from '../../api/encadreur'
import FiliereBadge from '../../components/ui/FiliereBadge'

export default function EncadreurProfil() {
  const { user, refreshUser } = useAuthStore()
  const [stats, setStats]   = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    first_name: '', last_name: '', email: '', telephone: '', bio: '',
  })

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name:  user.last_name  || '',
        email:      user.email      || '',
        telephone:  user.telephone  || '',
        bio:        user.bio        || '',
      })
    }
  }, [user])

  useEffect(() => {
    getMesStatsEncadreur()
      .then(r => setStats(r.data))
      .catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/accounts/me/', form)
      await refreshUser()
      setEditing(false)
      toast.success('Profil mis à jour avec succès.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <EncadreurLayout pageTitle="Mon profil">
        <Spinner />
      </EncadreurLayout>
    )
  }

  const initial = (user.first_name?.[0] || user.username?.[0] || 'E').toUpperCase()
  const nomComplet = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username

  return (
    <EncadreurLayout pageTitle="Mon profil">
      <div className="row">

        {/* ── Colonne gauche : carte profil ── */}
        <div className="col-md-4">
          <div className="card card-primary card-outline">
            <div className="card-body text-center pt-4 pb-3">
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: 'var(--acerfi-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 36,
                margin: '0 auto 12px',
              }}>
                {initial}
              </div>
              <h5 className="mb-1" style={{ color: 'var(--page-title)' }}>{nomComplet}</h5>
              <span className="badge badge-primary mb-2">Encadreur professionnel</span>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {user.email && <div><i className="fas fa-envelope mr-1" />{user.email}</div>}
                {user.telephone && <div className="mt-1"><i className="fas fa-phone mr-1" />{user.telephone}</div>}
                <div className="mt-1"><i className="fas fa-user mr-1" />{user.username}</div>
              </div>
              {user.bio && (
                <div className="mt-3 text-muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                  "{user.bio}"
                </div>
              )}
            </div>
            <div className="card-footer py-2 text-center">
              <small className="text-muted">
                <i className="fas fa-calendar-alt mr-1" />
                Membre depuis {new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </small>
            </div>
          </div>

          {/* ── Stats encadreur ── */}
          {stats && (
            <div className="card mt-0">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-chart-bar mr-2" />Mes statistiques
                </h3>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush" style={{ fontSize: 13 }}>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-users mr-2 text-primary" />Stagiaires encadrés</span>
                    <strong>{stats.total_stagiaires}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-hourglass mr-2 text-warning" />Rapports en attente</span>
                    <strong style={{ color: stats.rapports_en_attente > 0 ? '#fd7e14' : 'inherit' }}>
                      {stats.rapports_en_attente}
                    </strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-percentage mr-2 text-success" />Taux de validation</span>
                    <strong>{stats.taux_validation}%</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-robot mr-2" style={{ color: '#6f42c1' }} />Score IA moyen</span>
                    <strong>{stats.score_moyen_global ?? '—'}/100</strong>
                  </li>
                  {stats.alertes_actives > 0 && (
                    <li className="list-group-item d-flex justify-content-between py-2 table-danger">
                      <span><i className="fas fa-bell mr-2 text-danger" />Alertes actives</span>
                      <strong className="text-danger">{stats.alertes_actives}</strong>
                    </li>
                  )}
                </ul>
                {stats.par_filiere && Object.keys(stats.par_filiere).length > 0 && (
                  <div className="p-3">
                    <small className="text-muted d-block mb-2 font-weight-bold">Par filière :</small>
                    {Object.entries(stats.par_filiere).map(([f, n]) => (
                      <div key={f} className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: 12 }}>
                        <FiliereBadge code={f} size="sm" />
                        <span className="badge badge-secondary ml-1">{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite : formulaire édition ── */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-user-edit mr-2" />Informations personnelles
              </h3>
              {!editing && (
                <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}>
                  <i className="fas fa-edit mr-1" />Modifier
                </button>
              )}
            </div>
            <div className="card-body">
              {editing ? (
                <form onSubmit={handleSave}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: 13 }}>Prénom</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={form.first_name}
                          onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: 13 }}>Nom de famille</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={form.last_name}
                          onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>Email</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>Téléphone</label>
                    <input
                      type="tel"
                      className="form-control form-control-sm"
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>Bio / Description</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Votre rôle, expertise, domaines d'encadrement…"
                    />
                  </div>
                  <div className="d-flex" style={{ gap: 8 }}>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                      {saving
                        ? <><i className="fas fa-spinner fa-spin mr-1" />Enregistrement…</>
                        : <><i className="fas fa-save mr-1" />Enregistrer</>
                      }
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditing(false)} disabled={saving}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <table className="table table-sm table-borderless mb-0" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>
                        <i className="fas fa-user mr-2" />Prénom
                      </td>
                      <td>{user.first_name || <em className="text-muted">Non renseigné</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-user mr-2" />Nom</td>
                      <td>{user.last_name || <em className="text-muted">Non renseigné</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-at mr-2" />Username</td>
                      <td><code>{user.username}</code></td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-envelope mr-2" />Email</td>
                      <td>{user.email || <em className="text-muted">Non renseigné</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-phone mr-2" />Téléphone</td>
                      <td>{user.telephone || <em className="text-muted">Non renseigné</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-id-badge mr-2" />Rôle</td>
                      <td><span className="badge badge-primary">Encadreur professionnel</span></td>
                    </tr>
                    {user.bio && (
                      <tr>
                        <td className="text-muted"><i className="fas fa-info-circle mr-2" />Bio</td>
                        <td style={{ fontStyle: 'italic' }}>{user.bio}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </EncadreurLayout>
  )
}
