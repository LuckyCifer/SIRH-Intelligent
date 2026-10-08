import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { creerSanction, updateSanction, getSanction } from "../../../api/sanctions";
import { chargerTout } from "../../../api/listes";

const CHAMP_INIT = {
  employe: "",
  motif: "",
  description: "",
  date_faits: "",
  type_sanction: "AVERTISSEMENT",
  date_sanction: new Date().toISOString().split("T")[0],
  date_debut_effet: "",
  date_fin_effet: "",
  mesures_correctives: "",
  document: null,
  duree_mise_a_pied_jours: "",
  date_debut_mise_a_pied: "",
  date_fin_mise_a_pied: "",
  notifie_it: false,
  date_notification_it: "",
  delai_reponse_jours: 8,
};

export default function FormulaireSanction() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { t }     = useTranslation();
  const isEdit    = Boolean(id);

  const [etape,      setEtape]      = useState(0);
  const [form,       setForm]       = useState(CHAMP_INIT);
  const [employes,   setEmployes]   = useState([]);
  const [loading,    setLoading]    = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  const ETAPE_LABELS = [t("sanctions.step_facts"), t("sanctions.step_decision")];

  const BANNIERES = {
    AVERTISSEMENT:             { cls: "alert-info",    icon: "info-circle",        texte: t("sanctions.banner_avertissement") },
    BLAME:                     { cls: "alert-info",    icon: "info-circle",        texte: t("sanctions.banner_blame") },
    MISE_A_PIED:               { cls: "alert-danger",  icon: "exclamation-triangle",texte: t("sanctions.banner_mise_a_pied") },
    LICENCIEMENT_FAUTE_GRAVE:  { cls: "alert-warning", icon: "gavel",              texte: t("sanctions.banner_lic_grave") },
    LICENCIEMENT_FAUTE_LOURDE: { cls: "alert-warning", icon: "gavel",              texte: t("sanctions.banner_lic_lourde") },
  };

  useEffect(() => {
    const promises = [chargerTout("/accounts/users/")];
    if (isEdit) promises.push(getSanction(id));
    Promise.all(promises)
      .then(([eRes, sRes]) => {
        setEmployes(eRes.data.results ?? eRes.data);
        if (sRes) {
          const s = sRes.data;
          setForm({
            employe: s.employe || "",
            motif: s.motif || "",
            description: s.description || "",
            date_faits: s.date_faits || "",
            type_sanction: s.type_sanction || "AVERTISSEMENT",
            date_sanction: s.date_sanction || "",
            date_debut_effet: s.date_debut_effet || "",
            date_fin_effet: s.date_fin_effet || "",
            mesures_correctives: s.mesures_correctives || "",
            document: null,
            duree_mise_a_pied_jours: s.duree_mise_a_pied_jours ?? "",
            date_debut_mise_a_pied: s.date_debut_mise_a_pied || "",
            date_fin_mise_a_pied: s.date_fin_mise_a_pied || "",
            notifie_it: s.notifie_it || false,
            date_notification_it: s.date_notification_it || "",
            delai_reponse_jours: s.delai_reponse_jours ?? 8,
          });
        }
      })
      .catch(() => toast.error(t("sanctions.load_error")))
      .finally(() => setLoading(false));
  }, [id, isEdit]); // eslint-disable-line

  const set = (k) => (e) => {
    if (e.target.type === "file") {
      const val = e.target.files[0];
      if (val && val.size > 5 * 1024 * 1024) return toast.error(t("sanctions.file_too_large"));
      return setForm((prev) => ({ ...prev, [k]: val }));
    }
    if (e.target.type === "checkbox") {
      return setForm((prev) => ({ ...prev, [k]: e.target.checked }));
    }
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const validerEtape1 = () => {
    const errs = {};
    if (!form.employe)       errs.employe    = t("sanctions.val_employee");
    if (!form.motif.trim())  errs.motif      = t("sanctions.val_reason");
    if (!form.date_faits)    errs.date_faits = t("sanctions.val_date_facts");
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    setErrors({});
    return true;
  };

  const validerEtape2 = () => {
    const errs = {};
    if (!form.type_sanction) errs.type_sanction = t("sanctions.val_type");
    if (!form.date_sanction) errs.date_sanction  = t("sanctions.val_date");
    if (form.type_sanction === "MISE_A_PIED") {
      if (!form.duree_mise_a_pied_jours) {
        errs.duree_mise_a_pied_jours = t("sanctions.val_duration_required");
      } else if (parseInt(form.duree_mise_a_pied_jours) > 8) {
        errs.duree_mise_a_pied_jours = t("sanctions.val_duration_max");
      }
    }
    if (form.type_sanction === "LICENCIEMENT_FAUTE_LOURDE" && !form.description.trim()) {
      errs.description = t("sanctions.val_description_lourde");
    }
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    setErrors({});
    return true;
  };

  const handleSuivant = () => { if (validerEtape1()) setEtape(1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validerEtape2()) return;
    setSubmitting(true);
    try {
      const payload = new FormData();
      const champs = ["employe", "motif", "description", "date_faits", "type_sanction",
                      "date_sanction", "mesures_correctives", "delai_reponse_jours"];
      champs.forEach((k) => { if (form[k] !== "" && form[k] !== null) payload.append(k, form[k]); });
      if (form.date_debut_effet) payload.append("date_debut_effet", form.date_debut_effet);
      if (form.date_fin_effet)   payload.append("date_fin_effet",   form.date_fin_effet);
      if (form.document)         payload.append("document",         form.document);

      if (form.type_sanction === "MISE_A_PIED") {
        if (form.duree_mise_a_pied_jours) payload.append("duree_mise_a_pied_jours", form.duree_mise_a_pied_jours);
        if (form.date_debut_mise_a_pied)  payload.append("date_debut_mise_a_pied",  form.date_debut_mise_a_pied);
        if (form.date_fin_mise_a_pied)    payload.append("date_fin_mise_a_pied",    form.date_fin_mise_a_pied);
        payload.append("notifie_it", form.notifie_it ? "true" : "false");
        if (form.notifie_it && form.date_notification_it)
          payload.append("date_notification_it", form.date_notification_it);
      }

      if (isEdit) {
        await updateSanction(id, payload);
        toast.success(t("sanctions.update_success"));
      } else {
        await creerSanction(payload);
        toast.success(t("sanctions.create_success"));
      }
      navigate("/rh/sanctions");
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        setErrors(data);
        toast.error(t("sanctions.form_error"));
      } else {
        toast.error(t("sanctions.save_error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fStyle = { background: "var(--card-bg)", color: "var(--text-primary)", borderColor: "var(--border-color)" };
  const dureeVal = parseInt(form.duree_mise_a_pied_jours) || 0;
  const banniere = BANNIERES[form.type_sanction];
  const pageTitle = isEdit ? t("sanctions.edit_title") : t("sanctions.new_title");

  if (loading) return (
    <RHLayout pageTitle={isEdit ? t("sanctions.edit_title") : t("sanctions.new_title_short")}>
      <div className="text-center py-5">
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
      </div>
    </RHLayout>
  );

  return (
    <RHLayout pageTitle={pageTitle}>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="d-flex mb-4">
            {ETAPE_LABELS.map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", margin: "0 auto 6px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.9rem",
                  background: i < etape ? "#28a745" : i === etape ? "#dc3545" : "var(--border-color)",
                  color: i <= etape ? "#fff" : "var(--text-muted)",
                  border: i === etape ? "2px solid #dc3545" : "2px solid transparent",
                }}>
                  {i < etape ? <i className="fas fa-check" /> : i + 1}
                </div>
                <div style={{ fontSize: "0.78rem", color: i === etape ? "#dc3545" : "var(--text-muted)", fontWeight: i === etape ? 600 : 400 }}>
                  {label}
                </div>
                {i < ETAPE_LABELS.length - 1 && (
                  <div style={{
                    position: "absolute", top: 18, left: "75%", right: "-25%",
                    height: 2, background: i < etape ? "#28a745" : "var(--border-color)",
                  }} />
                )}
              </div>
            ))}
          </div>

          <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
            <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h5 style={{ color: "var(--page-title)", margin: 0 }}>
                <i className={`fas fa-${etape === 0 ? "file-alt" : "gavel"} mr-2`} style={{ color: "#dc3545" }} />
                {t("sanctions.step_label", { n: etape + 1, label: ETAPE_LABELS[etape] })}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {etape === 0 && (
                  <>
                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>
                        {t("sanctions.field_employee")} <span className="text-danger">*</span>
                      </label>
                      <select className={`form-control ${errors.employe ? "is-invalid" : ""}`}
                        value={form.employe} onChange={set("employe")} style={fStyle}>
                        <option value="">{t("sanctions.select_employee")}</option>
                        {employes.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name} — {e.departement_nom || "—"}
                          </option>
                        ))}
                      </select>
                      {errors.employe && <div className="invalid-feedback">{errors.employe}</div>}
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>
                        {t("sanctions.field_date_facts")} <span className="text-danger">*</span>
                      </label>
                      <input type="date"
                        className={`form-control ${errors.date_faits ? "is-invalid" : ""}`}
                        value={form.date_faits} onChange={set("date_faits")} style={fStyle} />
                      {errors.date_faits && <div className="invalid-feedback">{errors.date_faits}</div>}
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>
                        {t("sanctions.field_reason")} <span className="text-danger">*</span>
                      </label>
                      <input className={`form-control ${errors.motif ? "is-invalid" : ""}`}
                        value={form.motif} onChange={set("motif")}
                        placeholder={t("sanctions.reason_placeholder")} style={fStyle} />
                      {errors.motif && <div className="invalid-feedback">{errors.motif}</div>}
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>
                        {t("sanctions.field_description")}
                        {form.type_sanction === "LICENCIEMENT_FAUTE_LOURDE" && (
                          <span className="text-danger ml-1">{t("sanctions.description_required_note")}</span>
                        )}
                      </label>
                      <textarea className={`form-control ${errors.description ? "is-invalid" : ""}`}
                        rows={5} value={form.description} onChange={set("description")}
                        placeholder={t("sanctions.description_placeholder")} style={fStyle} />
                      {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button type="button" className="btn btn-secondary" onClick={() => navigate("/rh/sanctions")}>
                        <i className="fas fa-times mr-1" /> {t("common.cancel")}
                      </button>
                      <button type="button" className="btn btn-danger" onClick={handleSuivant}>
                        {t("sanctions.next_btn")} <i className="fas fa-arrow-right ml-1" />
                      </button>
                    </div>
                  </>
                )}

                {etape === 1 && (
                  <>
                    <div className="row">
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>
                          {t("sanctions.field_type")} <span className="text-danger">*</span>
                        </label>
                        <select className={`form-control ${errors.type_sanction ? "is-invalid" : ""}`}
                          value={form.type_sanction} onChange={set("type_sanction")} style={fStyle}>
                          <option value="AVERTISSEMENT">{t("sanctions.type_avertissement_full")}</option>
                          <option value="BLAME">{t("sanctions.type_blame_full")}</option>
                          <option value="MISE_A_PIED">{t("sanctions.type_mise_a_pied_full")}</option>
                          <option value="LICENCIEMENT_FAUTE_GRAVE">{t("sanctions.type_lic_grave_full")}</option>
                          <option value="LICENCIEMENT_FAUTE_LOURDE">{t("sanctions.type_lic_lourde_full")}</option>
                        </select>
                        {errors.type_sanction && <div className="invalid-feedback">{errors.type_sanction}</div>}
                      </div>
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>
                          {t("sanctions.field_date_sanction")} <span className="text-danger">*</span>
                        </label>
                        <input type="date"
                          className={`form-control ${errors.date_sanction ? "is-invalid" : ""}`}
                          value={form.date_sanction} onChange={set("date_sanction")} style={fStyle} />
                        {errors.date_sanction && <div className="invalid-feedback">{errors.date_sanction}</div>}
                      </div>
                    </div>

                    {banniere && (
                      <div className={`alert ${banniere.cls} mb-3`}>
                        <i className={`fas fa-${banniere.icon} mr-2`} />
                        {banniere.texte}
                      </div>
                    )}

                    {form.type_sanction === "MISE_A_PIED" && (
                      <div className="card mb-3" style={{ background: "rgba(220,53,69,0.04)", border: "1px solid rgba(220,53,69,0.3)" }}>
                        <div className="card-header" style={{ background: "transparent", borderBottom: "1px solid rgba(220,53,69,0.3)" }}>
                          <strong style={{ color: "#dc3545", fontSize: "0.88rem" }}>
                            <i className="fas fa-clock mr-1" />{t("sanctions.legal_conditions_title")}
                          </strong>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-4 form-group">
                              <label style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>
                                {t("sanctions.field_duration_days")} <span className="text-danger">*</span>
                                <small className="ml-1 text-muted">{t("sanctions.field_duration_max")}</small>
                              </label>
                              <input type="number" min="1" max="8"
                                className={`form-control ${errors.duree_mise_a_pied_jours || dureeVal > 8 ? "is-invalid" : ""}`}
                                value={form.duree_mise_a_pied_jours}
                                onChange={set("duree_mise_a_pied_jours")} style={fStyle} />
                              {dureeVal > 8 && (
                                <div className="invalid-feedback d-block" style={{ fontWeight: 600 }}>
                                  <i className="fas fa-exclamation-circle mr-1" />
                                  {t("sanctions.duration_max_error")}
                                </div>
                              )}
                              {errors.duree_mise_a_pied_jours && (
                                <div className="invalid-feedback">{errors.duree_mise_a_pied_jours}</div>
                              )}
                            </div>
                            <div className="col-md-4 form-group">
                              <label style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>{t("sanctions.field_start_map")}</label>
                              <input type="date" className="form-control"
                                value={form.date_debut_mise_a_pied} onChange={set("date_debut_mise_a_pied")} style={fStyle} />
                            </div>
                            <div className="col-md-4 form-group">
                              <label style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>{t("sanctions.field_end_map")}</label>
                              <input type="date" className="form-control"
                                value={form.date_fin_mise_a_pied} onChange={set("date_fin_mise_a_pied")} style={fStyle} />
                            </div>
                          </div>

                          <div className="form-group">
                            <div className="custom-control custom-checkbox">
                              <input type="checkbox" className="custom-control-input"
                                id="notifie_it" checked={form.notifie_it} onChange={set("notifie_it")} />
                              <label className="custom-control-label" htmlFor="notifie_it" style={{ color: "var(--text-primary)" }}>
                                <strong>{t("sanctions.field_notifie_it")}</strong>
                                <span className="text-danger ml-1">{t("sanctions.field_notifie_it_delay")}</span>
                              </label>
                            </div>
                            <small className="text-muted">{t("sanctions.field_notifie_it_note")}</small>
                          </div>

                          {form.notifie_it && (
                            <div className="form-group col-md-6 pl-0">
                              <label style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>
                                {t("sanctions.field_date_notification_it")}
                              </label>
                              <input type="date" className="form-control"
                                value={form.date_notification_it} onChange={set("date_notification_it")} style={fStyle} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="row">
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>{t("sanctions.field_effect_start")}</label>
                        <input type="date" className="form-control"
                          value={form.date_debut_effet} onChange={set("date_debut_effet")} style={fStyle} />
                      </div>
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>{t("sanctions.field_effect_end")}</label>
                        <input type="date" className="form-control"
                          value={form.date_fin_effet} onChange={set("date_fin_effet")} style={fStyle} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>{t("sanctions.field_corrective")}</label>
                      <textarea className="form-control" rows={3}
                        value={form.mesures_correctives} onChange={set("mesures_correctives")}
                        placeholder={t("sanctions.corrective_placeholder")} style={fStyle} />
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>
                        {t("sanctions.field_document")}
                        <small className="ml-2 text-muted">{t("sanctions.document_hint")}</small>
                      </label>
                      <input type="file" className="form-control-file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={set("document")} style={{ color: "var(--text-primary)" }} />
                      {form.document && (
                        <small className="text-success">
                          <i className="fas fa-paperclip mr-1" />{form.document.name}
                        </small>
                      )}
                    </div>

                    <div className="d-flex justify-content-between gap-2 mt-3">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setEtape(0)}>
                        <i className="fas fa-arrow-left mr-1" /> {t("sanctions.back_btn")}
                      </button>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/rh/sanctions")}>
                          <i className="fas fa-times mr-1" /> {t("common.cancel")}
                        </button>
                        <button type="submit" className="btn btn-danger" disabled={submitting}>
                          {submitting
                            ? <><i className="fas fa-spinner fa-spin mr-1" />{t("sanctions.saving")}</>
                            : <><i className="fas fa-save mr-1" />{isEdit ? t("sanctions.update_btn") : t("sanctions.save_btn")}</>
                          }
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </RHLayout>
  );
}
