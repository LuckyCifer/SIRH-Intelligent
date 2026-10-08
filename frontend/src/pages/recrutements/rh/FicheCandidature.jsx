import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getCandidature, changerStatutCandidature, analyserCvIa, noterCandidature,
  getEntretiens, createEntretien, updateOnboarding, convertirEnEmploye,
} from "../../../api/recrutements";
import { chargerTout } from "../../../api/listes";

const STATUT_BADGE = {
  RECUE: "secondary", EN_COURS: "info", ENTRETIEN_RH: "primary",
  ENTRETIEN_TECH: "primary", OFFRE_FAITE: "warning",
  ACCEPTEE: "success", REFUSEE: "danger", ABANDONNEE: "dark",
};

const FORM_ENTRETIEN_VIDE = {
  type_entretien: "RH",
  date_heure: "",
  duree_minutes: 60,
  lieu: "Bureaux de l'entreprise",
  intervieweur: "",
  notes: "",
};

const RECO_BADGE = {
  REJETER: "danger", TELEPHONE: "warning",
  ENTRETIEN_RH: "primary", PRIORITAIRE: "success",
};

export default function FicheCandidature() {
  const { id } = useParams();
  const { t } = useTranslation();

  const STATUTS = [
    { v: "RECUE",          l: t("recrutements.statut_recue") },
    { v: "EN_COURS",       l: t("recrutements.statut_en_cours") },
    { v: "ENTRETIEN_RH",   l: t("recrutements.statut_entretien_rh") },
    { v: "ENTRETIEN_TECH", l: t("recrutements.statut_entretien_tech") },
    { v: "OFFRE_FAITE",    l: t("recrutements.statut_offre_faite") },
    { v: "ACCEPTEE",       l: t("recrutements.statut_acceptee") },
    { v: "REFUSEE",        l: t("recrutements.statut_refusee") },
    { v: "ABANDONNEE",     l: t("recrutements.statut_abandonnee") },
  ];

  const [candidature, setCandidature] = useState(null);
  const [entretiens, setEntretiens] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showEntretienForm, setShowEntretienForm] = useState(false);
  const [formEntretien, setFormEntretien] = useState(FORM_ENTRETIEN_VIDE);
  const [savingEntretien, setSavingEntretien] = useState(false);
  const [note, setNote] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [convertResult, setConvertResult] = useState(null);

  useEffect(() => {
    Promise.all([
      getCandidature(id),
      getEntretiens({ candidature_id: id }),
      chargerTout("/accounts/users/"),
    ])
      .then(([cRes, eRes, uRes]) => {
        setCandidature(cRes.data);
        setNote(cRes.data.note_interne?.toString() || "");
        setEntretiens(eRes.data.results ?? eRes.data);
        setUsers(uRes.data.results ?? uRes.data);
      })
      .catch(() => toast.error(t("recrutements.error_load")))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const handleChangerStatut = async (statut) => {
    try {
      const r = await changerStatutCandidature(id, { statut });
      setCandidature(r.data);
      toast.success(t("recrutements.status_updated"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  const handleAnalyserIA = async () => {
    setAiLoading(true);
    try {
      await analyserCvIa(id);
      toast.success(t("recrutements.ia_launched"));
      setTimeout(() => {
        getCandidature(id).then((r) => setCandidature(r.data)).catch(() => {});
      }, 5000);
    } catch {
      toast.error(t("recrutements.ia_launch_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      const r = await noterCandidature(id, note);
      setCandidature(r.data);
      toast.success(t("recrutements.save_note"));
    } catch {
      toast.error(t("recrutements.error_load"));
    }
  };

  const handleSaveEntretien = async (e) => {
    e.preventDefault();
    setSavingEntretien(true);
    try {
      const payload = { ...formEntretien, candidature: id };
      if (!payload.intervieweur) delete payload.intervieweur;
      const r = await createEntretien(payload);
      setEntretiens((prev) => [...prev, r.data]);
      setShowEntretienForm(false);
      setFormEntretien(FORM_ENTRETIEN_VIDE);
      toast.success(t("recrutements.interview_scheduled"));
    } catch {
      toast.error(t("recrutements.interview_schedule_error"));
    } finally {
      setSavingEntretien(false);
    }
  };

  const handleUpdateOnboarding = async (fields) => {
    setOnboardingSaving(true);
    try {
      const r = await updateOnboarding(id, fields);
      setCandidature(r.data);
    } catch {
      toast.error(t("recrutements.onboarding_error"));
    } finally {
      setOnboardingSaving(false);
    }
  };

  const handleConvertirEnEmploye = async () => {
    if (!window.confirm(
      t("recrutements.confirm_convert", { nom: candidature?.nom_complet })
    )) return;
    setOnboardingSaving(true);
    try {
      const r = await convertirEnEmploye(id);
      setConvertResult(r.data);
      const updated = await getCandidature(id);
      setCandidature(updated.data);
      toast.success(t("recrutements.convert_success"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("recrutements.convert_error"));
    } finally {
      setOnboardingSaving(false);
    }
  };

  if (loading) {
    return (
      <RHLayout pageTitle={t("recrutements.application_file")}>
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      </RHLayout>
    );
  }

  const analyse = candidature?.analyse_cv_parsed;

  return (
    <RHLayout pageTitle={`${t("recrutements.application_file")} — ${candidature?.nom_complet}`}>
      <Link to={`/rh/recrutements/offres/${candidature?.offre}`} className="btn btn-outline-secondary btn-sm mb-3">
        <i className="fas fa-arrow-left mr-1" />{t("recrutements.back_to_offer")}
      </Link>

      <div className="row">
        <div className="col-lg-4">
          {/* Infos personnelles */}
          <div className="card card-outline mb-3" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-user mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {candidature?.nom_complet}
              </h3>
            </div>
            <div className="card-body" style={{ fontSize: "0.88rem" }}>
              <p style={{ color: "var(--text-primary)" }}>
                <i className="fas fa-envelope mr-2" style={{ color: "var(--text-muted)" }} />
                {candidature?.email}
              </p>
              {candidature?.telephone && (
                <p style={{ color: "var(--text-primary)" }}>
                  <i className="fas fa-phone mr-2" style={{ color: "var(--text-muted)" }} />
                  {candidature.telephone}
                </p>
              )}
              {candidature?.linkedin && (
                <p>
                  <i className="fab fa-linkedin mr-2" style={{ color: "#0077b5" }} />
                  <a href={candidature.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </p>
              )}
              {candidature?.source && (
                <p style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-share-alt mr-2" />
                  {t("recrutements.source")} : {candidature.source}
                </p>
              )}
              <p style={{ color: "var(--text-muted)" }}>
                <i className="fas fa-calendar mr-2" />
                {t("recrutements.received_on")}{" "}
                {new Date(candidature?.date_candidature).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </p>
              {candidature?.cv && (
                <a href={candidature.cv} target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm btn-block mt-2">
                  <i className="fas fa-file-pdf mr-1" />{t("recrutements.see_cv")}
                </a>
              )}
              {candidature?.lettre_motivation && (
                <a href={candidature.lettre_motivation} target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm btn-block mt-1">
                  <i className="fas fa-file-alt mr-1" />{t("recrutements.motivation_letter")}
                </a>
              )}
            </div>
          </div>

          {/* Pipeline statut */}
          <div className="card card-outline mb-3" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-tasks mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("recrutements.pipeline_status")}
              </h3>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <span className={`badge badge-${STATUT_BADGE[candidature?.statut]} mr-2`} style={{ fontSize: "0.9rem" }}>
                  {candidature?.statut_display}
                </span>
              </div>
              <select
                className="form-control form-control-sm"
                value={candidature?.statut || ""}
                onChange={(e) => handleChangerStatut(e.target.value)}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
              >
                {STATUTS.map((s) => (
                  <option key={s.v} value={s.v}>{s.l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Note interne */}
          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-star mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("recrutements.internal_eval")}
              </h3>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-control form-control-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ background: "var(--card-bg)", color: "var(--text-primary)", maxWidth: 80 }}
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} / 5</option>
                  ))}
                </select>
                <button className="btn btn-sm btn-primary" onClick={handleSaveNote}>
                  <i className="fas fa-save mr-1" />{t("recrutements.save_note")}
                </button>
              </div>
              {candidature?.commentaire_rh && (
                <div className="mt-2" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <i className="fas fa-comment mr-1" /> {candidature.commentaire_rh}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {/* Analyse IA */}
          <div className="card card-outline mb-3" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-robot mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("recrutements.ia_cv_analysis")}
              </h3>
              <button className="btn btn-sm btn-outline-primary" onClick={handleAnalyserIA} disabled={aiLoading}>
                {aiLoading ? (
                  <><i className="fas fa-spinner fa-spin mr-1" />{t("recrutements.analyzing")}</>
                ) : (
                  <><i className="fas fa-magic mr-1" />{analyse ? t("recrutements.re_analyze") : t("recrutements.analyze")}</>
                )}
              </button>
            </div>
            <div className="card-body">
              {!analyse ? (
                <div className="text-center py-3" style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-robot fa-2x mb-2 d-block" />
                  <p>{t("recrutements.no_ia_analysis")}</p>
                  <small>{t("recrutements.ia_async_hint")}</small>
                </div>
              ) : (
                <div>
                  <div className="row mb-3">
                    <div className="col-md-4 text-center">
                      <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--acerfi-blue)" }}>
                        {analyse.score_correspondance}<small style={{ fontSize: "1rem" }}>/100</small>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{t("recrutements.match_score")}</div>
                    </div>
                    <div className="col-md-4 text-center">
                      <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {analyse.niveau_estime}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{t("recrutements.estimated_level")}</div>
                    </div>
                    <div className="col-md-4 text-center">
                      <span className={`badge badge-${RECO_BADGE[analyse.recommandation] || "secondary"}`}
                        style={{ fontSize: "0.95rem", padding: "6px 12px" }}>
                        {analyse.recommandation?.replace("_", " ")}
                      </span>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 2 }}>
                        {t("recrutements.recommendation")}
                      </div>
                    </div>
                  </div>
                  {analyse.synthese && (
                    <div className="alert alert-info" style={{ fontSize: "0.88rem" }}>
                      <i className="fas fa-info-circle mr-1" />{analyse.synthese}
                    </div>
                  )}
                  <div className="row">
                    {analyse.points_forts_cv?.length > 0 && (
                      <div className="col-md-6">
                        <h6 style={{ color: "var(--text-primary)" }}>
                          <i className="fas fa-check-circle mr-1 text-success" />{t("recrutements.strengths")}
                        </h6>
                        <ul style={{ color: "var(--text-muted)", fontSize: "0.85rem", paddingLeft: "1.2rem" }}>
                          {analyse.points_forts_cv.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {analyse.manques?.length > 0 && (
                      <div className="col-md-6">
                        <h6 style={{ color: "var(--text-primary)" }}>
                          <i className="fas fa-exclamation-circle mr-1 text-warning" />{t("recrutements.to_improve")}
                        </h6>
                        <ul style={{ color: "var(--text-muted)", fontSize: "0.85rem", paddingLeft: "1.2rem" }}>
                          {analyse.manques.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entretiens */}
          <div className="card card-outline" style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-calendar-check mr-2" style={{ color: "var(--acerfi-blue)" }} />
                {t("recrutements.plan_interview")} ({entretiens.length})
              </h3>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setShowEntretienForm((v) => !v)}>
                <i className="fas fa-plus mr-1" />{t("recrutements.plan_interview")}
              </button>
            </div>

            {showEntretienForm && (
              <div className="card-body" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <form onSubmit={handleSaveEntretien}>
                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label style={{ color: "var(--text-primary)" }}>{t("recrutements.interview_type_label")}</label>
                      <select
                        className="form-control form-control-sm"
                        value={formEntretien.type_entretien}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, type_entretien: e.target.value }))}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      >
                        <option value="RH">{t("recrutements.statut_entretien_rh")}</option>
                        <option value="TECHNIQUE">{t("recrutements.statut_entretien_tech")}</option>
                        <option value="DIRECTION">{t('recrutements.interview_direction')}</option>
                        <option value="TELEPHONIQUE">{t('recrutements.interview_phone')}</option>
                      </select>
                    </div>
                    <div className="col-md-6 form-group">
                      <label style={{ color: "var(--text-primary)" }}>{t("recrutements.interview_datetime")}</label>
                      <input
                        type="datetime-local" className="form-control form-control-sm"
                        value={formEntretien.date_heure}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, date_heure: e.target.value }))}
                        required
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label style={{ color: "var(--text-primary)" }}>{t("recrutements.duration_min")}</label>
                      <input
                        type="number" className="form-control form-control-sm"
                        value={formEntretien.duree_minutes}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, duree_minutes: e.target.value }))}
                        min="15"
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label style={{ color: "var(--text-primary)" }}>{t("recrutements.location")}</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        value={formEntretien.lieu}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, lieu: e.target.value }))}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label style={{ color: "var(--text-primary)" }}>{t("recrutements.interviewer_label")}</label>
                      <select
                        className="form-control form-control-sm"
                        value={formEntretien.intervieweur}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, intervieweur: e.target.value }))}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      >
                        <option value="">{t("recrutements.choose")}</option>
                        {users.filter((u) => ["RH", "ADMIN", "MANAGER"].includes(u.role)).map((u) => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-sm btn-secondary"
                      onClick={() => setShowEntretienForm(false)}>
                      {t("common.cancel")}
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={savingEntretien}>
                      {savingEntretien ? t("recrutements.saving_offer") : t("recrutements.plan_interview")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body p-0">
              {entretiens.length === 0 ? (
                <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                  {t("recrutements.no_interviews_planned")}
                </div>
              ) : (
                <table className="table table-hover mb-0">
                  <thead>
                    <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      <th>{t("recrutements.interview_type_label")}</th>
                      <th>{t("recrutements.interview_datetime")}</th>
                      <th>{t("recrutements.duration_min")}</th>
                      <th>{t("recrutements.location")}</th>
                      <th>{t("recrutements.interviewer_label")}</th>
                      <th>{t("recrutements.col_result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entretiens.map((e) => (
                      <tr key={e.id} style={{ color: "var(--text-primary)" }}>
                        <td><span className="badge badge-info">{e.type_display}</span></td>
                        <td>
                          {new Date(e.date_heure).toLocaleString("fr-FR", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td>{e.duree_minutes} min</td>
                        <td style={{ fontSize: "0.82rem" }}>{e.lieu}</td>
                        <td style={{ fontSize: "0.82rem" }}>{e.intervieweur_detail?.nom_complet || "—"}</td>
                        <td>
                          <span className={`badge badge-${
                            e.resultat === "POSITIF" ? "success" :
                            e.resultat === "NEGATIF" ? "danger" :
                            e.resultat === "A_REVOIR" ? "warning" : "secondary"
                          }`}>{e.resultat_display}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding légal */}
      {candidature?.statut === "ACCEPTEE" && (() => {
        const cl = candidature.checklist_onboarding;
        const embaucheEff = candidature.date_embauche_effective || "";
        const today = new Date();
        const deadlineCnps = embaucheEff
          ? new Date(new Date(embaucheEff + "T00:00:00").getTime() + 8 * 86400000)
          : null;
        const cnpsEnRetard = deadlineCnps && today > deadlineCnps && !candidature.cnps_declare;

        return (
          <div className="card card-warning card-outline mt-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">
                <i className="fas fa-clipboard-check mr-2 text-warning" />
                {t("recrutements.onboarding_title")}
              </h3>
              {cl && (
                <span className={`badge badge-${cl.complete ? "success" : "warning"}`} style={{ fontSize: 11 }}>
                  {cl.nb_done}/{cl.nb_total} complété{cl.nb_done > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="card-body">
              {convertResult && (
                <div className="alert alert-success mb-3">
                  <strong><i className="fas fa-check-circle mr-1" />{t("recrutements.account_created_title")}</strong>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Identifiant : <code>{convertResult.username}</code> —
                    Mot de passe temporaire : <code>{convertResult.temp_password}</code>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      Contrat #{convertResult.contrat_id} créé.
                    </div>
                  </div>
                </div>
              )}

              <div className="row mb-3">
                <div className="col-md-4 form-group mb-0">
                  <label style={{ fontSize: 12 }}>{t("recrutements.planned_start")}</label>
                  <input type="date" className="form-control form-control-sm"
                    value={candidature.date_embauche_prevue || ""}
                    onChange={e => handleUpdateOnboarding({ date_embauche_prevue: e.target.value })}
                  />
                </div>
                <div className="col-md-4 form-group mb-0">
                  <label style={{ fontSize: 12 }}>{t("recrutements.effective_start")}</label>
                  <input type="date" className="form-control form-control-sm"
                    value={embaucheEff}
                    onChange={e => handleUpdateOnboarding({ date_embauche_effective: e.target.value })}
                  />
                </div>
                <div className="col-md-4 d-flex align-items-end pb-1">
                  <div className="custom-control custom-checkbox">
                    <input type="checkbox" className="custom-control-input" id="chk_etranger"
                      checked={candidature.est_etranger || false}
                      onChange={e => handleUpdateOnboarding({ est_etranger: e.target.checked })}
                    />
                    <label className="custom-control-label" htmlFor="chk_etranger" style={{ fontSize: 12 }}>
                      {t("recrutements.foreign_worker")}
                    </label>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 col-lg-3 mb-3">
                  <div className={`card h-100 ${cnpsEnRetard ? "border-danger" : candidature.cnps_declare ? "border-success" : "border-warning"}`}
                    style={{ fontSize: 12 }}>
                    <div className="card-body p-2">
                      <div className="d-flex align-items-center mb-2">
                        <div className="custom-control custom-checkbox">
                          <input type="checkbox" className="custom-control-input" id="chk_cnps"
                            checked={candidature.cnps_declare || false}
                            onChange={e => handleUpdateOnboarding({ cnps_declare: e.target.checked })}
                            disabled={onboardingSaving}
                          />
                          <label className="custom-control-label font-weight-bold" htmlFor="chk_cnps">
                            {t("recrutements.cnps_decl")}
                          </label>
                        </div>
                      </div>
                      {deadlineCnps && (
                        <div className={`mb-1 ${cnpsEnRetard ? "text-danger font-weight-bold" : "text-muted"}`}>
                          {cnpsEnRetard && <i className="fas fa-exclamation-triangle mr-1" />}
                          {t("recrutements.cnps_late")} : {deadlineCnps.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </div>
                      )}
                      {candidature.cnps_declare && (
                        <>
                          <input type="date" className="form-control form-control-sm mb-1"
                            placeholder={t("recrutements.cnps_date_placeholder")}
                            value={candidature.date_declaration_cnps || ""}
                            onChange={e => handleUpdateOnboarding({ date_declaration_cnps: e.target.value })}
                          />
                          <input type="text" className="form-control form-control-sm"
                            placeholder={t("recrutements.cnps_number_placeholder")}
                            value={candidature.numero_cnps_attribue || ""}
                            onBlur={e => handleUpdateOnboarding({ numero_cnps_attribue: e.target.value })}
                            onChange={e => setCandidature(c => ({ ...c, numero_cnps_attribue: e.target.value }))}
                          />
                        </>
                      )}
                      {candidature.cnps_declare && candidature.delai_cnps_respecte && (
                        <span className="badge badge-success mt-1" style={{ fontSize: 10 }}>
                          <i className="fas fa-check mr-1" />{t("recrutements.cnps_deadline_respected")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3 mb-3">
                  <div className={`card h-100 ${candidature.inscrit_registre_personnel ? "border-success" : "border-secondary"}`}
                    style={{ fontSize: 12 }}>
                    <div className="card-body p-2">
                      <div className="custom-control custom-checkbox mb-2">
                        <input type="checkbox" className="custom-control-input" id="chk_registre"
                          checked={candidature.inscrit_registre_personnel || false}
                          onChange={e => handleUpdateOnboarding({ inscrit_registre_personnel: e.target.checked })}
                          disabled={onboardingSaving}
                        />
                        <label className="custom-control-label font-weight-bold" htmlFor="chk_registre">
                          {t("recrutements.personnel_register")}
                        </label>
                      </div>
                      {candidature.inscrit_registre_personnel && (
                        <input type="text" className="form-control form-control-sm"
                          placeholder={t("recrutements.register_number_placeholder")}
                          value={candidature.numero_registre || ""}
                          onBlur={e => handleUpdateOnboarding({ numero_registre: e.target.value })}
                          onChange={e => setCandidature(c => ({ ...c, numero_registre: e.target.value }))}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3 mb-3">
                  <div className={`card h-100 ${candidature.visite_medicale_faite ? "border-success" : "border-secondary"}`}
                    style={{ fontSize: 12 }}>
                    <div className="card-body p-2">
                      <div className="custom-control custom-checkbox mb-2">
                        <input type="checkbox" className="custom-control-input" id="chk_visite"
                          checked={candidature.visite_medicale_faite || false}
                          onChange={e => handleUpdateOnboarding({ visite_medicale_faite: e.target.checked })}
                          disabled={onboardingSaving}
                        />
                        <label className="custom-control-label font-weight-bold" htmlFor="chk_visite">
                          {t("recrutements.medical_visit")}
                        </label>
                      </div>
                      {candidature.visite_medicale_faite && (
                        <>
                          <input type="date" className="form-control form-control-sm mb-1"
                            value={candidature.date_visite_medicale || ""}
                            onChange={e => handleUpdateOnboarding({ date_visite_medicale: e.target.value })}
                          />
                          <select className="form-control form-control-sm"
                            value={candidature.aptitude_medicale || "EN_ATTENTE"}
                            onChange={e => handleUpdateOnboarding({ aptitude_medicale: e.target.value })}>
                            <option value="EN_ATTENTE">{t("recrutements.aptitude_waiting")}</option>
                            <option value="APTE">{t("recrutements.aptitude_fit")}</option>
                            <option value="APTE_RESERVES">{t("recrutements.aptitude_fit_reserved")}</option>
                            <option value="INAPTE">{t("recrutements.aptitude_unfit")}</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3 mb-3">
                  <div className={`card h-100 ${!candidature.est_etranger ? "bg-light" : candidature.visa_mintss_obtenu ? "border-success" : "border-warning"}`}
                    style={{ fontSize: 12, opacity: candidature.est_etranger ? 1 : 0.5 }}>
                    <div className="card-body p-2">
                      <div className="custom-control custom-checkbox mb-2">
                        <input type="checkbox" className="custom-control-input" id="chk_visa"
                          checked={candidature.visa_mintss_obtenu || false}
                          onChange={e => handleUpdateOnboarding({ visa_mintss_obtenu: e.target.checked })}
                          disabled={onboardingSaving || !candidature.est_etranger}
                        />
                        <label className="custom-control-label font-weight-bold" htmlFor="chk_visa">
                          {t("recrutements.mintss_visa")}
                        </label>
                      </div>
                      <small className="text-muted">
                        {candidature.est_etranger
                          ? t("recrutements.mintss_mandatory")
                          : t("recrutements.mintss_activate")}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {cl && (
                <div className="mt-2">
                  <div className="progress mb-2" style={{ height: 8 }}>
                    <div className={`progress-bar bg-${cl.complete ? "success" : "warning"}`}
                      style={{ width: `${cl.nb_total > 0 ? Math.round((cl.nb_done / cl.nb_total) * 100) : 0}%` }} />
                  </div>
                </div>
              )}

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-success btn-sm"
                  onClick={handleConvertirEnEmploye}
                  disabled={onboardingSaving || !!convertResult}>
                  {onboardingSaving
                    ? <><i className="fas fa-spinner fa-spin mr-1" />{t("recrutements.converting")}</>
                    : <><i className="fas fa-user-plus mr-1" />{t("recrutements.convert_btn")}</>
                  }
                </button>
                <small className="text-muted align-self-center" style={{ fontSize: 11 }}>
                  {t("recrutements.convert_hint")}
                </small>
              </div>
            </div>
            <div className="card-footer text-muted" style={{ fontSize: 11 }}>
              <i className="fas fa-balance-scale mr-1" />
              {t("recrutements.legal_ref")}
              {candidature.delai_cnps_respecte && (
                <span className="badge badge-success ml-2" style={{ fontSize: 10 }}>
                  <i className="fas fa-check mr-1" />{t("recrutements.cnps_respected_badge")}
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </RHLayout>
  );
}
