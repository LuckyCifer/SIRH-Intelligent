import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../../components/layout/EmployeLayout";
import { getCatalogue, getCategories, sInscrire, getMesInscriptions } from "../../../api/formations";

const MODALITE_BADGE = {
  PRESENTIEL: "primary", DISTANCIEL: "info", HYBRIDE: "warning", ELEARNING: "success",
};
const NIVEAU_BADGE = {
  DEBUTANT: "secondary", INTERMEDIAIRE: "info", AVANCE: "warning", EXPERT: "danger",
};

function EtoilesNote({ note }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className="fas fa-star"
          style={{ color: n <= note ? "#ffc107" : "var(--text-muted)", fontSize: "0.8rem" }} />
      ))}
    </span>
  );
}

export default function CatalogueFormations() {
  const { t } = useTranslation();
  const [formations,     setFormations]     = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [mesInscriptions, setMesInscriptions] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filtres,        setFiltres]        = useState({ categorie: "", modalite: "", niveau: "" });
  const [inscripting,    setInscripting]    = useState(null);

  useEffect(() => {
    Promise.all([getCatalogue(), getCategories(), getMesInscriptions()])
      .then(([fRes, cRes, iRes]) => {
        setFormations(fRes.data);
        setCategories(cRes.data.results ?? cRes.data);
        setMesInscriptions(iRes.data);
      })
      .catch(() => toast.error(t("formations.load_error")))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const formationsFiltrees = formations.filter(f => {
    if (filtres.categorie && f.categorie !== parseInt(filtres.categorie)) return false;
    if (filtres.modalite && f.modalite !== filtres.modalite) return false;
    if (filtres.niveau   && f.niveau   !== filtres.niveau)   return false;
    return true;
  });

  const getStatutInscription = (formationId) =>
    mesInscriptions.find(i => i.formation === formationId);

  const handleSInscrire = async (formationId) => {
    setInscripting(formationId);
    try {
      const r = await sInscrire({ formation: formationId });
      setMesInscriptions(prev => [...prev, r.data]);
      toast.success(t("formations.enroll_success"));
    } catch (err) {
      const msg = err?.response?.data?.non_field_errors?.[0] || err?.response?.data?.detail || t("formations.load_error");
      toast.error(msg);
    } finally {
      setInscripting(null);
    }
  };

  return (
    <EmployeLayout pageTitle={t("formations.catalogue_title")}>
      <div className="card card-outline mb-3"
        style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
        <div className="card-body py-2">
          <div className="row align-items-end">
            <div className="col-md-4 form-group mb-0">
              <label style={{ color: "var(--text-primary)", fontSize: "0.85rem" }}>{t("formations.category")}</label>
              <select className="form-control form-control-sm" value={filtres.categorie}
                onChange={e => setFiltres(f => ({ ...f, categorie: e.target.value }))}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                <option value="">{t("formations.all_categories")}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 form-group mb-0">
              <label style={{ color: "var(--text-primary)", fontSize: "0.85rem" }}>{t("formations.modality")}</label>
              <select className="form-control form-control-sm" value={filtres.modalite}
                onChange={e => setFiltres(f => ({ ...f, modalite: e.target.value }))}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                <option value="">{t("formations.all_modalities")}</option>
                <option value="PRESENTIEL">{t("formations.modality_presentiel")}</option>
                <option value="DISTANCIEL">{t("formations.modality_distanciel")}</option>
                <option value="HYBRIDE">{t("formations.modality_hybride")}</option>
                <option value="ELEARNING">{t("formations.modality_elearning")}</option>
              </select>
            </div>
            <div className="col-md-4 form-group mb-0">
              <label style={{ color: "var(--text-primary)", fontSize: "0.85rem" }}>{t("formations.level")}</label>
              <select className="form-control form-control-sm" value={filtres.niveau}
                onChange={e => setFiltres(f => ({ ...f, niveau: e.target.value }))}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
                <option value="">{t("formations.all_levels")}</option>
                <option value="DEBUTANT">{t("formations.level_debutant")}</option>
                <option value="INTERMEDIAIRE">{t("formations.level_intermediaire")}</option>
                <option value="AVANCE">{t("formations.level_avance")}</option>
                <option value="EXPERT">{t("formations.level_expert")}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      ) : formationsFiltrees.length === 0 ? (
        <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
          <i className="fas fa-graduation-cap fa-3x mb-3 d-block" />
          {t("formations.no_catalogue")}
        </div>
      ) : (
        <div className="row">
          {formationsFiltrees.map(f => {
            const inscription = getStatutInscription(f.id);
            const complet = f.places_restantes <= 0;
            const couleurCat = f.categorie_detail?.couleur || "#7B2D8B";
            return (
              <div key={f.id} className="col-lg-4 col-md-6 mb-3">
                <div className="card h-100" style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderTop: `4px solid ${couleurCat}`,
                }}>
                  <div className="card-body d-flex flex-column">
                    <div className="mb-1" style={{ fontSize: "0.78rem", color: couleurCat, fontWeight: 600 }}>
                      <i className={`${f.categorie_detail?.icone || "fas fa-graduation-cap"} mr-1`} />
                      {f.categorie_detail?.nom || "—"}
                    </div>
                    <h5 style={{ color: "var(--page-title)", fontWeight: 600, marginBottom: 8 }}>{f.titre}</h5>
                    <div className="mb-2">
                      <span className={`badge badge-${MODALITE_BADGE[f.modalite]} mr-1`}>{f.modalite_display}</span>
                      <span className={`badge badge-${NIVEAU_BADGE[f.niveau]}`}>{f.niveau_display}</span>
                    </div>
                    <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", flexGrow: 1 }}>
                      {f.date_debut && (
                        <div><i className="fas fa-calendar mr-1" />
                          {new Date(f.date_debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          {f.date_fin && ` → ${new Date(f.date_fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`}
                        </div>
                      )}
                      <div><i className="fas fa-clock mr-1" />{f.duree_heures}{t("formations.training_hours")}</div>
                      {f.lieu && <div><i className="fas fa-map-marker-alt mr-1" />{f.lieu}</div>}
                      {f.formateur && <div><i className="fas fa-chalkboard-teacher mr-1" />{f.formateur}</div>}
                      {f.cout && <div><i className="fas fa-tag mr-1" />{Number(f.cout).toLocaleString("fr-FR")} FCFA</div>}
                    </div>
                    <div className="mt-2 mb-2">
                      <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        <span>{t("formations.places")}</span>
                        <span style={{ fontWeight: 600, color: complet ? "#dc3545" : "var(--text-primary)" }}>
                          {f.nb_inscrits}/{f.places_max}
                        </span>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className={`progress-bar ${complet ? "bg-danger" : "bg-success"}`}
                          style={{ width: `${Math.min(100, (f.nb_inscrits / f.places_max) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="mt-auto">
                      {inscription ? (
                        <span className={`badge badge-${
                          inscription.statut === "INSCRIT" || inscription.statut === "PRESENT" ? "success"
                          : inscription.statut === "EN_ATTENTE" ? "warning"
                          : "secondary"
                        } px-3 py-2 d-block text-center`} style={{ fontSize: "0.82rem" }}>
                          <i className={`fas fa-${inscription.statut === "EN_ATTENTE" ? "clock" : "check-circle"} mr-1`} />
                          {inscription.statut === "EN_ATTENTE" ? t("formations.waiting_validation")
                            : inscription.statut === "INSCRIT" ? t("formations.enrolled")
                            : inscription.statut === "PRESENT" ? t("formations.present_label")
                            : inscription.statut_display}
                        </span>
                      ) : complet ? (
                        <button className="btn btn-secondary btn-block btn-sm" disabled>
                          <i className="fas fa-times-circle mr-1" /> {t("formations.full")}
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-block btn-sm"
                          onClick={() => handleSInscrire(f.id)}
                          disabled={inscripting === f.id}>
                          {inscripting === f.id
                            ? <><i className="fas fa-spinner fa-spin mr-1" />{t("formations.enrolling")}</>
                            : <><i className="fas fa-plus-circle mr-1" />{t("formations.enroll_btn")}</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EmployeLayout>
  );
}
