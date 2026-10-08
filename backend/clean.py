import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

old_usernames = ['stagiaire_it', 'stagiaire_isa', 'encadreur1', 'manager.it', 'Alice', 'admin']

for username in old_usernames:
    try:
        u = User.objects.get(username=username)
        u.is_active = False
        u.save()
        print(f"Désactivé : {username}")
    except User.DoesNotExist:
        print(f"Non trouvé : {username}")

print("Terminé.")