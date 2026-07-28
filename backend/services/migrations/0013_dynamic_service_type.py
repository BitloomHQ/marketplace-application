from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0012_providerportfolio'),
    ]

    operations = [
        migrations.AlterField(
            model_name='servicerequest',
            name='service_type',
            field=models.CharField(max_length=50),
        ),
    ]
