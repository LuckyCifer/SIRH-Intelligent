import api from './axios'

export const getUsers = (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.role)        params.set('role', filters.role)
  if (filters.search)      params.set('search', filters.search)
  if (filters.is_active !== undefined && filters.is_active !== '')
    params.set('is_active', filters.is_active)
  if (filters.departement) params.set('departement', filters.departement)
  return api.get(`/accounts/gestion-comptes/?${params.toString()}`)
}

export const getUserById = (id) =>
  api.get(`/accounts/gestion-comptes/${id}/`)

export const createUser = (data) =>
  api.post('/accounts/gestion-comptes/', data)

export const updateUser = (id, data) =>
  api.put(`/accounts/gestion-comptes/${id}/`, data)

export const patchUser = (id, data) =>
  api.patch(`/accounts/gestion-comptes/${id}/`, data)

export const toggleActive = (id) =>
  api.post(`/accounts/gestion-comptes/${id}/toggle-active/`)

export const resetPassword = (id, data) =>
  api.post(`/accounts/gestion-comptes/${id}/reset-password/`, data)

export const deleteUser = (id) =>
  api.delete(`/accounts/gestion-comptes/${id}/`)

export const getAlertesAvancement = () =>
  api.get('/accounts/gestion-comptes/alertes-avancement/')
