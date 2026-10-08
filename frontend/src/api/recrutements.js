import api from "./axios";

// Offres
export const getOffres = (params) => api.get("/recrutements/offres/", { params });
export const getOffre = (id) => api.get(`/recrutements/offres/${id}/`);
export const createOffre = (data) => api.post("/recrutements/offres/", data);
export const updateOffre = (id, data) => api.patch(`/recrutements/offres/${id}/`, data);
export const deleteOffre = (id) => api.delete(`/recrutements/offres/${id}/`);
export const publierOffre = (id) => api.post(`/recrutements/offres/${id}/publier/`);
export const cloturerOffre = (id) => api.post(`/recrutements/offres/${id}/cloturer/`);
export const mettreEnPauseOffre = (id) => api.post(`/recrutements/offres/${id}/mettre-en-pause/`);
export const getTableauBordRecrutement = () => api.get("/recrutements/offres/tableau-bord/");

// Candidatures
export const getCandidatures = (params) => api.get("/recrutements/candidatures/", { params });
export const getCandidature = (id) => api.get(`/recrutements/candidatures/${id}/`);
export const changerStatutCandidature = (id, data) =>
  api.post(`/recrutements/candidatures/${id}/changer-statut/`, data);
export const analyserCvIa = (id) => api.post(`/recrutements/candidatures/${id}/analyser-cv-ia/`);
export const noterCandidature = (id, note) =>
  api.patch(`/recrutements/candidatures/${id}/noter/`, { note_interne: note });

// Entretiens
export const getEntretiens = (params) => api.get("/recrutements/entretiens/", { params });
export const getEntretien = (id) => api.get(`/recrutements/entretiens/${id}/`);
export const createEntretien = (data) => api.post("/recrutements/entretiens/", data);
export const updateEntretien = (id, data) => api.patch(`/recrutements/entretiens/${id}/`, data);
export const deleteEntretien = (id) => api.delete(`/recrutements/entretiens/${id}/`);

// Onboarding légal
export const updateOnboarding = (id, data) =>
  api.patch(`/recrutements/candidatures/${id}/update-onboarding/`, data);
export const convertirEnEmploye = (id) =>
  api.post(`/recrutements/candidatures/${id}/convertir-en-employe/`);
export const getOnboardingsEnCours = () =>
  api.get("/recrutements/candidatures/onboardings-en-cours/");
