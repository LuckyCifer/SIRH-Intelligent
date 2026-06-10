import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import { getSanctions, getStatsSanctions, notifierSanction, archiverSanction } from "../../../api/sanctions";

const TYPE_LABEL = {
  AVERT_ORAL: "Avert. oral", AVERT_ECRIT: "Avert. écrit",
  BLAME: "Blâme", MISE_GARDE: "Mise en garde",
  MISE_PIED: "Mise à pied", RETROGRADATION: "Rétrogradation",
  LICENCIEMENT: "Licenciement",
};

const GRAVITE_CONFIG = [
  null,
  { label: "Faible", color: "#28a745", icon: "info-circle" },
  { label: "Modérée", color: "#17a2b8", icon: "exclamation-circle" },
  { label: "Significative", color: "#ffc107", icon: "exclamation-triangle" },
  { label: "Grave", color: "#fd7e14", icon: "exclamation-triangle" },
  { label: "Très grave", color: "#dc3545", icon: "times-circle" },
];

const STATUT_BADGE = {
  BROUILLON: "secondary", NOTIFIEE: "warning",
  ACCEPTEE: "success", CONTESTEE: "danger", ARCHIVEE: "light",
};

export default function GestionSanctions() {
  const [sanctions, setSanctions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState(null);

  const charger = () => {
    Promise.all([getSanctions(), getStatsSanctions()])
      .then(([sRes, stRes]) => {
        setSanctions(sRes.data.results ?? sRes.data);
        setStats(stRes.data);
      })
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []);

  const liste = sanctions.filter((s) => {
    const nom = `${s.employe_detail?.first_name} ${s.employe_detail?.last_name}`.toLowerCase();
    if (search && !nom.includes(search.toLowerCase())) return false;
    if (filtreStatut && s.statut !== filtreStatut) return false;
    return true;
  });

  const nbContestees = sanctions.filter((s) => s.statut === "CONTESTEE").length;

  const handleNotifier = async (id) => {
    if (!window.confirm("Notifier l'employé de cette sanction ?")) return;
    setActionId(id);
    try {
      const r = await notifierSanction(id);
      setSanctions((prev) => prev.map((s) => s.id === id ? r.data : s));
      toast.success("Sanction notifiée à l'employé");
    } catch {
      toast.error("Erreur lors de la notification");
    } finally {
      setActionId(null);
    }
  };

  const handleArchiver = async (id) => {
    if (!window.confirm("Archiver cette sanction ?")) return;
    setActionId(id);
    try {
      const r = await archiverSanction(id);
      setSanctions((prev) => prev.map((s) => s.id === id ? r.data : s));
      toast.success("Sanction archivée");
    } catch {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setActionId(null);
    }
  };

  return (
    <RHLayout pageTitle="Gestion des sanctions disciplinaires">
      {/* Alerte contestées */}
      {nbContestees > 0 && (
        <div
          className="alert mb-3 d-flex align-items-center"
          style={{ background: "rgba(220,53,69,0.1)", border: "1px solid #dc3545", borderRadius: 6 }}
        >
          <i className="fas fa-exclamation-triangle mr-2" style={{ color: "#dc3545", fontSize: "1.2rem" }} />
          <span style={{ color: "var(--text-primary)" }}>
            <strong>{nbContestees}</strong> sanction{nbContestees > 1 ? "s" : ""} contestée{nbContestees > 1 ? "s" : ""} — nécessite{nbContestees > 1 ? "nt" : ""} une révision.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="row mb-3">
        {[
          { label: "Total", val: stats?.total ?? "—", icon: "list", color: "#6c757d" },
          { label: "En cours", val: stats?.en_cours ?? "—", icon: "clock", color: "#ffc107" },
          { label: "Contestées", val: stats?.contestees ?? "—", icon: "exclamation-triangle", color: "#dc3545" },
          { label: "Ce mois", val: stats?.ce_mois ?? "—", icon: "calendar", color: "#007bff" },
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

      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Rechercher un employé..."
            style={{ width: 220, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-control form-control-sm"
            style={{ width: 160, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="NOTIFIEE">Notifiée</option>
            <option value="ACCEPTEE">Acceptée</option>
            <option value="CONTESTEE">Contestée</option>
            <option value="ARCHIVEE">Archivée</option>
          </select>
        </div>
        <Link to="/rh/sanctions/nouveau" className="btn btn-danger btn-sm">
          <i className="fas fa-plus mr-1" /> Nouvelle sanction
        </Link>
      </div>

      {/* Tableau */}
      <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : liste.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <i className="fas fa-shield-alt fa-3x mb-3 d-block" />
              Aucune sanction trouvée.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    <th>Employé</th>
                    <th>Type</th>
                    <th>Gravité</th>
                    <th>Motif</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((s) => {
                    const gravite = GRAVITE_CONFIG[s.gravite] || GRAVITE_CONFIG[1];
                    return (
                      <tr
                        key={s.id}
                        style={{
                          color: "var(--text-primary)",
                          background: s.statut === "CONTESTEE" ? "rgba(220,53,69,0.05)" : undefined,
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {s.employe_detail?.first_name} {s.employe_detail?.last_name}
                          </div>
                          <small style={{ color: "var(--text-muted)" }}>
                            {s.employe_detail?.departement_nom || "—"}
                          </small>
                        </td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {TYPE_LABEL[s.type_sanction] || s.type_sanction_display}
                        </td>
                        <td>
                          <span style={{ color: gravite.color, fontSize: "0.82rem", fontWeight: 600 }}>
                            <i className={`fas fa-${gravite.icon} mr-1`} />
                            {gravite.label}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", maxWidth: 200 }}>
                          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {s.motif}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {new Date(s.date_sanction).toLocaleDateString("fr-FR")}
                        </td>
                        <td>
                          <span className={`badge badge-${STATUT_BADGE[s.statut]}`}>
                            {s.statut === "CONTESTEE" && <i className="fas fa-exclamation-triangle mr-1" />}
                            {s.statut_display}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            {s.statut === "BROUILLON" && (
                              <>
                                <Link
                                  to={`/rh/sanctions/${s.id}/modifier`}
                                  className="btn btn-xs btn-outline-warning"
                                  title="Modifier"
                                >
                                  <i className="fas fa-edit" />
                                </Link>
                                <button
                                  className="btn btn-xs btn-outline-primary"
                                  title="Notifier l'employé"
                                  onClick={() => handleNotifier(s.id)}
                                  disabled={actionId === s.id}
                                >
                                  <i className="fas fa-bell" />
                                </button>
                              </>
                            )}
                            {(s.statut === "ACCEPTEE" || s.statut === "NOTIFIEE") && (
                              <button
                                className="btn btn-xs btn-outline-secondary"
                                title="Archiver"
                                onClick={() => handleArchiver(s.id)}
                                disabled={actionId === s.id}
                              >
                                <i className="fas fa-archive" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RHLayout>
  );
}
