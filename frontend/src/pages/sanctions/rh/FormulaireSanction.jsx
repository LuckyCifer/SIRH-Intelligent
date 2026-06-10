import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import { creerSanction, updateSanction, getSanction } from "../../../api/sanctions";
import api from "../../../api/axios";

const ETAPE_LABELS = ["Faits & Contexte", "Sanction & Décision"];

const CHAMP_INIT = {
  employe: "",
  motif: "",
  description: "",
  date_faits: "",
  type_sanction: "AVERT_ORAL",
  date_sanction: new Date().toISOString().split("T")[0],
  date_debut_effet: "",
  date_fin_effet: "",
  mesures_correctives: "",
  document: null,
};

export default function FormulaireSanction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [etape, setEtape] = useState(0);
  const [form, setForm] = useState(CHAMP_INIT);
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const promises = [api.get("/accounts/users/")];
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
            type_sanction: s.type_sanction || "AVERT_ORAL",
            date_sanction: s.date_sanction || "",
            date_debut_effet: s.date_debut_effet || "",
            date_fin_effet: s.date_fin_effet || "",
            mesures_correctives: s.mesures_correctives || "",
            document: null,
          });
        }
      })
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (k) => (e) => {
    const val = e.target.type === "file" ? e.target.files[0] : e.target.value;
    if (e.target.type === "file" && val && val.size > 5 * 1024 * 1024) {
      return toast.error("Le fichier ne doit pas dépasser 5 Mo");
    }
    setForm((prev) => ({ ...prev, [k]: val }));
  };

  const validerEtape1 = () => {
    const errs = {};
    if (!form.employe) errs.employe = "Employé requis";
    if (!form.motif.trim()) errs.motif = "Motif requis";
    if (!form.date_faits) errs.date_faits = "Date des faits requise";
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    setErrors({});
    return true;
  };

  const validerEtape2 = () => {
    const errs = {};
    if (!form.type_sanction) errs.type_sanction = "Type requis";
    if (!form.date_sanction) errs.date_sanction = "Date requise";
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    setErrors({});
    return true;
  };

  const handleSuivant = () => {
    if (validerEtape1()) setEtape(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validerEtape2()) return;
    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== "") payload.append(k, v);
      });

      if (isEdit) {
        await updateSanction(id, payload);
        toast.success("Sanction mise à jour");
      } else {
        await creerSanction(payload);
        toast.success("Sanction créée (brouillon)");
      }
      navigate("/rh/sanctions");
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        setErrors(data);
        toast.error("Vérifiez le formulaire");
      } else {
        toast.error("Erreur lors de l'enregistrement");
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

  if (loading) return (
    <RHLayout pageTitle={isEdit ? "Modifier la sanction" : "Nouvelle sanction"}>
      <div className="text-center py-5">
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
      </div>
    </RHLayout>
  );

  return (
    <RHLayout pageTitle={isEdit ? "Modifier la sanction" : "Nouvelle sanction disciplinaire"}>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Barre de progression */}
          <div className="d-flex mb-4">
            {ETAPE_LABELS.map((label, i) => (
              <div
                key={i}
                style={{ flex: 1, textAlign: "center", position: "relative" }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%", margin: "0 auto 6px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.9rem",
                    background: i < etape ? "#28a745" : i === etape ? "#dc3545" : "var(--border-color)",
                    color: i <= etape ? "#fff" : "var(--text-muted)",
                    border: i === etape ? "2px solid #dc3545" : "2px solid transparent",
                  }}
                >
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
                Étape {etape + 1} — {ETAPE_LABELS[etape]}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* ── ÉTAPE 1 : Faits & Contexte ── */}
                {etape === 0 && (
                  <>
                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>Employé concerné <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${errors.employe ? "is-invalid" : ""}`}
                        value={form.employe}
                        onChange={set("employe")}
                        style={fieldStyle}
                      >
                        <option value="">Sélectionner un employé...</option>
                        {employes.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name} — {e.departement_nom || "—"}
                          </option>
                        ))}
                      </select>
                      {errors.employe && <div className="invalid-feedback">{errors.employe}</div>}
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>Date des faits <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className={`form-control ${errors.date_faits ? "is-invalid" : ""}`}
                        value={form.date_faits}
                        onChange={set("date_faits")}
                        style={fieldStyle}
                      />
                      {errors.date_faits && <div className="invalid-feedback">{errors.date_faits}</div>}
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>Motif de la sanction <span className="text-danger">*</span></label>
                      <input
                        className={`form-control ${errors.motif ? "is-invalid" : ""}`}
                        value={form.motif}
                        onChange={set("motif")}
                        placeholder="Résumé bref du motif..."
                        style={fieldStyle}
                      />
                      {errors.motif && <div className="invalid-feedback">{errors.motif}</div>}
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>Description détaillée des faits</label>
                      <textarea
                        className="form-control"
                        rows={5}
                        value={form.description}
                        onChange={set("description")}
                        placeholder="Décrivez les faits en détail : date, lieu, contexte, témoins éventuels..."
                        style={fieldStyle}
                      />
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button type="button" className="btn btn-secondary" onClick={() => navigate("/rh/sanctions")}>
                        <i className="fas fa-times mr-1" /> Annuler
                      </button>
                      <button type="button" className="btn btn-danger" onClick={handleSuivant}>
                        Suivant <i className="fas fa-arrow-right ml-1" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── ÉTAPE 2 : Sanction & Décision ── */}
                {etape === 1 && (
                  <>
                    <div className="row">
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>Type de sanction <span className="text-danger">*</span></label>
                        <select
                          className={`form-control ${errors.type_sanction ? "is-invalid" : ""}`}
                          value={form.type_sanction}
                          onChange={set("type_sanction")}
                          style={fieldStyle}
                        >
                          <option value="AVERT_ORAL">Avertissement oral</option>
                          <option value="AVERT_ECRIT">Avertissement écrit</option>
                          <option value="BLAME">Blâme</option>
                          <option value="MISE_GARDE">Mise en garde</option>
                          <option value="MISE_PIED">Mise à pied</option>
                          <option value="RETROGRADATION">Rétrogradation</option>
                          <option value="LICENCIEMENT">Licenciement</option>
                        </select>
                        {errors.type_sanction && <div className="invalid-feedback">{errors.type_sanction}</div>}
                      </div>
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>Date de la sanction <span className="text-danger">*</span></label>
                        <input
                          type="date"
                          className={`form-control ${errors.date_sanction ? "is-invalid" : ""}`}
                          value={form.date_sanction}
                          onChange={set("date_sanction")}
                          style={fieldStyle}
                        />
                        {errors.date_sanction && <div className="invalid-feedback">{errors.date_sanction}</div>}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>Début d'effet</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.date_debut_effet}
                          onChange={set("date_debut_effet")}
                          style={fieldStyle}
                        />
                      </div>
                      <div className="col-md-6 form-group">
                        <label style={{ color: "var(--text-primary)" }}>Fin d'effet</label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.date_fin_effet}
                          onChange={set("date_fin_effet")}
                          style={fieldStyle}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>Mesures correctives</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.mesures_correctives}
                        onChange={set("mesures_correctives")}
                        placeholder="Mesures à prendre pour remédier à la situation..."
                        style={fieldStyle}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ color: "var(--text-primary)" }}>
                        Document / Lettre de sanction
                        <small className="ml-2 text-muted">(max 5 Mo — PDF, Word, image)</small>
                      </label>
                      <input
                        type="file"
                        className="form-control-file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={set("document")}
                        style={{ color: "var(--text-primary)" }}
                      />
                      {form.document && (
                        <small className="text-success">
                          <i className="fas fa-paperclip mr-1" />{form.document.name}
                        </small>
                      )}
                    </div>

                    <div className="d-flex justify-content-between gap-2 mt-3">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setEtape(0)}>
                        <i className="fas fa-arrow-left mr-1" /> Retour
                      </button>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/rh/sanctions")}>
                          <i className="fas fa-times mr-1" /> Annuler
                        </button>
                        <button type="submit" className="btn btn-danger" disabled={submitting}>
                          {submitting ? (
                            <><i className="fas fa-spinner fa-spin mr-1" /> Enregistrement…</>
                          ) : (
                            <><i className="fas fa-save mr-1" /> {isEdit ? "Mettre à jour" : "Enregistrer (brouillon)"}</>
                          )}
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
