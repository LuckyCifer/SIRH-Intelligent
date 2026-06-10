export default function BarreProgression({ valeur = 0, label, couleur, afficherPourcentage = true }) {
  const pct = Math.min(100, Math.max(0, valeur));

  const getCouleur = () => {
    if (couleur) return couleur;
    if (pct >= 80) return "#28a745";
    if (pct >= 50) return "#17a2b8";
    if (pct >= 25) return "#ffc107";
    return "#dc3545";
  };

  return (
    <div style={{ width: "100%" }}>
      {(label || afficherPourcentage) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {label && <span>{label}</span>}
          {afficherPourcentage && <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pct}%</span>}
        </div>
      )}
      <div
        style={{
          background: "var(--card-bg, #e9ecef)",
          borderRadius: 6,
          height: 10,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: getCouleur(),
            borderRadius: 6,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
