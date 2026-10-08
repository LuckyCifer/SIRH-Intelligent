import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getOffre, getCandidatures, changerStatutCandidature, publierOffre, cloturerOffre,
} from "../../../api/recrutements";

const STATUT_SUIVANT = {
  RECUE: "EN_COURS", EN_COURS: "ENTRETIEN_RH",
  ENTRETIEN_RH: "ENTRETIEN_TECH", ENTRETIEN_TECH: "OFFRE_FAITE",
};

const STATUT_BADGE_OFFRE = {
  BROUILLON: "secondary", PUBLIEE: "success", EN_PAUSE: "warning",
  CLOTUREE: "danger", POURVUE: "primary",
};

export default function DetailOffre() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [offre, setOffre] = useState(null);
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const PIPELINE = [
    { statut: "RECUE",          label: t("recrutements.statut_recue"),          badge: "secondary" },
    { statut: "EN_COURS",       label: t("recrutements.statut_en_cours"),        badge: "info" },
    { statut: "ENTRETIEN_RH",   label: t("recrutements.statut_entretien_rh"),    badge: "primary" },
    { statut: "ENTRETIEN_TECH", label: t("recrutements.statut_entretien_tech"),  badge: "primary" },
    { statut: "OFFRE_FAITE",    label: t("recrutements.statut_offre_faite"),     badge: "warning" },
  ];

  useEffect(() => {
    Promise.all([getOffre(id), getCandidatures({ offre_id: id })])
      .then(([oRes, cRes]) => {
        setOffre(oRes.data);
        setCandidatures(cRes.data.results ?? cRes.data);
      })
      .catch(() => toast.error(t("recrutements.error_load")))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const handleAvancer = async (candidature) => {
    const suivant = STATUT_SUIVANT[candidature.statut];
    if (!suivant) return;
    try {
      const r = await changerStatutCandidature(candidature.id, { statut: suivant });
      setCandidatures((prev) => prev.map((c) => (c.id === candidature.id ? r.data : c)));
      toast.success(t("recrutements.status_updated"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  const handleRefuser = async (candidatureId) => {
    try {
      const r = await changerStatutCandidature(candidatureId, { statut: "REFUSEE" });
      setCandidatures((prev) => prev.map((c) => (c.id === candidatureId ? r.data : c)));
      toast.success(t("recrutements.application_refused"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  const handlePublier = async () => {
    try {
      const r = await publierOffre(id);
      setOffre(r.data);
      toast.success(t("recrutements.offer_published"));
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("recrutements.error_publish"));
    }
  };

  const handleCloturer = async () => {
    if (!window.confirm(t("recrutements.confirm_close"))) return;
    try {
      const r = await cloturerOffre(id);
      setOffre(r.data);
      toast.success(t("recrutements.offer_closed"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  if (loading) {
    return (
      <RHLayout pageTitle={t("recrutements.detail_offer_title")}>
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      </RHLayout>
    );
  }

  return (
    <RHLayout pageTitle={offre?.titre || t("recrutements.detail_offer_title")}>
      <div
        className="card card-outline mb-3"
        style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap">
            <div>
              <h4 style={{ color: "var(--page-title)", margin: 0 }}>{offre?.titre}</h4>
              <div className="mt-1">
                <span className="badge badge-info mr-1">{offre?.type_contrat_display}</span>
                <span className="badge badge-secondary mr-1">{offre?.departement_nom || "—"}</span>
                <span className={`badge badge-${STATUT_BADGE_OFFRE[offre?.statut]} mr-1`}>
                  {offre?.statut_display}
                </span>
                <small style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-map-marker-alt mr-1" />{offre?.lieu}
                </small>
              </div>
              {(offre?.salaire_min || offre?.salaire_max) && (
                <small style={{ color: "var(--text-muted)" }} className="mt-1 d-block">
                  <i className="fas fa-dollar-sign mr-1" />
                  {offre?.salaire_min && Number(offre.salaire_min).toLocaleString("fr-FR")}
                  {offre?.salaire_min && offre?.salaire_max && " – "}
                  {offre?.salaire_max && Number(offre.salaire_max).toLocaleString("fr-FR")} FCFA
                </small>
              )}
            </div>
            <div className="d-flex gap-2 mt-2">
              <Link
                to={`/rh/recrutements/offres/${id}/modifier`}
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="fas fa-edit mr-1" />{t("common.edit")}
              </Link>
              {(offre?.statut === "BROUILLON" || offre?.statut === "EN_PAUSE") && (
                <button className="btn btn-success btn-sm" onClick={handlePublier}>
                  <i className="fas fa-bullhorn mr-1" />{t("recrutements.btn_publish")}
                </button>
              )}
              {offre?.statut === "PUBLIEE" && (
                <button className="btn btn-danger btn-sm" onClick={handleCloturer}>
                  <i className="fas fa-times-circle mr-1" />{t("recrutements.btn_close")}
                </button>
              )}
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-6">
              <h6 style={{ color: "var(--text-primary)" }}>{t("recrutements.description")}</h6>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", whiteSpace: "pre-line" }}>
                {offre?.description}
              </p>
            </div>
            <div className="col-md-6">
              <h6 style={{ color: "var(--text-primary)" }}>{t("recrutements.required_skills")}</h6>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", whiteSpace: "pre-line" }}>
                {offre?.competences_requises}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h5 style={{ color: "var(--page-title)" }}>
        <i className="fas fa-columns mr-2" style={{ color: "var(--acerfi-blue)" }} />
        {t("recrutements.pipeline_title")} (
        {candidatures.length === 1
          ? t("recrutements.pipeline_count")
          : t("recrutements.pipeline_count_plural", { count: candidatures.length })}
        )
      </h5>
      <div className="d-flex overflow-auto pb-2" style={{ gap: 12 }}>
        {PIPELINE.map((col) => {
          const colCandidatures = candidatures.filter((c) => c.statut === col.statut);
          return (
            <div
              key={col.statut}
              style={{
                minWidth: 220, flex: "0 0 220px",
                background: "var(--card-bg)", border: "1px solid var(--border-color)",
                borderRadius: 8, padding: "10px 8px",
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className={`badge badge-${col.badge}`} style={{ fontSize: "0.75rem" }}>
                  {col.label}
                </span>
                <span className="badge badge-light"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                  {colCandidatures.length}
                </span>
              </div>
              {colCandidatures.length === 0 && (
                <div className="text-center py-3" style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {t("recrutements.none_kanban")}
                </div>
              )}
              {colCandidatures.map((c) => (
                <div key={c.id} style={{
                  background: "var(--input-bg, var(--card-bg))",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6, padding: "8px 10px", marginBottom: 6,
                }}>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                    {c.nom_complet}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{c.email}</div>
                  {c.score_cv_ia && (
                    <div className="mt-1">
                      <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                        IA: {c.score_cv_ia}/100
                      </span>
                    </div>
                  )}
                  <div className="d-flex mt-1" style={{ gap: 4 }}>
                    <Link
                      to={`/rh/recrutements/candidatures/${c.id}`}
                      className="btn btn-xs btn-outline-primary"
                      style={{ fontSize: "0.72rem" }}
                    >
                      <i className="fas fa-eye" />
                    </Link>
                    {STATUT_SUIVANT[c.statut] && (
                      <button
                        className="btn btn-xs btn-outline-success"
                        style={{ fontSize: "0.72rem" }}
                        onClick={() => handleAvancer(c)}
                      >
                        <i className="fas fa-arrow-right" />
                      </button>
                    )}
                    <button
                      className="btn btn-xs btn-outline-danger"
                      style={{ fontSize: "0.72rem" }}
                      onClick={() => handleRefuser(c.id)}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div style={{
          minWidth: 160, flex: "0 0 160px",
          background: "var(--card-bg)", border: "1px dashed var(--border-color)",
          borderRadius: 8, padding: "10px 8px", opacity: 0.7,
        }}>
          <div className="text-center">
            <span className="badge badge-success d-block mb-1">
              {t("recrutements.accepted_count")} : {candidatures.filter((c) => c.statut === "ACCEPTEE").length}
            </span>
            <span className="badge badge-danger d-block mb-1">
              {t("recrutements.refused_count")} : {candidatures.filter((c) => c.statut === "REFUSEE").length}
            </span>
            <span className="badge badge-dark d-block">
              {t("recrutements.abandoned_count")} : {candidatures.filter((c) => c.statut === "ABANDONNEE").length}
            </span>
          </div>
        </div>
      </div>
    </RHLayout>
  );
}
