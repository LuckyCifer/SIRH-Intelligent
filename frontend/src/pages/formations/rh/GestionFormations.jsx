import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { getFormations, getStatsFormations, deleteFormation, terminerFormation } from "../../../api/formations";

const STATUT_BADGE = {
  PLANIFIEE: "info", EN_COURS: "primary", TERMINEE: "success", ANNULEE: "secondary",
};

export default function GestionFormations() {
  const { t } = useTranslation();
  const [formations,   setFormations]   = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [actionId,     setActionId]     = useState(null);

  const MODALITE_LABEL = {
    PRESENTIEL: t("formations.modality_presentiel"),
    DISTANCIEL: t("formations.modality_distanciel"),
    HYBRIDE:    t("formations.modality_hybride"),
    ELEARNING:  t("formations.modality_elearning"),
  };

  const charger = () => {
    Promise.all([getFormations(), getStatsFormations()])
      .then(([fRes, sRes]) => {
        setFormations(fRes.data.results ?? fRes.data);
        setStats(sRes.data);
      })
      .catch(() => toast.error(t("formations.load_error")))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []); // eslint-disable-line

  const liste = formations.filter((f) => {
    if (search && !f.titre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtreStatut && f.statut !== filtreStatut) return false;
    return true;
  });

  const handleTerminer = async (id) => {
    if (!window.confirm(t("formations.finish_confirm"))) return;
    setActionId(id);
    try {
      await terminerFormation(id);
      setFormations((prev) => prev.map((f) => f.id === id ? { ...f, statut: "TERMINEE" } : f));
      toast.success(t("formations.finish_success"));
    } catch {
      toast.error(t("formations.finish_error"));
    } finally {
      setActionId(null);
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm(t("formations.delete_confirm"))) return;
    setActionId(id);
    try {
      await deleteFormation(id);
      setFormations((prev) => prev.filter((f) => f.id !== id));
      toast.success(t("formations.delete_success"));
    } catch {
      toast.error(t("formations.delete_error"));
    } finally {
      setActionId(null);
    }
  };

  return (
    <RHLayout pageTitle={t("formations.title")}>
      <div className="row mb-3">
        {[
          { label: t("formations.stat_planned"),       val: stats?.formations_planifiees ?? "—", icon: "calendar",    color: "#17a2b8" },
          { label: t("formations.stat_in_progress"),   val: stats?.formations_en_cours   ?? "—", icon: "play-circle", color: "#007bff" },
          { label: t("formations.stat_presence_rate"), val: stats?.taux_presence != null ? `${stats.taux_presence}%` : "—", icon: "chart-bar", color: "#28a745" },
          { label: t("formations.stat_total_cost"),    val: stats?.cout_total != null ? `${Number(stats.cout_total).toLocaleString("fr-FR")} FCFA` : "—", icon: "coins", color: "#E76F51" },
        ].map((s) => (
          <div key={s.label} className="col-lg-3 col-md-6 mb-2">
            <div className="card" style={{ background: "var(--card-bg)", border: `1px solid var(--border-color)`, borderLeft: `4px solid ${s.color}` }}>
              <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--page-title)" }}>{s.val}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.label}</div>
                </div>
                <i className={`fas fa-${s.icon} fa-lg`} style={{ color: s.color, opacity: 0.7 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex gap-2 flex-wrap">
          <input type="text" className="form-control form-control-sm"
            placeholder={t("formations.search_placeholder")}
            style={{ width: 220, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-control form-control-sm"
            style={{ width: 160, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            <option value="">{t("formations.all_statuses")}</option>
            <option value="PLANIFIEE">{t("formations.planned_label")}</option>
            <option value="EN_COURS">{t("formations.in_progress_label")}</option>
            <option value="TERMINEE">{t("formations.finished_label")}</option>
            <option value="ANNULEE">{t("formations.cancelled_label")}</option>
          </select>
        </div>
        <Link to="/rh/formations/nouveau" className="btn btn-primary btn-sm">
          <i className="fas fa-plus mr-1" /> {t("formations.new_formation")}
        </Link>
      </div>

      <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : liste.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <i className="fas fa-graduation-cap fa-3x mb-3 d-block" />
              {t("formations.no_formations")}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ background: "var(--card-bg)", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    <th>{t("formations.col_formation")}</th>
                    <th>{t("formations.category")}</th>
                    <th>{t("formations.col_date")}</th>
                    <th>{t("formations.modality")}</th>
                    <th>{t("formations.places")}</th>
                    <th>{t("formations.col_status")}</th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((f) => (
                    <tr key={f.id} style={{ color: "var(--text-primary)" }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{f.titre}</div>
                        {f.formateur && (
                          <small style={{ color: "var(--text-muted)" }}>
                            <i className="fas fa-chalkboard-teacher mr-1" />{f.formateur}
                          </small>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: f.categorie_detail?.couleur }}>
                          <i className={`${f.categorie_detail?.icone} mr-1`} />
                          {f.categorie_detail?.nom}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {f.date_debut ? new Date(f.date_debut).toLocaleDateString("fr-FR") : "—"}
                        {f.date_fin && <><br /><small style={{ color: "var(--text-muted)" }}>{new Date(f.date_fin).toLocaleDateString("fr-FR")}</small></>}
                      </td>
                      <td>
                        <small>{MODALITE_LABEL[f.modalite] || f.modalite}</small>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.82rem" }}>{f.nb_inscrits}/{f.places_max}</div>
                        <div className="progress" style={{ height: 4, width: 60 }}>
                          <div className={`progress-bar ${f.places_restantes <= 0 ? "bg-danger" : "bg-success"}`}
                            style={{ width: `${Math.min(100, (f.nb_inscrits / f.places_max) * 100)}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[f.statut]}`}>{f.statut_display}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Link to={`/rh/formations/${f.id}`}
                            className="btn btn-xs btn-outline-info"
                            title={t("common.view")}>
                            <i className="fas fa-eye" />
                          </Link>
                          {f.statut !== "TERMINEE" && f.statut !== "ANNULEE" && (
                            <Link to={`/rh/formations/${f.id}/modifier`}
                              className="btn btn-xs btn-outline-warning"
                              title={t("common.edit")}>
                              <i className="fas fa-edit" />
                            </Link>
                          )}
                          {f.statut === "EN_COURS" && (
                            <button className="btn btn-xs btn-outline-success"
                              title={t("formations.finish_btn")}
                              onClick={() => handleTerminer(f.id)}
                              disabled={actionId === f.id}>
                              <i className="fas fa-check" />
                            </button>
                          )}
                          {(f.statut === "PLANIFIEE" || f.statut === "ANNULEE") && (
                            <button className="btn btn-xs btn-outline-danger"
                              title={t("common.delete")}
                              onClick={() => handleSupprimer(f.id)}
                              disabled={actionId === f.id}>
                              <i className="fas fa-trash" />
                            </button>
                          )}
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
