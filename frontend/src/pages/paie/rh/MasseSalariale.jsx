import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import RHLayout from "../../../components/layout/RHLayout";
import { useTheme } from "../../../context/ThemeContext";
import { getStatsMasseSalariale, getBulletins } from "../../../api/paie";

const MOIS_LABELS = [
  "", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

export default function MasseSalariale() {
  const { theme } = useTheme();
  const chartText = theme === "dark" ? "#A8C4D8" : "#555";
  const chartGrid = theme === "dark" ? "#2A4A64" : "#DDD";
  const tooltipStyle = {
    background: theme === "dark" ? "#1E3448" : "#fff",
    border: `1px solid ${chartGrid}`,
    color: chartText,
  };

  const now = new Date();
  const [annee,     setAnnee]     = useState(String(now.getFullYear()));
  const [stats,     setStats]     = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const anneeN = Number(annee);

    const moisRequetes = Array.from({ length: 12 }, (_, i) =>
      getStatsMasseSalariale({ mois: i + 1, annee: anneeN })
        .catch(() => ({ data: { masse_nette: 0, masse_brute: 0, nb_bulletins: 0 } }))
    );

    Promise.all([
      getStatsMasseSalariale({ annee: anneeN }).catch(() => ({ data: null })),
      ...moisRequetes,
    ])
      .then(([annuelRes, ...moisRes]) => {
        setStats(annuelRes.data);
        setChartData(
          moisRes.map((r, i) => ({
            name:        MOIS_LABELS[i + 1],
            brut:        Number(r.data?.masse_brute  || 0),
            net:         Number(r.data?.masse_nette  || 0),
            nb:          r.data?.nb_bulletins || 0,
          }))
        );
      })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [annee]);

  return (
    <RHLayout pageTitle="Masse salariale">
      {/* Filtre */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <label style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 0 }}>Année :</label>
          <select className="form-control form-control-sm"
            style={{ width: 100, background: "var(--card-bg)", color: "var(--text-primary)" }}
            value={annee} onChange={e => setAnnee(e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        <Link to="/rh/paie" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-arrow-left mr-1" />Retour
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: "var(--acerfi-blue)" }} />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="row mb-3">
            {[
              { label: "Masse brute annuelle",  val: `${Number(stats?.masse_brute || 0).toLocaleString("fr-FR")} F`,  color: "#2E74B5", icon: "file-invoice-dollar" },
              { label: "Masse nette annuelle",  val: `${Number(stats?.masse_nette || 0).toLocaleString("fr-FR")} F`,  color: "#28a745", icon: "money-bill-wave" },
              { label: "Total CNPS employés",   val: `${Number(stats?.total_cnps || 0).toLocaleString("fr-FR")} F`,   color: "#fd7e14", icon: "shield-alt" },
              { label: "Total IRPP",            val: `${Number(stats?.total_irpp || 0).toLocaleString("fr-FR")} F`,   color: "#6f42c1", icon: "landmark" },
            ].map(s => (
              <div key={s.label} className="col-lg-3 col-md-6 mb-2">
                <div className="card" style={{ background: "var(--card-bg)", borderLeft: `4px solid ${s.color}` }}>
                  <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--page-title)" }}>{s.val}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.label}</div>
                    </div>
                    <i className={`fas fa-${s.icon} fa-lg`} style={{ color: s.color, opacity: 0.6 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Statuts */}
          {stats?.bulletins_par_statut && (
            <div className="row mb-3">
              {Object.entries(stats.bulletins_par_statut).map(([statut, nb]) => (
                <div key={statut} className="col-4">
                  <div className="card text-center p-2" style={{ background: "var(--card-bg)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--page-title)" }}>{nb}</div>
                    <small style={{ color: "var(--text-muted)" }}>{statut}</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Graphique mensuel */}
          <div className="card" style={{ background: "var(--card-bg)" }}>
            <div className="card-header" style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="card-title" style={{ color: "var(--page-title)", fontSize: 14 }}>
                <i className="fas fa-chart-bar mr-2" style={{ color: "var(--acerfi-blue)" }} />
                Évolution mensuelle — {annee}
              </h3>
            </div>
            <div className="card-body">
              {chartData.some(d => d.brut > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 12 }} />
                    <YAxis tick={{ fill: chartText, fontSize: 11 }}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={v => [Number(v).toLocaleString("fr-FR") + " FCFA"]} />
                    <Legend wrapperStyle={{ color: chartText, fontSize: 12 }} />
                    <Bar dataKey="brut" name="Masse brute" fill="#2E74B5" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="net"  name="Masse nette" fill="#28a745" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-chart-bar fa-3x mb-3 d-block" style={{ opacity: 0.3 }} />
                  <strong>Aucune donnée pour {annee}</strong>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </RHLayout>
  );
}
