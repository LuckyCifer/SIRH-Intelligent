import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import EmployeLayout from '../../../components/layout/EmployeLayout'
import Spinner from '../../../components/Spinner'
import { getMesDocuments } from '../../../api/documents'

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function DocumentCard({ doc }) {
  const ext    = doc.fichier?.split('.').pop()?.toUpperCase() || 'DOC'
  const isImg  = ['JPG','JPEG','PNG','GIF'].includes(ext)
  const expire = doc.expire_bientot

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
                Expire bientôt
              </span>
            )}
          </div>
          <small className="text-muted">
            {doc.taille_lisible}
            {doc.date_expiration && (
              <span className="ml-2">· Expire le {fmtDate(doc.date_expiration)}</span>
            )}
          </small>
        </div>
      </div>
      <a
        href={doc.fichier}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-xs btn-outline-primary ml-2"
        title="Télécharger"
      >
        <i className="fas fa-download" />
      </a>
    </div>
  )
}

export default function MesDocuments() {
  const [docs,    setDocs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMesDocuments()
      .then(r => setDocs(r.data.results ?? r.data))
      .catch(() => toast.error('Impossible de charger vos documents.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <EmployeLayout pageTitle="Mes documents">
        <Spinner message="Chargement de vos documents…" />
      </EmployeLayout>
    )
  }

  // Grouper par catégorie
  const parCategorie = {}
  docs.forEach(d => {
    const cat = d.categorie_detail?.nom || 'Autre'
    if (!parCategorie[cat]) parCategorie[cat] = { info: d.categorie_detail, docs: [] }
    parCategorie[cat].docs.push(d)
  })

  const categories = Object.entries(parCategorie)

  return (
    <EmployeLayout pageTitle="Mes documents">

      {categories.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-folder-open fa-3x mb-3 d-block" />
            <h5>Aucun document disponible.</h5>
            <p>Contactez le service RH pour obtenir vos documents.</p>
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
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </EmployeLayout>
  )
}
