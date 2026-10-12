"""
Isolation entre entreprises (multi-tenancy) : une entreprise ne voit jamais les
données d'une autre, et ne peut pas les viser lors d'une création.

Deux entreprises complètes sont créées dans la base de test ; le RH, le manager et
l'employé de l'entreprise A interrogent chaque module.
Lancer :  python manage.py test entreprises
"""
import shutil
import tempfile
from datetime import date, datetime

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from entreprises.models import Entreprise

MEDIA_TEMP = tempfile.mkdtemp(prefix="sirh-tests-")


def creer_entreprise(suffixe):
    """Une entreprise avec RH, manager, employé et une donnée dans chaque module."""
    from carriere.models import EvenementCarriere
    from conges.models import DemandeConge, TypeConge
    from contrats.models import Contrat
    from departements.models import Departement, Poste
    from documents.models import CategorieDocument, DocumentRH
    from formations.models import Formation, InscriptionFormation
    from objectifs.models import EvaluationPerformance, Objectif, PeriodeEvaluation
    from paie.models import BulletinPaie
    from presences.models import Pointage
    from recrutements.models import Candidature, Entretien, OffreEmploi
    from sanctions.models import Sanction

    e = Entreprise.objects.create(nom=f"Entreprise {suffixe}", slug=f"entreprise-{suffixe.lower()}")
    rh = User.objects.create_user(f"rh.{suffixe}", password="x", role="RH", entreprise=e)
    manager = User.objects.create_user(f"manager.{suffixe}", password="x", role="MANAGER", entreprise=e)
    dept = Departement.objects.create(nom=f"Ventes {suffixe}", code=f"V{suffixe}", responsable=manager, entreprise=e)
    poste = Poste.objects.create(titre=f"Vendeur {suffixe}", departement=dept, entreprise=e) \
        if "titre" in {f.name for f in Poste._meta.get_fields()} else \
        Poste.objects.create(nom=f"Vendeur {suffixe}", departement=dept, entreprise=e)
    employe = User.objects.create_user(f"employe.{suffixe}", password="x", role="EMPLOYE",
                                       entreprise=e, departement=dept)
    User.objects.filter(entreprise=e).update(date_joined=timezone.make_aware(datetime(2022, 1, 1)))

    type_conge, _ = TypeConge.objects.get_or_create(
        code="MAL", defaults={"nom": "Maladie", "code_legal": "MALADIE", "deductible_conge_annuel": False})
    periode, _ = PeriodeEvaluation.objects.get_or_create(
        nom="T4 2026", defaults={"type_periode": "TRIMESTRIEL",
                                 "date_debut": date(2026, 10, 1), "date_fin": date(2026, 12, 31)})
    categorie, _ = CategorieDocument.objects.get_or_create(code="ATT", defaults={"nom": "Attestations"})
    offre = OffreEmploi.objects.create(titre=f"Commercial {suffixe}", description="x",
                                       competences_requises="x", entreprise=e)
    candidature = Candidature.objects.create(offre=offre, nom_complet=f"Candidat {suffixe}",
                                             email=f"c{suffixe}@test.cm",
                                             cv=SimpleUploadedFile("cv.pdf", b"%PDF-1.4"))
    formation = Formation.objects.create(titre=f"Excel {suffixe}", description="x", entreprise=e)

    objets = {
        "/api/accounts/users/": employe,
        "/api/departements/": dept,
        "/api/departements/postes/": poste,
        "/api/contrats/": Contrat.objects.create(employe=employe, type_contrat="CDI",
                                                 date_debut=date(2022, 1, 1), entreprise=e),
        "/api/conges/demandes/": DemandeConge.objects.create(
            employe=employe, type_conge=type_conge, motif="x", entreprise=e,
            date_debut=date(2026, 11, 2), date_fin=date(2026, 11, 3)),
        "/api/presences/": Pointage.objects.create(employe=employe, date=date(2026, 10, 5), entreprise=e),
        "/api/documents/": DocumentRH.objects.create(
            categorie=categorie, titre=f"Attestation {suffixe}", employe=employe, uploade_par=rh,
            fichier=SimpleUploadedFile("a.pdf", b"%PDF-1.4")),
        "/api/objectifs/objectifs/": Objectif.objects.create(employe=employe, periode=periode, titre="x"),
        "/api/objectifs/evaluations/": EvaluationPerformance.objects.create(employe=employe, periode=periode),
        "/api/paie/bulletins/": BulletinPaie.objects.create(employe=employe, mois=9, annee=2026, entreprise=e),
        "/api/sanctions/": Sanction.objects.create(
            employe=employe, type_sanction="AVERTISSEMENT", motif="x", description="x",
            date_faits=date(2026, 9, 1), date_sanction=date(2026, 9, 5), entreprise=e),
        "/api/formations/formations/": formation,
        "/api/formations/inscriptions/": InscriptionFormation.objects.create(employe=employe, formation=formation),
        "/api/carriere/": EvenementCarriere.objects.create(
            employe=employe, type_evenement="PROMOTION", date_evenement=date(2025, 1, 1), titre="x"),
        "/api/recrutements/offres/": offre,
        "/api/recrutements/candidatures/": candidature,
        "/api/recrutements/entretiens/": Entretien.objects.create(
            candidature=candidature, type_entretien="RH",
            date_heure=timezone.make_aware(datetime(2026, 10, 20, 10))),
    }
    return {"entreprise": e, "rh": rh, "manager": manager, "employe": employe, "objets": objets}


def ids_liste(client, url):
    r = client.get(url)
    if r.status_code != 200:
        return r.status_code, set()
    donnees = r.data.get("results", r.data) if isinstance(r.data, dict) else r.data
    ids = set()
    for item in donnees:
        if isinstance(item, dict) and "id" in item:
            ids.add(item["id"])
    while isinstance(r.data, dict) and r.data.get("next"):
        r = client.get(r.data["next"])
        ids |= {i["id"] for i in r.data.get("results", [])}
    return 200, ids


@override_settings(MEDIA_ROOT=MEDIA_TEMP)
class IsolationEntreprisesTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.a = creer_entreprise("A")
        cls.b = creer_entreprise("B")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMP, ignore_errors=True)

    def client_de(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def test_listes_sans_donnees_de_l_autre_entreprise(self):
        for role in ("rh", "manager", "employe"):
            client = self.client_de(self.a[role])
            for url, objet_b in self.b["objets"].items():
                with self.subTest(role=role, url=url):
                    code, ids = ids_liste(client, url)
                    self.assertNotIn(objet_b.pk, ids, f"{role} de A voit l'objet de B dans {url}")

    def test_detail_d_un_objet_de_l_autre_entreprise_introuvable(self):
        client = self.client_de(self.a["rh"])
        for url, objet_b in self.b["objets"].items():
            with self.subTest(url=url):
                self.assertIn(client.get(f"{url}{objet_b.pk}/").status_code, (403, 404))

    def test_annuaire_et_equipe_limites_a_l_entreprise(self):
        for url in ("/api/accounts/annuaire/", "/api/accounts/mon-equipe/"):
            with self.subTest(url=url):
                _, ids = ids_liste(self.client_de(self.a["rh"]), url)
                self.assertNotIn(self.b["employe"].pk, ids)

    def test_creation_visant_un_employe_de_l_autre_entreprise_refusee(self):
        rh_a = self.client_de(self.a["rh"])
        employe_b = self.b["employe"].pk
        periode = self.a["objets"]["/api/objectifs/objectifs/"].periode_id
        cas = {
            "/api/objectifs/objectifs/": {"employe": employe_b, "periode": periode, "titre": "x"},
            "/api/contrats/": {"employe": employe_b, "type_contrat": "CDI", "date_debut": "2026-11-01"},
            "/api/sanctions/": {"employe": employe_b, "type_sanction": "AVERTISSEMENT", "motif": "x",
                                "description": "x", "date_faits": "2026-09-01", "date_sanction": "2026-09-05"},
        }
        for url, donnees in cas.items():
            with self.subTest(url=url):
                r = rh_a.post(url, donnees, format="json")
                self.assertIn(r.status_code, (400, 403, 404), f"{url} : {r.status_code} {r.data}")

    # ── Actions personnalisées, statistiques et données envoyées à l'IA ─────

    def test_actions_et_statistiques_limitees_a_l_entreprise(self):
        rh_a = self.client_de(self.a["rh"])
        dept_b = self.b["objets"]["/api/departements/"].pk
        organigramme = rh_a.get("/api/departements/organigramme/").data
        self.assertNotIn(dept_b, {d["id"] for d in organigramme})
        r = rh_a.get(f"/api/conges/demandes/solde-detaille/?employe={self.b['employe'].pk}&annee=2026")
        self.assertEqual(r.status_code, 404)
        _, entreprises = ids_liste(rh_a, "/api/entreprises/entreprises/")
        self.assertEqual(entreprises, {self.a["entreprise"].pk})

    def test_un_rh_ne_cree_pas_d_entreprise(self):
        r = self.client_de(self.a["rh"]).post("/api/entreprises/entreprises/", {"nom": "Pirate", "slug": "pirate"},
                                              format="json")
        self.assertEqual(r.status_code, 403)

    def test_donnees_du_rapport_ia_limitees_a_l_entreprise(self):
        from rapport_ia.services import collecter_donnees_rh
        donnees = collecter_donnees_rh(10, 2026, entreprise=self.a["entreprise"])
        self.assertEqual(donnees["nb_employes"], 1)   # l'employé de A, pas celui de B
