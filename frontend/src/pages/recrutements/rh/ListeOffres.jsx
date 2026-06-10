import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getOffres, publierOffre, cloturerOffre, mettreEnPauseOffre, deleteOffre,
} from "../../../api/recrutements";

const STATUT_BADGE = {
  BROUILLON: "secondary",
  PUBLIEE:   "success",
  EN_PAUSE:  "warning",
  CLOTUREE:  "danger",
  POURVUE:   "primary",
};

export default function ListeOffres() {
  const [searchParams] = useSearchParams();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState(searchParams.get("statut") || "");

  const charger = (statut = "") => {
    setLoading(true);
    const params = statut ? { statut } : {};
    getOffres(params)
      .then((r) => setOffres(r.data.results ?? r.data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(filtre); }, []);

  const handleFiltre = (s) => { setFiltre(s); charger(s); };

  const handlePublier = async (id) => {
    try {
      const r = await publierOffre(id);
      setOffres((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      toast.success("Offre publiée");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erreur publication");
    }
  };

  const handlePause = async (id) => {
    try {
      const r = await mettreEnPauseOffre(id);
      setOffres((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      toast.success("Offre mise en pause");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleCloturer = async (id) => {
    if (!window.confirm("Clôturer cette offre ?")) return;
    try {
      const r = await cloturerOffre(id);
      setOffres((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      toast.success("Offre clôturée");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Supprimer définitivement cette offre ?")) return;
    try {
      await deleteOffre(id);
      setOffres((prev) => prev.filter((o) => o.id !== id));
      toast.success("Offre supprimée");
    } catch {
      toast.error("Erreur suppression");
    }
  };

  return (
    <RHLayout pageTitle="Offres d'emploi">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group btn-group-sm">
          {["", "BROUILLON", "PUBLIEE", "EN_PAUSE", "CLOTUREE", "POURVUE"].map((s) => (
            <button
              key={s}
              className={`btn ${filtre === s ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => handleFiltre(s)}
            >
              {s || "Toutes"}
            </button>
          ))}
        </div>
        <Link to="/rh/recrutements/offres/nouveau" className="btn btn-primary btn-sm">
          <i className="fas fa-plus mr-1" /> Nouvelle offre
        </Link>
      </div>

      <div
        className="card card-outline"
        style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
      >
        <div className="card-header">
          <h3 className="card-title" style={{ color: "var(--page-title)" }}>
            <i className="fas fa-briefcase mr-2" style={{ color: "var(--acerfi-blue)" }} />
            {offres.length} offre{offres.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : offres.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <i className="fas fa-inbox fa-3x mb-3 d-block" />
              Aucune offre trouvée
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: "0.83rem" }}>
                    <th>Titre</th>
                    <th>Département</th>
                    <th>Type</th>
                    <th>Candidatures</th>
                    <th>Statut</th>
                    <th>Clôture</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offres.map((o) => (
                    <tr key={o.id} style={{ color: "var(--text-primary)" }}>
                      <td>
                        <Link
                          to={`/rh/recrutements/offres/${o.id}`}
                          style={{ color: "var(--acerfi-blue)", fontWeight: 500 }}
                        >
                          {o.titre}
                        </Link>
                        <br />
                        <small style={{ color: "var(--text-muted)" }}>
                          {o.lieu} — {o.nb_postes} poste{o.nb_postes > 1 ? "s" : ""}
                        </small>
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>{o.departement_nom || "—"}</td>
                      <td>
                        <span className="badge badge-info">{o.type_contrat_display || o.type_contrat}</span>
                      </td>
                      <td>
                        <span className="badge badge-warning">{o.nb_candidatures}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[o.statut]}`}>
                          {o.statut_display || o.statut}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {o.date_cloture
                          ? new Date(o.date_cloture).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link
                            to={`/rh/recrutements/offres/${o.id}`}
                            className="btn btn-outline-primary"
                            title="Voir"
                          >
                            <i className="fas fa-eye" />
                          </Link>
                          <Link
                            to={`/rh/recrutements/offres/${o.id}/modifier`}
                            className="btn btn-outline-secondary"
                            title="Modifier"
                          >
                            <i className="fas fa-edit" />
                          </Link>
                          {(o.statut === "BROUILLON" || o.statut === "EN_PAUSE") && (
                            <button
                              className="btn btn-outline-success"
                              title="Publier"
                              onClick={() => handlePublier(o.id)}
                            >
                              <i className="fas fa-bullhorn" />
                            </button>
                          )}
                          {o.statut === "PUBLIEE" && (
                            <button
                              className="btn btn-outline-warning"
                              title="Mettre en pause"
                              onClick={() => handlePause(o.id)}
                            >
                              <i className="fas fa-pause" />
                            </button>
                          )}
                          {o.statut !== "CLOTUREE" && o.statut !== "POURVUE" && (
                            <button
                              className="btn btn-outline-danger"
                              title="Clôturer"
                              onClick={() => handleCloturer(o.id)}
                            >
                              <i className="fas fa-times-circle" />
                            </button>
                          )}
                          <button
                            className="btn btn-outline-danger"
                            title="Supprimer"
                            onClick={() => handleSupprimer(o.id)}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RHLayout>
  );
}
