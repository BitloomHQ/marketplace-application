from django.core.management.base import BaseCommand
from adminpanel.models import ServiceCategory


class Command(BaseCommand):
    help = "Seed default marketplace services"

    def handle(self, *args, **kwargs):

        services = [
            {
                "name": "Gardener",
                "key": "gardener",
                "status": "active",
                "description": "Lawn mowing, garden cleaning, grass cutting and maintenance services.",
                "icon": "🌿",
                "start_date": "",
                "display_order": 1,
            },
            {
                "name": "Electrician",
                "key": "electrician",
                "status": "active",
                "description": "Wiring, switchboard repair, light fitting and electrical maintenance.",
                "icon": "⚡",
                "start_date": "",
                "display_order": 2,
            },
            {
                "name": "Plumber",
                "key": "plumber",
                "status": "active",
                "description": "Leak repair, tap repair, pipe fitting and bathroom plumbing services.",
                "icon": "🪠",
                "start_date": "",
                "display_order": 3,
            },
            {
                "name": "Carpenter",
                "key": "carpenter",
                "status": "coming_soon",
                "description": "Furniture repair, wood polishing, door fitting and custom woodwork services.",
                "icon": "🪚",
                "start_date": "Yet to start",
                "display_order": 4,
            },
            {
                "name": "Cleaner",
                "key": "cleaner",
                "status": "coming_soon",
                "description": "Home cleaning, deep cleaning, kitchen cleaning and bathroom cleaning.",
                "icon": "🧹",
                "start_date": "Yet to start",
                "display_order": 5,
            },
            {
                "name": "Painter",
                "key": "painter",
                "status": "coming_soon",
                "description": "Interior painting, exterior painting, wall texture and repainting services.",
                "icon": "🎨",
                "start_date": "Yet to start",
                "display_order": 6,
            },
            {
                "name": "AC Repair",
                "key": "ac_repair",
                "status": "coming_soon",
                "description": "AC servicing, gas refill, installation and cooling issue repair services.",
                "icon": "❄️",
                "start_date": "Yet to start",
                "display_order": 7,
            },
        ]

        for item in services:
            ServiceCategory.objects.update_or_create(
                key=item["key"],
                defaults=item
            )

        self.stdout.write(
            self.style.SUCCESS("Default services seeded successfully")
        )