from django.db import migrations


def seed_service_categories(apps, schema_editor):
    ServiceCategory = apps.get_model('services', 'ServiceCategory')
    defaults = [
        {
            'name': 'Plumber',
            'key': 'plumber',
            'description': 'Leak repair, tap repair, pipe fitting and bathroom plumbing services.',
            'icon': '🪠',
            'status': 'active',
            'start_date': '',
            'display_order': 1,
        },
        {
            'name': 'Electrician',
            'key': 'electrician',
            'description': 'Wiring, switch repair, fan installation and electrical fault fixing.',
            'icon': '⚡',
            'status': 'active',
            'start_date': '',
            'display_order': 2,
        },
        {
            'name': 'Gardener',
            'key': 'gardener',
            'description': 'Lawn mowing, hedge trimming, garden maintenance and landscaping.',
            'icon': '🌿',
            'status': 'active',
            'start_date': '',
            'display_order': 3,
        },
        {
            'name': 'Carpenter',
            'key': 'carpenter',
            'description': 'Furniture repair, wood polishing, door fitting and custom woodwork services.',
            'icon': '🪚',
            'status': 'coming_soon',
            'start_date': 'Yet to start',
            'display_order': 4,
        },
    ]
    for item in defaults:
        ServiceCategory.objects.get_or_create(key=item['key'], defaults=item)


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0010_servicecategory_alter_booking_status'),
    ]

    operations = [
        migrations.RunPython(seed_service_categories, migrations.RunPython.noop),
    ]
