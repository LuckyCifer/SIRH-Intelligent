import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import {
  getCandidature, changerStatutCandidature, analyserCvIa, noterCandidature,
  getEntretiens, createEntretien,
} from "../../../api/recrutements";
import api from "../../../api/axios";

const STATUT_BADGE = {
  RECUE: "secondary", EN_COURS: "info", ENTRETIEN_RH: "primary",
  ENTRETIEN_TECH: "primary", OFFRE_FAITE: "warning",
  ACCEPTEE: "success", REFUSEE: "danger", ABANDONNEE: "dark",
};

const STATUTS = [
  { v: "RECUE", l: "Reçue" }, { v: "EN_COURS", l: "En cours" },
  { v: "ENTRETIEN_RH", l: "Entretien RH" }, { v: "ENTRETIEN_TECH", l: "Entretien tech" },
  { v: "OFFRE_FAITE", l: "Offre faite" }, { v: "ACCEPTEE", l: "Acceptée" },
  { v: "REFUSEE", l: "Refusée" }, { v: "ABANDONNEE", l: "Abandonnée" },
];

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
  const [candidature, setCandidature] = useState(null);
  const [entretiens, setEntretiens] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showEntretienForm, setShowEntretienForm] = useState(false);
  const [formEntretien, setFormEntretien] = useState(FORM_ENTRETIEN_VIDE);
  const [savingEntretien, setSavingEntretien] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    Promise.all([
      getCandidature(id),
      getEntretiens({ candidature_id: id }),
      api.get("/accounts/users/"),
    ])
      .then(([cRes, eRes, uRes]) => {
        setCandidature(cRes.data);
        setNote(cRes.data.note_interne?.toString() || "");
        setEntretiens(eRes.data.results ?? eRes.data);
        setUsers(uRes.data.results ?? uRes.data);
      })
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChangerStatut = async (statut) => {
    try {
      const r = await changerStatutCandidature(id, { statut });
      setCandidature(r.data);
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleAnalyserIA = async () => {
    setAiLoading(true);
    try {
      await analyserCvIa(id);
      toast.success("Analyse IA lancée — résultat disponible dans quelques instants");
      setTimeout(() => {
        getCandidature(id).then((r) => setCandidature(r.data)).catch(() => {});
      }, 5000);
    } catch {
      toast.error("Erreur lancement analyse IA");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      const r = await noterCandidature(id, note);
      setCandidature(r.data);
      toast.success("Note enregistrée");
    } catch {
      toast.error("Erreur");
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
      toast.success("Entretien planifié");
    } catch {
      toast.error("Erreur planification entretien");
    } finally {
      setSavingEntretien(false);
    }
  };

  if (loading) {
    return (
      <RHLayout pageTitle="Fiche candidature">
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      </RHLayout>
    );
  }

  const analyse = candidature?.analyse_cv_parsed;

  return (
    <RHLayout pageTitle={`Candidature — ${candidature?.nom_complet}`}>
      <Link to={`/rh/recrutements/offres/${candidature?.offre}`} className="btn btn-outline-secondary btn-sm mb-3">
        <i className="fas fa-arrow-left mr-1" /> Retour à l'offre
      </Link>

      <div className="row">
        {/* Colonne gauche — infos + pipeline */}
        <div className="col-lg-4">
          {/* Infos personnelles */}
          <div
            className="card card-outline mb-3"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
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
                  <a href={candidature.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </p>
              )}
              {candidature?.source && (
                <p style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-share-alt mr-2" />
                  Source : {candidature.source}
                </p>
              )}
              <p style={{ color: "var(--text-muted)" }}>
                <i className="fas fa-calendar mr-2" />
                Reçue le{" "}
                {new Date(candidature?.date_candidature).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </p>
              {candidature?.cv && (
                <a
                  href={candidature.cv}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm btn-block mt-2"
                >
                  <i className="fas fa-file-pdf mr-1" /> Voir le CV
                </a>
              )}
              {candidature?.lettre_motivation && (
                <a
                  href={candidature.lettre_motivation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm btn-block mt-1"
                >
                  <i className="fas fa-file-alt mr-1" /> Lettre de motivation
                </a>
              )}
            </div>
          </div>

          {/* Pipeline statut */}
          <div
            className="card card-outline mb-3"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-tasks mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Statut du pipeline
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
          <div
            className="card card-outline"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-star mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Évaluation interne
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
                    <option key={n} value={n}>{"★".repeat(n)}</option>
                  ))}
                </select>
                <button className="btn btn-sm btn-primary" onClick={handleSaveNote}>
                  <i className="fas fa-save mr-1" /> Sauver
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

        {/* Colonne droite — Analyse IA + entretiens */}
        <div className="col-lg-8">
          {/* Analyse IA */}
          <div
            className="card card-outline mb-3"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-robot mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Analyse IA du CV
              </h3>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={handleAnalyserIA}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <><i className="fas fa-spinner fa-spin mr-1" /> Analyse en cours…</>
                ) : (
                  <><i className="fas fa-magic mr-1" /> {analyse ? "Re-analyser" : "Analyser"}</>
                )}
              </button>
            </div>
            <div className="card-body">
              {!analyse ? (
                <div className="text-center py-3" style={{ color: "var(--text-muted)" }}>
                  <i className="fas fa-robot fa-2x mb-2 d-block" />
                  <p>Aucune analyse IA disponible.</p>
                  <small>Cliquez "Analyser" pour lancer l'analyse Groq (asynchrone)</small>
                </div>
              ) : (
                <div>
                  {/* Score */}
                  <div className="row mb-3">
                    <div className="col-md-4 text-center">
                      <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--acerfi-blue)" }}>
                        {analyse.score_correspondance}
                        <small style={{ fontSize: "1rem" }}>/100</small>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Score de correspondance</div>
                    </div>
                    <div className="col-md-4 text-center">
                      <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {analyse.niveau_estime}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Niveau estimé</div>
                    </div>
                    <div className="col-md-4 text-center">
                      <span
                        className={`badge badge-${RECO_BADGE[analyse.recommandation] || "secondary"}`}
                        style={{ fontSize: "0.95rem", padding: "6px 12px" }}
                      >
                        {analyse.recommandation?.replace("_", " ")}
                      </span>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 2 }}>Recommandation</div>
                    </div>
                  </div>

                  {/* Synthèse */}
                  {analyse.synthese && (
                    <div className="alert alert-info" style={{ fontSize: "0.88rem" }}>
                      <i className="fas fa-info-circle mr-1" /> {analyse.synthese}
                    </div>
                  )}

                  <div className="row">
                    {/* Points forts */}
                    {analyse.points_forts_cv?.length > 0 && (
                      <div className="col-md-6">
                        <h6 style={{ color: "var(--text-primary)" }}>
                          <i className="fas fa-check-circle mr-1 text-success" /> Points forts
                        </h6>
                        <ul style={{ color: "var(--text-muted)", fontSize: "0.85rem", paddingLeft: "1.2rem" }}>
                          {analyse.points_forts_cv.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Manques */}
                    {analyse.manques?.length > 0 && (
                      <div className="col-md-6">
                        <h6 style={{ color: "var(--text-primary)" }}>
                          <i className="fas fa-exclamation-circle mr-1 text-warning" /> À améliorer
                        </h6>
                        <ul style={{ color: "var(--text-muted)", fontSize: "0.85rem", paddingLeft: "1.2rem" }}>
                          {analyse.manques.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entretiens */}
          <div
            className="card card-outline"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-calendar-check mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Entretiens ({entretiens.length})
              </h3>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowEntretienForm((v) => !v)}
              >
                <i className="fas fa-plus mr-1" /> Planifier
              </button>
            </div>

            {showEntretienForm && (
              <div
                className="card-body"
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                <form onSubmit={handleSaveEntretien}>
                  <div className="row">
                    <div className="col-md-6 form-group">
                      <label style={{ color: "var(--text-primary)" }}>Type</label>
                      <select
                        className="form-control form-control-sm"
                        value={formEntretien.type_entretien}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, type_entretien: e.target.value }))}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      >
                        <option value="RH">Entretien RH</option>
                        <option value="TECHNIQUE">Entretien technique</option>
                        <option value="DIRECTION">Entretien direction</option>
                        <option value="TELEPHONIQUE">Téléphonique</option>
                      </select>
                    </div>
                    <div className="col-md-6 form-group">
                      <label style={{ color: "var(--text-primary)" }}>Date et heure</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={formEntretien.date_heure}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, date_heure: e.target.value }))}
                        required
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label style={{ color: "var(--text-primary)" }}>Durée (min)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formEntretien.duree_minutes}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, duree_minutes: e.target.value }))}
                        min="15"
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label style={{ color: "var(--text-primary)" }}>Lieu</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formEntretien.lieu}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, lieu: e.target.value }))}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label style={{ color: "var(--text-primary)" }}>Intervieweur</label>
                      <select
                        className="form-control form-control-sm"
                        value={formEntretien.intervieweur}
                        onChange={(e) => setFormEntretien((f) => ({ ...f, intervieweur: e.target.value }))}
                        style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}
                      >
                        <option value="">— Choisir —</option>
                        {users.filter((u) => ["RH", "ADMIN", "MANAGER"].includes(u.role)).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowEntretienForm(false)}
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={savingEntretien}>
                      {savingEntretien ? "Enregistrement…" : "Planifier"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body p-0">
              {entretiens.length === 0 ? (
                <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                  Aucun entretien planifié
                </div>
              ) : (
                <table className="table table-hover mb-0">
                  <thead>
                    <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Durée</th>
                      <th>Lieu</th>
                      <th>Intervieweur</th>
                      <th>Résultat</th>
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
    </RHLayout>
  );
}
