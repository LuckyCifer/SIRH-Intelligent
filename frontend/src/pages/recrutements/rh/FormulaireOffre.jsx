import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import { createOffre, updateOffre, getOffre } from "../../../api/recrutements";
import { chargerTout } from "../../../api/listes";

const FORM_VIDE = {
  titre: "",
  departement: "",
  poste: "",
  type_contrat: "CDI",
  niveau_experience: "JUNIOR",
  description: "",
  competences_requises: "",
  salaire_min: "",
  salaire_max: "",
  lieu: "Yaoundé, Cameroun",
  date_cloture: "",
  nb_postes: 1,
  statut: "BROUILLON",
};

export default function FormulaireOffre() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(FORM_VIDE);
  const [departements, setDepartements] = useState([]);
  const [postes, setPostes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    const loads = [
      chargerTout("/departements/"),
      chargerTout("/departements/postes/"),
    ];
    if (isEdit) loads.push(getOffre(id));

    Promise.all(loads).then(([dRes, pRes, oRes]) => {
      setDepartements(dRes.data.results ?? dRes.data);
      setPostes(pRes.data.results ?? pRes.data);
      if (oRes) {
        const o = oRes.data;
        setForm({
          titre: o.titre || "",
          departement: o.departement || "",
          poste: o.poste || "",
          type_contrat: o.type_contrat || "CDI",
          niveau_experience: o.niveau_experience || "JUNIOR",
          description: o.description || "",
          competences_requises: o.competences_requises || "",
          salaire_min: o.salaire_min || "",
          salaire_max: o.salaire_max || "",
          lieu: o.lieu || "Yaoundé, Cameroun",
          date_cloture: o.date_cloture || "",
          nb_postes: o.nb_postes || 1,
          statut: o.statut || "BROUILLON",
        });
      }
    }).catch(() => toast.error(t("recrutements.error_load"))).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (statutFinal) => {
    setSaving(true);
    try {
      const payload = { ...form, statut: statutFinal };
      ["salaire_min", "salaire_max"].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      if (!payload.poste) delete payload.poste;
      if (!payload.date_cloture) delete payload.date_cloture;

      if (isEdit) {
        await updateOffre(id, payload);
        toast.success(t("recrutements.offer_updated"));
      } else {
        const r = await createOffre(payload);
        toast.success(
          statutFinal === "PUBLIEE"
            ? t("recrutements.offer_created_published")
            : t("recrutements.draft_saved")
        );
        navigate(`/rh/recrutements/offres/${r.data.id}`);
        return;
      }
      navigate("/rh/recrutements/offres");
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const msg = Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join("\n");
        toast.error(msg);
      } else {
        toast.error(t("recrutements.save_error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEdit ? t("recrutements.form_title_edit") : t("recrutements.form_title_new");

  return (
    <RHLayout pageTitle={pageTitle}>
      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      ) : (
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                  <i className="fas fa-info-circle mr-2" style={{ color: "var(--acerfi-blue)" }} />
                  {t("recrutements.general_info")}
                </h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.job_title_label")} *</label>
                  <input
                    type="text" name="titre" className="form-control"
                    value={form.titre} onChange={handleChange} required
                    placeholder={t("recrutements.job_title_placeholder")}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("recrutements.department_required")} *</label>
                    <select
                      name="departement" className="form-control" value={form.departement}
                      onChange={handleChange} required
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">{t("recrutements.select_placeholder")}</option>
                      {departements.map((d) => (
                        <option key={d.id} value={d.id}>{d.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("recrutements.position_optional")}</label>
                    <select
                      name="poste" className="form-control" value={form.poste} onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">{t("recrutements.none_placeholder")}</option>
                      {postes.map((p) => (
                        <option key={p.id} value={p.id}>{p.titre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("recrutements.contract_type")}</label>
                    <select
                      name="type_contrat" className="form-control" value={form.type_contrat}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      {["CDI", "CDD", "STAGE", "FREELANCE"].map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("recrutements.experience_level")}</label>
                    <select
                      name="niveau_experience" className="form-control" value={form.niveau_experience}
                      onChange={handleChange}
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="DEBUTANT">{t("recrutements.exp_beginner")}</option>
                      <option value="JUNIOR">{t("recrutements.exp_junior")}</option>
                      <option value="CONFIRME">{t("recrutements.exp_confirmed")}</option>
                      <option value="SENIOR">{t("recrutements.exp_senior")}</option>
                    </select>
                  </div>
                  <div className="col-md-4 form-group">
                    <label style={{ color: "var(--text-primary)" }}>{t("recrutements.nb_positions")}</label>
                    <input
                      type="number" name="nb_postes" className="form-control"
                      value={form.nb_postes} onChange={handleChange} min="1"
                      style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.job_description")} *</label>
                  <textarea
                    name="description" className="form-control" rows={5}
                    value={form.description} onChange={handleChange}
                    placeholder={t("recrutements.job_description_placeholder")}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.required_skills_label")} *</label>
                  <textarea
                    name="competences_requises" className="form-control" rows={4}
                    value={form.competences_requises} onChange={handleChange}
                    placeholder={t("recrutements.required_skills_placeholder")}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                  <i className="fas fa-cog mr-2" style={{ color: "var(--acerfi-blue)" }} />
                  {t("recrutements.conditions_publication")}
                </h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.place")}</label>
                  <input
                    type="text" name="lieu" className="form-control" value={form.lieu} onChange={handleChange}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.salary_min")}</label>
                  <input
                    type="number" name="salaire_min" className="form-control" value={form.salaire_min}
                    onChange={handleChange} min="0"
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.salary_max")}</label>
                  <input
                    type="number" name="salaire_max" className="form-control" value={form.salaire_max}
                    onChange={handleChange} min="0"
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: "var(--text-primary)" }}>{t("recrutements.closing_date")}</label>
                  <input
                    type="date" name="date_cloture" className="form-control" value={form.date_cloture}
                    onChange={handleChange}
                    style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                  />
                </div>
                <hr style={{ borderColor: "var(--border-color)" }} />
                <button
                  className="btn btn-block btn-outline-secondary mb-2"
                  disabled={saving}
                  onClick={() => handleSave("BROUILLON")}
                >
                  <i className="fas fa-save mr-1" />{t("recrutements.save_draft")}
                </button>
                <button
                  className="btn btn-block btn-primary"
                  disabled={saving || !form.titre || !form.departement}
                  onClick={() => handleSave("PUBLIEE")}
                >
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin mr-1" />{t("recrutements.saving_offer")}</>
                  ) : (
                    <><i className="fas fa-bullhorn mr-1" />{t("recrutements.publish_offer")}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RHLayout>
  );
}
