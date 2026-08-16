"""
data_prep.py
------------
Shared data-cleaning and feature-engineering logic for the
MNT_FORFAIT_DATA_next_month prediction project.

This module is imported by BOTH modeling notebooks (so the two models are
trained on an identical, consistent feature set) and is designed to be
reused as-is inside the Django app at inference time -- the exact same
cleaning/derivation code that produced the training features should
produce the features for a live prediction request.

Columns dropped and why (confirmed on the full 30,000-row dataset):
  - RATIO               : constant value (3) for every row -> zero information
  - ANC_J               : correlation 0.9999 with ANC_M (same info, different unit)
  - VOLUME_SESSION      : exactly equals VOLUME_4G + VOLUME_3G + VOLUME_2G
  - volume_session_c    : exact duplicate of VOLUME_SESSION
  - FLAG_HANDSET_DATA   : 100% redundant with HANDSET (2G->0, 3G/4G->1)
  - CODE_CONTRAT        : identifier, not a predictive feature (kept aside for joins)
"""

import numpy as np
import pandas as pd

RAW_SEP = ";"

ID_COL = "CODE_CONTRAT"
TARGET_COL = "MNT_FORFAIT_DATA_next_month"
CLASSIFICATION_TARGET_COL = "will_activate_next_month"

# Columns that carry zero information or are exact duplicates of another
# column -- confirmed via correlation/uniqueness checks on the full dataset.
DEAD_OR_REDUNDANT_COLS = [
    "RATIO",
    "ANC_J",
    "VOLUME_SESSION",
    "volume_session_c",
    "FLAG_HANDSET_DATA",
]

# Percentage columns that are blank (not NaN) whenever the user had zero
# forfaits in that period. Blank == 0 here, not missing-at-random.
BLANK_ZERO_COLS = [
    "P_NB_FF_Journalier",
    "P_NB_FF_WEEKLY",
    "P_NB_FF_MONTHLY",
    "P_Mnt_FF_Journalier",
    "P_Mnt_FF_WEEKLY",
    "P_Mnt_FF_MONTHLY",
]

CATEGORICAL_COLS = [
    "STATUT",
    "OFFRE",
    "STATUT_RGS90",
    "Canal_De_Vente",
    "HANDSET",
    "REGION",
]

# Offers below this row count get folded into "Other" to avoid a huge sparse
# one-hot tail dominated by categories seen fewer than ~150 times.
RARE_OFFER_MIN_COUNT = 150

DERIVED_NUMERIC_COLS = [
    "is_data_user_now",
    "data_share_of_forfait",
    "data_share_of_volume",
    "has_smartphone",
    "recharge_intensity",
]


def load_raw(path: str) -> pd.DataFrame:
    """Load the raw semicolon-separated export as-is."""
    df = pd.read_csv(path, sep=RAW_SEP)
    df.columns = [c.strip() for c in df.columns]
    return df


def clean_raw(df: pd.DataFrame) -> pd.DataFrame:
    """
    Step 1 of the pipeline: fix dtypes, whitespace, and blank-vs-missing
    ambiguity. Does NOT drop columns or engineer features yet -- kept
    separate so each step is inspectable/testable on its own.
    """
    df = df.copy()

    # Strip whitespace from every string/object column (present throughout
    # this export, including inside category labels like "PRE - Trankil TT").
    obj_cols = df.select_dtypes(include="object").columns
    for c in obj_cols:
        df[c] = df[c].astype(str).str.strip()

    # Blank cells in these percentage columns mean "0 forfaits that period",
    # not a missing measurement -> convert blanks to 0, then cast to float.
    for c in BLANK_ZERO_COLS:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c].replace("", "0"), errors="coerce").fillna(0.0)

    return df


def drop_dead_columns(df: pd.DataFrame) -> pd.DataFrame:
    cols_to_drop = [c for c in DEAD_OR_REDUNDANT_COLS if c in df.columns]
    return df.drop(columns=cols_to_drop)


def group_rare_offers(df: pd.DataFrame, min_count: int = RARE_OFFER_MIN_COUNT) -> pd.DataFrame:
    df = df.copy()
    counts = df["OFFRE"].value_counts()
    rare = counts[counts < min_count].index
    df["OFFRE"] = df["OFFRE"].where(~df["OFFRE"].isin(rare), "Other")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Step 2: derive new, business-meaningful features on top of the cleaned
    raw columns. These are the features that showed up as informative
    during EDA (current data usage is the single strongest predictor of
    next-month data usage).
    """
    df = df.copy()

    df["is_data_user_now"] = (df["MNT_FORFAIT_DATA"] > 0).astype(int)

    df["data_share_of_forfait"] = np.where(
        df["MNT_FORFAIT"] > 0, df["MNT_FORFAIT_DATA"] / df["MNT_FORFAIT"], 0.0
    )

    smart_volume = df["VOLUME_4G"] + df["VOLUME_3G"]
    total_volume = smart_volume + df["VOLUME_2G"]
    df["data_share_of_volume"] = np.where(total_volume > 0, smart_volume / total_volume, 0.0)

    df["has_smartphone"] = df["HANDSET"].isin(["3G", "4G"]).astype(int)

    df["recharge_intensity"] = np.where(
        df["NB_RECH_SUP5"] > 0, df["MNT_RECH_SUP5"] / df["NB_RECH_SUP5"], 0.0
    )

    return df


def build_pipeline_features(df_raw: pd.DataFrame, has_target: bool = True) -> pd.DataFrame:
    """
    Runs the full cleaning + feature-engineering pipeline in the right
    order and returns a dataframe ready to be split into X / y.
    `has_target=False` lets this same function be called at inference time
    on a single new record with no target column present.
    """
    df = clean_raw(df_raw)
    df = drop_dead_columns(df)
    df = group_rare_offers(df)
    df = engineer_features(df)

    if has_target:
        df[CLASSIFICATION_TARGET_COL] = (df[TARGET_COL] > 0).astype(int)

    return df


def get_feature_columns(df: pd.DataFrame) -> tuple[list, list]:
    """
    Returns (numeric_feature_cols, categorical_feature_cols) present in df,
    excluding id/target columns.
    """
    exclude = {ID_COL, TARGET_COL, CLASSIFICATION_TARGET_COL}
    categorical = [c for c in CATEGORICAL_COLS if c in df.columns]
    numeric = [
        c
        for c in df.columns
        if c not in exclude and c not in categorical
    ]
    return numeric, categorical
