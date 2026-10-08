import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../../components/layout/RHLayout'
import Spinner from '../../../components/Spinner'
import FiliereBadge from '../../../components/ui/FiliereBadge'
import api from '../../../api/axios'

export default function DetailDepartement() {
  const { id }    = useParams()
  const { t }     = useTranslation()
  const [dept,     setDept]     = useState(null)
  const [employes, setEmployes] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/departements/${id}/`),
      api.get(`/departements/${id}/employes/`),
    ])
      .then(([dRes, eRes]) => {
        setDept(dRes.data)
        setEmployes(eRes.data.results ?? eRes.data)
      })
      .catch(() => toast.error(t('departments.load_error_dept')))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line

  if (loading) {
    return (
      <RHLayout pageTitle={t('departments.detail_title')}><Spinner /></RHLayout>
    )
  }
  if (!dept) return null

  return (
    <RHLayout pageTitle={`${dept.code} — ${dept.nom}`}>
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: dept.couleur, color: '#fff', fontSize: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: 20,
            }}>
              <i className={dept.icone} />
            </div>
            <div className="flex-grow-1">
              <h4 className="mb-1" style={{ color: 'var(--page-title)' }}>{dept.nom}</h4>
              <div className="d-flex flex-wrap align-items-center" style={{ gap: 10 }}>
                <code style={{ fontSize: 13 }}>{dept.code}</code>
                {dept.responsable_nom && (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <i className="fas fa-user-tie mr-1" />
                    {t('departments.manager_label')} : <strong>{dept.responsable_nom}</strong>
                  </span>
                )}
                <span className={`badge ${dept.actif ? 'badge-success' : 'badge-secondary'}`}>
                  {dept.actif ? t('departments.active_label') : t('departments.inactive_label')}
                </span>
              </div>
              {dept.description && (
                <p className="text-muted mt-1 mb-0" style={{ fontSize: 13 }}>{dept.description}</p>
              )}
            </div>
            <div>
              <Link to={`/rh/departements/${id}/edit`} className="btn btn-sm btn-outline-primary">
                <i className="fas fa-edit mr-1" />{t('common.edit')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-5">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-briefcase mr-2" />{t('departments.section_positions')}
              </h3>
              <span className="badge badge-secondary">{dept.postes?.length ?? 0}</span>
            </div>
            <div className="card-body p-0">
              {!dept.postes || dept.postes.length === 0 ? (
                <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>
                  {t('departments.no_positions')}
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {dept.postes.map(p => (
                    <li className="list-group-item py-2 d-flex justify-content-between" key={p.id}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.titre}</div>
                        <small className="text-muted">{p.niveau_display || p.niveau}</small>
                      </div>
                      {(p.salaire_min || p.salaire_max) && (
                        <small className="text-muted" style={{ fontSize: 11 }}>
                          {p.salaire_min && new Intl.NumberFormat('fr-FR').format(p.salaire_min)}
                          {p.salaire_min && p.salaire_max && ' – '}
                          {p.salaire_max && new Intl.NumberFormat('fr-FR').format(p.salaire_max)}
                          {' FCFA'}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-users mr-2" />{t('departments.section_employees')}
              </h3>
              <span className="badge badge-primary">{employes.length}</span>
            </div>
            <div className="card-body p-0">
              {employes.length === 0 ? (
                <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>
                  {t('departments.no_employees')}
                </div>
              ) : (
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{t('departments.col_name')}</th>
                      <th>{t('departments.col_domain')}</th>
                      <th>{t('departments.col_role')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employes.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontSize: 13 }}>
                          <div className="font-weight-bold">{e.full_name || e.username}</div>
                          <small className="text-muted">{e.email}</small>
                        </td>
                        <td>
                          <FiliereBadge code={e.filiere} size="sm" />
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: 10 }}>{e.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <Link to="/rh/departements" className="btn btn-sm btn-outline-secondary">
          <i className="fas fa-arrow-left mr-1" />{t('departments.back_to_list')}
        </Link>
      </div>
    </RHLayout>
  )
}
