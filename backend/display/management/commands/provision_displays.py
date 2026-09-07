from django.core.management.base import BaseCommand
from branches.models import Branch
from display.provisioning import provision_displays_for_branch

class Command(BaseCommand):
    help = "Provisions display terminals for all active branches based on plan allocations or package limits."

    def handle(self, *args, **options):
        branches = Branch.objects.all()
        count = 0
        for branch in branches:
            provision_displays_for_branch(branch)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully provisioned display terminals for {count} branches."))
