import api from "./axios";

export const getSanctions      = (p)     => api.get("/sanctions/", { params: p });
export const getSanction       = (id)    => api.get(`/sanctions/${id}/`);
export const creerSanction     = (d)     => api.post("/sanctions/", d);
export const updateSanction    = (id, d) => api.patch(`/sanctions/${id}/`, d);
export const notifierSanction  = (id)    => api.post(`/sanctions/${id}/notifier/`);
export const repondre          = (id, d) => api.post(`/sanctions/${id}/repondre/`, d);
export const archiverSanction  = (id)    => api.post(`/sanctions/${id}/archiver/`);
export const getStatsSanctions = ()      => api.get("/sanctions/stats/");
