from django.db.models.signals import post_save
from django.dispatch import receiver
from billing.models import CompanyPlanAllocation
from display.provisioning import provision_displays_for_branch

@receiver(post_save, sender=CompanyPlanAllocation)
def on_display_allocation_save(sender, instance, **kwargs):
    if instance.plan_component.key == "live_display_screens":
        if instance.branch:
            try:
                provision_displays_for_branch(instance.branch)
            except Exception as e:
                print(f"Failed to auto-provision display terminals on allocation save: {e}")
        else:
            # Company-wide allocation updated: provision for all company branches
            from branches.models import Branch
            for branch in Branch.objects.filter(company=instance.company):
                try:
                    provision_displays_for_branch(branch)
                except Exception as e:
                    print(f"Failed to auto-provision display terminals for branch {branch.id}: {e}")
