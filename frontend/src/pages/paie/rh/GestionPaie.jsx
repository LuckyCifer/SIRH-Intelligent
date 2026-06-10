import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import { getBulletins, validerBulletin, marquerPaye, telechargerPdf } from "../../../api/paie";

const MOIS_LABELS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUT_BADGE = {
  BROUILLON: "secondary",
  VALIDE:    "primary",
  PAYE:      "success",
};

export default function GestionPaie() {
  const now = new Date();
  const [bulletins,    setBulletins]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actionId,     setActionId]     = useState(null);
  const [filtreMois,   setFiltreMois]   = useState(String(now.getMonth() + 1));
  const [filtreAnnee,  setFiltreAnnee]  = useState(String(now.getFullYear()));
  const [filtreStatut, setFiltreStatut] = useState("");

  const charger = () => {
    setLoading(true);
    const params = {};
    if (filtreMois)   params.mois   = filtreMois;
    if (filtreAnnee)  params.annee  = filtreAnnee;
    if (filtreStatut) params.statut = filtreStatut;
    getBulletins(params)
      .then(r => setBulletins(r.data.results ?? r.data))
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(charger, [filtreMois, filtreAnnee, filtreStatut]);

  const nbBrouillons = bulletins.filter(b => b.statut === "BROUILLON").length;
  const massNette    = bulletins.reduce((s, b) => s + Number(b.salaire_net), 0);

  const handleValider = async (id) => {
    if (!window.confirm("Valider ce bulletin de paie ?")) return;
    setActionId(id);
    try {
      const r = await validerBulletin(id);
      setBulletins(prev => prev.map(b => b.id === id ? r.data : b));
      toast.success("Bulletin validé");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erreur lors de la validation");
    } finally {
      setActionId(null);
    }
  };

  const handlePayer = async (id) => {
    if (!window.confirm("Marquer ce bulletin comme payé ?")) return;
    setActionId(id);
    try {
      const r = await marquerPaye(id, {});
      setBulletins(prev => prev.map(b => b.id === id ? r.data : b));
      toast.success("Bulletin marqué payé");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erreur");
    } finally {
      setActionId(null);
    }
  };

  const handleDl = async (id) => {
    setActionId(`dl-${id}`);
    try {
      const r = await telechargerPdf(id);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.headers["content-disposition"]?.split('filename="')[1]?.replace('"', "") || `bulletin_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur téléchargement");
    } finally {
      setActionId(null);
    }
  };

  return (
    <RHLayout pageTitle="Gestion de la paie">
      {/* Stats */}
      <div className="row mb-3">
        {[
          { label: "Bulletins",     val: bulletins.length,              color: "#2E74B5", icon: "file-invoice" },
          { label: "À valider",     val: nbBrouillons,                  color: "#fd7e14", icon: "clock" },
          { label: "Payés",         val: bulletins.filter(b => b.statut === "PAYE").length, color: "#28a745", icon: "check-circle" },
          { label: "Masse nette",   val: `${massNette.toLocaleString("fr-FR")} F`,          color: "#6f42c1", icon: "money-check-alt" },
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
            <option value="">Tous les mois</option>
            {MOIS_LABELS.slice(1).map((m, i) => (
              <option key={i + 1} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select className="form-control form-control-sm"
            style={{ width: 100, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)}>
            <option value="">Toutes</option>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <select className="form-control form-control-sm"
            style={{ width: 140, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="VALIDE">Validé</option>
            <option value="PAYE">Payé</option>
          </select>
        </div>
        <div className="d-flex" style={{ gap: 8 }}>
          <Link to="/rh/paie/generer" className="btn btn-success btn-sm">
            <i className="fas fa-cogs mr-1" />Génération en masse
          </Link>
          <Link to="/rh/paie/masse-salariale" className="btn btn-outline-info btn-sm">
            <i className="fas fa-chart-area mr-1" />Masse salariale
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
              <strong>Aucun bulletin pour cette période</strong>
              <p className="mt-1 mb-0" style={{ fontSize: 13 }}>
                Utilisez la génération en masse pour créer les bulletins.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    <th>Employé</th>
                    <th>Période</th>
                    <th className="text-right">Brut</th>
                    <th className="text-right">CNPS</th>
                    <th className="text-right">IRPP</th>
                    <th className="text-right">Net</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.map(b => (
                    <tr key={b.id} style={{ color: "var(--text-primary)" }}>
                      <td className="font-weight-bold" style={{ color: "var(--page-title)" }}>
                        {b.employe_detail?.nom_complet || "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
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
                        {Number(b.salaire_net).toLocaleString("fr-FR")} F
                      </td>
                      <td>
                        <span className={`badge badge-${STATUT_BADGE[b.statut] || "secondary"}`}>
                          {b.statut_display}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex" style={{ gap: 4 }}>
                          <Link to={`/rh/paie/bulletins/${b.id}`}
                            className="btn btn-xs btn-outline-secondary" title="Détail">
                            <i className="fas fa-eye" />
                          </Link>
                          {b.statut === "BROUILLON" && (
                            <button className="btn btn-xs btn-outline-primary"
                              onClick={() => handleValider(b.id)}
                              disabled={actionId === b.id} title="Valider">
                              {actionId === b.id
                                ? <i className="fas fa-spinner fa-spin" />
                                : <i className="fas fa-check" />}
                            </button>
                          )}
                          {b.statut === "VALIDE" && (
                            <button className="btn btn-xs btn-outline-success"
                              onClick={() => handlePayer(b.id)}
                              disabled={actionId === b.id} title="Marquer payé">
                              {actionId === b.id
                                ? <i className="fas fa-spinner fa-spin" />
                                : <i className="fas fa-money-bill-wave" />}
                            </button>
                          )}
                          <button className="btn btn-xs btn-outline-info"
                            onClick={() => handleDl(b.id)}
                            disabled={actionId === `dl-${b.id}`} title="Télécharger PDF">
                            {actionId === `dl-${b.id}`
                              ? <i className="fas fa-spinner fa-spin" />
                              : <i className="fas fa-download" />}
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
    </RHLayout>
  );
}
