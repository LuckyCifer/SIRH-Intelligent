import api from "./axios";

// Configurations
export const getConfigurations    = ()        => api.get("/paie/configurations/");
export const updateConfiguration  = (id, d)   => api.patch(`/paie/configurations/${id}/`, d);

// Éléments de paie
export const getElements          = ()        => api.get("/paie/elements/");
export const creerElement         = (d)       => api.post("/paie/elements/", d);
export const updateElement        = (id, d)   => api.patch(`/paie/elements/${id}/`, d);
export const deleteElement        = (id)      => api.delete(`/paie/elements/${id}/`);

// Bulletins
export const getBulletins         = (p)       => api.get("/paie/bulletins/", { params: p });
export const getBulletin          = (id)      => api.get(`/paie/bulletins/${id}/`);
export const creerBulletin        = (d)       => api.post("/paie/bulletins/", d);
export const updateBulletin       = (id, d)   => api.patch(`/paie/bulletins/${id}/`, d);
export const deleteBulletin       = (id)      => api.delete(`/paie/bulletins/${id}/`);
export const genererMasse         = (d)       => api.post("/paie/bulletins/generer-masse/", d);
export const validerBulletin      = (id)      => api.post(`/paie/bulletins/${id}/valider/`);
export const marquerPaye          = (id, d)   => api.post(`/paie/bulletins/${id}/marquer-paye/`, d);
export const telechargerPdf       = (id)      => api.get(`/paie/bulletins/${id}/telecharger-pdf/`, { responseType: "blob" });
export const getStatsMasseSalariale = (p)     => api.get("/paie/bulletins/stats-masse-salariale/", { params: p });
export const getMesBulletins      = ()        => api.get("/paie/bulletins/mes-bulletins/");
