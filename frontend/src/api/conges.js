import api from './axios'

export const getTypesConge  = ()         => api.get('/conges/types/')
export const getDemandes    = (params)   => api.get('/conges/demandes/', { params })
export const getDemande     = (id)       => api.get(`/conges/demandes/${id}/`)
export const creerDemande   = (data)     => api.post('/conges/demandes/', data)
export const approuverConge = (id, data) => api.post(`/conges/demandes/${id}/approuver/`, data)
export const refuserConge   = (id, data) => api.post(`/conges/demandes/${id}/refuser/`, data)
export const annulerConge   = (id)       => api.post(`/conges/demandes/${id}/annuler/`)
export const getMesSoldes   = (params)   => api.get('/conges/soldes/', { params })
export const getStatsConges = ()         => api.get('/conges/stats/')
