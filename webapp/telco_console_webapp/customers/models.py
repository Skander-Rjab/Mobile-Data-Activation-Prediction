from django.db import models


class Customer(models.Model):
    """
    One row per customer, post data_prep cleaning + feature engineering.

    Indexed columns are the ones the Data Explorer filters/sorts on.
    `features` holds the *entire* cleaned feature vector (numeric +
    categorical) as JSON, so it can be fed straight back into either
    trained model pipeline for a live "re-predict this customer" call
    without needing 60 individual model fields.
    """

    code_contrat = models.CharField(max_length=32, unique=True, db_index=True)

    # Frequently filtered / displayed columns, promoted to real columns.
    statut = models.CharField(max_length=8, db_index=True)
    statut_rgs90 = models.CharField(max_length=8, db_index=True)
    offre = models.CharField(max_length=64, db_index=True)
    region = models.CharField(max_length=64, db_index=True)
    handset = models.CharField(max_length=8, db_index=True)
    canal_de_vente = models.CharField(max_length=32, db_index=True)

    anc_m = models.IntegerField()
    arpu = models.FloatField(db_index=True)
    mnt_forfait = models.FloatField()
    mnt_forfait_data = models.FloatField(db_index=True)
    volume_4g = models.FloatField()
    volume_3g = models.FloatField()
    volume_2g = models.FloatField()
    evaporation = models.FloatField()
    is_data_user_now = models.BooleanField(db_index=True)

    # Target
    target_next_month = models.FloatField(db_index=True)
    will_activate = models.BooleanField(db_index=True)

    # Full cleaned + engineered feature vector, ready for pipeline.predict()
    features = models.JSONField()

    class Meta:
        ordering = ['code_contrat']
        indexes = [
            models.Index(fields=['region', 'handset']),
            models.Index(fields=['will_activate', 'offre']),
        ]

    def __str__(self):
        return self.code_contrat
