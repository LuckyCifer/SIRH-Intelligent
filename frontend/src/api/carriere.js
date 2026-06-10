import api from "./axios";

export const getEvenements = (params) => api.get("/carriere/", { params });

export const getTimelineEmploye = (employe_id) =>
  api.get("/carriere/timeline-employe/", { params: { employe_id } });

export const createEvenement = (data) => api.post("/carriere/", data);

export const updateEvenement = (id, data) => api.patch(`/carriere/${id}/`, data);

export const deleteEvenement = (id) => api.delete(`/carriere/${id}/`);
