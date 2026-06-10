import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import RHLayout from "../../../components/layout/RHLayout";
import { getTableauBordRecrutement } from "../../../api/recrutements";

const STATUT_BADGE = {
  RECUE:          "secondary",
  EN_COURS:       "info",
  ENTRETIEN_RH:   "primary",
  ENTRETIEN_TECH: "primary",
  OFFRE_FAITE:    "warning",
  ACCEPTEE:       "success",
  REFUSEE:        "danger",
  ABANDONNEE:     "dark",
};

const STATUT_LABELS = {
  RECUE: "Reçue", EN_COURS: "En cours", ENTRETIEN_RH: "Entretien RH",
  ENTRETIEN_TECH: "Entretien Tech", OFFRE_FAITE: "Offre faite",
  ACCEPTEE: "Acceptée", REFUSEE: "Refusée", ABANDONNEE: "Abandonnée",
};

const PIPELINE_ORDER = ["RECUE", "EN_COURS", "ENTRETIEN_RH", "ENTRETIEN_TECH", "OFFRE_FAITE", "ACCEPTEE"];

export default function TableauBordRecrutement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTableauBordRecrutement()
      .then((r) => setData(r.data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <RHLayout pageTitle="Recrutements">
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      </RHLayout>
    );
  }

  const par_statut = data?.par_statut_candidature || {};

  return (
    <RHLayout pageTitle="Tableau de bord — Recrutements">
      {/* Actions rapides */}
      <div className="d-flex justify-content-end mb-3 gap-2">
        <Link to="/rh/recrutements/offres/nouveau" className="btn btn-primary btn-sm">
          <i className="fas fa-plus mr-1" /> Nouvelle offre
        </Link>
        <Link to="/rh/recrutements/offres" className="btn btn-outline-primary btn-sm">
          <i className="fas fa-list mr-1" /> Toutes les offres
        </Link>
        <Link to="/rh/recrutements/planning" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-calendar mr-1" /> Planning entretiens
        </Link>
      </div>

      {/* 4 cartes stat */}
      <div className="row">
        <div className="col-lg-3 col-md-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{data?.total_offres ?? 0}</h3>
              <p>Offres totales</p>
            </div>
            <div className="icon"><i className="fas fa-briefcase" /></div>
            <Link to="/rh/recrutements/offres" className="small-box-footer">
              Voir <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{data?.publiees ?? 0}</h3>
              <p>Offres publiées</p>
            </div>
            <div className="icon"><i className="fas fa-bullhorn" /></div>
            <Link to="/rh/recrutements/offres?statut=PUBLIEE" className="small-box-footer">
              Voir <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{data?.total_candidatures ?? 0}</h3>
              <p>Candidatures totales</p>
            </div>
            <div className="icon"><i className="fas fa-users" /></div>
            <span className="small-box-footer">
              {data?.candidatures_semaine ?? 0} cette semaine
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="small-box bg-primary">
            <div className="inner">
              <h3>{data?.entretiens_a_venir ?? 0}</h3>
              <p>Entretiens à venir</p>
            </div>
            <div className="icon"><i className="fas fa-calendar-check" /></div>
            <Link to="/rh/recrutements/planning" className="small-box-footer">
              Planning <i className="fas fa-arrow-circle-right" />
            </Link>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Pipeline entonnoir */}
        <div className="col-lg-5">
          <div
            className="card card-outline"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-filter mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Pipeline de recrutement
              </h3>
            </div>
            <div className="card-body">
              {PIPELINE_ORDER.map((statut) => {
                const count = par_statut[statut] || 0;
                const total = data?.total_candidatures || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={statut} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: "var(--text-primary)", fontSize: "0.85rem" }}>
                        {STATUT_LABELS[statut]}
                      </span>
                      <span className={`badge badge-${STATUT_BADGE[statut]}`}>{count}</span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className={`progress-bar bg-${STATUT_BADGE[statut]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(par_statut.REFUSEE > 0 || par_statut.ABANDONNEE > 0) && (
                <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--border-color)" }}>
                  <small style={{ color: "var(--text-muted)" }}>
                    <span className="badge badge-danger mr-2">Refusées : {par_statut.REFUSEE || 0}</span>
                    <span className="badge badge-dark">Abandonnées : {par_statut.ABANDONNEE || 0}</span>
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dernières candidatures */}
        <div className="col-lg-7">
          <div
            className="card card-outline"
            style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
          >
            <div className="card-header">
              <h3 className="card-title" style={{ color: "var(--page-title)" }}>
                <i className="fas fa-inbox mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Dernières candidatures
              </h3>
            </div>
            <div className="card-body p-0">
              {(data?.dernieres_candidatures || []).length === 0 ? (
                <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                  Aucune candidature
                </div>
              ) : (
                <table className="table table-hover mb-0">
                  <thead>
                    <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      <th>Candidat</th>
                      <th>Offre</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.dernieres_candidatures || []).map((c) => (
                      <tr key={c.id} style={{ color: "var(--text-primary)" }}>
                        <td>{c.nom_complet}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {c.offre_detail?.titre}
                        </td>
                        <td>
                          <span className={`badge badge-${STATUT_BADGE[c.statut]}`}>
                            {c.statut_display}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/rh/recrutements/candidatures/${c.id}`}
                            className="btn btn-xs btn-outline-primary"
                          >
                            <i className="fas fa-eye" />
                          </Link>
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

      {/* Prochains entretiens */}
      {(data?.prochains_entretiens || []).length > 0 && (
        <div
          className="card card-outline"
          style={{ borderColor: "var(--acerfi-blue)", background: "var(--card-bg)" }}
        >
          <div className="card-header">
            <h3 className="card-title" style={{ color: "var(--page-title)" }}>
              <i className="fas fa-calendar-day mr-2" style={{ color: "var(--acerfi-blue)" }} />
              Prochains entretiens
            </h3>
          </div>
          <div className="card-body p-0">
            <table className="table table-hover mb-0">
              <thead>
                <tr style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  <th>Candidat</th>
                  <th>Offre</th>
                  <th>Type</th>
                  <th>Date / Heure</th>
                  <th>Intervieweur</th>
                </tr>
              </thead>
              <tbody>
                {(data?.prochains_entretiens || []).map((e) => (
                  <tr key={e.id} style={{ color: "var(--text-primary)" }}>
                    <td>{e.candidature_detail?.nom_complet}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {e.candidature_detail?.offre_titre}
                    </td>
                    <td>
                      <span className="badge badge-info">{e.type_display}</span>
                    </td>
                    <td>
                      {new Date(e.date_heure).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td>{e.intervieweur_detail?.nom_complet || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </RHLayout>
  );
}
