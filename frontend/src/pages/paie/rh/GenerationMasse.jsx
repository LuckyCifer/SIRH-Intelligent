import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import { genererMasse } from "../../../api/paie";

const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function GenerationMasse() {
  const now = new Date();
  const [mois,       setMois]       = useState(String(now.getMonth() + 1));
  const [annee,      setAnnee]      = useState(String(now.getFullYear()));
  const [loading,    setLoading]    = useState(false);
  const [resultat,   setResultat]   = useState(null);

  const handleGenerer = async (e) => {
    e.preventDefault();
    if (!window.confirm(
      `Générer les bulletins de paie pour ${MOIS_LABELS[Number(mois)]} ${annee} ?\n\n` +
      `Les bulletins déjà existants pour cette période seront ignorés (opération idempotente).`
    )) return;

    setLoading(true);
    setResultat(null);
    try {
      const r = await genererMasse({ mois: Number(mois), annee: Number(annee) });
      setResultat(r.data);
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RHLayout pageTitle="Génération des bulletins en masse">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8">
          <div className="card" style={{ background: "var(--card-bg)" }}>
            <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-cogs mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Génération mensuelle
              </h3>
            </div>
            <div className="card-body">
              <div className="alert alert-info" style={{ fontSize: 13 }}>
                <i className="fas fa-info-circle mr-2" />
                Cette opération génère automatiquement un bulletin de paie pour chaque employé actif,
                en récupérant le salaire depuis le contrat en cours.
                Les bulletins déjà existants pour la période sélectionnée sont ignorés.
              </div>

              <form onSubmit={handleGenerer}>
                <div className="row">
                  <div className="col-6">
                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)", fontWeight: 600 }}>Mois</label>
                      <select className="form-control"
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                        value={mois} onChange={e => setMois(e.target.value)} required>
                        {MOIS_LABELS.slice(1).map((m, i) => (
                          <option key={i + 1} value={String(i + 1)}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)", fontWeight: 600 }}>Année</label>
                      <select className="form-control"
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                        value={annee} onChange={e => setAnnee(e.target.value)} required>
                        {[2024, 2025, 2026, 2027].map(y => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-2">
                  <Link to="/rh/paie" className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-arrow-left mr-1" />Retour
                  </Link>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading
                      ? <><i className="fas fa-spinner fa-spin mr-2" />Génération en cours…</>
                      : <><i className="fas fa-play-circle mr-2" />Générer les bulletins</>}
                  </button>
                </div>
              </form>

              {/* Résultat */}
              {resultat && (
                <div className="mt-4">
                  <div className="alert alert-success">
                    <i className="fas fa-check-circle mr-2" />
                    <strong>Génération terminée</strong>
                  </div>
                  <div className="row text-center">
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: "rgba(40,167,69,0.1)" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#28a745" }}>
                          {resultat.crees}
                        </div>
                        <small style={{ color: "var(--text-muted)" }}>Bulletins créés</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: "rgba(108,117,125,0.1)" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6c757d" }}>
                          {resultat.ignores}
                        </div>
                        <small style={{ color: "var(--text-muted)" }}>Existants ignorés</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: "rgba(46,116,181,0.1)" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--acerfi-blue)" }}>
                          {resultat.crees + resultat.ignores}
                        </div>
                        <small style={{ color: "var(--text-muted)" }}>Total employés</small>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Link to="/rh/paie" className="btn btn-primary btn-sm">
                      <i className="fas fa-list mr-1" />Voir les bulletins générés
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RHLayout>
  );
}
