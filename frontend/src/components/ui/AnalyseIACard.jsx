import JaugeCirculaire from './JaugeCirculaire'

const ALERTE_CONFIG = {
  AUCUNE:  { cls: 'badge-success', label: 'Aucune alerte',  icon: 'fas fa-check-circle' },
  FAIBLE:  { cls: 'badge-info',    label: 'Alerte faible',  icon: 'fas fa-info-circle' },
  MOYENNE: { cls: 'badge-warning', label: 'Alerte moyenne', icon: 'fas fa-exclamation-circle' },
  ELEVEE:  { cls: 'badge-danger',  label: 'Alerte élevée',  icon: 'fas fa-exclamation-triangle' },
}

const PROGRESSION_CONFIG = {
  FAIBLE:      { cls: 'badge-danger',   color: '#DC3545', label: 'Faible' },
  MOYENNE:     { cls: 'badge-warning',  color: '#FD7E14', label: 'Moyenne' },
  BONNE:       { cls: 'badge-primary',  color: '#2E74B5', label: 'Bonne' },
  EXCELLENTE:  { cls: 'badge-success',  color: '#28A745', label: 'Excellente' },
}

/**
 * Panneau complet d'analyse IA.
 * Props : analyse (objet AnalyseIA sérialisé)
 */
export default function AnalyseIACard({ analyse }) {
  if (!analyse) return null

  const alerteCfg    = ALERTE_CONFIG[analyse.niveau_alerte]     || ALERTE_CONFIG.AUCUNE
  const progressCfg  = PROGRESSION_CONFIG[analyse.progression_estimee] || PROGRESSION_CONFIG.MOYENNE

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header"
        style={{ background: 'linear-gradient(135deg,#1F3864,#2E74B5)', color: '#fff' }}>
        <h3 className="card-title text-white">
          <i className="fas fa-robot mr-2" />
          Analyse IA — Groq llama-3.3-70b-versatile
        </h3>
        <div className="card-tools">
          <span className="badge badge-light text-dark" style={{ fontSize: 11 }}>
            {analyse.date_analyse?.slice(0, 10)}
          </span>
        </div>
      </div>

      <div className="card-body">
        <div className="row">

          {/* Colonne 1 — Jauge + alerte + progression */}
          <div className="col-md-3 text-center border-right mb-3 pb-2">
            <p className="font-weight-bold mb-2" style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
              Score d'engagement
            </p>
            <JaugeCirculaire score={analyse.score_engagement} size="md" />

            <hr style={{ borderColor: 'var(--border-color)' }} />

            {/* Niveau alerte */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Niveau d'alerte
            </p>
            <span className={`badge ${alerteCfg.cls} p-2`} style={{ fontSize: 12 }}>
              <i className={`${alerteCfg.icon} mr-1`} />{alerteCfg.label}
            </span>
            {analyse.motif_alerte && (
              <p className="text-muted mt-2 mb-0" style={{ fontSize: 11 }}>
                {analyse.motif_alerte}
              </p>
            )}

            <hr style={{ borderColor: 'var(--border-color)' }} />

            {/* Progression estimée */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Progression estimée
            </p>
            <span className={`badge ${progressCfg.cls} p-2`} style={{ fontSize: 12 }}>
              <i className="fas fa-chart-line mr-1" />{progressCfg.label}
            </span>
          </div>

          {/* Colonne 2 — Points forts / à améliorer */}
          <div className="col-md-5 mb-3">
            <div className="row">
              <div className="col-6">
                <p className="font-weight-bold mb-2" style={{ color: '#28a745', fontSize: 12 }}>
                  <i className="fas fa-check-circle mr-1" />POINTS FORTS
                </p>
                {analyse.points_forts?.length > 0 ? (
                  <ul className="list-unstyled" style={{ fontSize: 13 }}>
                    {analyse.points_forts.map((p, i) => (
                      <li key={i} className="mb-2">
                        <i className="fas fa-plus-circle text-success mr-1" style={{ fontSize: 11 }} />{p}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted" style={{ fontSize: 13 }}>—</p>}
              </div>
              <div className="col-6">
                <p className="font-weight-bold mb-2" style={{ color: '#fd7e14', fontSize: 12 }}>
                  <i className="fas fa-exclamation-triangle mr-1" />À AMÉLIORER
                </p>
                {analyse.points_amelioration?.length > 0 ? (
                  <ul className="list-unstyled" style={{ fontSize: 13 }}>
                    {analyse.points_amelioration.map((p, i) => (
                      <li key={i} className="mb-2">
                        <i className="fas fa-arrow-right text-warning mr-1" style={{ fontSize: 11 }} />{p}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted" style={{ fontSize: 13 }}>—</p>}
              </div>
            </div>

            {/* Compétences détectées */}
            {analyse.competences_detectees?.length > 0 && (
              <div className="mt-3">
                <p className="font-weight-bold mb-2" style={{ color: '#6f42c1', fontSize: 12 }}>
                  <i className="fas fa-star mr-1" />COMPÉTENCES DÉTECTÉES
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {analyse.competences_detectees.map((c, i) => (
                    <span key={i} style={{
                      background: 'rgba(111,66,193,.12)',
                      color: '#6f42c1',
                      border: '1px solid rgba(111,66,193,.3)',
                      borderRadius: 12,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne 3 — Synthèse + recommandation */}
          <div className="col-md-4 mb-3">
            <div className="mb-3">
              <p className="font-weight-bold mb-1" style={{ color: 'var(--page-title)', fontSize: 12 }}>
                <i className="fas fa-clipboard-list mr-1" />SYNTHÈSE
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {analyse.synthese || <span className="text-muted">Non disponible</span>}
              </p>
            </div>
            <div>
              <p className="font-weight-bold mb-1" style={{ color: '#2E74B5', fontSize: 12 }}>
                <i className="fas fa-lightbulb mr-1" />RECOMMANDATION ENCADREUR
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {analyse.recommandation || <span className="text-muted">Non disponible</span>}
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="text-right mt-1">
          <small className="text-muted">
            <i className="fas fa-microchip mr-1" />
            {analyse.modele_utilise || 'llama-3.3-70b-versatile'}
            {analyse.tokens_utilises > 0 && ` · ${analyse.tokens_utilises} tokens`}
          </small>
        </div>
      </div>
    </div>
  )
}
