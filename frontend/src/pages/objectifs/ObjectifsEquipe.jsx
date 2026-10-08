import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import ManagerLayout from "../../components/layout/ManagerLayout";
import BarreProgression from "../../components/ui/BarreProgression";
import { getObjectifsEquipe, getPeriodesEnCours, createObjectif } from "../../api/objectifs";
import { getMonEquipe } from "../../api/listes";

const COULEUR_PRIORITE = {
  FAIBLE: "secondary", MOYENNE: "info", HAUTE: "warning", CRITIQUE: "danger",
};
const COULEUR_STATUT = {
  NON_COMMENCE: "secondary", EN_COURS: "primary", ATTEINT: "success",
  DEPASSE: "success", NON_ATTEINT: "danger", ABANDONNE: "dark",
};
const FORM_INIT = {
  employe: "", periode: "", titre: "", description: "",
  indicateur: "", cible: "", priorite: "MOYENNE", date_echeance: "",
};

export default function ObjectifsEquipe() {
  const { t }   = useTranslation();
  const [objectifs,  setObjectifs]  = useState([]);
  const [periodes,   setPeriodes]   = useState([]);
  const [employes,   setEmployes]   = useState([]);
  const [periodeId,  setPeriodeId]  = useState("");
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(FORM_INIT);
  const [saving,     setSaving]     = useState(false);

  const charger = (pid) => {
    setLoading(true);
    getObjectifsEquipe(pid || null)
      .then(r => setObjectifs(r.data))
      .catch(() => toast.error(t("objectifs.load_error")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getPeriodesEnCours().then(r => setPeriodes(r.data)).catch(() => {});
    getMonEquipe()
      .then(r => setEmployes(r.data))
      .catch(() => toast.error(t("objectifs.team_load_error"), { id: "equipe-load-error" }));
    charger("");
  }, []); // eslint-disable-line

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createObjectif(form);
      toast.success(t("objectifs.create_success"));
      setShowModal(false);
      setForm(FORM_INIT);
      charger(periodeId);
    } catch {
      toast.error(t("objectifs.create_error"));
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total:    objectifs.length,
    atteints: objectifs.filter(o => ["ATTEINT", "DEPASSE"].includes(o.statut)).length,
    enCours:  objectifs.filter(o => o.statut === "EN_COURS").length,
  };

  const statCards = [
    { label: t("objectifs.total_objectives"), valeur: stats.total,    icone: "bullseye" },
    { label: t("objectifs.achieved"),         valeur: stats.atteints, icone: "check-circle" },
    { label: t("objectifs.in_progress"),      valeur: stats.enCours,  icone: "spinner" },
  ];

  return (
    <ManagerLayout>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0" style={{ color: "var(--page-title)" }}>
                {t("objectifs.team_objectives")}
              </h1>
            </div>
            <div className="col-sm-6 text-right">
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                <i className="fas fa-plus mr-1" /> {t("objectifs.add_objective")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row mb-3">
            {statCards.map(k => (
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

          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-users mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("objectifs.objectives_list")}
              </h3>
              <select className="form-control form-control-sm w-auto"
                value={periodeId}
                onChange={e => { setPeriodeId(e.target.value); charger(e.target.value); }}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                <option value="">{t("objectifs.all_periods")}</option>
                {periodes.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
                </div>
              ) : objectifs.length === 0 ? (
                <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-inbox fa-3x mb-3 d-block" />
                  {t("objectifs.no_team_objectives")}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr style={{ background: "var(--card-bg)", color: "var(--text-muted)" }}>
                        <th>{t("objectifs.employee")}</th>
                        <th>{t("objectifs.objective")}</th>
                        <th>{t("objectifs.priority")}</th>
                        <th>{t("objectifs.status")}</th>
                        <th style={{ minWidth: 140 }}>{t("objectifs.progression")}</th>
                        <th>{t("objectifs.deadline")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectifs.map(o => (
                        <tr key={o.id} style={{ color: "var(--text-primary)" }}>
                          <td>{o.employe_detail?.nom_complet}</td>
                          <td>
                            <strong>{o.titre}</strong>
                            {o.indicateur && (
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                {t("objectifs.indicator")} : {o.indicateur}
                                {o.cible && ` — ${t("objectifs.target_value")} : ${o.cible}`}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${COULEUR_PRIORITE[o.priorite]}`}>
                              {o.priorite_display}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${COULEUR_STATUT[o.statut]}`}>
                              {o.statut_display}
                            </span>
                          </td>
                          <td><BarreProgression valeur={o.progression} /></td>
                          <td style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                            {o.date_echeance ? new Date(o.date_echeance).toLocaleDateString("fr-FR") : "—"}
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

      {showModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered"
            onClick={e => e.stopPropagation()}>
            <form className="modal-content" style={{ background: "var(--card-bg)" }} onSubmit={handleCreate}>
              <div className="modal-header">
                <h5 className="modal-title" style={{ color: "var(--page-title)" }}>
                  {t("objectifs.add_objective")}
                </h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.employee")} *</label>
                    <select className="form-control" required value={form.employe}
                      onChange={e => setForm(f => ({ ...f, employe: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                      <option value="">
                        {employes.length ? t("objectifs.select_employee") : t("objectifs.no_team_members")}
                      </option>
                      {employes.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.period")} *</label>
                    <select className="form-control" required value={form.periode}
                      onChange={e => setForm(f => ({ ...f, periode: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                      <option value="">{t("objectifs.select_period")}</option>
                      {periodes.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.col_title")} *</label>
                    <input className="form-control" required value={form.titre}
                      onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="col-12 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.description")}</label>
                    <textarea className="form-control" rows={2} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.indicator")}</label>
                    <input className="form-control" value={form.indicateur}
                      onChange={e => setForm(f => ({ ...f, indicateur: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.target_value")}</label>
                    <input className="form-control" value={form.cible}
                      onChange={e => setForm(f => ({ ...f, cible: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.priority")}</label>
                    <select className="form-control" value={form.priorite}
                      onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                      {["FAIBLE", "MOYENNE", "HAUTE", "CRITIQUE"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.date_echeance")}</label>
                    <input type="date" className="form-control" value={form.date_echeance}
                      onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-save mr-1" />}
                  {t("objectifs.create_objective_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
}
