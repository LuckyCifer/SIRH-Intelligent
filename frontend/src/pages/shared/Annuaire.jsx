import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import DynamicLayout from '../../components/layout/DynamicLayout'
import UserAvatar from '../../components/ui/UserAvatar'

const ROLE_COLORS = {
  EMPLOYE: '#2E74B5', MANAGER: '#28A745', RH: '#DC3545', ADMIN: '#6F42C1',
}

function CarteEmploye({ emp }) {
  const couleur = ROLE_COLORS[emp.role] || '#2E74B5'
  return (
    <div className="card h-100" style={{ borderTop: `3px solid ${couleur}` }}>
      <div className="card-body text-center py-3">
        <div style={{ margin: '0 auto 10px', display: 'inline-flex' }}>
          <UserAvatar user={emp} size={64} shape="circle" />
        </div>
        <div className="font-weight-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
          {emp.full_name || emp.username}
        </div>
        {emp.filiere && emp.filiere !== 'AUTRE' && (
          <small className="text-muted d-block" style={{ fontSize: 11 }}>
            {emp.filiere.replace('_', ' ')}
          </small>
        )}
        <div className="mt-2">
          <span className="badge" style={{ background: couleur, color: '#fff', fontSize: 10 }}>
            {emp.role}
          </span>
        </div>
        {emp.email && (
          <div className="mt-2" style={{ fontSize: 12 }}>
            <a href={`mailto:${emp.email}`} className="text-muted">
              <i className="fas fa-envelope mr-1" />{emp.email}
            </a>
          </div>
        )}
        {emp.telephone && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <i className="fas fa-phone mr-1" />{emp.telephone}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Annuaire() {
  const { t } = useTranslation()
  const [employes, setEmployes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    api.get('/accounts/annuaire/')
      .then(r => {
        const all = r.data.results ?? r.data
        setEmployes(all)
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  const filtered = employes.filter(emp => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (emp.full_name || emp.username || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.filiere || '').toLowerCase().includes(q) ||
      (emp.role || '').toLowerCase().includes(q)
    )
  })

  return (
    <DynamicLayout pageTitle={t('annuaire.title')}>

      {/* Barre de recherche */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="input-group input-group-sm">
            <div className="input-group-prepend">
              <span className="input-group-text">
                <i className="fas fa-search" />
              </span>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder={t('annuaire.search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <div className="input-group-append">
                <button className="btn btn-outline-secondary"
                  onClick={() => setSearch('')}>
                  <i className="fas fa-times" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-end">
          <span className="text-muted" style={{ fontSize: 13 }}>
            {t(filtered.length !== 1 ? 'annuaire.collaborators_plural' : 'annuaire.collaborators_count', { count: filtered.length })}
            {search && ` ${t(filtered.length !== 1 ? 'annuaire.found_count_plural' : 'annuaire.found_count', { count: filtered.length })}`}
          </span>
        </div>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x text-muted" />
          <p className="mt-2 text-muted">{t('annuaire.loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="fas fa-users-slash fa-3x mb-3 d-block" />
          {search ? `${t('annuaire.no_results_for')} "${search}".` : t('annuaire.no_collaborators')}
        </div>
      ) : (
        <div className="row">
          {filtered.map(emp => (
            <div className="col-lg-3 col-md-4 col-sm-6 mb-3" key={emp.id}>
              <CarteEmploye emp={emp} />
            </div>
          ))}
        </div>
      )}

    </DynamicLayout>
  )
}
