const NIVEAUX = {
  Insuffisant: { classe: "danger", icone: "fas fa-arrow-down" },
  "En développement": { classe: "warning", icone: "fas fa-minus" },
  Satisfaisant: { classe: "info", icone: "fas fa-check" },
  "Très bien": { classe: "primary", icone: "fas fa-thumbs-up" },
  Excellent: { classe: "success", icone: "fas fa-star" },
};

export default function NiveauPerformance({ niveau, score, afficherScore = true }) {
  if (!niveau) return <span className="badge badge-secondary">—</span>;

  const config = NIVEAUX[niveau] || { classe: "secondary", icone: "fas fa-question" };

  return (
    <span
      className={`badge badge-${config.classe}`}
      style={{ fontSize: "0.82rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
    >
      <i className={config.icone} />
      {niveau}
      {afficherScore && score != null && (
        <span style={{ marginLeft: 4, opacity: 0.85 }}>({score}/100)</span>
      )}
    </span>
  );
}
