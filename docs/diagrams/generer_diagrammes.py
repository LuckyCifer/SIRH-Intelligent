"""
Generateur de diagrammes UML SIRH Intelligent
Utilise l'API publique plantuml.com -> PNG
Execution : python generer_diagrammes.py
"""
import zlib
import os
import sys

try:
    import requests
except ImportError:
    print("Installation de requests...")
    os.system(f"{sys.executable} -m pip install requests -q")
    import requests

OUTPUT = os.path.dirname(os.path.abspath(__file__))


# ── Encodage PlantUML ─────────────────────────────────────────────────────────
def encode(text: str) -> str:
    CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    data = zlib.compress(text.encode("utf-8"))
    res = []
    for i in range(0, len(data), 3):
        b = data[i:i+3]
        while len(b) < 3:
            b += b"\x00"
        b0, b1, b2 = b[0], b[1], b[2]
        res += [
            CHARS[(b0 >> 2) & 0x3F],
            CHARS[((b0 & 3) << 4) | (b1 >> 4)],
            CHARS[((b1 & 15) << 2) | (b2 >> 6)],
            CHARS[b2 & 0x3F],
        ]
    return "~1" + "".join(res)


def png(name: str, content: str):
    url = "https://www.plantuml.com/plantuml/png/" + encode(content)
    resp = requests.get(url, timeout=30)
    if resp.status_code == 200 and resp.content[:4] == b"\x89PNG":
        path = os.path.join(OUTPUT, name)
        with open(path, "wb") as f:
            f.write(resp.content)
        print(f"  OK  {name} ({len(resp.content)//1024} Ko)")
    else:
        print(f"  ERR {name} — HTTP {resp.status_code}")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. DIAGRAMME DE CLASSES
# ═══════════════════════════════════════════════════════════════════════════════
CLASSES = """
@startuml 01_classes_sirh
!theme plain
skinparam backgroundColor #FFFFFF
skinparam classBackgroundColor #EBF3FB
skinparam classBorderColor #2E74B5
skinparam classFontColor #1F3864
skinparam arrowColor #2E74B5
skinparam packageBackgroundColor #F0F7FF
skinparam packageBorderColor #2E74B5
skinparam shadowing false
skinparam defaultFontSize 11
title Diagramme de Classes — SIRH Intelligent\\nACERFI SARL 2026

package "Comptes & Organisation" {
  class User {
    +id : int
    +username : str
    +first_name : str
    +last_name : str
    +email : str
    +role : EMPLOYE|MANAGER|RH|ADMIN
    +filiere : str
    +telephone : str
    --
    +is_stagiaire() bool
    +is_encadreur() bool
    +is_rh() bool
  }
  class Entreprise {
    +nom : str
    +sigle : str
    +secteur : str
    +ville : str
    +devise : str
  }
  class Departement {
    +nom : str
    +code : str
    +couleur : str
  }
  class Poste {
    +titre : str
    +niveau : str
    +salaire_min : Decimal
    +salaire_max : Decimal
  }
}

package "Contrats & Presences" {
  class Contrat {
    +type : CDI|CDD|STAGE
    +date_debut : date
    +date_fin : date
    +salaire_brut : Decimal
    +statut : ACTIF|EXPIRE|RESILIE
  }
  class Pointage {
    +date : date
    +heure_arrivee : time
    +heure_depart : time
    +statut : PRESENT|ABSENT|RETARD
    +heures_travaillees : Decimal
    +heures_sup : Decimal
  }
}

package "Conges & Absences" {
  class TypeConge {
    +nom : str
    +jours_par_an : int
    +avec_solde : bool
  }
  class DemandeConge {
    +date_debut : date
    +date_fin : date
    +nb_jours : int
    +statut : EN_ATTENTE|APPROUVE|REFUSE
    +motif : str
  }
  class SoldeConge {
    +solde_initial : Decimal
    +solde_pris : Decimal
    +solde_restant : Decimal
    +annee : int
  }
}

package "Paie & IA" {
  class BulletinPaie {
    +periode : str (YYYY-MM)
    +salaire_brut : Decimal
    +cnps_employe : Decimal
    +irpp : Decimal
    +net_a_payer : Decimal
    +statut : BROUILLON|VALIDE|PAYE
    --
    +calculer() : void
  }
  class RapportIAMensuel {
    +periode : str
    +score_sante : int /100
    +resume : str
    +alertes : JSON
    +recommandations : JSON
    +statut : EN_ATTENTE|GENERE
  }
}

package "Suivi & Evaluations" {
  class Objectif {
    +titre : str
    +priorite : BAS|MOYEN|HAUT|CRITIQUE
    +statut : EN_COURS|ATTEINT|DEPASSE
    +progression : int %
  }
  class EvaluationPerformance {
    +note_competences : Decimal/5
    +note_objectifs : Decimal/5
    +note_comportement : Decimal/5
    +commentaire : str
  }
  class Notification {
    +type : CONGE|CONTRAT|OBJECTIF...
    +titre : str
    +message : str
    +lu : bool
    +created_at : datetime
  }
}

' Relations multiplicite
Entreprise "1" --o{ "n" User : emploie >
Entreprise "1" --o{ "n" Departement : structure >
Departement "1" --o{ "n" Poste : contient >
User }o-- "0..1" Departement : appartient a <
User }o-- "0..1" Poste : occupe <
User "1" --o{ "n" Contrat : possede >
User "1" --o{ "n" Pointage : enregistre >
User "1" --o{ "n" DemandeConge : soumet >
User "1" --o{ "n" SoldeConge : dispose >
TypeConge "1" --o{ "n" DemandeConge : categorise >
User "1" --o{ "n" BulletinPaie : recoit >
Entreprise "1" --o{ "n" RapportIAMensuel : genere >
User "1" --o{ "n" Objectif : poursuit >
EvaluationPerformance }o-- "1" User : evalue <
User "1" --o{ "n" Notification : recoit >

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 2. SEQUENCE — Authentification JWT
# ═══════════════════════════════════════════════════════════════════════════════
SEQ_AUTH = """
@startuml 02_sequence_auth_jwt
!theme plain
skinparam backgroundColor #FFFFFF
skinparam sequenceArrowColor #2E74B5
skinparam sequenceParticipantBackgroundColor #EBF3FB
skinparam sequenceParticipantBorderColor #2E74B5
skinparam noteBorderColor #FFC107
skinparam noteBackgroundColor #FFF9E6
skinparam shadowing false
title Sequence : Authentification JWT\\nSIRH Intelligent — ACERFI SARL

actor       "Utilisateur"    as U
participant "React Frontend" as F
participant "Django API"     as A
participant "SimpleJWT"      as J
database    "MySQL sirh_db"  as DB
participant "Zustand Store"  as Z

== Connexion ==
U  -> F : Saisie username + password
F  -> A : POST /api/auth/login/\\n{username, password}
activate A

A  -> DB : User.objects.get(username=...)
activate DB
DB -> A  : User object
deactivate DB

A  -> J  : authenticate(user)
activate J
J  -> A  : tokens {access (60min), refresh (7j)}
deactivate J

A  -> F  : 200 OK\\n{access_token, refresh_token, user: {id, role, ...}}
deactivate A

F  -> Z  : setUser(user) + setTokens()
note right of Z : Persistence\\nlocalStorage

== Requete authentifiee ==
F  -> A  : GET /api/accounts/me/\\nAuthorization: Bearer <access_token>
activate A
A  -> J  : verify_token(access_token)
activate J
J  -> A  : payload {user_id, exp}
deactivate J
A  -> DB : User.objects.get(id=user_id)
activate DB
DB -> A  : User
deactivate DB
A  -> F  : 200 profil utilisateur
deactivate A

== Renouvellement token expire ==
F  -> A  : POST /api/auth/refresh/\\n{refresh_token}
activate A
A  -> J  : verify_refresh(token)
activate J
J  -> A  : nouveau access_token
deactivate J
A  -> F  : 200 {access_token}
deactivate A
F  -> Z  : updateAccessToken()

== Deconnexion ==
U  -> F  : Clic Deconnexion
F  -> Z  : clearUser() + clearTokens()
F  -> F  : Redirect /login

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 3. SEQUENCE — Generation Rapport IA (Groq async)
# ═══════════════════════════════════════════════════════════════════════════════
SEQ_IA = """
@startuml 03_sequence_rapport_ia
!theme plain
skinparam backgroundColor #FFFFFF
skinparam sequenceArrowColor #7B2D8B
skinparam sequenceParticipantBackgroundColor #F5EEF8
skinparam sequenceParticipantBorderColor #7B2D8B
skinparam noteBorderColor #28A745
skinparam noteBackgroundColor #EAF7EE
skinparam shadowing false
title Sequence : Generation Rapport IA Mensuel (Async)\\nSIRH Intelligent — Groq LLaMA 3.3-70b

actor       "Responsable RH" as RH
participant "React Frontend"  as F
participant "Django API"      as A
participant "RapportIA View"  as V
database    "MySQL sirh_db"   as DB
participant "Thread daemon"   as T
participant "Groq API\\nLLaMA 3.3-70b" as G

== Declenchement ==
RH -> F : Clic "Generer un rapport"\\n(periode: 2026-05)
F  -> A : POST /api/rapport-ia/generer/\\n{periode: "2026-05"}
activate A
activate V

V  -> DB : Collecte indicateurs RH\\n(presences, conges, eval, paie...)
activate DB
DB -> V  : stats: {taux_presence: 91%,\\n  nb_absences: 8, score_eval: 4.0...}
deactivate DB

V  -> DB : RapportIA.get_or_create(periode="2026-05")
activate DB
DB -> V  : rapport (id=1, statut=EN_ATTENTE)
deactivate DB

V  -> T  : Thread(target=generer_async,\\n  args=(rapport_id, indicateurs),\\n  daemon=True).start()
note right of T : Non bloquant\\nRetourne immediatement

V  -> A  : reponse immediate
A  -> F  : 202 Accepted\\n{rapport_id: 1,\\n  statut: "EN_ATTENTE",\\n  message: "Generation en cours..."}
deactivate A
deactivate V

== Generation asynchrone (background) ==
activate T
T  -> G  : POST /chat/completions\\n{model: llama-3.3-70b-versatile,\\n  prompt: analyse RH + indicateurs,\\n  max_tokens: 1500}
activate G
note right of G : Temperature: 0.3\\nFormat JSON structure
G  -> T  : {score: 74, resume: "...",\\n  points_forts: [...],\\n  alertes: [...],\\n  recommandations: [...]}
deactivate G

T  -> DB : rapport.update(\\n  score_sante=74,\\n  resume="Le mois de mai...",\\n  alertes=[WARNING, INFO],\\n  statut=GENERE)
activate DB
DB -> T  : OK
deactivate DB
deactivate T

== Polling frontend ==
loop Toutes les 3 secondes
  F  -> A  : GET /api/rapport-ia/1/statut-generation/
  activate A
  A  -> DB : RapportIA.objects.get(id=1)
  activate DB
  DB -> A  : {statut: "GENERE", score: 74}
  deactivate DB
  A  -> F  : {statut: "GENERE", score: 74}
  deactivate A
end

F  -> RH : Affichage rapport\\n- Score 74/100 "Bon"\\n- 2 alertes\\n- 3 recommandations

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 4. SEQUENCE — Workflow Validation des Conges
# ═══════════════════════════════════════════════════════════════════════════════
SEQ_CONGES = """
@startuml 04_sequence_workflow_conges
!theme plain
skinparam backgroundColor #FFFFFF
skinparam sequenceArrowColor #28A745
skinparam sequenceParticipantBackgroundColor #EAF7EE
skinparam sequenceParticipantBorderColor #28A745
skinparam noteBorderColor #FFC107
skinparam noteBackgroundColor #FFF9E6
skinparam shadowing false
title Sequence : Workflow Validation des Conges\\nSIRH Intelligent — ACERFI SARL

actor "Employe"        as E
actor "Manager"        as M
actor "Responsable RH" as RH
participant "Frontend" as F
participant "API"      as A
database "MySQL"       as DB

== 1. Soumission de la demande ==
E  -> F  : Remplir formulaire conge\\n(type, date_debut, date_fin, motif)
F  -> A  : POST /api/conges/\\n{type_conge, date_debut, date_fin, motif}
activate A
A  -> DB : SoldeConge.objects.get(employe, type)
activate DB
DB -> A  : {solde_restant: 18 jours}
deactivate DB
A  -> A  : Verifier solde suffisant\\n(nb_jours <= solde_restant)
A  -> DB : DemandeConge.create(statut=EN_ATTENTE)
activate DB
DB -> A  : demande (id=42)
deactivate DB
A  -> DB : Notification.create(\\n  dest=Manager,\\n  type=CONGE,\\n  message="Demande de conge...")
activate DB
DB -> A  : ok
deactivate DB
A  -> F  : 201 {id: 42, statut: "EN_ATTENTE"}
deactivate A
F  -> E  : "Demande envoyee au Manager"

== 2. Validation par le Manager ==
note over M : Cloche notification\\nbadge rouge (1)
M  -> F  : Consulter /manager/conges
F  -> A  : GET /api/conges/?statut=EN_ATTENTE
activate A
A  -> DB : DemandeConge.filter(statut=EN_ATTENTE)
DB -> A  : [demande #42]
A  -> F  : [{id:42, employe:"Alice", jours:5}]
deactivate A

M  -> F  : Clic "Approuver"
F  -> A  : PATCH /api/conges/42/approuver/
activate A
A  -> DB : demande.update(\\n  statut=APPROUVE,\\n  valideur_manager=manager,\\n  date_validation_manager=now)
activate DB
DB -> A  : ok
deactivate DB
A  -> DB : Notification.create(dest=Employe, "Conge approuve par Manager")
A  -> DB : Notification.create(dest=RH, "Conge a valider")
deactivate A

== 3. Validation finale RH ==
RH -> F  : Consulter les conges
RH -> F  : Valider definitivement
F  -> A  : PATCH /api/conges/42/valider-rh/
activate A
A  -> DB : demande.update(statut=APPROUVE_RH)
A  -> DB : SoldeConge.update(\\n  solde_pris += 5,\\n  solde_restant -= 5)
activate DB
DB -> A  : ok
deactivate DB
A  -> DB : Notification.create(dest=Employe,\\n  "Conge definitvement valide")
A  -> F  : 200 {statut: "APPROUVE"}
deactivate A

F  -> E  : Notification "Votre conge est approuve !"

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 5. CAS D'UTILISATION — Employe
# ═══════════════════════════════════════════════════════════════════════════════
UC_EMPLOYE = """
@startuml 05_usecase_employe
!theme plain
skinparam backgroundColor #FFFFFF
skinparam usecaseBackgroundColor #EBF3FB
skinparam usecaseBorderColor #2E74B5
skinparam actorBackgroundColor #FFFFFF
skinparam actorBorderColor #2E74B5
skinparam arrowColor #2E74B5
skinparam packageBackgroundColor #F7FBFF
skinparam packageBorderColor #BCD6F0
skinparam shadowing false
title Diagramme de Cas d'Utilisation\\nActeur : Employe — SIRH Intelligent

left to right direction

actor "Employe" as E #EBF3FB

rectangle "Espace Employe — SIRH" {

  package "Tableau de bord" {
    usecase "Consulter son\\ntableau de bord" as UC1
    usecase "Voir ses KPI\\n(presences, conges...)" as UC2
  }

  package "Presences & Pointage" {
    usecase "Pointer son arrivee" as UC3
    usecase "Pointer son depart" as UC4
    usecase "Consulter son\\nhistorique de pointage" as UC5
  }

  package "Conges & Absences" {
    usecase "Demander un conge" as UC6
    usecase "Consulter ses\\ndemandes de conge" as UC7
    usecase "Voir son solde\\nde conges" as UC8
  }

  package "Rapports Hebdomadaires" {
    usecase "Rediger un rapport\\nhebdomadaire" as UC9
    usecase "Soumettre un rapport\\n(-> analyse IA auto)" as UC10
    usecase "Consulter ses rapports\\net analyses IA" as UC11
  }

  package "Paie & Documents" {
    usecase "Consulter ses\\nbulletins de paie" as UC12
    usecase "Telecharger un\\nbulletin (PDF)" as UC13
    usecase "Consulter ses\\ndocuments RH" as UC14
  }

  package "Profil & Objectifs" {
    usecase "Modifier son profil" as UC15
    usecase "Consulter ses objectifs" as UC16
    usecase "Voir ses evaluations\\nde performance" as UC17
  }

  package "Ressources" {
    usecase "Consulter l'annuaire" as UC18
    usecase "Recevoir des\\nnotifications" as UC19
    usecase "Consulter les formations" as UC20
  }
}

E --> UC1
E --> UC3
E --> UC4
E --> UC5
E --> UC6
E --> UC9
E --> UC12
E --> UC13
E --> UC15
E --> UC18
E --> UC19
E --> UC20

UC1 ..> UC2 : <<include>>
UC6 ..> UC8 : <<include>>
UC10 ..> UC11 : <<extend>>
UC12 ..> UC13 : <<extend>>

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 6. CAS D'UTILISATION — Manager
# ═══════════════════════════════════════════════════════════════════════════════
UC_MANAGER = """
@startuml 06_usecase_manager
!theme plain
skinparam backgroundColor #FFFFFF
skinparam usecaseBackgroundColor #EAF7EE
skinparam usecaseBorderColor #28A745
skinparam actorBackgroundColor #FFFFFF
skinparam actorBorderColor #28A745
skinparam arrowColor #28A745
skinparam packageBackgroundColor #F5FCF6
skinparam packageBorderColor #A9DFBF
skinparam shadowing false
title Diagramme de Cas d'Utilisation\\nActeur : Manager — SIRH Intelligent

left to right direction

actor "Manager\\n/ Encadreur" as M #EAF7EE

rectangle "Espace Manager — SIRH" {

  package "Tableau de bord" {
    usecase "Consulter son\\ntableau de bord" as UC1
    usecase "Voir alertes IA\\nde son equipe" as UC2
  }

  package "Gestion Equipe" {
    usecase "Consulter la\\nliste de son equipe" as UC3
    usecase "Voir les presences\\nde l'equipe" as UC4
    usecase "Exporter rapport\\npresences (CSV)" as UC5
  }

  package "Validation Conges" {
    usecase "Consulter les\\ndemandes de conge" as UC6
    usecase "Approuver un conge" as UC7
    usecase "Refuser un conge\\n(avec motif)" as UC8
  }

  package "Rapports a Valider" {
    usecase "Consulter les rapports\\nsoumis par son equipe" as UC9
    usecase "Valider un rapport\\nhebdomadaire" as UC10
    usecase "Rejeter un rapport\\n(avec commentaire)" as UC11
    usecase "Lire l'analyse IA\\ndu rapport" as UC12
  }

  package "Objectifs Equipe" {
    usecase "Definir des objectifs\\npour son equipe" as UC13
    usecase "Suivre la progression\\ndes objectifs" as UC14
  }

  package "Formations" {
    usecase "Consulter les formations\\nde l'equipe" as UC15
  }

  package "Ressources" {
    usecase "Consulter l'annuaire" as UC16
    usecase "Recevoir des\\nnotifications" as UC17
  }
}

M --> UC1
M --> UC3
M --> UC4
M --> UC6
M --> UC7
M --> UC8
M --> UC9
M --> UC10
M --> UC11
M --> UC13
M --> UC14
M --> UC15
M --> UC16
M --> UC17

UC1 ..> UC2 : <<include>>
UC4 ..> UC5 : <<extend>>
UC9 ..> UC12 : <<include>>
UC7 ..> UC6 : <<include>>

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 7. CAS D'UTILISATION — Responsable RH
# ═══════════════════════════════════════════════════════════════════════════════
UC_RH = """
@startuml 07_usecase_rh
!theme plain
skinparam backgroundColor #FFFFFF
skinparam usecaseBackgroundColor #FDEDEC
skinparam usecaseBorderColor #DC3545
skinparam actorBackgroundColor #FFFFFF
skinparam actorBorderColor #DC3545
skinparam arrowColor #DC3545
skinparam packageBackgroundColor #FFF5F5
skinparam packageBorderColor #F5B7B1
skinparam shadowing false
title Diagramme de Cas d'Utilisation\\nActeur : Responsable RH — SIRH Intelligent

left to right direction

actor "Responsable RH\\n(Admin)" as RH #FDEDEC

rectangle "Espace RH — SIRH" {

  package "Tableau de bord & IA" {
    usecase "Consulter le dashboard\\nRH (statistiques)" as UC1
    usecase "Voir les analyses IA\\npar filiere" as UC2
    usecase "Consulter les alertes\\nRH automatiques" as UC3
    usecase "Generer un rapport IA\\nmensuel (Groq)" as UC4
    usecase "Voir le score de\\nsante RH /100" as UC5
  }

  package "Gestion Employes" {
    usecase "Gerer les departements\\net postes" as UC6
    usecase "Gerer les contrats\\n(CDI/CDD/Stage)" as UC7
    usecase "Suivre les alertes\\nd'expiration contrat" as UC8
    usecase "Gerer les sanctions\\ndisciplinaires" as UC9
  }

  package "Presences & Conges" {
    usecase "Superviser les presences\\n(rapport mensuel)" as UC10
    usecase "Valider les demandes\\nde conge (final)" as UC11
    usecase "Gerer les types\\nde conge" as UC12
  }

  package "Paie Camerounaise" {
    usecase "Generer les bulletins\\nde paie (CNPS+IRPP)" as UC13
    usecase "Valider et cloturer\\nla paie mensuelle" as UC14
    usecase "Consulter la masse\\nsalariale (graphique)" as UC15
  }

  package "Recrutements" {
    usecase "Publier une offre\\nd'emploi" as UC16
    usecase "Gerer le pipeline\\ndes candidatures" as UC17
    usecase "Planifier un entretien" as UC18
  }

  package "Formations & RH" {
    usecase "Creer une formation" as UC19
    usecase "Evaluer les performances\\n(notation /5)" as UC20
    usecase "Gerer les documents\\nRH" as UC21
  }

  package "Parametres" {
    usecase "Configurer l'entreprise\\n(logo, couleurs)" as UC22
    usecase "Gerer les utilisateurs\\n(roles, droits)" as UC23
  }
}

RH --> UC1
RH --> UC2
RH --> UC3
RH --> UC4
RH --> UC6
RH --> UC7
RH --> UC9
RH --> UC10
RH --> UC11
RH --> UC13
RH --> UC14
RH --> UC16
RH --> UC17
RH --> UC19
RH --> UC20
RH --> UC21
RH --> UC22
RH --> UC23

UC4  ..> UC5  : <<include>>
UC7  ..> UC8  : <<extend>>
UC13 ..> UC15 : <<extend>>
UC16 ..> UC17 : <<include>>

@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════════
# Generation
# ═══════════════════════════════════════════════════════════════════════════════
DIAGRAMS = [
    ("01_classes_sirh.png",                CLASSES),
    ("02_sequence_auth_jwt.png",           SEQ_AUTH),
    ("03_sequence_rapport_ia.png",         SEQ_IA),
    ("04_sequence_workflow_conges.png",    SEQ_CONGES),
    ("05_usecase_employe.png",             UC_EMPLOYE),
    ("06_usecase_manager.png",             UC_MANAGER),
    ("07_usecase_rh.png",                  UC_RH),
]

if __name__ == "__main__":
    print("=" * 55)
    print("  SIRH — Generation des diagrammes UML")
    print("  Serveur : plantuml.com")
    print("=" * 55)
    for name, content in DIAGRAMS:
        png(name, content.strip())
    print("=" * 55)
    print(f"  Sortie : {OUTPUT}")
    print("=" * 55)
