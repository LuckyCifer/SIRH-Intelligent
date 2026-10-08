import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { getVirements, getStatsVirements, rafraichirStatut } from "../../../api/paiements";

// ── Helpers ──────────────────────────────────────────────────────────────────

function numFr(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUT_COLORS = {
  SUCCES:     { color: "#28a745", bg: "#d4edda", icon: "fas fa-check-circle" },
  ECHEC:      { color: "#dc3545", bg: "#f8d7da", icon: "fas fa-times-circle" },
  EN_COURS:   { color: "#fd7e14", bg: "#fff3cd", icon: "fas fa-spinner fa-spin" },
  EN_ATTENTE: { color: "#6c757d", bg: "#e9ecef", icon: "fas fa-clock" },
  ANNULE:     { color: "#6c757d", bg: "#e9ecef", icon: "fas fa-ban" },
};

const STATUT_KEYS = {
  SUCCES: "statut_succes", ECHEC: "statut_echec",
  EN_COURS: "statut_en_cours", EN_ATTENTE: "statut_en_attente", ANNULE: "statut_annule",
};

const OP_COLORS = {
  MTN:    { color: "#ffcc00", textColor: "#1a1a1a", emoji: "🟡" },
  ORANGE: { color: "#ff6600", textColor: "#fff",    emoji: "🟠" },
};

// ── Composants badge ──────────────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const { t } = useTranslation();
  const cfg = STATUT_COLORS[statut] || STATUT_COLORS.EN_ATTENTE;
  const key = STATUT_KEYS[statut] || "statut_en_attente";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      <i className={cfg.icon} style={{ fontSize: 11 }} />
      {t(`virements.${key}`)}
    </span>
  );
}

function OperateurBadge({ operateur }) {
  const { t } = useTranslation();
  const cfg = OP_COLORS[operateur] || {};
  const key = operateur === "MTN" ? "op_mtn" : operateur === "ORANGE" ? "op_orange" : null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: cfg.color, color: cfg.textColor,
    }}>
      {cfg.emoji} {key ? t(`virements.${key}`) : operateur}
    </span>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="col-md-3 col-sm-6 mb-3">
      <div className="card h-100" style={{ borderLeft: `4px solid ${color}`, borderRadius: 8 }}>
        <div className="card-body d-flex align-items-center py-3">
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: color + "22", display: "flex", alignItems: "center",
            justifyContent: "center", marginRight: 14, flexShrink: 0,
          }}>
            <i className={icon} style={{ fontSize: 20, color }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
              {value}
            </div>
            {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function VirementsMobile() {
  const { t } = useTranslation();
  const [virements, setVirements]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState({});
  const [filtreStatut, setFiltreStatut]       = useState("");
  const [filtreOperateur, setFiltreOperateur] = useState("");

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtreStatut)    params.statut    = filtreStatut;
      if (filtreOperateur) params.operateur = filtreOperateur;
      const [rV, rS] = await Promise.allSettled([
        getVirements(params),
        getStatsVirements(),
      ]);
      if (rV.status === "fulfilled") setVirements(rV.value.data.results || rV.value.data);
      if (rS.status === "fulfilled") setStats(rS.value.data);
    } catch {
      toast.error(t("virements.chargement_error"), { id: "virements-err" });
    } finally {
      setLoading(false);
    }
  }, [filtreStatut, filtreOperateur, t]);

  useEffect(() => { charger(); }, [charger]);

  async function handleRafraichir(id) {
    setRefreshing(r => ({ ...r, [id]: true }));
    try {
      const { data } = await rafraichirStatut(id);
      setVirements(v => v.map(x => x.id === id ? data : x));
      if (data.statut === "SUCCES")
        toast.success(t("virements.confirme_succes"));
      else if (data.statut === "ECHEC")
        toast.error(t("virements.echec_msg"));
      else
        toast(t(`virements.${STATUT_KEYS[data.statut] || "statut_en_cours"}`));
    } catch {
      toast.error(t("virements.rafraichir_error"), { id: `ref-${id}` });
    } finally {
      setRefreshing(r => ({ ...r, [id]: false }));
    }
  }

  const totalEnCours = virements.filter(v => v.statut === "EN_COURS").length;

  return (
    <RHLayout pageTitle={t("virements.page_title")}>
      <div className="content-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="m-0" style={{ color: "var(--text-primary)", fontSize: 22 }}>
                <i className="fas fa-mobile-alt mr-2" style={{ color: "#ffcc00" }} />
                {t("virements.page_title")}
              </h1>
              <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                {t("virements.subtitle")}
              </p>
            </div>
            <div className="d-flex gap-2">
              {totalEnCours > 0 && (
                <button className="btn btn-sm btn-warning" onClick={charger}>
                  <i className="fas fa-sync-alt mr-1" />
                  {t("virements.rafraichir_btn", { count: totalEnCours })}
                </button>
              )}
              <Link to="/rh/paie" className="btn btn-sm btn-outline-secondary">
                <i className="fas fa-arrow-left mr-1" /> {t("virements.retour_paie")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">

          {/* ── Statistiques ── */}
          {stats && (
            <div className="row mb-2">
              <StatCard
                icon="fas fa-paper-plane"
                label={t("virements.stat_total")}
                value={stats.total_virements}
                color="#2E74B5"
                sub={t("virements.montant_envoye", { montant: numFr(stats.total_montant) })}
              />
              <StatCard
                icon="fas fa-check-circle"
                label={t("virements.stat_reussis")}
                value={stats.nb_succes}
                color="#28a745"
                sub={t("virements.montant_confirme", { montant: numFr(stats.montant_succes) })}
              />
              <StatCard
                icon="fas fa-spinner"
                label={t("virements.stat_en_cours")}
                value={stats.nb_en_cours}
                color="#fd7e14"
                sub={stats.nb_echec > 0
                  ? t("virements.nb_echec", { count: stats.nb_echec })
                  : ""}
              />
              <StatCard
                icon="fas fa-percentage"
                label={t("virements.stat_taux")}
                value={`${stats.taux_succes} %`}
                color="#17a2b8"
                sub={t("virements.repartition", {
                  mtn:    stats.par_operateur?.MTN?.n    || 0,
                  orange: stats.par_operateur?.ORANGE?.n || 0,
                })}
              />
            </div>
          )}

          {/* ── Mode démo banner ── */}
          {virements.some(v => v.mode_demo) && (
            <div className="alert alert-info d-flex align-items-center mb-3" style={{ borderRadius: 8 }}>
              <i className="fas fa-info-circle mr-2" style={{ fontSize: 18 }} />
              <div>
                <strong>{t("virements.demo_title")}</strong> — {t("virements.demo_text")}
              </div>
            </div>
          )}

          {/* ── Filtres ── */}
          <div className="card mb-3" style={{ borderRadius: 10 }}>
            <div className="card-body py-2">
              <div className="row align-items-center">
                <div className="col-auto">
                  <label className="mb-0 mr-2" style={{ fontSize: 13 }}>
                    {t("virements.filtre_operateur")}
                  </label>
                  <select
                    className="form-control form-control-sm d-inline-block"
                    style={{ width: 160 }}
                    value={filtreOperateur}
                    onChange={e => setFiltreOperateur(e.target.value)}
                  >
                    <option value="">{t("virements.tous")}</option>
                    <option value="MTN">{t("virements.op_mtn")}</option>
                    <option value="ORANGE">{t("virements.op_orange")}</option>
                  </select>
                </div>
                <div className="col-auto">
                  <label className="mb-0 mr-2" style={{ fontSize: 13 }}>
                    {t("virements.filtre_statut")}
                  </label>
                  <select
                    className="form-control form-control-sm d-inline-block"
                    style={{ width: 160 }}
                    value={filtreStatut}
                    onChange={e => setFiltreStatut(e.target.value)}
                  >
                    <option value="">{t("virements.tous")}</option>
                    <option value="EN_COURS">{t("virements.statut_en_cours")}</option>
                    <option value="SUCCES">{t("virements.statut_succes")}</option>
                    <option value="ECHEC">{t("virements.statut_echec")}</option>
                    <option value="ANNULE">{t("virements.statut_annule")}</option>
                  </select>
                </div>
                <div className="col-auto ml-auto">
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {t("virements.count", { count: virements.length })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tableau ── */}
          <div className="card" style={{ borderRadius: 10 }}>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "#2E74B5" }} />
                  <div className="mt-2 text-muted">{t("common.loading")}</div>
                </div>
              ) : virements.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-mobile-alt fa-3x mb-3" style={{ color: "#dee2e6" }} />
                  <p className="text-muted">{t("virements.aucun_virement")}</p>
                  <Link to="/rh/paie" className="btn btn-primary btn-sm">
                    {t("virements.aller_gestion_paie")}
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0" style={{ fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--card-bg)", borderBottom: "2px solid var(--border-color)" }}>
                        <th className="pl-3">{t("virements.col_employe")}</th>
                        <th>{t("virements.col_operateur")}</th>
                        <th>{t("virements.col_numero")}</th>
                        <th>{t("virements.col_montant")}</th>
                        <th>{t("virements.col_motif")}</th>
                        <th>{t("virements.col_statut")}</th>
                        <th>{t("virements.col_initie_le")}</th>
                        <th>{t("virements.col_ref")}</th>
                        <th className="text-center">{t("virements.col_actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {virements.map(v => (
                        <tr key={v.id}>
                          <td className="pl-3">
                            <strong>{v.employe_detail?.nom_complet || "—"}</strong>
                            {v.mode_demo && (
                              <span className="badge badge-secondary ml-1" style={{ fontSize: 9 }}>
                                DÉMO
                              </span>
                            )}
                          </td>
                          <td><OperateurBadge operateur={v.operateur} /></td>
                          <td>
                            <code style={{ fontSize: 12 }}>{v.numero_mobile}</code>
                          </td>
                          <td>
                            <strong style={{ color: "#2E74B5" }}>{numFr(v.montant)} F</strong>
                          </td>
                          <td style={{
                            maxWidth: 150, whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {v.motif}
                          </td>
                          <td><StatutBadge statut={v.statut} /></td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(v.created_at)}</td>
                          <td>
                            <code style={{ fontSize: 10, color: "var(--text-muted)" }}>
                              {v.transaction_id ? v.transaction_id.slice(0, 16) + "…" : "—"}
                            </code>
                          </td>
                          <td className="text-center">
                            {["EN_COURS", "EN_ATTENTE"].includes(v.statut) && (
                              <button
                                className="btn btn-xs btn-outline-primary"
                                onClick={() => handleRafraichir(v.id)}
                                disabled={refreshing[v.id]}
                                title={t("common.refresh")}
                              >
                                <i className={`fas fa-sync-alt ${refreshing[v.id] ? "fa-spin" : ""}`} />
                              </button>
                            )}
                            {v.bulletin && (
                              <Link
                                to={`/rh/paie/bulletins/${v.bulletin}`}
                                className="btn btn-xs btn-outline-secondary ml-1"
                                title={t("common.view")}
                              >
                                <i className="fas fa-file-invoice" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>
    </RHLayout>
  );
}
