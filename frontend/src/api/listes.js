import api from "./axios";

/**
 * GET qui suit toutes les pages DRF (PAGE_SIZE = 20) pour alimenter les listes déroulantes.
 * Renvoie une réponse au format axios dont `data` est le tableau complet,
 * compatible avec le motif `res.data.results ?? res.data` des pages.
 */
export async function chargerTout(url, params) {
  const res = await api.get(url, { params });
  if (!res.data || Array.isArray(res.data) || !Array.isArray(res.data.results)) return res;

  const items = [...res.data.results];
  let next = res.data.next;
  while (next) {
    // `next` est absolu (http://hôte/api/...) : on le rend relatif à baseURL
    const r = await api.get(next.replace(/^.*?\/api(?=\/)/, ""));
    items.push(...r.data.results);
    next = r.data.next;
  }
  return { ...res, data: items };
}

/** Employés gérables par l'utilisateur (manager : son équipe ; RH : tous les employés). */
export const getMonEquipe = () => api.get("/accounts/mon-equipe/");
