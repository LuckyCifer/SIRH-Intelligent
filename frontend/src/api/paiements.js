import api from "./axios";

// ── Virements Mobile Money ──────────────────────────────────────────────────

export const getVirements    = (params) => api.get("/paie/virements/", { params });
export const getVirement     = (id)     => api.get(`/paie/virements/${id}/`);
export const getStatsVirements = ()     => api.get("/paie/virements/stats/");
export const rafraichirStatut  = (id)   => api.post(`/paie/virements/${id}/rafraichir-statut/`);

// Virer directement depuis un bulletin de paie
export const virementBulletin = (bulletinId, data) =>
  api.post(`/paie/bulletins/${bulletinId}/virer/`, data);

// Virement libre (sans bulletin associé)
export const creerVirement = (data) => api.post("/paie/virements/", data);
