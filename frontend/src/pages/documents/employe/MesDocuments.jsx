import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import { getMesDocuments, telechargerDocument } from '../../../api/documents'
import { useApercu } from '../../../components/ui/useApercu'

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function DocumentCard({ doc, onApercu }) {
  const { t }   = useTranslation()
  const ext     = doc.fichier?.split('.').pop()?.toUpperCase() || 'DOC'
  const expire  = doc.expire_bientot
  const [busy, setBusy] = useState(false)

  async function handleApercu() {
    if (busy) return
    setBusy(true)
    try {
      const res = await telechargerDocument(doc.id)
      onApercu(res.data, doc.fichier ? doc.fichier.split('/').pop() : `document-${doc.id}.pdf`, doc.titre)
    } catch {
      toast.error(t('documents.download_error', 'Échec du téléchargement'), { id: 'dl-err' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
      <div className="d-flex align-items-center">
        <div style={{
          width: 36, height: 36, borderRadius: 6, flexShrink: 0,
          background: doc.categorie_detail?.couleur || '#2E74B5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700, marginRight: 10,
        }}>
          {ext.slice(0, 3)}
        </div>
        <div>
          <div className="font-weight-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {doc.titre}
            {expire && (
              <span className="badge badge-warning ml-2" style={{ fontSize: 10 }}>
                {t('documents.expires_soon')}
              </span>
            )}
          </div>
          <small className="text-muted">
            {doc.taille_lisible}
            {doc.date_expiration && (
              <span className="ml-2">{t('documents.expires_on', { date: fmtDate(doc.date_expiration) })}</span>
            )}
          </small>
        </div>
      </div>
      <button
        className="btn btn-xs btn-outline-primary ml-2"
        title={t('apercu.preview')}
        onClick={handleApercu}
        disabled={busy}
      >
        {busy
          ? <i className="fas fa-spinner fa-spin" />
          : <i className="fas fa-eye" />
        }
      </button>
    </div>
  )
}

export default function MesDocuments() {
  const { t } = useTranslation()
  const [docs,    setDocs]    = useState([])
  const [loading, setLoading] = useState(true)
  const { voirFichier, apercuModal } = useApercu()

  useEffect(() => {
    getMesDocuments()
      .then(r => setDocs(r.data.results ?? r.data))
      .catch(() => toast.error(t('documents.load_error'), { id: 'docs-load-error' }))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  if (loading) {
    return (
      <EmployeLayout pageTitle={t('documents.page_title_my')}>
        <Spinner message={t('documents.load_error')} />
      </EmployeLayout>
    )
  }

  const parCategorie = {}
  docs.forEach(d => {
    const cat = d.categorie_detail?.nom || 'Autre'
    if (!parCategorie[cat]) parCategorie[cat] = { info: d.categorie_detail, docs: [] }
    parCategorie[cat].docs.push(d)
  })

  const categories = Object.entries(parCategorie)

  return (
    <EmployeLayout pageTitle={t('documents.page_title_my')}>
      {categories.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-folder-open fa-3x mb-3 d-block" />
            <h5>{t('documents.no_docs')}</h5>
            <p>{t('documents.no_docs_hint')}</p>
          </div>
        </div>
      ) : (
        <div className="row">
          {categories.map(([catNom, catData]) => (
            <div className="col-md-6" key={catNom}>
              <div className="card">
                <div className="card-header py-2">
                  <h3 className="card-title" style={{ fontSize: 13 }}>
                    <i className={`${catData.info?.icone || 'fas fa-file'} mr-2`}
                      style={{ color: catData.info?.couleur || '#2E74B5' }} />
                    {catNom}
                    <span className="badge badge-secondary ml-2">{catData.docs.length}</span>
                  </h3>
                </div>
                <div className="card-body py-1 px-3">
                  {catData.docs.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} onApercu={voirFichier} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {apercuModal}
    </EmployeLayout>
  )
}
