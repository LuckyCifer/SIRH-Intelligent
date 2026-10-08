import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCompteur, getNotifications, marquerLue, toutLire } from '../../api/notifications'

const TYPE_ICON = {
  INFO:   { icon: 'fas fa-info-circle',       color: '#17a2b8' },
  SUCCES: { icon: 'fas fa-check-circle',      color: '#28a745' },
  ALERTE: { icon: 'fas fa-exclamation-circle', color: '#fd7e14' },
  URGENT: { icon: 'fas fa-times-circle',      color: '#dc3545' },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)   return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  return `Il y a ${Math.floor(diff / 86400)} j`
}

export default function ClochNotifications() {
  const { t } = useTranslation()
  const [nonLues, setNonLues]         = useState(0)
  const [notifs, setNotifs]           = useState([])
  const [open, setOpen]               = useState(false)
  const intervalRef                   = useRef(null)
  const dropdownRef                   = useRef(null)
  const navigate                      = useNavigate()

  function chargerCompteur() {
    getCompteur()
      .then(r => setNonLues(r.data.non_lues ?? 0))
      .catch(() => {})
  }

  function chargerNotifs() {
    getNotifications({ page_size: 6 })
      .then(r => {
        const data = r.data.results ?? r.data
        setNotifs(Array.isArray(data) ? data.slice(0, 6) : [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    chargerCompteur()
    intervalRef.current = setInterval(chargerCompteur, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  function handleOpen() {
    if (!open) chargerNotifs()
    setOpen(o => !o)
  }

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMarquerLue(notif) {
    if (!notif.lue) {
      await marquerLue(notif.id).catch(() => {})
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, lue: true } : n))
      setNonLues(prev => Math.max(0, prev - 1))
    }
    if (notif.lien) {
      setOpen(false)
      navigate(notif.lien)
    }
  }

  async function handleToutLire() {
    await toutLire().catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, lue: true })))
    setNonLues(0)
  }

  const { icon: bellIcon } = TYPE_ICON.ALERTE

  return (
    <li className="nav-item dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-link nav-link p-0 mx-2"
        style={{ position: 'relative', color: 'var(--text-primary)' }}
        onClick={handleOpen}
        title="Notifications"
      >
        <i className="fas fa-bell" style={{ fontSize: 18 }} />
        {nonLues > 0 && (
          <span
            className="badge badge-danger"
            style={{
              position: 'absolute', top: -6, right: -8,
              fontSize: 10, padding: '2px 5px', borderRadius: 10,
              minWidth: 18, textAlign: 'center',
            }}
          >
            {nonLues > 99 ? '99+' : nonLues}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: 340,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
              {t('notifications.title')} {nonLues > 0 && <span className="badge badge-danger ml-1">{nonLues}</span>}
            </strong>
            {nonLues > 0 && (
              <button
                className="btn btn-link p-0"
                style={{ fontSize: 12, color: 'var(--acerfi-blue)' }}
                onClick={handleToutLire}
              >
                {t('notifications.mark_all_read_short')}
              </button>
            )}
          </div>

          {/* Liste */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                <i className="fas fa-bell-slash mb-2 d-block" style={{ fontSize: 24 }} />
                {t('notifications.no_notifications')}
              </div>
            ) : (
              notifs.map(notif => {
                const meta = TYPE_ICON[notif.type_notif] || TYPE_ICON.INFO
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarquerLue(notif)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      background: notif.lue ? 'transparent' : 'rgba(31, 56, 100, 0.05)',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg, rgba(0,0,0,0.04))'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.lue ? 'transparent' : 'rgba(31, 56, 100, 0.05)'}
                  >
                    <i className={meta.icon} style={{ color: meta.color, fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: notif.lue ? 400 : 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {notif.titre}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                        {notif.message.length > 70 ? notif.message.slice(0, 70) + '…' : notif.message}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>
                        {timeAgo(notif.created_at)}
                      </div>
                    </div>
                    {!notif.lue && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--acerfi-blue)',
                        flexShrink: 0, marginTop: 4,
                      }} />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              style={{ fontSize: 13, color: 'var(--acerfi-blue)', textDecoration: 'none' }}
            >
              {t('notifications.see_all')} →
            </Link>
          </div>
        </div>
      )}
    </li>
  )
}
