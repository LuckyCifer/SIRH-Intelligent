import api from './axios'

// RH : upload la photo d'un utilisateur
export const uploadPhotoProfil = (userId, fichier) => {
  const formData = new FormData()
  formData.append('photo_profil', fichier)
  return api.patch(`/accounts/gestion-comptes/${userId}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// RH : supprimer la photo d'un utilisateur
export const supprimerPhotoProfil = (userId) =>
  api.delete(`/accounts/gestion-comptes/${userId}/supprimer-photo/`)

// Employé : upload sa propre photo
export const uploadMaPhoto = (fichier) => {
  const formData = new FormData()
  formData.append('photo_profil', fichier)
  return api.post('/accounts/me/photo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// Employé : supprimer sa propre photo
export const supprimerMaPhoto = () =>
  api.delete('/accounts/me/photo/')
