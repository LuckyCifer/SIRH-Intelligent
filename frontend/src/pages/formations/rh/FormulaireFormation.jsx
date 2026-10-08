import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getFormation, creerFormation, updateFormation, getCategories,
} from "../../../api/formations";

const CHAMP_INIT = {
  titre: "", categorie: "", description: "", objectifs_pedagogiques: "",
  modalite: "PRESENTIEL", niveau: "DEBUTANT", duree_heures: "",
  date_debut: "", date_fin: "", lieu: "", formateur: "",
  cout: "", places_max: "", statut: "PLANIFIEE",
};

export default function FormulaireFormation() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const isEdit     = Boolean(id);

  const [form,       setForm]       = useState(CHAMP_INIT);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    const promises = [getCategories()];
    if (isEdit) promises.push(getFormation(id));
    Promise.all(promises)
      .then(([cRes, fRes]) => {
        setCategories(cRes.data.results ?? cRes.data);
        if (fRes) {
          const f = fRes.data;
          setForm({
            titre: f.titre || "",
            categorie: f.categorie || "",
            description: f.description || "",
            objectifs_pedagogiques: f.objectifs_pedagogiques || "",
            modalite: f.modalite || "PRESENTIEL",
            niveau: f.niveau || "DEBUTANT",
            duree_heures: f.duree_heures || "",
            date_debut: f.date_debut || "",
            date_fin: f.date_fin || "",
            lieu: f.lieu || "",
            formateur: f.formateur || "",
            cout: f.cout || "",
            places_max: f.places_max || "",
            statut: f.statut || "PLANIFIEE",
          });
        }
      })
      .catch(() => toast.error(t("formations.load_error")))
      .finally(() => setLoading(false));
  }, [id, isEdit]); // eslint-disable-line

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.titre.trim())                            errs.titre       = t("formations.val_title");
    if (!form.categorie)                               errs.categorie   = t("formations.val_category");
    if (!form.duree_heures || isNaN(form.duree_heures)) errs.duree_heures = t("formations.val_duration");
    if (!form.places_max   || isNaN(form.places_max))  errs.places_max  = t("formations.val_places");
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.cout)       delete payload.cout;
      if (!payload.date_debut) delete payload.date_debut;
      if (!payload.date_fin)   delete payload.date_fin;
      if (isEdit) {
        await updateFormation(id, payload);
        toast.success(t("formations.update_success"));
      } else {
        await creerFormation(payload);
        toast.success(t("formations.create_success"));
      }
      navigate("/rh/formations");
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        setErrors(data);
        toast.error(t("formations.form_error"));
      } else {
        toast.error(t("formations.save_error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    background: "var(--card-bg)",
    color: "var(--text-primary)",
    borderColor: "var(--border-color)",
  };

  const pageTitle = isEdit ? t("formations.edit_title") : t("formations.new_title");

  if (loading) return (
    <RHLayout pageTitle={pageTitle}>
      <div className="text-center py-5">
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
      </div>
    </RHLayout>
  );

  return (
    <RHLayout pageTitle={pageTitle}>
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
            <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h5 style={{ color: "var(--page-title)", margin: 0 }}>
                <i className={`fas fa-${isEdit ? "edit" : "plus-circle"} mr-2`} style={{ color: "var(--acerfi-blue)" }} />
                {pageTitle}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <h6 style={{ color: "var(--acerfi-blue)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 16 }}>
                  <i className="fas fa-info-circle mr-2" />{t("formations.general_info")}
                </h6>

                <div className="row">
                  <div className="col-md-8 form-group">
                    <label style={{ color: "var(--text-primary)" }}>
                      {t("formations.title_label")} <span className="text-danger">*</span>
                    </label>
                    <input className={`form-control ${errors.titre ? "is-invalid" : ""}`}
                      value={form.titre} onChange={set("titre")} style={fieldStyle} />
                    {errors.titre && <div className="invalid-feedback">{errors.titre}</div>}
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>
                      {t("formations.category")} <span className="text-danger">*</span>
                    </label>
                    <select className={`form-control ${errors.categorie ? "is-invalid" : ""}`}
                      value={form.categorie} onChange={set("categorie")} style={fieldStyle}>
                      <option value="">{t("formations.select_category")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                    {errors.categorie && <div className="invalid-feedback">{errors.categorie}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("formations.description")}</label>
                  <textarea className="form-control" rows={3} value={form.description}
                    onChange={set("description")} style={fieldStyle} />
                </div>

                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("formations.objectives_pedagogiques")}</label>
                  <textarea className="form-control" rows={3} value={form.objectifs_pedagogiques}
                    onChange={set("objectifs_pedagogiques")}
                    placeholder={t("formations.objectives_pedagogiques_placeholder")} style={fieldStyle} />
                </div>

                <h6 style={{ color: "var(--acerfi-blue)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 16, marginTop: 20 }}>
                  <i className="fas fa-cog mr-2" />{t("formations.modality_level")}
                </h6>

                <div className="row">
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.modality")}</label>
                    <select className="form-control" value={form.modalite} onChange={set("modalite")} style={fieldStyle}>
                      <option value="PRESENTIEL">{t("formations.modality_presentiel")}</option>
                      <option value="DISTANCIEL">{t("formations.modality_distanciel")}</option>
                      <option value="HYBRIDE">{t("formations.modality_hybride")}</option>
                      <option value="ELEARNING">{t("formations.modality_elearning")}</option>
                    </select>
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.level")}</label>
                    <select className="form-control" value={form.niveau} onChange={set("niveau")} style={fieldStyle}>
                      <option value="DEBUTANT">{t("formations.level_debutant")}</option>
                      <option value="INTERMEDIAIRE">{t("formations.level_intermediaire")}</option>
                      <option value="AVANCE">{t("formations.level_avance")}</option>
                      <option value="EXPERT">{t("formations.level_expert")}</option>
                    </select>
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>
                      {t("formations.duration_hours")} <span className="text-danger">*</span>
                    </label>
                    <input type="number" min="1"
                      className={`form-control ${errors.duree_heures ? "is-invalid" : ""}`}
                      value={form.duree_heures} onChange={set("duree_heures")} style={fieldStyle} />
                    {errors.duree_heures && <div className="invalid-feedback">{errors.duree_heures}</div>}
                  </div>
                </div>

                <h6 style={{ color: "var(--acerfi-blue)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 16, marginTop: 20 }}>
                  <i className="fas fa-calendar-alt mr-2" />{t("formations.dates_location")}
                </h6>

                <div className="row">
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.start_date")}</label>
                    <input type="date" className="form-control" value={form.date_debut}
                      onChange={set("date_debut")} style={fieldStyle} />
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.end_date")}</label>
                    <input type="date" className="form-control" value={form.date_fin}
                      onChange={set("date_fin")} style={fieldStyle} />
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.location")}</label>
                    <input className="form-control" value={form.lieu} onChange={set("lieu")} style={fieldStyle} />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.trainer_org")}</label>
                    <input className="form-control" value={form.formateur} onChange={set("formateur")} style={fieldStyle} />
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.cost")}</label>
                    <input type="number" min="0" className="form-control" value={form.cout}
                      onChange={set("cout")} style={fieldStyle} />
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>
                      {t("formations.max_participants")} <span className="text-danger">*</span>
                    </label>
                    <input type="number" min="1"
                      className={`form-control ${errors.places_max ? "is-invalid" : ""}`}
                      value={form.places_max} onChange={set("places_max")} style={fieldStyle} />
                    {errors.places_max && <div className="invalid-feedback">{errors.places_max}</div>}
                  </div>
                </div>

                {isEdit && (
                  <div className="form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("formations.status")}</label>
                    <select className="form-control" value={form.statut} onChange={set("statut")} style={fieldStyle}>
                      <option value="PLANIFIEE">{t("formations.planned_label")}</option>
                      <option value="EN_COURS">{t("formations.in_progress_label")}</option>
                      <option value="TERMINEE">{t("formations.finished_label")}</option>
                      <option value="ANNULEE">{t("formations.cancelled_label")}</option>
                    </select>
                  </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button type="button" className="btn btn-secondary" onClick={() => navigate("/rh/formations")}>
                    <i className="fas fa-times mr-1" /> {t("common.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><i className="fas fa-spinner fa-spin mr-1" />{t("formations.saving")}</>
                    ) : (
                      <><i className="fas fa-save mr-1" />{isEdit ? t("formations.save_changes") : t("formations.create_btn")}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </RHLayout>
  );
}
