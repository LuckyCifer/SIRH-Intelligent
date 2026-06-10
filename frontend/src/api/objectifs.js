import api from "./axios";

// ── Périodes ──────────────────────────────────────────────
export const getPeriodes = () => api.get("/objectifs/periodes/");
export const getPeriodesEnCours = () => api.get("/objectifs/periodes/en-cours/");
export const createPeriode = (data) => api.post("/objectifs/periodes/", data);
export const updatePeriode = (id, data) => api.patch(`/objectifs/periodes/${id}/`, data);
export const deletePeriode = (id) => api.delete(`/objectifs/periodes/${id}/`);

// ── Objectifs ─────────────────────────────────────────────
export const getMesObjectifs = (periodeId) =>
  api.get("/objectifs/objectifs/mes-objectifs/", {
    params: periodeId ? { periode: periodeId } : {},
  });
export const getObjectifsEquipe = (periodeId) =>
  api.get("/objectifs/objectifs/equipe/", {
    params: periodeId ? { periode: periodeId } : {},
  });
export const getObjectifs = (params) => api.get("/objectifs/objectifs/", { params });
export const createObjectif = (data) => api.post("/objectifs/objectifs/", data);
export const updateObjectif = (id, data) => api.patch(`/objectifs/objectifs/${id}/`, data);
export const deleteObjectif = (id) => api.delete(`/objectifs/objectifs/${id}/`);
export const majProgression = (id, data) =>
  api.patch(`/objectifs/objectifs/${id}/progression/`, data);

// ── Évaluations ───────────────────────────────────────────
export const getMesEvaluations = () => api.get("/objectifs/evaluations/mes-evaluations/");
export const getEvaluations = (params) => api.get("/objectifs/evaluations/", { params });
export const getEvaluation = (id) => api.get(`/objectifs/evaluations/${id}/`);
export const createEvaluation = (data) => api.post("/objectifs/evaluations/", data);
export const updateEvaluation = (id, data) => api.patch(`/objectifs/evaluations/${id}/`, data);
export const soumettreEvaluation = (id) =>
  api.post(`/objectifs/evaluations/${id}/soumettre/`);
export const signerEvaluation = (id, data) =>
  api.post(`/objectifs/evaluations/${id}/signer/`, data);
export const contesterEvaluation = (id, data) =>
  api.post(`/objectifs/evaluations/${id}/contester/`, data);
export const relancerIA = (id) => api.post(`/objectifs/evaluations/${id}/relancer-ia/`);
export const getTableauBord = (periodeId) =>
  api.get("/objectifs/evaluations/tableau-bord/", {
    params: periodeId ? { periode: periodeId } : {},
  });
