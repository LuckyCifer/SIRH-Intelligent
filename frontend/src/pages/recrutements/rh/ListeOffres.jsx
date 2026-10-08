import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState(searchParams.get("statut") || "");

  const FILTRES = [
    { key: "",          label: t("recrutements.all") },
    { key: "BROUILLON", label: t("recrutements.statut_brouillon") },
    { key: "PUBLIEE",   label: t("recrutements.statut_publiee") },
    { key: "EN_PAUSE",  label: t("recrutements.statut_en_pause") },
    { key: "CLOTUREE",  label: t("recrutements.statut_cloturee") },
    { key: "POURVUE",   label: t("recrutements.statut_pourvue") },
  ];

  const charger = (statut = "") => {
    setLoading(true);
    const params = statut ? { statut } : {};
    getOffres(params)
      .then((r) => setOffres(r.data.results ?? r.data))
      .catch(() => toast.error(t("recrutements.error_load")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(filtre); }, []); // eslint-disable-line

  const handleFiltre = (s) => { setFiltre(s); charger(s); };

  const handlePublier = async (id) => {
    try {
      const r = await publierOffre(id);
      setOffres((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      toast.success(t("recrutements.offer_published"));
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("recrutements.error_publish"));
    }
  };

  const handlePause = async (id) => {
    try {
      const r = await mettreEnPauseOffre(id);
      setOffres((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      toast.success(t("recrutements.offer_paused"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  const handleCloturer = async (id) => {
    if (!window.confirm(t("recrutements.confirm_close"))) return;
    try {
      const r = await cloturerOffre(id);
      setOffres((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      toast.success(t("recrutements.offer_closed"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm(t("recrutements.confirm_delete_offer"))) return;
    try {
      await deleteOffre(id);
      setOffres((prev) => prev.filter((o) => o.id !== id));
      toast.success(t("recrutements.offer_deleted"));
    } catch {
      toast.error(t("recrutements.error_delete"));
    }
  };

  return (
    <RHLayout pageTitle={t("recrutements.page_title")}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group btn-group-sm">
          {FILTRES.map((f) => (
            <button
              key={f.key}
              className={`btn ${filtre === f.key ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => handleFiltre(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link to="/rh/recrutements/offres/nouveau" className="btn btn-primary btn-sm">
          <i className="fas fa-plus mr-1" />{t("recrutements.new_offer")}
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
              {t("recrutements.no_offers")}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: "0.83rem" }}>
                    <th>{t("recrutements.col_title")}</th>
                    <th>{t("recrutements.col_department")}</th>
                    <th>{t("recrutements.col_type")}</th>
                    <th>{t("recrutements.col_applications")}</th>
                    <th>{t("recrutements.col_status")}</th>
                    <th>{t("recrutements.col_closing")}</th>
                    <th>{t("recrutements.col_actions")}</th>
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
                            title={t("common.view")}
                          >
                            <i className="fas fa-eye" />
                          </Link>
                          <Link
                            to={`/rh/recrutements/offres/${o.id}/modifier`}
                            className="btn btn-outline-secondary"
                            title={t("common.edit")}
                          >
                            <i className="fas fa-edit" />
                          </Link>
                          {(o.statut === "BROUILLON" || o.statut === "EN_PAUSE") && (
                            <button
                              className="btn btn-outline-success"
                              title={t("recrutements.btn_publish")}
                              onClick={() => handlePublier(o.id)}
                            >
                              <i className="fas fa-bullhorn" />
                            </button>
                          )}
                          {o.statut === "PUBLIEE" && (
                            <button
                              className="btn btn-outline-warning"
                              title={t("recrutements.btn_pause")}
                              onClick={() => handlePause(o.id)}
                            >
                              <i className="fas fa-pause" />
                            </button>
                          )}
                          {o.statut !== "CLOTUREE" && o.statut !== "POURVUE" && (
                            <button
                              className="btn btn-outline-danger"
                              title={t("recrutements.btn_close")}
                              onClick={() => handleCloturer(o.id)}
                            >
                              <i className="fas fa-times-circle" />
                            </button>
                          )}
                          <button
                            className="btn btn-outline-danger"
                            title={t("common.delete")}
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
