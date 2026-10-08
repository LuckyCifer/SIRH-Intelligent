import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../components/layout/EmployeLayout";
import BarreProgression from "../../components/ui/BarreProgression";
import { getMesObjectifs, getPeriodesEnCours, majProgression } from "../../api/objectifs";

const COULEUR_PRIORITE = {
  FAIBLE: "secondary",
  MOYENNE: "info",
  HAUTE: "warning",
  CRITIQUE: "danger",
};
const COULEUR_STATUT = {
  NON_COMMENCE: "secondary",
  EN_COURS: "primary",
  ATTEINT: "success",
  DEPASSE: "success",
  NON_ATTEINT: "danger",
  ABANDONNE: "dark",
};

export default function MesObjectifs() {
  const { t } = useTranslation();
  const [objectifs, setObjectifs] = useState([]);
  const [periodes, setPeriodes] = useState([]);
  const [periodeId, setPeriodeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [nouvProg, setNouvProg] = useState(0);

  useEffect(() => {
    getPeriodesEnCours()
      .then((r) => setPeriodes(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getMesObjectifs(periodeId || null)
      .then((r) => setObjectifs(r.data))
      .catch(() => toast.error(t("objectifs.load_error")))
      .finally(() => setLoading(false));
  }, [periodeId]);

  const handleSauvegarderProgression = async (id) => {
    try {
      const r = await majProgression(id, { progression: nouvProg });
      setObjectifs((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      setEditId(null);
      toast.success(t("objectifs.update_success"));
    } catch {
      toast.error(t("objectifs.save_error"));
    }
  };

  const kpis = [
    { label: t("objectifs.total"), valeur: objectifs.length, couleur: "primary", icone: "bullseye" },
    { label: t("objectifs.achieved"), valeur: objectifs.filter((o) => ["ATTEINT", "DEPASSE"].includes(o.statut)).length, couleur: "success", icone: "check-circle" },
    { label: t("objectifs.in_progress"), valeur: objectifs.filter((o) => o.statut === "EN_COURS").length, couleur: "info", icone: "spinner" },
    {
      label: t("objectifs.avg_progression"),
      valeur: `${objectifs.length ? Math.round(objectifs.reduce((s, o) => s + o.progression, 0) / objectifs.length) : 0}%`,
      couleur: "warning",
      icone: "chart-line",
    },
  ];

  return (
    <EmployeLayout>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0" style={{ color: "var(--page-title)" }}>
                {t("objectifs.my_objectives")}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {/* KPIs */}
          <div className="row mb-3">
            {kpis.map((k) => (
              <div key={k.label} className="col-6 col-md-3">
                <div className="small-box" style={{ background: "var(--card-bg)", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <div className="inner">
                    <h3 style={{ color: `var(--acerfi-blue)` }}>{k.valeur}</h3>
                    <p style={{ color: "var(--text-muted)" }}>{k.label}</p>
                  </div>
                  <div className="icon">
                    <i className={`fas fa-${k.icone}`} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filtre période */}
          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-bullseye mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("objectifs.objectives_list")}
              </h3>
              <select
                className="form-control form-control-sm w-auto"
                value={periodeId}
                onChange={(e) => setPeriodeId(e.target.value)}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              >
                <option value="">{t("objectifs.all_periods")}</option>
                {periodes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
                </div>
              ) : objectifs.length === 0 ? (
                <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-inbox fa-3x mb-3 d-block" />
                  {t("objectifs.no_objectives")}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr style={{ background: "var(--card-bg)", color: "var(--text-muted)" }}>
                        <th>{t("objectifs.objective")}</th>
                        <th>{t("objectifs.period")}</th>
                        <th>{t("objectifs.priority")}</th>
                        <th>{t("objectifs.status")}</th>
                        <th style={{ minWidth: 160 }}>{t("objectifs.progression")}</th>
                        <th>{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectifs.map((o) => (
                        <tr key={o.id} style={{ color: "var(--text-primary)" }}>
                          <td>
                            <strong>{o.titre}</strong>
                            {o.date_echeance && (
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                <i className="far fa-calendar mr-1" />
                                {new Date(o.date_echeance).toLocaleDateString("fr-FR")}
                              </div>
                            )}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {o.periode_detail?.nom}
                          </td>
                          <td>
                            <span className={`badge badge-${COULEUR_PRIORITE[o.priorite]}`}>
                              {o.priorite_display}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${COULEUR_STATUT[o.statut]}`}>
                              {o.statut_display}
                            </span>
                          </td>
                          <td>
                            {editId === o.id ? (
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={nouvProg}
                                  onChange={(e) => setNouvProg(Number(e.target.value))}
                                  style={{ flex: 1 }}
                                />
                                <span style={{ minWidth: 35 }}>{nouvProg}%</span>
                                <button
                                  className="btn btn-xs btn-success"
                                  onClick={() => handleSauvegarderProgression(o.id)}
                                >
                                  <i className="fas fa-check" />
                                </button>
                                <button
                                  className="btn btn-xs btn-secondary"
                                  onClick={() => setEditId(null)}
                                >
                                  <i className="fas fa-times" />
                                </button>
                              </div>
                            ) : (
                              <BarreProgression valeur={o.progression} />
                            )}
                          </td>
                          <td>
                            {editId !== o.id && (
                              <button
                                className="btn btn-xs btn-outline-primary"
                                onClick={() => { setEditId(o.id); setNouvProg(o.progression); }}
                              >
                                <i className="fas fa-edit" />
                              </button>
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
      </div>
    </EmployeLayout>
  );
}
