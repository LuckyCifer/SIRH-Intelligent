import api from './axios'

export function telechargerTemplate() {
  return api.get('/paie/import/template/', { responseType: 'blob' })
}

export function analyserFichier(fichier, mois, annee) {
  const fd = new FormData()
  fd.append('fichier', fichier)
  fd.append('mois', mois)
  fd.append('annee', annee)
  return api.post('/paie/import/preview/', fd)
}

export function confirmerImport(donnees, mois, annee) {
  return api.post('/paie/import/confirmer/', { donnees, mois, annee })
}
