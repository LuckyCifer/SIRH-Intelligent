import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import RHLayout from "../../components/layout/RHLayout";
import BarreProgression from "../../components/ui/BarreProgression";
import { getObjectifs, getPeriodes, updateObjectif, deleteObjectif } from "../../api/objectifs";

const COULEUR_PRIORITE = {
  FAIBLE: "secondary", MOYENNE: "info", HAUTE: "warning", CRITIQUE: "danger",
};
const COULEUR_STATUT = {
  NON_COMMENCE: "secondary", EN_COURS: "primary", ATTEINT: "success",
  DEPASSE: "success", NON_ATTEINT: "danger", ABANDONNE: "dark",
};

export default function GestionObjectifs() {
  const [objectifs, setObjectifs] = useState([]);
  const [periodes, setPeriodes] = useState([]);
  const [filtres, setFiltres] = useState({ periode: "", statut: "" });
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editStatut, setEditStatut] = useState("");

  const charger = (params = {}) => {
    setLoading(true);
    getObjectifs(params)
      .then((r) => setObjectifs(r.data.results ?? r.data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getPeriodes().then((r) => setPeriodes(r.data.results ?? r.data)).catch(() => {});
    charger();
  }, []);

  const appliquerFiltres = () => {
    const params = {};
    if (filtres.periode) params.periode = filtres.periode;
    if (filtres.statut) params.statut = filtres.statut;
    charger(params);
  };

  const handleMajStatut = async (id) => {
    try {
      const r = await updateObjectif(id, { statut: editStatut });
      setObjectifs((prev) => prev.map((o) => (o.id === id ? r.data : o)));
      setEditId(null);
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur mise à jour");
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Supprimer cet objectif ?")) return;
    try {
      await deleteObjectif(id);
      setObjectifs((prev) => prev.filter((o) => o.id !== id));
      toast.success("Objectif supprimé");
    } catch {
      toast.error("Erreur suppression");
    }
  };

  return (
    <RHLayout>
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0" style={{ color: "var(--page-title)" }}>
            Gestion des Objectifs
          </h1>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {/* Filtres */}
          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-body">
              <div className="row align-items-end">
                <div className="col-md-4 form-group mb-0">
                  <label style={{ color: "var(--text-primary)" }}>Période</label>
                  <select
                    className="form-control"
                    value={filtres.periode}
                    onChange={(e) => setFiltres((f) => ({ ...f, periode: e.target.value }))}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  >
                    <option value="">Toutes</option>
                    {periodes.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 form-group mb-0">
                  <label style={{ color: "var(--text-primary)" }}>Statut</label>
                  <select
                    className="form-control"
                    value={filtres.statut}
                    onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value }))}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  >
                    <option value="">Tous</option>
                    {["NON_COMMENCE", "EN_COURS", "ATTEINT", "DEPASSE", "NON_ATTEINT", "ABANDONNE"].map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <button className="btn btn-primary" onClick={appliquerFiltres}>
                    <i className="fas fa-filter mr-1" /> Filtrer
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-bullseye mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Tous les objectifs ({objectifs.length})
              </h3>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
                </div>
              ) : objectifs.length === 0 ? (
                <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-inbox fa-3x mb-3 d-block" />
                  Aucun objectif trouvé
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th>Employé</th>
                        <th>Titre</th>
                        <th>Période</th>
                        <th>Priorité</th>
                        <th>Statut</th>
                        <th style={{ minWidth: 130 }}>Progression</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectifs.map((o) => (
                        <tr key={o.id} style={{ color: "var(--text-primary)" }}>
                          <td>{o.employe_detail?.nom_complet}</td>
                          <td>{o.titre}</td>
                          <td style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                            {o.periode_detail?.nom}
                          </td>
                          <td>
                            <span className={`badge badge-${COULEUR_PRIORITE[o.priorite]}`}>
                              {o.priorite_display}
                            </span>
                          </td>
                          <td>
                            {editId === o.id ? (
                              <div className="d-flex align-items-center gap-1">
                                <select
                                  className="form-control form-control-sm"
                                  value={editStatut}
                                  onChange={(e) => setEditStatut(e.target.value)}
                                  style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                                >
                                  {["NON_COMMENCE", "EN_COURS", "ATTEINT", "DEPASSE", "NON_ATTEINT", "ABANDONNE"].map((s) => (
                                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                                  ))}
                                </select>
                                <button className="btn btn-xs btn-success" onClick={() => handleMajStatut(o.id)}>
                                  <i className="fas fa-check" />
                                </button>
                                <button className="btn btn-xs btn-secondary" onClick={() => setEditId(null)}>
                                  <i className="fas fa-times" />
                                </button>
                              </div>
                            ) : (
                              <span className={`badge badge-${COULEUR_STATUT[o.statut]}`}>
                                {o.statut_display}
                              </span>
                            )}
                          </td>
                          <td><BarreProgression valeur={o.progression} /></td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                title="Modifier statut"
                                onClick={() => { setEditId(o.id); setEditStatut(o.statut); }}
                              >
                                <i className="fas fa-edit" />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="Supprimer"
                                onClick={() => handleSupprimer(o.id)}
                              >
                                <i className="fas fa-trash" />
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
    </RHLayout>
  );
}
