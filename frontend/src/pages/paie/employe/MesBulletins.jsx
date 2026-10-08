import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../../components/layout/EmployeLayout";
import { getMesBulletins, telechargerPdf } from "../../../api/paie";
import { useApercu, nomDepuisEntetes } from "../../../components/ui/useApercu";

const STATUT_BADGE = {
  BROUILLON: "secondary",
  VALIDE:    "primary",
  PAYE:      "success",
};

export default function MesBulletins() {
  const { t, i18n } = useTranslation();
  const { voirFichier, apercuModal } = useApercu();
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';
  const MOIS_LABELS = [
    "", t('common.months.1'), t('common.months.2'), t('common.months.3'), t('common.months.4'),
    t('common.months.5'), t('common.months.6'), t('common.months.7'), t('common.months.8'),
    t('common.months.9'), t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ];

  const [bulletins, setBulletins] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dlId,      setDlId]      = useState(null);

  useEffect(() => {
    getMesBulletins()
      .then(r => setBulletins(r.data.results ?? r.data))
      .catch(() => toast.error(t("paie.load_error")))
      .finally(() => setLoading(false));
  }, []);

  const handleTelechargement = async (id) => {
    setDlId(id);
    try {
      const r = await telechargerPdf(id);
      voirFichier(r.data, nomDepuisEntetes(r.headers, `bulletin_${id}.pdf`));
    } catch {
      toast.error(t("paie.download_error"));
    } finally {
      setDlId(null);
    }
  };

  const dernier = bulletins[0];

  return (
    <EmployeLayout pageTitle={t("nav.mes_bulletins")}>
      {/* Récap dernier bulletin */}
      {dernier && (
        <div className="row mb-3">
          {[
            { label: t("paie.gross_salary"), val: `${Number(dernier.salaire_brut).toLocaleString(locale)} FCFA`, color: "#2E74B5", icon: "file-invoice" },
            { label: t("paie.cnps_emp"),     val: `${Number(dernier.cnps_employe).toLocaleString(locale)} FCFA`, color: "#fd7e14", icon: "shield-alt" },
            { label: t("paie.irpp"),         val: `${Number(dernier.irpp).toLocaleString(locale)} FCFA`,         color: "#6f42c1", icon: "landmark" },
            { label: t("paie.net_to_pay"),   val: `${Number(dernier.salaire_net).toLocaleString(locale)} FCFA`,  color: "#28a745", icon: "money-bill-wave" },
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
            {t("paie.history")}
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
              <strong>{t("paie.no_bulletins")}</strong>
              <p className="mt-1 mb-0" style={{ fontSize: 13 }}>{t("paie.no_bulletins_subtitle")}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ background: "var(--card-bg)", color: "var(--text-muted)", fontSize: 12 }}>
                    <th>{t("paie.period")}</th>
                    <th className="text-right">{t("paie.gross_salary")}</th>
                    <th className="text-right">{t("paie.cnps_emp")}</th>
                    <th className="text-right">{t("paie.irpp")}</th>
                    <th className="text-right">{t("paie.net_to_pay")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("paie.payment_date")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.map(b => (
                    <tr key={b.id} style={{ color: "var(--text-primary)" }}>
                      <td className="font-weight-bold" style={{ color: "var(--page-title)" }}>
                        {MOIS_LABELS[b.mois]} {b.annee}
                      </td>
                      <td className="text-right">{Number(b.salaire_brut).toLocaleString(locale)}</td>
                      <td className="text-right" style={{ color: "#fd7e14" }}>
                        {Number(b.cnps_employe).toLocaleString(locale)}
                      </td>
                      <td className="text-right" style={{ color: "#6f42c1" }}>
                        {Number(b.irpp).toLocaleString(locale)}
                      </td>
                      <td className="text-right font-weight-bold" style={{ color: "#28a745" }}>
                        {Number(b.salaire_net).toLocaleString(locale)} FCFA
                      </td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[b.statut] || "secondary"}`}>
                          {b.statut_display}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {b.date_paiement
                          ? new Date(b.date_paiement + 'T12:00:00').toLocaleDateString(locale)
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-outline-primary"
                          onClick={() => handleTelechargement(b.id)}
                          disabled={dlId === b.id}
                          title={t("apercu.preview")}
                        >
                          {dlId === b.id
                            ? <i className="fas fa-spinner fa-spin" />
                            : <i className="fas fa-eye" />}
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
      {apercuModal}
    </EmployeLayout>
  );
}
