import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../components/layout/RHLayout";
import { getPeriodes, createPeriode, updatePeriode, deletePeriode } from "../../api/objectifs";

const COULEUR_STATUT = { EN_COURS: "success", CLOTURE: "warning", ARCHIVE: "secondary" };
const FORM_INIT = {
  nom: "", type_periode: "TRIMESTRIEL", date_debut: "", date_fin: "",
  statut: "EN_COURS", description: "",
};

export default function GestionPeriodes() {
  const { t }     = useTranslation();
  const [periodes,   setPeriodes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(FORM_INIT);
  const [editId,     setEditId]     = useState(null);
  const [saving,     setSaving]     = useState(false);

  const charger = () => {
    setLoading(true);
    getPeriodes()
      .then(r => setPeriodes(r.data.results ?? r.data))
      .catch(() => toast.error(t("objectifs.load_error")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []); // eslint-disable-line

  const ouvrirCreation = () => { setForm(FORM_INIT); setEditId(null); setShowModal(true); };

  const ouvrirEdition = (p) => {
    setForm({
      nom: p.nom, type_periode: p.type_periode, date_debut: p.date_debut,
      date_fin: p.date_fin, statut: p.statut, description: p.description || "",
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await updatePeriode(editId, form);
        toast.success(t("objectifs.period_update_success"));
      } else {
        await createPeriode(form);
        toast.success(t("objectifs.period_create_success"));
      }
      setShowModal(false);
      charger();
    } catch {
      toast.error(t("objectifs.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm(t("objectifs.period_delete_confirm"))) return;
    try {
      await deletePeriode(id);
      toast.success(t("objectifs.period_delete_success"));
      charger();
    } catch {
      toast.error(t("objectifs.delete_error"));
    }
  };

  return (
    <RHLayout>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0" style={{ color: "var(--page-title)" }}>
                {t("objectifs.period_list")}
              </h1>
            </div>
            <div className="col-sm-6 text-right">
              <button className="btn btn-primary btn-sm" onClick={ouvrirCreation}>
                <i className="fas fa-plus mr-1" /> {t("objectifs.add_period")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : (
            <div className="row">
              {periodes.map(p => (
                <div key={p.id} className="col-md-6 col-lg-4">
                  <div className="card card-outline"
                    style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
                    <div className="card-header">
                      <h3 className="card-title" style={{ color: "var(--page-title)" }}>{p.nom}</h3>
                      <div className="card-tools">
                        <span className={`badge badge-${COULEUR_STATUT[p.statut]}`}>
                          {p.statut.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        <i className="fas fa-tag mr-1" /> {p.type_periode}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        <i className="far fa-calendar mr-1" />
                        {new Date(p.date_debut).toLocaleDateString("fr-FR")} →{" "}
                        {new Date(p.date_fin).toLocaleDateString("fr-FR")}
                      </p>
                      <div className="d-flex gap-2" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        <span><i className="fas fa-bullseye mr-1" />{p.nb_objectifs} {t("objectifs.nb_objectives")}</span>
                        <span><i className="fas fa-chart-bar mr-1" />{p.nb_evaluations} {t("objectifs.nb_evaluations")}</span>
                      </div>
                    </div>
                    <div className="card-footer d-flex gap-2" style={{ background: "transparent" }}>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => ouvrirEdition(p)}>
                        <i className="fas fa-edit mr-1" /> {t("common.edit")}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleSupprimer(p.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered"
            onClick={e => e.stopPropagation()}>
            <form className="modal-content" style={{ background: "var(--card-bg)" }} onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title" style={{ color: "var(--page-title)" }}>
                  {editId ? t("objectifs.edit_period_title") : t("objectifs.new_period_title")}
                </h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("objectifs.period_name")} *</label>
                  <input className="form-control" required value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                </div>
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.period_type")} *</label>
                    <select className="form-control" value={form.type_periode}
                      onChange={e => setForm(f => ({ ...f, type_periode: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                      {["MENSUEL", "TRIMESTRIEL", "SEMESTRIEL", "ANNUEL"].map(tp => (
                        <option key={tp} value={tp}>{tp}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.period_status")}</label>
                    <select className="form-control" value={form.statut}
                      onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                      {["EN_COURS", "CLOTURE", "ARCHIVE"].map(s => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.period_date_start")} *</label>
                    <input type="date" className="form-control" required value={form.date_debut}
                      onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("objectifs.period_date_end")} *</label>
                    <input type="date" className="form-control" required value={form.date_fin}
                      onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("objectifs.description")}</label>
                  <textarea className="form-control" rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-save mr-1" />}
                  {editId ? t("objectifs.period_save") : t("objectifs.period_create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RHLayout>
  );
}
