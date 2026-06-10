import api from './axios'

const BASE = '/notifications/notifications'

export const getNotifications    = (params) => api.get(`${BASE}/`, { params })
export const getCompteur         = ()       => api.get(`${BASE}/compteur/`)
export const marquerLue          = (id)     => api.patch(`${BASE}/${id}/marquer-lue/`)
export const toutLire            = ()       => api.post(`${BASE}/tout-lire/`)
export const supprimerLues       = ()       => api.delete(`${BASE}/supprimer-lues/`)
