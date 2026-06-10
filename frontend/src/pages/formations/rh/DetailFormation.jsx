import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getFormation, getInscriptions, validerInscription, marquerPresence, terminerFormation,
} from "../../../api/formations";

const STATUT_BADGE = {
  EN_ATTENTE: "warning", INSCRIT: "primary", PRESENT: "success", ABSENT: "danger", ANNULE: "secondary",
};

export default function DetailFormation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [terminating, setTerminating] = useState(false);

  const charger = () => {
    Promise.all([getFormation(id), getInscriptions({ formation: id })])
      .then(([fRes, iRes]) => {
        setFormation(fRes.data);
        setInscriptions(iRes.data.results ?? iRes.data);
      })
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(charger, [id]);

  const handleValider = async (inscId) => {
    setActionId(inscId);
    try {
      const r = await validerInscription(inscId);
      setInscriptions((prev) => prev.map((i) => i.id === inscId ? r.data : i));
      toast.success("Inscription validée");
    } catch {
      toast.error("Erreur validation");
    } finally {
      setActionId(null);
    }
  };

  const handlePresence = async (inscId, present) => {
    setActionId(inscId);
    try {
      const r = await marquerPresence(inscId, { present });
      setInscriptions((prev) => prev.map((i) => i.id === inscId ? r.data : i));
      toast.success(present ? "Présence marquée" : "Absence marquée");
    } catch {
      toast.error("Erreur");
    } finally {
      setActionId(null);
    }
  };

  const handlePresenceMasse = async (present) => {
    const eligibles = inscriptions.filter((i) => i.statut === "INSCRIT");
    if (!eligibles.length) return toast.error("Aucun inscrit confirmé");
    if (!window.confirm(`Marquer ${present ? "présent" : "absent"} les ${eligibles.length} inscrits ?`)) return;
    try {
      await Promise.all(eligibles.map((i) => marquerPresence(i.id, { present })));
      charger();
      toast.success("Présences mises à jour");
    } catch {
      toast.error("Erreur présences masse");
    }
  };

  const handleTerminer = async () => {
    if (!window.confirm("Marquer cette formation comme terminée ?")) return;
    setTerminating(true);
    try {
      await terminerFormation(id);
      setFormation((prev) => ({ ...prev, statut: "TERMINEE" }));
      toast.success("Formation terminée");
    } catch {
      toast.error("Erreur");
    } finally {
      setTerminating(false);
    }
  };

  if (loading) return (
    <RHLayout pageTitle="Détail formation">
      <div className="text-center py-5">
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
      </div>
    </RHLayout>
  );

  if (!formation) return (
    <RHLayout pageTitle="Formation introuvable">
      <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>Formation introuvable.</div>
    </RHLayout>
  );

  const presents = inscriptions.filter((i) => i.statut === "PRESENT").length;
  const inscritsConfirmes = inscriptions.filter((i) => i.statut === "INSCRIT").length;
  const enAttente = inscriptions.filter((i) => i.statut === "EN_ATTENTE").length;

  return (
    <RHLayout pageTitle={formation.titre}>
      {/* Header */}
      <div
        className="card mb-3"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderTop: `4px solid ${formation.categorie_detail?.couleur || "var(--acerfi-blue)"}`,
        }}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap">
            <div>
              <div style={{ fontSize: "0.8rem", color: formation.categorie_detail?.couleur, fontWeight: 600 }}>
                <i className={`${formation.categorie_detail?.icone} mr-1`} />
                {formation.categorie_detail?.nom}
              </div>
              <h4 style={{ color: "var(--page-title)", fontWeight: 700, margin: "4px 0" }}>{formation.titre}</h4>
              <div style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                <span className="mr-3"><i className="fas fa-clock mr-1" />{formation.duree_heures}h</span>
                {formation.date_debut && (
                  <span className="mr-3">
                    <i className="fas fa-calendar mr-1" />
                    {new Date(formation.date_debut).toLocaleDateString("fr-FR")}
                    {formation.date_fin && ` → ${new Date(formation.date_fin).toLocaleDateString("fr-FR")}`}
                  </span>
                )}
                {formation.lieu && <span className="mr-3"><i className="fas fa-map-marker-alt mr-1" />{formation.lieu}</span>}
                {formation.formateur && <span><i className="fas fa-chalkboard-teacher mr-1" />{formation.formateur}</span>}
              </div>
            </div>
            <div className="d-flex gap-2 mt-2 flex-wrap">
              {formation.statut !== "TERMINEE" && formation.statut !== "ANNULEE" && (
                <Link to={`/rh/formations/${id}/modifier`} className="btn btn-sm btn-outline-warning">
                  <i className="fas fa-edit mr-1" /> Modifier
                </Link>
              )}
              {(formation.statut === "PLANIFIEE" || formation.statut === "EN_COURS") && (
                <button className="btn btn-sm btn-success" onClick={handleTerminer} disabled={terminating}>
                  {terminating ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-check-double mr-1" />}
                  Terminer
                </button>
              )}
              <Link to="/rh/formations" className="btn btn-sm btn-secondary">
                <i className="fas fa-arrow-left mr-1" /> Retour
              </Link>
            </div>
          </div>

          {formation.description && (
            <p className="mt-3 mb-0" style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>
              {formation.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats inscriptions */}
      <div className="row mb-3">
        {[
          { label: "En attente", val: enAttente, color: "#ffc107" },
          { label: "Inscrits confirmés", val: inscritsConfirmes, color: "#007bff" },
          { label: "Présents", val: presents, color: "#28a745" },
          { label: "Places restantes", val: formation.places_restantes, color: "#17a2b8" },
        ].map((s) => (
          <div key={s.label} className="col-md-3 col-sm-6 mb-2">
            <div className="card" style={{ background: "var(--card-bg)", borderLeft: `4px solid ${s.color}`, border: "1px solid var(--border-color)" }}>
              <div className="card-body py-2 px-3">
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--page-title)" }}>{s.val}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Participants */}
      <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}
        >
          <h5 style={{ color: "var(--page-title)", margin: 0 }}>
            <i className="fas fa-users mr-2" style={{ color: "var(--acerfi-blue)" }} />
            Participants ({inscriptions.length})
          </h5>
          {formation.statut === "EN_COURS" && (
            <div className="d-flex gap-2">
              <button className="btn btn-xs btn-success" onClick={() => handlePresenceMasse(true)}>
                <i className="fas fa-check mr-1" /> Tous présents
              </button>
              <button className="btn btn-xs btn-danger" onClick={() => handlePresenceMasse(false)}>
                <i className="fas fa-times mr-1" /> Tous absents
              </button>
            </div>
          )}
        </div>
        <div className="card-body p-0">
          {inscriptions.length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <i className="fas fa-users fa-3x mb-3 d-block" />
              Aucune inscription pour le moment.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    <th>Employé</th>
                    <th>Département</th>
                    <th>Statut</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map((i) => (
                    <tr key={i.id} style={{ color: "var(--text-primary)" }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {i.employe_detail?.first_name} {i.employe_detail?.last_name}
                        </div>
                        <small style={{ color: "var(--text-muted)" }}>{i.employe_detail?.email}</small>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{i.employe_detail?.departement_nom || "—"}</td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[i.statut]}`}>
                          {i.statut_display}
                        </span>
                      </td>
                      <td>
                        {i.note_formation ? (
                          <span style={{ color: "#ffc107", fontSize: "0.9rem" }}>
                            {"★".repeat(i.note_formation)}{"☆".repeat(5 - i.note_formation)}
                          </span>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {i.statut === "EN_ATTENTE" && (
                            <button
                              className="btn btn-xs btn-success"
                              title="Valider inscription"
                              onClick={() => handleValider(i.id)}
                              disabled={actionId === i.id}
                            >
                              <i className="fas fa-check" />
                            </button>
                          )}
                          {i.statut === "INSCRIT" && (
                            <>
                              <button
                                className="btn btn-xs btn-outline-success"
                                title="Présent"
                                onClick={() => handlePresence(i.id, true)}
                                disabled={actionId === i.id}
                              >
                                <i className="fas fa-user-check" />
                              </button>
                              <button
                                className="btn btn-xs btn-outline-danger"
                                title="Absent"
                                onClick={() => handlePresence(i.id, false)}
                                disabled={actionId === i.id}
                              >
                                <i className="fas fa-user-times" />
                              </button>
                            </>
                          )}
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
