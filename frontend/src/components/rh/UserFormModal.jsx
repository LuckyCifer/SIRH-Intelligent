import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { createUser, getUserById, updateUser } from '../../api/gestionComptes'
import { UserAvatarCard } from '../ui/UserAvatar'
import { uploadPhotoProfil, supprimerPhotoProfil } from '../../api/profil'
import { chargerTout } from '../../api/listes'

const CATEGORIES_PRO = [
  'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
]

const LEGAL_FIELDS = {
  numero_cnps: '', numero_cni: '', niu: '',
  categorie_pro: '', echelon: 1, coefficient: 100,
  date_dernier_avancement: '', prochain_avancement: '',
  situation_matrimoniale: 'CELIBATAIRE',
  nb_enfants_a_charge: 0, nb_enfants_moins_6_ans: 0,
  nationalite: 'Camerounaise', date_naissance: '',
  lieu_naissance: '', adresse: '',
  personne_contact_urgence: '', contact_urgence_tel: '',
}

const INIT_CREATE = {
  username: '', password: '', confirm_password: '',
  first_name: '', last_name: '', email: '',
  role: 'EMPLOYE', telephone: '', bio: '',
  departement: '', poste: '',
  ...LEGAL_FIELDS,
}

const INIT_EDIT = {
  username: '', first_name: '', last_name: '', email: '',
  role: 'EMPLOYE', telephone: '', bio: '',
  is_active: true, departement: '', poste: '',
  ...LEGAL_FIELDS,
}

export default function UserFormModal({ isOpen, onClose, onSuccess, userId = null }) {
  const { t } = useTranslation()
  const isEdit = !!userId

  const ROLES = [
    { value: 'EMPLOYE',  label: t('accounts.employe') },
    { value: 'MANAGER',  label: t('accounts.manager') },
    { value: 'RH',       label: t('accounts.rh') },
  ]

  const SITUATIONS_MATRIMONIALES = [
    { value: 'CELIBATAIRE', label: t('accounts.marital_celibataire') },
    { value: 'MARIE',       label: t('accounts.marital_marie') },
    { value: 'DIVORCE',     label: t('accounts.marital_divorce') },
    { value: 'VEUF',        label: t('accounts.marital_veuf') },
  ]

  const [form, setForm]             = useState(isEdit ? INIT_EDIT : INIT_CREATE)
  const [errors, setErrors]         = useState({})
  const [loading, setLoading]       = useState(false)
  const [fetching, setFetching]     = useState(false)
  const [departements, setDepts]    = useState([])
  const [showPwd, setShowPwd]       = useState(false)
  const [showPwd2, setShowPwd2]     = useState(false)
  const [showLegal, setShowLegal]   = useState(false)
  const [photoData, setPhotoData]   = useState({ photo_url: null, first_name: '', last_name: '' })
  const [photoLoading, setPhotoLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    chargerTout('/departements/')
      .then(r => setDepts(r.data.results ?? r.data))
      .catch(() => {})
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !isEdit) return
    setFetching(true)
    getUserById(userId)
      .then(r => {
        const u = r.data
        setPhotoData({ photo_url: u.photo_url || null, first_name: u.first_name || '', last_name: u.last_name || '' })
        setForm({
          username:    u.username    || '',
          first_name:  u.first_name  || '',
          last_name:   u.last_name   || '',
          email:       u.email       || '',
          role:        u.role        || 'EMPLOYE',
          telephone:   u.telephone   || '',
          bio:         u.bio         || '',
          is_active:   u.is_active   ?? true,
          departement: u.departement || '',
          poste:       u.poste       || '',
          numero_cnps: u.numero_cnps || '',
          numero_cni:  u.numero_cni  || '',
          niu:         u.niu         || '',
          categorie_pro:           u.categorie_pro           || '',
          echelon:                 u.echelon                 ?? 1,
          coefficient:             u.coefficient             ?? 100,
          date_dernier_avancement: u.date_dernier_avancement || '',
          prochain_avancement:     u.prochain_avancement     || '',
          situation_matrimoniale:  u.situation_matrimoniale  || 'CELIBATAIRE',
          nb_enfants_a_charge:     u.nb_enfants_a_charge     ?? 0,
          nb_enfants_moins_6_ans:  u.nb_enfants_moins_6_ans  ?? 0,
          nationalite:              u.nationalite              || 'Camerounaise',
          date_naissance:           u.date_naissance           || '',
          lieu_naissance:           u.lieu_naissance           || '',
          adresse:                  u.adresse                  || '',
          personne_contact_urgence: u.personne_contact_urgence || '',
          contact_urgence_tel:      u.contact_urgence_tel      || '',
        })
      })
      .catch(() => toast.error(t('accounts.load_user_error')))
      .finally(() => setFetching(false))
  }, [isOpen, userId, isEdit])

  useEffect(() => {
    if (!isOpen) {
      setForm(isEdit ? INIT_EDIT : INIT_CREATE)
      setErrors({})
      setShowPwd(false)
      setShowPwd2(false)
      setShowLegal(false)
    }
  }, [isOpen, isEdit])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validateCreate() {
    const e = {}
    if (!form.first_name.trim()) e.first_name = t('accounts.val_first_name')
    if (!form.last_name.trim())  e.last_name  = t('accounts.val_last_name')
    if (!form.username.trim())   e.username   = t('accounts.val_username')
    if (!form.email.trim())      e.email      = t('accounts.val_email')
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('accounts.val_email_invalid')
    if (!form.password)          e.password   = t('accounts.val_password')
    else if (form.password.length < 8) e.password = t('accounts.val_password_min')
    if (form.password !== form.confirm_password)
      e.confirm_password = t('accounts.val_password_mismatch')
    return e
  }

  function validateEdit() {
    const e = {}
    if (!form.first_name.trim()) e.first_name = t('accounts.val_first_name')
    if (!form.last_name.trim())  e.last_name  = t('accounts.val_last_name')
    if (!form.username.trim())   e.username   = t('accounts.val_username')
    if (!form.email.trim())      e.email      = t('accounts.val_email')
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('accounts.val_email_invalid')
    return e
  }

  async function handleUploadPhoto(fichier) {
    setPhotoLoading(true)
    try {
      const r = await uploadPhotoProfil(userId, fichier)
      setPhotoData(d => ({ ...d, photo_url: r.data.photo_url || null }))
      toast.success(t('accounts.photo_updated'))
    } catch {
      toast.error(t('accounts.photo_upload_error'))
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleSupprimerPhoto() {
    if (!window.confirm(t('accounts.confirm_delete_photo'))) return
    setPhotoLoading(true)
    try {
      await supprimerPhotoProfil(userId)
      setPhotoData(d => ({ ...d, photo_url: null }))
      toast.success(t('accounts.photo_deleted'))
    } catch {
      toast.error(t('accounts.photo_delete_error'))
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = isEdit ? validateEdit() : validateCreate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.departement) delete payload.departement
      if (!payload.poste)       delete payload.poste

      if (isEdit) {
        await updateUser(userId, payload)
        toast.success(t('accounts.save_success_edit'))
      } else {
        await createUser(payload)
        toast.success(t('accounts.save_success_create'))
      }
      onSuccess()
      onClose()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const apiErrs = {}
        Object.keys(data).forEach(k => {
          apiErrs[k] = Array.isArray(data[k]) ? data[k][0] : data[k]
        })
        setErrors(apiErrs)
        toast.error(t('accounts.form_errors'))
      } else {
        toast.error(t('accounts.save_error'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`fas ${isEdit ? 'fa-user-edit' : 'fa-user-plus'} mr-2`} />
              {isEdit ? t('accounts.modal_edit_title') : t('accounts.modal_create_title')}
            </h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
            <div className="modal-body" style={{ overflowY: 'auto' }}>
              {fetching ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin fa-2x text-muted" />
                </div>
              ) : (
                <div className="row">
                  {/* Section photo — mode édition uniquement */}
                  {isEdit && (
                    <div className="col-12 mb-3">
                      <div className="d-flex align-items-center" style={{ gap: 16 }}>
                        <div className="position-relative">
                          <UserAvatarCard
                            user={{ ...photoData, first_name: form.first_name || photoData.first_name, last_name: form.last_name || photoData.last_name }}
                            size={100}
                            editable={!photoLoading}
                            onUpload={handleUploadPhoto}
                          />
                          {photoLoading && (
                            <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center"
                              style={{ top: 0, left: 0, background: 'rgba(255,255,255,0.7)', borderRadius: 6 }}>
                              <i className="fas fa-spinner fa-spin text-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-weight-bold" style={{ fontSize: 13 }}>{t('accounts.photo_profile')}</div>
                          <small className="text-muted d-block">{t('accounts.photo_hint')}</small>
                          {photoData.photo_url && (
                            <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-1"
                              style={{ fontSize: 11 }}
                              onClick={handleSupprimerPhoto}
                              disabled={photoLoading}>
                              <i className="fas fa-trash-alt mr-1" />{t('accounts.photo_delete_label')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prénom */}
                  <div className="col-md-6 form-group">
                    <label>{t('accounts.first_name')} <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                      value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                    {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                  </div>

                  {/* Nom */}
                  <div className="col-md-6 form-group">
                    <label>{t('accounts.last_name')} <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                      value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                    {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                  </div>

                  {/* Identifiant */}
                  <div className="col-md-6 form-group">
                    <label>{t('accounts.username')} <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                      value={form.username} onChange={e => set('username', e.target.value)} autoComplete="username" />
                    {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                  </div>

                  {/* Email */}
                  <div className="col-md-6 form-group">
                    <label>{t('accounts.email')} <span className="text-danger">*</span></label>
                    <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      value={form.email} onChange={e => set('email', e.target.value)} />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>

                  {/* Rôle */}
                  <div className="col-md-6 form-group">
                    <label>{t('accounts.role')} <span className="text-danger">*</span></label>
                    <select className={`form-control ${errors.role ? 'is-invalid' : ''}`}
                      value={form.role} onChange={e => set('role', e.target.value)}>
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {errors.role && <div className="invalid-feedback">{errors.role}</div>}
                  </div>

                  {/* Département */}
                  <div className="col-md-6 form-group">
                    <label>{t('accounts.department')}</label>
                    <select className="form-control"
                      value={form.departement} onChange={e => set('departement', e.target.value)}>
                      <option value="">{t('accounts.no_department')}</option>
                      {departements.map(d => (
                        <option key={d.id} value={d.id}>{d.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Téléphone */}
                  <div className="col-md-6 form-group">
                    <label>{t('common.phone')}</label>
                    <input type="text" className="form-control"
                      value={form.telephone} onChange={e => set('telephone', e.target.value)} />
                  </div>

                  {/* Statut actif — édition seulement */}
                  {isEdit && (
                    <div className="col-md-6 form-group d-flex align-items-center">
                      <div className="custom-control custom-switch mt-3">
                        <input type="checkbox" className="custom-control-input" id="is_active_switch"
                          checked={form.is_active}
                          onChange={e => set('is_active', e.target.checked)} />
                        <label className="custom-control-label" htmlFor="is_active_switch">
                          {t('accounts.account_active')}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  <div className="col-12 form-group">
                    <label>{t('accounts.bio')}</label>
                    <textarea className="form-control" rows={2}
                      value={form.bio} onChange={e => set('bio', e.target.value)} />
                  </div>

                  {/* Mots de passe — création seulement */}
                  {!isEdit && (
                    <>
                      <div className="col-md-6 form-group">
                        <label>{t('accounts.password_label')} <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <input type={showPwd ? 'text' : 'password'}
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            value={form.password} onChange={e => set('password', e.target.value)}
                            autoComplete="new-password" />
                          <div className="input-group-append">
                            <button type="button" className="btn btn-outline-secondary"
                              onClick={() => setShowPwd(v => !v)}>
                              <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                          </div>
                          {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                        </div>
                        <small className="text-muted">{t('accounts.password_min_hint')}</small>
                      </div>

                      <div className="col-md-6 form-group">
                        <label>{t('accounts.confirm_password')} <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <input type={showPwd2 ? 'text' : 'password'}
                            className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
                            value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)}
                            autoComplete="new-password" />
                          <div className="input-group-append">
                            <button type="button" className="btn btn-outline-secondary"
                              onClick={() => setShowPwd2(v => !v)}>
                              <i className={`fas ${showPwd2 ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                          </div>
                          {errors.confirm_password && <div className="invalid-feedback">{errors.confirm_password}</div>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Section : Informations légales et RH ── */}
                  <div className="col-12 mt-2 mb-2">
                    <button type="button"
                      className="btn btn-outline-secondary btn-sm w-100 text-left"
                      onClick={() => setShowLegal(v => !v)}>
                      <i className={`fas fa-chevron-${showLegal ? 'up' : 'down'} mr-2`} />
                      <i className="fas fa-id-card mr-2 text-primary" />
                      {t('accounts.legal_section')}
                      <span className="badge badge-secondary ml-2" style={{ fontSize: 10 }}>
                        {t('accounts.legal_section_badge')}
                      </span>
                    </button>
                  </div>

                  {showLegal && (
                    <>
                      {/* Identifiants légaux */}
                      <div className="col-12 mb-1">
                        <small className="text-uppercase text-muted font-weight-bold"
                          style={{ fontSize: 10, letterSpacing: 1 }}>
                          <i className="fas fa-fingerprint mr-1" />{t('accounts.legal_ids')}
                        </small>
                        <hr className="mt-1 mb-2" />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.cnps_number')}</label>
                        <input type="text" className="form-control form-control-sm"
                          placeholder="Ex: 123456789"
                          value={form.numero_cnps} onChange={e => set('numero_cnps', e.target.value)} />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.cni_number')}</label>
                        <input type="text" className="form-control form-control-sm"
                          value={form.numero_cni} onChange={e => set('numero_cni', e.target.value)} />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.niu_number')}</label>
                        <input type="text" className="form-control form-control-sm"
                          value={form.niu} onChange={e => set('niu', e.target.value)} />
                      </div>

                      {/* Classification professionnelle */}
                      <div className="col-12 mb-1">
                        <small className="text-uppercase text-muted font-weight-bold"
                          style={{ fontSize: 10, letterSpacing: 1 }}>
                          <i className="fas fa-layer-group mr-1" />{t('accounts.pro_classification')}
                        </small>
                        <hr className="mt-1 mb-2" />
                      </div>
                      <div className="col-md-3 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.categorie')}</label>
                        <select className="form-control form-control-sm"
                          value={form.categorie_pro} onChange={e => set('categorie_pro', e.target.value)}>
                          <option value="">—</option>
                          {CATEGORIES_PRO.map(c => (
                            <option key={c} value={c}>{t('accounts.cat_prefix', { cat: c })}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.echelon')}</label>
                        <input type="number" min="1" max="20" className="form-control form-control-sm"
                          value={form.echelon} onChange={e => set('echelon', parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="col-md-3 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.coefficient')}</label>
                        <input type="number" min="100" className="form-control form-control-sm"
                          value={form.coefficient} onChange={e => set('coefficient', parseInt(e.target.value) || 100)} />
                      </div>
                      <div className="col-md-3 form-group" />
                      <div className="col-md-6 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.last_advancement')}</label>
                        <input type="date" className="form-control form-control-sm"
                          value={form.date_dernier_avancement}
                          onChange={e => set('date_dernier_avancement', e.target.value)} />
                      </div>
                      <div className="col-md-6 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.next_advancement')}</label>
                        <input type="date" className="form-control form-control-sm"
                          value={form.prochain_avancement}
                          onChange={e => set('prochain_avancement', e.target.value)} />
                      </div>

                      {/* Situation familiale */}
                      <div className="col-12 mb-1">
                        <small className="text-uppercase text-muted font-weight-bold"
                          style={{ fontSize: 10, letterSpacing: 1 }}>
                          <i className="fas fa-users mr-1" />{t('accounts.family_situation')}
                        </small>
                        <hr className="mt-1 mb-2" />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.marital_status')}</label>
                        <select className="form-control form-control-sm"
                          value={form.situation_matrimoniale}
                          onChange={e => set('situation_matrimoniale', e.target.value)}>
                          {SITUATIONS_MATRIMONIALES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.dependant_children')}</label>
                        <input type="number" min="0" className="form-control form-control-sm"
                          value={form.nb_enfants_a_charge}
                          onChange={e => set('nb_enfants_a_charge', parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.children_under_6')}</label>
                        <input type="number" min="0" className="form-control form-control-sm"
                          value={form.nb_enfants_moins_6_ans}
                          onChange={e => set('nb_enfants_moins_6_ans', parseInt(e.target.value) || 0)} />
                      </div>

                      {/* État civil & coordonnées */}
                      <div className="col-12 mb-1">
                        <small className="text-uppercase text-muted font-weight-bold"
                          style={{ fontSize: 10, letterSpacing: 1 }}>
                          <i className="fas fa-map-marker-alt mr-1" />{t('accounts.civil_state')}
                        </small>
                        <hr className="mt-1 mb-2" />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.nationality')}</label>
                        <input type="text" className="form-control form-control-sm"
                          value={form.nationalite} onChange={e => set('nationalite', e.target.value)} />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.date_of_birth')}</label>
                        <input type="date" className="form-control form-control-sm"
                          value={form.date_naissance} onChange={e => set('date_naissance', e.target.value)} />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.place_of_birth')}</label>
                        <input type="text" className="form-control form-control-sm"
                          value={form.lieu_naissance} onChange={e => set('lieu_naissance', e.target.value)} />
                      </div>
                      <div className="col-12 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.home_address')}</label>
                        <textarea className="form-control form-control-sm" rows={2}
                          value={form.adresse} onChange={e => set('adresse', e.target.value)} />
                      </div>
                      <div className="col-md-8 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.emergency_contact')}</label>
                        <input type="text" className="form-control form-control-sm"
                          placeholder={t('accounts.emergency_contact_placeholder')}
                          value={form.personne_contact_urgence}
                          onChange={e => set('personne_contact_urgence', e.target.value)} />
                      </div>
                      <div className="col-md-4 form-group">
                        <label style={{ fontSize: 12 }}>{t('accounts.emergency_tel')}</label>
                        <input type="text" className="form-control form-control-sm"
                          value={form.contact_urgence_tel}
                          onChange={e => set('contact_urgence_tel', e.target.value)} />
                      </div>
                    </>
                  )}

                  {/* Erreur globale */}
                  {errors.non_field_errors && (
                    <div className="col-12">
                      <div className="alert alert-danger">{errors.non_field_errors}</div>
                    </div>
                  )}
                  {errors.detail && (
                    <div className="col-12">
                      <div className="alert alert-danger">{errors.detail}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || fetching}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin mr-1" />{t('accounts.saving')}</>
                  : isEdit ? t('accounts.save_changes') : t('accounts.create_user_btn')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
