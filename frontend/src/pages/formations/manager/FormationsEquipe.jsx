import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ManagerLayout from "../../../components/layout/ManagerLayout";
import { getInscriptions, getFormations } from "../../../api/formations";

const STATUT_BADGE = {
  EN_ATTENTE: "warning", INSCRIT: "primary", PRESENT: "success", ABSENT: "danger", ANNULE: "secondary",
};

export default function FormationsEquipe() {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");

  useEffect(() => {
    getInscriptions()
      .then((r) => setInscriptions(r.data.results ?? r.data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  }, []);

  const liste = inscriptions.filter((i) => {
    const nom = `${i.employe_detail?.first_name} ${i.employe_detail?.last_name}`.toLowerCase();
    const titre = (i.formation_detail?.titre || "").toLowerCase();
    if (search && !nom.includes(search.toLowerCase()) && !titre.includes(search.toLowerCase())) return false;
    if (filtreStatut && i.statut !== filtreStatut) return false;
    return true;
  });

  const stats = {
    total: inscriptions.length,
    enAttente: inscriptions.filter((i) => i.statut === "EN_ATTENTE").length,
    inscrits: inscriptions.filter((i) => i.statut === "INSCRIT").length,
    presents: inscriptions.filter((i) => i.statut === "PRESENT").length,
  };

  return (
    <ManagerLayout pageTitle="Formations de l'équipe">
      {/* Stats */}
      <div className="row mb-3">
        {[
          { label: "Total inscriptions", val: stats.total, icon: "list", color: "#0077B6" },
          { label: "En attente", val: stats.enAttente, icon: "clock", color: "#ffc107" },
          { label: "Inscrits confirmés", val: stats.inscrits, icon: "check-circle", color: "#17a2b8" },
          { label: "Présents", val: stats.presents, icon: "user-check", color: "#28a745" },
        ].map((s) => (
          <div key={s.label} className="col-md-3 col-sm-6 mb-2">
            <div className="card" style={{ background: "var(--card-bg)", border: `1px solid var(--border-color)`, borderLeft: `4px solid ${s.color}` }}>
              <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--page-title)" }}>{s.val}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.label}</div>
                </div>
                <i className={`fas fa-${s.icon} fa-lg`} style={{ color: s.color, opacity: 0.7 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="card mb-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
        <div className="card-body py-2">
          <div className="row">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Rechercher par employé ou formation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-control form-control-sm"
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              >
                <option value="">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="INSCRIT">Inscrit</option>
                <option value="PRESENT">Présent</option>
                <option value="ABSENT">Absent</option>
                <option value="ANNULE">Annulé</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
        <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
          <h5 style={{ color: "var(--page-title)", margin: 0 }}>
            <i className="fas fa-list mr-2" style={{ color: "var(--acerfi-blue)" }} />
            Inscriptions ({liste.length})
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : liste.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <i className="fas fa-graduation-cap fa-3x mb-3 d-block" />
              Aucune inscription trouvée.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ background: "var(--card-bg)", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    <th>Employé</th>
                    <th>Formation</th>
                    <th>Date</th>
                    <th>Durée</th>
                    <th>Statut</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((i) => (
                    <tr key={i.id} style={{ color: "var(--text-primary)" }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {i.employe_detail?.first_name} {i.employe_detail?.last_name}
                        </div>
                        <small style={{ color: "var(--text-muted)" }}>{i.employe_detail?.email}</small>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{i.formation_detail?.titre}</div>
                        <small style={{ color: "var(--text-muted)" }}>
                          {i.formation_detail?.categorie_detail?.nom}
                        </small>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {i.formation_detail?.date_debut
                          ? new Date(i.formation_detail.date_debut).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{i.formation_detail?.duree_heures}h</td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[i.statut]}`}>
                          {i.statut_display}
                        </span>
                      </td>
                      <td>
                        {i.note_formation ? (
                          <span style={{ color: "#ffc107" }}>
                            {"★".repeat(i.note_formation)}{"☆".repeat(5 - i.note_formation)}
                          </span>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}
