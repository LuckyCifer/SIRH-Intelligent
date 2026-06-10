import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import { getBulletin, validerBulletin, marquerPaye, telechargerPdf } from "../../../api/paie";

const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUT_BADGE = { BROUILLON: "secondary", VALIDE: "primary", PAYE: "success" };

function LigneCalc({ label, montant, couleur, indent }) {
  return (
    <tr style={{ color: "var(--text-primary)" }}>
      <td style={{ paddingLeft: indent ? 24 : 12 }}>{label}</td>
      <td className="text-right font-weight-bold" style={{ color: couleur || "var(--page-title)" }}>
        {Number(montant).toLocaleString("fr-FR")} FCFA
      </td>
    </tr>
  );
}

export default function DetailBulletin() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [bulletin,  setBulletin]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [actionId,  setActionId]  = useState(null);

  useEffect(() => {
    getBulletin(id)
      .then(r => setBulletin(r.data))
      .catch(() => { toast.error("Bulletin introuvable"); navigate("/rh/paie"); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleValider = async () => {
    if (!window.confirm("Valider ce bulletin ?")) return;
    setActionId("valider");
    try {
      const r = await validerBulletin(id);
      setBulletin(r.data);
      toast.success("Bulletin validé");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erreur");
    } finally { setActionId(null); }
  };

  const handlePayer = async () => {
    if (!window.confirm("Marquer comme payé ?")) return;
    setActionId("payer");
    try {
      const r = await marquerPaye(id, {});
      setBulletin(r.data);
      toast.success("Bulletin marqué payé");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erreur");
    } finally { setActionId(null); }
  };

  const handleDl = async () => {
    setActionId("dl");
    try {
      const r = await telechargerPdf(id);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.headers["content-disposition"]?.split('filename="')[1]?.replace('"', "") || `bulletin_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Erreur téléchargement"); }
    finally { setActionId(null); }
  };

  if (loading) {
    return (
      <RHLayout pageTitle="Bulletin de paie">
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      </RHLayout>
    );
  }

  if (!bulletin) return null;

  const b = bulletin;
  const totalBrut = Number(b.salaire_brut) + Number(b.total_primes);

  return (
    <RHLayout pageTitle={`Bulletin — ${b.employe_detail?.nom_complet} — ${MOIS_LABELS[b.mois]} ${b.annee}`}>
      <div className="row">
        {/* Fiche employé */}
        <div className="col-md-4 mb-3">
          <div className="card h-100" style={{ background: "var(--card-bg)" }}>
            <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="card-title" style={{ color: "var(--page-title)", fontSize: 14 }}>
                <i className="fas fa-user mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Informations employé
              </h3>
            </div>
            <div className="card-body">
              <dl className="mb-0" style={{ fontSize: 13 }}>
                <dt style={{ color: "var(--text-muted)" }}>Nom complet</dt>
                <dd style={{ color: "var(--page-title)", fontWeight: 600 }}>{b.employe_detail?.nom_complet}</dd>
                <dt style={{ color: "var(--text-muted)" }}>Email</dt>
                <dd style={{ color: "var(--text-primary)" }}>{b.employe_detail?.email || "—"}</dd>
                <dt style={{ color: "var(--text-muted)" }}>Période</dt>
                <dd style={{ color: "var(--page-title)", fontWeight: 600 }}>{MOIS_LABELS[b.mois]} {b.annee}</dd>
                <dt style={{ color: "var(--text-muted)" }}>Statut</dt>
                <dd>
                  <span className={`badge badge-${STATUT_BADGE[b.statut] || "secondary"}`}>
                    {b.statut_display}
                  </span>
                </dd>
                {b.date_paiement && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>Date de paiement</dt>
                    <dd style={{ color: "var(--text-primary)" }}>
                      {new Date(b.date_paiement).toLocaleDateString("fr-FR")}
                    </dd>
                  </>
                )}
                {b.valide_par_detail && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>Validé par</dt>
                    <dd style={{ color: "var(--text-primary)" }}>{b.valide_par_detail.nom_complet}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Détail calcul */}
        <div className="col-md-8 mb-3">
          <div className="card" style={{ background: "var(--card-bg)" }}>
            <div className="card-header d-flex justify-content-between align-items-center"
                 style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="card-title" style={{ color: "var(--page-title)", fontSize: 14 }}>
                <i className="fas fa-calculator mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Détail du calcul
              </h3>
              <div className="d-flex" style={{ gap: 6 }}>
                {b.statut === "BROUILLON" && (
                  <button className="btn btn-sm btn-primary" onClick={handleValider} disabled={actionId === "valider"}>
                    {actionId === "valider" ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-check mr-1" />}
                    Valider
                  </button>
                )}
                {b.statut === "VALIDE" && (
                  <button className="btn btn-sm btn-success" onClick={handlePayer} disabled={actionId === "payer"}>
                    {actionId === "payer" ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-money-bill-wave mr-1" />}
                    Marquer payé
                  </button>
                )}
                <button className="btn btn-sm btn-outline-info" onClick={handleDl} disabled={actionId === "dl"}>
                  {actionId === "dl" ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-download mr-1" />}
                  PDF
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <tbody>
                    <tr style={{ background: "rgba(46,116,181,0.07)" }}>
                      <td colSpan="2" style={{ fontWeight: 600, color: "var(--acerfi-blue)", fontSize: 12, padding: "6px 12px" }}>
                        GAINS
                      </td>
                    </tr>
                    <LigneCalc label="Salaire de base" montant={b.salaire_brut} couleur="var(--page-title)" />
                    {Number(b.total_primes) > 0 && (
                      <LigneCalc label="Primes & indemnités" montant={b.total_primes} couleur="var(--page-title)" indent />
                    )}
                    <tr style={{ background: "var(--border-color)" }}>
                      <td style={{ fontWeight: 700, color: "var(--page-title)", padding: "6px 12px" }}>Total brut</td>
                      <td className="text-right font-weight-bold" style={{ color: "var(--page-title)", padding: "6px 12px" }}>
                        {totalBrut.toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>

                    <tr style={{ background: "rgba(220,53,69,0.06)" }}>
                      <td colSpan="2" style={{ fontWeight: 600, color: "#dc3545", fontSize: 12, padding: "6px 12px" }}>
                        COTISATIONS & IMPÔTS
                      </td>
                    </tr>
                    <tr style={{ color: "var(--text-primary)" }}>
                      <td style={{ paddingLeft: 12 }}>CNPS employé (2,8 %)</td>
                      <td className="text-right font-weight-bold" style={{ color: "#dc3545" }}>
                        - {Number(b.cnps_employe).toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                    <tr style={{ color: "var(--text-primary)" }}>
                      <td style={{ paddingLeft: 12 }}>IRPP</td>
                      <td className="text-right font-weight-bold" style={{ color: "#dc3545" }}>
                        - {Number(b.irpp).toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                    {Number(b.autres_retenues) > 0 && (
                      <tr style={{ color: "var(--text-primary)" }}>
                        <td style={{ paddingLeft: 12 }}>Autres retenues</td>
                        <td className="text-right font-weight-bold" style={{ color: "#dc3545" }}>
                          - {Number(b.autres_retenues).toLocaleString("fr-FR")} FCFA
                        </td>
                      </tr>
                    )}

                    <tr style={{ background: "rgba(40,167,69,0.08)" }}>
                      <td style={{ fontWeight: 700, fontSize: 15, color: "#155724", padding: "10px 12px" }}>
                        NET À PAYER
                      </td>
                      <td className="text-right" style={{ fontWeight: 700, fontSize: 15, color: "#28a745", padding: "10px 12px" }}>
                        {Number(b.salaire_net).toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-1">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/rh/paie")}>
          <i className="fas fa-arrow-left mr-1" />Retour à la liste
        </button>
      </div>
    </RHLayout>
  );
}
