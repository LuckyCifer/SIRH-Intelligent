import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EncadreurLayout from '../../components/layout/EncadreurLayout'
import Spinner from '../../components/Spinner'
import useAuthStore from '../../store/authStore'
import api from '../../api/axios'
import { getMesStatsEncadreur } from '../../api/encadreur'
import FiliereBadge from '../../components/ui/FiliereBadge'

export default function EncadreurProfil() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
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
      toast.success(t('encadreur.update_success'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('encadreur.update_error'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <EncadreurLayout pageTitle={t('encadreur.my_profile_title')}>
        <Spinner />
      </EncadreurLayout>
    )
  }

  const initial = (user.first_name?.[0] || user.username?.[0] || 'E').toUpperCase()
  const nomComplet = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username

  return (
    <EncadreurLayout pageTitle={t('encadreur.my_profile_title')}>
      <div className="row">

        {/* Colonne gauche : carte profil */}
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
              <span className="badge badge-primary mb-2">{t('encadreur.supervisor_badge')}</span>
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
                {t('encadreur.member_since')} {new Date(user.date_joined).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </small>
            </div>
          </div>

          {stats && (
            <div className="card mt-0">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-chart-bar mr-2" />{t('encadreur.stats_card_title')}
                </h3>
              </div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush" style={{ fontSize: 13 }}>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-users mr-2 text-primary" />{t('encadreur.supervised_interns')}</span>
                    <strong>{stats.total_stagiaires}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-hourglass mr-2 text-warning" />{t('encadreur.pending_reports')}</span>
                    <strong style={{ color: stats.rapports_en_attente > 0 ? '#fd7e14' : 'inherit' }}>
                      {stats.rapports_en_attente}
                    </strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-percentage mr-2 text-success" />{t('encadreur.stat_validation_rate')}</span>
                    <strong>{stats.taux_validation}%</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between py-2">
                    <span><i className="fas fa-robot mr-2" style={{ color: '#6f42c1' }} />{t('encadreur.avg_ia_score')}</span>
                    <strong>{stats.score_moyen_global ?? '—'}/100</strong>
                  </li>
                  {stats.alertes_actives > 0 && (
                    <li className="list-group-item d-flex justify-content-between py-2 table-danger">
                      <span><i className="fas fa-bell mr-2 text-danger" />{t('encadreur.active_alerts')}</span>
                      <strong className="text-danger">{stats.alertes_actives}</strong>
                    </li>
                  )}
                </ul>
                {stats.par_filiere && Object.keys(stats.par_filiere).length > 0 && (
                  <div className="p-3">
                    <small className="text-muted d-block mb-2 font-weight-bold">{t('encadreur.by_filiere')}</small>
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

        {/* Colonne droite : formulaire édition */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-user-edit mr-2" />{t('encadreur.personal_info_title')}
              </h3>
              {!editing && (
                <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}>
                  <i className="fas fa-edit mr-1" />{t('encadreur.edit_btn')}
                </button>
              )}
            </div>
            <div className="card-body">
              {editing ? (
                <form onSubmit={handleSave}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: 13 }}>{t('encadreur.field_firstname')}</label>
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
                        <label style={{ fontSize: 13 }}>{t('encadreur.field_lastname')}</label>
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
                    <label style={{ fontSize: 13 }}>{t('encadreur.field_email')}</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>{t('encadreur.field_phone')}</label>
                    <input
                      type="tel"
                      className="form-control form-control-sm"
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>{t('encadreur.field_bio')}</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder={t('encadreur.bio_placeholder')}
                    />
                  </div>
                  <div className="d-flex" style={{ gap: 8 }}>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                      {saving
                        ? <><i className="fas fa-spinner fa-spin mr-1" />{t('encadreur.saving')}</>
                        : <><i className="fas fa-save mr-1" />{t('encadreur.save_btn')}</>
                      }
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditing(false)} disabled={saving}>
                      {t('encadreur.cancel_btn')}
                    </button>
                  </div>
                </form>
              ) : (
                <table className="table table-sm table-borderless mb-0" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>
                        <i className="fas fa-user mr-2" />{t('encadreur.field_firstname')}
                      </td>
                      <td>{user.first_name || <em className="text-muted">{t('encadreur.not_filled')}</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-user mr-2" />{t('encadreur.field_lastname')}</td>
                      <td>{user.last_name || <em className="text-muted">{t('encadreur.not_filled')}</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-at mr-2" />{t('encadreur.username_label')}</td>
                      <td><code>{user.username}</code></td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-envelope mr-2" />{t('encadreur.field_email')}</td>
                      <td>{user.email || <em className="text-muted">{t('encadreur.not_filled')}</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-phone mr-2" />{t('encadreur.field_phone')}</td>
                      <td>{user.telephone || <em className="text-muted">{t('encadreur.not_filled')}</em>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted"><i className="fas fa-id-badge mr-2" />{t('encadreur.role_label')}</td>
                      <td><span className="badge badge-primary">{t('encadreur.supervisor_badge')}</span></td>
                    </tr>
                    {user.bio && (
                      <tr>
                        <td className="text-muted"><i className="fas fa-info-circle mr-2" />{t('encadreur.bio_label')}</td>
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
