import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RHLayout from '../../components/layout/RHLayout'
import { genererRapport, getStatutGeneration } from '../../api/rapportIA'

export default function GenerateurRapport() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const today = new Date()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'

  const MESSAGES_GENERATION = [
    t('rapport_ia_gen.msg_presences'),
    t('rapport_ia_gen.msg_conges'),
    t('rapport_ia_gen.msg_objectifs'),
    t('rapport_ia_gen.msg_formations'),
    t('rapport_ia_gen.msg_recrutements'),
    t('rapport_ia_gen.msg_paie'),
    t('rapport_ia_gen.msg_sanctions'),
    t('rapport_ia_gen.msg_ia'),
    t('rapport_ia_gen.msg_generating'),
    t('rapport_ia_gen.msg_finalizing'),
  ]

  const MOIS_NOMS = Array.from({ length: 12 }, (_, i) => {
    const nom = new Date(2024, i, 1).toLocaleString(locale, { month: 'long' })
    return nom.charAt(0).toUpperCase() + nom.slice(1)
  })

  const [mois,         setMois]         = useState(today.getMonth() + 1)
  const [annee,        setAnnee]        = useState(today.getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)
  const [rapportId,    setRapportId]    = useState(null)
  const [msgIndex,     setMsgIndex]     = useState(0)
  const [erreur,       setErreur]       = useState(null)

  const intervalRef    = useRef(null)
  const msgIntervalRef = useRef(null)

  useEffect(() => {
    if (!rapportId) return

    msgIntervalRef.current = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES_GENERATION.length)
    }, 2500)

    intervalRef.current = setInterval(async () => {
      try {
        const res = await getStatutGeneration(rapportId)
        const { statut, message_erreur } = res.data
        if (statut === 'GENERE') {
          clearInterval(intervalRef.current)
          clearInterval(msgIntervalRef.current)
          toast.success(t('rapport_ia_gen.success'))
          navigate(`/rh/rapport-ia/${rapportId}`)
        } else if (statut === 'ERREUR') {
          clearInterval(intervalRef.current)
          clearInterval(msgIntervalRef.current)
          setIsGenerating(false)
          setErreur(message_erreur || t('rapport_ia_gen.error_launch'))
        }
      } catch {
        // polling silencieux
      }
    }, 3000)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(msgIntervalRef.current)
    }
  }, [rapportId, navigate]) // eslint-disable-line

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur(null)
    setIsGenerating(true)
    setMsgIndex(0)
    try {
      const res = await genererRapport({ mois, annee, type_rapport: 'GLOBAL' })
      setRapportId(res.data.id)
    } catch (err) {
      setIsGenerating(false)
      const msg = err.response?.data?.detail || t('rapport_ia_gen.error_launch')
      setErreur(msg)
    }
  }

  const annees = []
  for (let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) annees.push(y)

  return (
    <RHLayout pageTitle={t('rapport_ia_gen.page_title')}>

      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8">

          {isGenerating ? (
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="mb-4">
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto',
                    background: 'rgba(46,116,181,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="fas fa-robot fa-2x" style={{ color: 'var(--acerfi-blue)' }} />
                  </div>
                </div>

                <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {t('rapport_ia_gen.generating_title')}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {MESSAGES_GENERATION[msgIndex]}
                </p>

                <div className="progress mt-3" style={{ height: 6, borderRadius: 3 }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    style={{ width: '100%', background: 'var(--acerfi-blue)' }}
                  />
                </div>

                <p className="mt-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('rapport_ia_gen.generating_hint')}
                </p>
              </div>
            </div>
          ) : (
            <div className="card card-outline card-primary">
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
                  <i className="fas fa-robot mr-2" style={{ color: 'var(--acerfi-blue)' }} />
                  {t('rapport_ia_gen.report_params')}
                </h3>
              </div>
              <div className="card-body">

                {erreur && (
                  <div className="alert alert-danger">
                    <i className="fas fa-exclamation-circle mr-2" />
                    {erreur}
                  </div>
                )}

                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  <i className="fas fa-info-circle mr-2" />
                  {t('rapport_ia_gen.report_info')}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group col-6">
                      <label className="font-weight-bold" style={{ color: 'var(--text-primary)' }}>
                        {t('rapport_ia_gen.month_label')} <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={mois}
                        onChange={e => setMois(Number(e.target.value))}
                      >
                        {MOIS_NOMS.map((nom, i) => (
                          <option key={i + 1} value={i + 1}>{nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group col-6">
                      <label className="font-weight-bold" style={{ color: 'var(--text-primary)' }}>
                        {t('rapport_ia_gen.year_label')} <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={annee}
                        onChange={e => setAnnee(Number(e.target.value))}
                      >
                        {annees.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="font-weight-bold" style={{ color: 'var(--text-primary)' }}>
                      {t('rapport_ia_gen.report_type_label')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={t('rapport_ia_gen.report_type_value')}
                      disabled
                      style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>
                      {t('rapport_ia_gen.report_type_hint')}
                    </small>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate('/rh/rapport-ia')}
                    >
                      <i className="fas fa-arrow-left mr-1" />{t('rapport_ia_gen.back_btn')}
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-robot mr-1" />
                      {t('rapport_ia_gen.launch_btn')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

    </RHLayout>
  )
}
