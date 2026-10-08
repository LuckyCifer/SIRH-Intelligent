import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import { getMonEntreprise, updateMonEntreprise } from '../../../api/entreprise'

export default function ParametresEntreprise() {
  const { t } = useTranslation()

  const TABS = [
    { id: 'infos',  label: t('entreprise.tab_infos'),  icon: 'fas fa-building' },
    { id: 'perso',  label: t('entreprise.tab_perso'),  icon: 'fas fa-paint-brush' },
    { id: 'config', label: t('entreprise.tab_config'), icon: 'fas fa-sliders-h' },
  ]

  const SECTEURS = [
    ['TECH',  t('entreprise.sector_tech')],
    ['SANTE', t('entreprise.sector_sante')],
    ['EDU',   t('entreprise.sector_edu')],
    ['FIN',   t('entreprise.sector_fin')],
    ['COM',   t('entreprise.sector_com')],
    ['IND',   t('entreprise.sector_ind')],
    ['BTP',   t('entreprise.sector_btp')],
    ['AGR',   t('entreprise.sector_agr')],
    ['SRV',   t('entreprise.sector_srv')],
    ['ONG',   t('entreprise.sector_ong')],
    ['AUTRE', t('entreprise.sector_autre')],
  ]

  const TAILLES = [
    ['TPE', t('entreprise.size_tpe')],
    ['PME', t('entreprise.size_pme')],
    ['ETI', t('entreprise.size_eti')],
    ['GE',  t('entreprise.size_ge')],
  ]

  const [tab, setTab]               = useState('infos')
  const [entreprise, setEntreprise] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const fileRef                     = useRef(null)

  function charger() {
    setLoading(true)
    setError(null)
    const timeoutId = setTimeout(() => {
      setError(t('entreprise.timeout_error'))
      setLoading(false)
    }, 10000)
    getMonEntreprise()
      .then(r => {
        setEntreprise(r.data)
        setLoading(false)
        clearTimeout(timeoutId)
      })
      .catch(err => {
        clearTimeout(timeoutId)
        const msg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Erreur inconnue'
        setError(t('entreprise.load_error_prefix') + msg)
        setLoading(false)
      })
  }

  useEffect(() => { charger() }, []) // eslint-disable-line

  function handleChange(e) {
    const { name, value } = e.target
    setEntreprise(prev => ({ ...prev, [name]: value }))
  }

  function handleColorChange(name, value) {
    setEntreprise(prev => ({ ...prev, [name]: value }))
    if (name === 'couleur_primaire') {
      document.documentElement.style.setProperty('--acerfi-blue', value)
    }
    if (name === 'couleur_secondaire') {
      document.documentElement.style.setProperty('--acerfi-dark', value)
    }
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setEntreprise(prev => ({ ...prev, _logoFile: file }))
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      const exclude = ['id', 'created_at', 'updated_at', 'abonnement_actif',
                       'jours_restants_abonnement', 'nb_employes_actifs', '_logoFile', 'logo']
      for (const [k, v] of Object.entries(entreprise)) {
        if (exclude.includes(k) || v === null || v === undefined) continue
        fd.append(k, v)
      }
      if (entreprise._logoFile) fd.append('logo', entreprise._logoFile)
      const r = await updateMonEntreprise(fd)
      setEntreprise(r.data)
      setPreview(null)
      toast.success(t('entreprise.save_success'))
    } catch {
      toast.error(t('entreprise.save_error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RHLayout pageTitle={t('entreprise.page_title')}>
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>{t('entreprise.loading')}</p>
        </div>
      </RHLayout>
    )
  }

  if (error) {
    return (
      <RHLayout pageTitle={t('entreprise.page_title')}>
        <div className="card" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="card-body text-center py-5">
            <i className="fas fa-exclamation-triangle fa-3x mb-3" style={{ color: '#fd7e14' }} />
            <h5 style={{ color: 'var(--text-primary)' }}>{t('entreprise.load_error_title')}</h5>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '8px auto 20px' }}>{error}</p>
            <button className="btn btn-primary" onClick={charger}
              style={{ background: 'var(--acerfi-blue)', borderColor: 'var(--acerfi-blue)' }}>
              <i className="fas fa-redo mr-2" />{t('entreprise.retry')}
            </button>
          </div>
        </div>
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle={t('entreprise.page_title')}>
      <div className="card" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="card-header" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map(tb => (
              <li className="nav-item" key={tb.id}>
                <button
                  className={`nav-link ${tab === tb.id ? 'active' : ''}`}
                  onClick={() => setTab(tb.id)}
                  style={{
                    background: tab === tb.id ? 'var(--acerfi-blue)' : 'transparent',
                    color: tab === tb.id ? '#fff' : 'var(--text-secondary)',
                    border: 'none', borderRadius: '4px 4px 0 0',
                  }}
                >
                  <i className={`${tb.icon} mr-2`} />{tb.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-body">
          <form onSubmit={handleSave}>

            {tab === 'infos' && (
              <div className="row">
                <div className="col-md-4 mb-4 text-center">
                  <div
                    style={{
                      width: 120, height: 120, margin: '0 auto 12px',
                      borderRadius: 12, border: '2px dashed var(--border-color)',
                      background: 'var(--card-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', cursor: 'pointer',
                    }}
                    onClick={() => fileRef.current?.click()}
                  >
                    {preview || entreprise.logo ? (
                      <img
                        src={preview || (entreprise.logo + '?v=' + (entreprise.updated_at || Date.now()))}
                        alt="Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-building fa-2x mb-1 d-block" />
                        <small>Logo</small>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={handleLogoChange} />
                  <button type="button" className="btn btn-sm btn-outline-secondary"
                    onClick={() => fileRef.current?.click()}>
                    <i className="fas fa-upload mr-1" />{t('entreprise.change_logo')}
                  </button>
                </div>

                <div className="col-md-8">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.name_label')}</label>
                      <input className="form-control" name="nom" value={entreprise.nom || ''}
                        onChange={handleChange} required
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.sigle_label')}</label>
                      <input className="form-control" name="sigle" value={entreprise.sigle || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.sector_label')}</label>
                      <select className="form-control" name="secteur" value={entreprise.secteur || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                        {SECTEURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.size_label')}</label>
                      <select className="form-control" name="taille" value={entreprise.taille || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                        {TAILLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.tax_number')}</label>
                      <input className="form-control" name="numero_contribuable"
                        value={entreprise.numero_contribuable || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.commerce_register')}</label>
                      <input className="form-control" name="registre_commerce"
                        value={entreprise.registre_commerce || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.city')}</label>
                      <input className="form-control" name="ville" value={entreprise.ville || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.country')}</label>
                      <input className="form-control" name="pays" value={entreprise.pays || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.phone')}</label>
                      <input className="form-control" name="telephone" value={entreprise.telephone || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.email')}</label>
                      <input className="form-control" type="email" name="email"
                        value={entreprise.email || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.website')}</label>
                      <input className="form-control" type="url" name="site_web"
                        value={entreprise.site_web || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-12 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.address')}</label>
                      <textarea className="form-control" name="adresse" rows={2}
                        value={entreprise.adresse || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'perso' && (
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="card p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--text-primary)' }}>{t('entreprise.brand_colors')}</h6>
                    <div className="mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.primary_color')}</label>
                      <div className="d-flex align-items-center gap-2" style={{ gap: 10 }}>
                        <input type="color" value={entreprise.couleur_primaire || '#1F3864'}
                          onChange={e => handleColorChange('couleur_primaire', e.target.value)}
                          style={{ width: 48, height: 36, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <input className="form-control" style={{ width: 120, background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                          value={entreprise.couleur_primaire || '#1F3864'}
                          onChange={e => handleColorChange('couleur_primaire', e.target.value)} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.secondary_color')}</label>
                      <div className="d-flex align-items-center" style={{ gap: 10 }}>
                        <input type="color" value={entreprise.couleur_secondaire || '#2E74B5'}
                          onChange={e => handleColorChange('couleur_secondaire', e.target.value)}
                          style={{ width: 48, height: 36, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <input className="form-control" style={{ width: 120, background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                          value={entreprise.couleur_secondaire || '#2E74B5'}
                          onChange={e => handleColorChange('couleur_secondaire', e.target.value)} />
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <i className="fas fa-info-circle mr-1" />
                      {t('entreprise.color_info')}
                    </p>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="card p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--text-primary)' }}>{t('entreprise.preview')}</h6>
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ background: entreprise.couleur_primaire, padding: '12px 16px', color: '#fff' }}>
                        <strong>{entreprise.sigle || entreprise.nom}</strong>
                        <span style={{ float: 'right', fontSize: 12, opacity: 0.8 }}>SIRH</span>
                      </div>
                      <div style={{ background: entreprise.couleur_secondaire, padding: '8px 16px', color: '#fff', fontSize: 13 }}>
                        {t('entreprise.preview_hr_space')}
                      </div>
                      <div style={{ padding: 16, background: '#f8f9fa' }}>
                        <div style={{ background: '#fff', borderRadius: 6, padding: 12, fontSize: 12, color: '#333' }}>
                          <i className="fas fa-users mr-2" style={{ color: entreprise.couleur_primaire }} />
                          {t('entreprise.active_employees', { count: entreprise.nb_employes_actifs ?? 0 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'config' && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.currency')}</label>
                  <input className="form-control" name="devise" value={entreprise.devise || 'FCFA'}
                    onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.timezone')}</label>
                  <input className="form-control" name="fuseau_horaire" value={entreprise.fuseau_horaire || ''}
                    onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.work_start')}</label>
                  <input className="form-control" type="time" name="heure_debut_travail"
                    value={entreprise.heure_debut_travail || '08:00'} onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.work_end')}</label>
                  <input className="form-control" type="time" name="heure_fin_travail"
                    value={entreprise.heure_fin_travail || '17:00'} onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('entreprise.max_employees')}</label>
                  <input className="form-control" type="number" name="nb_employes_max"
                    value={entreprise.nb_employes_max || 50} onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>

                <div className="col-12 mt-2">
                  <div className="card p-3" style={{ background: 'rgba(31,56,100,0.06)', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--text-primary)' }}>{t('entreprise.subscription')}</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <small style={{ color: 'var(--text-secondary)' }}>{t('entreprise.sub_status')}</small>
                        <div>
                          <span className={`badge ${
                            entreprise.statut === 'ACTIVE' ? 'badge-success' :
                            entreprise.statut === 'ESSAI'  ? 'badge-info' : 'badge-danger'
                          }`}>{entreprise.statut}</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <small style={{ color: 'var(--text-secondary)' }}>{t('entreprise.sub_active')}</small>
                        <div style={{ color: entreprise.abonnement_actif ? '#28a745' : '#dc3545', fontWeight: 600 }}>
                          {entreprise.abonnement_actif ? t('entreprise.sub_yes') : t('entreprise.sub_no')}
                        </div>
                      </div>
                      {entreprise.jours_restants_abonnement !== null && (
                        <div className="col-md-4">
                          <small style={{ color: 'var(--text-secondary)' }}>{t('entreprise.sub_days_left')}</small>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entreprise.jours_restants_abonnement} {t('entreprise.days_unit')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 text-right">
              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ background: 'var(--acerfi-blue)', borderColor: 'var(--acerfi-blue)' }}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin mr-2" />{t('entreprise.saving')}</>
                  : <><i className="fas fa-save mr-2" />{t('entreprise.save_btn')}</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </RHLayout>
  )
}
