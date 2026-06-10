import api from './axios'

export const getRapports      = ()        => api.get('/rapports/')
export const getRapport       = (id)      => api.get(`/rapports/${id}/`)
export const createRapport    = (data)    => api.post('/rapports/', data)
export const updateRapport    = (id, d)   => api.put(`/rapports/${id}/`, d)
export const soumettreRapport = (id)      => api.post(`/rapports/${id}/soumettre/`)
export const getMesStats      = ()        => api.get('/rapports/mes-stats/')
