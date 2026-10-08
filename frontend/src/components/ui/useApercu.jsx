import { useCallback, useMemo, useState } from 'react'
import ApercuDocument from './ApercuDocument'

/** Nom de fichier depuis l'en-tête Content-Disposition, sinon valeur par défaut. */
export function nomDepuisEntetes(headers, defaut) {
  const cd = headers?.['content-disposition'] || ''
  const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return m ? decodeURIComponent(m[1]) : defaut
}

/**
 * Gère l'ouverture de la fenêtre d'aperçu.
 *   voirFichier(blob, 'bulletin.pdf', 'Titre')
 *   voirTableau({ titre, nomFichier: 'export.csv', entetes, lignes })
 *   … et rendre {apercuModal} dans la page.
 */
export function useApercu() {
  const [apercu, setApercu] = useState(null)
  const fermer = useCallback(() => setApercu(null), [])

  const voirFichier = useCallback((blob, nomFichier, titre) => {
    setApercu({ blob, nomFichier, titre })
  }, [])

  const voirTableau = useCallback(({ titre, nomFichier, entetes, lignes }) => {
    setApercu({ titre, nomFichier, entetes, lignes })
  }, [])

  const apercuModal = useMemo(
    () => <ApercuDocument apercu={apercu} onFermer={fermer} />,
    [apercu, fermer],
  )

  return { voirFichier, voirTableau, apercuModal }
}
