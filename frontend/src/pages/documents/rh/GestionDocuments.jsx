import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import { getDocuments, getCategories, uploadDocument, deleteDocument, telechargerDocument } from '../../../api/documents'
import { useApercu } from '../../../components/ui/useApercu'
import { chargerTout } from '../../../api/listes'

const VIS_CLS = {
  PRIVE: 'badge-dark', EMPLOYE: 'badge-primary',
  EQUIPE: 'badge-info', TOUS: 'badge-success',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const EMPTY_FORM = {
  employe: '', categorie: '', titre: '', description: '',
  visibilite: 'EMPLOYE', date_expiration: '', fichier: null,
}

export default function GestionDocuments() {
  const { t } = useTranslation()
  const { voirFichier, apercuModal } = useApercu()

  const VISIBILITES = [
    { value: 'PRIVE',   label: t('documents.vis_private') },
    { value: 'EMPLOYE', label: t('documents.vis_employee') },
    { value: 'EQUIPE',  label: t('documents.vis_team') },
    { value: 'TOUS',    label: t('documents.vis_all') },
  ]

  const [docs,       setDocs]       = useState([])
  const [categories, setCategories] = useState([])
  const [employes,   setEmployes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [showForm,   setShowForm]   = useState(false)

  const [form,           setForm]          = useState(EMPTY_FORM)
  const [filtreEmploye,  setFiltreEmploye] = useState('')
  const [filtreCategorie,setFiltreCategorie] = useState('')
  const [filtreVis,      setFiltreVis]     = useState('')

  async function load() {
    try {
      const [dRes, cRes, uRes] = await Promise.all([
        getDocuments(),
        getCategories(),
        chargerTout('/accounts/users/'),
      ])
      setDocs(dRes.data.results ?? dRes.data)
      setCategories(cRes.data.results ?? cRes.data)
      setEmployes((uRes.data.results ?? uRes.data).filter(u => u.role === 'EMPLOYE'))
    } catch {
      toast.error(t('documents.load_error_rh'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  function handleChange(e) {
    const { name, value, files } = e.target
    if (name === 'fichier') setForm(f => ({ ...f, fichier: files[0] }))
    else setForm(f => ({ ...f, [name]: value }))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.categorie || !form.titre.trim() || !form.fichier) {
      toast.error(t('documents.val_required'))
      return
    }
    if (form.fichier.size > 10 * 1024 * 1024) {
      toast.error(t('documents.val_too_large'))
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('categorie',   form.categorie)
      fd.append('titre',       form.titre)
      fd.append('description', form.description)
      fd.append('visibilite',  form.visibilite)
      fd.append('fichier',     form.fichier)
      if (form.employe)         fd.append('employe',         form.employe)
      if (form.date_expiration) fd.append('date_expiration', form.date_expiration)

      await uploadDocument(fd)
      toast.success(t('documents.upload_success'))
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      const data = err.response?.data
      const msg  = data ? Object.values(data).flat().join(' ') : t('documents.upload_error')
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, titre) {
    if (!window.confirm(t('documents.delete_confirm', { titre }))) return
    try {
      await deleteDocument(id)
      toast.success(t('documents.delete_success'))
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error(t('documents.delete_error'))
    }
  }

  const filtered = docs.filter(d => {
    if (filtreEmploye && String(d.employe) !== filtreEmploye) return false
    if (filtreCategorie && String(d.categorie) !== filtreCategorie) return false
    if (filtreVis && d.visibilite !== filtreVis) return false
    return true
  })

  const expirantBientot = docs.filter(d => d.expire_bientot).length

  if (loading) {
    return (
      <RHLayout pageTitle={t('documents.page_title_manage')}>
        <Spinner />
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle={t('documents.page_title_manage')}>
      {expirantBientot > 0 && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between mb-3" style={{ fontSize: 13 }}>
          <span>
            <i className="fas fa-exclamation-triangle mr-2" />
            <strong>{expirantBientot}</strong> {t('documents.alert_expiring', { count: expirantBientot })}
          </span>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          {t('documents.total_count', { count: docs.length, s: docs.length !== 1 ? 's' : '' })}
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <i className={`fas fa-${showForm ? 'minus' : 'upload'} mr-1`} />
          {showForm ? t('documents.btn_hide_form') : t('documents.btn_upload')}
        </button>
      </div>

      {showForm && (
        <div className="card card-primary card-outline mb-3">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-upload mr-2" />{t('documents.upload_form_title')}
            </h3>
          </div>
          <form onSubmit={handleUpload} encType="multipart/form-data">
            <div className="card-body">
              <div className="form-row">
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">
                    {t('documents.field_employee')} <span className="text-muted font-weight-normal">{t('documents.field_employee_optional')}</span>
                  </label>
                  <select name="employe" className="form-control form-control-sm"
                    value={form.employe} onChange={handleChange}>
                    <option value="">{t('documents.general_doc')}</option>
                    {employes.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">{t('documents.field_category')} <span className="text-danger">*</span></label>
                  <select name="categorie" className="form-control form-control-sm"
                    value={form.categorie} onChange={handleChange} required>
                    <option value="">{t('documents.select_category')}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-md-4">
                  <label className="font-weight-bold">{t('documents.field_visibility')}</label>
                  <select name="visibilite" className="form-control form-control-sm"
                    value={form.visibilite} onChange={handleChange}>
                    {VISIBILITES.map(v => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-md-6">
                  <label className="font-weight-bold">{t('documents.field_title')} <span className="text-danger">*</span></label>
                  <input type="text" name="titre" className="form-control form-control-sm"
                    value={form.titre} onChange={handleChange} required
                    placeholder={t('documents.title_placeholder')} />
                </div>
                <div className="form-group col-md-3">
                  <label className="font-weight-bold">{t('documents.field_expiry')}</label>
                  <input type="date" name="date_expiration" className="form-control form-control-sm"
                    value={form.date_expiration} onChange={handleChange} />
                </div>
                <div className="form-group col-md-3">
                  <label className="font-weight-bold">{t('documents.field_file')} <span className="text-danger">*</span></label>
                  <input type="file" name="fichier" className="form-control-file mt-1"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleChange} required />
                  <small className="text-muted">{t('documents.file_hint')}</small>
                </div>
              </div>
              <div className="form-group">
                <label className="font-weight-bold">{t('documents.field_description')}</label>
                <textarea name="description" className="form-control form-control-sm" rows={2}
                  value={form.description} onChange={handleChange}
                  placeholder={t('documents.description_placeholder')} />
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin mr-1" />{t('documents.uploading')}</>
                  : <><i className="fas fa-cloud-upload-alt mr-1" />{t('documents.btn_upload_action')}</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card card-outline card-secondary">
        <div className="card-body py-2">
          <div className="form-row">
            <div className="form-group col-md-4 mb-2">
              <label className="text-sm font-weight-bold">{t('documents.field_employee')}</label>
              <select className="form-control form-control-sm"
                value={filtreEmploye} onChange={e => setFiltreEmploye(e.target.value)}>
                <option value="">{t('documents.filter_all_employees')}</option>
                {employes.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-4 mb-2">
              <label className="text-sm font-weight-bold">{t('documents.field_category')}</label>
              <select className="form-control form-control-sm"
                value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}>
                <option value="">{t('documents.filter_all_categories')}</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-4 mb-2">
              <label className="text-sm font-weight-bold">{t('documents.field_visibility')}</label>
              <select className="form-control form-control-sm"
                value={filtreVis} onChange={e => setFiltreVis(e.target.value)}>
                <option value="">{t('documents.filter_all_visibilities')}</option>
                {VISIBILITES.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-folder mr-2" />
            {t('documents.filtered_count', { count: filtered.length, s: filtered.length !== 1 ? 's' : '' })}
            {filtered.length !== docs.length && (
              <span className="text-muted font-weight-normal ml-1">
                {t('documents.filtered_of', { total: docs.length })}
              </span>
            )}
          </h3>
        </div>
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-folder-open fa-2x mb-2 d-block" />{t('documents.no_docs_table')}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>{t('documents.col_title')}</th>
                    <th>{t('documents.col_employee')}</th>
                    <th>{t('documents.col_category')}</th>
                    <th>{t('documents.col_size')}</th>
                    <th>{t('documents.col_visibility')}</th>
                    <th>{t('documents.col_expiry')}</th>
                    <th>{t('documents.col_uploaded_by')}</th>
                    <th className="text-center">{t('documents.col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => (
                    <tr key={doc.id} className={doc.expire_bientot ? 'table-warning' : ''}>
                      <td className="font-weight-bold" style={{ fontSize: 12 }}>
                        <i className={`${doc.categorie_detail?.icone || 'fas fa-file'} mr-1`}
                          style={{ color: doc.categorie_detail?.couleur }} />
                        {doc.titre}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {doc.employe_detail?.full_name || doc.employe_detail?.username || (
                          <span className="text-muted">{t('documents.general')}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{doc.categorie_detail?.nom || '—'}</td>
                      <td style={{ fontSize: 11 }}>{doc.taille_lisible}</td>
                      <td>
                        <span className={`badge ${VIS_CLS[doc.visibilite] || 'badge-secondary'}`}
                          style={{ fontSize: 10 }}>
                          {VISIBILITES.find(v => v.value === doc.visibilite)?.label || doc.visibilite}
                        </span>
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {doc.date_expiration ? (
                          <span className={doc.expire_bientot ? 'text-warning font-weight-bold' : ''}>
                            {fmtDate(doc.date_expiration)}
                            {doc.expire_bientot && (
                              <i className="fas fa-exclamation-triangle ml-1 text-warning" />
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {doc.uploade_par_detail?.full_name || '—'}
                      </td>
                      <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-xs btn-outline-primary mr-1"
                          title={t('apercu.preview')}
                          onClick={() => {
                            telechargerDocument(doc.id)
                              .then(res => voirFichier(
                                res.data,
                                doc.fichier ? doc.fichier.split('/').pop() : `document-${doc.id}.pdf`,
                                doc.titre,
                              ))
                              .catch(() => toast.error(t('documents.download_error', 'Échec du téléchargement'), { id: 'dl-err' }))
                          }}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          className="btn btn-xs btn-outline-danger"
                          onClick={() => handleDelete(doc.id, doc.titre)}
                          title={t('common.delete')}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {apercuModal}
    </RHLayout>
  )
}
