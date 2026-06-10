import api from './axios'

const BASE = '/entreprises'

export const getMonEntreprise   = ()       => api.get(`${BASE}/mon-entreprise/`)
export const updateMonEntreprise = (data)  => api.patch(`${BASE}/mon-entreprise/`, data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const getEntreprisePublique = (slug) => api.get(`${BASE}/publique/${slug}/`)
export const listeEntreprises    = (params) => api.get(`${BASE}/entreprises/`, { params })
export const getEntreprise       = (id)    => api.get(`${BASE}/entreprises/${id}/`)
export const createEntreprise    = (data)  => api.post(`${BASE}/entreprises/`, data)
export const updateEntreprise    = (id, data) => api.patch(`${BASE}/entreprises/${id}/`, data)
