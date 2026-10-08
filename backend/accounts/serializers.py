"""
Serializers — accounts
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer lecture profil utilisateur"""

    full_name       = serializers.SerializerMethodField()
    departement_nom = serializers.SerializerMethodField()
    anciennete_mois = serializers.ReadOnlyField()
    photo_url       = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "role", "filiere", "telephone", "photo",
            "photo_profil", "photo_url",
            "bio", "is_active", "date_joined", "last_login",
            "departement", "departement_nom", "poste",
            # identifiants légaux
            "numero_cnps", "numero_cni", "niu",
            # classification pro
            "categorie_pro", "echelon", "coefficient",
            "date_dernier_avancement", "prochain_avancement", "anciennete_mois",
            # situation familiale
            "situation_matrimoniale", "nb_enfants_a_charge", "nb_enfants_moins_6_ans",
            # état civil / coordonnées
            "nationalite", "date_naissance", "lieu_naissance",
            "adresse", "personne_contact_urgence", "contact_urgence_tel",
            # Mobile Money
            "numero_mobile", "operateur_mobile",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "anciennete_mois", "photo_url"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_departement_nom(self, obj):
        return obj.departement.nom if obj.departement else None

    def get_photo_url(self, obj):
        if not obj.photo_profil:
            return None
        try:
            request = self.context.get('request')
            url = obj.photo_profil.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None


class RegisterSerializer(serializers.ModelSerializer):
    """Création d'un nouveau compte"""

    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label="Confirmer le mot de passe")

    class Meta:
        model = User
        fields = [
            "username", "email", "first_name", "last_name",
            "password", "password2", "role", "filiere", "telephone",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Changement de mot de passe"""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas."})
        return attrs


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Mise à jour du profil"""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "telephone", "photo", "bio", "filiere"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Création d'un compte par le RH"""

    password         = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, label="Confirmer le mot de passe")

    class Meta:
        model = User
        fields = [
            "username", "password", "confirm_password",
            "first_name", "last_name", "email", "role",
            "telephone", "bio", "departement", "poste",
            "numero_cnps", "numero_cni", "niu",
            "categorie_pro", "echelon", "coefficient",
            "date_dernier_avancement", "prochain_avancement",
            "situation_matrimoniale", "nb_enfants_a_charge", "nb_enfants_moins_6_ans",
            "nationalite", "date_naissance", "lieu_naissance",
            "adresse", "personne_contact_urgence", "contact_urgence_tel",
        ]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Un RH ne peut pas créer un compte ADMIN.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Modification d'un compte par le RH (sans mot de passe)"""

    class Meta:
        model = User
        fields = [
            "username", "first_name", "last_name", "email",
            "role", "telephone", "bio", "is_active",
            "departement", "poste",
            "numero_cnps", "numero_cni", "niu",
            "categorie_pro", "echelon", "coefficient",
            "date_dernier_avancement", "prochain_avancement",
            "situation_matrimoniale", "nb_enfants_a_charge", "nb_enfants_moins_6_ans",
            "nationalite", "date_naissance", "lieu_naissance",
            "adresse", "personne_contact_urgence", "contact_urgence_tel",
        ]

    def validate_username(self, value):
        if User.objects.filter(username=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Un RH ne peut pas attribuer le rôle ADMIN.")
        return value


class PasswordChangeByRHSerializer(serializers.Serializer):
    """Réinitialisation du mot de passe d'un autre utilisateur par le RH"""

    new_password     = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Les mots de passe ne correspondent pas."})
        return attrs
