from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_dynamic_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='status_note',
            field=models.TextField(blank=True, default=''),
        ),
    ]
