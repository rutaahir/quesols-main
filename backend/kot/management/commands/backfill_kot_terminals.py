from django.core.management.base import BaseCommand
from branches.models import Branch
from kot.provisioning import provision_kot_terminals_for_branch

class Command(BaseCommand):
    help = "Backfills KotTerminal database records for existing branches based on plan allocations and preserves existing PINs"

    def handle(self, *args, **options):
        self.stdout.write("Starting KotTerminal backfill...")
        branches = Branch.objects.all()
        count = 0
        for branch in branches:
            try:
                provision_kot_terminals_for_branch(branch)
                count += 1
                self.stdout.write(f"Provisioned KotTerminals for branch: {branch.name} ({branch.company.name})")
            except Exception as e:
                self.stderr.write(f"Error provisioning KotTerminals for branch {branch.name}: {e}")
        
        self.stdout.write(f"KotTerminal backfill completed. Processed {count} branches.")
