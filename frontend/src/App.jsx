import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import useAuthStore from "./store/authStore"

// Auth
import LoginPage      from "./pages/auth/LoginPage"
import AccueilPublic  from "./pages/auth/AccueilPublic"

// ── Employé (anciennement Stagiaire) ──
import DashboardStagiaire  from "./pages/stagiaire/DashboardStagiaire"
import MesRapports         from "./pages/stagiaire/MesRapports"
import FormulaireRapport   from "./pages/stagiaire/FormulaireRapport"
import DetailRapport       from "./pages/stagiaire/DetailRapport"
import MonProjet           from "./pages/stagiaire/MonProjet"
import MonProfil           from "./pages/stagiaire/MonProfil"
import MonProfilPage       from "./pages/employe/MonProfilPage"
import MonContrat          from "./pages/employe/MonContrat"

// ── Manager (anciennement Encadreur) ──
import EncadreurDashboard  from "./pages/encadreur/EncadreurDashboard"
import MesStagiaires       from "./pages/encadreur/MesStagiaires"
import DetailStagiaire     from "./pages/encadreur/DetailStagiaire"
import RapportsAValider    from "./pages/encadreur/RapportsAValider"
import ValidationRapport   from "./pages/encadreur/ValidationRapport"
import EncadreurProfil     from "./pages/encadreur/EncadreurProfil"

// ── RH (anciennement Admin) ──
import DashboardAdmin       from "./pages/admin/DashboardAdmin"
import ListeDepartements    from "./pages/rh/departements/ListeDepartements"
import FormulaireDepartement from "./pages/rh/departements/FormulaireDepartement"
import DetailDepartement    from "./pages/rh/departements/DetailDepartement"
import ListeContrats        from "./pages/rh/contrats/ListeContrats"
import FormulaireContrat    from "./pages/rh/contrats/FormulaireContrat"

// ── Congés ──
import MesConges           from "./pages/conges/employe/MesConges"
import DemanderConge       from "./pages/conges/employe/DemanderConge"
import CongesEquipe        from "./pages/conges/manager/CongesEquipe"
import ValidationConge     from "./pages/conges/manager/ValidationConge"
import GestionConges       from "./pages/conges/rh/GestionConges"
import TypesConges         from "./pages/conges/rh/TypesConges"

// ── Présences ──
import MesPresences        from "./pages/presences/employe/MesPresences"
import PresencesEquipe     from "./pages/presences/manager/PresencesEquipe"
import GestionPresences    from "./pages/presences/rh/GestionPresences"

// ── Documents ──
import MesDocuments        from "./pages/documents/employe/MesDocuments"
import GestionDocuments    from "./pages/documents/rh/GestionDocuments"

// ── Objectifs & Évaluations ──
import MesObjectifs        from "./pages/objectifs/MesObjectifs"
import MesEvaluations      from "./pages/objectifs/MesEvaluations"
import FormulaireEvaluation from "./pages/objectifs/FormulaireEvaluation"
import ObjectifsEquipe     from "./pages/objectifs/ObjectifsEquipe"
import GestionObjectifs    from "./pages/objectifs/GestionObjectifs"
import GestionPeriodes     from "./pages/objectifs/GestionPeriodes"
import TableauEvaluations  from "./pages/objectifs/TableauEvaluations"

// ── Carrière ──
import HistoriqueCarriere  from "./pages/carriere/rh/HistoriqueCarriere"

// ── Recrutements ──
import TableauBordRecrutement from "./pages/recrutements/rh/TableauBordRecrutement"
import ListeOffres            from "./pages/recrutements/rh/ListeOffres"
import FormulaireOffre        from "./pages/recrutements/rh/FormulaireOffre"
import DetailOffre            from "./pages/recrutements/rh/DetailOffre"
import FicheCandidature       from "./pages/recrutements/rh/FicheCandidature"
import PlanningEntretiens     from "./pages/recrutements/rh/PlanningEntretiens"

// ── Formations ──
import CatalogueFormations    from "./pages/formations/employe/CatalogueFormations"
import MesFormations          from "./pages/formations/employe/MesFormations"
import FormationsEquipe       from "./pages/formations/manager/FormationsEquipe"
import GestionFormations      from "./pages/formations/rh/GestionFormations"
import FormulaireFormation    from "./pages/formations/rh/FormulaireFormation"
import DetailFormation        from "./pages/formations/rh/DetailFormation"

// ── Sanctions ──
import MesSanctions           from "./pages/sanctions/employe/MesSanctions"
import GestionSanctions       from "./pages/sanctions/rh/GestionSanctions"
import FormulaireSanction     from "./pages/sanctions/rh/FormulaireSanction"

// ── Paie ──
import MesBulletins           from "./pages/paie/employe/MesBulletins"
import GestionPaie            from "./pages/paie/rh/GestionPaie"
import GenerationMasse        from "./pages/paie/rh/GenerationMasse"
import DetailBulletin         from "./pages/paie/rh/DetailBulletin"
import MasseSalariale         from "./pages/paie/rh/MasseSalariale"
import ImportPaiePage         from "./pages/rh/ImportPaiePage"
import VirementsMobile        from "./pages/paie/rh/VirementsMobile"

// ── Rapport IA ──
import RapportIATableauBord   from "./pages/rapport_ia/TableauBordIA"
import RapportIAGenerateur    from "./pages/rapport_ia/GenerateurRapport"
import RapportIADetailPage    from "./pages/rapport_ia/DetailRapport"

// ── Entreprise & Notifications ──
import ParametresEntreprise   from "./pages/entreprise/rh/ParametresEntreprise"
import CentreNotifications    from "./pages/notifications/shared/CentreNotifications"

// ── Gestion Comptes ──
import GestionComptesPage     from "./pages/rh/GestionComptesPage"

// ── Partagé ──
import CatalogueFilieres   from "./pages/shared/CatalogueFilieres"
import Annuaire            from "./pages/shared/Annuaire"

function LegacyRedirect({ to }) {
  const params = useParams()
  let target = to
  for (const [k, v] of Object.entries(params)) {
    target = target.replace(`:${k}`, v)
  }
  return <Navigate to={target} replace />
}

function RequireAuth({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated)                     return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" replace />
  return children
}

function EntrepriseThemeLoader() {
  const { isAuthenticated } = useAuthStore()
  useEffect(() => {
    if (!isAuthenticated) return
    import('./api/entreprise').then(({ getMonEntreprise }) => {
      getMonEntreprise()
        .then(r => {
          const { couleur_primaire, couleur_secondaire } = r.data
          if (couleur_primaire)   document.documentElement.style.setProperty('--acerfi-blue', couleur_primaire)
          if (couleur_secondaire) document.documentElement.style.setProperty('--acerfi-dark', couleur_secondaire)
        })
        .catch(() => {})
    })
  }, [isAuthenticated])
  return null
}

const EMP = ["EMPLOYE"]
const MGR = ["MANAGER"]
const RH  = ["RH", "ADMIN"]
const ALL = ["EMPLOYE", "MANAGER", "RH", "ADMIN"]

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <EntrepriseThemeLoader />
      <Routes>

        {/* ── Public ── */}
        <Route path="/" element={<AccueilPublic />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ══ EMPLOYÉ ══ */}
        <Route path="/employe/dashboard" element={
          <RequireAuth roles={EMP}><DashboardStagiaire /></RequireAuth>
        } />
        <Route path="/employe/rapports" element={
          <RequireAuth roles={EMP}><MesRapports /></RequireAuth>
        } />
        <Route path="/employe/rapports/nouveau" element={
          <RequireAuth roles={EMP}><FormulaireRapport /></RequireAuth>
        } />
        <Route path="/employe/rapports/:id" element={
          <RequireAuth roles={EMP}><DetailRapport /></RequireAuth>
        } />
        <Route path="/employe/rapports/:id/edit" element={
          <RequireAuth roles={EMP}><FormulaireRapport /></RequireAuth>
        } />
        <Route path="/employe/objectifs" element={
          <RequireAuth roles={EMP}><MonProjet /></RequireAuth>
        } />
        <Route path="/employe/profil" element={
          <RequireAuth roles={EMP}><MonProfilPage /></RequireAuth>
        } />
        <Route path="/employe/contrat" element={
          <RequireAuth roles={EMP}><MonContrat /></RequireAuth>
        } />
        <Route path="/employe/conges" element={
          <RequireAuth roles={EMP}><MesConges /></RequireAuth>
        } />
        <Route path="/employe/conges/nouveau" element={
          <RequireAuth roles={EMP}><DemanderConge /></RequireAuth>
        } />
        <Route path="/employe/presences" element={
          <RequireAuth roles={EMP}><MesPresences /></RequireAuth>
        } />
        <Route path="/employe/documents" element={
          <RequireAuth roles={EMP}><MesDocuments /></RequireAuth>
        } />
        <Route path="/employe/mes-objectifs" element={
          <RequireAuth roles={EMP}><MesObjectifs /></RequireAuth>
        } />
        <Route path="/employe/mes-evaluations" element={
          <RequireAuth roles={EMP}><MesEvaluations /></RequireAuth>
        } />
        <Route path="/employe/evaluations/:id" element={
          <RequireAuth roles={EMP}><FormulaireEvaluation /></RequireAuth>
        } />
        <Route path="/employe/formations" element={
          <RequireAuth roles={EMP}><CatalogueFormations /></RequireAuth>
        } />
        <Route path="/employe/mes-formations" element={
          <RequireAuth roles={EMP}><MesFormations /></RequireAuth>
        } />
        <Route path="/employe/sanctions" element={
          <RequireAuth roles={EMP}><MesSanctions /></RequireAuth>
        } />
        <Route path="/employe/paie" element={
          <RequireAuth roles={EMP}><MesBulletins /></RequireAuth>
        } />

        {/* Redirects legacy /stagiaire/* → /employe/* */}
        <Route path="/stagiaire/dashboard"        element={<Navigate to="/employe/dashboard" replace />} />
        <Route path="/stagiaire/rapports"         element={<Navigate to="/employe/rapports"  replace />} />
        <Route path="/stagiaire/rapports/nouveau" element={<Navigate to="/employe/rapports/nouveau" replace />} />
        <Route path="/stagiaire/rapports/:id"      element={<LegacyRedirect to="/employe/rapports/:id" />} />
        <Route path="/stagiaire/rapports/:id/edit" element={<LegacyRedirect to="/employe/rapports/:id/edit" />} />
        <Route path="/stagiaire/projet"           element={<Navigate to="/employe/objectifs" replace />} />
        <Route path="/stagiaire/profil"           element={<Navigate to="/employe/profil"    replace />} />

        {/* ══ MANAGER ══ */}
        <Route path="/manager/dashboard" element={
          <RequireAuth roles={MGR}><EncadreurDashboard /></RequireAuth>
        } />
        <Route path="/manager/employes" element={
          <RequireAuth roles={MGR}><MesStagiaires /></RequireAuth>
        } />
        <Route path="/manager/employes/:id" element={
          <RequireAuth roles={MGR}><DetailStagiaire /></RequireAuth>
        } />
        <Route path="/manager/rapports-a-valider" element={
          <RequireAuth roles={MGR}><RapportsAValider /></RequireAuth>
        } />
        <Route path="/manager/rapports/:id/valider" element={
          <RequireAuth roles={MGR}><ValidationRapport /></RequireAuth>
        } />
        <Route path="/manager/profil" element={
          <RequireAuth roles={MGR}><EncadreurProfil /></RequireAuth>
        } />
        <Route path="/manager/conges" element={
          <RequireAuth roles={MGR}><CongesEquipe /></RequireAuth>
        } />
        <Route path="/manager/conges/:id/valider" element={
          <RequireAuth roles={MGR}><ValidationConge /></RequireAuth>
        } />
        <Route path="/manager/presences" element={
          <RequireAuth roles={MGR}><PresencesEquipe /></RequireAuth>
        } />
        <Route path="/manager/objectifs-equipe" element={
          <RequireAuth roles={MGR}><ObjectifsEquipe /></RequireAuth>
        } />
        <Route path="/manager/evaluations/:id" element={
          <RequireAuth roles={MGR}><FormulaireEvaluation /></RequireAuth>
        } />
        <Route path="/manager/formations" element={
          <RequireAuth roles={MGR}><FormationsEquipe /></RequireAuth>
        } />

        {/* Redirects legacy /encadreur/* → /manager/* */}
        <Route path="/encadreur/dashboard"                    element={<Navigate to="/manager/dashboard"          replace />} />
        <Route path="/encadreur/stagiaires"                   element={<Navigate to="/manager/employes"           replace />} />
        <Route path="/encadreur/stagiaires/:id"               element={<LegacyRedirect to="/manager/employes/:id" />} />
        <Route path="/encadreur/rapports-a-valider"           element={<Navigate to="/manager/rapports-a-valider" replace />} />
        <Route path="/encadreur/rapports/:id/valider"         element={<RequireAuth roles={MGR}><ValidationRapport /></RequireAuth>} />
        <Route path="/encadreur/profil"                       element={<Navigate to="/manager/profil"             replace />} />

        {/* ══ RH ══ */}
        <Route path="/rh/dashboard" element={
          <RequireAuth roles={RH}><DashboardAdmin /></RequireAuth>
        } />
        <Route path="/rh/departements" element={
          <RequireAuth roles={RH}><ListeDepartements /></RequireAuth>
        } />
        <Route path="/rh/departements/nouveau" element={
          <RequireAuth roles={RH}><FormulaireDepartement /></RequireAuth>
        } />
        <Route path="/rh/departements/:id/edit" element={
          <RequireAuth roles={RH}><FormulaireDepartement /></RequireAuth>
        } />
        <Route path="/rh/departements/:id" element={
          <RequireAuth roles={RH}><DetailDepartement /></RequireAuth>
        } />
        <Route path="/rh/contrats" element={
          <RequireAuth roles={RH}><ListeContrats /></RequireAuth>
        } />
        <Route path="/rh/contrats/nouveau" element={
          <RequireAuth roles={RH}><FormulaireContrat /></RequireAuth>
        } />
        <Route path="/rh/contrats/:id/edit" element={
          <RequireAuth roles={RH}><FormulaireContrat /></RequireAuth>
        } />
        <Route path="/rh/conges" element={
          <RequireAuth roles={RH}><GestionConges /></RequireAuth>
        } />
        <Route path="/rh/conges/types" element={
          <RequireAuth roles={RH}><TypesConges /></RequireAuth>
        } />
        <Route path="/rh/presences" element={
          <RequireAuth roles={RH}><GestionPresences /></RequireAuth>
        } />
        <Route path="/rh/documents" element={
          <RequireAuth roles={RH}><GestionDocuments /></RequireAuth>
        } />
        <Route path="/rh/objectifs" element={
          <RequireAuth roles={RH}><GestionObjectifs /></RequireAuth>
        } />
        <Route path="/rh/objectifs/periodes" element={
          <RequireAuth roles={RH}><GestionPeriodes /></RequireAuth>
        } />
        <Route path="/rh/evaluations" element={
          <RequireAuth roles={RH}><TableauEvaluations /></RequireAuth>
        } />
        <Route path="/rh/evaluations/:id" element={
          <RequireAuth roles={RH}><FormulaireEvaluation /></RequireAuth>
        } />

        {/* ── Formations RH ── */}
        <Route path="/rh/formations" element={
          <RequireAuth roles={RH}><GestionFormations /></RequireAuth>
        } />
        <Route path="/rh/formations/nouveau" element={
          <RequireAuth roles={RH}><FormulaireFormation /></RequireAuth>
        } />
        <Route path="/rh/formations/:id" element={
          <RequireAuth roles={RH}><DetailFormation /></RequireAuth>
        } />
        <Route path="/rh/formations/:id/modifier" element={
          <RequireAuth roles={RH}><FormulaireFormation /></RequireAuth>
        } />

        {/* ── Sanctions RH ── */}
        <Route path="/rh/sanctions" element={
          <RequireAuth roles={RH}><GestionSanctions /></RequireAuth>
        } />
        <Route path="/rh/sanctions/nouveau" element={
          <RequireAuth roles={RH}><FormulaireSanction /></RequireAuth>
        } />
        <Route path="/rh/sanctions/:id/modifier" element={
          <RequireAuth roles={RH}><FormulaireSanction /></RequireAuth>
        } />

        {/* ── Paie ── */}
        <Route path="/rh/paie" element={
          <RequireAuth roles={RH}><GestionPaie /></RequireAuth>
        } />
        <Route path="/rh/paie/generer" element={
          <RequireAuth roles={RH}><GenerationMasse /></RequireAuth>
        } />
        <Route path="/rh/paie/bulletins/:id" element={
          <RequireAuth roles={RH}><DetailBulletin /></RequireAuth>
        } />
        <Route path="/rh/paie/masse-salariale" element={
          <RequireAuth roles={RH}><MasseSalariale /></RequireAuth>
        } />
        <Route path="/rh/paie/import" element={
          <RequireAuth roles={RH}><ImportPaiePage /></RequireAuth>
        } />
        <Route path="/rh/paie/virements" element={
          <RequireAuth roles={RH}><VirementsMobile /></RequireAuth>
        } />

        {/* ── Rapport IA ── */}
        <Route path="/rh/rapport-ia" element={
          <RequireAuth roles={RH}><RapportIATableauBord /></RequireAuth>
        } />
        <Route path="/rh/rapport-ia/generer" element={
          <RequireAuth roles={RH}><RapportIAGenerateur /></RequireAuth>
        } />
        <Route path="/rh/rapport-ia/:id" element={
          <RequireAuth roles={RH}><RapportIADetailPage /></RequireAuth>
        } />

        {/* ── Gestion Comptes ── */}
        <Route path="/rh/gestion-comptes" element={
          <RequireAuth roles={RH}><GestionComptesPage /></RequireAuth>
        } />

        {/* ── Paramètres entreprise ── */}
        <Route path="/rh/parametres-entreprise" element={
          <RequireAuth roles={RH}><ParametresEntreprise /></RequireAuth>
        } />

        {/* ── Notifications (tous rôles) ── */}
        <Route path="/notifications" element={
          <RequireAuth><CentreNotifications /></RequireAuth>
        } />

        {/* ── Carrière ── */}
        <Route path="/rh/employes/:id/carriere" element={
          <RequireAuth roles={RH}><HistoriqueCarriere /></RequireAuth>
        } />

        {/* ── Recrutements ── */}
        <Route path="/rh/recrutements" element={
          <RequireAuth roles={RH}><TableauBordRecrutement /></RequireAuth>
        } />
        <Route path="/rh/recrutements/offres" element={
          <RequireAuth roles={RH}><ListeOffres /></RequireAuth>
        } />
        <Route path="/rh/recrutements/offres/nouveau" element={
          <RequireAuth roles={RH}><FormulaireOffre /></RequireAuth>
        } />
        <Route path="/rh/recrutements/offres/:id" element={
          <RequireAuth roles={RH}><DetailOffre /></RequireAuth>
        } />
        <Route path="/rh/recrutements/offres/:id/modifier" element={
          <RequireAuth roles={RH}><FormulaireOffre /></RequireAuth>
        } />
        <Route path="/rh/recrutements/candidatures/:id" element={
          <RequireAuth roles={RH}><FicheCandidature /></RequireAuth>
        } />
        <Route path="/rh/recrutements/planning" element={
          <RequireAuth roles={RH}><PlanningEntretiens /></RequireAuth>
        } />

        {/* Redirects legacy /admin/* → /rh/* */}
        <Route path="/admin/dashboard" element={<Navigate to="/rh/dashboard" replace />} />

        {/* ── Partagé ── */}
        <Route path="/filieres" element={
          <RequireAuth><CatalogueFilieres /></RequireAuth>
        } />
        <Route path="/annuaire" element={
          <RequireAuth><Annuaire /></RequireAuth>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
