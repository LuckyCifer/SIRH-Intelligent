import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import EmployeLayout from "../../../components/layout/EmployeLayout";
import { getSanctions, repondre } from "../../../api/sanctions";

const TYPE_LABEL = {
  AVERT_ORAL: "Avertissement oral",
  AVERT_ECRIT: "Avertissement écrit",
  BLAME: "Blâme",
  MISE_GARDE: "Mise en garde",
  MISE_PIED: "Mise à pied",
  RETROGRADATION: "Rétrogradation",
  LICENCIEMENT: "Licenciement",
};

const GRAVITE_CONFIG = [
  null,
  { label: "Faible", color: "#28a745", icon: "info-circle" },
  { label: "Modérée", color: "#17a2b8", icon: "exclamation-circle" },
  { label: "Significative", color: "#ffc107", icon: "exclamation-triangle" },
  { label: "Grave", color: "#fd7e14", icon: "exclamation-triangle" },
  { label: "Très grave", color: "#dc3545", icon: "times-circle" },
];

const STATUT_BADGE = {
  NOTIFIEE: "warning", ACCEPTEE: "success", CONTESTEE: "danger", ARCHIVEE: "secondary",
};

function ModalReponse({ sanction, onClose, onSuccess }) {
  const [action, setAction] = useState("accepter");
  const [reponseTexte, setReponseTexte] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (action === "contester" && !reponseTexte.trim()) {
      return toast.error("Veuillez saisir votre contestation");
    }
    setSubmitting(true);
    try {
      await repondre(sanction.id, { action, reponse: reponseTexte });
      toast.success(action === "accepter" ? "Sanction acceptée" : "Contestation enregistrée");
      onSuccess();
      onClose();
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "95%", maxWidth: 500, background: "var(--card-bg)",
          border: "1px solid var(--border-color)", borderRadius: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
          <h5 style={{ color: "var(--page-title)", margin: 0 }}>
            <i className="fas fa-reply mr-2" style={{ color: "var(--acerfi-blue)" }} />
            Répondre à la sanction
          </h5>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Sanction : <strong style={{ color: "var(--text-primary)" }}>{TYPE_LABEL[sanction.type_sanction]}</strong>
            <br />Motif : {sanction.motif}
          </p>

          <div className="form-group">
            <label style={{ color: "var(--text-primary)" }}>Votre réponse</label>
            <div className="d-flex gap-3 mb-2">
              {["accepter", "contester"].map((a) => (
                <label key={a} style={{ cursor: "pointer", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                  <input
                    type="radio"
                    name="action"
                    value={a}
                    checked={action === a}
                    onChange={() => setAction(a)}
                    className="mr-1"
                  />
                  {a === "accepter" ? "J'accepte la sanction" : "Je conteste la sanction"}
                </label>
              ))}
            </div>
          </div>

          {action === "contester" && (
            <div className="form-group">
              <label style={{ color: "var(--text-primary)" }}>Motif de contestation <span className="text-danger">*</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={reponseTexte}
                onChange={(e) => setReponseTexte(e.target.value)}
                placeholder="Expliquez les raisons de votre contestation..."
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              />
            </div>
          )}

          {action === "accepter" && (
            <div className="form-group">
              <label style={{ color: "var(--text-primary)" }}>Commentaire (optionnel)</label>
              <textarea
                className="form-control"
                rows={3}
                value={reponseTexte}
                onChange={(e) => setReponseTexte(e.target.value)}
                placeholder="Commentaire optionnel..."
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              />
            </div>
          )}
        </div>
        <div className="card-footer d-flex justify-content-end gap-2" style={{ background: "var(--card-bg)", borderTop: "1px solid var(--border-color)" }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button
            className={`btn btn-sm ${action === "accepter" ? "btn-success" : "btn-warning"}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-paper-plane mr-1" />}
            {action === "accepter" ? "Confirmer l'acceptation" : "Envoyer la contestation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MesSanctions() {
  const [sanctions, setSanctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const charger = () => {
    getSanctions()
      .then((r) => setSanctions(r.data.results ?? r.data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []);

  return (
    <EmployeLayout pageTitle="Mes sanctions">
      {modal && (
        <ModalReponse
          sanction={modal}
          onClose={() => setModal(null)}
          onSuccess={charger}
        />
      )}

      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      ) : sanctions.length === 0 ? (
        <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
          <i className="fas fa-shield-alt fa-3x mb-3 d-block" style={{ color: "#28a745" }} />
          <strong style={{ color: "var(--page-title)" }}>Aucune sanction</strong>
          <p className="mb-0">Vous n'avez aucune sanction disciplinaire.</p>
        </div>
      ) : (
        <div>
          {sanctions.map((s) => {
            const gravite = GRAVITE_CONFIG[s.gravite] || GRAVITE_CONFIG[1];
            const peutRepondre = s.statut === "NOTIFIEE";

            return (
              <div
                key={s.id}
                className="card mb-3"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderLeft: `4px solid ${gravite.color}`,
                }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                      <div className="d-flex align-items-center mb-1">
                        <i
                          className={`fas fa-${gravite.icon} mr-2`}
                          style={{ color: gravite.color, fontSize: "1.1rem" }}
                        />
                        <strong style={{ color: "var(--page-title)", fontSize: "1rem" }}>
                          {TYPE_LABEL[s.type_sanction] || s.type_sanction_display}
                        </strong>
                        <span
                          className="ml-2"
                          style={{
                            fontSize: "0.73rem", padding: "2px 8px", borderRadius: 10,
                            background: `${gravite.color}22`, color: gravite.color, fontWeight: 600,
                          }}
                        >
                          {gravite.label}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        <div><i className="fas fa-calendar mr-1" />
                          Sanction du {new Date(s.date_sanction).toLocaleDateString("fr-FR")}
                        </div>
                        {s.date_faits && (
                          <div><i className="fas fa-exclamation-circle mr-1" />
                            Faits du {new Date(s.date_faits).toLocaleDateString("fr-FR")}
                          </div>
                        )}
                        {(s.date_debut_effet || s.date_fin_effet) && (
                          <div>
                            <i className="fas fa-hourglass mr-1" />
                            Effet : {s.date_debut_effet ? new Date(s.date_debut_effet).toLocaleDateString("fr-FR") : "—"}
                            {s.date_fin_effet && ` → ${new Date(s.date_fin_effet).toLocaleDateString("fr-FR")}`}
                            {s.duree_jours && ` (${s.duree_jours} jours)`}
                          </div>
                        )}
                      </div>

                      {s.motif && (
                        <div className="mt-2" style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          <strong>Motif :</strong> {s.motif}
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

                  {/* Mesures correctives */}
                  {s.mesures_correctives && (
                    <div
                      className="mt-2 p-2"
                      style={{
                        background: "rgba(40,167,69,0.1)", borderRadius: 4,
                        fontSize: "0.83rem", color: "var(--text-primary)",
                      }}
                    >
                      <i className="fas fa-tasks mr-1 text-success" />
                      <strong>Mesures correctives :</strong> {s.mesures_correctives}
                    </div>
                  )}

                  {/* Réponse déjà donnée */}
                  {s.reponse_employe && (
                    <div
                      className="mt-2 p-2"
                      style={{
                        background: "rgba(23,162,184,0.1)", borderRadius: 4,
                        fontSize: "0.83rem", color: "var(--text-primary)",
                      }}
                    >
                      <i className="fas fa-reply mr-1 text-info" />
                      <strong>Votre réponse :</strong> {s.reponse_employe}
                    </div>
                  )}

                  {/* Bouton répondre */}
                  {peutRepondre && !s.reponse_employe && (
                    <div className="mt-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setModal(s)}
                      >
                        <i className="fas fa-reply mr-1" /> Répondre à cette sanction
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
