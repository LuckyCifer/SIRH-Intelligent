/**
 * Aperçu d'un document avant téléchargement — 100 % local (hors connexion).
 *
 * - PDF    : lecteur PDF intégré du navigateur (iframe sur une URL blob)
 * - Images : balise <img>
 * - CSV    : tableau HTML, téléchargeable en CSV ou imprimable / enregistrable en PDF
 * - Autres (Word, Excel…) : pas d'aperçu possible, téléchargement direct
 *
 * Usage (voir useApercu.jsx) :
 *   const { voirFichier, voirTableau, apercuModal } = useApercu()
 *   voirFichier(blob, 'bulletin.pdf', 'Bulletin de paie')
 *   voirTableau({ titre, nomFichier: 'conges.csv', entetes: [...], lignes: [[...]] })
 *   return <>{...}{apercuModal}</>
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const BOM = String.fromCharCode(0xfeff)

const MIME_PAR_EXTENSION = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  csv: 'text/csv', txt: 'text/plain',
}

function extension(nom) {
  return (nom || '').split('?')[0].split('.').pop().toLowerCase()
}

function genreFichier(ext) {
  if (ext === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (ext === 'csv' || ext === 'txt') return 'texte'
  return 'autre'
}

function celluleCsv(v) {
  const s = v == null ? '' : String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function construireCsv(entetes, lignes) {
  return [entetes, ...lignes].map(r => r.map(celluleCsv).join(';')).join('\n')
}

function parserCsv(texte) {
  const sep = (texte.split('\n')[0].match(/;/g) || []).length >= (texte.split('\n')[0].match(/,/g) || []).length ? ';' : ','
  const lignes = []
  let ligne = [], cell = '', guillemets = false
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') guillemets = false
      else cell += c
    } else if (c === '"') guillemets = true
    else if (c === sep) { ligne.push(cell); cell = '' }
    else if (c === '\n') { ligne.push(cell); lignes.push(ligne); ligne = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || ligne.length) { ligne.push(cell); lignes.push(ligne) }
  return lignes
}

function declencherTelechargement(url, nom) {
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function echapperHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

/** Imprime le tableau dans un iframe caché (le navigateur propose « Enregistrer en PDF »). */
function imprimerTableau(titre, entetes, lignes) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${echapperHtml(titre)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:16px}
  h1{font-size:16px;margin:0 0 4px} p{margin:0 0 12px;color:#555}
  table{border-collapse:collapse;width:100%} th,td{border:1px solid #999;padding:4px 6px;text-align:left}
  th{background:#1F3864;color:#fff} tr:nth-child(even) td{background:#f2f5f9}
  @page{size:landscape;margin:12mm} th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style></head><body>
<h1>${echapperHtml(titre)}</h1><p>SIRH — ${new Date().toLocaleString('fr-FR')}</p>
<table><thead><tr>${entetes.map(h => `<th>${echapperHtml(h)}</th>`).join('')}</tr></thead>
<tbody>${lignes.map(l => `<tr>${l.map(c => `<td>${echapperHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
</body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  setTimeout(() => iframe.remove(), 1000)
}

function ApercuDocument({ apercu, onFermer }) {
  const { t } = useTranslation()
  const [csvLu, setCsvLu] = useState(null)   // { source: Blob, entetes, lignes }
  const fermerRef = useRef(null)

  const ext   = apercu?.blob ? extension(apercu.nomFichier) : 'csv'
  const genre = apercu?.blob ? genreFichier(ext) : 'tableau'

  // URL blob typée (sinon Chrome télécharge le PDF au lieu de l'afficher)
  const url = useMemo(() => {
    if (!apercu?.blob) return null
    const type = MIME_PAR_EXTENSION[ext] || apercu.blob.type || 'application/octet-stream'
    const blob = apercu.blob.type === type ? apercu.blob : new Blob([apercu.blob], { type })
    return URL.createObjectURL(blob)
  }, [apercu, ext])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  // Fichiers CSV / texte : lecture asynchrone puis affichage en tableau
  useEffect(() => {
    if (!apercu?.blob || genre !== 'texte') return
    const source = apercu.blob
    source.text().then(txt => {
      const rows = parserCsv(txt.startsWith(BOM) ? txt.slice(1) : txt)
      setCsvLu({ source, entetes: rows[0] || [], lignes: rows.slice(1) })
    })
  }, [apercu, genre])

  const tableau = apercu?.entetes
    ? { entetes: apercu.entetes, lignes: apercu.lignes }
    : (csvLu && csvLu.source === apercu?.blob ? csvLu : null)

  useEffect(() => {
    if (!apercu) return undefined
    const onKey = e => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    fermerRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [apercu, onFermer])

  if (!apercu) return null

  const telecharger = () => {
    if (url) { declencherTelechargement(url, apercu.nomFichier); return }
    const csv = construireCsv(tableau.entetes, tableau.lignes)
    const u = URL.createObjectURL(new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' }))
    declencherTelechargement(u, apercu.nomFichier)
    setTimeout(() => URL.revokeObjectURL(u), 1000)
  }

  const libelleTelecharger = genre === 'tableau' || genre === 'texte'
    ? t('apercu.download_csv')
    : genre === 'pdf' ? t('apercu.download_pdf') : t('common.download')

  return (
    <div className="modal fade show" role="dialog" aria-modal="true"
      style={{ display: 'block', background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onFermer() }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '95vw' }}>
        <div className="modal-content" style={{ background: 'var(--card-bg)', height: '90vh' }}>
          <div className="modal-header py-2" style={{ borderColor: 'var(--border-color)' }}>
            <h5 className="modal-title text-truncate" style={{ color: 'var(--page-title)', fontSize: 16 }}>
              <i className="fas fa-eye mr-2" />
              {apercu.titre || apercu.nomFichier}
              <small className="text-muted ml-2">{apercu.nomFichier}</small>
            </h5>
            <button type="button" className="close" onClick={onFermer} aria-label={t('common.close')}
              style={{ color: 'var(--text-primary)' }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body p-0" style={{ overflow: 'auto', background: genre === 'pdf' ? '#525659' : undefined }}>
            {genre === 'pdf' && url && (
              <iframe src={url} title={apercu.nomFichier} style={{ width: '100%', height: '100%', border: 0 }} />
            )}

            {genre === 'image' && url && (
              <div className="d-flex align-items-center justify-content-center h-100 p-3">
                <img src={url} alt={apercu.titre || apercu.nomFichier}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            )}

            {(genre === 'tableau' || genre === 'texte') && tableau && (
              tableau.lignes.length === 0 ? (
                <div className="text-center text-muted p-5">{t('common.no_data')}</div>
              ) : (
                <table className="table table-sm table-striped table-hover mb-0" style={{ fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      {tableau.entetes.map((h, i) => (
                        <th key={i} style={{ background: '#1F3864', color: '#fff', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableau.lignes.map((l, i) => (
                      <tr key={i}>
                        {l.map((c, j) => <td key={j} style={{ color: 'var(--text-primary)' }}>{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {genre === 'autre' && (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-center">
                <i className="fas fa-file-alt fa-4x mb-3 text-muted" />
                <p style={{ color: 'var(--text-primary)' }}>
                  {t('apercu.unavailable', { ext: ext.toUpperCase() })}
                </p>
              </div>
            )}
          </div>

          <div className="modal-footer py-2 d-flex justify-content-between" style={{ borderColor: 'var(--border-color)' }}>
            <small className="text-muted">
              {tableau && (genre === 'tableau' || genre === 'texte') && t('apercu.rows', { count: tableau.lignes.length })}
            </small>
            <div>
              <button ref={fermerRef} type="button" className="btn btn-sm btn-secondary mr-2" onClick={onFermer}>
                {t('common.close')}
              </button>
              {tableau && (genre === 'tableau' || genre === 'texte') && (
                <button type="button" className="btn btn-sm btn-outline-info mr-2"
                  onClick={() => imprimerTableau(apercu.titre || apercu.nomFichier, tableau.entetes, tableau.lignes)}>
                  <i className="fas fa-file-pdf mr-1" />{t('apercu.print_pdf')}
                </button>
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={telecharger}
                disabled={!url && !tableau}>
                <i className="fas fa-download mr-1" />{libelleTelecharger}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApercuDocument
