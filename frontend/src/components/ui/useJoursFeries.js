import { useEffect, useState } from 'react'
import { getJoursFeries } from '../../api/presences'

/**
 * Calendrier légal des jours fériés camerounais, fourni par le backend
 * (source unique : conges/calculateur_conges.py, ajustable dans l'admin Django).
 * Retourne une Map 'AAAA-MM-JJ' → nom, pour les années demandées.
 */
export function useJoursFeries(...annees) {
  const [feries, setFeries] = useState(() => new Map())
  const cle = annees.join(',')

  useEffect(() => {
    let actif = true
    Promise.allSettled(annees.map(a => getJoursFeries(a))).then(resultats => {
      if (!actif) return
      const m = new Map()
      resultats.forEach(r => {
        if (r.status === 'fulfilled') {
          r.value.data.jours_feries.forEach(j => m.set(j.date, j.nom))
        }
      })
      setFeries(m)
    })
    return () => { actif = false }
  }, [cle]) // eslint-disable-line react-hooks/exhaustive-deps

  return feries
}
