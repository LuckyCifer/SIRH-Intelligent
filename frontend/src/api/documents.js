import api from './axios'

export const getDocuments    = (params) => api.get('/documents/', { params })
export const getMesDocuments = ()       => api.get('/documents/mes-documents/')
export const getDocument     = (id)     => api.get(`/documents/${id}/`)
export const uploadDocument  = (data)   => api.post('/documents/', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const updateDocument  = (id, data) => api.patch(`/documents/${id}/`, data)
export const deleteDocument  = (id)     => api.delete(`/documents/${id}/`)
export const getCategories   = ()       => api.get('/documents/categories/')
export const telechargerDocument = (id) => api.get(`/documents/${id}/telecharger/`, { responseType: 'blob' })
