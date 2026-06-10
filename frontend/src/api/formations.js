import api from "./axios";

// Catégories
export const getCategories = () => api.get("/formations/categories/");

// Formations
export const getCatalogue       = ()      => api.get("/formations/formations/catalogue/");
export const getFormations      = (p)     => api.get("/formations/formations/", { params: p });
export const getFormation       = (id)    => api.get(`/formations/formations/${id}/`);
export const creerFormation     = (d)     => api.post("/formations/formations/", d);
export const updateFormation    = (id, d) => api.patch(`/formations/formations/${id}/`, d);
export const deleteFormation    = (id)    => api.delete(`/formations/formations/${id}/`);
export const getStatsFormations = ()      => api.get("/formations/formations/stats/");
export const terminerFormation  = (id)    => api.post(`/formations/formations/${id}/terminer/`);

// Inscriptions
export const getMesInscriptions   = ()      => api.get("/formations/inscriptions/mes-inscriptions/");
export const getInscriptions      = (p)     => api.get("/formations/inscriptions/", { params: p });
export const sInscrire            = (d)     => api.post("/formations/inscriptions/", d);
export const validerInscription   = (id)    => api.post(`/formations/inscriptions/${id}/valider/`);
export const marquerPresence      = (id, d) => api.post(`/formations/inscriptions/${id}/marquer-presence/`, d);
export const noterFormation       = (id, d) => api.post(`/formations/inscriptions/${id}/noter/`, d);
export const annulerInscription   = (id)    => api.post(`/formations/inscriptions/${id}/annuler-inscription/`);

// Compétences
export const getCompetences = (p) => api.get("/formations/competences/", { params: p });
export const creerCompetence = (d) => api.post("/formations/competences/", d);
