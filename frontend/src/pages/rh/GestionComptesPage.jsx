import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../components/layout/RHLayout'
import UserFormModal from '../../components/rh/UserFormModal'
import ResetPasswordModal from '../../components/rh/ResetPasswordModal'
import UserAvatar from '../../components/ui/UserAvatar'
import { getUsers, toggleActive, deleteUser } from '../../api/gestionComptes'
import useAuthStore from '../../store/authStore'

const ROLE_BADGE = {
  EMPLOYE: { cls: 'badge-info',    key: 'employe' },
  MANAGER: { cls: 'badge-success', key: 'manager' },
  RH:      { cls: 'badge-primary', key: 'rh'      },
  ADMIN:   { cls: 'badge-danger',  key: 'admin'   },
}

export default function GestionComptesPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuthStore()

  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterRole,  setFilterRole]  = useState('')
  const [filterActif, setFilterActif] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  // Modals
  const [createOpen,    setCreateOpen]    = useState(false)
  const [editUserId,    setEditUserId]    = useState(null)
  const [resetUser,     setResetUser]     = useState(null)

  const debounceRef = useRef(null)

  const load = useCallback(async (q = search, role = filterRole, actif = filterActif) => {
    setLoading(true)
    try {
      const r = await getUsers({ search: q, role, is_active: actif })
      setUsers(r.data.results ?? r.data)
    } catch {
      toast.error(t('accounts.load_error'))
    } finally {
      setLoading(false)
    }
  }, [search, filterRole, filterActif, t])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val) {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(val, filterRole, filterActif), 300)
  }

  function handleRoleFilter(val) {
    setFilterRole(val)
    load(search, val, filterActif)
  }

  function handleActifFilter(val) {
    setFilterActif(val)
    load(search, filterRole, val)
  }

  async function handleToggleActive(user) {
    const action = user.is_active ? t('accounts.deactivate_tooltip').toLowerCase() : t('accounts.activate_tooltip').toLowerCase()
    if (!window.confirm(`${action} ${user.first_name || user.username} ?`)) return
    setActionLoading(user.id)
    try {
      const r = await toggleActive(user.id)
      toast.success(r.data.message)
      load(search, filterRole, filterActif)
    } catch (err) {
      toast.error(err.response?.data?.detail || t('accounts.toggle_error'))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(
      `${t('accounts.deactivate_perm_tooltip')} — ${user.first_name || user.username} ?`
    )) return
    setActionLoading(user.id)
    try {
      await deleteUser(user.id)
      toast.success(t('accounts.account_disabled'))
      load(search, filterRole, filterActif)
    } catch (err) {
      toast.error(err.response?.data?.detail || t('accounts.disable_error'))
    } finally {
      setActionLoading(null)
    }
  }

  const isSelf = (u) => u.id === currentUser?.id

  const userCount = users.length
  const userCountLabel = userCount === 1
    ? t('accounts.n_users', { count: userCount })
    : t('accounts.n_users_plural', { count: userCount })

  return (
    <RHLayout pageTitle={t('accounts.page_title')}>

      {/* ── Barre d'actions ── */}
      <div className="card card-outline card-primary mb-3">
        <div className="card-body py-3">
          <div className="row align-items-center">
            <div className="col-md-4 mb-2 mb-md-0">
              <div className="input-group input-group-sm">
                <div className="input-group-prepend">
                  <span className="input-group-text"><i className="fas fa-search" /></span>
                </div>
                <input type="text" className="form-control"
                  placeholder={t('accounts.search_placeholder')}
                  value={search} onChange={e => handleSearch(e.target.value)} />
                {search && (
                  <div className="input-group-append">
                    <button className="btn btn-outline-secondary" onClick={() => handleSearch('')}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-2 mb-2 mb-md-0">
              <select className="form-control form-control-sm" value={filterRole} onChange={e => handleRoleFilter(e.target.value)}>
                <option value="">{t('accounts.all_roles')}</option>
                <option value="EMPLOYE">{t('accounts.employe')}</option>
                <option value="MANAGER">{t('accounts.manager')}</option>
                <option value="RH">{t('accounts.rh')}</option>
              </select>
            </div>

            <div className="col-md-2 mb-2 mb-md-0">
              <select className="form-control form-control-sm" value={filterActif} onChange={e => handleActifFilter(e.target.value)}>
                <option value="">{t('accounts.all_statuses')}</option>
                <option value="true">{t('accounts.status_active')}</option>
                <option value="false">{t('accounts.status_inactive')}</option>
              </select>
            </div>

            <div className="col-md-4 d-flex justify-content-end align-items-center">
              <span className="text-muted mr-3" style={{ fontSize: 13 }}>
                {loading ? '…' : userCountLabel}
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
                <i className="fas fa-user-plus mr-1" />{t('accounts.new_user')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x text-muted" />
              <p className="mt-2 text-muted">{t('common.loading')}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-users-slash fa-3x mb-3 d-block" />
              {t('accounts.no_users')}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0" style={{ fontSize: 13 }}>
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: 44 }}></th>
                    <th>{t('accounts.full_name')}</th>
                    <th>{t('accounts.username')}</th>
                    <th>{t('accounts.email')}</th>
                    <th>{t('accounts.role')}</th>
                    <th>{t('accounts.department')}</th>
                    <th>{t('accounts.category_echelon')}</th>
                    <th>{t('accounts.cnps_col')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('accounts.since')}</th>
                    <th style={{ width: 160 }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const badge  = ROLE_BADGE[u.role] || { cls: 'badge-secondary', key: null }
                    const self   = isSelf(u)
                    const busy   = actionLoading === u.id
                    const nomComplet = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username

                    return (
                      <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.6 }}>
                        <td className="text-center align-middle pl-3">
                          <UserAvatar user={u} size={36} shape="circle" />
                        </td>
                        <td className="align-middle font-weight-bold">
                          {nomComplet}
                          {self && <span className="badge badge-light ml-1">{t('accounts.you_badge')}</span>}
                        </td>
                        <td className="align-middle text-monospace">{u.username}</td>
                        <td className="align-middle">
                          <a href={`mailto:${u.email}`} className="text-muted">{u.email}</a>
                        </td>
                        <td className="align-middle">
                          <span className={`badge ${badge.cls}`}>
                            {badge.key ? t(`accounts.${badge.key}`) : u.role}
                          </span>
                        </td>
                        <td className="align-middle text-muted">
                          {u.departement_nom || '—'}
                        </td>
                        <td className="align-middle" style={{ fontSize: 12 }}>
                          {u.categorie_pro
                            ? <span>
                                <span className="badge badge-light border">{t('accounts.cat_prefix', { cat: u.categorie_pro })}</span>
                                {' '}
                                <span className="text-muted">{t('accounts.echelon')} {u.echelon}</span>
                              </span>
                            : <span className="text-muted">—</span>
                          }
                        </td>
                        <td className="align-middle text-monospace" style={{ fontSize: 12 }}>
                          {u.numero_cnps
                            ? `${u.numero_cnps.slice(0, 3)}${'•'.repeat(Math.max(0, u.numero_cnps.length - 5))}${u.numero_cnps.slice(-2)}`
                            : <span className="text-muted">—</span>
                          }
                        </td>
                        <td className="align-middle">
                          {u.is_active
                            ? <span className="badge badge-success">{t('accounts.status_active')}</span>
                            : <span className="badge badge-secondary">{t('accounts.status_inactive')}</span>
                          }
                        </td>
                        <td className="align-middle text-muted">
                          {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="align-middle">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              title={t('accounts.edit_tooltip')}
                              onClick={() => setEditUserId(u.id)}
                              disabled={busy}
                            >
                              <i className="fas fa-edit" />
                            </button>

                            <button
                              className="btn btn-outline-warning"
                              title={t('accounts.reset_password')}
                              onClick={() => setResetUser(u)}
                              disabled={busy}
                            >
                              <i className="fas fa-key" />
                            </button>

                            {!self && (
                              <button
                                className={`btn btn-outline-${u.is_active ? 'secondary' : 'success'}`}
                                title={u.is_active ? t('accounts.deactivate_tooltip') : t('accounts.activate_tooltip')}
                                onClick={() => handleToggleActive(u)}
                                disabled={busy}
                              >
                                {busy
                                  ? <i className="fas fa-spinner fa-spin" />
                                  : <i className={`fas ${u.is_active ? 'fa-pause' : 'fa-play'}`} />
                                }
                              </button>
                            )}

                            {!self && u.is_active && (
                              <button
                                className="btn btn-outline-danger"
                                title={t('accounts.deactivate_perm_tooltip')}
                                onClick={() => handleDelete(u)}
                                disabled={busy}
                              >
                                <i className="fas fa-user-times" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <UserFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => load(search, filterRole, filterActif)}
      />

      <UserFormModal
        isOpen={!!editUserId}
        userId={editUserId}
        onClose={() => setEditUserId(null)}
        onSuccess={() => load(search, filterRole, filterActif)}
      />

      <ResetPasswordModal
        isOpen={!!resetUser}
        user={resetUser}
        onClose={() => setResetUser(null)}
        onSuccess={() => {}}
      />

    </RHLayout>
  )
}
