"""
build_analytics
----------------
Precomputes all the aggregates the Business Analysis and Reports pages
need, and stores them as JSON in AnalyticsSnapshot. Run this after
load_dataset (and again any time the underlying data changes).
"""

import pandas as pd
from django.core.management.base import BaseCommand

from analytics.models import AnalyticsSnapshot
from customers.models import Customer
from mlmodels import predictor


def _save(key, payload):
    AnalyticsSnapshot.objects.update_or_create(key=key, defaults={"payload": payload})


class Command(BaseCommand):
    help = "Precomputes business-analysis aggregates from the Customer table."

    def handle(self, *args, **options):
        qs = Customer.objects.all().values(
            "region", "handset", "offre", "statut", "statut_rgs90", "canal_de_vente",
            "anc_m", "arpu", "mnt_forfait", "mnt_forfait_data",
            "volume_4g", "volume_3g", "volume_2g", "evaporation",
            "is_data_user_now", "target_next_month", "will_activate",
        )
        df = pd.DataFrame.from_records(qs)
        n = len(df)
        self.stdout.write(f"Computing analytics over {n:,} customers ...")

        # ---------------------------------------------------------------
        # 1. Headline KPIs
        # ---------------------------------------------------------------
        kpis = {
            "total_customers": int(n),
            "activation_rate": round(float(df["will_activate"].mean()), 4),
            "avg_arpu": round(float(df["arpu"].mean()), 2),
            "avg_next_month_spend": round(float(df["target_next_month"].mean()), 2),
            "avg_spend_among_activators": round(
                float(df.loc[df["will_activate"], "target_next_month"].mean()), 2
            ),
            "total_projected_data_revenue": round(float(df["target_next_month"].sum()), 2),
            "current_data_user_rate": round(float(df["is_data_user_now"].mean()), 4),
            "avg_tenure_months": round(float(df["anc_m"].mean()), 1),
            "avg_evaporation": round(float(df["evaporation"].mean()), 4),
        }
        _save("kpis", kpis)

        # ---------------------------------------------------------------
        # 2. Activation rate & avg amount by segment
        # ---------------------------------------------------------------
        def segment_breakdown(col, top_n=None):
            g = df.groupby(col).agg(
                customers=("target_next_month", "size"),
                activation_rate=("will_activate", "mean"),
                avg_next_month=("target_next_month", "mean"),
                avg_arpu=("arpu", "mean"),
            ).reset_index().rename(columns={col: "segment"})
            g["activation_rate"] = g["activation_rate"].round(4)
            g["avg_next_month"] = g["avg_next_month"].round(2)
            g["avg_arpu"] = g["avg_arpu"].round(2)
            g = g.sort_values("customers", ascending=False)
            if top_n:
                g = g.head(top_n)
            return g.to_dict(orient="records")

        _save("by_region", segment_breakdown("region"))
        _save("by_handset", segment_breakdown("handset"))
        _save("by_offer", segment_breakdown("offre", top_n=12))
        _save("by_statut", segment_breakdown("statut"))
        _save("by_statut_rgs90", segment_breakdown("statut_rgs90"))
        _save("by_canal", segment_breakdown("canal_de_vente"))

        # ---------------------------------------------------------------
        # 3. Data usage generation mix (4G/3G/2G volume share)
        # ---------------------------------------------------------------
        total_vol = df["volume_4g"].sum() + df["volume_3g"].sum() + df["volume_2g"].sum()
        volume_mix = {
            "volume_4g_share": round(float(df["volume_4g"].sum() / total_vol), 4) if total_vol else 0,
            "volume_3g_share": round(float(df["volume_3g"].sum() / total_vol), 4) if total_vol else 0,
            "volume_2g_share": round(float(df["volume_2g"].sum() / total_vol), 4) if total_vol else 0,
        }
        _save("volume_mix", volume_mix)

        # ---------------------------------------------------------------
        # 4. ARPU distribution buckets (for a histogram)
        # ---------------------------------------------------------------
        bins = [0, 5, 10, 20, 40, 80, 150, float("inf")]
        labels = ["0-5", "5-10", "10-20", "20-40", "40-80", "80-150", "150+"]
        df["arpu_bucket"] = pd.cut(df["arpu"], bins=bins, labels=labels, right=False)
        arpu_hist = (
            df.groupby("arpu_bucket", observed=True)
            .agg(customers=("arpu", "size"), activation_rate=("will_activate", "mean"))
            .reset_index()
            .rename(columns={"arpu_bucket": "bucket"})
        )
        arpu_hist["activation_rate"] = arpu_hist["activation_rate"].round(4)
        arpu_hist["bucket"] = arpu_hist["bucket"].astype(str)
        _save("arpu_distribution", arpu_hist.to_dict(orient="records"))

        # ---------------------------------------------------------------
        # 5. Tenure vs activation (does loyalty predict future data use?)
        # ---------------------------------------------------------------
        tenure_bins = [0, 6, 12, 24, 48, 96, float("inf")]
        tenure_labels = ["0-6mo", "6-12mo", "1-2yr", "2-4yr", "4-8yr", "8yr+"]
        df["tenure_bucket"] = pd.cut(df["anc_m"], bins=tenure_bins, labels=tenure_labels, right=False)
        tenure = (
            df.groupby("tenure_bucket", observed=True)
            .agg(customers=("anc_m", "size"), activation_rate=("will_activate", "mean"))
            .reset_index()
            .rename(columns={"tenure_bucket": "bucket"})
        )
        tenure["activation_rate"] = tenure["activation_rate"].round(4)
        tenure["bucket"] = tenure["bucket"].astype(str)
        _save("tenure_distribution", tenure.to_dict(orient="records"))

        # ---------------------------------------------------------------
        # 6. Model feature importance (reuse the ML module)
        # ---------------------------------------------------------------
        self.stdout.write("Loading trained models for feature importance ...")
        _save("feature_importance", predictor.feature_importance(top_n=12))

        # ---------------------------------------------------------------
        # 7. Feature defaults + schema, for the manual "build a customer"
        #    prediction form (median for numeric, mode for categorical,
        #    plus category option lists so the frontend can render selects).
        # ---------------------------------------------------------------
        self.stdout.write("Computing feature defaults/schema for the prediction form ...")
        feature_dicts = list(Customer.objects.values_list("features", flat=True))
        feat_df = pd.DataFrame(feature_dicts)

        from mlmodels import data_prep as dp
        num_cols, cat_cols = dp.get_feature_columns(
            feat_df.assign(**{dp.CLASSIFICATION_TARGET_COL: 0})
        )

        defaults = {}
        schema = []
        for c in num_cols:
            median_val = float(feat_df[c].median())
            defaults[c] = median_val
            schema.append({
                "name": c,
                "type": "numeric",
                "default": round(median_val, 3),
                "min": round(float(feat_df[c].quantile(0.01)), 3),
                "max": round(float(feat_df[c].quantile(0.99)), 3),
            })
        for c in cat_cols:
            mode_val = feat_df[c].mode().iloc[0]
            defaults[c] = mode_val
            schema.append({
                "name": c,
                "type": "categorical",
                "default": mode_val,
                "options": sorted(feat_df[c].unique().tolist()),
            })

        _save("feature_defaults", defaults)
        _save("feature_schema", schema)

        self.stdout.write(self.style.SUCCESS(
            f"Saved {AnalyticsSnapshot.objects.count()} analytics snapshots."
        ))
