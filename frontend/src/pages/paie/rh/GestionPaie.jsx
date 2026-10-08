import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { getBulletins, validerBulletin, marquerPaye, telechargerPdf } from "../../../api/paie";
import { virementBulletin } from "../../../api/paiements";
import { useApercu, nomDepuisEntetes } from "../../../components/ui/useApercu";

const STATUT_BADGE = {
  BROUILLON: "secondary",
  VALIDE:    "primary",
  PAYE:      "success",
};

function numFr(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

function LigneDetail({ label, montant, color, bold }) {
  if (!montant || Number(montant) === 0) return null;
  return (
    <div className="d-flex justify-content-between py-1"
      style={{ borderBottom: "1px solid var(--border-color)", fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: color || "var(--text-primary)" }}>
        {numFr(montant)} F
      </span>
    </div>
  );
}

function SectionTitre({ children }) {
  return (
    <div className="mt-3 mb-1 py-1 px-2"
      style={{ background: "#2E74B5", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
      {children}
    </div>
  );
}

function DetailModal({ bulletin: b, onClose }) {
  const { t } = useTranslation();
  const moisLabels = [
    "", t('common.months.1'), t('common.months.2'), t('common.months.3'), t('common.months.4'),
    t('common.months.5'), t('common.months.6'), t('common.months.7'), t('common.months.8'),
    t('common.months.9'), t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ];
  if (!b) return null;
  const nouveau = b.salaire_categoriel && Number(b.salaire_categoriel) > 0;
  const totalBrut = nouveau ? b.total_brut : (Number(b.salaire_brut) + Number(b.total_primes));
  const irppCac   = Number(b.irpp) + Number(b.cac || 0);

  return (
    <>
      <div className="modal fade show d-block" role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content" style={{ background: "var(--card-bg)" }}>

            {/* Header */}
            <div className="modal-header" style={{ background: "#1F3864", color: "#fff" }}>
              <div>
                <h5 className="modal-title mb-0">
                  <i className="fas fa-file-invoice mr-2" />
                  Bulletin — {b.employe_detail?.nom_complet}
                </h5>
                <small style={{ opacity: 0.8 }}>
                  {moisLabels[b.mois]} {b.annee} &nbsp;·&nbsp; {b.statut_display}
                  {b.categorie_pro && <> &nbsp;·&nbsp; Cat. {b.categorie_pro}{b.echelon && ` / Éch. ${b.echelon}`}</>}
                </small>
              </div>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">

                  {/* Éléments de rémunération */}
                  <SectionTitre>{t('paie_extra.remuneration_elements')}</SectionTitre>
                  {nouveau ? (
                    <>
                      <LigneDetail label="Salaire catégoriel"     montant={b.salaire_categoriel} />
                      <LigneDetail label="Sursalaire"             montant={b.sursalaire} />
                      <LigneDetail label="Prime ancienneté"       montant={b.prime_anciennete} />
                      <LigneDetail label="Prime responsabilité"   montant={b.prime_responsabilite} />
                      <LigneDetail label="Prime assiduité"        montant={b.prime_assiduite} />
                      <LigneDetail label="Prime rendement"        montant={b.prime_rendement} />
                      <LigneDetail label="Gratification"          montant={b.gratification} />
                      <LigneDetail label="Avantages nature"       montant={b.avantages_nature} />
                      <LigneDetail label="Indemnité transport (NI)"    montant={b.indemnite_transport} />
                      <LigneDetail label="Indemnité logement (NI)"     montant={b.indemnite_logement} />
                      <LigneDetail label="Indemnité représentation (NI)" montant={b.indemnite_representation} />
                      <LigneDetail label="Allocations familiales (NI)" montant={b.allocations_familiales} />
                    </>
                  ) : (
                    <>
                      <LigneDetail label="Salaire de base"    montant={b.salaire_brut} />
                      <LigneDetail label="Primes / indemnités" montant={b.total_primes} />
                    </>
                  )}
                  <div className="d-flex justify-content-between py-2 mt-1"
                    style={{ background: "#1F3864", borderRadius: 4, padding: "0 8px" }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{t('paie_extra.total_brut_label')}</span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{numFr(totalBrut)} F</span>
                  </div>

                </div>
                <div className="col-md-6">

                  {/* Retenues salariales */}
                  <SectionTitre>{t('paie_extra.retenues_salariales')}</SectionTitre>
                  <LigneDetail label={`CNPS salarié 4,2%`} montant={b.cnps_employe} color="#cc4400" />
                  <LigneDetail label="IRPP"               montant={b.irpp}         color="#cc4400" />
                  <LigneDetail label="CAC (10% IRPP)"     montant={b.cac}          color="#cc4400" />
                  <LigneDetail label="CFC salarié (1%)"   montant={b.cfc_salarie}  color="#cc4400" />
                  <LigneDetail label="RAV"                montant={b.rav}          color="#cc4400" />
                  <LigneDetail label="TDL"                montant={b.tdl}          color="#cc4400" />
                  <LigneDetail label="Avances salaire"    montant={b.avances_salaire} color="#cc4400" />
                  <LigneDetail label="Autres retenues"    montant={b.autres_retenues} color="#cc4400" />
                  <div className="d-flex justify-content-between py-2 mt-1 px-2"
                    style={{ background: "#a01010", borderRadius: 4 }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{t('paie_extra.total_retenues')}</span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
                      {numFr(nouveau ? b.total_retenues : (Number(b.cnps_employe) + Number(b.irpp) + Number(b.autres_retenues)))} F
                    </span>
                  </div>

                  {/* NET À PAYER */}
                  <div className="d-flex justify-content-between mt-3 px-3 py-2"
                    style={{ background: "#C9A84C", borderRadius: 6 }}>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{t('paie_extra.net_to_pay')}</span>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                      {numFr(b.salaire_net)} F
                    </span>
                  </div>

                  {/* Charges patronales */}
                  {nouveau && (
                    <>
                      <SectionTitre>{t('paie_extra.charges_patronales')}</SectionTitre>
                      <LigneDetail label="CNPS pension (4,2%)"  montant={b.cnps_patronal_pension} color="#1a6632" />
                      <LigneDetail label="CNPS famille (7%)"    montant={b.cnps_patronal_famille} color="#1a6632" />
                      <LigneDetail label="CNPS AT (1,75%)"      montant={b.cnps_patronal_at}      color="#1a6632" />
                      <LigneDetail label="CFC patronal (1,5%)"  montant={b.cfc_patronal}          color="#1a6632" />
                      <LigneDetail label="FNE (1%)"             montant={b.fne}                   color="#1a6632" />
                      <div className="d-flex justify-content-between py-2 mt-1 px-2"
                        style={{ background: "#2E74B5", borderRadius: 4 }}>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>{t('paie_extra.cout_total_employeur')}</span>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>{numFr(b.cout_total_employeur)} F</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Récapitulatif fiscal */}
              {nouveau && (
                <div className="mt-3 p-2 rounded" style={{ background: "var(--bg-alt)", fontSize: 11, color: "var(--text-muted)" }}>
                  Base cotisable CNPS : {numFr(b.salaire_brut_cotisable)} F &nbsp;|&nbsp;
                  SNC (assiette IRPP) : {numFr(b.revenu_net_categoriel)} F &nbsp;|&nbsp;
                  Mode de paiement : {b.mode_paiement || "virement"}
                  {b.observations && <> &nbsp;|&nbsp; {b.observations}</>}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={onClose}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

// ── Modal virement Mobile Money ───────────────────────────────────────────────
function VirementModal({ bulletin: b, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [operateur,    setOperateur]    = useState(b?.employe_detail?.operateur_mobile || "MTN");
  const [numeroMobile, setNumeroMobile] = useState(b?.employe_detail?.numero_mobile || "");
  const [loading,      setLoading]      = useState(false);

  async function handleConfirmer() {
    if (!numeroMobile.trim()) { toast.error(t("virements.modal_numero_required")); return; }
    setLoading(true);
    try {
      const { data } = await virementBulletin(b.id, { operateur, numero_mobile: numeroMobile.trim() });
      toast.success(
        data.mode_demo
          ? t("virements.modal_demo_initiated")
          : t("virements.modal_initiated", { operateur, ref: data.reference_id?.slice(0, 8) })
      );
      onSuccess(data);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || t("virements.modal_error"));
    } finally {
      setLoading(false);
    }
  }

  const OP = {
    MTN:    { color: "#ffcc00", textColor: "#1a1a1a", label: t("virements.op_mtn"),    emoji: "🟡" },
    ORANGE: { color: "#ff6600", textColor: "#fff",    label: t("virements.op_orange"), emoji: "🟠" },
  };
  const cfg = OP[operateur] || OP.MTN;

  return (
    <>
      <div className="modal fade show d-block" role="dialog">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
          <div className="modal-content" style={{ background: "var(--card-bg)", borderRadius: 12 }}>
            <div className="modal-header" style={{ background: "#1F3864", color: "#fff", borderRadius: "12px 12px 0 0" }}>
              <h5 className="modal-title mb-0">
                <i className="fas fa-mobile-alt mr-2" />
                {t("virements.modal_title")}
              </h5>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>

            <div className="modal-body">
              {/* Récapitulatif */}
              <div className="p-3 mb-3 rounded" style={{ background: "var(--bg-alt)" }}>
                <div className="font-weight-bold" style={{ color: "var(--text-primary)" }}>
                  {b.employe_detail?.nom_complet}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {t("virements.modal_bulletin", { periode: b.periode })}{" "}
                  <strong style={{ color: "#28a745" }}>
                    {Number(b.salaire_net).toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
              </div>

              {/* Sélection opérateur */}
              <div className="mb-3">
                <label className="font-weight-bold mb-2" style={{ fontSize: 13 }}>
                  {t("virements.modal_operateur")}
                </label>
                <div className="d-flex" style={{ gap: 10 }}>
                  {["MTN", "ORANGE"].map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperateur(op)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid",
                        borderColor: operateur === op ? OP[op].color : "var(--border-color)",
                        background: operateur === op ? OP[op].color : "var(--card-bg)",
                        color: operateur === op ? OP[op].textColor : "var(--text-primary)",
                        fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all .2s",
                      }}
                    >
                      {OP[op].emoji} {OP[op].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numéro mobile */}
              <div className="mb-3">
                <label className="font-weight-bold mb-1" style={{ fontSize: 13 }}>
                  {t("virements.modal_numero_label", { operateur: cfg.label })}
                </label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text"
                      style={{ background: cfg.color, color: cfg.textColor, fontWeight: 700 }}>
                      🇨🇲 +237
                    </span>
                  </div>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="655 123 456"
                    value={numeroMobile}
                    onChange={e => setNumeroMobile(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    style={{ fontSize: 16, letterSpacing: 1 }}
                  />
                </div>
                <small className="text-muted">
                  {operateur === "MTN"
                    ? t("virements.modal_mtn_hint")
                    : t("virements.modal_orange_hint")}
                </small>
              </div>

              {/* Avertissement mode démo */}
              <div className="alert alert-info py-2 mb-0" style={{ fontSize: 12, borderRadius: 8 }}>
                <i className="fas fa-info-circle mr-1" />
                {t("virements.modal_demo_warning")}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-sm font-weight-bold"
                onClick={handleConfirmer}
                disabled={loading || !numeroMobile.trim()}
                style={{ background: cfg.color, color: cfg.textColor, minWidth: 160 }}
              >
                {loading
                  ? <><i className="fas fa-spinner fa-spin mr-1" /> {t("virements.modal_sending")}</>
                  : <><i className="fas fa-paper-plane mr-1" />
                      {t("virements.modal_virer", {
                        montant: Number(b.salaire_net).toLocaleString("fr-FR"),
                      })}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

export default function GestionPaie() {
  const { t } = useTranslation();
  const { voirFichier, apercuModal } = useApercu();
  const now = new Date();
  const MOIS_LABELS = [
    "", t('common.months.1'), t('common.months.2'), t('common.months.3'), t('common.months.4'),
    t('common.months.5'), t('common.months.6'), t('common.months.7'), t('common.months.8'),
    t('common.months.9'), t('common.months.10'), t('common.months.11'), t('common.months.12'),
  ];
  const [bulletins,    setBulletins]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actionId,     setActionId]     = useState(null);
  const [filtreMois,   setFiltreMois]   = useState(String(now.getMonth() + 1));
  const [filtreAnnee,  setFiltreAnnee]  = useState(String(now.getFullYear()));
  const [filtreStatut, setFiltreStatut] = useState("");
  const [selected,     setSelected]     = useState(null);
  const [virModal,     setVirModal]     = useState(null);

  const charger = () => {
    setLoading(true);
    const params = {};
    if (filtreMois)   params.mois   = filtreMois;
    if (filtreAnnee)  params.annee  = filtreAnnee;
    if (filtreStatut) params.statut = filtreStatut;
    getBulletins(params)
      .then(r => setBulletins(r.data.results ?? r.data))
      .catch(() => toast.error(t("paie_extra.load_error")))
      .finally(() => setLoading(false));
  };

  useEffect(charger, [filtreMois, filtreAnnee, filtreStatut]);

  const nbBrouillons = bulletins.filter(b => b.statut === "BROUILLON").length;
  const massNette    = bulletins.reduce((s, b) => s + Number(b.salaire_net), 0);

  const handleValider = async (id) => {
    if (!window.confirm(t("paie_extra.validate_confirm"))) return;
    setActionId(id);
    try {
      const r = await validerBulletin(id);
      setBulletins(prev => prev.map(b => b.id === id ? r.data : b));
      toast.success(t("paie_extra.validated_msg"));
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erreur lors de la validation");
    } finally {
      setActionId(null);
    }
  };

  const handlePayer = async (id) => {
    if (!window.confirm(t("paie_extra.pay_confirm"))) return;
    setActionId(id);
    try {
      const r = await marquerPaye(id, {});
      setBulletins(prev => prev.map(b => b.id === id ? r.data : b));
      toast.success(t("paie_extra.paid_msg"));
    } catch (e) {
      toast.error(e?.response?.data?.error || t("common.error"));
    } finally {
      setActionId(null);
    }
  };

  const handleDl = async (id) => {
    setActionId(`dl-${id}`);
    try {
      const r = await telechargerPdf(id);
      voirFichier(r.data, nomDepuisEntetes(r.headers, `bulletin_${id}.pdf`));
    } catch {
      toast.error(t("paie_extra.download_error"));
    } finally {
      setActionId(null);
    }
  };

  return (
    <RHLayout pageTitle={t("paie.title")}>

      {/* Détail bulletin (modal) */}
      {selected && (
        <DetailModal bulletin={selected} onClose={() => setSelected(null)} />
      )}

      {/* Modal virement Mobile Money */}
      {virModal && (
        <VirementModal
          bulletin={virModal}
          onClose={() => setVirModal(null)}
          onSuccess={() => charger()}
        />
      )}

      {/* Stats */}
      <div className="row mb-3">
        {[
          { label: t("paie_extra.bulletins"),         val: bulletins.length,                                color: "#2E74B5", icon: "file-invoice" },
          { label: t("paie_extra.pending_validation"), val: nbBrouillons,                                   color: "#fd7e14", icon: "clock" },
          { label: t("paie_extra.paid_count"),         val: bulletins.filter(b => b.statut === "PAYE").length, color: "#28a745", icon: "check-circle" },
          { label: t("paie_extra.net_mass"),           val: `${massNette.toLocaleString("fr-FR")} F`,       color: "#6f42c1", icon: "money-check-alt" },
        ].map(s => (
          <div key={s.label} className="col-lg-3 col-md-6 mb-2">
            <div className="card" style={{ background: "var(--card-bg)", borderLeft: `4px solid ${s.color}` }}>
              <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--page-title)" }}>{s.val}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.label}</div>
                </div>
                <i className={`fas fa-${s.icon} fa-lg`} style={{ color: s.color, opacity: 0.6 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap" style={{ gap: 8 }}>
        <div className="d-flex flex-wrap" style={{ gap: 8 }}>
          <select className="form-control form-control-sm"
            style={{ width: 140, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreMois} onChange={e => setFiltreMois(e.target.value)}>
            <option value="">{t("paie_extra.all_months")}</option>
            {MOIS_LABELS.slice(1).map((m, i) => (
              <option key={i + 1} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select className="form-control form-control-sm"
            style={{ width: 100, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)}>
            <option value="">{t("paie_extra.all_years")}</option>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <select className="form-control form-control-sm"
            style={{ width: 140, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">{t("paie_extra.all_statuses")}</option>
            <option value="BROUILLON">{t("paie_extra.draft")}</option>
            <option value="VALIDE">{t("paie_extra.validated")}</option>
            <option value="PAYE">{t("paie_extra.paid")}</option>
          </select>
        </div>
        <div className="d-flex" style={{ gap: 8 }}>
          <Link to="/rh/paie/generer" className="btn btn-success btn-sm">
            <i className="fas fa-cogs mr-1" />{t("paie_extra.mass_generation")}
          </Link>
          <Link to="/rh/paie/masse-salariale" className="btn btn-outline-info btn-sm">
            <i className="fas fa-chart-area mr-1" />{t("nav.masse_salariale")}
          </Link>
          <Link to="/rh/paie/virements" className="btn btn-outline-warning btn-sm">
            <i className="fas fa-mobile-alt mr-1" /> {t("virements.nav_link")}
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ background: "var(--card-bg)" }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : bulletins.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-file-invoice fa-3x mb-3 d-block" style={{ opacity: 0.3 }} />
              <strong>{t("paie_extra.no_bulletins_period")}</strong>
              <p className="mt-1 mb-0" style={{ fontSize: 13 }}>
                {t("paie_extra.use_mass_gen")}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0" style={{ fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    <th>{t("paie_extra.col_employee")}</th>
                    <th>{t("paie_extra.col_period")}</th>
                    <th>{t("paie_extra.col_category")}</th>
                    <th className="text-right">{t("paie_extra.col_gross")}</th>
                    <th className="text-right">CNPS</th>
                    <th className="text-right">IRPP+CAC</th>
                    <th className="text-right">{t("paie_extra.col_net")}</th>
                    <th>{t("paie_extra.col_status")}</th>
                    <th>{t("paie_extra.col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.map(b => {
                    const nouveau = b.salaire_categoriel && Number(b.salaire_categoriel) > 0;
                    const totalBrut = nouveau
                      ? Number(b.total_brut)
                      : (Number(b.salaire_brut) + Number(b.total_primes));
                    const irppCac = Number(b.irpp) + Number(b.cac || 0);

                    return (
                      <tr key={b.id} style={{ color: "var(--text-primary)" }}>
                        <td className="font-weight-bold" style={{ color: "var(--page-title)" }}>
                          {b.employe_detail?.nom_complet || "—"}
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {MOIS_LABELS[b.mois]} {b.annee}
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {b.categorie_pro
                            ? <>{b.categorie_pro}{b.echelon && `/${b.echelon}`}</>
                            : <span style={{ opacity: 0.4 }}>—</span>
                          }
                        </td>
                        <td className="text-right">{numFr(totalBrut)}</td>
                        <td className="text-right" style={{ color: "#fd7e14" }}>
                          {numFr(b.cnps_employe)}
                        </td>
                        <td className="text-right" style={{ color: "#6f42c1" }}>
                          {numFr(irppCac)}
                        </td>
                        <td className="text-right font-weight-bold" style={{ color: "#28a745" }}>
                          {numFr(b.salaire_net)} F
                        </td>
                        <td>
                          <span className={`badge badge-${STATUT_BADGE[b.statut] || "secondary"}`}>
                            {b.statut_display}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex" style={{ gap: 4 }}>
                            <button className="btn btn-xs btn-outline-secondary"
                              onClick={() => setSelected(b)} title={t('paie_extra.detail_tooltip')}>
                              <i className="fas fa-eye" />
                            </button>
                            {b.statut === "BROUILLON" && (
                              <button className="btn btn-xs btn-outline-primary"
                                onClick={() => handleValider(b.id)}
                                disabled={actionId === b.id} title={t('paie_extra.valider_tooltip')}>
                                {actionId === b.id
                                  ? <i className="fas fa-spinner fa-spin" />
                                  : <i className="fas fa-check" />}
                              </button>
                            )}
                            {b.statut === "VALIDE" && (
                              <>
                                <button className="btn btn-xs btn-outline-success"
                                  onClick={() => handlePayer(b.id)}
                                  disabled={actionId === b.id} title={t('paie_extra.mark_paid_btn')}>
                                  {actionId === b.id
                                    ? <i className="fas fa-spinner fa-spin" />
                                    : <i className="fas fa-money-bill-wave" />}
                                </button>
                                <button
                                  className="btn btn-xs"
                                  onClick={() => setVirModal(b)}
                                  title={t("virements.btn_title")}
                                  style={{ background: "#ffcc00", color: "#1a1a1a", fontWeight: 700 }}
                                >
                                  <i className="fas fa-mobile-alt" />
                                </button>
                              </>
                            )}
                            <button className="btn btn-xs btn-outline-info"
                              onClick={() => handleDl(b.id)}
                              disabled={actionId === `dl-${b.id}`} title={t('apercu.preview')}>
                              {actionId === `dl-${b.id}`
                                ? <i className="fas fa-spinner fa-spin" />
                                : <i className="fas fa-eye" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {apercuModal}
    </RHLayout>
  );
}
