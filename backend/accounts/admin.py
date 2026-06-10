from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display   = ["username", "email", "first_name", "last_name", "role", "filiere", "is_active"]
    list_filter    = ["role", "filiere", "is_active"]
    search_fields  = ["username", "email", "first_name", "last_name"]
    fieldsets      = UserAdmin.fieldsets + (
        ("Infos GSRIA", {"fields": ("role", "filiere", "telephone", "photo", "bio")}),
    )
