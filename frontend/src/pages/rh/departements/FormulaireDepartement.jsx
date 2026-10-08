import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'
import { chargerTout } from '../../../api/listes'

const ICONES = [
  'fas fa-building', 'fas fa-users', 'fas fa-laptop-code', 'fas fa-chart-line',
  'fas fa-bullhorn', 'fas fa-cogs', 'fas fa-handshake', 'fas fa-balance-scale',
  'fas fa-chess-king', 'fas fa-shield-alt', 'fas fa-cloud', 'fas fa-code',
]

const EMPTY = { nom: '', code: '', description: '', couleur: '#2E74B5', icone: 'fas fa-building', actif: true }

export default function FormulaireDepartement() {
  const { id }      = useParams()
  const isEdit      = Boolean(id)
  const navigate    = useNavigate()
  const { t }       = useTranslation()
  const [form,     setForm]     = useState(EMPTY)
  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [managers, setManagers] = useState([])

  useEffect(() => {
    chargerTout('/accounts/users/?role=MANAGER')
      .then(r => setManagers(r.data.results ?? r.data))
      .catch(() => {})
    if (isEdit) {
      api.get(`/departements/${id}/`)
        .then(r => setForm({ ...r.data, responsable: r.data.responsable ?? '' }))
        .catch(() => { toast.error(t('departments.not_found')); navigate('/rh/departements') })
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, navigate]) // eslint-disable-line

  async function handleSave(e) {
    e.preventDefault()
    if (!form.nom.trim() || !form.code.trim()) {
      toast.error(t('departments.val_required'))
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, responsable: form.responsable || null }
      if (isEdit) {
        await api.put(`/departements/${id}/`, payload)
        toast.success(t('departments.update_success'))
      } else {
        await api.post('/departements/', payload)
        toast.success(t('departments.save_success'))
      }
      navigate('/rh/departements')
    } catch (err) {
      toast.error(err.response?.data?.code?.[0] || t('departments.save_error_code'))
    } finally {
      setSaving(false)
    }
  }

  const pageTitle = isEdit
    ? t('departments.edit_title_with_name', { nom: form.nom })
    : t('departments.create_title')

  if (loading) {
    return (
      <RHLayout pageTitle={isEdit ? t('departments.edit_title') : t('departments.create_title')}>
        <Spinner />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle={pageTitle}>
      <div className="row">
        <div className="col-md-8">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-building mr-2" />
                {isEdit ? t('departments.edit_title') : t('departments.create_title')}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group col-md-8">
                    <label className="font-weight-bold">
                      {t('departments.field_name')} <span className="text-danger">*</span>
                    </label>
                    <input type="text" className="form-control"
                      value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder={t('departments.name_placeholder')} />
                  </div>
                  <div className="form-group col-md-4">
                    <label className="font-weight-bold">
                      {t('departments.field_code')} <span className="text-danger">*</span>
                    </label>
                    <input type="text" className="form-control"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder={t('departments.code_placeholder')} maxLength={20} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="font-weight-bold">{t('departments.field_description')}</label>
                  <textarea className="form-control" rows={3}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t('departments.description_placeholder')} />
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('departments.field_manager')}</label>
                    <select className="form-control"
                      value={form.responsable || ''}
                      onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}>
                      <option value="">{t('departments.no_manager')}</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name || m.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-3">
                    <label className="font-weight-bold">{t('departments.field_color')}</label>
                    <input type="color" className="form-control" style={{ height: 38 }}
                      value={form.couleur}
                      onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))} />
                  </div>
                  <div className="form-group col-md-3">
                    <label className="font-weight-bold">{t('departments.field_active')}</label>
                    <div className="mt-2">
                      <div className="custom-control custom-switch">
                        <input type="checkbox" className="custom-control-input"
                          id="actif-switch" checked={form.actif}
                          onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
                        <label className="custom-control-label" htmlFor="actif-switch">
                          {form.actif ? t('departments.active_label') : t('departments.inactive_label')}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="font-weight-bold">{t('departments.field_icon')}</label>
                  <div className="d-flex flex-wrap mt-1" style={{ gap: 8 }}>
                    {ICONES.map(icone => (
                      <button key={icone} type="button"
                        onClick={() => setForm(f => ({ ...f, icone }))}
                        style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: form.icone === icone ? form.couleur : 'var(--bg-hover)',
                          color: form.icone === icone ? '#fff' : 'var(--text-muted)',
                          border: `1.5px solid ${form.icone === icone ? form.couleur : 'var(--border-color)'}`,
                          cursor: 'pointer', fontSize: 16,
                        }}>
                        <i className={icone} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-footer d-flex justify-content-between">
                <button type="button" className="btn btn-secondary"
                  onClick={() => navigate('/rh/departements')}>
                  <i className="fas fa-times mr-1" />{t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fas fa-save mr-1" />
                  {saving ? t('departments.saving') : isEdit ? t('departments.update_btn') : t('departments.create_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">
                <i className="fas fa-eye mr-1" />{t('departments.preview')}
              </h3>
            </div>
            <div className="card-body text-center py-4">
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: form.couleur, color: '#fff', fontSize: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <i className={form.icone} />
              </div>
              <div className="font-weight-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                {form.nom || t('departments.name_default')}
              </div>
              <code style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {form.code || t('departments.code_default')}
              </code>
              {form.description && (
                <p className="text-muted mt-2" style={{ fontSize: 12 }}>{form.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </RHLayout>
  )
}
