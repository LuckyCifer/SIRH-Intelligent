import api from './axios'

export const getPeriodes  = ()        => api.get('/stagiaires/periodes/')
export const getProjets   = ()        => api.get('/stagiaires/projets/')
export const createProjet = (d)       => api.post('/stagiaires/projets/', d)
export const updateProjet = (id, d)   => api.put(`/stagiaires/projets/${id}/`, d)
