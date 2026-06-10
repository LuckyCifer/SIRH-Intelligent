export default function EtoilesNote({ note, max = 5, taille = "md", onChange }) {
  const tailles = { sm: "0.9rem", md: "1.2rem", lg: "1.6rem" };
  const style = { fontSize: tailles[taille] || tailles.md, cursor: onChange ? "pointer" : "default" };

  return (
    <span className="etoiles-note" style={{ display: "inline-flex", gap: "2px" }}>
      {Array.from({ length: max }, (_, i) => {
        const remplie = i < Math.round(note || 0);
        return (
          <i
            key={i}
            className={remplie ? "fas fa-star" : "far fa-star"}
            style={{ ...style, color: remplie ? "#f39c12" : "var(--text-muted, #aaa)" }}
            onClick={() => onChange && onChange(i + 1)}
            title={`${i + 1}/${max}`}
          />
        );
      })}
      {note != null && (
        <small style={{ marginLeft: 4, color: "var(--text-muted)", fontSize: "0.8em" }}>
          {Number(note).toFixed(1)}
        </small>
      )}
    </span>
  );
}
