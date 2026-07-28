from django.db import migrations
from django.utils import timezone


def seed_service_categories(apps, schema_editor):
    ServiceCategory = apps.get_model("services", "ServiceCategory")
    db_alias = schema_editor.connection.alias
    now = timezone.now()

    categories = [
        {
            "name": "Plumber",
            "key": "plumber",
            "description": (
                "Leak repair, tap repair, pipe fitting and "
                "bathroom plumbing services."
            ),
            "icon": "🪠",
            "status": "active",
            "start_date": None,
            "display_order": 1,
        },
        {
            "name": "Electrician",
            "key": "electrician",
            "description": (
                "Wiring, switch repair, fan installation "
                "and electrical fault fixing."
            ),
            "icon": "⚡",
            "status": "active",
            "start_date": None,
            "display_order": 2,
        },
        {
            "name": "Gardener",
            "key": "gardener",
            "description": (
                "Lawn mowing, hedge trimming, garden "
                "maintenance and landscaping."
            ),
            "icon": "🌿",
            "status": "active",
            "start_date": None,
            "display_order": 3,
        },
        {
            "name": "Carpenter",
            "key": "carpenter",
            "description": (
                "Furniture repair, wood polishing, door fitting "
                "and custom woodwork services."
            ),
            "icon": "🪚",
            "status": "coming_soon",
            "start_date": None,
            "display_order": 4,
        },
    ]

    table_name = ServiceCategory._meta.db_table

    with schema_editor.connection.cursor() as cursor:
        for category in categories:
            cursor.execute(
                f"""
                INSERT INTO {table_name}
                    (
                        name,
                        key,
                        description,
                        icon,
                        status,
                        start_date,
                        display_order,
                        created_at,
                        updated_at
                    )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (key)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    icon = EXCLUDED.icon,
                    status = EXCLUDED.status,
                    start_date = EXCLUDED.start_date,
                    display_order = EXCLUDED.display_order,
                    updated_at = EXCLUDED.updated_at
                """,
                [
                    category["name"],
                    category["key"],
                    category["description"],
                    category["icon"],
                    category["status"],
                    category["start_date"],
                    category["display_order"],
                    now,
                    now,
                ],
            )


def remove_seeded_service_categories(apps, schema_editor):
    ServiceCategory = apps.get_model("services", "ServiceCategory")

    ServiceCategory.objects.using(
        schema_editor.connection.alias
    ).filter(
        key__in=[
            "plumber",
            "electrician",
            "gardener",
            "carpenter",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            seed_service_categories,
            remove_seeded_service_categories,
        ),
    ]