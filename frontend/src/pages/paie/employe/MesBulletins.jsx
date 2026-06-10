import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import EmployeLayout from "../../../components/layout/EmployeLayout";
import { getMesBulletins, telechargerPdf } from "../../../api/paie";

const STATUT_BADGE = {
  BROUILLON: "secondary",
  VALIDE:    "primary",
  PAYE:      "success",
};

const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function MesBulletins() {
  const [bulletins, setBulletins] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dlId,      setDlId]      = useState(null);

  useEffect(() => {
    getMesBulletins()
      .then(r => setBulletins(r.data.results ?? r.data))
      .catch(() => toast.error("Erreur lors du chargement des bulletins"))
      .finally(() => setLoading(false));
  }, []);

  const handleTelechargement = async (id) => {
    setDlId(id);
    try {
      const r = await telechargerPdf(id);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = r.headers["content-disposition"]?.split('filename="')[1]?.replace('"', "") || `bulletin_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDlId(null);
    }
  };

  const dernier = bulletins[0];

  return (
    <EmployeLayout pageTitle="Mes bulletins de paie">
      {/* Récap dernier bulletin */}
      {dernier && (
        <div className="row mb-3">
          {[
            { label: "Salaire brut", val: `${Number(dernier.salaire_brut).toLocaleString("fr-FR")} FCFA`, color: "#2E74B5", icon: "file-invoice" },
            { label: "CNPS employé", val: `${Number(dernier.cnps_employe).toLocaleString("fr-FR")} FCFA`, color: "#fd7e14", icon: "shield-alt" },
            { label: "IRPP",         val: `${Number(dernier.irpp).toLocaleString("fr-FR")} FCFA`,         color: "#6f42c1", icon: "landmark" },
            { label: "Net à payer",  val: `${Number(dernier.salaire_net).toLocaleString("fr-FR")} FCFA`,  color: "#28a745", icon: "money-bill-wave" },
          ].map(s => (
            <div key={s.label} className="col-lg-3 col-md-6 mb-2">
              <div className="card" style={{ background: "var(--card-bg)", borderLeft: `4px solid ${s.color}` }}>
                <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--page-title)" }}>{s.val}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {s.label} — {MOIS_LABELS[dernier.mois]} {dernier.annee}
                    </div>
                  </div>
                  <i className={`fas fa-${s.icon} fa-lg`} style={{ color: s.color, opacity: 0.6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ background: "var(--card-bg)" }}>
        <div className="card-header d-flex justify-content-between align-items-center"
             style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
          <h3 className="card-title m-0" style={{ color: "var(--page-title)", fontSize: 15 }}>
            <i className="fas fa-history mr-2" style={{ color: "var(--acerfi-blue)" }} />
            Historique de mes bulletins
          </h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : bulletins.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-file-invoice fa-3x mb-3 d-block" style={{ opacity: 0.3 }} />
              <strong>Aucun bulletin disponible</strong>
              <p className="mt-1 mb-0" style={{ fontSize: 13 }}>Vos bulletins apparaîtront ici une fois générés par le service RH.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ background: "var(--card-bg)", color: "var(--text-muted)", fontSize: 12 }}>
                    <th>Période</th>
                    <th className="text-right">Salaire brut</th>
                    <th className="text-right">CNPS</th>
                    <th className="text-right">IRPP</th>
                    <th className="text-right">Net à payer</th>
                    <th>Statut</th>
                    <th>Paiement</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.map(b => (
                    <tr key={b.id} style={{ color: "var(--text-primary)" }}>
                      <td className="font-weight-bold" style={{ color: "var(--page-title)" }}>
                        {MOIS_LABELS[b.mois]} {b.annee}
                      </td>
                      <td className="text-right">{Number(b.salaire_brut).toLocaleString("fr-FR")}</td>
                      <td className="text-right" style={{ color: "#fd7e14" }}>
                        {Number(b.cnps_employe).toLocaleString("fr-FR")}
                      </td>
                      <td className="text-right" style={{ color: "#6f42c1" }}>
                        {Number(b.irpp).toLocaleString("fr-FR")}
                      </td>
                      <td className="text-right font-weight-bold" style={{ color: "#28a745" }}>
                        {Number(b.salaire_net).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[b.statut] || "secondary"}`}>
                          {b.statut_display}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {b.date_paiement
                          ? new Date(b.date_paiement).toLocaleDateString("fr-FR")
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-outline-primary"
                          onClick={() => handleTelechargement(b.id)}
                          disabled={dlId === b.id}
                          title="Télécharger le bulletin"
                        >
                          {dlId === b.id
                            ? <i className="fas fa-spinner fa-spin" />
                            : <i className="fas fa-download" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EmployeLayout>
  );
}
