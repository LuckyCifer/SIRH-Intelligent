import api from './axios'

export const getMonDashboard      = ()         => api.get('/stagiaires/mon-dashboard/')
export const getMesStatsEncadreur = ()         => api.get('/stagiaires/mes-stats/')
export const getDetailStagiaire   = (id)       => api.get(`/stagiaires/${id}/detail/`)
export const getRapportsAValider  = ()         => api.get('/rapports/?statut=SOUMIS')
export const validerRapport       = (id, data) => api.post(`/rapports/${id}/valider/`, data)
export const getAnalyse           = (id)       => api.get(`/analyse/${id}/`)
export const getRapport           = (id)       => api.get(`/rapports/${id}/`)
