import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../components/layout/EmployeLayout";
import EtoilesNote from "../../components/ui/EtoilesNote";
import NiveauPerformance from "../../components/ui/NiveauPerformance";
import { getMesEvaluations, contesterEvaluation } from "../../api/objectifs";

const COULEUR_STATUT = {
  BROUILLON: "secondary",
  EN_ATTENTE: "warning",
  SIGNE: "success",
  CONTESTE: "danger",
};

export default function MesEvaluations() {
  const { t } = useTranslation();
  const [evaluations,              setEvaluations]              = useState([]);
  const [loading,                  setLoading]                  = useState(true);
  const [selected,                 setSelected]                 = useState(null);
  const [commentaireContestation,  setCommentaireContestation]  = useState("");

  useEffect(() => {
    getMesEvaluations()
      .then(r => setEvaluations(r.data))
      .catch(() => toast.error(t("objectifs.load_error")))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleContester = async (id) => {
    try {
      await contesterEvaluation(id, { commentaire_employe: commentaireContestation });
      toast.success(t("objectifs.contest_success"));
      setSelected(null);
      const r = await getMesEvaluations();
      setEvaluations(r.data);
    } catch {
      toast.error(t("objectifs.contest_error"));
    }
  };

  return (
    <EmployeLayout>
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0" style={{ color: "var(--page-title)" }}>
            {t("objectifs.my_performance_evaluations")}
          </h1>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : evaluations.length === 0 ? (
            <div className="card card-outline text-center py-5"
              style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)", color: "var(--text-muted)" }}>
              <i className="fas fa-chart-bar fa-3x mb-3 d-block" />
              {t("objectifs.no_evaluations")}
            </div>
          ) : (
            <div className="row">
              {evaluations.map(ev => (
                <div key={ev.id} className="col-md-6 col-lg-4">
                  <div className="card card-outline"
                    style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
                    <div className="card-header">
                      <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                        {ev.periode_detail?.nom}
                      </h3>
                      <div className="card-tools">
                        <span className={`badge badge-${COULEUR_STATUT[ev.statut]}`}>
                          {ev.statut_display}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      {ev.note_globale && (
                        <div className="mb-2">
                          <EtoilesNote note={ev.note_globale} />
                          <span style={{ marginLeft: 8, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {t("objectifs.global_note")}
                          </span>
                        </div>
                      )}
                      {ev.analyse_ia && (
                        <NiveauPerformance
                          niveau={ev.analyse_ia.niveau_performance}
                          score={ev.score_ia}
                        />
                      )}
                      {ev.points_forts && (
                        <p className="mt-2 mb-1" style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                          <strong>{t("objectifs.strong_points")} :</strong> {ev.points_forts}
                        </p>
                      )}
                      {ev.evaluateur_detail && (
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {t("objectifs.evaluator")} : {ev.evaluateur_detail.nom_complet}
                        </p>
                      )}
                    </div>
                    <div className="card-footer d-flex gap-2" style={{ background: "transparent" }}>
                      <Link to={`/employe/evaluations/${ev.id}`} className="btn btn-sm btn-outline-primary">
                        <i className="fas fa-eye mr-1" /> {t("objectifs.see")}
                      </Link>
                      {ev.statut === "SIGNE" && (
                        <button className="btn btn-sm btn-outline-danger"
                          onClick={() => { setSelected(ev); setCommentaireContestation(""); }}>
                          <i className="fas fa-flag mr-1" /> {t("objectifs.contest")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setSelected(null)}>
              <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered"
                onClick={e => e.stopPropagation()}>
                <div className="modal-content" style={{ background: "var(--card-bg)" }}>
                  <div className="modal-header">
                    <h5 className="modal-title" style={{ color: "var(--page-title)" }}>
                      {t("objectifs.contest_evaluation_period", { period: selected.periode_detail?.nom })}
                    </h5>
                    <button className="close" onClick={() => setSelected(null)}>
                      <span>&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.contest_reason")}</label>
                    <textarea className="form-control" rows={4}
                      value={commentaireContestation}
                      onChange={e => setCommentaireContestation(e.target.value)}
                      placeholder={t("objectifs.contest_placeholder")}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                      {t("common.cancel")}
                    </button>
                    <button className="btn btn-danger"
                      onClick={() => handleContester(selected.id)}
                      disabled={!commentaireContestation.trim()}>
                      {t("objectifs.contest_confirm")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EmployeLayout>
  );
}
