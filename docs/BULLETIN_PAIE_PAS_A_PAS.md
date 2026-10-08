# Bulletin de paie calculé pas à pas

Ce bulletin sert de **cas de référence** : chaque montant ci-dessous est vérifié
automatiquement par `backend/paie/tests.py` (classe `BulletinDeReferenceTests`).
Toute modification du calculateur (`backend/paie/calculateur.py`) qui changerait
un de ces chiffres fait échouer les tests.

```
python manage.py test paie
```

## Données de l'employé

| Élément | Montant (FCFA) |
|---|---:|
| Salaire catégoriel (salaire de base) | 300 000 |
| Ancienneté | 2 ans |
| Prime de responsabilité | 20 000 |
| Prime de transport (versée chaque mois) | 25 000 |

## 1. Salaires bruts et assiettes

| Ligne | Calcul | Montant |
|---|---|---:|
| Prime d'ancienneté | 4 % à 2 ans (+2 %/an ensuite ; 0 avant 2 ans) | 12 000 |
| **Brut taxable** (base IRPP, CFC, FNE, RAV) | 300 000 + 12 000 + 20 000 + 25 000 | **357 000** |
| **Assiette CNPS** | brut taxable − transport | **332 000** |
| **Total brut** | | **357 000** |

Traitement des indemnités (doctrine DGI, ordonnance CNPS n° 73/17, arrêté du 1er mars 1974) :

| Élément | IRPP, CFC, RAV | CNPS |
|---|---|---|
| Prime de transport permanente | imposable (complément de salaire) | exclue |
| Indemnité de logement en argent | imposable dans la limite de 15 % du salaire taxable | cotisable au réel |
| Indemnité de représentation (frais justifiés) | non imposable | exclue |
| Allocations familiales | non imposables | exclues |

## 2. Cotisations CNPS

Assiette 332 000. Pension et prestations familiales plafonnées à 750 000 FCFA/mois ;
accidents du travail sans plafond (décret n° 2016/072).

| Cotisation | Taux | Montant |
|---|---:|---:|
| Pension vieillesse — part salariale | 4,2 % | 13 944 |
| Pension vieillesse — part patronale | 4,2 % | 13 944 |
| Prestations familiales — patronale | 7 % | 23 240 |
| Accidents du travail — patronale (risque A) | 1,75 % | 5 810 |

## 3. IRPP et CAC

| Étape | Calcul | Montant |
|---|---|---:|
| Brut taxable | | 357 000 |
| Abattement frais professionnels | 357 000 × 30 % | − 107 100 |
| Cotisation CNPS salariale | | − 13 944 |
| Abattement forfaitaire | 500 000 / 12 | − 41 667 |
| **Salaire net catégoriel (SNC)** | | **194 289** |
| Tranche 1 (0 → 166 667) | 166 667 × 10 % | 16 666,7 |
| Tranche 2 (166 667 → 194 289) | 27 622 × 15 % | 4 143,3 |
| **IRPP** | | **20 810** |
| **CAC** (centimes additionnels communaux) | 20 810 × 10 % | **2 081** |

Barème mensuel = barème annuel / 12 : 2 000 000 → 166 667 ; 3 000 000 → 250 000 ;
5 000 000 → 416 667 ; au-delà 35 %.

## 4. CFC et FNE

Assiette : brut taxable **sans plafond** (contrairement à la CNPS).

| Contribution | Taux | Montant |
|---|---:|---:|
| Crédit Foncier — part salariale | 1 % | 3 570 |
| Crédit Foncier — part patronale | 1,5 % | 5 355 |
| Fonds National de l'Emploi — patronal | 1 % | 3 570 |

## 5. Taxes forfaitaires

| Taxe | Base | Tranche | Montant |
|---|---|---|---:|
| RAV (redevance audiovisuelle) | brut taxable 357 000 | 300 001 – 400 000 | 4 550 |
| TDL (taxe de développement local) | salaire de base 300 000 | 250 001 – 300 000 | 2 000 |

## 6. Net à payer

| Retenue salariale | Montant |
|---|---:|
| CNPS salariale | 13 944 |
| IRPP | 20 810 |
| CAC | 2 081 |
| CFC salariale | 3 570 |
| RAV | 4 550 |
| TDL | 2 000 |
| **Total retenues** | **46 955** |
| **Net à payer** (357 000 − 46 955) | **310 045** |

## 7. Coût total employeur

| Élément | Montant |
|---|---:|
| Total brut | 357 000 |
| CNPS patronale (13 944 + 23 240 + 5 810) | 42 994 |
| CFC patronale | 5 355 |
| FNE | 3 570 |
| **Coût total employeur** | **408 919** |

## Heures supplémentaires

Décret n° 95/677/PM du 18 décembre 1995 : au-delà de 40 h/semaine (art. 13), l'heure
est payée au taux horaire majoré de **20 %** (heures 1 à 8), **30 %** (9 à 16),
**40 %** (17 à 20, et heures sup. du dimanche), **50 %** (nuit, urgence) — art. 12.
Taux horaire = salaire / 173 h 1/3 (art. 14). Exemple : 300 000 / 173,33 = 1 730,77 ;
une heure à +20 % = 2 077 FCFA.

Non réglés par le décret (paramètres à faire valider) : cumul nuit + dimanche,
majoration des jours fériés (fixée par la convention collective).

## Loi de finances 2024 : mesures suspendues

La LF 2024 prévoyait de plafonner l'abattement de 30 % à 4 800 000 FCFA/an
(400 000/mois) et d'imposer intégralement les indemnités en argent représentant un
avantage en nature (logement). Par lettre du 12 janvier 2024, le ministre des Finances
a demandé de surseoir à ces dispositions ; aucune levée de la suspension n'a été
trouvée. Le calculateur les **désactive par défaut** et les active avec le réglage
`PAIE_APPLIQUER_LF2024=True` (fichier `.env`) — les deux régimes sont testés.

## Barèmes de référence

**RAV** (par mois, sur le brut taxable) : ≤ 50 000 : 0 · 50 001 – 100 000 : 750 ·
100 001 – 200 000 : 1 950 · 200 001 – 300 000 : 3 250 · 300 001 – 400 000 : 4 550 ·
400 001 – 500 000 : 5 850 · 500 001 – 600 000 : 7 150 · 600 001 – 700 000 : 8 450 ·
700 001 – 800 000 : 9 750 · 800 001 – 900 000 : 11 050 · 900 001 – 1 000 000 : 12 350 ·
> 1 000 000 : 13 000.

**TDL** (par mois, sur le salaire de base ; annuel entre parenthèses) : ≤ 62 000 : 0 ·
62 001 – 75 000 : 250 (3 000) · 75 001 – 100 000 : 500 (6 000) ·
100 001 – 125 000 : 750 (9 000) · 125 001 – 150 000 : 1 000 (12 000) ·
150 001 – 200 000 : 1 250 (15 000) · 200 001 – 250 000 : 1 500 (18 000) ·
250 001 – 300 000 : 2 000 (24 000) · 300 001 – 500 000 : 2 250 (27 000) ·
> 500 000 : 2 500 (30 000).

## Points à vérifier dans les textes officiels

- CGI 2024 (édition DGI, impots.cm), articles 31, 33 et 34 : texte en vigueur et
  application actuelle des mesures de la LF 2024.
- Arrêté du 1er mars 1974 : plafonds éventuels des frais exclus de l'assiette CNPS.
- Ordonnance n° 89/004 (annexe du CGI) : barème officiel de la RAV.

## Sources

- DGI — [IRPP : ce que vous devez savoir](https://impots.cm/fr/document/impot-sur-le-revenu-des-personnes-physiques-irpp-ce-que-vous-devez-savoir) (barème 10/15/25/35 %, abattement 30 %, cotisations CNPS déductibles, abattement 500 000, CAC 10 %, pas de retenue sous 62 000)
- MINFI — [Les autres retenues sur les salaires](https://minfi.gov.cm/les-autres-retenues-sur-les-salaires/) (CFC 1 % / 1,5 %, FNE 1 %)
- [Décret n° 95/677/PM](https://www.droitsocialenpratique.com/decret-n-95-677-pm-du-18-decembre-1995-relatif-aux-derogations-a-la-duree-legale-du-travail-au-cameroun/) (heures supplémentaires, art. 12 à 14)
- Loi de finances 2024 — [mesures sur les salaires](https://www.investiraucameroun.com/gestion-publique/0401-20158-loi-de-finances-2024-ces-mesures-fiscales-qui-vont-baisser-les-salaires-de-certains-travailleurs-au-cameroun) · [demande de suspension du patronat](https://www.investiraucameroun.com/gestion-publique/1201-20185-nouvelles-mesures-fiscales-sur-les-salaires-syndustricam-asac-cafcam-eurocham-et-ukcham-demandent-une-suspension)
- [Séminaire CADEV — Fiscalité de la paie](https://www.ohada.com/uploads/actualite/698/S%C3%A9minaire%20CADEV_Fiscalit%C3%A9%20de%20la%20Paie.pdf) (traitement des indemnités et avantages)
- [Barème TDL Cameroun](https://lefisk.cm/outils/bareme-tdl) · [Retenues salariales (barème RAV)](https://fiscafinance.com/tout-savoir-sur-les-retenues-salariales-appliquees-au-cameroun/)
