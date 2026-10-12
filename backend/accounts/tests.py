"""
Tests de sécurité — droits par rôle et protection des données personnelles.

Règles vérifiées (PME camerounaise) :
  - RH : gestion de tout le dossier du personnel (contrats, sanctions, documents…)
  - MANAGER : agit sur son équipe uniquement (objectifs, évaluations, congés)
  - EMPLOYE : consulte ses données ; n'agit que via les actions prévues
  - Annuaire et données imbriquées : identité professionnelle seulement
    (loi n° 2024/017 du 23 décembre 2024, principe de minimisation)

Lancer :  python manage.py test accounts
"""
from datetime import date, datetime

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from departements.models import Departement

CHAMPS_SENSIBLES = {
    "numero_cni", "niu", "numero_cnps", "date_naissance", "lieu_naissance", "adresse",
    "numero_mobile", "operateur_mobile", "situation_matrimoniale", "nb_enfants_a_charge",
    "nb_enfants_moins_6_ans", "personne_contact_urgence", "contact_urgence_tel",
    "categorie_pro", "echelon", "coefficient",
}


class SecuriteTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        embauche = timezone.make_aware(datetime(2022, 1, 1))
        cls.rh = User.objects.create_user("rh.sec", password="x", role="RH")
        cls.manager = User.objects.create_user("manager.sec", password="x", role="MANAGER")
        cls.formation = Departement.objects.create(nom="Formation", code="FOR", responsable=cls.manager)
        autre = Departement.objects.create(nom="Finance", code="FIN")
        cls.membre = User.objects.create_user(
            "membre.sec", password="x", role="EMPLOYE", departement=cls.formation,
            first_name="Awa", last_name="MEMBRE", niu="M0123456789", numero_cni="123456789",
            numero_mobile="655000000", date_naissance=date(1995, 4, 2))
        cls.externe = User.objects.create_user(
            "externe.sec", password="x", role="EMPLOYE", departement=autre)
        cls.manager.departement = cls.formation
        cls.manager.save()
        User.objects.all().update(date_joined=embauche)
        for u in (cls.rh, cls.manager, cls.membre, cls.externe):
            u.refresh_from_db()

    def client_de(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    # ── Données personnelles ────────────────────────────────────────────────

    def test_annuaire_sans_donnees_personnelles(self):
        r = self.client_de(self.externe).get("/api/accounts/annuaire/")
        self.assertEqual(r.status_code, 200)
        fiches = r.data.get("results", r.data)
        fiche = next(f for f in fiches if f["id"] == self.membre.pk)
        self.assertEqual(fiche["full_name"], "Awa MEMBRE")
        self.assertFalse(CHAMPS_SENSIBLES & set(fiche), CHAMPS_SENSIBLES & set(fiche))

    def test_donnees_imbriquees_sans_donnees_personnelles(self):
        from conges.models import DemandeConge, TypeConge
        type_conge = TypeConge.objects.create(nom="Maladie", code="MAL", code_legal="MALADIE",
                                              deductible_conge_annuel=False)
        DemandeConge.objects.create(employe=self.membre, type_conge=type_conge, motif="x",
                                    date_debut=date(2026, 11, 2), date_fin=date(2026, 11, 3))
        r = self.client_de(self.manager).get("/api/conges/demandes/")
        demande = r.data.get("results", r.data)[0]
        self.assertFalse(CHAMPS_SENSIBLES & set(demande["employe_detail"]))

    def test_fiche_complete_toujours_visible_par_les_rh(self):
        r = self.client_de(self.rh).get(f"/api/accounts/users/{self.membre.pk}/")
        self.assertEqual(r.data["niu"], "M0123456789")

    # ── Objectifs et évaluations : équipe du manager ────────────────────────

    def _periode(self):
        from objectifs.models import PeriodeEvaluation
        return PeriodeEvaluation.objects.create(nom="T4 2026", type_periode="TRIMESTRIEL",
                                                date_debut=date(2026, 10, 1), date_fin=date(2026, 12, 31))

    def _objectif(self, user, employe):
        return self.client_de(user).post("/api/objectifs/objectifs/", {
            "employe": employe.pk, "periode": self._periode().pk, "titre": "Former 20 agents",
        }, format="json")

    def test_manager_assigne_un_objectif_a_son_equipe(self):
        self.assertEqual(self._objectif(self.manager, self.membre).status_code, 201)

    def test_manager_ne_peut_pas_assigner_hors_equipe(self):
        self.assertEqual(self._objectif(self.manager, self.externe).status_code, 403)

    def test_manager_ne_peut_pas_s_assigner_ses_objectifs(self):
        self.assertEqual(self._objectif(self.manager, self.manager).status_code, 403)

    def test_rh_assigne_a_tout_le_personnel(self):
        self.assertEqual(self._objectif(self.rh, self.externe).status_code, 201)

    def test_employe_ne_modifie_pas_son_objectif_mais_sa_progression(self):
        r = self._objectif(self.manager, self.membre)
        employe = self.client_de(self.membre)
        url = f"/api/objectifs/objectifs/{r.data['id']}/"
        self.assertEqual(employe.patch(url, {"titre": "Objectif plus facile"}, format="json").status_code, 403)
        self.assertEqual(employe.patch(url + "progression/", {"progression": 40}, format="json").status_code, 200)

    def test_manager_n_evalue_pas_hors_equipe(self):
        r = self.client_de(self.manager).post("/api/objectifs/evaluations/", {
            "employe": self.externe.pk, "periode": self._periode().pk,
        }, format="json")
        self.assertEqual(r.status_code, 403)

    # ── Congés ──────────────────────────────────────────────────────────────

    def _type_annuel(self):
        from conges.models import TypeConge
        return TypeConge.objects.create(nom="Congé annuel", code="ANNUEL", code_legal="ANNUEL",
                                        deductible_conge_annuel=True)

    def test_manager_ne_valide_pas_son_propre_conge(self):
        type_annuel = self._type_annuel()
        r = self.client_de(self.manager).post("/api/conges/demandes/", {
            "type_conge": type_annuel.pk, "date_debut": "2026-11-02", "date_fin": "2026-11-04",
            "motif": "Repos", "employe": self.manager.pk,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        r2 = self.client_de(self.manager).post(f"/api/conges/demandes/{r.data['id']}/approuver/", {},
                                               format="json")
        self.assertEqual(r2.status_code, 403)

    def test_employe_ne_modifie_ni_sa_demande_ni_son_solde(self):
        type_annuel = self._type_annuel()
        employe = self.client_de(self.membre)
        r = employe.post("/api/conges/demandes/", {
            "type_conge": type_annuel.pk, "date_debut": "2026-11-02", "date_fin": "2026-11-04",
            "motif": "Repos", "employe": self.membre.pk,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(employe.patch(f"/api/conges/demandes/{r.data['id']}/",
                                       {"date_fin": "2026-12-31"}, format="json").status_code, 403)
        soldes = employe.get("/api/conges/soldes/?annee=2026").data
        solde = soldes.get("results", soldes)[0]
        self.assertEqual(employe.patch(f"/api/conges/soldes/{solde['id']}/",
                                       {"jours_acquis": 999}, format="json").status_code, 403)

    # ── Présences ───────────────────────────────────────────────────────────

    def test_employe_ne_corrige_pas_ses_pointages(self):
        from presences.models import Pointage
        p = Pointage.objects.create(employe=self.membre, date=date(2026, 10, 5))
        r = self.client_de(self.membre).patch(f"/api/presences/{p.pk}/", {"statut": "PRESENT"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_seuls_les_rh_modifient_la_configuration_des_presences(self):
        r = self.client_de(self.membre).post("/api/presences/config/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    # ── Dossier du personnel : RH ───────────────────────────────────────────

    def test_manager_ne_voit_que_les_contrats_de_son_equipe(self):
        from contrats.models import Contrat
        Contrat.objects.create(employe=self.membre, type_contrat="CDI", date_debut=date(2022, 1, 1))
        Contrat.objects.create(employe=self.externe, type_contrat="CDI", date_debut=date(2022, 1, 1))
        r = self.client_de(self.manager).get("/api/contrats/")
        employes = {c["employe"] for c in r.data.get("results", r.data)}
        self.assertEqual(employes, {self.membre.pk})

    def test_creations_reservees_aux_rh(self):
        manager = self.client_de(self.manager)
        for url in ("/api/contrats/", "/api/sanctions/", "/api/documents/", "/api/departements/"):
            with self.subTest(url=url):
                self.assertEqual(manager.post(url, {}, format="json").status_code, 403)

    def test_employe_ne_lit_pas_les_rapports_des_autres(self):
        from rapports.models import RapportHebdomadaire
        rapport = RapportHebdomadaire.objects.create(
            stagiaire=self.externe, semaine_numero=1, date_debut_semaine=date(2026, 10, 5),
            date_fin_semaine=date(2026, 10, 9), activites_realisees="Inventaire")
        r = self.client_de(self.membre).get(f"/api/rapports/{rapport.pk}/")
        self.assertEqual(r.status_code, 404)
