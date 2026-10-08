import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import StagiaireLayout from '../../components/layout/StagiaireLayout'
import FiliereBadge    from '../../components/ui/FiliereBadge'
import FiliereCard     from '../../components/ui/FiliereCard'
import { FILIERES, getFiliere } from '../../constants/filieres'
import useAuthStore from '../../store/authStore'
import api from '../../api/axios'

export default function MonProfil() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    telephone:  user?.telephone  || '',
    bio:        user?.bio        || '',
  })
  const [editingFiliere, setEditingFiliere] = useState(false)
  const [newFiliere, setNewFiliere] = useState(user?.filiere || 'AUTRE')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSaveFiliere() {
    setSaving(true)
    try {
      await api.put('/accounts/me/', { filiere: newFiliere })
      await refreshUser()
      toast.success(t('stagiaire.filiere_updated'))
      setEditingFiliere(false)
    } catch {
      toast.error(t('stagiaire.update_error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.put('/accounts/me/', form)
      await refreshUser()
      toast.success(t('stagiaire.profile_updated'))
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : t('stagiaire.update_error'))
    } finally {
      setSaving(false)
    }
  }

  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()
  const filiereColor = getFiliere(user?.filiere).couleur

  return (
    <StagiaireLayout pageTitle={t('stagiaire.my_profile_title')}>
      <div className="row">

        {/* Carte profil */}
        <div className="col-md-4">
          <div className="card card-primary card-outline">
            <div className="card-body text-center py-4">
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: filiereColor, color: '#fff',
                fontSize: 36, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: `0 4px 16px ${filiereColor}55`,
              }}>
                {initial}
              </div>

              <h4 className="mb-1 font-weight-bold" style={{ color: 'var(--text-primary)' }}>
                {user?.first_name} {user?.last_name}
              </h4>
              <p className="text-muted mb-2" style={{ fontSize: 13 }}>@{user?.username}</p>

              <FiliereBadge code={user?.filiere} size="md" />

              <div className="mt-2">
                {editingFiliere ? (
                  <div style={{ textAlign: 'left', marginTop: 8 }}>
                    <div className="row" style={{ rowGap: 8, columnGap: 0 }}>
                      {FILIERES.map(f => (
                        <div className="col-6 px-1 mb-2" key={f.code}>
                          <FiliereCard
                            code={f.code}
                            selected={newFiliere === f.code}
                            onClick={() => setNewFiliere(f.code)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="d-flex mt-2" style={{ gap: 8 }}>
                      <button className="btn btn-sm btn-primary flex-fill" onClick={handleSaveFiliere} disabled={saving}>
                        <i className="fas fa-save mr-1" />{t('stagiaire.save_btn')}
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditingFiliere(false)}>
                        {t('stagiaire.cancel_btn')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-xs btn-outline-secondary mt-2" style={{ fontSize: 11 }}
                    onClick={() => { setNewFiliere(user?.filiere || 'AUTRE'); setEditingFiliere(true) }}>
                    <i className="fas fa-exchange-alt mr-1" />{t('stagiaire.change_filiere')}
                  </button>
                )}
              </div>

              <div className="mt-2">
                <span className="badge badge-secondary p-2">
                  <i className="fas fa-user-graduate mr-1" />
                  {t('stagiaire.intern_badge')}
                </span>
              </div>

              {user?.bio && (
                <p className="mt-3 text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
                  « {user.bio} »
                </p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">
                <i className="fas fa-address-card mr-1" />
                {t('stagiaire.contact_section')}
              </h3>
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: 100, fontSize: 12 }}>
                      <i className="fas fa-envelope mr-1" />{t('stagiaire.field_email')}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {user?.email || <span className="text-muted">—</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      <i className="fas fa-phone mr-1" />{t('stagiaire.field_phone')}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {user?.telephone || <span className="text-muted">—</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      <i className="fas fa-calendar-alt mr-1" />{t('stagiaire.field_joined')}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {user?.date_joined?.slice(0, 10) || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-user-edit mr-2" />
                {editing ? t('stagiaire.personal_info_edit') : t('stagiaire.personal_info_view')}
              </h3>
              {!editing && (
                <button className="btn btn-sm btn-outline-primary"
                  onClick={() => setEditing(true)}>
                  <i className="fas fa-edit mr-1" />
                  {t('stagiaire.edit_btn')}
                </button>
              )}
            </div>
            <div className="card-body">
              {editing ? (
                <>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('stagiaire.field_firstname')}</label>
                      <input type="text" className="form-control" name="first_name"
                        value={form.first_name} onChange={handleChange} />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('stagiaire.field_lastname')}</label>
                      <input type="text" className="form-control" name="last_name"
                        value={form.last_name} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('stagiaire.field_email')}</label>
                      <input type="email" className="form-control" name="email"
                        value={form.email} onChange={handleChange} />
                    </div>
                    <div className="form-group col-md-6">
                      <label className="font-weight-bold">{t('stagiaire.field_phone')}</label>
                      <input type="text" className="form-control" name="telephone"
                        value={form.telephone} onChange={handleChange}
                        placeholder="Ex: 699 000 001" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold">{t('stagiaire.field_bio')}</label>
                    <textarea className="form-control" name="bio" rows={3}
                      placeholder={t('stagiaire.bio_placeholder')}
                      value={form.bio} onChange={handleChange} />
                  </div>
                </>
              ) : (
                <dl className="row">
                  {[
                    { label: t('stagiaire.field_firstname'),  value: user?.first_name },
                    { label: t('stagiaire.field_lastname'),   value: user?.last_name },
                    { label: t('stagiaire.field_username'),   value: user?.username },
                    { label: t('stagiaire.field_email'),      value: user?.email },
                    { label: t('stagiaire.field_phone'),      value: user?.telephone },
                    { label: t('stagiaire.field_filiere'),    value: getFiliere(user?.filiere)?.label },
                    { label: t('stagiaire.field_bio'),        value: user?.bio },
                  ].map(({ label, value }) => (
                    <div key={label} className="col-sm-6 mb-2">
                      <dt className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                        {label}
                      </dt>
                      <dd style={{ color: 'var(--text-primary)' }}>
                        {value || <span className="text-muted">{t('stagiaire.not_filled')}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {editing && (
              <div className="card-footer d-flex justify-content-end gap-2" style={{ gap: 8 }}>
                <button className="btn btn-secondary mr-2"
                  onClick={() => {
                    setEditing(false)
                    setForm({
                      first_name: user?.first_name || '',
                      last_name:  user?.last_name  || '',
                      email:      user?.email      || '',
                      telephone:  user?.telephone  || '',
                      bio:        user?.bio        || '',
                    })
                  }}>
                  <i className="fas fa-times mr-1" />{t('stagiaire.cancel_btn')}
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  <i className="fas fa-save mr-1" />
                  {saving ? t('stagiaire.saving') : t('stagiaire.save_btn')}
                </button>
              </div>
            )}
          </div>

          <div className="alert alert-secondary" style={{ fontSize: 12 }}>
            <i className="fas fa-shield-alt mr-2" />
            {t('stagiaire.password_note')}
          </div>
        </div>
      </div>
    </StagiaireLayout>
  )
}
