import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../components/layout/RHLayout'
import { telechargerTemplate, analyserFichier, confirmerImport } from '../../api/importPaie'

function StepBadge({ n, active, done }) {
  const bg = done ? '#28a745' : active ? 'var(--acerfi-blue)' : '#adb5bd'
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 14, flexShrink: 0,
      transition: 'background 0.3s',
    }}>
      {done ? <i className="fas fa-check" /> : n}
    </div>
  )
}

export default function ImportPaiePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'

  const MOIS_LABELS = [
    '',
    t('common.months.1'),  t('common.months.2'),  t('common.months.3'),
    t('common.months.4'),  t('common.months.5'),  t('common.months.6'),
    t('common.months.7'),  t('common.months.8'),  t('common.months.9'),
    t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ]

  function numFr(n) {
    return Number(n).toLocaleString(locale)
  }

  const today = new Date()
  const [mois,       setMois]       = useState(today.getMonth() + 1)
  const [annee,      setAnnee]      = useState(today.getFullYear())
  const [fichier,    setFichier]    = useState(null)
  const [dragging,   setDragging]   = useState(false)
  const [analysing,  setAnalysing]  = useState(false)
  const [preview,    setPreview]    = useState(null)
  const [showModal,  setShowModal]  = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleDownload() {
    try {
      const r = await telechargerTemplate()
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_paie.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(t('importPaie.dl_success'))
    } catch {
      toast.error(t('importPaie.dl_error'))
    }
  }

  function selectFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error(t('importPaie.invalid_format'))
      return
    }
    setFichier(file)
    setPreview(null)
  }

  function onDragOver(e)  { e.preventDefault(); setDragging(true) }
  function onDragLeave()  { setDragging(false) }
  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    selectFile(e.dataTransfer.files[0])
  }

  async function handleAnalyse() {
    if (!fichier) { toast.error(t('importPaie.no_file_error')); return }
    setAnalysing(true)
    setPreview(null)
    try {
      const r = await analyserFichier(fichier, mois, annee)
      setPreview(r.data)
      const nb = r.data.succes?.length || 0
      const ne = r.data.erreurs?.length || 0
      if (nb === 0 && ne > 0) {
        toast.error(t('importPaie.analyse_no_valid', { ne }))
      } else {
        toast.success(
          t('importPaie.valid_count', { count: nb }) +
          (ne ? `, ${t('importPaie.error_count', { count: ne })}` : '')
        )
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t('importPaie.analyse_error_generic'))
    } finally {
      setAnalysing(false)
    }
  }

  async function handleConfirmer() {
    setShowModal(false)
    setConfirming(true)
    try {
      const r = await confirmerImport(preview.succes, mois, annee)
      toast.success(r.data.message)
      navigate('/rh/paie')
    } catch {
      toast.error(t('importPaie.confirm_error'))
    } finally {
      setConfirming(false)
    }
  }

  const nbValides   = preview?.succes?.length  || 0
  const nbErreurs   = preview?.erreurs?.length || 0
  const nbExistants = preview?.succes?.filter(e => e.bulletin_existant).length || 0
  const hasPreview  = preview !== null
  const canConfirm  = nbValides > 0

  const steps = [
    { n: 1, label: t('importPaie.step1_label'), done: false,        active: !fichier },
    { n: 2, label: t('importPaie.step2_label'), done: !!fichier,    active: !!fichier && !hasPreview },
    { n: 3, label: t('importPaie.step3_label'), done: false,        active: hasPreview && canConfirm },
  ]

  return (
    <RHLayout pageTitle={t('importPaie.page_title')}>

      {/* ── Indicateur d'étapes ── */}
      <div className="card card-outline card-primary mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 0 }}>
            {steps.map((step, i, arr) => (
              <div key={i} className="d-flex align-items-center">
                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                  <StepBadge n={step.n} active={step.active} done={step.done} />
                  <span style={{
                    fontWeight: step.active ? 600 : 400,
                    color: step.active ? 'var(--page-title)' : 'var(--text-muted)',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    height: 2, width: 40, background: 'var(--border-color)',
                    margin: '0 12px', flexShrink: 0,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Étape 1 : Modèle ── */}
      <div className="card card-outline card-primary">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-file-excel mr-2" />
            {t('importPaie.step1_title')}
          </h3>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3" style={{ fontSize: 14 }}>
            {t('importPaie.step1_desc')}{' '}
            <strong>{t('importPaie.step1_hint')}</strong>
          </p>
          <button className="btn btn-outline-primary" onClick={handleDownload}>
            <i className="fas fa-download mr-2" />{t('importPaie.dl_btn')}
          </button>
        </div>
      </div>

      {/* ── Étape 2 : Import ── */}
      <div className="card card-outline card-primary">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-upload mr-2" />
            {t('importPaie.step2_title')}
          </h3>
        </div>
        <div className="card-body">

          {/* Sélecteurs mois / année */}
          <div className="form-row mb-4">
            <div className="col-md-3 form-group mb-0">
              <label className="font-weight-bold" style={{ fontSize: 13 }}>
                {t('importPaie.payroll_month')}
              </label>
              <select className="form-control form-control-sm" value={mois}
                onChange={e => { setMois(+e.target.value); setPreview(null) }}>
                {MOIS_LABELS.slice(1).map((l, i) => (
                  <option key={i + 1} value={i + 1}>{l}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 form-group mb-0">
              <label className="font-weight-bold" style={{ fontSize: 13 }}>
                {t('importPaie.year_label')}
              </label>
              <select className="form-control form-control-sm" value={annee}
                onChange={e => { setAnnee(+e.target.value); setPreview(null) }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Zone drag & drop */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--acerfi-blue)' : 'var(--border-color)'}`,
              borderRadius: 8,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(46,116,181,0.06)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <i className="fas fa-cloud-upload-alt fa-2x mb-2 d-block"
              style={{ color: dragging ? 'var(--acerfi-blue)' : 'var(--text-muted)' }} />
            {fichier ? (
              <div>
                <div className="font-weight-bold" style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  <i className="fas fa-file-excel mr-1 text-success" />
                  {fichier.name}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  {(fichier.size / 1024).toFixed(1)} {t('importPaie.file_size_hint')}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                {t('importPaie.drop_hint')}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => selectFile(e.target.files[0])} />

          <div className="mt-3">
            <button className="btn btn-primary" onClick={handleAnalyse}
              disabled={!fichier || analysing}>
              {analysing
                ? <><i className="fas fa-spinner fa-spin mr-1" />{t('importPaie.analysing_btn')}</>
                : <><i className="fas fa-search mr-1" />{t('importPaie.analyse_btn')}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Étape 3 : Prévisualisation ── */}
      {hasPreview && (
        <div className="card card-outline card-primary">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-table mr-2" />
              {t('importPaie.step3_title')} ({MOIS_LABELS[mois]} {annee})
            </h3>
          </div>
          <div className="card-body">

            {/* Résumé compteurs */}
            <div className="d-flex flex-wrap mb-3" style={{ gap: 8 }}>
              <span className="badge p-2" style={{ background: '#28a745', color: '#fff', fontSize: 13 }}>
                <i className="fas fa-check-circle mr-1" />
                {t('importPaie.valid_count', { count: nbValides })}
              </span>
              {nbExistants > 0 && (
                <span className="badge p-2" style={{ background: '#fd7e14', color: '#fff', fontSize: 13 }}>
                  <i className="fas fa-sync-alt mr-1" />
                  {t('importPaie.existing_count', { count: nbExistants })}
                </span>
              )}
              {nbErreurs > 0 && (
                <span className="badge p-2" style={{ background: '#dc3545', color: '#fff', fontSize: 13 }}>
                  <i className="fas fa-times-circle mr-1" />
                  {t('importPaie.error_count', { count: nbErreurs })}
                </span>
              )}
            </div>

            {/* Erreurs détaillées */}
            {nbErreurs > 0 && (
              <div className="alert alert-danger">
                <strong>
                  <i className="fas fa-exclamation-triangle mr-1" />
                  {t('importPaie.errors_title', { count: nbErreurs })}
                </strong>
                <ul className="mb-0 mt-2 pl-3">
                  {preview.erreurs.map((e, i) => (
                    <li key={i} style={{ fontSize: 13 }}>
                      {t('importPaie.line_label')} {e.ligne}
                      {e.identifiant && <> — <code>{e.identifiant}</code></>}
                      {' '}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tableau des données valides */}
            {nbValides > 0 ? (
              <div className="table-responsive">
                {preview.format === 'nouveau' ? (
                  <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>{t('importPaie.col_employee')}</th>
                        <th>{t('importPaie.col_cat_ech')}</th>
                        <th className="text-right">{t('importPaie.col_sal_cat')}</th>
                        <th className="text-right">{t('importPaie.col_transport')}</th>
                        <th className="text-right">{t('importPaie.col_total_brut')}</th>
                        <th className="text-right text-danger">{t('importPaie.col_cnps')}</th>
                        <th className="text-right text-danger">{t('importPaie.col_irpp')}</th>
                        <th className="text-right text-danger">{t('importPaie.col_cac')}</th>
                        <th className="text-right text-success font-weight-bold">{t('importPaie.col_net')}</th>
                        <th className="text-center">{t('importPaie.col_status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.succes.map((e, i) => (
                        <tr key={i} style={{
                          background: e.bulletin_existant
                            ? 'rgba(253, 126, 20, 0.06)'
                            : 'rgba(40, 167, 69, 0.04)',
                        }}>
                          <td className="font-weight-bold">{e.nom_complet}</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {e.categorie_pro || '—'}{e.echelon ? `/${e.echelon}` : ''}
                          </td>
                          <td className="text-right">{numFr(e.salaire_categoriel)}</td>
                          <td className="text-right">{numFr(e.indemnite_transport)}</td>
                          <td className="text-right font-weight-bold">{numFr(e.total_brut)}</td>
                          <td className="text-right text-danger">{numFr(e.cnps_calcule)}</td>
                          <td className="text-right text-danger">{numFr(e.irpp_calcule)}</td>
                          <td className="text-right text-danger">{numFr(e.cac_calcule)}</td>
                          <td className="text-right font-weight-bold text-success">{numFr(e.salaire_net)}</td>
                          <td className="text-center">
                            {e.bulletin_existant
                              ? <span className="badge badge-warning">{t('importPaie.badge_update')}</span>
                              : <span className="badge badge-success">{t('importPaie.badge_new')}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>{t('importPaie.col_employee')}</th>
                        <th>{t('importPaie.col_identifier')}</th>
                        <th className="text-right">{t('importPaie.col_sal_base')}</th>
                        <th className="text-right">{t('importPaie.col_primes')}</th>
                        <th className="text-right">{t('importPaie.col_indemnites')}</th>
                        <th className="text-right text-danger">{t('importPaie.col_cnps')}</th>
                        <th className="text-right text-danger">{t('importPaie.col_irpp')}</th>
                        <th className="text-right text-success">{t('importPaie.col_net')}</th>
                        <th className="text-center">{t('importPaie.col_status')}</th>
                        <th>{t('importPaie.col_note_rh')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.succes.map((e, i) => (
                        <tr key={i} style={{
                          background: e.bulletin_existant
                            ? 'rgba(253, 126, 20, 0.06)'
                            : 'rgba(40, 167, 69, 0.04)',
                        }}>
                          <td className="font-weight-bold">{e.nom_complet}</td>
                          <td><code>{e.identifiant}</code></td>
                          <td className="text-right">{numFr(e.salaire_base)}</td>
                          <td className="text-right">{numFr(e.primes)}</td>
                          <td className="text-right">{numFr(e.indemnites)}</td>
                          <td className="text-right text-danger">{numFr(e.cnps_calcule)}</td>
                          <td className="text-right text-danger">{numFr(e.irpp_calcule)}</td>
                          <td className="text-right font-weight-bold text-success">{numFr(e.salaire_net)}</td>
                          <td className="text-center">
                            {e.bulletin_existant
                              ? <span className="badge badge-warning">{t('importPaie.badge_update')}</span>
                              : <span className="badge badge-success">{t('importPaie.badge_new')}</span>
                            }
                          </td>
                          <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {e.note_rh || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="alert alert-warning mb-0">
                <i className="fas fa-inbox mr-1" />
                {t('importPaie.no_valid_alert')}
              </div>
            )}

            {canConfirm && (
              <div className="mt-3">
                <button className="btn btn-success" onClick={() => setShowModal(true)} disabled={confirming}>
                  <i className="fas fa-file-import mr-1" />
                  {t('importPaie.confirm_import_btn', { count: nbValides })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modale de confirmation ── */}
      {showModal && (
        <>
          <div className="modal fade show d-block" role="dialog">
            <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header" style={{ background: 'var(--acerfi-dark)', color: '#fff' }}>
                  <h5 className="modal-title">
                    <i className="fas fa-file-import mr-2" />{t('importPaie.modal_title')}
                  </h5>
                  <button type="button" className="close text-white" onClick={() => setShowModal(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p style={{ fontSize: 14 }}>
                    {t('importPaie.modal_intro', { count: nbValides, month: MOIS_LABELS[mois], year: annee })}
                  </p>
                  {nbExistants > 0 && (
                    <div className="alert alert-warning">
                      <i className="fas fa-sync-alt mr-1" />
                      {t('importPaie.modal_existing_warn', { count: nbExistants })}
                    </div>
                  )}
                  {nbErreurs > 0 && (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle mr-1" />
                      {t('importPaie.modal_error_info', { count: nbErreurs })}
                    </div>
                  )}
                  <div className="alert alert-danger mb-0">
                    <i className="fas fa-lock mr-1" />
                    <strong>{t('importPaie.modal_danger')}</strong>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    {t('importPaie.cancel_btn')}
                  </button>
                  <button className="btn btn-success" onClick={handleConfirmer} disabled={confirming}>
                    <i className="fas fa-check mr-1" />{t('importPaie.confirm_btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} />
        </>
      )}

    </RHLayout>
  )
}
