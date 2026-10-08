import api from './axios'

export const getPointages             = (params) => api.get('/presences/', { params })
export const creerPointage            = (data)   => api.post('/presences/', data)
export const updatePointage           = (id, data) => api.patch(`/presences/${id}/`, data)
export const pointerArrivee           = ()       => api.post('/presences/pointer-arrivee/')
export const pointerDepart            = ()       => api.post('/presences/pointer-depart/')
export const getMonPointageAujourdhui = ()       => api.get('/presences/mon-pointage-aujourd-hui/')
export const getStatsMensuel          = ()       => api.get('/presences/stats-mensuel/')
export const getRapportEquipe         = (mois)   => api.get('/presences/rapport-equipe/', { params: { mois } })
export const getJoursFeries           = (annee)  => api.get(`/presences/jours-feries/${annee}/`)
