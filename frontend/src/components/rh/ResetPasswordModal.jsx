import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { resetPassword } from '../../api/gestionComptes'

export default function ResetPasswordModal({ isOpen, onClose, onSuccess, user }) {
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors]                   = useState({})
  const [loading, setLoading]                 = useState(false)
  const [showPwd, setShowPwd]                 = useState(false)
  const [showPwd2, setShowPwd2]               = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
      setShowPwd(false)
      setShowPwd2(false)
    }
  }, [isOpen])

  function validate() {
    const e = {}
    if (!newPassword)             e.new_password = 'Nouveau mot de passe requis.'
    else if (newPassword.length < 8) e.new_password = 'Minimum 8 caractères.'
    if (newPassword !== confirmPassword)
      e.confirm_password = 'Les mots de passe ne correspondent pas.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await resetPassword(user.id, {
        new_password:     newPassword,
        confirm_password: confirmPassword,
      })
      toast.success(`Mot de passe de ${user.first_name || user.username} réinitialisé.`)
      onSuccess?.()
      onClose()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const apiErrs = {}
        Object.keys(data).forEach(k => {
          apiErrs[k] = Array.isArray(data[k]) ? data[k][0] : data[k]
        })
        setErrors(apiErrs)
        toast.error('Veuillez corriger les erreurs.')
      } else {
        toast.error('Impossible de réinitialiser le mot de passe.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  const nomComplet = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-key mr-2" />
              Réinitialiser le mot de passe
            </h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="alert alert-info py-2 mb-3">
                <i className="fas fa-user mr-1" />
                <strong>{nomComplet}</strong>
                <span className="text-muted ml-2">({user.username})</span>
              </div>

              <div className="form-group">
                <label>Nouveau mot de passe <span className="text-danger">*</span></label>
                <div className="input-group">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className={`form-control ${errors.new_password ? 'is-invalid' : ''}`}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setErrors(v => ({ ...v, new_password: undefined })) }}
                    autoComplete="new-password"
                  />
                  <div className="input-group-append">
                    <button type="button" className="btn btn-outline-secondary"
                      onClick={() => setShowPwd(v => !v)}>
                      <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                  {errors.new_password && <div className="invalid-feedback">{errors.new_password}</div>}
                </div>
                <small className="text-muted">Minimum 8 caractères.</small>
              </div>

              <div className="form-group">
                <label>Confirmer le mot de passe <span className="text-danger">*</span></label>
                <div className="input-group">
                  <input
                    type={showPwd2 ? 'text' : 'password'}
                    className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(v => ({ ...v, confirm_password: undefined })) }}
                    autoComplete="new-password"
                  />
                  <div className="input-group-append">
                    <button type="button" className="btn btn-outline-secondary"
                      onClick={() => setShowPwd2(v => !v)}>
                      <i className={`fas ${showPwd2 ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                  {errors.confirm_password && <div className="invalid-feedback">{errors.confirm_password}</div>}
                </div>
              </div>

              {errors.detail && (
                <div className="alert alert-danger">{errors.detail}</div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Annuler
              </button>
              <button type="submit" className="btn btn-warning" disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin mr-1" />Réinitialisation…</>
                  : <><i className="fas fa-key mr-1" />Réinitialiser</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
