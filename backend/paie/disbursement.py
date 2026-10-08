"""
Service Mobile Money - Notch Pay (agrégateur) + MTN MoMo + Orange Money
=======================================================================
Priorité de sélection :
  1. Notch Pay  — si NOTCHPAY_API_KEY est configuré (gère MTN + Orange)
  2. MTN directe — si MTN_MOMO_SUBSCRIPTION_KEY etc. sont configurés
  3. Orange directe — si ORANGE_MONEY_CLIENT_ID etc. sont configurés
  4. Mode DEMO — simulation réaliste si aucune clé n'est présente

Notch Pay : https://business.notchpay.co / https://developer.notchpay.co
MTN MoMo  : https://momodeveloper.mtn.com
Orange    : https://developer.orange.com
"""
from __future__ import annotations

import base64
import logging
import time
import uuid
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Timeouts HTTP ─────────────────────────────────────────────────────────────
HTTP_TIMEOUT = 30  # secondes

# ── Simulation démo : délai avant passage SUCCES ─────────────────────────────
DEMO_DELAY_SUCCES_SECONDES = 8


# ─────────────────────────────────────────────────────────────────────────────
# Client MTN Mobile Money (Disbursement API)
# ─────────────────────────────────────────────────────────────────────────────

class MTNMoMoClient:
    """
    Implémente le flux Disbursement de l'API MTN MoMo.
    Docs : https://momodeveloper.mtn.com/docs/services/disbursement
    """

    def __init__(self):
        self.subscription_key = getattr(settings, "MTN_MOMO_SUBSCRIPTION_KEY", "")
        self.api_user         = getattr(settings, "MTN_MOMO_API_USER", "")
        self.api_key          = getattr(settings, "MTN_MOMO_API_KEY", "")
        self.environment      = getattr(settings, "MTN_MOMO_ENVIRONMENT", "sandbox")
        self.base_url         = getattr(settings, "MTN_MOMO_BASE_URL",
                                        "https://sandbox.momodeveloper.mtn.com")
        # Cache du token OAuth
        self._token        : str   = ""
        self._token_expiry : float = 0.0

    def is_configured(self) -> bool:
        return bool(self.subscription_key and self.api_user and self.api_key)

    # ── Auth ─────────────────────────────────────────────────────────────────

    def _get_token(self) -> str:
        if self._token and time.time() < self._token_expiry - 60:
            return self._token

        creds = base64.b64encode(f"{self.api_user}:{self.api_key}".encode()).decode()
        resp = requests.post(
            f"{self.base_url}/disbursement/token/",
            headers={
                "Authorization": f"Basic {creds}",
                "Ocp-Apim-Subscription-Key": self.subscription_key,
            },
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token        = data["access_token"]
        self._token_expiry = time.time() + int(data.get("expires_in", 3600))
        return self._token

    # ── Disbursement ─────────────────────────────────────────────────────────

    def transfer(self, amount: int, phone: str, reference_id: str,
                 note: str = "Virement salarial") -> dict:
        """
        Initie un virement vers le numéro mobile.
        Retourne {"statut": "EN_COURS", "transaction_id": reference_id}.
        Lève requests.HTTPError en cas d'échec réseau/API.
        """
        # En sandbox, MTN exige la devise EUR (prod → XAF)
        currency = "EUR" if self.environment == "sandbox" else "XAF"
        # En sandbox, montant symbolique pour ne pas dépasser les limites test
        amount_str = str(1 if self.environment == "sandbox" else amount)

        token = self._get_token()
        resp = requests.post(
            f"{self.base_url}/disbursement/v1_0/transfer",
            json={
                "amount": amount_str,
                "currency": currency,
                "externalId": reference_id,
                "payee": {"partyIdType": "MSISDN", "partyId": phone.lstrip("+")},
                "payerMessage": note[:160],
                "payeeNote":    note[:160],
            },
            headers={
                "Authorization":             f"Bearer {token}",
                "X-Reference-Id":            reference_id,
                "X-Target-Environment":      self.environment,
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "Content-Type":              "application/json",
            },
            timeout=HTTP_TIMEOUT,
        )
        # 202 Accepted = transfer initié (traitement asynchrone)
        if resp.status_code == 202:
            logger.info("MTN MoMo transfer initié — ref=%s", reference_id)
            return {"statut": "EN_COURS", "transaction_id": reference_id}
        resp.raise_for_status()
        return {"statut": "EN_COURS", "transaction_id": reference_id}

    def get_status(self, reference_id: str) -> dict:
        """
        Vérifie le statut d'un virement.
        Retourne {"statut": "SUCCES"|"ECHEC"|"EN_COURS", "transaction_id": ..., "message": ...}
        """
        token = self._get_token()
        resp = requests.get(
            f"{self.base_url}/disbursement/v1_0/transfer/{reference_id}",
            headers={
                "Authorization":             f"Bearer {token}",
                "X-Target-Environment":      self.environment,
                "Ocp-Apim-Subscription-Key": self.subscription_key,
            },
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        mtn_to_statut = {
            "SUCCESSFUL": "SUCCES",
            "FAILED":     "ECHEC",
            "PENDING":    "EN_COURS",
        }
        statut = mtn_to_statut.get(data.get("status", ""), "EN_COURS")
        return {
            "statut":         statut,
            "transaction_id": data.get("financialTransactionId", reference_id),
            "message":        data.get("reason", ""),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Client Orange Money (Business Cashout API)
# ─────────────────────────────────────────────────────────────────────────────

class OrangeMoneyClient:
    """
    Implémente le flux Orange Money Business API (Cameroun).
    Docs : https://developer.orange.com/apis/orange-money-cameroon
    """

    def __init__(self):
        self.client_id     = getattr(settings, "ORANGE_MONEY_CLIENT_ID",     "")
        self.client_secret = getattr(settings, "ORANGE_MONEY_CLIENT_SECRET", "")
        self.merchant_key  = getattr(settings, "ORANGE_MONEY_MERCHANT_KEY",  "")
        self.base_url      = getattr(settings, "ORANGE_MONEY_BASE_URL",
                                     "https://api.orange.com")
        self._token        : str   = ""
        self._token_expiry : float = 0.0

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    # ── Auth ─────────────────────────────────────────────────────────────────

    def _get_token(self) -> str:
        if self._token and time.time() < self._token_expiry - 60:
            return self._token

        creds = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        resp = requests.post(
            f"{self.base_url}/oauth/v3/token",
            data={"grant_type": "client_credentials"},
            headers={
                "Authorization": f"Basic {creds}",
                "Content-Type":  "application/x-www-form-urlencoded",
                "Accept":        "application/json",
            },
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token        = data["access_token"]
        self._token_expiry = time.time() + int(data.get("expires_in", 3600))
        return self._token

    # ── Cashout (B2C) ────────────────────────────────────────────────────────

    def transfer(self, amount: int, phone: str, reference_id: str,
                 note: str = "Virement salarial") -> dict:
        """
        Initie un virement Orange Money (B2C cashout).
        Retourne {"statut": "EN_COURS", "transaction_id": ...}
        """
        token = self._get_token()
        # Normalisation numéro
        msisdn = phone.lstrip("+")
        if not msisdn.startswith("237"):
            msisdn = "237" + msisdn

        resp = requests.post(
            f"{self.base_url}/orange-money-webpay/cm/v1/cashin",
            json={
                "merchant_key":  self.merchant_key,
                "currency":      "XAF",
                "order_id":      reference_id,
                "amount":        str(amount),
                "return_url":    "https://acerfi-sarl.cm/paie/confirm",
                "cancel_url":    "https://acerfi-sarl.cm/paie/cancel",
                "notif_url":     "https://acerfi-sarl.cm/api/paie/virements/webhook/",
                "lang":          "fr",
                "reference":     note[:50],
                "phone_number":  msisdn,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
                "Accept":        "application/json",
            },
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info("Orange Money transfer initié — ref=%s", reference_id)
        return {
            "statut":         "EN_COURS",
            "transaction_id": data.get("pay_token", reference_id),
        }

    def get_status(self, reference_id: str, transaction_id: str = "") -> dict:
        """Vérifie le statut d'un virement Orange Money."""
        token = self._get_token()
        resp = requests.get(
            f"{self.base_url}/orange-money-webpay/cm/v1/paymentstatus/{transaction_id or reference_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept":        "application/json",
            },
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        statut_map = {
            "SUCCESS":  "SUCCES",
            "FAILED":   "ECHEC",
            "PENDING":  "EN_COURS",
            "EXPIRED":  "ECHEC",
            "CANCELED": "ANNULE",
        }
        statut = statut_map.get(data.get("status", "").upper(), "EN_COURS")
        return {
            "statut":         statut,
            "transaction_id": data.get("txnid", transaction_id),
            "message":        data.get("message", ""),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Client Notch Pay (agrégateur MTN + Orange — recommandé)
# ─────────────────────────────────────────────────────────────────────────────

class NotchPayClient:
    """
    Notch Pay Business API — transfère vers MTN MoMo et Orange Money
    via un seul endpoint unifié.
    Docs : https://developer.notchpay.co
    """

    # Correspondance statuts Notch Pay → statuts internes
    _STATUT_MAP = {
        "complete":   "SUCCES",
        "success":    "SUCCES",
        "successful": "SUCCES",
        "failed":     "ECHEC",
        "canceled":   "ANNULE",
        "cancelled":  "ANNULE",
        "pending":    "EN_COURS",
        "processing": "EN_COURS",
        "initiated":  "EN_COURS",
    }

    def __init__(self):
        self.api_key  = getattr(settings, "NOTCHPAY_API_KEY",  "")
        self.base_url = getattr(settings, "NOTCHPAY_BASE_URL", "https://api.notchpay.co")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict:
        return {
            "Authorization": self.api_key,
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        }

    def _normaliser_phone(self, phone: str) -> str:
        """Formate le numéro au format international +237XXXXXXXXX."""
        digits = phone.strip().replace(" ", "").replace("-", "")
        if not digits.startswith("+"):
            if digits.startswith("237"):
                digits = "+" + digits
            else:
                digits = "+237" + digits.lstrip("0")
        return digits

    def transfer(self, amount: int, phone: str, reference_id: str,
                 note: str = "Virement salarial") -> dict:
        """
        Initie un transfert via Notch Pay.
        Retourne {"statut": "EN_COURS", "transaction_id": "..."}.
        """
        resp = requests.post(
            f"{self.base_url}/transfers",
            json={
                "amount":      amount,
                "currency":    "XAF",
                "to":          self._normaliser_phone(phone),
                "description": note[:200],
                "reference":   reference_id,
            },
            headers=self._headers(),
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        tx = data.get("transaction", {})
        statut_raw = str(tx.get("status", "pending")).lower()
        statut = self._STATUT_MAP.get(statut_raw, "EN_COURS")
        txid   = tx.get("reference") or tx.get("id") or reference_id

        logger.info("Notch Pay transfer initié — ref=%s statut=%s", reference_id, statut)
        return {"statut": statut, "transaction_id": txid}

    def get_status(self, reference_id: str) -> dict:
        """Vérifie le statut d'un transfert Notch Pay."""
        resp = requests.get(
            f"{self.base_url}/transfers/{reference_id}",
            headers=self._headers(),
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        tx = data.get("transaction", data)
        statut_raw = str(tx.get("status", "pending")).lower()
        statut = self._STATUT_MAP.get(statut_raw, "EN_COURS")
        txid   = tx.get("reference") or tx.get("id") or reference_id

        return {
            "statut":         statut,
            "transaction_id": txid,
            "message":        tx.get("message") or data.get("message", ""),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Service principal — auto-sélection + mode démo
# ─────────────────────────────────────────────────────────────────────────────

_notchpay_client: NotchPayClient    | None = None
_mtn_client:      MTNMoMoClient     | None = None
_orange_client:   OrangeMoneyClient | None = None


def _get_notchpay() -> NotchPayClient:
    global _notchpay_client
    if _notchpay_client is None:
        _notchpay_client = NotchPayClient()
    return _notchpay_client


def _get_mtn() -> MTNMoMoClient:
    global _mtn_client
    if _mtn_client is None:
        _mtn_client = MTNMoMoClient()
    return _mtn_client


def _get_orange() -> OrangeMoneyClient:
    global _orange_client
    if _orange_client is None:
        _orange_client = OrangeMoneyClient()
    return _orange_client


def _demo_transfer(reference_id: str) -> dict:
    """Simule un virement en mode démo (sans API réelle)."""
    logger.info("DEMO MODE — virement simulé ref=%s", reference_id)
    return {"statut": "EN_COURS", "transaction_id": f"DEMO-{reference_id[:8]}"}


def _demo_status(virement) -> dict:
    """Simule le statut d'un virement démo. Passe à SUCCES après le délai."""
    elapsed = (timezone.now() - virement.created_at).total_seconds()
    if elapsed >= DEMO_DELAY_SUCCES_SECONDES:
        return {
            "statut":         "SUCCES",
            "transaction_id": virement.transaction_id or f"DEMO-{str(virement.reference_id)[:8]}",
            "message":        "Virement simulé avec succès (mode démo)",
        }
    return {
        "statut":         "EN_COURS",
        "transaction_id": virement.transaction_id,
        "message":        f"Traitement en cours... ({int(elapsed)}s / {DEMO_DELAY_SUCCES_SECONDES}s)",
    }


# ── API publique ──────────────────────────────────────────────────────────────

def initier_virement(operateur: str, numero_mobile: str, montant: int,
                     reference_id: str, motif: str = "Virement salarial") -> dict:
    """
    Initie un virement mobile money.

    Sélection automatique :
      1. Notch Pay si NOTCHPAY_API_KEY configuré (gère MTN + Orange)
      2. Client direct MTN ou Orange selon l'opérateur
      3. Mode démo si aucune clé

    Args:
        operateur     : "MTN" ou "ORANGE"
        numero_mobile : numéro camerounais (ex: 655123456 ou +237655123456)
        montant       : montant en FCFA
        reference_id  : UUID unique (idempotence)
        motif         : libellé du virement

    Returns:
        dict: statut, transaction_id, mode_demo, fournisseur
    """
    # ── 1. Notch Pay (prioritaire) ────────────────────────────────────────────
    np_client = _get_notchpay()
    if np_client.is_configured():
        try:
            result = np_client.transfer(montant, numero_mobile, reference_id, motif)
            result["mode_demo"]  = False
            result["fournisseur"] = "NOTCHPAY"
            return result
        except Exception as exc:
            logger.warning("Notch Pay transfer échoué, fallback → %s direct. Erreur: %s",
                           operateur, exc)

    # ── 2. APIs directes ──────────────────────────────────────────────────────
    if operateur == "MTN":
        client = _get_mtn()
        if client.is_configured():
            result = client.transfer(montant, numero_mobile, reference_id, motif)
            result["mode_demo"]   = False
            result["fournisseur"] = "MTN_DIRECT"
            return result
    elif operateur == "ORANGE":
        client = _get_orange()
        if client.is_configured():
            result = client.transfer(montant, numero_mobile, reference_id, motif)
            result["mode_demo"]   = False
            result["fournisseur"] = "ORANGE_DIRECT"
            return result

    # ── 3. Mode démo ─────────────────────────────────────────────────────────
    result = _demo_transfer(reference_id)
    result["mode_demo"]   = True
    result["fournisseur"] = "DEMO"
    return result


def rafraichir_statut(virement) -> dict:
    """
    Rafraîchit le statut d'un VirementMobile.

    Args:
        virement : instance de VirementMobile

    Returns:
        dict: statut, transaction_id, message
    """
    if virement.mode_demo:
        return _demo_status(virement)

    ref  = str(virement.reference_id)
    txid = virement.transaction_id or ref

    # ── Notch Pay (prioritaire) ───────────────────────────────────────────────
    np_client = _get_notchpay()
    if np_client.is_configured():
        try:
            return np_client.get_status(ref)
        except Exception as exc:
            logger.warning("Notch Pay get_status échoué, fallback direct. Erreur: %s", exc)

    # ── APIs directes ─────────────────────────────────────────────────────────
    if virement.operateur == "MTN":
        client = _get_mtn()
        if client.is_configured():
            return client.get_status(ref)
    elif virement.operateur == "ORANGE":
        client = _get_orange()
        if client.is_configured():
            return client.get_status(ref, txid)

    return _demo_status(virement)
