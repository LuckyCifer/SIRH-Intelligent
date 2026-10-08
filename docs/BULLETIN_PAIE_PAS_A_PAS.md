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
| Indemnité de transport (non imposable) | 25 000 |

## 1. Salaires bruts

| Ligne | Calcul | Montant |
|---|---|---:|
| Prime d'ancienneté | 4 % à 2 ans (+2 %/an ensuite ; 0 avant 2 ans) | 12 000 |
| **Salaire brut taxable (SBT)** | 300 000 + 12 000 + 20 000 | **332 000** |
| **Total brut** | 332 000 + 25 000 (transport) | **357 000** |

Les indemnités non imposables (transport, logement, représentation, allocations
familiales) entrent dans le total brut mais pas dans l'assiette des cotisations
ni de l'IRPP.

## 2. Cotisations CNPS

Assiette : SBT plafonné à 750 000 FCFA/mois → **332 000**.

| Cotisation | Taux | Montant |
|---|---:|---:|
| Pension vieillesse — part salariale | 4,2 % | 13 944 |
| Pension vieillesse — part patronale | 4,2 % | 13 944 |
| Prestations familiales — patronale | 7 % | 23 240 |
| Accidents du travail — patronale (risque A) | 1,75 % | 5 810 |

## 3. IRPP et CAC

| Étape | Calcul | Montant |
|---|---|---:|
| Abattement frais professionnels | 332 000 × 30 % (plafond 400 000/mois non atteint) | − 99 600 |
| Cotisation CNPS salariale | | − 13 944 |
| Abattement forfaitaire | 500 000 / 12 | − 41 667 |
| **Salaire net catégoriel (SNC)** | 332 000 − 99 600 − 13 944 − 41 667 | **176 789** |
| Tranche 1 (0 → 166 667) | 166 667 × 10 % | 16 666,7 |
| Tranche 2 (166 667 → 176 789) | 10 122 × 15 % | 1 518,3 |
| **IRPP** | | **18 185** |
| **CAC** (centimes additionnels communaux) | 18 185 × 10 % = 1 818,5 | **1 819** |

Barème mensuel = barème annuel / 12 : 2 000 000 → 166 667 ; 3 000 000 → 250 000 ;
5 000 000 → 416 667 ; au-delà 35 %.

## 4. CFC et FNE

Assiette : salaire brut taxable **sans plafond** (contrairement à la CNPS).

| Contribution | Taux | Montant |
|---|---:|---:|
| Crédit Foncier — part salariale | 1 % | 3 320 |
| Crédit Foncier — part patronale | 1,5 % | 4 980 |
| Fonds National de l'Emploi — patronal | 1 % | 3 320 |

## 5. Taxes forfaitaires

| Taxe | Base | Tranche | Montant |
|---|---|---|---:|
| RAV (redevance audiovisuelle) | total brut 357 000 | 300 001 – 400 000 | 4 550 |
| TDL (taxe de développement local) | salaire de base 300 000 | 250 001 – 300 000 | 2 000 |

## 6. Net à payer

| Retenue salariale | Montant |
|---|---:|
| CNPS salariale | 13 944 |
| IRPP | 18 185 |
| CAC | 1 819 |
| CFC salariale | 3 320 |
| RAV | 4 550 |
| TDL | 2 000 |
| **Total retenues** | **43 818** |
| **Net à payer** (357 000 − 43 818) | **313 182** |

## 7. Coût total employeur

| Élément | Montant |
|---|---:|
| Total brut | 357 000 |
| CNPS patronale (13 944 + 23 240 + 5 810) | 42 994 |
| CFC patronale | 4 980 |
| FNE | 3 320 |
| **Coût total employeur** | **408 294** |

## Barèmes de référence

**RAV** (par mois, sur le salaire brut) : ≤ 50 000 : 0 · 50 001 – 100 000 : 750 ·
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

## Sources

- DGI — [IRPP : ce que vous devez savoir](https://impots.cm/fr/document/impot-sur-le-revenu-des-personnes-physiques-irpp-ce-que-vous-devez-savoir) (barème 10/15/25/35 %, abattement 30 %, cotisations CNPS déductibles, abattement 500 000, CAC 10 %, pas de retenue sous 62 000)
- Loi de finances 2024 — [plafonnement de l'abattement à 4,8 M FCFA/an](https://www.investiraucameroun.com/gestion-publique/0401-20158-loi-de-finances-2024-ces-mesures-fiscales-qui-vont-baisser-les-salaires-de-certains-travailleurs-au-cameroun)

- MINFI — [Les autres retenues sur les salaires](https://minfi.gov.cm/les-autres-retenues-sur-les-salaires/) (CFC 1 % / 1,5 %, FNE 1 %, seuil IRPP 62 000)
- [Barème TDL Cameroun](https://lefisk.cm/outils/bareme-tdl) · [IRPP — barème](https://lefisk.cm/fiscalite/irpp)
- [Tout savoir sur les retenues salariales appliquées au Cameroun](https://fiscafinance.com/tout-savoir-sur-les-retenues-salariales-appliquees-au-cameroun/) (barème RAV)

Points encore à confirmer sur les textes officiels (non modifiés dans le calculateur) :
taux de majoration des heures supplémentaires, caractère imposable de l'indemnité
de logement versée en numéraire.
