import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import useAuthStore from "../../../store/authStore";
import { getTimelineEmploye, createEvenement, deleteEvenement } from "../../../api/carriere";
import api from "../../../api/axios";
import { chargerTout } from "../../../api/listes";

const FORM_VIDE = {
  type_evenement: "EMBAUCHE",
  date_evenement: "",
  titre: "",
  description: "",
  departement_avant: "",
  departement_apres: "",
  poste_avant: "",
  poste_apres: "",
  salaire_avant: "",
  salaire_apres: "",
};

export default function HistoriqueCarriere() {
  const { t, i18n } = useTranslation();
  const { id: employeId } = useParams();
  const { user } = useAuthStore();
  const peutModifier = user?.role === "RH" || user?.role === "ADMIN";

  const locale = i18n.language === "en" ? "en-US" : "fr-FR";

  const TYPE_CONFIG = {
    EMBAUCHE:         { icon: "fas fa-door-open",           color: "#28a745", label: t("carriere.type_embauche") },
    PROMOTION:        { icon: "fas fa-arrow-up",             color: "#007bff", label: t("carriere.type_promotion") },
    MUTATION:         { icon: "fas fa-exchange-alt",         color: "#fd7e14", label: t("carriere.type_mutation") },
    CHANGEMENT_POSTE: { icon: "fas fa-briefcase",            color: "#6f42c1", label: t("carriere.type_changement_poste") },
    AUGMENTATION:     { icon: "fas fa-dollar-sign",          color: "#20c997", label: t("carriere.type_augmentation") },
    FORMATION:        { icon: "fas fa-graduation-cap",       color: "#17a2b8", label: t("carriere.type_formation") },
    CONGE_LONG:       { icon: "fas fa-umbrella-beach",       color: "#6c757d", label: t("carriere.type_conge_long") },
    AVERTISSEMENT:    { icon: "fas fa-exclamation-triangle", color: "#dc3545", label: t("carriere.type_avertissement") },
    FELICITATION:     { icon: "fas fa-award",                color: "#ffc107", label: t("carriere.type_felicitation") },
    DEPART:           { icon: "fas fa-door-closed",          color: "#343a40", label: t("carriere.type_depart") },
    AUTRE:            { icon: "fas fa-info-circle",          color: "#adb5bd", label: t("carriere.type_autre") },
  };
  const TYPES = Object.keys(TYPE_CONFIG);

  const [evenements, setEvenements] = useState([]);
  const [employe, setEmploye] = useState(null);
  const [departements, setDepartements] = useState([]);
  const [postes, setPostes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!employeId) return;
    setLoading(true);
    Promise.all([
      getTimelineEmploye(employeId),
      api.get(`/accounts/users/${employeId}/`),
      chargerTout("/departements/"),
      chargerTout("/departements/postes/"),
    ])
      .then(([ev, emp, depts, ps]) => {
        setEvenements(ev.data);
        setEmploye(emp.data);
        setDepartements(depts.data.results ?? depts.data);
        setPostes(ps.data.results ?? ps.data);
      })
      .catch(() => toast.error(t("carriere.load_error")))
      .finally(() => setLoading(false));
  }, [employeId]); // eslint-disable-line

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, employe: employeId };
      ["departement_avant", "departement_apres", "poste_avant", "poste_apres",
       "salaire_avant", "salaire_apres"].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      const r = await createEvenement(payload);
      setEvenements((prev) =>
        [r.data, ...prev].sort((a, b) => new Date(b.date_evenement) - new Date(a.date_evenement))
      );
      setShowModal(false);
      setForm(FORM_VIDE);
      toast.success(t("carriere.save_success"));
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("carriere.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm(t("carriere.delete_confirm"))) return;
    try {
      await deleteEvenement(id);
      setEvenements((prev) => prev.filter((e) => e.id !== id));
      toast.success(t("carriere.delete_success"));
    } catch {
      toast.error(t("carriere.delete_error"));
    }
  };

  const nomEmploye = employe
    ? `${employe.first_name || ""} ${employe.last_name || ""}`.trim() || employe.username
    : "Employé";

  return (
    <RHLayout pageTitle={`${t("carriere.title")} — ${nomEmploye}`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 style={{ color: "var(--page-title)", margin: 0 }}>
            <i className="fas fa-stream mr-2" style={{ color: "var(--acerfi-blue)" }} />
            {t("carriere.title")}
          </h4>
          {employe && (
            <small style={{ color: "var(--text-muted)" }}>
              {employe.email} — {employe.departement_detail?.nom || t("carriere.no_dept")}
            </small>
          )}
        </div>
        {peutModifier && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus mr-1" /> {t("carriere.add_event")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      ) : evenements.length === 0 ? (
        <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
          <i className="fas fa-history fa-3x mb-3 d-block" />
          <p>{t("carriere.no_events")}</p>
          {peutModifier && (
            <button className="btn btn-outline-primary btn-sm" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus mr-1" /> {t("carriere.add_first_event")}
            </button>
          )}
        </div>
      ) : (
        <div className="timeline timeline-inverse">
          {evenements.map((ev) => {
            const cfg = TYPE_CONFIG[ev.type_evenement] || TYPE_CONFIG.AUTRE;
            return (
              <div key={ev.id}>
                <i className={`${cfg.icon} bg-primary`} style={{ background: `${cfg.color} !important` }} />
                <div className="timeline-item">
                  <span className="time" style={{ color: "var(--text-muted)" }}>
                    <i className="fas fa-clock mr-1" />
                    {new Date(ev.date_evenement).toLocaleDateString(locale, {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </span>
                  <h3
                    className="timeline-header"
                    style={{
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <span className="badge mr-2" style={{ background: cfg.color, color: "#fff" }}>
                      <i className={`${cfg.icon} mr-1`} />
                      {ev.type_display || cfg.label}
                    </span>
                    {ev.titre}
                    {peutModifier && (
                      <button
                        className="btn btn-xs btn-outline-danger float-right"
                        onClick={() => handleSupprimer(ev.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </h3>

                  {(ev.description ||
                    ev.departement_avant_detail ||
                    ev.departement_apres_detail ||
                    ev.salaire_avant ||
                    ev.salaire_apres) && (
                    <div
                      className="timeline-body"
                      style={{
                        background: "var(--card-bg)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      {ev.description && <p className="mb-2">{ev.description}</p>}

                      {(ev.departement_avant_detail || ev.departement_apres_detail) && (
                        <p className="mb-1" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          <i className="fas fa-building mr-1" />
                          <strong>{t("carriere.dept_label")} :</strong>{" "}
                          {ev.departement_avant_detail?.nom && (
                            <span className="badge badge-secondary mr-1">
                              {ev.departement_avant_detail.nom}
                            </span>
                          )}
                          {ev.departement_avant_detail && ev.departement_apres_detail && (
                            <i className="fas fa-arrow-right mx-1" />
                          )}
                          {ev.departement_apres_detail?.nom && (
                            <span className="badge badge-primary">
                              {ev.departement_apres_detail.nom}
                            </span>
                          )}
                        </p>
                      )}

                      {(ev.poste_avant_detail || ev.poste_apres_detail) && (
                        <p className="mb-1" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          <i className="fas fa-briefcase mr-1" />
                          <strong>{t("carriere.poste_label")} :</strong>{" "}
                          {ev.poste_avant_detail?.titre && (
                            <span className="badge badge-secondary mr-1">
                              {ev.poste_avant_detail.titre}
                            </span>
                          )}
                          {ev.poste_avant_detail && ev.poste_apres_detail && (
                            <i className="fas fa-arrow-right mx-1" />
                          )}
                          {ev.poste_apres_detail?.titre && (
                            <span className="badge badge-primary">
                              {ev.poste_apres_detail.titre}
                            </span>
                          )}
                        </p>
                      )}

                      {(ev.salaire_avant || ev.salaire_apres) && (
                        <p className="mb-0" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          <i className="fas fa-dollar-sign mr-1" />
                          <strong>{t("carriere.salary_label")} :</strong>{" "}
                          {ev.salaire_avant && (
                            <span className="mr-1">
                              {Number(ev.salaire_avant).toLocaleString(locale)} FCFA
                            </span>
                          )}
                          {ev.salaire_avant && ev.salaire_apres && (
                            <i className="fas fa-arrow-right mx-1" />
                          )}
                          {ev.salaire_apres && (
                            <span className="text-success font-weight-bold">
                              {Number(ev.salaire_apres).toLocaleString(locale)} FCFA
                            </span>
                          )}
                          {ev.augmentation_pct && (
                            <span className="badge badge-success ml-2">
                              +{ev.augmentation_pct}%
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className="timeline-footer"
                    style={{
                      background: "var(--card-bg)",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <i className="fas fa-user-edit mr-1" />
                    {t("carriere.recorded_by")} {ev.enregistre_par_detail?.nom_complet || "—"}
                  </div>
                </div>
              </div>
            );
          })}
          <div>
            <i className="fas fa-clock bg-gray" />
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <form className="modal-content" style={{ background: "var(--card-bg)" }} onSubmit={handleSave}>
              <div className="modal-header" style={{ borderColor: "var(--border-color)" }}>
                <h5 className="modal-title" style={{ color: "var(--page-title)" }}>
                  <i className="fas fa-plus-circle mr-2" style={{ color: "var(--acerfi-blue)" }} />
                  {t("carriere.modal_title")}
                </h5>
                <button
                  type="button"
                  className="close"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => setShowModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_type")} *</label>
                    <select
                      name="type_evenement"
                      className="form-control"
                      value={form.type_evenement}
                      onChange={handleChange}
                      required
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      {TYPES.map((tk) => (
                        <option key={tk} value={tk}>{TYPE_CONFIG[tk].label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_date")} *</label>
                    <input
                      type="date"
                      name="date_evenement"
                      className="form-control"
                      value={form.date_evenement}
                      onChange={handleChange}
                      required
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="col-12 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_title_label")} *</label>
                    <input
                      type="text"
                      name="titre"
                      className="form-control"
                      value={form.titre}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Promotion au poste de Chef de projet"
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="col-12 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_description")}</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows={3}
                      value={form.description}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_dept_before")}</label>
                    <select
                      name="departement_avant"
                      className="form-control"
                      value={form.departement_avant}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">{t("carriere.none_option")}</option>
                      {departements.map((d) => (
                        <option key={d.id} value={d.id}>{d.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_dept_after")}</label>
                    <select
                      name="departement_apres"
                      className="form-control"
                      value={form.departement_apres}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">{t("carriere.none_option")}</option>
                      {departements.map((d) => (
                        <option key={d.id} value={d.id}>{d.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_poste_before")}</label>
                    <select
                      name="poste_avant"
                      className="form-control"
                      value={form.poste_avant}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">{t("carriere.none_option")}</option>
                      {postes.map((p) => (
                        <option key={p.id} value={p.id}>{p.titre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_poste_after")}</label>
                    <select
                      name="poste_apres"
                      className="form-control"
                      value={form.poste_apres}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">{t("carriere.none_option")}</option>
                      {postes.map((p) => (
                        <option key={p.id} value={p.id}>{p.titre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_salary_before")}</label>
                    <input
                      type="number"
                      name="salaire_avant"
                      className="form-control"
                      value={form.salaire_avant}
                      onChange={handleChange}
                      min="0"
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("carriere.field_salary_after")}</label>
                    <input
                      type="number"
                      name="salaire_apres"
                      className="form-control"
                      value={form.salaire_apres}
                      onChange={handleChange}
                      min="0"
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderColor: "var(--border-color)" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  {t("carriere.cancel_btn")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin mr-1" /> {t("carriere.saving")}</>
                  ) : (
                    <><i className="fas fa-save mr-1" /> {t("carriere.save_btn")}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RHLayout>
  );
}
