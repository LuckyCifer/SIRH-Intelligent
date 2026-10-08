import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'

const EMPTY_FORM = {
  nom: '', code: '', jours_par_an: 30,
  est_paye: true, necessite_justificatif: false,
  couleur: '#2E74B5', description: '', actif: true,
}

export default function TypesConges() {
  const { t } = useTranslation()
  const [types,   setTypes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  async function load() {
    try {
      const res = await api.get('/conges/types/?actif=0')
      setTypes(res.data.results ?? res.data)
    } catch {
      toast.error(t('conges_extra.load_types_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(tp) {
    setEditId(tp.id)
    setForm({
      nom: tp.nom, code: tp.code, jours_par_an: tp.jours_par_an,
      est_paye: tp.est_paye, necessite_justificatif: tp.necessite_justificatif,
      couleur: tp.couleur, description: tp.description || '', actif: tp.actif,
    })
    setShowModal(true)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim() || !form.code.trim()) {
      toast.error(t('conges_extra.name_code_required'))
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, jours_par_an: parseInt(form.jours_par_an, 10) }
      if (editId) {
        await api.put(`/conges/types/${editId}/`, payload)
        toast.success(t('conges_extra.type_updated'))
      } else {
        await api.post('/conges/types/', payload)
        toast.success(t('conges_extra.type_created'))
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

  async function toggleActif(tp) {
    try {
      await api.patch(`/conges/types/${tp.id}/`, { actif: !tp.actif })
      toast.success(tp.actif ? t('conges_extra.type_deactivated') : t('conges_extra.type_activated'))
      load()
    } catch {
      toast.error(t('conges_extra.toggle_error'))
    }
  }

  if (loading) {
    return (
      <RHLayout pageTitle={t('conges.leave_types')}>
        <Spinner message={t('common.loading')} />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle={t('conges.leave_types')}>

      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          {t('conges_extra.active_count', {
            active: types.filter(tp => tp.actif).length,
            total: types.length,
          })}
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <i className="fas fa-plus mr-1" />{t('conges_extra.new_type')}
        </button>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0">
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('conges_extra.col_code')}</th>
                  <th className="text-center">{t('conges_extra.col_days_year')}</th>
                  <th className="text-center">{t('conges_extra.col_paid')}</th>
                  <th className="text-center">{t('conges_extra.col_doc')}</th>
                  <th>{t('conges_extra.col_color')}</th>
                  <th>{t('conges_extra.col_description')}</th>
                  <th className="text-center">{t('common.status')}</th>
                  <th className="text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      <i className="fas fa-inbox fa-2x mb-2 d-block" />
                      {t('conges_extra.no_types_configured')}
                    </td>
                  </tr>
                ) : (
                  types.map(tp => (
                    <tr key={tp.id} className={!tp.actif ? 'text-muted' : ''}>
                      <td className="font-weight-bold" style={{ fontSize: 13 }}>
                        <span style={{ borderLeft: `4px solid ${tp.couleur}`, paddingLeft: 8 }}>
                          {tp.nom}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 12 }}>{tp.code}</code>
                      </td>
                      <td className="text-center font-weight-bold" style={{ fontSize: 13 }}>
                        {tp.jours_par_an}j
                      </td>
                      <td className="text-center">
                        {tp.est_paye
                          ? <i className="fas fa-check-circle text-success" />
                          : <i className="fas fa-times-circle text-danger" />}
                      </td>
                      <td className="text-center">
                        {tp.necessite_justificatif
                          ? <span className="badge badge-warning" style={{ fontSize: 10 }}>{t('conges_extra.required_badge')}</span>
                          : <span className="text-muted" style={{ fontSize: 11 }}>{t('common.no')}</span>}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                        }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: 3,
                            background: tp.couleur, flexShrink: 0,
                          }} />
                          {tp.couleur}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, maxWidth: 200 }}>
                        <span className="text-muted">
                          {tp.description
                            ? (tp.description.length > 60
                                ? tp.description.slice(0, 60) + '…'
                                : tp.description)
                            : '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        {tp.actif
                          ? <span className="badge badge-success">{t('common.active')}</span>
                          : <span className="badge badge-secondary">{t('common.inactive')}</span>}
                      </td>
                      <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-xs btn-outline-primary mr-1"
                          onClick={() => openEdit(tp)}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          className={`btn btn-xs btn-outline-${tp.actif ? 'danger' : 'success'}`}
                          onClick={() => toggleActif(tp)}
                          title={tp.actif ? t('conges_extra.deactivate') : t('conges_extra.activate')}
                        >
                          <i className={`fas fa-${tp.actif ? 'ban' : 'check'}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal création / édition */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-umbrella-beach mr-2" />
                    {editId ? t('conges_extra.edit_type_title') : t('conges_extra.new_type_title')}
                  </h5>
                  <button type="button" className="close" onClick={() => setShowModal(false)}>
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group col-md-8">
                      <label className="font-weight-bold">
                        {t('common.name')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" name="nom" className="form-control"
                        value={form.nom} onChange={handleChange} required
                        placeholder={t('conges_extra.name_placeholder')}
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">
                        {t('conges_extra.col_code')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text" name="code" className="form-control"
                        value={form.code} onChange={handleChange} required
                        placeholder={t('conges_extra.code_placeholder')}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">{t('conges_extra.days_per_year')}</label>
                      <input
                        type="number" name="jours_par_an" className="form-control"
                        value={form.jours_par_an} onChange={handleChange}
                        min={1} max={365} required
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">{t('conges_extra.col_color')}</label>
                      <div className="d-flex align-items-center">
                        <input
                          type="color" name="couleur" className="form-control p-1 mr-2"
                          value={form.couleur} onChange={handleChange}
                          style={{ width: 50, height: 38 }}
                        />
                        <input
                          type="text" name="couleur" className="form-control"
                          value={form.couleur} onChange={handleChange}
                          pattern="^#[0-9A-Fa-f]{6}$"
                          placeholder="#2E74B5"
                        />
                      </div>
                    </div>
                    <div className="form-group col-md-4 d-flex flex-column justify-content-end">
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input" type="checkbox"
                          id="est_paye" name="est_paye"
                          checked={form.est_paye} onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="est_paye">{t('conges.is_paid')}</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input" type="checkbox"
                          id="necessite_justificatif" name="necessite_justificatif"
                          checked={form.necessite_justificatif} onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="necessite_justificatif">
                          {t('conges_extra.doc_required')}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="font-weight-bold">{t('conges_extra.col_description')}</label>
                    <textarea
                      name="description" className="form-control" rows={2}
                      value={form.description} onChange={handleChange}
                      placeholder={t('conges_extra.description_placeholder')}
                    />
                  </div>

                  {editId && (
                    <div className="form-check">
                      <input
                        className="form-check-input" type="checkbox"
                        id="actif_modal" name="actif"
                        checked={form.actif} onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="actif_modal">{t('conges_extra.type_active_label')}</label>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving
                      ? <><i className="fas fa-spinner fa-spin mr-1" />{t('conges_extra.saving')}</>
                      : <><i className="fas fa-save mr-1" />{t('common.save')}</>
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
