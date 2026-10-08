import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { getEntretiens } from "../../../api/recrutements";

const TYPE_BADGE = {
  RH: "primary", TECHNIQUE: "info", DIRECTION: "warning", TELEPHONIQUE: "secondary",
};

const RESULTAT_BADGE = {
  EN_ATTENTE: "secondary", POSITIF: "success", NEGATIF: "danger", A_REVOIR: "warning",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function PlanningEntretiens() {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois] = useState(today.getMonth());
  const [entretiens, setEntretiens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const locale = i18n.language === "en" ? "en-US" : "fr-FR";

  const MOIS_NOM = new Date(annee, mois, 1).toLocaleString(locale, { month: "long" });
  const MOIS_NOM_CAP = MOIS_NOM.charAt(0).toUpperCase() + MOIS_NOM.slice(1);

  const JOURS_SEMAINE = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i);
    const abbr = d.toLocaleString(locale, { weekday: "short" });
    return abbr.charAt(0).toUpperCase() + abbr.slice(1, 3);
  });

  useEffect(() => {
    setLoading(true);
    getEntretiens()
      .then((r) => setEntretiens(r.data.results ?? r.data))
      .catch(() => toast.error(t("recrutements.error_load")))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const moisPrecedent = () => {
    if (mois === 0) { setAnnee((y) => y - 1); setMois(11); }
    else setMois((m) => m - 1);
    setSelected(null);
  };

  const moisSuivant = () => {
    if (mois === 11) { setAnnee((y) => y + 1); setMois(0); }
    else setMois((m) => m + 1);
    setSelected(null);
  };

  const jours = getDaysInMonth(annee, mois);
  const premierJour = getFirstDayOfMonth(annee, mois);

  const entretiensDuJour = (jour) => {
    const dateStr = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
    return entretiens.filter((e) => e.date_heure?.startsWith(dateStr));
  };

  return (
    <RHLayout pageTitle={t("recrutements.planning_page_title")}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={moisPrecedent}>
            <i className="fas fa-chevron-left" />
          </button>
          <h5 className="mb-0" style={{ color: "var(--page-title)", minWidth: 180, textAlign: "center" }}>
            {MOIS_NOM_CAP} {annee}
          </h5>
          <button className="btn btn-outline-secondary btn-sm" onClick={moisSuivant}>
            <i className="fas fa-chevron-right" />
          </button>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => { setAnnee(today.getFullYear()); setMois(today.getMonth()); }}
          >
            {t("recrutements.today_btn")}
          </button>
        </div>
        <div>
          <span className="badge badge-info mr-1">
            {t('recrutements.n_interviews_total', { count: entretiens.length })}
          </span>
          <span className="badge badge-success">
            {entretiens.filter((e) => new Date(e.date_heure) >= today).length} {t('recrutements.n_upcoming')}
          </span>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-body p-2">
              {loading ? (
                <div className="text-center py-5">
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {JOURS_SEMAINE.map((j) => (
                        <th key={j} style={{
                          textAlign: "center", padding: "6px 2px",
                          color: "var(--text-muted)", fontSize: "0.8rem",
                          borderBottom: "1px solid var(--border-color)",
                        }}>
                          {j}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil((jours + premierJour) / 7) }).map((_, semaine) => (
                      <tr key={semaine}>
                        {Array.from({ length: 7 }).map((_, col) => {
                          const jourIdx = semaine * 7 + col - premierJour + 1;
                          const valide = jourIdx >= 1 && jourIdx <= jours;
                          const evtsJour = valide ? entretiensDuJour(jourIdx) : [];
                          const isToday =
                            valide &&
                            jourIdx === today.getDate() &&
                            mois === today.getMonth() &&
                            annee === today.getFullYear();
                          const isSelected = selected === jourIdx;

                          return (
                            <td
                              key={col}
                              onClick={() => valide && setSelected(jourIdx === selected ? null : jourIdx)}
                              style={{
                                width: "14.28%", minHeight: 70, verticalAlign: "top",
                                padding: "4px", border: "1px solid var(--border-color)",
                                background: isSelected ? "var(--acerfi-blue)10" : "transparent",
                                cursor: valide ? "pointer" : "default",
                              }}
                            >
                              {valide && (
                                <>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: "50%",
                                    background: isToday ? "var(--acerfi-blue)" : "transparent",
                                    color: isToday ? "#fff" : "var(--text-primary)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "0.8rem", fontWeight: isToday ? 700 : 400, marginBottom: 2,
                                  }}>
                                    {jourIdx}
                                  </div>
                                  {evtsJour.slice(0, 2).map((e) => (
                                    <div
                                      key={e.id}
                                      className={`badge badge-${TYPE_BADGE[e.type_entretien] || "secondary"}`}
                                      style={{ fontSize: "0.67rem", display: "block", marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
                                      title={e.candidature_detail?.nom_complet}
                                    >
                                      {new Date(e.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                      {" "}{e.candidature_detail?.nom_complet?.split(" ")[0]}
                                    </div>
                                  ))}
                                  {evtsJour.length > 2 && (
                                    <small style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                                      +{evtsJour.length - 2}
                                    </small>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                {selected
                  ? `${selected} ${MOIS_NOM_CAP} ${annee}`
                  : t("recrutements.select_day")}
              </h3>
            </div>
            <div className="card-body">
              {!selected ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  {t("recrutements.click_day_hint")}
                </p>
              ) : entretiensDuJour(selected).length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  {t("recrutements.no_interviews_day")}
                </p>
              ) : (
                entretiensDuJour(selected).map((e) => (
                  <div key={e.id} className="mb-3 p-2" style={{
                    background: "var(--input-bg, var(--card-bg))",
                    border: "1px solid var(--border-color)", borderRadius: 6,
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className={`badge badge-${TYPE_BADGE[e.type_entretien] || "secondary"}`}>
                        {e.type_display}
                      </span>
                      <span className={`badge badge-${RESULTAT_BADGE[e.resultat] || "secondary"}`}>
                        {e.resultat_display}
                      </span>
                    </div>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.88rem" }}>
                      {e.candidature_detail?.nom_complet}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {e.candidature_detail?.offre_titre}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      <i className="fas fa-clock mr-1" />
                      {new Date(e.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {" — "}{e.duree_minutes} min
                    </div>
                    {e.lieu && (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        <i className="fas fa-map-marker-alt mr-1" />{e.lieu}
                      </div>
                    )}
                    {e.intervieweur_detail?.nom_complet && (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        <i className="fas fa-user-tie mr-1" />{e.intervieweur_detail.nom_complet}
                      </div>
                    )}
                    <Link
                      to={`/rh/recrutements/candidatures/${e.candidature_detail?.id}`}
                      className="btn btn-xs btn-outline-primary mt-1"
                    >
                      <i className="fas fa-eye mr-1" />{t("recrutements.application_file")}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </RHLayout>
  );
}
