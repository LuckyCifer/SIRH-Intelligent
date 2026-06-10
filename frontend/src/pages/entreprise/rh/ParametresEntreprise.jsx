import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import { getMonEntreprise, updateMonEntreprise } from '../../../api/entreprise'

const TABS = [
  { id: 'infos',    label: 'Informations',    icon: 'fas fa-building' },
  { id: 'perso',    label: 'Personnalisation', icon: 'fas fa-paint-brush' },
  { id: 'config',   label: 'Config RH',       icon: 'fas fa-sliders-h' },
]

const SECTEURS = [
  ['TECH','Technologie & Numérique'], ['SANTE','Santé & Pharmacie'],
  ['EDU','Éducation & Formation'],    ['FIN','Finance & Assurance'],
  ['COM','Commerce & Distribution'],  ['IND','Industrie & Production'],
  ['BTP','BTP & Immobilier'],         ['AGR','Agriculture & Agroalimentaire'],
  ['SRV','Services aux entreprises'], ['ONG','ONG & Association'],
  ['AUTRE','Autre'],
]

const TAILLES = [
  ['TPE','TPE (1-9 employés)'],['PME','PME (10-249 employés)'],
  ['ETI','ETI (250-4999 employés)'],['GE','Grande entreprise (5000+)'],
]

export default function ParametresEntreprise() {
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
      setError("Délai d'attente dépassé. Vérifiez que le serveur Django tourne sur localhost:8000.")
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
        setError(`Impossible de charger les paramètres : ${msg}`)
        setLoading(false)
      })
  }

  useEffect(() => { charger() }, [])

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
                       'jours_restants_abonnement', 'nb_employes_actifs', '_logoFile']
      for (const [k, v] of Object.entries(entreprise)) {
        if (exclude.includes(k) || v === null || v === undefined) continue
        fd.append(k, v)
      }
      if (entreprise._logoFile) fd.append('logo', entreprise._logoFile)
      const r = await updateMonEntreprise(fd)
      setEntreprise(r.data)
      setPreview(null)
      toast.success('Paramètres sauvegardés.')
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RHLayout pageTitle="Paramètres entreprise">
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Chargement des paramètres…</p>
        </div>
      </RHLayout>
    )
  }

  if (error) {
    return (
      <RHLayout pageTitle="Paramètres entreprise">
        <div className="card" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="card-body text-center py-5">
            <i className="fas fa-exclamation-triangle fa-3x mb-3" style={{ color: '#fd7e14' }} />
            <h5 style={{ color: 'var(--text-primary)' }}>Erreur de chargement</h5>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '8px auto 20px' }}>{error}</p>
            <button className="btn btn-primary" onClick={charger}
              style={{ background: 'var(--acerfi-blue)', borderColor: 'var(--acerfi-blue)' }}>
              <i className="fas fa-redo mr-2" />Réessayer
            </button>
          </div>
        </div>
      </RHLayout>
    )
  }

  return (
    <RHLayout pageTitle="Paramètres entreprise">
      <div className="card" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="card-header" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map(t => (
              <li className="nav-item" key={t.id}>
                <button
                  className={`nav-link ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                  style={{
                    background: tab === t.id ? 'var(--acerfi-blue)' : 'transparent',
                    color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                    border: 'none', borderRadius: '4px 4px 0 0',
                  }}
                >
                  <i className={`${t.icon} mr-2`} />{t.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-body">
          <form onSubmit={handleSave}>

            {/* ── Onglet Informations ── */}
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
                      <img src={preview || entreprise.logo} alt="Logo"
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
                    <i className="fas fa-upload mr-1" />Changer le logo
                  </button>
                </div>

                <div className="col-md-8">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Nom *</label>
                      <input className="form-control" name="nom" value={entreprise.nom || ''}
                        onChange={handleChange} required
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Sigle</label>
                      <input className="form-control" name="sigle" value={entreprise.sigle || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Secteur</label>
                      <select className="form-control" name="secteur" value={entreprise.secteur || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                        {SECTEURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Taille</label>
                      <select className="form-control" name="taille" value={entreprise.taille || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                        {TAILLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>N° Contribuable</label>
                      <input className="form-control" name="numero_contribuable"
                        value={entreprise.numero_contribuable || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Registre de commerce</label>
                      <input className="form-control" name="registre_commerce"
                        value={entreprise.registre_commerce || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Ville</label>
                      <input className="form-control" name="ville" value={entreprise.ville || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Pays</label>
                      <input className="form-control" name="pays" value={entreprise.pays || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Téléphone</label>
                      <input className="form-control" name="telephone" value={entreprise.telephone || ''}
                        onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Email</label>
                      <input className="form-control" type="email" name="email"
                        value={entreprise.email || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Site web</label>
                      <input className="form-control" type="url" name="site_web"
                        value={entreprise.site_web || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                    <div className="col-12 mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Adresse</label>
                      <textarea className="form-control" name="adresse" rows={2}
                        value={entreprise.adresse || ''} onChange={handleChange}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Onglet Personnalisation ── */}
            {tab === 'perso' && (
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="card p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--text-primary)' }}>Couleurs de la charte graphique</h6>
                    <div className="mb-3">
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Couleur primaire</label>
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
                      <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Couleur secondaire</label>
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
                      La personnalisation des couleurs s'applique après sauvegarde.
                    </p>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="card p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--text-primary)' }}>Aperçu</h6>
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ background: entreprise.couleur_primaire, padding: '12px 16px', color: '#fff' }}>
                        <strong>{entreprise.sigle || entreprise.nom}</strong>
                        <span style={{ float: 'right', fontSize: 12, opacity: 0.8 }}>SIRH</span>
                      </div>
                      <div style={{ background: entreprise.couleur_secondaire, padding: '8px 16px', color: '#fff', fontSize: 13 }}>
                        Espace RH — Tableau de bord
                      </div>
                      <div style={{ padding: 16, background: '#f8f9fa' }}>
                        <div style={{ background: '#fff', borderRadius: 6, padding: 12, fontSize: 12, color: '#333' }}>
                          <i className="fas fa-users mr-2" style={{ color: entreprise.couleur_primaire }} />
                          Employés actifs : {entreprise.nb_employes_actifs ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Onglet Config RH ── */}
            {tab === 'config' && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Devise</label>
                  <input className="form-control" name="devise" value={entreprise.devise || 'FCFA'}
                    onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Fuseau horaire</label>
                  <input className="form-control" name="fuseau_horaire" value={entreprise.fuseau_horaire || ''}
                    onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Heure début travail</label>
                  <input className="form-control" type="time" name="heure_debut_travail"
                    value={entreprise.heure_debut_travail || '08:00'} onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Heure fin travail</label>
                  <input className="form-control" type="time" name="heure_fin_travail"
                    value={entreprise.heure_fin_travail || '17:00'} onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>
                <div className="col-md-6 mb-3">
                  <label style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Nb. max employés</label>
                  <input className="form-control" type="number" name="nb_employes_max"
                    value={entreprise.nb_employes_max || 50} onChange={handleChange}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
                </div>

                {/* Statut abonnement (lecture seule) */}
                <div className="col-12 mt-2">
                  <div className="card p-3" style={{ background: 'rgba(31,56,100,0.06)', border: '1px solid var(--border-color)' }}>
                    <h6 style={{ color: 'var(--text-primary)' }}>Abonnement</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <small style={{ color: 'var(--text-secondary)' }}>Statut</small>
                        <div>
                          <span className={`badge ${
                            entreprise.statut === 'ACTIVE' ? 'badge-success' :
                            entreprise.statut === 'ESSAI'  ? 'badge-info' : 'badge-danger'
                          }`}>{entreprise.statut}</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <small style={{ color: 'var(--text-secondary)' }}>Abonnement actif</small>
                        <div style={{ color: entreprise.abonnement_actif ? '#28a745' : '#dc3545', fontWeight: 600 }}>
                          {entreprise.abonnement_actif ? 'Oui' : 'Non'}
                        </div>
                      </div>
                      {entreprise.jours_restants_abonnement !== null && (
                        <div className="col-md-4">
                          <small style={{ color: 'var(--text-secondary)' }}>Jours restants</small>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entreprise.jours_restants_abonnement} jours
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
                  ? <><i className="fas fa-spinner fa-spin mr-2" />Sauvegarde…</>
                  : <><i className="fas fa-save mr-2" />Sauvegarder</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </RHLayout>
  )
}
