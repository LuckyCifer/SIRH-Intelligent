import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import EmployeLayout from "../../../components/layout/EmployeLayout";
import { getMesInscriptions, annulerInscription, noterFormation } from "../../../api/formations";

function EtoilesInteractives({ valeur, onChange }) {
  const [survol, setSurvol] = useState(0);
  return (
    <span>
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className="fas fa-star"
          style={{ cursor: "pointer", color: n <= (survol || valeur) ? "#ffc107" : "var(--text-muted)", fontSize: "1.3rem", marginRight: 2 }}
          onMouseEnter={() => setSurvol(n)}
          onMouseLeave={() => setSurvol(0)}
          onClick={() => onChange(n)} />
      ))}
    </span>
  );
}

function EtoilesStatiques({ valeur }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className="fas fa-star"
          style={{ color: n <= valeur ? "#ffc107" : "var(--text-muted)", fontSize: "1rem", marginRight: 2 }} />
      ))}
    </span>
  );
}

function CarteInscription({ inscription, onAnnuler, onNoter }) {
  const { t } = useTranslation();
  const f = inscription.formation_detail;
  const [showNote,    setShowNote]    = useState(false);
  const [note,        setNote]        = useState(inscription.note_formation || 0);
  const [commentaire, setCommentaire] = useState(inscription.commentaire || "");
  const [submitting,  setSubmitting]  = useState(false);

  const STATUT_INFO = {
    EN_ATTENTE: { badge: "warning",   label: t("formations.waiting_validation"), icon: "clock" },
    INSCRIT:    { badge: "primary",   label: t("formations.enrolled"),           icon: "check-circle" },
    PRESENT:    { badge: "success",   label: t("formations.present_label"),      icon: "user-check" },
    ABSENT:     { badge: "danger",    label: t("formations.mark_absent"),        icon: "user-times" },
    ANNULE:     { badge: "secondary", label: t("formations.cancelled"),          icon: "ban" },
  };
  const info = STATUT_INFO[inscription.statut] || {};

  const handleNoter = async () => {
    if (!note) return toast.error(t("formations.select_note"));
    setSubmitting(true);
    try {
      const r = await noterFormation(inscription.id, { note, commentaire });
      onNoter(r.data);
      setShowNote(false);
      toast.success(t("formations.eval_success"));
    } catch {
      toast.error(t("formations.eval_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card mb-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.75rem", color: f?.categorie_detail?.couleur || "var(--acerfi-blue)", fontWeight: 600 }}>
              <i className={`${f?.categorie_detail?.icone || "fas fa-graduation-cap"} mr-1`} />
              {f?.categorie_detail?.nom || "—"}
            </div>
            <h5 className="mt-1" style={{ color: "var(--page-title)", fontWeight: 600 }}>{f?.titre}</h5>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {f?.date_debut && (
                <span className="mr-3">
                  <i className="fas fa-calendar mr-1" />
                  {new Date(f.date_debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
              <span className="mr-3"><i className="fas fa-clock mr-1" />{f?.duree_heures}h</span>
              {f?.lieu && <span className="mr-3"><i className="fas fa-map-marker-alt mr-1" />{f.lieu}</span>}
            </div>
          </div>
          <div className="ml-2 text-right">
            <span className={`badge badge-${info.badge} px-2 py-1`}>
              <i className={`fas fa-${info.icon} mr-1`} />{info.label}
            </span>
            {inscription.note_formation && (
              <div className="mt-1"><EtoilesStatiques valeur={inscription.note_formation} /></div>
            )}
          </div>
        </div>

        <div className="d-flex gap-2 mt-2 flex-wrap">
          {inscription.statut === "EN_ATTENTE" && (
            <button className="btn btn-sm btn-outline-danger" onClick={() => onAnnuler(inscription.id)}>
              <i className="fas fa-times mr-1" /> {t("formations.cancel_inscription_btn")}
            </button>
          )}
          {inscription.statut === "PRESENT" && !inscription.note_formation && (
            <button className="btn btn-sm btn-outline-warning" onClick={() => setShowNote(!showNote)}>
              <i className="fas fa-star mr-1" /> {t("formations.rate_formation")}
            </button>
          )}
        </div>

        {showNote && (
          <div className="mt-3 p-3"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 6 }}>
            <div className="mb-2">
              <label style={{ color: "var(--text-primary)", fontSize: "0.85rem", marginBottom: 6, display: "block" }}>
                {t("formations.your_note")}
              </label>
              <EtoilesInteractives valeur={note} onChange={setNote} />
            </div>
            <div className="mb-2">
              <label style={{ color: "var(--text-primary)", fontSize: "0.85rem" }}>{t("formations.comment_optional")}</label>
              <textarea className="form-control form-control-sm mt-1" rows={2}
                value={commentaire} onChange={e => setCommentaire(e.target.value)}
                placeholder={t("formations.comment_placeholder")}
                style={{ background: "var(--card-bg)", color: "var(--text-primary)" }} />
            </div>
            <button className="btn btn-sm btn-warning" onClick={handleNoter} disabled={submitting || !note}>
              {submitting ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-check mr-1" />}
              {t("formations.submit_evaluation")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MesFormations() {
  const { t }        = useTranslation();
  const [inscriptions, setInscriptions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [onglet,       setOnglet]       = useState("avenir");
  const [annulant,     setAnnulant]     = useState(null);

  useEffect(() => {
    getMesInscriptions()
      .then(r => setInscriptions(r.data))
      .catch(() => toast.error(t("formations.load_error")))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const now = new Date();
  const avenir = inscriptions.filter(i => {
    if (i.statut === "ANNULE") return false;
    const fin = i.formation_detail?.date_fin;
    if (!fin) return i.statut === "EN_ATTENTE" || i.statut === "INSCRIT";
    return new Date(fin) >= now;
  });
  const passees = inscriptions.filter(i => {
    if (i.statut === "ANNULE") return false;
    const fin = i.formation_detail?.date_fin;
    if (!fin) return i.statut === "PRESENT" || i.statut === "ABSENT";
    return new Date(fin) < now;
  });

  const handleAnnuler = async (id) => {
    if (!window.confirm(t("formations.unenroll_confirm"))) return;
    setAnnulant(id);
    try {
      await annulerInscription(id);
      setInscriptions(prev => prev.map(i => i.id === id ? { ...i, statut: "ANNULE" } : i));
      toast.success(t("formations.unenroll_success"));
    } catch {
      toast.error(t("formations.unenroll_error"));
    } finally {
      setAnnulant(null);
    }
  };

  const handleNoter = (updated) => {
    setInscriptions(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const nbPresent = inscriptions.filter(i => i.statut === "PRESENT").length;
  const nbTotal   = inscriptions.filter(i => i.statut !== "ANNULE").length;

  const onglets = [
    { key: "avenir",  label: t("formations.upcoming"), count: avenir.length,  icon: "calendar-check" },
    { key: "passees", label: t("formations.past"),     count: passees.length, icon: "history" },
  ];

  return (
    <EmployeLayout pageTitle={t("formations.my_formations")}>
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="small-box" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "16px 20px" }}>
            <div className="inner">
              <h3 style={{ color: "var(--page-title)" }}>{avenir.length}</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>{t("formations.upcoming")}</p>
            </div>
            <div className="icon"><i className="fas fa-calendar-check" /></div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="small-box" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "16px 20px" }}>
            <div className="inner">
              <h3 style={{ color: "var(--page-title)" }}>{nbPresent}</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>{t("formations.trainings_followed")}</p>
            </div>
            <div className="icon"><i className="fas fa-graduation-cap" /></div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="small-box" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "16px 20px" }}>
            <div className="inner">
              <h3 style={{ color: "var(--page-title)" }}>
                {nbTotal > 0 ? Math.round((nbPresent / nbTotal) * 100) : 0}%
              </h3>
              <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>{t("formations.attendance_rate")}</p>
            </div>
            <div className="icon"><i className="fas fa-chart-pie" /></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
        <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
          <ul className="nav nav-tabs card-header-tabs">
            {onglets.map(tab => (
              <li key={tab.key} className="nav-item">
                <button className={`nav-link ${onglet === tab.key ? "active" : ""}`}
                  onClick={() => setOnglet(tab.key)}
                  style={{
                    color: onglet === tab.key ? "var(--acerfi-blue)" : "var(--text-muted)",
                    background: "transparent", border: "none",
                    borderBottom: onglet === tab.key ? `2px solid var(--acerfi-blue)` : "2px solid transparent",
                    fontWeight: onglet === tab.key ? 600 : 400, padding: "8px 16px", cursor: "pointer",
                  }}>
                  <i className={`fas fa-${tab.icon} mr-1`} />
                  {tab.label}
                  <span className={`badge badge-${onglet === tab.key ? "primary" : "secondary"} ml-1`}>{tab.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
            </div>
          ) : (onglet === "avenir" ? avenir : passees).length === 0 ? (
            <div className="text-center py-5" style={{ color: "var(--text-muted)" }}>
              <i className={`fas fa-${onglet === "avenir" ? "calendar-plus" : "history"} fa-3x mb-3 d-block`} />
              {onglet === "avenir" ? t("formations.no_upcoming") : t("formations.no_past")}
            </div>
          ) : (
            (onglet === "avenir" ? avenir : passees).map(i => (
              <CarteInscription key={i.id} inscription={i} onAnnuler={handleAnnuler} onNoter={handleNoter} />
            ))
          )}
        </div>
      </div>
    </EmployeLayout>
  );
}
