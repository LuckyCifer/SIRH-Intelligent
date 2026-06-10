import api from './axios'

const BASE = '/rapport-ia/rapports'

export const genererRapport        = (data)    => api.post(`${BASE}/generer/`, data)
export const getStatutGeneration   = (id)      => api.get(`${BASE}/${id}/statut-generation/`)
export const getDernierRapport     = ()        => api.get(`${BASE}/dernier-rapport/`)
export const getHistoriqueRapports = (params)  => api.get(`${BASE}/historique/`, { params })
export const getRapportDetail      = (id)      => api.get(`${BASE}/${id}/`)
export const listeRapports         = (params)  => api.get(`${BASE}/`, { params })
