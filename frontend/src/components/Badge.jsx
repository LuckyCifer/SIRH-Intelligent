const STATUT_COLORS = {
  BROUILLON: { bg: '#e9ecef', color: '#6c757d' },
  SOUMIS:    { bg: '#d0e8f7', color: '#1F3864' },
  VALIDE:    { bg: '#d4edda', color: '#155724' },
  REJETE:    { bg: '#f8d7da', color: '#721c24' },
}

const ALERTE_COLORS = {
  AUCUNE:  { bg: '#d4edda', color: '#155724' },
  FAIBLE:  { bg: '#d4edda', color: '#155724' },
  MOYENNE: { bg: '#fff3cd', color: '#856404' },
  ELEVEE:  { bg: '#f8d7da', color: '#721c24' },
}

const LABELS = {
  BROUILLON: 'Brouillon', SOUMIS: 'Soumis', VALIDE: 'Validé', REJETE: 'Rejeté',
  AUCUNE: 'OK', FAIBLE: 'Faible', MOYENNE: 'Moyenne', ELEVEE: 'Élevée',
  ISA: 'ISA', IT: 'IT', GRAPHISME: 'Graphisme', AUTRE: 'Autre',
  PROPOSE: 'Proposé', EN_COURS: 'En cours', LIVRE: 'Livré', SOUTENU: 'Soutenu',
}

export default function Badge({ value, type = 'statut' }) {
  const palette = type === 'alerte' ? ALERTE_COLORS : STATUT_COLORS
  const style = palette[value] || { bg: '#e9ecef', color: '#555' }
  return (
    <span style={{
      background: style.bg, color: style.color,
      borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {LABELS[value] || value}
    </span>
  )
}
