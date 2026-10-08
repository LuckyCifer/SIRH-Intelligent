import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../components/layout/EmployeLayout";
import ManagerLayout from "../../components/layout/ManagerLayout";
import RHLayout from "../../components/layout/RHLayout";
import useAuthStore from "../../store/authStore";
import EtoilesNote from "../../components/ui/EtoilesNote";
import NiveauPerformance from "../../components/ui/NiveauPerformance";
import {
  getEvaluation, updateEvaluation, soumettreEvaluation, relancerIA,
} from "../../api/objectifs";

export default function FormulaireEvaluation() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const { user }   = useAuthStore();
  const Layout = user?.role === "RH" || user?.role === "ADMIN"
    ? RHLayout
    : user?.role === "MANAGER"
    ? ManagerLayout
    : EmployeLayout;

  const CRITERES = [
    { key: "note_competences",   label: t("objectifs.criteria_competences"),  icone: "cog" },
    { key: "note_objectifs",     label: t("objectifs.criteria_objectives"),   icone: "bullseye" },
    { key: "note_comportement",  label: t("objectifs.criteria_behavior"),     icone: "user-tie" },
    { key: "note_initiative",    label: t("objectifs.criteria_initiative"),   icone: "lightbulb" },
    { key: "note_travail_equipe",label: t("objectifs.criteria_teamwork"),     icone: "users" },
    { key: "note_communication", label: t("objectifs.criteria_communication"),icone: "comments" },
  ];

  const [evaluation, setEvaluation] = useState(null);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getEvaluation(id)
      .then(r => {
        setEvaluation(r.data);
        const f = {};
        CRITERES.forEach(c => { f[c.key] = r.data[c.key] || null; });
        f.points_forts           = r.data.points_forts           || "";
        f.axes_amelioration      = r.data.axes_amelioration      || "";
        f.objectifs_periode_suiv = r.data.objectifs_periode_suiv || "";
        f.commentaire_employe    = r.data.commentaire_employe    || "";
        setForm(f);
      })
      .catch(() => toast.error(t("objectifs.evaluation_not_found")));
  }, [id]); // eslint-disable-line

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await updateEvaluation(id, form);
      setEvaluation(r.data);
      toast.success(t("objectifs.evaluation_saved"));
    } catch {
      toast.error(t("objectifs.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSoumettre = async () => {
    setSubmitting(true);
    try {
      await updateEvaluation(id, form);
      const r = await soumettreEvaluation(id);
      setEvaluation(r.data);
      toast.success(t("objectifs.submit_success"));
    } catch {
      toast.error(t("objectifs.submit_error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelancerIA = async () => {
    try {
      await relancerIA(id);
      toast.success(t("objectifs.ia_relaunched"));
      setTimeout(async () => {
        const r = await getEvaluation(id);
        setEvaluation(r.data);
      }, 5000);
    } catch {
      toast.error(t("objectifs.ia_relaunch_error"));
    }
  };

  if (!evaluation) {
    return (
      <Layout>
        <div className="content text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      </Layout>
    );
  }

  const readOnly = !["BROUILLON", "CONTESTE"].includes(evaluation.statut);

  const COMMENTAIRES = [
    { key: "points_forts",           label: t("objectifs.strong_points"),            rows: 3 },
    { key: "axes_amelioration",      label: t("objectifs.improvement_axes"),         rows: 3 },
    { key: "objectifs_periode_suiv", label: t("objectifs.next_period_objectives"),   rows: 3 },
    { key: "commentaire_employe",    label: t("objectifs.employee_comment"),         rows: 2 },
  ];

  return (
    <Layout>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0" style={{ color: "var(--page-title)" }}>
                {t("objectifs.evaluation_title", { period: evaluation.periode_detail?.nom })}
              </h1>
            </div>
            <div className="col-sm-6 text-right">
              <button className="btn btn-secondary btn-sm mr-2" onClick={() => navigate(-1)}>
                <i className="fas fa-arrow-left mr-1" /> {t("common.back")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-7">
              <div className="card card-outline"
                style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                    <i className="fas fa-star mr-2" style={{ color: "var(--acerfi-blue)" }} />
                    {t("objectifs.notes_criteria")}
                  </h3>
                </div>
                <div className="card-body">
                  {CRITERES.map(c => (
                    <div key={c.key} className="mb-3 d-flex justify-content-between align-items-center">
                      <label style={{ color: "var(--text-primary)", marginBottom: 0 }}>
                        <i className={`fas fa-${c.icone} mr-2`} style={{ color: "var(--acerfi-blue)" }} />
                        {c.label}
                      </label>
                      <EtoilesNote
                        note={form[c.key]}
                        onChange={readOnly ? null : (v) => setForm(f => ({ ...f, [c.key]: v }))}
                      />
                    </div>
                  ))}
                  {evaluation.note_globale && (
                    <div className="mt-3 p-3 text-center"
                      style={{ background: "rgba(0,123,255,0.07)", borderRadius: 8 }}>
                      <strong style={{ color: "var(--page-title)" }}>{t("objectifs.global_note")}</strong>
                      <div className="mt-1">
                        <EtoilesNote note={evaluation.note_globale} taille="lg" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card-outline"
                style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                    {t("objectifs.comments_section")}
                  </h3>
                </div>
                <div className="card-body">
                  {COMMENTAIRES.map(f => (
                    <div key={f.key} className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>{f.label}</label>
                      <textarea className="form-control" rows={f.rows}
                        value={form[f.key] || ""}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        disabled={readOnly && f.key !== "commentaire_employe"}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                    </div>
                  ))}
                </div>
                {!readOnly && (
                  <div className="card-footer d-flex gap-2" style={{ background: "transparent" }}>
                    <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
                      {saving ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-save mr-1" />}
                      {t("objectifs.save_btn")}
                    </button>
                    <button className="btn btn-primary" onClick={handleSoumettre} disabled={submitting}>
                      {submitting ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-paper-plane mr-1" />}
                      {t("objectifs.submit_btn")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-5">
              <div className="card card-outline"
                style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
                <div className="card-header d-flex justify-content-between">
                  <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                    <i className="fas fa-robot mr-2" style={{ color: "var(--acerfi-blue)" }} />
                    {t("objectifs.ia_analysis")}
                  </h3>
                  <button className="btn btn-xs btn-outline-secondary"
                    onClick={handleRelancerIA}
                    title={t("objectifs.ia_relaunch_title")}>
                    <i className="fas fa-sync" />
                  </button>
                </div>
                <div className="card-body">
                  {evaluation.analyse_ia ? (
                    <>
                      <div className="mb-3">
                        <NiveauPerformance
                          niveau={evaluation.analyse_ia.niveau_performance}
                          score={evaluation.score_ia}
                        />
                      </div>
                      <p style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>
                        {evaluation.analyse_ia.synthese}
                      </p>
                      {evaluation.analyse_ia.points_forts?.length > 0 && (
                        <div className="mb-2">
                          <strong style={{ color: "var(--text-primary)" }}>{t("objectifs.strong_points")} :</strong>
                          <ul className="mb-0 pl-3" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {evaluation.analyse_ia.points_forts.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {evaluation.analyse_ia.axes_developpement?.length > 0 && (
                        <div className="mb-2">
                          <strong style={{ color: "var(--text-primary)" }}>{t("objectifs.development_axes")} :</strong>
                          <ul className="mb-0 pl-3" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {evaluation.analyse_ia.axes_developpement.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <hr style={{ borderColor: "rgba(0,0,0,0.1)" }} />
                      <div className="row text-center">
                        <div className="col-6">
                          <small style={{ color: "var(--text-muted)" }}>{t("objectifs.departure_risk")}</small>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {evaluation.analyse_ia.risque_depart}
                          </div>
                        </div>
                        <div className="col-6">
                          <small style={{ color: "var(--text-muted)" }}>{t("objectifs.evolution_potential")}</small>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {evaluation.analyse_ia.potentiel_evolution}
                          </div>
                        </div>
                      </div>
                      {evaluation.analyse_ia.recommandation_rh && (
                        <div className="mt-3 p-2"
                          style={{ background: "rgba(0,123,255,0.07)", borderRadius: 6, fontSize: "0.83rem", color: "var(--text-primary)" }}>
                          <i className="fas fa-lightbulb mr-1" style={{ color: "#f39c12" }} />
                          {evaluation.analyse_ia.recommandation_rh}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                      <i className="fas fa-robot fa-2x mb-2 d-block" />
                      {evaluation.statut === "BROUILLON"
                        ? t("objectifs.ia_submit_hint")
                        : t("objectifs.ia_processing")}
                    </div>
                  )}
                </div>
              </div>

              {evaluation.commentaire_rh && (
                <div className="card card-outline"
                  style={{ borderColor: "#28a745", background: "var(--card-bg)" }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                      <i className="fas fa-comment-dots mr-2" style={{ color: "#28a745" }} />
                      {t("objectifs.rh_comment_label")}
                    </h3>
                  </div>
                  <div className="card-body">
                    <p style={{ color: "var(--text-primary)" }}>{evaluation.commentaire_rh}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
