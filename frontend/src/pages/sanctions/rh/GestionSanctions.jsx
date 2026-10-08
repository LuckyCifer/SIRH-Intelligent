import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getSanctions, getStatsSanctions,
  notifierSanction, archiverSanction, notifierIT,
} from "../../../api/sanctions";

const TYPE_BADGE_CLS = {
  AVERTISSEMENT:             "badge-info",
  BLAME:                     "badge-secondary",
  MISE_A_PIED:               "badge-danger",
  LICENCIEMENT_FAUTE_GRAVE:  "badge-dark",
  LICENCIEMENT_FAUTE_LOURDE: "badge-dark",
};

const STATUT_BADGE = {
  BROUILLON: "secondary", NOTIFIEE: "warning",
  ACCEPTEE: "success",    CONTESTEE: "danger", ARCHIVEE: "light",
};

function StatutLegalBadge({ s }) {
  const { t } = useTranslation();
  if (s.type_sanction !== "MISE_A_PIED") {
    return <span className="badge badge-success" style={{ fontSize: 10 }}>{t("sanctions.legal_compliant")}</span>;
  }
  const sl = s.statut_legal;
  if (!sl) return null;
  if (sl.valide) {
    return <span className="badge badge-success" style={{ fontSize: 10 }}>{t("sanctions.legal_compliant")}</span>;
  }
  const titre = sl.avertissements?.join(" | ");
  if (sl.it_notifie && !sl.delai_it_ok) {
    return (
      <span className="badge badge-danger" style={{ fontSize: 10 }} title={titre}>
        <i className="fas fa-times-circle mr-1" />{t("sanctions.legal_noncompliant")}
      </span>
    );
  }
  return (
    <span className="badge badge-warning" style={{ fontSize: 10, color: "#000" }} title={titre}>
      <i className="fas fa-exclamation-circle mr-1" />{t("sanctions.legal_to_regularize")}
    </span>
  );
}

export default function GestionSanctions() {
  const { t } = useTranslation();
  const [sanctions,    setSanctions]    = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("");
  const [search,       setSearch]       = useState("");
  const [actionId,     setActionId]     = useState(null);

  const TYPE_LABEL = {
    AVERTISSEMENT:            t("sanctions.type_avertissement"),
    BLAME:                    t("sanctions.type_blame"),
    MISE_A_PIED:              t("sanctions.type_mise_a_pied"),
    LICENCIEMENT_FAUTE_GRAVE: t("sanctions.type_lic_grave"),
    LICENCIEMENT_FAUTE_LOURDE:t("sanctions.type_lic_lourde"),
  };

  const GRAVITE_CONFIG = [
    null,
    { label: t("sanctions.gravity_low"),        color: "#28a745", icon: "info-circle" },
    { label: t("sanctions.gravity_moderate"),   color: "#17a2b8", icon: "exclamation-circle" },
    { label: t("sanctions.gravity_significant"),color: "#ffc107", icon: "exclamation-triangle" },
    { label: t("sanctions.gravity_serious"),    color: "#fd7e14", icon: "exclamation-triangle" },
    { label: t("sanctions.gravity_very_serious"),color: "#dc3545", icon: "times-circle" },
  ];

  const charger = () => {
    Promise.all([getSanctions(), getStatsSanctions()])
      .then(([sRes, stRes]) => {
        setSanctions(sRes.data.results ?? sRes.data);
        setStats(stRes.data);
      })
      .catch(() => toast.error(t("sanctions.load_error")))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []); // eslint-disable-line

  const liste = sanctions.filter((s) => {
    const nom = `${s.employe_detail?.first_name} ${s.employe_detail?.last_name}`.toLowerCase();
    if (search && !nom.includes(search.toLowerCase())) return false;
    if (filtreStatut && s.statut !== filtreStatut) return false;
    return true;
  });

  const nbContestees  = sanctions.filter((s) => s.statut === "CONTESTEE").length;
  const nbRegulariser = stats?.a_regulariser ?? 0;

  const handleNotifier = async (id) => {
    if (!window.confirm(t("sanctions.notify_employee_confirm"))) return;
    setActionId(id);
    try {
      const r = await notifierSanction(id);
      setSanctions((prev) => prev.map((s) => s.id === id ? r.data : s));
      toast.success(t("sanctions.notify_employee_success"));
    } catch { toast.error(t("sanctions.notify_employee_error")); }
    finally  { setActionId(null); }
  };

  const handleArchiver = async (id) => {
    if (!window.confirm(t("sanctions.archive_confirm"))) return;
    setActionId(id);
    try {
      const r = await archiverSanction(id);
      setSanctions((prev) => prev.map((s) => s.id === id ? r.data : s));
      toast.success(t("sanctions.archive_success"));
    } catch { toast.error(t("sanctions.archive_error")); }
    finally  { setActionId(null); }
  };

  const handleNotifierIT = async (id) => {
    if (!window.confirm(t("sanctions.notify_it_confirm"))) return;
    setActionId(id);
    try {
      const r = await notifierIT(id);
      setSanctions((prev) => prev.map((s) => s.id === id ? r.data.sanction : s));
      if (r.data.dans_les_delais) {
        toast.success(r.data.message);
      } else {
        toast.error(r.data.message, { duration: 6000 });
      }
      charger();
    } catch (err) {
      toast.error(err.response?.data?.error || t("sanctions.notify_it_error"));
    } finally { setActionId(null); }
  };

  return (
    <RHLayout pageTitle={t("sanctions.title")}>
      {nbRegulariser > 0 && (
        <div className="alert mb-3 d-flex align-items-center justify-content-between"
          style={{ background: "rgba(255,193,7,0.12)", border: "1px solid #ffc107", borderRadius: 6 }}>
          <div>
            <i className="fas fa-exclamation-circle mr-2" style={{ color: "#e0a800" }} />
            <strong style={{ color: "var(--text-primary)" }}>
              {nbRegulariser} {t("sanctions.type_mise_a_pied").toLowerCase()}
              {nbRegulariser > 1 ? "s" : ""} — {t("sanctions.stat_to_regularize")} (Art. 30, 48h)
            </strong>
          </div>
          <button className="btn btn-sm btn-warning ml-3" onClick={() => setFiltreStatut("")}
            style={{ whiteSpace: "nowrap" }}>
            <i className="fas fa-filter mr-1" />{t("sanctions.alert_view")}
          </button>
        </div>
      )}

      {nbContestees > 0 && (
        <div className="alert mb-3 d-flex align-items-center"
          style={{ background: "rgba(220,53,69,0.1)", border: "1px solid #dc3545", borderRadius: 6 }}>
          <i className="fas fa-exclamation-triangle mr-2" style={{ color: "#dc3545", fontSize: "1.2rem" }} />
          <span style={{ color: "var(--text-primary)" }}>
            <strong>{nbContestees}</strong> {t("sanctions.stat_contested").toLowerCase()}
          </span>
        </div>
      )}

      <div className="row mb-3">
        {[
          { label: t("sanctions.stat_total"),          val: stats?.total          ?? "—", icon: "list",                 color: "#6c757d" },
          { label: t("sanctions.stat_in_progress"),    val: stats?.en_cours       ?? "—", icon: "clock",                color: "#ffc107" },
          { label: t("sanctions.stat_contested"),      val: stats?.contestees     ?? "—", icon: "exclamation-triangle", color: "#dc3545" },
          { label: t("sanctions.stat_this_month"),     val: stats?.ce_mois        ?? "—", icon: "calendar",             color: "#007bff" },
          { label: t("sanctions.stat_to_regularize"),  val: stats?.a_regulariser  ?? "—", icon: "balance-scale",        color: "#fd7e14" },
        ].map((s) => (
          <div key={s.label} className="col-md col-sm-6 mb-2">
            <div className="card" style={{
              background: "var(--card-bg)", border: "1px solid var(--border-color)",
              borderLeft: `4px solid ${s.color}`,
            }}>
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

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex gap-2 flex-wrap">
          <input type="text" className="form-control form-control-sm"
            placeholder={t("sanctions.search_employee")}
            style={{ width: 220, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-control form-control-sm"
            style={{ width: 160, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            <option value="">{t("sanctions.all_statuses")}</option>
            <option value="BROUILLON">{t("sanctions.status_draft")}</option>
            <option value="NOTIFIEE">{t("sanctions.status_notified")}</option>
            <option value="ACCEPTEE">{t("sanctions.status_accepted")}</option>
            <option value="CONTESTEE">{t("sanctions.status_contested")}</option>
            <option value="ARCHIVEE">{t("sanctions.status_archived")}</option>
          </select>
        </div>
        <Link to="/rh/sanctions/nouveau" className="btn btn-danger btn-sm">
          <i className="fas fa-plus mr-1" /> {t("sanctions.new_sanction")}
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
              <i className="fas fa-shield-alt fa-3x mb-3 d-block" />
              {t("sanctions.no_sanctions")}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    <th>{t("sanctions.col_employee")}</th>
                    <th>{t("sanctions.col_type")}</th>
                    <th>{t("sanctions.col_gravity")}</th>
                    <th>{t("sanctions.col_reason")}</th>
                    <th>{t("sanctions.col_date")}</th>
                    <th>{t("sanctions.col_status")}</th>
                    <th>{t("sanctions.col_legal_status")}</th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((s) => {
                    const gravite = GRAVITE_CONFIG[s.gravite] || GRAVITE_CONFIG[1];
                    const needsIT = s.type_sanction === "MISE_A_PIED" && !s.notifie_it && s.statut !== "BROUILLON";
                    return (
                      <tr key={s.id} style={{
                        color: "var(--text-primary)",
                        background: s.statut === "CONTESTEE"
                          ? "rgba(220,53,69,0.05)"
                          : needsIT
                            ? "rgba(255,193,7,0.06)"
                            : undefined,
                      }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {s.employe_detail?.first_name} {s.employe_detail?.last_name}
                          </div>
                          <small style={{ color: "var(--text-muted)" }}>
                            {s.employe_detail?.departement_nom || "—"}
                          </small>
                        </td>
                        <td>
                          <span className={`badge ${TYPE_BADGE_CLS[s.type_sanction] || "badge-secondary"}`} style={{ fontSize: 10 }}>
                            {TYPE_LABEL[s.type_sanction] || s.type_sanction_display}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: gravite.color, fontSize: "0.82rem", fontWeight: 600 }}>
                            <i className={`fas fa-${gravite.icon} mr-1`} />{gravite.label}
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
                        <td><StatutLegalBadge s={s} /></td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {s.statut === "BROUILLON" && (
                              <>
                                <Link to={`/rh/sanctions/${s.id}/modifier`}
                                  className="btn btn-xs btn-outline-warning" title={t("common.edit")}>
                                  <i className="fas fa-edit" />
                                </Link>
                                <button className="btn btn-xs btn-outline-primary" title={t("sanctions.notify_employee_confirm")}
                                  onClick={() => handleNotifier(s.id)} disabled={actionId === s.id}>
                                  <i className="fas fa-bell" />
                                </button>
                              </>
                            )}
                            {s.type_sanction === "MISE_A_PIED" && !s.notifie_it && s.statut !== "BROUILLON" && (
                              <button
                                className="btn btn-xs btn-warning"
                                title="Notifier l'Inspecteur du Travail (Art. 30 — délai 48h)"
                                onClick={() => handleNotifierIT(s.id)}
                                disabled={actionId === s.id}>
                                {actionId === s.id
                                  ? <i className="fas fa-spinner fa-spin" />
                                  : <><i className="fas fa-balance-scale mr-1" />IT</>
                                }
                              </button>
                            )}
                            {(s.statut === "ACCEPTEE" || s.statut === "NOTIFIEE") && (
                              <button className="btn btn-xs btn-outline-secondary" title={t("sanctions.archive_confirm")}
                                onClick={() => handleArchiver(s.id)} disabled={actionId === s.id}>
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

      <div className="mt-3" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
        <i className="fas fa-balance-scale mr-1" />
        {t("sanctions.legal_ref")}
        {" "}<span className="badge badge-warning" style={{ fontSize: 10 }}>IT</span> {t("sanctions.legal_btn_it")}
      </div>
    </RHLayout>
  );
}
