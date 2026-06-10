import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import RHLayout from '../../../components/layout/RHLayout'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import ManagerLayout from '../../../components/layout/ManagerLayout'
import useAuthStore from '../../../store/authStore'
import {
  getNotifications, marquerLue, toutLire, supprimerLues
} from '../../../api/notifications'

const TYPE_META = {
  INFO:   { icon: 'fas fa-info-circle',        color: '#17a2b8', label: 'Info' },
  SUCCES: { icon: 'fas fa-check-circle',       color: '#28a745', label: 'Succès' },
  ALERTE: { icon: 'fas fa-exclamation-circle', color: '#fd7e14', label: 'Alerte' },
  URGENT: { icon: 'fas fa-times-circle',       color: '#dc3545', label: 'Urgent' },
}

const CATEGORIES = [
  ['', 'Toutes'], ['CONGE','Congés'], ['EVALUATION','Évaluation'],
  ['CONTRAT','Contrats'], ['PAIE','Paie'], ['FORMATION','Formations'],
  ['RECRUTEMENT','Recrutements'], ['SYSTEME','Système'],
]

function formatDate(str) {
  return new Date(str).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function NotificationRow({ notif, onLue, onSelect, selected }) {
  const meta = TYPE_META[notif.type_notif] || TYPE_META.INFO
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: notif.lue ? 'transparent' : 'rgba(31,56,100,0.06)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => onLue(notif)}
    >
      <input type="checkbox" checked={selected}
        onChange={() => {}} onClick={e => { e.stopPropagation(); onSelect(notif.id) }}
        style={{ marginTop: 4, cursor: 'pointer' }} />
      <i className={meta.icon} style={{ color: meta.color, fontSize: 18, marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{
            fontSize: 14, color: 'var(--text-primary)',
            fontWeight: notif.lue ? 500 : 700,
          }}>
            {notif.titre}
          </strong>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
            <span className="badge" style={{
              background: meta.color + '22', color: meta.color,
              border: `1px solid ${meta.color}44`, fontSize: 10,
            }}>
              {meta.label}
            </span>
            <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {formatDate(notif.created_at)}
            </small>
            {!notif.lue && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--acerfi-blue)', flexShrink: 0,
              }} />
            )}
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>
          {notif.message}
        </div>
        {notif.lien && (
          <Link to={notif.lien} onClick={e => e.stopPropagation()}
            style={{ fontSize: 12, color: 'var(--acerfi-blue)', marginTop: 4, display: 'inline-block' }}>
            <i className="fas fa-arrow-right mr-1" />Voir le détail
          </Link>
        )}
      </div>
    </div>
  )
}

export default function CentreNotifications() {
  const { user } = useAuthStore()
  const [notifs, setNotifs]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtreLue, setFiltreLue] = useState('')
  const [filtreCat, setFiltreCat] = useState('')
  const [selected, setSelected]   = useState(new Set())
  const [page, setPage]           = useState(1)
  const [hasNext, setHasNext]     = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 20 }
      if (filtreLue !== '')  params.lue       = filtreLue
      if (filtreCat !== '')  params.categorie = filtreCat
      const r    = await getNotifications(params)
      const data = r.data.results ?? r.data
      setNotifs(Array.isArray(data) ? data : [])
      setHasNext(!!r.data.next)
    } catch {
      toast.error('Erreur de chargement.', { id: 'notif-load' })
    } finally {
      setLoading(false)
    }
  }, [page, filtreLue, filtreCat])

  useEffect(() => { charger() }, [charger])

  async function handleLue(notif) {
    if (!notif.lue) {
      await marquerLue(notif.id).catch(() => {})
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, lue: true } : n))
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleToutLire() {
    await toutLire()
    setNotifs(prev => prev.map(n => ({ ...n, lue: true })))
    toast.success('Toutes les notifications marquées comme lues.')
  }

  async function handleSupprimerLues() {
    if (!window.confirm('Supprimer toutes les notifications lues ?')) return
    const r = await supprimerLues().catch(() => null)
    if (r) {
      toast.success(`${r.data.supprimees} notification(s) supprimée(s).`)
      charger()
    }
  }

  const Layout = user?.role === 'EMPLOYE' ? EmployeLayout
               : user?.role === 'MANAGER' ? ManagerLayout
               : RHLayout

  const nonLues = notifs.filter(n => !n.lue).length

  const content = (
    <div>
      {/* Filtres */}
      <div className="card mb-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="card-body py-3">
          <div className="row align-items-center">
            <div className="col-md-3 mb-2">
              <select className="form-control form-control-sm"
                value={filtreLue} onChange={e => { setFiltreLue(e.target.value); setPage(1) }}
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                <option value="">Toutes (lues + non lues)</option>
                <option value="false">Non lues</option>
                <option value="true">Lues</option>
              </select>
            </div>
            <div className="col-md-4 mb-2">
              <select className="form-control form-control-sm"
                value={filtreCat} onChange={e => { setFiltreCat(e.target.value); setPage(1) }}
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-md-5 mb-2 text-right">
              {nonLues > 0 && (
                <button className="btn btn-sm btn-outline-primary mr-2" onClick={handleToutLire}>
                  <i className="fas fa-check-double mr-1" />Tout marquer comme lu
                </button>
              )}
              <button className="btn btn-sm btn-outline-danger" onClick={handleSupprimerLues}>
                <i className="fas fa-trash mr-1" />Supprimer les lues
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="card" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="card-header d-flex justify-content-between align-items-center"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {loading ? '…' : `${notifs.length} notification(s)`}
            {nonLues > 0 && <span className="badge badge-danger ml-2">{nonLues} non lues</span>}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x" /></div>
        ) : notifs.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <i className="fas fa-bell-slash fa-3x mb-3 d-block" />
            <p>Aucune notification pour le moment.</p>
          </div>
        ) : (
          <>
            {notifs.map(n => (
              <NotificationRow
                key={n.id}
                notif={n}
                onLue={handleLue}
                onSelect={toggleSelect}
                selected={selected.has(n.id)}
              />
            ))}
            {(hasNext || page > 1) && (
              <div className="d-flex justify-content-center gap-2 p-3" style={{ gap: 8 }}>
                {page > 1 && (
                  <button className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage(p => p - 1)}>
                    <i className="fas fa-chevron-left mr-1" />Précédent
                  </button>
                )}
                {hasNext && (
                  <button className="btn btn-sm btn-outline-primary"
                    onClick={() => setPage(p => p + 1)}>
                    Suivant<i className="fas fa-chevron-right ml-1" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  return <Layout pageTitle="Centre de notifications">{content}</Layout>
}
