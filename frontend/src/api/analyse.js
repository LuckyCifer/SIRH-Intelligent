import api from './axios'

export const getAnalyse       = (id)         => api.get(`/analyse/${id}/`)
export const getAlertes       = ()            => api.get('/analyse/alertes/')
export const getAnalyseStatut = (rapportId)   => api.get(`/analyse/statut/${rapportId}/`)
