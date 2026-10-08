import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import api from '../../../api/axios'
import { chargerTout } from '../../../api/listes'

const MAX_ESSAI = { CAT_I_VI: 1, CAT_VII_X: 3, CAT_XI_XII: 6 }

const CAT_LABELS = {
  CAT_I_VI:   'Cat. I–VI (Ouvriers/Employés) — essai max 1 mois',
  CAT_VII_X:  'Cat. VII–X (Agents de maîtrise) — essai max 3 mois',
  CAT_XI_XII: 'Cat. XI–XII (Cadres) — essai max 6 mois',
}

function addMonths(dateStr, months) {
  if (!dateStr || !months || parseInt(months) === 0) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + parseInt(months))
  return d.toISOString().slice(0, 10)
}

function dureeEnMois(debut, fin) {
  if (!debut || !fin) return 0
  const d = new Date(debut + 'T00:00:00')
  const f = new Date(fin + 'T00:00:00')
  return (f.getFullYear() - d.getFullYear()) * 12 + (f.getMonth() - d.getMonth())
}

const EMPTY = {
  employe: '', type_contrat: 'CDI', poste: '',
  date_debut: '', date_fin: '',
  salaire: '', statut: 'ACTIF', notes: '',
  categorie_pro: 'CAT_VII_X',
  periode_essai_mois: '',
  essai_confirme: false,
  essai_rompu: false,
  duree_preavis_jours: 15,
  preavis_debute: false,
  date_debut_preavis: '',
  renouvellement_numero: 0,
  clause_non_concurrence: false,
  rayon_non_concurrence_km: 50,
  duree_non_concurrence_mois: 12,
  lieu_travail: '',
  horaires_travail: '',
  visa_mintss: false,
}

export default function FormulaireContrat() {
  const { id }   = useParams()
  const isEdit   = Boolean(id)
  const navigate = useNavigate()
  const { t }    = useTranslation()

  const [form,     setForm]     = useState(EMPTY)
  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState({})
  const [employes, setEmployes] = useState([])
  const [postes,   setPostes]   = useState([])

  useEffect(() => {
    chargerTout('/accounts/users/?role=EMPLOYE')
      .then(r => setEmployes(r.data.results ?? r.data)).catch(() => {})
    chargerTout('/departements/postes/')
      .then(r => setPostes(r.data.results ?? r.data)).catch(() => {})
    if (isEdit) {
      api.get(`/contrats/${id}/`)
        .then(r => {
          const c = r.data
          setForm({
            employe: c.employe ?? '',
            type_contrat: c.type_contrat || 'CDI',
            poste: c.poste ?? '',
            date_debut: c.date_debut || '',
            date_fin: c.date_fin || '',
            salaire: c.salaire ?? '',
            statut: c.statut || 'ACTIF',
            notes: c.notes || '',
            categorie_pro: c.categorie_pro || 'CAT_VII_X',
            periode_essai_mois: c.periode_essai_mois || '',
            essai_confirme: c.essai_confirme || false,
            essai_rompu: c.essai_rompu || false,
            duree_preavis_jours: c.duree_preavis_jours ?? 15,
            preavis_debute: c.preavis_debute || false,
            date_debut_preavis: c.date_debut_preavis || '',
            renouvellement_numero: c.renouvellement_numero ?? 0,
            clause_non_concurrence: c.clause_non_concurrence || false,
            rayon_non_concurrence_km: c.rayon_non_concurrence_km ?? 50,
            duree_non_concurrence_mois: c.duree_non_concurrence_mois ?? 12,
            lieu_travail: c.lieu_travail || '',
            horaires_travail: c.horaires_travail || '',
            visa_mintss: c.visa_mintss || false,
          })
        })
        .catch(() => { toast.error(t('contracts.not_found')); navigate('/rh/contrats') })
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, navigate]) // eslint-disable-line

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const dateFinEssai = useMemo(
    () => addMonths(form.date_debut, form.periode_essai_mois),
    [form.date_debut, form.periode_essai_mois]
  )
  const dureeCddMois = useMemo(
    () => dureeEnMois(form.date_debut, form.date_fin),
    [form.date_debut, form.date_fin]
  )
  const maxEssai    = MAX_ESSAI[form.categorie_pro] || 3
  const essaiDepasse = parseInt(form.periode_essai_mois || 0) > maxEssai
  const cddDepasse   = form.type_contrat === 'CDD' && dureeCddMois > 24
  const renouvNum    = parseInt(form.renouvellement_numero || 0)

  async function handleSave(e) {
    e.preventDefault()
    if (!form.employe || !form.type_contrat || !form.date_debut) {
      toast.error(t('contracts.val_required'))
      return
    }
    if (essaiDepasse) {
      toast.error(t('contracts.val_trial_exceed', { max: maxEssai }))
      return
    }
    if (cddDepasse) {
      toast.error(t('contracts.val_cdd_exceed'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        poste:    form.poste    || null,
        date_fin: (form.type_contrat === 'CDI') ? null : (form.date_fin || null),
        salaire:  form.salaire  || null,
        periode_essai_mois: parseInt(form.periode_essai_mois || 0),
        renouvellement_numero: parseInt(form.renouvellement_numero || 0),
        rayon_non_concurrence_km: parseInt(form.rayon_non_concurrence_km || 50),
        duree_non_concurrence_mois: parseInt(form.duree_non_concurrence_mois || 12),
        duree_preavis_jours: parseInt(form.duree_preavis_jours || 15),
        date_debut_preavis: form.date_debut_preavis || null,
      }
      if (isEdit) {
        await api.put(`/contrats/${id}/`, payload)
        toast.success(t('contracts.update_success'))
      } else {
        await api.post('/contrats/', payload)
        toast.success(t('contracts.save_success'))
      }
      navigate('/rh/contrats')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setErrors(data)
        const msg = Object.values(data).flat()[0]
        toast.error(typeof msg === 'string' ? msg : t('contracts.form_error'))
      } else {
        toast.error(t('contracts.save_error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const fStyle = { background: 'var(--card-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }
  const errCls = (k) => errors[k] ? 'is-invalid' : ''
  const pageTitle = isEdit ? t('contracts.edit_title') : t('contracts.create_title')

  if (loading) {
    return <RHLayout pageTitle={pageTitle}><Spinner /></RHLayout>
  }

  return (
    <RHLayout pageTitle={pageTitle}>
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <form onSubmit={handleSave}>

            {/* ── Bloc 1 : Informations de base ── */}
            <div className="card card-primary card-outline mb-3">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-file-contract mr-2" />{t('contracts.section_general')}
                </h3>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">
                      {t('contracts.field_employee')} <span className="text-danger">*</span>
                    </label>
                    <select name="employe" className={`form-control ${errCls('employe')}`}
                      value={form.employe} onChange={handleChange} style={fStyle} required>
                      <option value="">{t('contracts.select_employee')}</option>
                      {employes.map(e => (
                        <option key={e.id} value={e.id}>{e.full_name || e.username}</option>
                      ))}
                    </select>
                    {errors.employe && <div className="invalid-feedback">{errors.employe}</div>}
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">
                      {t('contracts.field_type')} <span className="text-danger">*</span>
                    </label>
                    <select name="type_contrat" className="form-control" value={form.type_contrat}
                      onChange={handleChange} style={fStyle}>
                      <option value="CDI">{t('contracts.type_cdi')}</option>
                      <option value="CDD">{t('contracts.type_cdd')}</option>
                      <option value="STAGE">{t('contracts.type_stage')}</option>
                      <option value="FREELANCE">{t('contracts.type_freelance')}</option>
                      <option value="INTERIM">{t('contracts.type_interim')}</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('contracts.field_category')}</label>
                    <select name="categorie_pro" className="form-control" value={form.categorie_pro}
                      onChange={handleChange} style={fStyle}>
                      {Object.entries(CAT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('contracts.field_position')}</label>
                    <select name="poste" className="form-control" value={form.poste}
                      onChange={handleChange} style={fStyle}>
                      <option value="">{t('contracts.select_position')}</option>
                      {postes.map(p => (
                        <option key={p.id} value={p.id}>{p.titre} ({p.departement_code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label className="font-weight-bold">
                      {t('contracts.field_start_date')} <span className="text-danger">*</span>
                    </label>
                    <input type="date" name="date_debut" className={`form-control ${errCls('date_debut')}`}
                      value={form.date_debut} onChange={handleChange} style={fStyle} required />
                    {errors.date_debut && <div className="invalid-feedback">{errors.date_debut}</div>}
                  </div>
                  <div className="form-group col-md-4">
                    <label className="font-weight-bold">
                      {t('contracts.field_end_date')}
                      {form.type_contrat === 'CDI' && (
                        <small className="text-muted ml-1">{t('contracts.cdi_note')}</small>
                      )}
                    </label>
                    <input type="date" name="date_fin" className={`form-control ${errCls('date_fin')}`}
                      value={form.date_fin} onChange={handleChange} style={fStyle}
                      disabled={form.type_contrat === 'CDI'} />
                    {errors.date_fin && <div className="invalid-feedback">{errors.date_fin}</div>}
                    {cddDepasse && (
                      <div className="text-danger mt-1" style={{ fontSize: 12 }}>
                        <i className="fas fa-exclamation-circle mr-1" />
                        {t('contracts.cdd_duration_exceed', { months: dureeCddMois })}
                      </div>
                    )}
                    {form.type_contrat === 'CDD' && dureeCddMois > 0 && !cddDepasse && (
                      <small className="text-muted">
                        {t('contracts.cdd_duration', { months: dureeCddMois })}
                      </small>
                    )}
                  </div>
                  <div className="form-group col-md-4">
                    <label className="font-weight-bold">{t('contracts.field_salary')}</label>
                    <input type="number" name="salaire" className="form-control"
                      value={form.salaire} onChange={handleChange}
                      placeholder={t('contracts.salary_placeholder')} min="0" style={fStyle} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('contracts.field_work_location')}</label>
                    <input type="text" name="lieu_travail" className="form-control"
                      value={form.lieu_travail} onChange={handleChange}
                      placeholder={t('contracts.work_location_placeholder')} style={fStyle} />
                  </div>
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('contracts.field_work_schedule')}</label>
                    <input type="text" name="horaires_travail" className="form-control"
                      value={form.horaires_travail} onChange={handleChange}
                      placeholder={t('contracts.work_schedule_placeholder')} style={fStyle} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="font-weight-bold">{t('contracts.field_status')}</label>
                    <select name="statut" className="form-control" value={form.statut}
                      onChange={handleChange} style={fStyle}>
                      <option value="ACTIF">{t('contracts.status_active')}</option>
                      <option value="EXPIRE">{t('contracts.status_expired')}</option>
                      <option value="RESILIE">{t('contracts.status_terminated')}</option>
                      <option value="EN_COURS">{t('contracts.status_renewing_full')}</option>
                    </select>
                  </div>
                  <div className="form-group col-md-6 d-flex align-items-end pb-2">
                    <div className="custom-control custom-checkbox">
                      <input type="checkbox" className="custom-control-input" id="visa_mintss"
                        name="visa_mintss" checked={form.visa_mintss} onChange={handleChange} />
                      <label className="custom-control-label" htmlFor="visa_mintss">
                        {t('contracts.field_visa_mintss')}
                        <small className="text-muted d-block">{t('contracts.visa_mintss_note')}</small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bloc 2 : Période d'essai (Art. 27) ── */}
            <div className="card card-warning card-outline mb-3">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-user-clock mr-2" />{t('contracts.section_trial')}
                  <small className="ml-2 text-muted font-weight-normal">{t('contracts.trial_legal_note')}</small>
                </h3>
              </div>
              <div className="card-body">
                <div className="alert alert-info py-2 mb-3" style={{ fontSize: 12 }}>
                  <i className="fas fa-balance-scale mr-1" />
                  {t('contracts.trial_max_info')}
                  <strong className="ml-1">{maxEssai} mois</strong>
                  <span className="text-muted ml-1">({CAT_LABELS[form.categorie_pro]})</span>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label className="font-weight-bold">
                      {t('contracts.field_trial_months')}
                      <small className="text-muted ml-1">max {maxEssai}</small>
                    </label>
                    <input type="number" name="periode_essai_mois" min="0" max={maxEssai}
                      className={`form-control ${essaiDepasse ? 'is-invalid' : ''}`}
                      value={form.periode_essai_mois} onChange={handleChange} style={fStyle}
                      placeholder={t('contracts.trial_placeholder')} />
                    {essaiDepasse && (
                      <div className="invalid-feedback">
                        {t('contracts.trial_max_error', { max: maxEssai })}
                      </div>
                    )}
                  </div>
                  <div className="form-group col-md-4">
                    <label className="font-weight-bold">{t('contracts.field_trial_end')}</label>
                    <input type="date" className="form-control" readOnly
                      value={dateFinEssai} style={{ ...fStyle, background: 'var(--border-color)' }} />
                    <small className="text-muted">{t('contracts.trial_auto_calc')}</small>
                  </div>
                  <div className="form-group col-md-4 d-flex align-items-end pb-2">
                    <div>
                      <div className="custom-control custom-checkbox mb-1">
                        <input type="checkbox" className="custom-control-input" id="essai_confirme"
                          name="essai_confirme" checked={form.essai_confirme} onChange={handleChange}
                          disabled={form.essai_rompu} />
                        <label className="custom-control-label text-success" htmlFor="essai_confirme">
                          {t('contracts.trial_confirmed')}
                        </label>
                      </div>
                      <div className="custom-control custom-checkbox">
                        <input type="checkbox" className="custom-control-input" id="essai_rompu"
                          name="essai_rompu" checked={form.essai_rompu} onChange={handleChange}
                          disabled={form.essai_confirme} />
                        <label className="custom-control-label text-danger" htmlFor="essai_rompu">
                          {t('contracts.trial_broken')}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bloc 3 : CDD — Renouvellement (Art. 25) ── */}
            {form.type_contrat === 'CDD' && (
              <div className="card card-danger card-outline mb-3">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-redo mr-2" />{t('contracts.section_cdd')}
                    <small className="ml-2 text-muted font-weight-normal">{t('contracts.cdd_legal_note')}</small>
                  </h3>
                </div>
                <div className="card-body">
                  <div className="form-row align-items-center">
                    <div className="form-group col-md-4">
                      <label className="font-weight-bold">{t('contracts.field_renewal_num')}</label>
                      <select name="renouvellement_numero" className={`form-control ${errCls('renouvellement_numero')}`}
                        value={form.renouvellement_numero} onChange={handleChange} style={fStyle}>
                        <option value={0}>{t('contracts.renewal_initial')}</option>
                        <option value={1}>{t('contracts.renewal_first')}</option>
                        <option value={2}>{t('contracts.renewal_second')}</option>
                      </select>
                      {errors.renouvellement_numero && (
                        <div className="invalid-feedback">{errors.renouvellement_numero}</div>
                      )}
                    </div>
                    <div className="col-md-8">
                      {renouvNum === 0 && (
                        <div className="alert alert-info py-2 mb-0" style={{ fontSize: 12 }}>
                          <i className="fas fa-info-circle mr-1" />{t('contracts.cdd_initial_info')}
                        </div>
                      )}
                      {renouvNum === 1 && (
                        <div className="alert alert-warning py-2 mb-0" style={{ fontSize: 12 }}>
                          <i className="fas fa-exclamation-triangle mr-1" />
                          <strong>{t('contracts.cdd_last_renewal')}</strong>
                        </div>
                      )}
                      {renouvNum >= 2 && (
                        <div className="alert alert-danger py-2 mb-0" style={{ fontSize: 12 }}>
                          <i className="fas fa-times-circle mr-1" />
                          <strong>{t('contracts.cdd_illegal')}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bloc 4 : Clause de non-concurrence (Art. 36) ── */}
            <div className="card card-outline mb-3">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-shield-alt mr-2" />{t('contracts.section_noncompete')}
                  <small className="ml-2 text-muted font-weight-normal">{t('contracts.noncompete_legal_note')}</small>
                </h3>
              </div>
              <div className="card-body">
                <div className="custom-control custom-checkbox mb-3">
                  <input type="checkbox" className="custom-control-input" id="clause_non_concurrence"
                    name="clause_non_concurrence" checked={form.clause_non_concurrence}
                    onChange={handleChange} />
                  <label className="custom-control-label font-weight-bold" htmlFor="clause_non_concurrence">
                    {t('contracts.noncompete_include')}
                  </label>
                </div>
                {form.clause_non_concurrence && (
                  <>
                    <div className="alert alert-warning py-2 mb-3" style={{ fontSize: 12 }}>
                      <i className="fas fa-balance-scale mr-1" />
                      {t('contracts.noncompete_legal_limits')}
                    </div>
                    <div className="form-row">
                      <div className="form-group col-md-4">
                        <label className="font-weight-bold">
                          {t('contracts.field_radius')} <small className="text-muted">max 50</small>
                        </label>
                        <input type="number" name="rayon_non_concurrence_km" min="1" max="50"
                          className={`form-control ${parseInt(form.rayon_non_concurrence_km) > 50 ? 'is-invalid' : ''}`}
                          value={form.rayon_non_concurrence_km} onChange={handleChange} style={fStyle} />
                        {parseInt(form.rayon_non_concurrence_km) > 50 && (
                          <div className="invalid-feedback">{t('contracts.radius_max_error')}</div>
                        )}
                        {errors.rayon_non_concurrence_km && (
                          <div className="invalid-feedback">{errors.rayon_non_concurrence_km}</div>
                        )}
                      </div>
                      <div className="form-group col-md-4">
                        <label className="font-weight-bold">
                          {t('contracts.field_duration_months')} <small className="text-muted">max 12</small>
                        </label>
                        <input type="number" name="duree_non_concurrence_mois" min="1" max="12"
                          className={`form-control ${parseInt(form.duree_non_concurrence_mois) > 12 ? 'is-invalid' : ''}`}
                          value={form.duree_non_concurrence_mois} onChange={handleChange} style={fStyle} />
                        {parseInt(form.duree_non_concurrence_mois) > 12 && (
                          <div className="invalid-feedback">{t('contracts.duration_max_error')}</div>
                        )}
                        {errors.duree_non_concurrence_mois && (
                          <div className="invalid-feedback">{errors.duree_non_concurrence_mois}</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Bloc 5 : Notes + Actions ── */}
            <div className="card card-outline mb-3">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-sticky-note mr-2" />{t('contracts.section_notes')}
                </h3>
              </div>
              <div className="card-body">
                <textarea name="notes" className="form-control" rows={3}
                  value={form.notes} onChange={handleChange}
                  placeholder={t('contracts.notes_placeholder')} style={fStyle} />
              </div>
              <div className="card-footer d-flex justify-content-between">
                <button type="button" className="btn btn-secondary"
                  onClick={() => navigate('/rh/contrats')}>
                  <i className="fas fa-times mr-1" />{t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary"
                  disabled={saving || essaiDepasse || (form.type_contrat === 'CDD' && renouvNum > 1)}>
                  <i className="fas fa-save mr-1" />
                  {saving ? t('contracts.saving') : isEdit ? t('contracts.update_btn') : t('contracts.create_btn')}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </RHLayout>
  )
}
