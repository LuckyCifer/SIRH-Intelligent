import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { getBulletin, validerBulletin, marquerPaye, telechargerPdf } from "../../../api/paie";
import { useApercu, nomDepuisEntetes } from "../../../components/ui/useApercu";

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
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const { voirFichier, apercuModal } = useApercu();
  const [bulletin, setBulletin] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [actionId, setActionId] = useState(null);

  const MOIS_LABELS = [
    "",
    t("common.months.1"),  t("common.months.2"),  t("common.months.3"),
    t("common.months.4"),  t("common.months.5"),  t("common.months.6"),
    t("common.months.7"),  t("common.months.8"),  t("common.months.9"),
    t("common.months.10"), t("common.months.11"), t("common.months.12"),
  ];

  useEffect(() => {
    getBulletin(id)
      .then(r => setBulletin(r.data))
      .catch(() => { toast.error(t("paie_extra.bulletin_not_found")); navigate("/rh/paie"); })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const handleValider = async () => {
    if (!window.confirm(t("paie_extra.validate_confirm"))) return;
    setActionId("valider");
    try {
      const r = await validerBulletin(id);
      setBulletin(r.data);
      toast.success(t("paie_extra.validated_msg"));
    } catch (e) {
      toast.error(e?.response?.data?.error || t("paie_extra.error_generic"));
    } finally { setActionId(null); }
  };

  const handlePayer = async () => {
    if (!window.confirm(t("paie_extra.pay_confirm"))) return;
    setActionId("payer");
    try {
      const r = await marquerPaye(id, {});
      setBulletin(r.data);
      toast.success(t("paie_extra.paid_msg"));
    } catch (e) {
      toast.error(e?.response?.data?.error || t("paie_extra.error_generic"));
    } finally { setActionId(null); }
  };

  const handleDl = async () => {
    setActionId("dl");
    try {
      const r = await telechargerPdf(id);
      voirFichier(r.data, nomDepuisEntetes(r.headers, `bulletin_${id}.pdf`));
    } catch { toast.error(t("paie_extra.dl_error")); }
    finally { setActionId(null); }
  };

  if (loading) {
    return (
      <RHLayout pageTitle={t("paie_extra.detail_title")}>
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
    <RHLayout pageTitle={`${t("paie_extra.detail_title")} — ${b.employe_detail?.nom_complet} — ${MOIS_LABELS[b.mois]} ${b.annee}`}>
      <div className="row">
        <div className="col-md-4 mb-3">
          <div className="card h-100" style={{ background: "var(--card-bg)" }}>
            <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="card-title" style={{ color: "var(--page-title)", fontSize: 14 }}>
                <i className="fas fa-user mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("paie_extra.employee_info")}
              </h3>
            </div>
            <div className="card-body">
              <dl className="mb-0" style={{ fontSize: 13 }}>
                <dt style={{ color: "var(--text-muted)" }}>{t("paie_extra.full_name_label")}</dt>
                <dd style={{ color: "var(--page-title)", fontWeight: 600 }}>{b.employe_detail?.nom_complet}</dd>
                <dt style={{ color: "var(--text-muted)" }}>{t("paie_extra.email_label")}</dt>
                <dd style={{ color: "var(--text-primary)" }}>{b.employe_detail?.email || "—"}</dd>
                <dt style={{ color: "var(--text-muted)" }}>{t("paie_extra.period_label")}</dt>
                <dd style={{ color: "var(--page-title)", fontWeight: 600 }}>{MOIS_LABELS[b.mois]} {b.annee}</dd>
                <dt style={{ color: "var(--text-muted)" }}>{t("paie_extra.status_label")}</dt>
                <dd>
                  <span className={`badge badge-${STATUT_BADGE[b.statut] || "secondary"}`}>
                    {b.statut_display}
                  </span>
                </dd>
                {b.date_paiement && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("paie_extra.payment_date_label")}</dt>
                    <dd style={{ color: "var(--text-primary)" }}>
                      {new Date(b.date_paiement).toLocaleDateString("fr-FR")}
                    </dd>
                  </>
                )}
                {b.valide_par_detail && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("paie_extra.validated_by_label")}</dt>
                    <dd style={{ color: "var(--text-primary)" }}>{b.valide_par_detail.nom_complet}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-8 mb-3">
          <div className="card" style={{ background: "var(--card-bg)" }}>
            <div className="card-header d-flex justify-content-between align-items-center"
                 style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="card-title" style={{ color: "var(--page-title)", fontSize: 14 }}>
                <i className="fas fa-calculator mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("paie_extra.calc_detail")}
              </h3>
              <div className="d-flex" style={{ gap: 6 }}>
                {b.statut === "BROUILLON" && (
                  <button className="btn btn-sm btn-primary" onClick={handleValider} disabled={actionId === "valider"}>
                    {actionId === "valider" ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-check mr-1" />}
                    {t("paie_extra.validate_btn")}
                  </button>
                )}
                {b.statut === "VALIDE" && (
                  <button className="btn btn-sm btn-success" onClick={handlePayer} disabled={actionId === "payer"}>
                    {actionId === "payer" ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-money-bill-wave mr-1" />}
                    {t("paie_extra.mark_paid_btn")}
                  </button>
                )}
                <button className="btn btn-sm btn-outline-info" onClick={handleDl} disabled={actionId === "dl"}>
                  {actionId === "dl" ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-eye mr-1" />}
                  {t("apercu.preview")} {t("paie_extra.pdf_btn")}
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <tbody>
                    <tr style={{ background: "rgba(46,116,181,0.07)" }}>
                      <td colSpan="2" style={{ fontWeight: 600, color: "var(--acerfi-blue)", fontSize: 12, padding: "6px 12px" }}>
                        {t("paie_extra.gains")}
                      </td>
                    </tr>
                    <LigneCalc label={t("paie_extra.base_salary")} montant={b.salaire_brut} couleur="var(--page-title)" />
                    {Number(b.total_primes) > 0 && (
                      <LigneCalc label={t("paie_extra.bonuses")} montant={b.total_primes} couleur="var(--page-title)" indent />
                    )}
                    <tr style={{ background: "var(--border-color)" }}>
                      <td style={{ fontWeight: 700, color: "var(--page-title)", padding: "6px 12px" }}>{t("paie_extra.total_brut")}</td>
                      <td className="text-right font-weight-bold" style={{ color: "var(--page-title)", padding: "6px 12px" }}>
                        {totalBrut.toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>

                    <tr style={{ background: "rgba(220,53,69,0.06)" }}>
                      <td colSpan="2" style={{ fontWeight: 600, color: "#dc3545", fontSize: 12, padding: "6px 12px" }}>
                        {t("paie_extra.cotisations_impots")}
                      </td>
                    </tr>
                    <tr style={{ color: "var(--text-primary)" }}>
                      <td style={{ paddingLeft: 12 }}>{t("paie_extra.cnps_employee_rate")}</td>
                      <td className="text-right font-weight-bold" style={{ color: "#dc3545" }}>
                        - {Number(b.cnps_employe).toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                    <tr style={{ color: "var(--text-primary)" }}>
                      <td style={{ paddingLeft: 12 }}>{t("paie_extra.irpp_label")}</td>
                      <td className="text-right font-weight-bold" style={{ color: "#dc3545" }}>
                        - {Number(b.irpp).toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                    {Number(b.autres_retenues) > 0 && (
                      <tr style={{ color: "var(--text-primary)" }}>
                        <td style={{ paddingLeft: 12 }}>{t("paie_extra.other_deductions")}</td>
                        <td className="text-right font-weight-bold" style={{ color: "#dc3545" }}>
                          - {Number(b.autres_retenues).toLocaleString("fr-FR")} FCFA
                        </td>
                      </tr>
                    )}

                    <tr style={{ background: "rgba(40,167,69,0.08)" }}>
                      <td style={{ fontWeight: 700, fontSize: 15, color: "#155724", padding: "10px 12px" }}>
                        {t("paie_extra.net_to_pay")}
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
          <i className="fas fa-arrow-left mr-1" />{t("paie_extra.back_to_list")}
        </button>
      </div>
      {apercuModal}
    </RHLayout>
  );
}
