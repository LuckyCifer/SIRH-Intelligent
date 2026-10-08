import React from 'react'

const COULEURS_AVATAR = [
  '#1F3864', '#2E74B5', '#28A745', '#DC3545',
  '#FFC107', '#17A2B8', '#6F42C1', '#E76F51',
  '#2EC4B6', '#C9A84C',
]

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '')

function getCouleurParNom(nom) {
  let hash = 0
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COULEURS_AVATAR[Math.abs(hash) % COULEURS_AVATAR.length]
}

function getInitiales(prenom, nom) {
  const p = (prenom || '').charAt(0).toUpperCase()
  const n = (nom  || '').charAt(0).toUpperCase()
  return (p + n) || '?'
}

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null
  if (photoUrl.startsWith('http')) return photoUrl
  return `${API_BASE}${photoUrl}`
}

export default function UserAvatar({
  user,
  size = 40,
  shape = 'circle',
  className = '',
  style = {},
}) {
  const nomComplet = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  const initiales  = getInitiales(user?.first_name, user?.last_name)
  const couleur    = getCouleurParNom(nomComplet || user?.username || 'U')
  const photoSrc   = resolvePhotoUrl(user?.photo_url)

  const width  = shape === 'card' ? Math.round(size * 0.75) : size
  const height = size
  const borderRadius = shape === 'circle' ? '50%' : '6px'

  const baseStyle = {
    width: `${width}px`,
    height: `${height}px`,
    objectFit: 'cover',
    display: 'inline-block',
    flexShrink: 0,
    borderRadius,
    ...style,
  }

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt={nomComplet || user?.username}
        className={className}
        style={baseStyle}
        onError={e => {
          e.currentTarget.style.display = 'none'
          if (e.currentTarget.nextSibling) {
            e.currentTarget.nextSibling.style.display = 'inline-flex'
          }
        }}
      />
    )
  }

  return (
    <span
      className={`d-inline-flex align-items-center justify-content-center font-weight-bold ${className}`}
      style={{
        ...baseStyle,
        backgroundColor: couleur,
        color: '#FFFFFF',
        fontSize: `${Math.round(size * 0.35)}px`,
        userSelect: 'none',
        letterSpacing: '0.5px',
      }}
      title={nomComplet || user?.username}
    >
      {initiales}
    </span>
  )
}

export function UserAvatarCard({
  user,
  size = 120,
  onUpload,
  onRemove,
  editable = false,
}) {
  const fileInputRef = React.useRef()
  const width = Math.round(size * 0.75)

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${size}px`,
        display: 'inline-block',
        cursor: editable ? 'pointer' : 'default',
      }}
      onClick={() => editable && fileInputRef.current?.click()}
      title={editable ? 'Cliquer pour changer la photo' : ''}
    >
      <UserAvatar user={user} size={size} shape="card" style={{ width: `${width}px`, height: `${size}px` }} />

      {editable && (
        <div
          className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{
            top: 0, left: 0,
            background: 'rgba(0,0,0,0.45)',
            borderRadius: '6px',
            opacity: 0,
            transition: 'opacity 0.2s',
            pointerEvents: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.pointerEvents = 'none' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = 0 }}
        >
          <i className="fas fa-camera text-white mb-1" style={{ fontSize: '20px' }} />
          <span className="text-white" style={{ fontSize: '11px' }}>Changer</span>
        </div>
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files[0]
            if (!file) return
            if (file.size > 2 * 1024 * 1024) {
              alert('La photo ne doit pas dépasser 2 Mo.')
              return
            }
            onUpload && onUpload(file)
            e.target.value = ''
          }}
        />
      )}
    </div>
  )
}
