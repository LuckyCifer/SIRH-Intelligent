import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmployeLayout from '../../components/layout/EmployeLayout'
import { UserAvatarCard } from '../../components/ui/UserAvatar'
import { uploadMaPhoto, supprimerMaPhoto } from '../../api/profil'
import useAuthStore from '../../store/authStore'

export default function MonProfilPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()
  const [uploading, setUploading] = useState(false)

  async function handleUpload(fichier) {
    setUploading(true)
    try {
      await uploadMaPhoto(fichier)
      await refreshUser()
      toast.success(t('profil.photo_updated'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('profil.photo_error'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSupprimer() {
    if (!window.confirm(t('profil.confirm_delete_photo'))) return
    setUploading(true)
    try {
      await supprimerMaPhoto()
      await refreshUser()
      toast.success(t('profil.photo_deleted'))
    } catch {
      toast.error(t('profil.delete_error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <EmployeLayout pageTitle={t('profil.title')}>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card card-primary card-outline">
            <div className="card-body text-center py-4">
              <div className="position-relative d-inline-block mb-3">
                <UserAvatarCard
                  user={user}
                  size={140}
                  editable={!uploading}
                  onUpload={handleUpload}
                  onRemove={handleSupprimer}
                />
                {uploading && (
                  <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ top: 0, left: 0, background: 'rgba(255,255,255,0.7)', borderRadius: 6 }}>
                    <i className="fas fa-spinner fa-spin text-primary fa-lg" />
                  </div>
                )}
              </div>
              <h5 className="mb-0 font-weight-bold">
                {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username}
              </h5>
              <small className="text-muted">{user?.role}</small>
              <div className="mt-3">
                <small className="text-muted d-block">{t('profil.change_photo')}</small>
                <small className="text-muted d-block">{t('profil.photo_info')}</small>
              </div>
              {user?.photo_url && (
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger mt-2"
                  onClick={handleSupprimer}
                  disabled={uploading}
                >
                  <i className="fas fa-trash-alt mr-1" />{t('profil.delete_photo')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-id-card mr-2" />{t('profil.personal_info')}</h3>
            </div>
            <div className="card-body">
              <dl className="row mb-0" style={{ fontSize: 14 }}>
                <dt className="col-sm-4 text-muted">{t('profil.first_name')}</dt>
                <dd className="col-sm-8">{user?.first_name || '—'}</dd>

                <dt className="col-sm-4 text-muted">{t('profil.last_name')}</dt>
                <dd className="col-sm-8">{user?.last_name || '—'}</dd>

                <dt className="col-sm-4 text-muted">{t('profil.username')}</dt>
                <dd className="col-sm-8 text-monospace">{user?.username || '—'}</dd>

                <dt className="col-sm-4 text-muted">{t('profil.email')}</dt>
                <dd className="col-sm-8">{user?.email || '—'}</dd>

                <dt className="col-sm-4 text-muted">{t('profil.phone')}</dt>
                <dd className="col-sm-8">{user?.telephone || '—'}</dd>

                <dt className="col-sm-4 text-muted">{t('profil.role')}</dt>
                <dd className="col-sm-8">
                  <span className="badge badge-primary">{user?.role}</span>
                </dd>

                {user?.departement_nom && (
                  <>
                    <dt className="col-sm-4 text-muted">{t('profil.department')}</dt>
                    <dd className="col-sm-8">{user.departement_nom}</dd>
                  </>
                )}

                {user?.categorie_pro && (
                  <>
                    <dt className="col-sm-4 text-muted">{t('profil.category')}</dt>
                    <dd className="col-sm-8">
                      Cat. {user.categorie_pro} — Échelon {user.echelon}
                    </dd>
                  </>
                )}

                {user?.numero_cnps && (
                  <>
                    <dt className="col-sm-4 text-muted">{t('profil.cnps_number')}</dt>
                    <dd className="col-sm-8 text-monospace">{user.numero_cnps}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

    </EmployeLayout>
  )
}
