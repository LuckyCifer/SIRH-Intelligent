import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../components/layout/RHLayout";
import EtoilesNote from "../../components/ui/EtoilesNote";
import NiveauPerformance from "../../components/ui/NiveauPerformance";
import {
  getEvaluations,
  getPeriodes,
  signerEvaluation,
  relancerIA,
  getTableauBord,
} from "../../api/objectifs";

const COULEUR_STATUT = {
  BROUILLON: "secondary", EN_ATTENTE: "warning", SIGNE: "success", CONTESTE: "danger",
};

export default function TableauEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [periodes, setPeriodes] = useState([]);
  const [periodeId, setPeriodeId] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signatureModal, setSignatureModal] = useState(null);
  const [commentaireRH, setCommentaireRH] = useState("");

  const charger = (pid) => {
    setLoading(true);
    const params = pid ? { periode: pid } : {};
    Promise.all([
      getEvaluations(params),
      getTableauBord(pid || null),
    ])
      .then(([ev, tb]) => {
        setEvaluations(ev.data.results ?? ev.data);
        setStats(tb.data);
      })
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getPeriodes().then((r) => setPeriodes(r.data.results ?? r.data)).catch(() => {});
    charger("");
  }, []);

  const handleSigner = async (id) => {
    try {
      await signerEvaluation(id, { commentaire_rh: commentaireRH });
      toast.success("Évaluation signée");
      setSignatureModal(null);
      charger(periodeId);
    } catch {
      toast.error("Erreur signature");
    }
  };

  const handleRelancerIA = async (id) => {
    try {
      await relancerIA(id);
      toast.success("Analyse IA relancée");
    } catch {
      toast.error("Erreur relance IA");
    }
  };

  return (
    <RHLayout>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0" style={{ color: "var(--page-title)" }}>
                Tableau des Évaluations
              </h1>
            </div>
            <div className="col-sm-6 text-right">
              <select
                className="form-control form-control-sm d-inline-block w-auto"
                value={periodeId}
                onChange={(e) => { setPeriodeId(e.target.value); charger(e.target.value); }}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              >
                <option value="">Toutes les périodes</option>
                {periodes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {/* Stats */}
          {stats && (
            <div className="row mb-3">
              {[
                { label: "Total", valeur: stats.total, icone: "chart-bar" },
                { label: "Note moyenne", valeur: stats.note_moyenne ? Number(stats.note_moyenne).toFixed(2) + "/5" : "—", icone: "star" },
                { label: "Score IA moyen", valeur: stats.score_ia_moyen ? Math.round(stats.score_ia_moyen) + "/100" : "—", icone: "robot" },
              ].map((k) => (
                <div key={k.label} className="col-md-4">
                  <div className="info-box" style={{ background: "var(--card-bg)" }}>
                    <span className="info-box-icon bg-primary">
                      <i className={`fas fa-${k.icone}`} />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text" style={{ color: "var(--text-muted)" }}>{k.label}</span>
                      <span className="info-box-number" style={{ color: "var(--text-primary)" }}>{k.valeur}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-list-alt mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Évaluations ({evaluations.length})
              </h3>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
                </div>
              ) : evaluations.length === 0 ? (
                <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-inbox fa-3x mb-3 d-block" />
                  Aucune évaluation
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th>Employé</th>
                        <th>Période</th>
                        <th>Note globale</th>
                        <th>Niveau IA</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map((ev) => (
                        <tr key={ev.id} style={{ color: "var(--text-primary)" }}>
                          <td>{ev.employe_detail?.nom_complet}</td>
                          <td style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                            {ev.periode_detail?.nom}
                          </td>
                          <td>
                            {ev.note_globale ? (
                              <EtoilesNote note={ev.note_globale} taille="sm" />
                            ) : "—"}
                          </td>
                          <td>
                            {ev.analyse_ia ? (
                              <NiveauPerformance
                                niveau={ev.analyse_ia.niveau_performance}
                                score={ev.score_ia}
                              />
                            ) : (
                              <span className="badge badge-secondary">En attente</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${COULEUR_STATUT[ev.statut]}`}>
                              {ev.statut_display}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link
                                to={`/rh/evaluations/${ev.id}`}
                                className="btn btn-outline-primary"
                                title="Voir"
                              >
                                <i className="fas fa-eye" />
                              </Link>
                              {ev.statut === "EN_ATTENTE" && (
                                <button
                                  className="btn btn-outline-success"
                                  title="Signer"
                                  onClick={() => { setSignatureModal(ev); setCommentaireRH(""); }}
                                >
                                  <i className="fas fa-signature" />
                                </button>
                              )}
                              <button
                                className="btn btn-outline-secondary"
                                title="Relancer IA"
                                onClick={() => handleRelancerIA(ev.id)}
                              >
                                <i className="fas fa-robot" />
                              </button>
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
        </div>
      </div>

      {/* Modal signature */}
      {signatureModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSignatureModal(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ background: "var(--card-bg)" }}>
              <div className="modal-header">
                <h5 className="modal-title" style={{ color: "var(--page-title)" }}>
                  Signer l'évaluation — {signatureModal.employe_detail?.nom_complet}
                </h5>
                <button className="close" onClick={() => setSignatureModal(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <label style={{ color: "var(--text-primary)" }}>Commentaire RH (optionnel)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={commentaireRH}
                  onChange={(e) => setCommentaireRH(e.target.value)}
                  style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSignatureModal(null)}>
                  Annuler
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleSigner(signatureModal.id)}
                >
                  <i className="fas fa-signature mr-1" /> Confirmer la signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RHLayout>
  );
}
