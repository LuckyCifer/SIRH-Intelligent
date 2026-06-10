export const FILIERES = [
  {
    code:         "BUREAUTIQUE",
    label:        "Bureautique & Productivité",
    description:  "Suites collaboratives, outils métier, automatisation des tâches.",
    couleur:      "#0077B6",
    icone:        "fas fa-desktop",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "MARKETING",
    label:        "Marketing Digital",
    description:  "Stratégie de marque, SEO, social media, performance, content.",
    couleur:      "#E63946",
    icone:        "fas fa-bullhorn",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "DEV_WEB",
    label:        "Développement Web & App",
    description:  "Architectures modernes, frameworks JS/TS, mobile cross-platform.",
    couleur:      "#2A9D8F",
    icone:        "fas fa-code",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "CYBERSEC",
    label:        "Cybersécurité",
    description:  "Audit, défense en profondeur, conformité, gestion des incidents.",
    couleur:      "#E76F51",
    icone:        "fas fa-shield-alt",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "GESTION_PROJET",
    label:        "Gestion de Projet",
    description:  "Méthodologies agiles, pilotage, coordination d'équipes pluridisciplinaires.",
    couleur:      "#F4A261",
    icone:        "fas fa-tasks",
    couleurTexte: "#1A1A1A",
  },
  {
    code:         "INFRA_RESEAUX",
    label:        "Infrastructures & Réseaux",
    description:  "Architecture LAN/WAN, supervision, virtualisation, datacenter.",
    couleur:      "#457B9D",
    icone:        "fas fa-network-wired",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "IA",
    label:        "Intelligence Artificielle",
    description:  "Fondamentaux ML, IA générative, intégration en production.",
    couleur:      "#7B2D8B",
    icone:        "fas fa-robot",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "CLOUD",
    label:        "Cloud Computing",
    description:  "AWS, Azure, GCP — déploiement, observabilité, FinOps.",
    couleur:      "#1F3864",
    icone:        "fas fa-cloud",
    couleurTexte: "#FFFFFF",
  },
  {
    code:         "AUTRE",
    label:        "Autre",
    description:  "Autre domaine de formation.",
    couleur:      "#6C757D",
    icone:        "fas fa-graduation-cap",
    couleurTexte: "#FFFFFF",
  },
]

export const getFiliere = (code) =>
  FILIERES.find(f => f.code === code) ?? FILIERES.find(f => f.code === "AUTRE")

export const getBadgeStyle = (code, size = "md") => {
  const f = getFiliere(code)
  const sizes = {
    sm: { fontSize: "10px", padding: "2px 8px" },
    md: { fontSize: "11px", padding: "3px 10px" },
    lg: { fontSize: "13px", padding: "5px 14px" },
  }
  return {
    backgroundColor: f.couleur,
    color:           f.couleurTexte,
    borderRadius:    "12px",
    fontWeight:      "700",
    display:         "inline-flex",
    alignItems:      "center",
    gap:             "4px",
    ...sizes[size],
  }
}
