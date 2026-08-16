import math

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from customers.models import Customer
from mlmodels import data_prep


BATCH_SIZE = 2000


class Command(BaseCommand):
    help = "Loads CIBLE_STAGE_JUN_2026_LV.csv, cleans it via data_prep, and populates the Customer table."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path", default=str(settings.RAW_DATASET_PATH), help="Path to the raw CSV export."
        )

    def handle(self, *args, **options):
        path = options["path"]
        self.stdout.write(f"Loading raw dataset from {path} ...")

        df_raw = data_prep.load_raw(path)
        df = data_prep.build_pipeline_features(df_raw, has_target=True)
        num_cols, cat_cols = data_prep.get_feature_columns(df)
        feature_cols = num_cols + cat_cols

        self.stdout.write(f"{len(df):,} rows, {len(feature_cols)} model features.")

        self.stdout.write("Clearing existing Customer rows ...")
        Customer.objects.all().delete()

        objects = []
        for _, row in df.iterrows():
            features = {c: row[c] for c in feature_cols}
            # JSON can't hold numpy/NaN types -- normalize to plain python.
            for k, v in features.items():
                if isinstance(v, float) and math.isnan(v):
                    features[k] = 0.0
                elif hasattr(v, "item"):
                    features[k] = v.item()

            objects.append(
                Customer(
                    code_contrat=row[data_prep.ID_COL],
                    statut=row["STATUT"],
                    statut_rgs90=row["STATUT_RGS90"],
                    offre=row["OFFRE"],
                    region=row["REGION"],
                    handset=row["HANDSET"],
                    canal_de_vente=row["Canal_De_Vente"],
                    anc_m=int(row["ANC_M"]),
                    arpu=float(row["ARPU"]),
                    mnt_forfait=float(row["MNT_FORFAIT"]),
                    mnt_forfait_data=float(row["MNT_FORFAIT_DATA"]),
                    volume_4g=float(row["VOLUME_4G"]),
                    volume_3g=float(row["VOLUME_3G"]),
                    volume_2g=float(row["VOLUME_2G"]),
                    evaporation=float(row["Evaporation"]),
                    is_data_user_now=bool(row["is_data_user_now"]),
                    target_next_month=float(row[data_prep.TARGET_COL]),
                    will_activate=bool(row[data_prep.CLASSIFICATION_TARGET_COL]),
                    features=features,
                )
            )

        self.stdout.write(f"Bulk inserting {len(objects):,} customers ...")
        with transaction.atomic():
            for i in range(0, len(objects), BATCH_SIZE):
                Customer.objects.bulk_create(objects[i : i + BATCH_SIZE])
                self.stdout.write(f"  ... {min(i + BATCH_SIZE, len(objects)):,} / {len(objects):,}")

        self.stdout.write(self.style.SUCCESS(f"Loaded {Customer.objects.count():,} customers."))
