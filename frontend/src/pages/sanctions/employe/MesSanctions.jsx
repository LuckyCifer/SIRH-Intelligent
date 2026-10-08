import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../../components/layout/EmployeLayout";
import { getSanctions, repondre } from "../../../api/sanctions";

const STATUT_BADGE = {
  NOTIFIEE: "warning", ACCEPTEE: "success", CONTESTEE: "danger", ARCHIVEE: "secondary",
};

function ModalReponse({ sanction, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [action,       setAction]       = useState("accepter");
  const [reponseTexte, setReponseTexte] = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  const TYPE_LABEL = {
    AVERT_ORAL:     t("sanctions.type_avertissement"),
    AVERT_ECRIT:    t("sanctions.type_avertissement_full"),
    BLAME:          t("sanctions.type_blame"),
    MISE_GARDE:     t("sanctions.type_avertissement"),
    MISE_PIED:      t("sanctions.type_mise_a_pied"),
    RETROGRADATION: t("sanctions.type_lic_grave"),
    LICENCIEMENT:   t("sanctions.type_lic_grave"),
  };

  const handleSubmit = async () => {
    if (action === "contester" && !reponseTexte.trim()) {
      return toast.error(t("sanctions.reply_contest_required"));
    }
    setSubmitting(true);
    try {
      await repondre(sanction.id, { action, reponse: reponseTexte });
      toast.success(action === "accepter" ? t("sanctions.reply_accepted") : t("sanctions.reply_contested"));
      onSuccess();
      onClose();
    } catch {
      toast.error(t("sanctions.reply_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="card"
        style={{ width: "95%", maxWidth: 500, background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 8 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
          <h5 style={{ color: "var(--page-title)", margin: 0 }}>
            <i className="fas fa-reply mr-2" style={{ color: "var(--acerfi-blue)" }} />
            {t("sanctions.modal_reply_title")}
          </h5>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            {t("sanctions.modal_sanction_label")} : <strong style={{ color: "var(--text-primary)" }}>
              {TYPE_LABEL[sanction.type_sanction] || sanction.type_sanction_display}
            </strong>
            <br />{t("sanctions.modal_reason_label")} : {sanction.motif}
          </p>

          <div className="form-group">
            <label style={{ color: "var(--text-primary)" }}>{t("sanctions.modal_your_reply")}</label>
            <div className="d-flex gap-3 mb-2">
              {["accepter", "contester"].map((a) => (
                <label key={a} style={{ cursor: "pointer", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                  <input type="radio" name="action" value={a} checked={action === a}
                    onChange={() => setAction(a)} className="mr-1" />
                  {a === "accepter" ? t("sanctions.modal_accept") : t("sanctions.modal_contest")}
                </label>
              ))}
            </div>
          </div>

          {action === "contester" && (
            <div className="form-group">
              <label style={{ color: "var(--text-primary)" }}>
                {t("sanctions.modal_contest_reason")} <span className="text-danger">*</span>
              </label>
              <textarea className="form-control" rows={4} value={reponseTexte}
                onChange={(e) => setReponseTexte(e.target.value)}
                placeholder={t("sanctions.modal_contest_placeholder")}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
            </div>
          )}

          {action === "accepter" && (
            <div className="form-group">
              <label style={{ color: "var(--text-primary)" }}>{t("sanctions.modal_comment_optional")}</label>
              <textarea className="form-control" rows={3} value={reponseTexte}
                onChange={(e) => setReponseTexte(e.target.value)}
                placeholder={t("sanctions.modal_comment_placeholder")}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
            </div>
          )}
        </div>
        <div className="card-footer d-flex justify-content-end gap-2"
          style={{ background: "var(--card-bg)", borderTop: "1px solid var(--border-color)" }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>{t("common.cancel")}</button>
          <button
            className={`btn btn-sm ${action === "accepter" ? "btn-success" : "btn-warning"}`}
            onClick={handleSubmit} disabled={submitting}>
            {submitting ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-paper-plane mr-1" />}
            {action === "accepter" ? t("sanctions.modal_confirm_accept") : t("sanctions.modal_send_contest")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MesSanctions() {
  const { t }   = useTranslation();
  const [sanctions, setSanctions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);

  const GRAVITE_CONFIG = [
    null,
    { label: t("sanctions.gravity_low"),         color: "#28a745", icon: "info-circle" },
    { label: t("sanctions.gravity_moderate"),    color: "#17a2b8", icon: "exclamation-circle" },
    { label: t("sanctions.gravity_significant"), color: "#ffc107", icon: "exclamation-triangle" },
    { label: t("sanctions.gravity_serious"),     color: "#fd7e14", icon: "exclamation-triangle" },
    { label: t("sanctions.gravity_very_serious"),color: "#dc3545", icon: "times-circle" },
  ];

  const TYPE_LABEL = {
    AVERT_ORAL:     t("sanctions.type_avertissement"),
    AVERT_ECRIT:    t("sanctions.type_avertissement_full"),
    BLAME:          t("sanctions.type_blame"),
    MISE_GARDE:     t("sanctions.type_avertissement"),
    MISE_PIED:      t("sanctions.type_mise_a_pied"),
    RETROGRADATION: t("sanctions.type_lic_grave"),
    LICENCIEMENT:   t("sanctions.type_lic_grave"),
  };

  const charger = () => {
    getSanctions()
      .then((r) => setSanctions(r.data.results ?? r.data))
      .catch(() => toast.error(t("sanctions.load_error")))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []); // eslint-disable-line

  return (
    <EmployeLayout pageTitle={t("sanctions.my_sanctions")}>
      {modal && (
        <ModalReponse sanction={modal} onClose={() => setModal(null)} onSuccess={charger} />
      )}

      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      ) : sanctions.length === 0 ? (
        <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
          <i className="fas fa-shield-alt fa-3x mb-3 d-block" style={{ color: "#28a745" }} />
          <strong style={{ color: "var(--page-title)" }}>{t("sanctions.no_my_sanctions")}</strong>
          <p className="mb-0">{t("sanctions.no_my_sanctions")}</p>
        </div>
      ) : (
        <div>
          {sanctions.map((s) => {
            const gravite    = GRAVITE_CONFIG[s.gravite] || GRAVITE_CONFIG[1];
            const peutRepondre = s.statut === "NOTIFIEE";
            return (
              <div key={s.id} className="card mb-3" style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderLeft: `4px solid ${gravite.color}`,
              }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                      <div className="d-flex align-items-center mb-1">
                        <i className={`fas fa-${gravite.icon} mr-2`} style={{ color: gravite.color, fontSize: "1.1rem" }} />
                        <strong style={{ color: "var(--page-title)", fontSize: "1rem" }}>
                          {TYPE_LABEL[s.type_sanction] || s.type_sanction_display}
                        </strong>
                        <span className="ml-2" style={{
                          fontSize: "0.73rem", padding: "2px 8px", borderRadius: 10,
                          background: `${gravite.color}22`, color: gravite.color, fontWeight: 600,
                        }}>
                          {gravite.label}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        <div>
                          <i className="fas fa-calendar mr-1" />
                          {t("sanctions.sanction_date_label")} {new Date(s.date_sanction).toLocaleDateString("fr-FR")}
                        </div>
                        {s.date_faits && (
                          <div>
                            <i className="fas fa-exclamation-circle mr-1" />
                            {t("sanctions.facts_date_label")} {new Date(s.date_faits).toLocaleDateString("fr-FR")}
                          </div>
                        )}
                        {(s.date_debut_effet || s.date_fin_effet) && (
                          <div>
                            <i className="fas fa-hourglass mr-1" />
                            {t("sanctions.effect_label")} : {s.date_debut_effet ? new Date(s.date_debut_effet).toLocaleDateString("fr-FR") : "—"}
                            {s.date_fin_effet && ` → ${new Date(s.date_fin_effet).toLocaleDateString("fr-FR")}`}
                            {s.duree_jours && ` (${s.duree_jours} ${t("sanctions.days_label")})`}
                          </div>
                        )}
                      </div>

                      {s.motif && (
                        <div className="mt-2" style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          <strong>{t("sanctions.reason_label")} :</strong> {s.motif}
                        </div>
                      )}
                      {s.description && (
                        <div className="mt-1" style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                          {s.description}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 text-right">
                      <span className={`badge badge-${STATUT_BADGE[s.statut] || "secondary"}`}>
                        {s.statut_display}
                      </span>
                    </div>
                  </div>

                  {s.mesures_correctives && (
                    <div className="mt-2 p-2"
                      style={{ background: "rgba(40,167,69,0.1)", borderRadius: 4, fontSize: "0.83rem", color: "var(--text-primary)" }}>
                      <i className="fas fa-tasks mr-1 text-success" />
                      <strong>{t("sanctions.corrective_label")} :</strong> {s.mesures_correctives}
                    </div>
                  )}

                  {s.reponse_employe && (
                    <div className="mt-2 p-2"
                      style={{ background: "rgba(23,162,184,0.1)", borderRadius: 4, fontSize: "0.83rem", color: "var(--text-primary)" }}>
                      <i className="fas fa-reply mr-1 text-info" />
                      <strong>{t("sanctions.your_reply_label")} :</strong> {s.reponse_employe}
                    </div>
                  )}

                  {peutRepondre && !s.reponse_employe && (
                    <div className="mt-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setModal(s)}>
                        <i className="fas fa-reply mr-1" /> {t("sanctions.reply_btn")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EmployeLayout>
  );
}
